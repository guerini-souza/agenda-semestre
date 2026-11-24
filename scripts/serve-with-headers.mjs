// Servidor estático mínimo para validar, fora da Vercel, os cabeçalhos de segurança do vercel.json.
// O `vite preview` não aplica esses cabeçalhos; este script serve `dist/` e os aplica como a Vercel faria.
// Uso: npm run build && node scripts/serve-with-headers.mjs [porta]   (padrão: 4173, só em 127.0.0.1)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const config = JSON.parse(await readFile(process.env.HEADERS_CONFIG || 'vercel.json', 'utf8')); // HEADERS_CONFIG: variante de teste da política
// Só o formato usado em vercel.json: "source" com `(.*)` ou `:nome*` e cabeçalhos { key, value }.
const rules = (config.headers ?? []).map(rule => ({
  pattern: new RegExp(`^${rule.source.replace(/\(\.\*\)|:[A-Za-z_]+\*/g, '.*')}$`),
  headers: rule.headers
}));

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.gz': 'application/gzip', '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json; charset=utf-8'
};

async function findFile(urlPath) {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const candidate = resolve(join(root, relative));
  if (candidate !== root && !candidate.startsWith(root + sep)) return undefined; // fora de dist/
  try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* cai no fallback */ }
  return extname(relative) ? undefined : join(root, 'index.html'); // rotas sem extensão voltam ao index.html (SPA)
}

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    for (const rule of rules) if (rule.pattern.test(pathname)) for (const { key, value } of rule.headers) response.setHeader(key, value);
    const file = await findFile(pathname);
    if (!file) { response.statusCode = 404; response.end('Não encontrado'); return; }
    const body = await readFile(file);
    response.setHeader('Content-Type', types[extname(file).toLowerCase()] ?? 'application/octet-stream');
    response.statusCode = 200;
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.statusCode = error instanceof URIError ? 400 : 500; response.end('Erro');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Servindo dist/ com os cabeçalhos do vercel.json em http://127.0.0.1:${port}`));
