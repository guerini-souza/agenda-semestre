# 7. Acabamento: rascunho, feriados, acessibilidade, segurança e CI

Rodada de acabamento feita em 11/11/2026, sobre a base do commit `f53071a`. Nenhuma regra de leitura de PDF/planilha, OCR, ICS ou envio ao Google foi alterada.

## O que foi feito

### 1. Rascunho do professor
- O formulário do plano (disciplina, dias, horários, período, dias sem aula e motivos, avaliações, conteúdo de cada aula e campos do PDF do plano de aula) é salvo em `localStorage`, chave `semestre:draft:v1`, cerca de 400 ms depois da última alteração. Ao sair da tela (conferência, recarregar, fechar a aba) o que estiver pendente é gravado na hora.
- Ao abrir a tela, o rascunho é restaurado, inclusive depois de "Gerar aulas e conferir" e "Voltar ao plano" (o componente desmonta e remonta).
- O que é lido passa por validação (Zod, `src/lib/draft.ts`). Rascunho de outra versão, corrompido ou com formato errado é ignorado, sem quebrar a página. Armazenamento indisponível também é tolerado (tudo em `try/catch`).
- Aparecem a linha "Rascunho salvo neste navegador" (só quando a gravação de fato deu certo) e o botão "Limpar rascunho", que pede uma confirmação simples na própria tela e zera o formulário.
- O rascunho fica só neste navegador. Não há servidor; quem usa computador compartilhado deve usar "Limpar rascunho".

### 2. Feriados nacionais
- `nationalHolidays(ano)` em `src/lib/domain/holidays.ts`: Confraternização Universal, Sexta-feira Santa (Páscoa pelo algoritmo de Meeus, menos 2 dias), Tiradentes, Dia do Trabalho, Independência, Nossa Senhora Aparecida, Finados, Proclamação da República, Consciência Negra (só de 2024 em diante) e Natal. Carnaval e Corpus Christi são ponto facultativo e não entram.
- Botão "Adicionar feriados nacionais do período", ao lado de "Adicionar dia": inclui só os feriados dentro do período de aulas e em dia da semana que tem aula, ainda não listados, com motivo "Feriado". Fica desabilitado, com dica, enquanto faltam os dias da semana ou as datas.
- O aviso na tela diz para conferir e incluir os feriados estaduais e municipais. O aplicativo continua sem presumir feriados que ele não conhece.

### 3. Acessibilidade (axe-core)
- `tests/e2e/a11y.spec.ts` roda o axe (WCAG 2.0/2.1, A e AA) em: escolha de perfil, aluno (envio), aluno na conferência (lista e calendário) e exportação, professor (formulário do plano de aula, ) e professor na conferência. Falha com violações `serious` ou `critical`.
- Resultado: nenhuma violação `serious` ou `critical` nessas telas. O que o axe apontou, em regras de boas práticas (`moderate`), foi corrigido e passou a fazer parte do teste: os títulos "Conteúdo programático" e "Sistema de avaliação" eram `h4` direto sob `h2` (viraram `h3`), e as etapas de conferência e exportação não tinham `h1` (ganharam um `h1` só para leitores de tela, com o título do perfil).
- Um teste de controle (página com imagem sem texto alternativo, botão sem nome e texto de baixo contraste) confirmou que o axe está de fato detectando problemas neste ambiente.
- O axe encontra só uma parte dos problemas de acessibilidade. Não substitui o teste manual com teclado e leitor de tela.

### 4. Cabeçalhos de segurança
`vercel.json` ganhou `Content-Security-Policy`, `Strict-Transport-Security` (`max-age=63072000; includeSubDomains`) e `Cross-Origin-Opener-Policy: same-origin-allow-popups` (necessário para o popup do Google; `same-origin` o quebraria). Os três cabeçalhos que já existiam foram mantidos.

| Diretiva | Valor | Por quê |
| --- | --- | --- |
| `default-src` | `'self'` | base restritiva |
| `script-src` | `'self' 'wasm-unsafe-eval'` + Google Identity (`accounts.google.com`, `/gsi/client`) | **`'wasm-unsafe-eval'` é necessário**: o OCR (Tesseract) e o PDF.js usam WebAssembly. Sem ele o teste de OCR falha por tempo esgotado. Sem `'unsafe-eval'` e sem `'unsafe-inline'` |
| `style-src` | `'self'` + `accounts.google.com/gsi/style` | o app não precisa de `'unsafe-inline'` (verificado: o fluxo roda sem ele) |
| `img-src` | `'self' data: blob: https://*.googleusercontent.com` | como pedido; ver "Não verificado" |
| `font-src` | `'self' data:` | fontes são do próprio site |
| `connect-src` | `'self'`, `www.googleapis.com`, `openidconnect.googleapis.com`, `oauth2.googleapis.com`, `accounts.google.com` (e `/gsi/`) | só o que o envio ao Google usa |
| `frame-src` | `accounts.google.com` (e `/gsi/`) | Google Identity |
| `worker-src` | `'self' blob:` | workers do PDF.js e do OCR |
| `object-src`, `base-uri`, `form-action`, `frame-ancestors` | `'none'`, `'self'`, `'self'`, `'none'` | |

Descoberta durante o teste: o Zod, ao montar validadores, tenta `Function('')` para gerar código. Sob a CSP isso é bloqueado e registrado como violação (o app continuava funcionando, mas com um erro no console). O Zod passou a rodar sem esse atalho (`z.config({ jitless: true })` em `src/lib/zodSetup.ts`, de onde `types.ts` e `draft.ts` importam o `z`). A validação é a mesma.

O `vite preview` **não** aplica os cabeçalhos do `vercel.json`. Por isso existe `scripts/serve-with-headers.mjs` (`npm run serve:headers`), que serve `dist/` com os cabeçalhos lidos do `vercel.json`. É com ele que a suíte de navegador foi rodada.

### 5. CI
`.github/workflows/ci.yml`, em push e pull request: job `checks` (`tsc -b`, ESLint, Vitest, `npm audit --omit=dev --audit-level=high`, build) e job `e2e` (Chromium do Playwright, build, servidor com cabeçalhos na porta 4173, suíte de navegador, `test-results` enviado como artefato em caso de falha).

## Como foi verificado
| Verificação | Resultado |
| --- | --- |
| TypeScript (`tsc -b`) | passou |
| ESLint | passou |
| Vitest | **74 passaram**, 4 pulados (um arquivo novo de rascunho com 5 testes e um de feriados com 8) |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Build de produção | passou |
| Playwright no servidor de desenvolvimento | **20 passaram**, 6 pulados: 3 usam amostras pessoais que não existem nesta cópia e 3 são os testes de CSP, que se pulam fora de um servidor com cabeçalhos |
| Playwright em `serve-with-headers.mjs` (com a CSP) | **23 passaram**, 3 pulados (as amostras pessoais). Inclui OCR, PDF com texto, geração dos dois PDFs e ICS, sem nenhuma violação de CSP |

Experimento para a CSP: com a mesma suíte, tirar `'wasm-unsafe-eval'` faz o OCR falhar; tirar `blob:` de `worker-src`, `blob:` ou `data:` de `img-src` e `data:` de `font-src` não quebrou nada (por isso aparecem em "Não verificado").

O que dependia de conta, aparelho ou serviço externo não foi verificado, e está listado abaixo.

## Não verificado
- **Google real.** A CSP foi montada com as origens do Google Identity, e um teste confirma que a política deixa passar o script `https://accounts.google.com/gsi/client` e um `fetch` a `www.googleapis.com` (respostas simuladas, sem rede) e bloqueia hosts fora da lista. Mas o popup de login, o consentimento e a criação de eventos **não foram testados com o Google de verdade** (falta `VITE_GOOGLE_CLIENT_ID`). Se algo for bloqueado na primeira prova real, olhar o console do navegador por "Content Security Policy" e ajustar `vercel.json`.
- **Cabeçalhos na Vercel.** Validados num servidor local que os aplica; não foram conferidos no site publicado.
- **`img-src` (`data:`, `blob:`, `googleusercontent.com`), `font-src data:` e `worker-src blob:`**: mantidos como pedido, mas o fluxo testado passa sem `blob:` em `worker-src`, sem `data:`/`blob:` em `img-src` e sem `data:` em `font-src`. Se nenhuma prova real exigir, podem ser removidos para apertar a política.
- **CI no GitHub.** O workflow foi escrito e a sintaxe YAML foi carregada com um leitor local, mas não rodou no GitHub.
- **Testes com as amostras pessoais** (grade real e PDFs na raiz) foram pulados: os arquivos não existem nesta cópia.
- **Acessibilidade manual** (leitor de tela, teclado, zoom, iPhone) não foi feita; só o axe.
