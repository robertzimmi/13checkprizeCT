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

// Função para pegar cotação do Euro
async function fetchEuroRate() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=EUR&symbols=BRL");
    const data = await res.json();
    return data.rates.BRL || 0;
  } catch (err) {
    console.error("Erro ao buscar cotação do Euro:", err.message);
    return 0;
  }
}

// Converte preço para número em R$
function convertPriceToBRL(price, euroRate) {
  if (price == null) return null;

  // Se for número (centavos)
  if (typeof price === "number") {
    return parseFloat((price / 100).toFixed(2));
  }

  // Se for string, apenas converte dolar ou euro
  let valueStr = price.replace(/[R\$€\s]/g, "");
  if (valueStr.includes(",")) {
    valueStr = valueStr.replace(/\./g, "").replace(",", ".");
  } else {
    valueStr = valueStr.replace(/\./g, "");
  }

  let value = parseFloat(valueStr);
  if (isNaN(value)) return null;

  if (price.startsWith("$")) value *= 5;
  if (price.startsWith("€")) value *= euroRate;

  return parseFloat(value.toFixed(2));
}

// Função principal
async function fetchData() {
  const euroRate = await fetchEuroRate();
  console.log("💶 Euro atual:", euroRate);

  const foundCards = [];

  for (const expansion of MOCK_EXPANSIONS) {
    console.log(`\n📦 Expansion: ${expansion.code}`);

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
          foundCards.push(...matches.map(c => ({
            name: c.name_en,
            price_target: targetsObj[targetName],
            expansion: expansion.name,
            price_original: c.price.formatted,                 // original da API
            price_brl: convertPriceToBRL(c.price.formatted, euroRate), // convertido
            quantity: c.quantity
          })));
          console.log(`- ${targetName} → FOUND (${matches.length})`);
        } else {
          console.log(`- ${targetName} → NOT FOUND`);
        }
      }

      await new Promise(r => setTimeout(r, 500));
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
  console.log(`\n💾 Criado ${OUTPUT_FILE}, total encontrado: ${foundCards.length}\n`);
}

// Rodar
fetchData();
