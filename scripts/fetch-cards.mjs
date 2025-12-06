import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Corrigir dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos
const PRICE_FILE = path.join(__dirname, "../data/price_targets.json");
const EXP_FILE = path.join(__dirname, "../data/mock_expansions.json");
const OUTPUT_FILE = path.join(__dirname, "../docs/cards.json");

// Normalização para comparação
function normalize(str) {
  return str
    ?.toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "'")
    .replace(/[\u0300-\u036f]/g, "");
}

// Carregar price targets (OBJETO)
const targetsObj = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));
const TARGET_NAMES = Object.keys(targetsObj);

// Carregar expansões mock
const expansions = JSON.parse(fs.readFileSync(EXP_FILE, "utf8"));

console.log(`\n🔄 Buscando cartas listadas em price_targets.json...\n`);

let finalCards = [];

//
// *** FUNÇÃO QUE BUSCA NA API DO CARDTRADER ***
//
async function searchCardOnCT(name) {
  const url =
    "https://api.cardtrader.com/api/v2/products?per=50&name=" +
    encodeURIComponent(name);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
    },
  });

  if (!res.ok) return null;

  const json = await res.json();
  return json.products || [];
}

//
// *** LOOP PRINCIPAL ***
//
for (const cardName of TARGET_NAMES) {
  const normalizedTarget = normalize(cardName);

  let found = null;

  try {
    const results = await searchCardOnCT(cardName);

    if (results && results.length > 0) {
      found = results.find(
        (p) => normalize(p.name) === normalizedTarget
      ) || results[0]; // fallback: primeiro resultado
    }
  } catch (err) {
    console.log(`⚠️ Erro ao buscar ${cardName}:`, err.message);
  }

  if (found) {
    console.log(`✅  ${cardName} (found)`);

    finalCards.push({
      name: found.name,
      ct_product_id: found.id,
      expansion_id: found.expansion_id,
      expansion: expansions.find(e => e.id === found.expansion_id)?.name || "Unknown",
      price_target: targetsObj[cardName],
    });
  } else {
    console.log(`❌  ${cardName} (not found)`);
  }
}

console.log(`\n📦 Total final encontrado: ${finalCards.length}\n`);

// Salvar cards.json
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalCards, null, 2));
console.log(`💾 Criado cards.json em ${OUTPUT_FILE}\n`);
