
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const BEARER_TOKEN = "";
const BASE_URL = "https://api.cardtrader.com/api/v2";
const API_BASE = "https://api.cardtrader.com/api/v2";
const EXPANSIONS_URL = `${BASE_URL}/expansions`;
const FAB_GAME_ID = 6; // Flesh and Blood

async function ctFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Erro ${res.status} em ${endpoint}`);
  return res.json();
}

async function generateMockExpansionsFAB() {
  try {
    // 1) busca todas expansões
    const expansions = await ctFetch("/expansions");

    if (!Array.isArray(expansions)) {
      console.error("❗ Expansions não é um array");
      return;
    }

    // 2) filtra só FAB pelo game_id
    const fabExpansions = expansions
      .filter(exp => exp.game_id === FAB_GAME_ID)
      .map(exp => ({
        id: exp.id,
        code: exp.code,
        name: exp.name
      }));

    fabExpansions.sort((a, b) => a.id - b.id);

    // 3) escreve o arquivo JS
    const outputPath = path.join("data", "mock_expansions_fab_by_game.js");
    const fileContent = `export const MOCK_EXPANSIONS = ${JSON.stringify(fabExpansions, null, 2)};\n`;

    fs.writeFileSync(outputPath, fileContent, "utf-8");
    console.log(`✅ Mock expansions FAB geradas em: ${outputPath} (${fabExpansions.length} sets)`);

  } catch (err) {
    console.error("Erro durante geração:", err);
  }
}

// Executa
generateMockExpansionsFAB();