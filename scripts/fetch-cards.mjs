import fs from "fs";
import fetch from "node-fetch";

const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";
const TOKEN = process.env.BEARER_TOKEN;

if (!TOKEN) {
  console.error("❌ ERRO: BEARER_TOKEN não encontrado!");
  process.exit(1);
}

let allCards = [];

async function fetchExpansion(id) {
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

    // Garante que pegamos SOMENTE o array de produtos
    const products = data.products || [];

    const filtered = products.filter(card =>
      card?.properties_hash?.signed === true ||
      card?.properties_hash?.altered === true ||
      card?.properties_hash?.misprint === true
    );

    return filtered;

  } catch (err) {
    console.log("❌ Erro na requisição:", err);
    return [];
  }
}

async function main() {
  console.log("🔄 Buscando cartas na CardTrader...\n");

  for (const exp of expansions) {
    const cards = await fetchExpansion(exp.id);
    console.log(`✔ ${exp.code} → ${cards.length} cartas (signed/altered/misprint)`);

    allCards.push(...cards);

    await new Promise(r => setTimeout(r, 500)); // evitar rate limit
  }

  console.log(`\n📦 Total final: ${allCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));
  console.log("💾 cards.json atualizado em /docs/");
}

main();
