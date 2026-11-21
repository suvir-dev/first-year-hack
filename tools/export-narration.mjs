// export-narration.mjs: writes every painting's history text, split into
// sentences, to tools/narration.json (read by generate_narration.py).
//
// paintings.ts is TypeScript, so we let Vite load it for us.
// Run with: npm run narration (or node tools/export-narration.mjs)

import { createServer } from "vite";
import { writeFileSync } from "node:fs";

/** Same rule as splitSentences() in src/narrator.ts: "A. B! C?" -> ["A.", "B!", "C?"] */
function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
}

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { paintings } = await vite.ssrLoadModule("/src/paintings.ts");
await vite.close();

const out = paintings.map((painting) => ({ id: painting.id, sentences: splitSentences(painting.history) }));
writeFileSync(new URL("./narration.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`Exported ${out.length} paintings to tools/narration.json`);
