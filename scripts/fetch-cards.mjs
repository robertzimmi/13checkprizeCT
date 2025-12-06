import fs from "fs";
import path from "path";

const PRICE_FILE = path.resolve("price_targets.json");
const OUT_FILE = path.resolve("docs/cards.json");

// Carrega o price_targets.json como OBJETO
const priceTargets = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));

// Como é OBJETO → pega só os nomes
const TARGET_NAMES = Object.keys(priceTargets).map(name => name.toLowerCase());

console.log("🔍 Nomes carregados do price_targets.json:");
console.log(TARGET_NAMES);

// URL base da API
const API_URL = "https://api.cardtrader.com/api/v2/public/cards";

// Função auxiliar para fetch (sem node-fetch usando built-in fetch no Node 20+)
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

console.log("🔄 Buscando cartas na API...");

// Busca todas as cartas da API (paginando automaticamente)
async function fetchAllCards() {
  let page = 1;
  let done = false;
  let all = [];

  while (!done) {
    const url = `${API_URL}?page=${page}`;
    const data = await fetchJSON(url);

    if (!data.cards || data.cards.length === 0) {
      done = true;
      break;
    }

    all.push(...data.cards);
    page++;
  }

  return all;
}

const allCards = await fetchAllCards();

console.log(`📦 Total bruto encontrado: ${allCards.length}`);

// Filtra apenas o nome EXATO (sem filtrar por qualidade/status)
const finalCards = allCards.filter(card =>
  TARGET_NAMES.includes(card.name.toLowerCase())
);

console.log(`📦 Total final filtrado: ${finalCards.length} cartas\n`);

console.log("📘 Relatório:");
for (const name of TARGET_NAMES) {
  const found = finalCards.some(c => c.name.toLowerCase() === name);
  console.log(`- ${name}: ${found ? "FOUND ✔" : "NOT FOUND ❌"}`);
}

// Salva no docs/cards.json
fs.writeFileSync(OUT_FILE, JSON.stringify(finalCards, null, 2), "utf8");

console.log(`\n💾 Criado cards.json em /docs/`);
