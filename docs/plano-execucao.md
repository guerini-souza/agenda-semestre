# Plano de implementação — Semestre

**Objetivo:** entregar uma base local demonstrável para validar documentos acadêmicos e gerar calendário.
**Arquitetura:** aplicação estática com bibliotecas carregadas sob demanda; OCR local com worker e idioma empacotados. Estado em memória. Eventos confirmados são a única entrada da exportação.
**Stack:** React, Vite, TypeScript, Tailwind, Zod, ExcelJS, PDF.js, Tesseract.js, ICS, Vitest, Playwright.

O prompt já define execução coordenada por agentes; não é necessário reabrir a escolha do método. Subskills de planejamento não disponíveis não serão dependências obrigatórias.

- [x] Contratos, configuração e dependências: `src/lib/domain/types.ts`, `package.json`, lockfile, configurações TypeScript/Vite/testes.
- [x] Regras verificáveis em `src/lib/domain/calendar.ts` e `tests/domain.test.ts`: 31/02 rejeitado; limites inclusivos; exclusões; prova sem hora bloqueada; choque entre disciplinas alertado; duplicata exata mesclada preservando fontes.
- [x] Importação em `src/lib/import/`: XLSX com assinatura explícita, PDF textual/escaneado/misto, evidências por página/célula, processamento sequencial, cancelamento e falha isolada. Fixtures sintéticas em `tests/fixtures/` e amostras públicas claramente marcadas.
- [x] Interface em `src/App.tsx`, `src/components/`, `src/styles.css`: upload, demonstração, contexto, leitura assistida, edição, seleção, confirmação e exportação. Nenhum ano corrente preenchido silenciosamente.
- [x] ICS em `src/lib/calendar/ics.ts`: biblioteca, UID estável, data local convertida com fuso explícito, dia inteiro com fim exclusivo. Testar escaping, fuso e repetição.
- [x] Google em `src/lib/auth/` e `src/lib/calendar/google.ts`: OAuth por gesto, token em memória, escopo restrito, agenda secundária, IDs estáveis, falha parcial, bloqueio por cota. Documentar testes reais pendentes sem cliente.
- [x] Validação: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Navegar upload → edição → confirmação → download, testar erros e viewport móvel; conferir requisições locais dos documentos.
- [x] Entrega: README, `.env.example`, limitações e passos de validação das amostras/Google/iPhone/Vercel.

## Pendências externas de aceite

A implementação local e os testes estão concluídos. Acesso Vercel, OAuth em conta real, iPhone físico e exclusões acadêmicas confirmadas seguem abertos em docs/validacao.md.
