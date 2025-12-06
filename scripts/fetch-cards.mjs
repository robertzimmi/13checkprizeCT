import fs from "fs";
import path from "path";
import CardTrader from "cardtrader-client";

/* ---------------------- CONFIG ------------------------- */

const PRICE_FILE = path.resolve("data/price_targets.json");
const OUTPUT_FILE = path.resolve("docs/cards.json");

/* -------------------------------------------------------- */

// Função que normaliza e remove acentos/símbolos
function normalize(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, " ")   // remove símbolos bizarros
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  console.log("🔄 Buscando cartas listadas em price_targets.json...\n");

  // Carrega o arquivo JSON como objeto
  const rawJSON = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));

  // Converte para array padrão
  const TARGET_LIST = Object.keys(rawJSON).map(name => ({
    name,
    target: rawJSON[name]
  }));

  // Lista completa de cartas
  const api = new CardTrader();
  const ALL_SETS = await api.getCards(); // já retorna TUDO

  // Normaliza nomes do banco
  const NORMALIZED_DB = ALL_SETS.map(c => ({
    ...c,
    norm: normalize(c.name)
  }));

  let results = [];

  for (const entry of TARGET_LIST) {
    const original = entry.name;
    const targetNorm = normalize(original);

    // busca fuzzy: nome contém parte do alvo
    const found = NORMALIZED_DB.find(c => c.norm.includes(targetNorm));

    if (found) {
      console.log(`✔️  ${original} → FOUND as "${found.name}"`);
      results.push({
        name: original,
        matched_name: found.name,
        link: found.url,
        target_price: entry.target
      });
    } else {
      console.log(`❌  ${original}  (not found)`);
    }
  }

  console.log(`\n📦 Total final encontrado: ${results.length}`);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`💾 Criado cards.json em ${OUTPUT_FILE}`);
}

main();
