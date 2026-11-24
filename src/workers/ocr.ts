import type { ImportOptions } from '../lib/domain/types';
import { checkCancelled } from '../lib/import/shared';

/** Tesseract owns the browser Worker. No document leaves this device. */
export async function recognizePage(canvas: HTMLCanvasElement, options: ImportOptions): Promise<string> {
  checkCancelled(options.signal);
  const { createWorker } = await import('tesseract.js');
  checkCancelled(options.signal);
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let abortReject: (reason: Error) => void = () => {};
  let failureReject: (reason: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { abortReject = reject; });
  const failure = new Promise<never>((_, reject) => { failureReject = reject; });
  const cancel = () => { void worker?.terminate(); abortReject(new DOMException('Leitura cancelada', 'AbortError')); };
  options.signal?.addEventListener('abort', cancel, { once: true });
  try {
    const initializing = createWorker('por', 1, {
      workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang',
      workerBlobURL: false, gzip: true,
      logger: message => { if (message.status) options.onProgress?.(`OCR local: ${message.status}`); },
      errorHandler: error => failureReject(new Error(String(error))),
    }).then(created => {
      worker = created;
      if (options.signal?.aborted) void created.terminate();
      return created;
    });
    worker = await Promise.race([initializing, aborted, failure]);
    checkCancelled(options.signal);
    const result = await Promise.race([worker.recognize(canvas), aborted, failure]);
    checkCancelled(options.signal);
    return result.data.text;
  } finally {
    options.signal?.removeEventListener('abort', cancel);
    if (worker) await worker.terminate();
  }
}
