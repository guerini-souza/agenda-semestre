import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import * as XLSX from 'xlsx';

// All names, dates and courses below are deliberately fictional.
await mkdir('tests/fixtures', { recursive: true });
await mkdir('public/examples', { recursive: true });
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Modelo sintético');
sheet.addRows([
  ['Disciplina', 'Tipo', 'Título', 'Data', 'Início', 'Fim', 'Dia da semana', 'Início do período', 'Fim do período', 'Local'],
  ['Matemática aplicada (exemplo)', 'Prova', 'Prova sintética 1', '20/10/2026', '14:00', '16:00', '', '', '', 'Sala fictícia 12'],
  ['Projeto integrador (exemplo)', 'Entrega', 'Entrega sintética', '23/10/2026', '', '', '', '', '', ''],
  ['Matemática aplicada (exemplo)', 'Aula semanal', '', '', '14:00', '16:00', 'Terça', '06/10/2026', '24/11/2026', 'Sala fictícia 12'],
]);
sheet.getRow(1).font = { bold: true };
sheet.columns.forEach(column => { column.width = 27; });
await workbook.xlsx.writeFile('tests/fixtures/grade-sintetica.xlsx');
const legacy = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(legacy, XLSX.utils.aoa_to_sheet([
  ['Horário', 'Turma', 'Turma Prática', 'Salas', 'Responsáveis', 'Observações'],
  ['Segunda 14:00 - 15:00', 'A - Disciplina Sintética (EXE101)', '1', 'Sala fictícia (03/08/2026 a 14/12/2026, semanalmente)', 'Pessoa fictícia', ''],
  ['Segunda 15:00 - 16:00', 'A - Disciplina Sintética (EXE101)', '1', 'Sala fictícia (03/08/2026 a 14/12/2026, semanalmente)', 'Pessoa fictícia', ''],
]), 'Grade sintética');
await writeFile('tests/fixtures/grade-legada-sintetica.xls', XLSX.write(legacy, { type: 'buffer', bookType: 'biff8' }));

const lines = ['EXEMPLO SINTÉTICO - SEM VÍNCULO INSTITUCIONAL', 'Disciplina: Projeto integrador (exemplo)', 'Prova 1 20/10/2026 14:00 - 16:00', 'Entrega do projeto 23/10/2026', 'Apresentação 27/10/2026 10:00 - 11:30'];
const canvas = createCanvas(1400, 850);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1400, 850);
ctx.fillStyle = '#000000'; ctx.font = '30px Arial';
lines.forEach((line, index) => ctx.fillText(line, 60, 90 + index * 100));
const png = canvas.toBuffer('image/png');
for (const mode of ['textual', 'escaneado', 'misto', 'duas-paginas']) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Exemplo sintético ${mode}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([842, 595]);
  if (mode === 'textual' || mode === 'duas-paginas') {
    lines.forEach((line, index) => page.drawText(line, { x: 40, y: 540 - index * 60, size: 16, font, color: rgb(0, 0, 0) }));
    if (mode === 'duas-paginas') pdf.addPage([842, 595]).drawText('Prova 2 10/11/2026 14:00 - 16:00', { x: 40, y: 540, size: 16, font });
  } else {
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 20, y: 35, width: 800, height: 485 });
    if (mode === 'misto') page.drawText('EXEMPLO SINTÉTICO - cabeçalho textual, cronograma em imagem', { x: 30, y: 565, size: 15, font });
  }
  await writeFile(`tests/fixtures/plano-${mode}-sintetico.pdf`, await pdf.save());
}
for (const name of ['grade-sintetica.xlsx', 'plano-textual-sintetico.pdf', 'plano-escaneado-sintetico.pdf']) await copyFile(`tests/fixtures/${name}`, `public/examples/${name}`);
console.log('Fixtures sintéticas geradas. Nenhum original foi copiado.');
