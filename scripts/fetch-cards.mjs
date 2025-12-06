import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Caminhos
const PRICE_FILE = path.join("data", "price_targets.json");
const OUTPUT_FILE = path.join("docs", "cards.json");
const MOCK_EXPANSIONS_FILE = path.join("data", "mock_expansions.json");

// Corrigir texto para comparação
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "'")
    .replace(/[\u0300-\u036f]/g, "");
}

// Carregar targets
const targetsObj = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));
const TARGET_NAMES = Object.keys(targetsObj);

// Carregar expansões
const MOCK_EXPANSIONS = JSON.parse(
  fs.readFileSync(MOCK_EXPANSIONS_FILE, "utf8")
);

const BEARER_TOKEN = process.env.BEARER_TOKEN; // ou coloque direto aqui
const BASE_URL = "https://api.cardtrader.com/api/v2";
const EXPANSION_URL = `${BASE_URL}/marketplace/products?expansion_id=`;

// Resultado final
let foundCards = [];

async function fetchData() {
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
            expansion: expansion.name,
            price_target: targetsObj[targetName],
            quantity: c.quantity,
            price: c.price.formatted
          })));
          console.log(`- ${targetName} → FOUND (${matches.length})`);
        } else {
          console.log(`- ${targetName} → NOT FOUND`);
        }
      }

      // Delay 500ms para não bater rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Erro na expansão ${expansion.code}:`, err.message);
    }
  }

  // Salvar JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(foundCards, null, 2));
  console.log(`\n💾 Criado ${OUTPUT_FILE}, total encontrado: ${foundCards.length}\n`);
}

fetchData();
