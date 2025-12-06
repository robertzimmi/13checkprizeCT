import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "docs");
const PRICE_FILE = path.join(ROOT, "data", "price_targets.json");

// --------------------------
// 1) Ler o price_targets.json (OBJETO → ARRAY)
// --------------------------
const rawPriceTargets = JSON.parse(fs.readFileSync(PRICE_FILE, "utf-8"));

// Converte objeto em array:
const priceTargets = Object.entries(rawPriceTargets).map(([name, target]) => ({
  name,
  target
}));

const TARGET_NAMES = priceTargets.map(c => c.name.toLowerCase());

// --------------------------
// 2) Função para buscar carta
// --------------------------
async function searchCard(name) {
  const encoded = encodeURIComponent(name);
  const url = `https://api.cardtrader.com/api/v2/cards?search=${encoded}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();

    if (!json || !json.data || json.data.length === 0) {
      return null;
    }

    // retornar todas versões que achar
    return json.data;
  } catch (err) {
    console.error("Erro ao buscar:", name, err);
    return null;
  }
}

// ---------------------------------------------------
// 3) Buscar todas as cartas do JSON
// ---------------------------------------------------
async function main() {
  console.log("🔄 Buscando cartas listadas em price_targets.json...\n");

  let results = [];

  for (const item of priceTargets) {
    const name = item.name;

    const found = await searchCard(name);

    if (found && found.length > 0) {
      console.log(`✔️  ${name}  (found ${found.length})`);

      results.push({
        name,
        target_price: item.target,
        versions: found
      });
    } else {
      console.log(`❌  ${name}  (not found)`);
    }
  }

  console.log("\n📦 Total final encontrado:", results.length);

  // --------------------------
  // Criar pasta /docs se não existir
  // --------------------------
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  // --------------------------
  // Salvar cards.json
  // --------------------------
  const outputPath = path.join(OUTPUT_DIR, "cards.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`💾 Criado cards.json em ${outputPath}`);
}

main();
