import fs from "fs";
import fetch from "node-fetch";

// 🔹 Expansões
const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

// 🔹 Lista de cartas que realmente queremos
const priceTargets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

const targetNames = Object.keys(priceTargets); // sem lowercase!!!

// 🔹 API
const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";
const TOKEN = process.env.BEARER_TOKEN;

if (!TOKEN) {
  console.error("❌ ERRO: BEARER_TOKEN não encontrado!");
  process.exit(1);
}

let finalCards = [];

// 🔍 Função para mostrar log de debug por expansão
function logExpansionResults(expansionName, foundNames) {
  console.log(`\n📦 Expansion: ${expansionName}`);

  for (const cardName of targetNames) {
    if (foundNames.includes(cardName)) {
      console.log(` - ${cardName} → FOUND`);
    } else {
      console.log(` - ${cardName} → NOT FOUND`);
    }
  }
}

async function fetchExpansion(id, expansionName) {
  try {
    const res = await fetch(API + id, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.log(`❌ Erro ao buscar expansão ${id}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data.products || [];

    // Extrai somente os nomes EN
    const foundNames = products.map(p => p.name_en ?? p.name);

    // ⬇️ LOG de debug por expansão
    logExpansionResults(expansionName, foundNames);

    // Filtra APENAS cartas que estão no price_targets
    const filtered = products.filter(p =>
      targetNames.includes(p.name_en ?? p.name)
    );

    return filtered;

  } catch (err) {
    console.log("❌ Erro na requisição:", err);
    return [];
  }
}

async function main() {
  console.log("🔄 Buscando cartas filtradas pelo price_targets.json...\n");

  for (const exp of expansions) {
    const cards = await fetchExpansion(exp.id, exp.code);
    finalCards.push(...cards);

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📦 Total final filtrado: ${finalCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(finalCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
}

main();
