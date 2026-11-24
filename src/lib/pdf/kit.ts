import type { PDFFont } from 'pdf-lib';

/** Utilidades comuns aos PDFs gerados: texto seguro para a fonte padrão e quebra de linha por largura. */
export function makeKit(regular: PDFFont, bold: PDFFont) {
  const supported = new Set(regular.getCharacterSet());
  /** Normaliza espaços e troca por "?" o que a fonte padrão não consegue desenhar (símbolos, emojis). */
  const clean = (text: string) => Array.from(text.replace(/\s+/g, ' ').trim()).map(ch => supported.has(ch.codePointAt(0)!) ? ch : '?').join('');
  /** Quebra o texto em linhas de até `width` pontos; a primeira linha pode ter largura própria (rótulo na mesma linha). */
  function wrap(text: string, font: PDFFont, size: number, width: number, firstWidth = width): string[] {
    const measure = (value: string) => font.widthOfTextAtSize(value, size);
    const lines: string[] = [];
    let line = '', limit = firstWidth;
    for (const word of clean(text).split(' ').filter(Boolean)) {
      let piece = word;
      if (line && measure(`${line} ${piece}`) > limit) { lines.push(line); line = ''; limit = width; }
      while (measure(piece) > limit) { // palavra maior que a coluna: quebra por caractere
        let cut = piece.length; while (cut > 1 && measure(piece.slice(0, cut)) > limit) cut--;
        lines.push(piece.slice(0, cut)); piece = piece.slice(cut); limit = width;
      }
      line = line ? `${line} ${piece}` : piece;
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }
  return { regular, bold, clean, wrap };
}
export type PdfKit = ReturnType<typeof makeKit>;
