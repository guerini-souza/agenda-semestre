import { emptyResult, ImportContextSchema, LIMITS, type ImportContext, type ImportOptions, type ImportResult } from '../domain/types';
import { checkCancelled, issue, stableId } from './shared';

export async function importFiles(files: File[], context: ImportContext, options: ImportOptions = {}): Promise<ImportResult> {
  ImportContextSchema.parse(context);
  const result = emptyResult();
  let pages = 0;
  for (const [index, file] of files.entries()) {
    const meta = { fileId: stableId(`${file.name}:${file.size}:${file.lastModified}`), fileName: file.name };
    try {
      checkCancelled(options.signal);
      if (index >= LIMITS.files) throw new Error(`Limite de ${LIMITS.files} arquivos por lote.`);
      if (file.size > LIMITS.bytesPerFile) throw new Error('O arquivo ultrapassa o limite de 10 MB.');
      if (!file.size) throw new Error('O arquivo está vazio.');
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'xlsx', 'xls'].includes(extension ?? '')) throw new Error('Formato não aceito. Envie PDF, XLSX ou XLS.');
      options.onProgress?.(`Lendo ${file.name} no seu aparelho`);
      const data = await file.arrayBuffer();
      checkCancelled(options.signal);
      const imported = extension === 'pdf'
        ? await (await import('./pdf')).readPdf(data, meta, context, options, LIMITS.pages - pages)
        : await (await import('./xlsx')).readSpreadsheet(data, meta, context, options, extension === 'xls');
      pages += imported.files.reduce((sum, item) => sum + (item.pages ?? 0), 0);
      result.events.push(...imported.events);
      result.schedules.push(...imported.schedules);
      result.files.push(...imported.files);
      result.issues.push(...imported.issues);
      if (result.events.length > LIMITS.events) {
        result.events = result.events.slice(0, LIMITS.events);
        result.issues.push(issue(meta.fileId, 'limit', 'Limite de 1.500 candidatos atingido. Divida os arquivos em lotes menores; os trechos permanecem disponíveis.'));
        const last = result.files.at(-1);
        if (last) { last.status = 'partial'; last.message += ' Limite de eventos atingido.'; }
      }
    } catch (error) {
      result.files.push({ ...meta, status: options.signal?.aborted ? 'cancelled' : 'error', message: options.signal?.aborted ? 'Leitura cancelada.' : error instanceof Error ? error.message : 'Não foi possível ler este arquivo.', sources: [] });
    }
  }
  return result;
}
