import fs from "fs";
import fetch from "node-fetch";

// 🔹 Carrega expansões
const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

// 🔹 Carrega lista de cartas alvo
const priceTargets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

const targetNames = Object.keys(priceTargets).map(name => name.toLowerCase());

// 🔹 API CardTrader
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
    const products = data.products || [];

    // 🔥 FILTRA SOMENTE AS CARTAS NO price_targets.json
    const filtered = products.filter(card => {
      const name = card?.name?.toLowerCase();
      return targetNames.includes(name);
    });

    return filtered;

  } catch (err) {
    console.log("❌ Erro na requisição:", err);
    return [];
  }
}

async function main() {
  console.log("🔄 Buscando cartas filtradas pelo price_targets.json...\n");

  for (const exp of expansions) {
    const filteredCards = await fetchExpansion(exp.id);

    if (filteredCards.length > 0) {
      console.log(`✔ ${exp.code} → ${filteredCards.length} cartas encontradas`);
    }

    allCards.push(...filteredCards);

    // Pausa para evitar rate limit
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n📦 Total final filtrado: ${allCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
}

main();
