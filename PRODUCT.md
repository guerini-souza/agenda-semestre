# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Aluno universitário (UNIFAL):** tem a grade de horários (XLS/XLSX) e os planos de ensino (PDF) de cada disciplina e quer ver tudo na própria agenda sem digitar data por data.
- **Professor:** tem o plano de ensino da(s) disciplina(s) que leciona (aulas, avaliações, prazos) e quer tê-lo na própria agenda, importando o documento que já tem ou montando o plano na tela.

## Product Purpose

Transformar horários e planos de ensino em eventos de agenda. Fluxo: enviar ou montar, conferir, adicionar ao Google Agenda (ou baixar `.ics`). Projeto de TCC, ferramenta independente, sem vínculo institucional com a UNIFAL.

## Positioning

Tudo é lido no aparelho: não há servidor, cadastro, banco de dados nem IA. O usuário sempre confere antes de qualquer evento chegar à agenda.

## Operating Context

Entradas reais: grade `.xls`/`.xlsx` da UNIFAL, planos de ensino em PDF (texto ou escaneado, com OCR local). Saídas: Google Agenda via OAuth (escopo mínimo `calendar.app.created`) ou arquivo ICS. Hospedagem estática na Vercel (https://app-agendas.vercel.app). Uso em computador e celular.

## Capabilities and Constraints

- Sem servidor: o plano do professor vai somente para a agenda do próprio professor (decisão de 05/11/2026). Compartilhar com a turma por link e publicar com login ficam como evolução futura.
- Limites (desde 12/11/2026): 20 arquivos, 10 MB por arquivo, 150 páginas de PDF somadas, 1.500 eventos por lote. Antes eram 5 arquivos e 30 páginas, o que travava quem cursa muitas disciplinas.
- Datas inválidas bloqueiam a exportação; avaliações sem horário viram dia inteiro; feriados não são presumidos.
- Google ainda não validado com conta real (falta `VITE_GOOGLE_CLIENT_ID`).
- Sem requisições externas durante a leitura de documentos (fontes e OCR são locais).

## Brand Commitments

Nome **Semestre**. Idioma: português do Brasil. Voz direta, sem promessas de vínculo com a universidade.

## Evidence on Hand

Exemplos sintéticos em `public/examples/` e `tests/fixtures/`. Amostras reais na raiz (ignoradas pelo Git, não distribuir).

## Product Principles

1. O usuário dá a última conferida; nada vai para a agenda sem revisão.
2. Privacidade por padrão: documentos ficam no aparelho.
3. Custo zero para o usuário e para o projeto.
4. Perfis claros: aluno e professor veem a mesma ferramenta com a linguagem e o ponto de partida certos.
5. Nunca inventar data, horário, feriado ou vínculo institucional.

## Accessibility & Inclusion

Navegação por teclado, foco visível, contraste mínimo AA, texto em português claro, respeito a `prefers-reduced-motion`, uso confortável em celular.
