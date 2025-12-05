import fs from "fs";
import fetch from "node-fetch";

const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";
const TOKEN = process.env.BEARER_TOKEN;

let allCards = [];

async function fetchExpansion(id) {
  const res = await fetch(API + id, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });

  if (!res.ok) {
    console.log("Erro ao buscar expansão:", id);
    return [];
  }

  const data = await res.json();

  return Object.values(data)
    .flat()
    .filter(card =>
      card.properties_hash?.signed === true ||
      card.properties_hash?.altered === true ||
      card.properties_hash?.misprint === true
    );
}

async function main() {
  console.log("🔄 Buscando cartas na CardTrader...");

  for (const exp of expansions) {
    const cards = await fetchExpansion(exp.id);
    console.log(`✔ ${exp.code} → ${cards.length} cards`);
    allCards.push(...cards);

    await new Promise(r => setTimeout(r, 500)); // rate limit
  }

  console.log(`\n📦 Total final: ${allCards.length} cartas\n`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));
  console.log("💾 cards.json gerado!");
}

main();
