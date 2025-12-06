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

// Pegar cotação do Euro
async function fetchEuroRate() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=EUR&symbols=BRL");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseFloat(data.rates.BRL) || 6.2;
  } catch (err) {
    console.error("Erro ao buscar cotação do Euro:", err.message);
    return 5.3; // fallback manual
  }
}

// Função principal
async function fetchData() {
  const euroRate = await fetchEuroRate();
  console.log("💶 Euro atual:", euroRate);

  const foundCards = [];

  for (const expansion of MOCK_EXPANSIONS) {
    try {
      const response = await fetch(`${EXPANSION_URL}${expansion.id}`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
      });
      if (!response.ok) throw new Error(response.statusText);

      const data = await response.json();
      const cardsArrays = Object.values(data).flat();

      for (const targetName of TARGET_NAMES) {
        const normalizedTarget = normalize(targetName);
        const matches = cardsArrays.filter(c => normalize(c.name_en) === normalizedTarget);

        if (matches.length) {
          foundCards.push(...matches.map(c => {
            const priceOriginalStr = c.price.formatted.trim();

            let priceBRL;
            if (priceOriginalStr.startsWith("R$")) {
              // Já está em reais, remove R$ e vírgulas de milhar
              let cleaned = priceOriginalStr.replace(/[R$]/g, "").trim();
              cleaned = cleaned.replace(/,(\d{3})/g, "$1"); // "2,200.03" -> "2200.03"
              priceBRL = parseFloat(cleaned);
            } else {
              // Em $ ou €, multiplica pelo euroRate
              const numericPrice = parseFloat(priceOriginalStr.replace(/[^0-9.]/g, ""));
              priceBRL = !isNaN(numericPrice) ? parseFloat((numericPrice * euroRate).toFixed(2)) : 0;
            }

            const priceTargetBRL = parseFloat((targetsObj[targetName] * euroRate).toFixed(2));

            return {
              name: c.name_en,
              price_target: targetsObj[targetName],
              price_target_brl: priceTargetBRL,
              expansion: expansion.name,
              price_original: priceOriginalStr,
              price_brl: priceBRL,
              quantity: c.quantity
            };
          }));
        }
      }

      await new Promise(r => setTimeout(r, 500)); // delay para não bater rate limit
    } catch (err) {
      console.error(`Erro na expansão ${expansion.code}:`, err.message);
    }
  }

  // Agrupar por carta
  const groupedCards = {};
  for (const card of foundCards) {
    if (!groupedCards[card.name]) {
      groupedCards[card.name] = {
        name: card.name,
        price_target: card.price_target,
        price_target_brl: card.price_target_brl,
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

  // JSON final
  const finalJSON = {
    cards: Object.values(groupedCards),
    datetime_utc_minus3: new Date(Date.now() - 3*60*60*1000).toISOString(),
    euro_rate: euroRate
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalJSON, null, 2));
  console.log(`💾 Criado ${OUTPUT_FILE}, total encontrado: ${foundCards.length}`);
}

// Rodar
fetchData();
