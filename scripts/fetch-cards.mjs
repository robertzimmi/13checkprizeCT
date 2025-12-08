import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Caminhos
const PRICE_FILE = path.join("data", "price_targets.json");
const OUTPUT_FILE = path.join("docs", "cards.json");
const MOCK_EXPANSIONS_FILE = path.join("data", "mock_expansions.json");

// Normaliza texto para comparação
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "'")
    .replace(/[\u0300-\u036f]/g, "");
}

// Carregar targets e expansões
const targetsObj = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));
const TARGET_NAMES = Object.keys(targetsObj);
const MOCK_EXPANSIONS = JSON.parse(fs.readFileSync(MOCK_EXPANSIONS_FILE, "utf8"));

const BEARER_TOKEN = process.env.BEARER_TOKEN;
const BASE_URL = "https://api.cardtrader.com/api/v2";
const EXPANSION_URL = `${BASE_URL}/marketplace/products?expansion_id=`;

// Gera data no fuso UTC-3 sem "Z"
function makeBrazilDateString() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

// Cotação Euro
async function fetchEuroRate() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=BRL");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseFloat(data.rates.BRL) || 6.2;
  } catch (err) {
    console.error("Erro ao buscar cotação do Euro:", err.message);
    return 6.2;
  }
}

// Função principal
async function fetchData() {
  const euroRate = await fetchEuroRate();
  console.log("💶 Euro atual:", euroRate);

  const foundCards = [];
  const foundNames = new Set();

  for (const expansion of MOCK_EXPANSIONS) {
    try {
      const response = await fetch(`${EXPANSION_URL}${expansion.id}`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
      });

      if (!response.ok) throw new Error(response.statusText);

      const data = await response.json();
      const cardsArrays = Object.values(data).flat();

      for (const targetName of TARGET_NAMES) {
        const targetData = targetsObj[targetName];
        const targetPrice = targetData.price_target;
        const targetTag = targetData.tag || "other";

        const normalizedTarget = normalize(targetName);
        const matches = cardsArrays.filter(
          c => normalize(c.name_en) === normalizedTarget
        );

        if (matches.length) {
          foundNames.add(targetName);

          foundCards.push(
            ...matches.map(c => {
              const priceOriginalStr = c.price.formatted.trim();

              let priceBRL;

              if (priceOriginalStr.startsWith("R$")) {
                let cleaned = priceOriginalStr.replace(/[R$]/g, "").trim();
                cleaned = cleaned.replace(/,(\d{3})/g, "$1");
                priceBRL = parseFloat(cleaned.replace(",", "."));
              } else {
                const numericPrice = parseFloat(
                  priceOriginalStr.replace(/[^0-9.]/g, "")
                );
                priceBRL = !isNaN(numericPrice)
                  ? parseFloat((numericPrice * euroRate).toFixed(2))
                  : 0;
              }

              const targetBRL = parseFloat((targetPrice * euroRate).toFixed(2));

              return {
                name: c.name_en,
                price_target: targetPrice,
                price_target_brl: targetBRL,
                expansion: expansion.name,
                price_original: priceOriginalStr,
                price_brl: priceBRL,
                tag: targetTag,
                quantity: c.quantity
              };
            })
          );
        }
      }

      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`Erro na expansão ${expansion.code}:`, err.message);
    }
  }

  // Encontrar cartas NÃO ACHADAS
  const notFound = TARGET_NAMES.filter(name => !foundNames.has(name));

  if (notFound.length) {
    console.log("\n⚠️ Cartas NÃO ENCONTRADAS:");
    notFound.forEach(c => console.log(" - " + c));
  } else {
    console.log("\n✅ Todas as cartas foram encontradas!");
  }

  // Agrupamento
  const groupedCards = {};
  for (const card of foundCards) {
    if (!groupedCards[card.name]) {
      groupedCards[card.name] = {
        name: card.name,
        price_target: card.price_target,
        price_target_brl: card.price_target_brl,
        tag: card.tag,
        records: []
      };
    }
    groupedCards[card.name].records.push({
      expansion: card.expansion,
      price_original: card.price_original,
      price_brl: card.price_brl,
      quantity: card.quantity
    });
  }

  const finalJSON = {
    cards: Object.values(groupedCards),
    missing: notFound, // <- aqui incluímos as cartas não localizadas
    datetime_utc_minus3: makeBrazilDateString(),
    euro_rate: euroRate
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalJSON, null, 2));

  console.log(`\n💾 Criado ${OUTPUT_FILE}`);
  console.log(`📦 Total de registros encontrados: ${foundCards.length}`);
  console.log(`📄 Total de cartas distintas: ${Object.keys(groupedCards).length}`);
  console.log(`⚠️ Cartas não localizadas: ${notFound.length}`);
}

// Rodar
fetchData();
