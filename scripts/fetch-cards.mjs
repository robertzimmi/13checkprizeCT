import fs from "fs";
import fetch from "node-fetch";

// 🔹 Expansões
const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

// 🔹 Lista de limites de preço desejados
const priceTargets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

// Nomes das cartas a buscar
const targetNames = Object.keys(priceTargets);

// 🔹 API CardTrader
const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";
const TOKEN = process.env.BEARER_TOKEN;

if (!TOKEN) {
  console.error("❌ ERRO: BEARER_TOKEN não encontrado!");
  process.exit(1);
}

let allCards = [];

async function fetchExpansion(exp) {
  try {
    const res = await fetch(API + exp.id, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.log(`❌ Erro ao buscar expansão ${exp.code}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();

    // 🔹 A API atual devolve SOMENTE products
    const products = data.products || [];

    // 🔥 Aqui está o segredo: igual ao seu sistema antigo
    const filtered = products.filter(c => {

      // A API atual usa "name", mas seu sistema antigo usava "name_en"
      const name = c.name_en || c.name || "";

      return targetNames.includes(name);
    })
    .map(c => {
      const name = c.name_en || c.name || "";
      const limit = priceTargets[name];

      return {
        expansion: exp.code,
        name: name,
        priceEuro: c.price?.cents ? c.price.cents / 100 : null,
        condition: c.properties_hash?.condition || "N/A",
        language: c.properties_hash?.fab_language || "N/A",
        signed: c.properties_hash?.signed === true ? "Sim" : "Não",
        limit: limit,
      };
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
    const cards = await fetchExpansion(exp);

    if (cards.length > 0) {
      console.log(`✔ ${exp.code} → ${cards.length} cartas encontradas`);
    }

    allCards.push(...cards);

    await new Promise(r => setTimeout(r, 400)); // evitar rate limit
  }

  console.log(`\n📦 Total final filtrado: ${allCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
}

main();
