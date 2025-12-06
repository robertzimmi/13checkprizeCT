import fs from "fs";
import fetch from "node-fetch";

const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

const targets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";
const TOKEN = process.env.BEARER_TOKEN;

if (!TOKEN) {
  console.error("❌ ERRO: BEARER_TOKEN não encontrado!");
  process.exit(1);
}

// Normaliza nomes para comparação
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const targetNames = Object.keys(targets).map(normalize);

let finalCards = [];

async function fetchExpansion(id, code) {
  try {
    const res = await fetch(API + id, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.log(`❌ Erro ao buscar expansão ${code}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data.products || [];

    // Mostra no terminal o que existe na expansão
    console.log(`📦 Expansion: ${code}`);

    for (const cardName of Object.keys(targets)) {
      const found = products.find(
        c => normalize(c.name) === normalize(cardName)
      );

      if (found) {
        console.log(` - ${cardName} → FOUND`);
        finalCards.push(found);
      } else {
        console.log(` - ${cardName} → NOT FOUND`);
      }
    }

    return products;

  } catch (err) {
    console.log("❌ Erro na requisição:", err);
    return [];
  }
}

async function main() {
  console.log("🔄 Buscando cartas filtradas pelo price_targets.json...\n");

  for (const exp of expansions) {
    await fetchExpansion(exp.id, exp.code);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📦 Total final filtrado: ${finalCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(finalCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
}

main();
