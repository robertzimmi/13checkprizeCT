import fs from "fs";
import fetch from "node-fetch";

const TOKEN = process.env.BEARER_TOKEN;

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/json",
};

const expansions = JSON.parse(
  fs.readFileSync("./data/mock_expansions.json", "utf8")
);

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
}

run();
