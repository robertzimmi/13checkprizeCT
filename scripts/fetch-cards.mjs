import fs from "fs";
import fetch from "node-fetch";

const TOKEN = process.env.BEARER_TOKEN;
const API = "https://api.cardtrader.com/api/v2/marketplace/products?expansion_id=";

if (!TOKEN) {
  console.error("❌ BEARER_TOKEN não encontrado!");
  process.exit(1);
}

const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

const priceTargets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

// Lista de nomes a procurar
const TARGET_NAMES = priceTargets.map(c => c.name.toLowerCase());

let foundCards = [];

async function fetchExpansion(exp) {
  try {
    const res = await fetch(API + exp.id, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    if (!res.ok) {
      console.log(`❌ Erro ao buscar ${exp.code}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();

    // Valores do objeto → arrays → flat
    const cards = Object.values(data).flat();

    return cards;

  } catch (err) {
    console.log("❌ Erro:", err);
    return [];
  }
}

function getCardName(card) {
  return (
    card?.blueprint?.name_en ||
    card?.name_en ||
    ""
  );
}

async function main() {
  console.log("🔄 Buscando cartas filtradas pelo price_targets.json...\n");

  for (const exp of expansions) {
    const cards = await fetchExpansion(exp);

    console.log(`📦 Expansion: ${exp.code}`);

    // Filtra apenas cartas que estão nos targets
    for (const targetName of TARGET_NAMES) {
      const matched = cards.filter(card => {
        const nm = getCardName(card).toLowerCase();
        return nm === targetName;
      });

      if (matched.length > 0) {
        console.log(` - ${targetName} → FOUND (${matched.length})`);
        foundCards.push(...matched);
      } else {
        console.log(` - ${targetName} → NOT FOUND`);
      }
    }

    console.log();
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📦 Total final filtrado: ${foundCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(foundCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
}

main();
