# Perfis (aluno/professor) e redesenho — plano de implementação

> Execução inline na mesma sessão, em 05/11/2026. Decisão de escopo aprovada pelo responsável: o plano do professor vai **somente para a agenda do próprio professor** (sem servidor, sem login).

**Objetivo:** separar o app em "Sou aluno" e "Sou professor", criar a área de planos de ensino do professor e redesenhar toda a interface (calendário visual, ilustrações SVG, tipografia legível).

**Arquitetura:** o motor existente (`importFiles`, `prepareSchedules`, `reconcileEvents`, `confirmEvents`, ICS, Google) não muda. Entram três peças novas: perfil (`src/lib/role.ts`), construtor de plano (`src/lib/domain/teaching.ts`, função pura testada) e componentes de interface (`RoleGate`, `TeacherPlanBuilder`, `MonthCalendar`, `Illustrations`). O `styles.css` é reescrito sobre tokens.

**Stack:** React 19, Vite, TypeScript, Zod, Vitest, Playwright. Fontes autohospedadas (`@fontsource-variable/fraunces`, `@fontsource-variable/instrument-sans`) para não violar "nenhuma requisição externa".

## Restrições globais

- Textos e classes usados pelos testes e2e continuam existindo: `Ler meus arquivos`, `Voltar aos arquivos`, `Adicionar à minha agenda`, `.summary-number` (`<p>N<span>eventos selecionados</span></p>`), `article.event-card`, `Só avaliações`, `Aulas e avaliações`, `Atualizar aulas`.
- Nada de requisição externa em runtime (fontes locais).
- Nenhum token ou segredo no código. `VITE_GOOGLE_CLIENT_ID` só em `.env.local`/Vercel.
- Texto mínimo de 12 px; contraste AA; `prefers-reduced-motion` respeitado.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/role.ts` (novo) | `Role`, `loadRole()`, `saveRole()` com `localStorage` protegido |
| `src/lib/domain/teaching.ts` (novo) | `TeachingPlan`, `validateTeachingPlan`, `buildTeachingPlan` |
| `src/lib/domain/types.ts` | `SourceRef.method` ganha `'plan'` |
| `src/components/Illustrations.tsx` (novo) | SVGs: capa, aluno, professor |
| `src/components/RoleGate.tsx` (novo) | escolha de perfil |
| `src/components/TeacherPlanBuilder.tsx` (novo) | formulário do plano de ensino |
| `src/components/MonthCalendar.tsx` (novo) | calendário mensal da conferência |
| `src/components/UploadStep.tsx`, `ReviewStep.tsx`, `ExportStep.tsx`, `WeekStrip.tsx`, `ContextFields.tsx` | textos por perfil, visual novo, alternância lista/calendário |
| `src/App.tsx` | estado de perfil, novo shell, entrada do professor |
| `src/styles.css` | tokens + todos os componentes |
| `tests/teaching.test.ts` (novo) | testes do construtor de plano |
| `tests/e2e/flow.spec.ts` | perfil aluno pré-definido; novo cenário do professor |
| `docs/tcc/*`, `PRODUCT.md`, `DESIGN.md` | documentação |

## Tarefas

1. **Domínio do plano (TDD).** Escrever `tests/teaching.test.ts` (aulas nas datas certas, exclusões, avaliações como dia inteiro sem horário, erros de validação), ver falhar, implementar `teaching.ts`, ver passar.
   - Produz: `buildTeachingPlan(plan: TeachingPlan): { schedule: CourseSchedule; events: EventCandidate[] }` e `validateTeachingPlan(plan): string[]`.
2. **Perfil.** `role.ts` + `RoleGate` + alternador no cabeçalho.
3. **Construtor do professor.** `TeacherPlanBuilder` alimenta `result.schedules`/`candidates` do `App` e segue para a conferência.
4. **Visual.** Tokens, tipografia, shell, upload, conferência (lista + calendário), exportação, ilustrações.
5. **Verificação.** `typecheck`, `lint`, `test`, `build`, `test:e2e`, conferência no navegador em 1280 px e 390 px.
6. **Documentação do TCC** e `DESIGN.md`.
7. **Google:** ligar `VITE_GOOGLE_CLIENT_ID` quando o responsável enviar o ID público.
