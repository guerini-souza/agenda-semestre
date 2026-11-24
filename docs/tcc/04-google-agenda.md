# 4. Integração com o Google Agenda

## Situação em 11/11/2026 (noite)
- **App publicado no Google ("Em produção"), público Externo.** Qualquer pessoa com conta Google pode autorizar. Conferido no console do projeto `semestre-unifal`.
- **Escopos `openid` e `calendar.app.created` aparecem em "Escopos não confidenciais"**, e as seções de confidenciais e restritos estão vazias. A Central de verificação informa: "A verificação não é necessária porque seu app não está solicitando escopos sensíveis ou restritos". Por isso não há aviso de "app não verificado" nem o limite de 100 usuários.
- **Branding preenchido:** nome Semestre, e-mail de suporte, página inicial, [política de privacidade](https://app-agendas.vercel.app/privacidade.html) e [termos de uso](https://app-agendas.vercel.app/termos.html). Sem logotipo (enviar logotipo exigiria verificação da marca). A Central de verificação avisa que a marca não aparece para os usuários na tela de consentimento; isso é opcional e não impede o uso.
- **ID do cliente ligado ao site** (`.env.production`, público). O botão "Adicionar ao Google" está ativo no site publicado, e o script de login carrega sem violar a política de segurança.
- **Testes automáticos usam o Google simulado.** O teste com conta real foi feito pelo responsável no navegador; o resultado deve ser anotado em `docs/validacao.md`.

## O que o envio faz
| Situação | Comportamento |
| --- | --- |
| Caminho normal | Pede a autorização, cria a agenda (nome editável), envia evento a evento, mostra "Pronto!" e um botão **Ver no Google Agenda** (abre no mês do primeiro evento) |
| Limite de taxa do Google (429, 403 `rateLimitExceeded`) | Espera crescente (1, 2, 4, 8 s, respeitando `Retry-After`) e tenta de novo, até 5 vezes; mostra "O Google pediu uma pausa…" |
| Limite persistente, falta de permissão, token expirado, rede caída, Google fora do ar | Pausa o lote com mensagem específica, preserva o que já foi enviado e oferece **Tentar novamente**, que envia só o que faltou |
| Pessoa desmarca a permissão da agenda na tela do Google (ou cancela) | Nada é criado; a mensagem explica: "Faltou a permissão da agenda… deixe marcada a opção de criar e alterar eventos…". Ao tentar de novo marcando, funciona |
| Site aberto no navegador embutido de Instagram, Facebook, TikTok e similares | O Google bloqueia o login ali (`disallowed_useragent`). O app detecta pelo user agent (`lib/browser.ts`) e avisa: abrir no Safari ou no Chrome, com botão **Copiar link**. Não bloqueia o botão, porque a detecção pode errar. Links abertos pelo WhatsApp costumam cair num navegador que o Google aceita |
| Evento recusado pelo Google (400) | Só aquele evento falha; o lote continua |
| Evento já existente | Confere a marca do app antes de contar como existente; nunca duplica |
| Agenda guardada que foi apagada no Google | Cria uma agenda nova automaticamente (404/410) |
| Outra conta numa retomada | Recusa, sem criar agenda nem enviar nada |
| API não ativada no projeto | Mensagem própria para o responsável |

Cada evento sai com **cor** por tipo (prova vermelha, entrega amarela, apresentação roxa, outro grafite; aula na cor da agenda) e **lembretes**: aulas 30 min antes; avaliações com horário 1 h e 1 dia antes; avaliações de dia inteiro às 9h da véspera.

## Escopos pedidos
`openid` e `https://www.googleapis.com/auth/calendar.app.created`. O app só enxerga as agendas que ele mesmo criou; não lê e-mail, Drive nem a lista de agendas.

## Verificação feita (Google simulado)
- `tests/google.test.ts` (14 testes): IDs válidos e estáveis; cores e lembretes; duplicata; espera crescente e `Retry-After`; limite persistente; permissão; API não ativada; 5xx; queda de rede; evento recusado; token expirado; troca de conta; agenda apagada.
- `tests/e2e-google/google.spec.ts` (5 cenários, `npm run test:e2e:google`): no navegador, com o script de login e as APIs do Google respondidos por simulação — caminho completo com cores e lembretes e link da agenda; permissão negada e janela fechada; limite de taxa com espera e conclusão; autorização que expira no meio com nova tentativa só do que faltou; agenda apagada.
- **O que isso NÃO prova:** que o Google aceita o aplicativo, que o popup real abre e que os pedidos reais são aceitos. Isso só se verifica com o ID de cliente verdadeiro e uma conta de teste.

## Checklist para ligar
Marque o que já está feito no Google Cloud Console (https://console.cloud.google.com):

- [ ] Projeto **Semestre** criado, **sem faturamento**.
- [ ] **Google Calendar API** ativada nesse projeto.
- [ ] Google Auth Platform configurada: público **Externo**, nome Semestre, e-mail de contato.
- [ ] Em Acesso a dados: somente `openid` e `calendar.app.created`.
- [ ] Em Usuários de teste: o e-mail do responsável e dos testadores.
- [ ] Cliente OAuth **Aplicativo da Web** criado.
- [ ] Origens JavaScript autorizadas: `http://localhost:5173`, `http://127.0.0.1:5173`, `https://app-agendas.vercel.app`.
- [ ] **ID do cliente** (termina em `.apps.googleusercontent.com`) copiado. É público; o segredo do cliente não é usado e não deve ser enviado.

## Depois de ter o ID
1. Criar `.env.local` na raiz com `VITE_GOOGLE_CLIENT_ID=<id>` (o arquivo é ignorado pelo Git) e reiniciar `npm run dev`.
2. Na Vercel: Settings → Environment Variables → `VITE_GOOGLE_CLIENT_ID`, e fazer novo deploy (a variável é gravada no build).
3. Teste real com um e-mail de teste: enviar o exemplo; abrir o link "Ver no Google Agenda" e conferir cores e lembretes; repetir o envio (não pode duplicar); apagar a agenda no Google e enviar de novo; negar a permissão; trocar de conta.
4. Anotar o resultado em `docs/validacao.md`, marcando a integração como validada com conta real.

## Verificação da marca (opcional)
Como os escopos são não confidenciais, o app funciona para qualquer pessoa sem verificação. A tela de consentimento mostra o nome do app sem selo de marca verificada. Para exibir nome e logotipo verificados é preciso enviar a marca para verificação, o que exige um domínio próprio verificado no Google Search Console (`vercel.app` não é do projeto). Fica como melhoria futura.

## Se algo mudar
Se o Google passar a classificar `calendar.app.created` como sensível, o console mostrará o app em "escopos confidenciais" e voltará a exigir verificação (domínio próprio, vídeo de demonstração e justificativa dos escopos). Confira a Central de verificação de tempos em tempos.
