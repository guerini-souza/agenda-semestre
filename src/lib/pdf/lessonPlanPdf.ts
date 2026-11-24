import { buildLessonPlanDocument, lessonPlanFileName } from '../domain/lessonPlan';
import type { LessonPlanDocument } from '../domain/lessonPlan';
import type { TeachingPlan } from '../domain/teaching';
import { makeKit } from './kit';

const W = 595.28, H = 841.89, MARGIN = 42, TOP = 50, BOTTOM = 62;
// Colunas: totais do mês (fora da tabela) | DATA | CH | CONTEÚDO. As posições seguem o que o leitor de PDF do app reconhece.
const X0 = 120, DATE_W = 58, CH_W = 40, RIGHT = W - MARGIN, CONTENT_X = X0 + DATE_W + CH_W;
const SIZE = 9, LEADING = 11.5;
const decimal = (value: number) => String(value).replace('.', ',');

/** Gera o PDF "Plano de aula" (A4, uma ou mais páginas) inteiramente no navegador. */
export async function renderLessonPlanPdf(doc: LessonPlanDocument): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title); pdf.setSubject('Documento de apoio gerado pelo Semestre; não é um documento oficial'); pdf.setCreator('Semestre'); pdf.setProducer('Semestre');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { clean, wrap } = makeKit(regular, bold);
  const ink = rgb(0.12, 0.14, 0.2), grid = rgb(0.42, 0.44, 0.5), headFill = rgb(0.89, 0.91, 0.98), breakFill = rgb(0.95, 0.95, 0.96);
  const brand = rgb(0.165, 0.294, 0.702), noticeFill = rgb(0.996, 0.949, 0.8), noticeLine = rgb(0.78, 0.6, 0.18);

  let page = pdf.addPage([W, H]);
  let y = H - TOP;
  const text = (value: string, x: number, baseline: number, font = regular, size = SIZE) => { if (value) page.drawText(clean(value), { x, y: baseline, size, font, color: ink }); };
  const box = (x: number, top: number, width: number, height: number, fill?: ReturnType<typeof rgb>) => page.drawRectangle({ x, y: top - height, width, height, borderColor: grid, borderWidth: 0.6, ...(fill ? { color: fill } : {}) });
  const centered = (value: string, baseline: number, font: typeof regular, size: number) => text(value, (W - font.widthOfTextAtSize(clean(value), size)) / 2, baseline, font, size);

  function columnHeader() {
    const height = 20;
    box(X0, y, DATE_W, height, headFill); box(X0 + DATE_W, y, CH_W, height, headFill); box(CONTENT_X, y, RIGHT - CONTENT_X, height, headFill);
    text('DATA', X0 + 8, y - 13.5, bold); text('CH', X0 + DATE_W + 10, y - 13.5, bold); text('CONTEÚDO PROGRAMÁTICO', CONTENT_X + 6, y - 13.5, bold);
    y -= height;
  }
  function newPage() {
    page = pdf.addPage([W, H]); y = H - TOP;
    text(doc.title, MARGIN, y - 4, bold, 10); text(doc.fields[0].value, MARGIN, y - 18, regular, 8.5);
    y -= 32; columnHeader();
  }

  // Cabeçalho da primeira página
  for (const line of doc.institution) { centered(line, y - 8, bold, 9.5); y -= 13; }
  if (doc.institution.length) y -= 8;
  // Faixa de título na cor do Semestre e aviso: o documento é de apoio, não o oficial.
  page.drawRectangle({ x: MARGIN, y: y - 26, width: RIGHT - MARGIN, height: 26, color: brand });
  const titleWidth = bold.widthOfTextAtSize(clean(doc.title), 12.5);
  page.drawText(clean(doc.title), { x: (W - titleWidth) / 2, y: y - 17, size: 12.5, font: bold, color: rgb(1, 1, 1) });
  y -= 26;
  const notice = wrap(doc.notice, regular, 8.5, RIGHT - MARGIN - 16);
  const noticeHeight = notice.length * 11 + 10;
  page.drawRectangle({ x: MARGIN, y: y - noticeHeight, width: RIGHT - MARGIN, height: noticeHeight, color: noticeFill, borderColor: noticeLine, borderWidth: 0.6 });
  notice.forEach((line, i) => text(line, MARGIN + 8, y - 13 - i * 11, regular, 8.5));
  y -= noticeHeight + 8;
  for (const field of doc.fields) {
    const label = `${field.label}:`;
    const labelWidth = 178;
    const lines = wrap(field.value, regular, SIZE, RIGHT - MARGIN - labelWidth - 12);
    const height = Math.max(20, lines.length * LEADING + 8);
    box(MARGIN, y, labelWidth, height); box(MARGIN + labelWidth, y, RIGHT - MARGIN - labelWidth, height);
    text(label, MARGIN + 6, y - height / 2 - 3, bold);
    lines.forEach((line, i) => text(line, MARGIN + labelWidth + 6, y - height / 2 + ((lines.length - 1) * LEADING) / 2 - i * LEADING - 3));
    y -= height;
  }
  y -= 14; columnHeader();

  // Linhas: data, carga horária e conteúdo (centralizados na altura da linha)
  const monthAt = new Map(doc.monthTotals.map(m => [m.rowIndex, m.label]));
  for (const [index, row] of doc.rows.entries()) {
    const lines = wrap(row.content, regular, SIZE, RIGHT - CONTENT_X - 12);
    const height = Math.max(20, lines.length * LEADING + 8);
    if (y - height < BOTTOM) newPage();
    const fill = row.kind === 'break' ? breakFill : undefined;
    box(X0, y, DATE_W, height, fill); box(X0 + DATE_W, y, CH_W, height, fill); box(CONTENT_X, y, RIGHT - CONTENT_X, height, fill);
    const middle = y - height / 2 - 3;
    text(row.dateLabel, X0 + 8, middle);
    text(row.hours === null ? '----' : decimal(row.hours), X0 + DATE_W + 10, middle);
    lines.forEach((line, i) => text(line, CONTENT_X + 6, y - height / 2 + ((lines.length - 1) * LEADING) / 2 - i * LEADING - 3, regular));
    const month = monthAt.get(index); if (month) text(month, MARGIN, middle, bold, 8.5);
    y -= height;
  }

  if (doc.observation) {
    const lines = wrap(`OBS: ${doc.observation}`, regular, SIZE, RIGHT - MARGIN);
    if (y - lines.length * LEADING - 16 < BOTTOM) newPage();
    y -= 16;
    lines.forEach((line, i) => { if (i === 0) { text('OBS:', MARGIN, y - 8, bold); text(line.slice(4).trimStart(), MARGIN + bold.widthOfTextAtSize('OBS: ', SIZE), y - 8); } else text(line, MARGIN, y - 8 - i * LEADING); });
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText('Documento de apoio gerado pelo Semestre · não oficial', { x: MARGIN, y: 30, size: 7.5, font: regular, color: grid });
    const label = `${i + 1}/${pages.length}`;
    p.drawText(label, { x: RIGHT - regular.widthOfTextAtSize(label, 8), y: 30, size: 8, font: regular, color: grid });
  });
  return pdf.save();
}

/** Monta e baixa o PDF do plano de aula. Só funciona no navegador. */
export async function downloadLessonPlanPdf(plan: TeachingPlan): Promise<void> {
  const bytes = await renderLessonPlanPdf(buildLessonPlanDocument(plan));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a'); link.href = url; link.download = lessonPlanFileName(plan); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
