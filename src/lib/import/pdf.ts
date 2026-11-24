import { emptyResult, LIMITS, type ImportContext, type ImportOptions, type ImportResult, type SourceRef } from '../domain/types';
import { checkCancelled, issue } from './shared';
import { documentInfo, groupPositionedText, interpretSources } from './text';

export type FileMeta = { fileId: string; fileName: string };
type Matrix = [number, number, number, number, number, number];
function multiply(a: Matrix, b: Matrix): Matrix {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}
export function imageCoverage(operations: { fnArray: number[]; argsArray: unknown[][] }, ops: Record<string, number>, pageArea: number): { hasImage: boolean; largeImage: boolean } {
  let current: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let hasImage = false, largeImage = false;
  const images = [ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageMaskXObject];
  operations.fnArray.forEach((fn, index) => {
    if (fn === ops.save) stack.push([...current]);
    if (fn === ops.restore) current = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    if (fn === ops.transform) current = multiply(current, operations.argsArray[index] as Matrix);
    if (images.includes(fn)) {
      hasImage = true;
      if (Math.abs(current[0] * current[3] - current[1] * current[2]) / pageArea > 0.12) largeImage = true;
    }
  });
  return { hasImage, largeImage };
}

export async function readPdf(data: ArrayBuffer, meta: FileMeta, context: ImportContext, options: ImportOptions, pageBudget: number): Promise<ImportResult> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  checkCancelled(options.signal);
  const loading = pdfjs.getDocument({ data: new Uint8Array(data), stopAtErrors: false, cMapUrl: '/pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdf/standard_fonts/', wasmUrl: '/pdf/wasm/' });
  const abortLoad = () => { void loading.destroy(); };
  options.signal?.addEventListener('abort', abortLoad, { once: true });
  const result = emptyResult();
  const sources: SourceRef[] = [];
  let processed = 0, partial = false;
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > pageBudget) throw new Error(`Limite de ${LIMITS.pages} páginas PDF por lote. Este arquivo tem ${pdf.numPages} páginas e só cabem ${pageBudget} neste lote; envie um lote menor.`);
    const requested = options.pages ? [...new Set(options.pages)].sort((a, b) => a - b) : Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    if (!requested.length || requested.some(p => !Number.isInteger(p) || p < 1 || p > pdf.numPages)) throw new Error('Seleção de páginas inválida para este PDF.');
    for (const number of requested) {
      checkCancelled(options.signal);
      options.onProgress?.(`${meta.fileName}: lendo página ${number} de ${pdf.numPages}`);
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        const items = content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height }] : []);
        const text = groupPositionedText(items).join('\n');
        const viewport = page.getViewport({ scale: 1 });
        const coverage = imageCoverage(await page.getOperatorList(), pdfjs.OPS, viewport.width * viewport.height);
        const category = text.trim().length > 30 ? coverage.hasImage ? 'mista' : 'textual' : 'imagem';
        const needsOcr = options.forceOcr || text.trim().length < 30 || coverage.largeImage;
        if (text.trim()) sources.push({ ...meta, page: number, excerpt: text, method: 'pdf-text' });
        options.onProgress?.(`${meta.fileName}: página ${number} ${category}${needsOcr ? ' — preparando OCR local' : ''}`);
        if (needsOcr) {
          checkCancelled(options.signal);
          const scale = Math.min(2, 1800 / Math.max(viewport.width, viewport.height));
          const renderViewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(renderViewport.width); canvas.height = Math.ceil(renderViewport.height);
          try {
            const render = page.render({ canvas, viewport: renderViewport });
            const cancelRender = () => render.cancel();
            options.signal?.addEventListener('abort', cancelRender, { once: true });
            try { await render.promise; } finally { options.signal?.removeEventListener('abort', cancelRender); }
            const { recognizePage } = await import('../../workers/ocr');
            const recognized = await recognizePage(canvas, options);
            sources.push({ ...meta, page: number, excerpt: recognized || '(OCR não reconheceu texto nesta página.)', method: 'ocr' });
            if (!recognized.trim()) partial = true;
          } finally { canvas.width = 0; canvas.height = 0; }
        }
        if (!text.trim() && !needsOcr) sources.push({ ...meta, page: number, excerpt: '(Página sem texto extraível.)', method: 'pdf-text' });
        processed++;
      } catch (error) {
        checkCancelled(options.signal);
        partial = true;
        const reason = `Página ${number}: ${error instanceof Error ? error.message : 'não foi possível ler'}`;
        result.issues.push(issue(`${meta.fileId}:${number}`, 'source', reason));
        sources.push({ ...meta, page: number, excerpt: reason, method: 'pdf-text' });
      } finally { page.cleanup(); }
    }
    const info = documentInfo(sources);
    // Preserve events from both paths: OCR may miss selectable text on a mixed page.
    result.events = interpretSources(sources, context);
    if (!result.events.length) { partial = true; result.issues.push(issue(meta.fileId, 'source', 'Não foi possível identificar eventos seguros. Selecione os trechos e cadastre os eventos na revisão.')); }
    result.files.push({ ...meta, status: partial ? 'partial' : 'complete', pages: pdf.numPages, sources, message: `${processed} página(s) lida(s); ${result.events.length} candidato(s) para conferir.${info.year ? ` Ano documental: ${info.year}.` : ''}` });
    return result;
  } catch (error) {
    const cancelled = options.signal?.aborted;
    result.events = interpretSources(sources, context);
    result.files.push({ ...meta, status: cancelled ? 'cancelled' : sources.length ? 'partial' : 'error', pages: processed, sources, message: cancelled ? 'Leitura cancelada; trechos já lidos foram preservados.' : error instanceof Error ? error.message : 'PDF inválido.' });
    return result;
  } finally {
    options.signal?.removeEventListener('abort', abortLoad);
    await loading.destroy();
  }
}
