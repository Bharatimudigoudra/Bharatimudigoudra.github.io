// Regenerate ask-bharati/data/anchors.json from facts.js + anchor-phrases.json.
// Run from ask-bharati/tools:  npm install   (once)   then:  node build_anchors.mjs
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'data', 'facts.js'), 'utf8'));
const AB = window.AskBharati;
const phrases = JSON.parse(fs.readFileSync(path.join(root, 'data', 'anchor-phrases.json'), 'utf8'));
function chunks(text) {
  if (text.split(/\s+/).length <= 55) return [text];
  const sents = text.match(/[^.]+(\.|$)/g).map(s => s.trim()).filter(Boolean);
  const out = []; let cur = '';
  for (const s of sents) { if ((cur + ' ' + s).split(/\s+/).length > 55 && cur) { out.push(cur.trim()); cur = s; } else cur += ' ' + s; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
console.log('Downloading/loading the embedding model on first run (~35MB, one time)...');
const emb = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { quantized: true });
async function pvec(t) { return Array.from((await emb(t, { pooling: 'mean', normalize: true })).data); }
const anchors = [];
for (const f of AB.FACTS) {
  for (const c of chunks(f.text)) anchors.push({ id: f.id, v: Buffer.from(new Float32Array(await pvec(c)).buffer).toString('base64') });
  for (const p of (phrases[f.id] || [])) anchors.push({ id: f.id, v: Buffer.from(new Float32Array(await pvec(p)).buffer).toString('base64') });
}
const out = { model: 'bge-small-en-v1.5', queryPrefix: 'Represent this sentence for searching relevant passages: ', dims: 384, threshold: 0.67, margin: 0, anchors };
fs.writeFileSync(path.join(root, 'data', 'anchors.json'), JSON.stringify(out));
console.log('wrote anchors.json with', anchors.length, 'anchors');
