import fs from "fs"; 
import fetch from "node-fetch";

<<<<<<< HEAD
// 🔹 Expansões
=======
const TOKEN = process.env.BEARER_TOKEN;

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/json",
};

>>>>>>> ff1548d65bd9dd72d947a4abce3554c7e6347cee
const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

<<<<<<< HEAD
// 🔹 Lista de cartas que você REALMENTE quer
const priceTargets = JSON.parse(
  fs.readFileSync("./data/price_targets.json", "utf8")
);

// Lista de nomes para filtro
const targetNames = Object.keys(priceTargets).map(n => n.toLowerCase());

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

    // 🔥 FILTRA APENAS cartas presentes no price_targets.json
    const filtered = products.filter(card => {
      const cardName = card?.name?.toLowerCase();
      return targetNames.includes(cardName);
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
    const cards = await fetchExpansion(exp.id);

    if (cards.length > 0) {
      console.log(`✔ ${exp.code} → ${cards.length} cartas encontradas`);
    }

    allCards.push(...cards);

    await new Promise(r => setTimeout(r, 500)); // evitar rate limit
  }

  console.log(`\n📦 Total final filtrado: ${allCards.length} cartas`);

  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));
  console.log("💾 Criado cards.json em /docs/");
=======
const API = "https://api.cardtrader.com/api/v2";

async function fetchProducts(expansionId) {
  const url = `${API}/marketplace/products?expansion_id=${expansionId}&per_page=200`;

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.log("Erro ao buscar expansão:", expansionId);
    return [];
  }

  const data = await res.json();

  // API retorna objeto com várias listas → juntar tudo
  return Object.values(data).flat();
}

async function run() {
  console.log("🔄 Buscando cartas + preços na CardTrader...");

  let allCards = [];

  for (const exp of expansions) {
    console.log(`📦 ${exp.code}...`);

    const products = await fetchProducts(exp.id);

    const cleaned = products.map((p) => ({
      name: p.name,
      product_id: p.id,
      expansion: exp.code,
      min_price: p?.price_data?.min_price ?? null,
      currency: p?.price_data?.currency ?? "EUR",
      image: p.images?.[0] ?? null,
    }));

    console.log(`✔ ${exp.code} → ${cleaned.length} cartas`);

    allCards.push(...cleaned);

    await new Promise((r) => setTimeout(r, 300)); // anti-rate limit
  }

  console.log(`\n📊 Total: ${allCards.length} cartas coletadas.`);
  fs.writeFileSync("./docs/cards.json", JSON.stringify(allCards, null, 2));

  console.log("💾 cards.json atualizado!");
>>>>>>> ff1548d65bd9dd72d947a4abce3554c7e6347cee
}

run();
