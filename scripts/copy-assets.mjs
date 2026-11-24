import { mkdir, copyFile, cp, readdir, stat } from 'node:fs/promises';
await mkdir('public/ocr/core', { recursive: true });
await mkdir('public/ocr/lang', { recursive: true });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js');
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (/^tesseract-core.*\.(js|wasm)$/.test(file)) await copyFile(`node_modules/tesseract.js-core/${file}`, `public/ocr/core/${file}`);
}
// OEM 1 uses only LSTM: match Tesseract.js's default integer model and avoid legacy data.
await copyFile('node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz', 'public/ocr/lang/por.traineddata.gz');
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${folder}`, `public/pdf/${folder}`, { recursive: true });
async function total(path) { let bytes = 0; for (const entry of await readdir(path, { withFileTypes: true })) bytes += entry.isDirectory() ? await total(`${path}/${entry.name}`) : (await stat(`${path}/${entry.name}`)).size; return bytes; }
console.log(`Assets locais OCR/PDF: ${((await total('public/ocr') + await total('public/pdf')) / 1024 / 1024).toFixed(1)} MiB. Carregados sob demanda.`);
