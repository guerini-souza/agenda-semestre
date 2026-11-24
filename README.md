> **Trabalho de Conclusão de Curso** — Bacharelado Interdisciplinar em Ciência e Tecnologia, UNIFAL-MG, campus Poços de Caldas (2026):  
> *Transformando a experiência estudantil: soluções digitais para mobilidade e automação de agenda acadêmica*.  
> **Autores:** Vitor Garcia Guerini e Pedro Affonso de Souza · **Orientadora:** Profa. Marina Gomes Murta Moreno.  
> Outro aplicativo do trabalho: [caronas-unifal](https://github.com/guerini-souza/caronas-unifal) (caronas universitárias).  
> O identificador do cliente OAuth em `.env.production` é público por natureza (aparece no site publicado); os documentos de exemplo são sintéticos.  
> Cópia do código na versão usada no TCC (17/11/2026), sem senhas, chaves nem dados pessoais
> (os valores de configuração ficam fora do repositório; os arquivos `.env.example` mostram só os nomes).

# Semestre

Ferramenta independente para estudantes e professores da UNIFAL transformarem horários e planos em eventos. **Enviar (ou montar) → conferir → adicionar.** Não possui vínculo institucional.

Dois perfis, escolhidos na primeira visita: **aluno** (envia grade e planos) e **professor** (monta o plano de ensino na tela ou importa o PDF; vai para a agenda do próprio professor). Documentação do TCC em [docs/tcc](docs/tcc/README.md).

## Executar

Node **24 LTS** recomendado (mínimo 22.13). Não requer chaves de IA.

```sh
npm ci
npm run dev
```

Abra o endereço local indicado. `npm run build` gera `dist/`, portável para hospedagem estática. `npm run preview` serve esse build. `npm run assets` copia os workers, dados de idioma português e recursos PDF a partir das dependências fixadas. O navegador carrega parsers/OCR sob demanda. O diretório gerado é ignorado no Git e recriado durante o build.

Neste computador, `.\Iniciar.ps1` também inicia o app usando o Node compatível já disponível no ambiente Codex.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:e2e:google   # envio ao Google com o Google simulado (sobe um servidor próprio na porta 5174)
```

`npm run test:e2e` espera o app em `http://127.0.0.1:5173` (`npm run dev`); outra origem pode ser indicada com `TEST_BASE_URL`. Os testes que usam amostras pessoais na raiz (grade e PDFs reais) se pulam sozinhos quando os arquivos não existem. A primeira vez pede o Chromium do Playwright: `npx playwright install chromium`.

O `vite preview` e o servidor de desenvolvimento **não aplicam** os cabeçalhos do `vercel.json`. Para testar com eles (inclusive a política de segurança de conteúdo), rode a suíte completa contra o servidor que os aplica:

```sh
npm run build
npm run serve:headers        # serve dist/ em http://127.0.0.1:4173 com os cabeçalhos do vercel.json
TEST_BASE_URL=http://127.0.0.1:4173 npx playwright test
```

Os testes de `tests/e2e/csp.spec.ts` só valem nesse servidor (em outro, eles se pulam). O teste `tests/e2e/a11y.spec.ts` roda o axe-core nas telas principais. O GitHub Actions (`.github/workflows/ci.yml`) roda tipos, lint, testes unitários, auditoria de dependências e build, e a suíte de navegador contra esse servidor.

## Dados e limites

Até 20 arquivos, 10 MB cada, 150 páginas de PDF somadas e 1.500 eventos por lote (valores em `LIMITS`, `src/lib/domain/types.ts`). Aceita PDF, XLSX e XLS legado, incluído após observar a amostra real. Documentos ficam no aparelho; fontes/correções vivem em memória até fechar/recarregar. Nenhum documento original é distribuído no build. Exemplos públicos são sintéticos.

Datas inválidas ou ausentes precisam ser completadas. Avaliações sem horário completo usam dia inteiro automaticamente, conforme decisão do usuário em 08/10/2026; não é preciso confirmar cada evento nem inventar duração. Fuso inicial `America/Sao_Paulo`, editável. Aulas semanais são geradas automaticamente quando a planilha informa o período; se faltarem datas, é necessário completá-las. Nome, código, sala e turma são preservados na exportação; feriados e recessos não são presumidos. Sobreposições geram avisos e não impedem exportar. O envio ao Google ocorre somente no botão de adição e exige autorização da conta.

ICS usa UID determinístico e fim exclusivo de dia inteiro. Reimportação manual pode duplicar em alguns aplicativos. Um documento alterado não atualiza agendas sozinho. Reimportações com conteúdo alterado geram nova identidade e exigem remover/substituir o evento anterior manualmente.

## Google (configuração pública opcional)

Guia detalhado: [Ativar o Google Agenda](docs/google-setup.md). Sem configuração, o botão “Usar no Google com arquivo” orienta a importação manual ICS pelo computador.

1. Criar/usar projeto Google Cloud **sem conta de faturamento**, ativar Calendar API e configurar consentimento para o piloto.
2. Criar cliente OAuth de aplicação Web. Autorizar a origem local exata, como `http://127.0.0.1:5173`, e futuramente a URL HTTPS estável da hospedagem. O modelo de token usa popup e não precisa de segredo ou endpoint de callback no servidor.
3. Copiar `.env.example` para `.env.local` e preencher somente `VITE_GOOGLE_CLIENT_ID`. Reiniciar o servidor. Esse identificador é público.
4. Adicionar usuários de teste no consentimento. Verificar as exigências vigentes de publicação antes de oferecer acesso geral.
5. Testar criação real, repetir lote, negar permissão, expiração e troca de conta. Sem essas provas, considerar a integração implementada mas não validada em conta real.

Permissões: `calendar.app.created` para agendas secundárias criadas pelo app e `openid` para um identificador estável da conta. Sem acesso à lista geral de agendas, email ou perfil. Token só em memória durante a operação. O cache local contém apenas identificador da conta/agenda e relatório não secreto; não contém documentos ou tokens. O acesso à agenda é validado a cada autorização.

O título da agenda identifica o semestre no cache: mantenha-o para retomar. Se limpar os dados do navegador ou usar outro aparelho, o aplicativo perde essa associação. Ele não lista agendas existentes com o escopo mínimo: confira/remova manualmente a agenda anterior antes de criar outra ou use ICS. Não promete recuperação automática. IDs determinísticos evitam multiplicar eventos na mesma agenda em nova tentativa idêntica. Falhas de cota pausam o lote; não há upgrade ou cobrança automática.

Referências oficiais verificadas em 08/10/2026: [modelo de token](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [escopos](https://developers.google.com/workspace/calendar/api/auth), [cotas](https://developers.google.com/workspace/calendar/api/guides/quota). A página de cotas informa 10.000 requisições/minuto/projeto, 600/minuto/usuário/projeto e limiar diário de 1.000.000, com mudanças de cobrança anunciadas para 2026. Verificar os limites efetivos do projeto antes de publicar, não vincular faturamento e interromper implantação se a gratuidade deixar de atender ao fluxo.

## iPhone

Com Google: depois de adicionar eventos, vincule a mesma conta em Ajustes → Apps → Calendário → Contas e habilite calendários. Sem Google: baixe o ICS, compartilhe/envie pelo próprio aparelho e abra o anexo no Mail para importar. [Instruções Apple](https://support.apple.com/en-mt/guide/iphone/ipha0d932e96/ios). O site não envia email. Um download no Safari não garante abertura no Calendário. Não há integração direta com iCloud ou feed de assinatura. **Teste em iPhone real pendente.**

## Hospedagem

Destino atualizado: GitHub `caronasunifal` e time Vercel `Caronas UNiFAL`, com novo repositório/site separado do caronas. Veja [SETUP](docs/SETUP.md). Não usar contas pessoais. A arquitetura atual não requer Supabase.

`vercel.json` configura build estático, sem Functions ou armazenamento, e os cabeçalhos de segurança: `Content-Security-Policy` (scripts só do próprio site e do Google Identity, `'wasm-unsafe-eval'` para o OCR e o PDF.js, sem `eval` nem estilos em linha), `Strict-Transport-Security`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (o popup do Google precisa disso), `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`. Se uma prova real com o Google for bloqueada, procure "Content Security Policy" no console e ajuste o `vercel.json`. Detalhes em [docs/tcc/07-acabamento.md](docs/tcc/07-acabamento.md). Usar o time de projetos informado pelo responsável, elegível ao [Vercel Hobby](https://vercel.com/docs/plans/hobby) e subdomínio gratuito. Não ativar Pro/trial/cartão/extras. Se a franquia acabar, aceitar indisponibilidade temporária. Upload do código deve respeitar `.vercelignore`; nunca enviar os originais colocados na raiz. Prefira distribuir somente `dist/` quando não houver integração Git.

## Dependências e custo

React/Vite/TypeScript/Tailwind, componentes locais no padrão shadcn, Lucide, Zod, Temporal polyfill, ExcelJS, SheetJS CE, PDF.js, Tesseract.js e ICS são usados localmente, sem tarifa por documento. SheetJS vem da distribuição oficial fixada porque a amostra é XLS binário. ExcelJS mantém XLSX como proposto. O override uuid 11.1.1 corrige a dependência transitiva de ExcelJS; PDF.js 6.4.299 inclui correções atuais. O lockfile fixa versões. Há consumo de rede/memória/CPU e franquia da hospedagem, não gratuidade ilimitada.

Veja `docs/validacao.md` para os resultados medidos e pendências reais.
