import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Corrigir __dirname no ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos
const SETS_DIR = path.join(__dirname, "../data/sets");
const PRICE_FILE = path.join(__dirname, "../data/price_targets.json");
const OUTPUT_FILE = path.join(__dirname, "../docs/cards.json");

// Função para normalizar texto para comparação
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")        // remover acentos
    .replace(/[’']/g, "'")    // normalizar apóstrofos
    .replace(/[\u0300-\u036f]/g, ""); // remover marcas
}

// Carregar o objeto de price targets
const targetsObj = JSON.parse(fs.readFileSync(PRICE_FILE, "utf8"));

// Transformar objeto em array de nomes
const TARGET_NAMES = Object.keys(targetsObj);

// Começar
console.log("\n🔄 Buscando cartas listadas em price_targets.json...\n");

let foundCards = [];

// Carregar todos os JSONs dos sets
const setFiles = fs.readdirSync(SETS_DIR).filter(f => f.endsWith(".json"));

for (const file of setFiles) {
  const filePath = path.join(SETS_DIR, file);
  const setJson = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Garantir que o set tenha cards
  if (!setJson.cards) continue;

  for (const targetName of TARGET_NAMES) {
    const normalizedTarget = normalize(targetName);

    // Procurar carta no set
    const match = setJson.cards.find(c =>
      normalize(c.name).includes(normalizedTarget)
    );

    if (match) {
      foundCards.push({
        name: match.name,
        set: setJson.name || file.replace(".json", ""),
        price_target: targetsObj[targetName],
      });
    }
  }
}

// Mostrar status de found/not found
for (const name of TARGET_NAMES) {
  const ok = foundCards.find(c => normalize(c.name) === normalize(name));
  if (ok) {
    console.log(`✅  ${name}  (found)`);
  } else {
    console.log(`❌  ${name}  (not found)`);
  }
}

console.log(`\n📦 Total final encontrado: ${foundCards.length}`);

// Salvar cards.json
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(foundCards, null, 2));
console.log(`💾 Criado cards.json em ${OUTPUT_FILE}\n`);
