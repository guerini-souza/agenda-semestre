# Ativar o Google Agenda — configuração única do responsável

O aluno não precisa criar projeto nem obter chave. Depois desta configuração, ele usa o botão do site e autoriza sua própria conta Google.

## Gratuidade

Em 08/10/2026, o Google informa uso padrão da Calendar API sem custo adicional, sujeito a cotas, e cobrança futura planejada para excedentes. Este projeto exige custo zero: não vincule conta de faturamento, não ative trial nem forneça cartão. Ao atingir cota, o aplicativo pausa e mantém ICS como alternativa. Se o console exigir faturamento para continuar, interrompa a configuração e reavalie; não contrate nada.

Fonte: https://developers.google.com/workspace/calendar/api/guides/quota

## Passo a passo para o piloto

1. Abra https://console.cloud.google.com/ com a conta que ficará responsável pelo aplicativo.
2. No seletor de projetos, crie um projeto chamado **Semestre**. Não precisa ter vínculo institucional com a UNIFAL.
3. Abra **APIs e serviços → Biblioteca**, procure **Google Calendar API** e ative-a nesse projeto.
4. Abra **Google Auth Platform / Plataforma de autenticação do Google → Começar**. Defina nome **Semestre**, seu email de suporte/contato e público **Externo**. Leia os termos exibidos antes de aceitar. Em **Público-alvo → Usuários de teste**, adicione seu email e os participantes do piloto. Mantenha em teste por enquanto.
5. Em **Acesso a dados**, adicione somente `openid` e `https://www.googleapis.com/auth/calendar.app.created`. O primeiro separa contas pelo identificador; o segundo permite agendas secundárias criadas pelo app. Não é necessário acesso a todas as suas agendas, Drive ou Gmail.
6. Em **Clientes → Criar cliente**, escolha **Aplicativo da Web** e nome **Semestre Web**.
7. Nas **Origens JavaScript autorizadas**, inclua as origens usadas nos testes, uma por entrada:

   - `http://127.0.0.1:4173` (prévia atual)
   - `http://127.0.0.1:5173` (desenvolvimento)
   - `http://localhost`
   - `http://localhost:4173`
   - `http://localhost:5173`
   - `https://app-agendas.vercel.app` (site publicado)

   Este aplicativo usa popup/token no navegador; não configure URL de callback de backend. Após publicar, adicione também a origem HTTPS exata do site.
8. Crie o cliente e copie o **ID do cliente**, que termina em `.apps.googleusercontent.com`. Esse ID é público e pode ser enviado neste chat para conectar o site. Não envie o segredo do cliente; ele não será usado.
9. A configuração local será `VITE_GOOGLE_CLIENT_ID=seu-id.apps.googleusercontent.com` em `.env.local`. É necessário reiniciar o servidor de desenvolvimento e refazer o build para a prévia em 4173.
10. Teste com o email cadastrado: importar um evento, repetir o lote, conferir a agenda criada e testar a negativa de acesso. Para disponibilizar a todos, concluir a publicação/validações exigidas pelo Google; modo teste não equivale a acesso público.

Referências: [cliente Web](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid), [tela de consentimento](https://developers.google.com/workspace/guides/configure-oauth-consent), [modelo de token](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## Usar agora, sem configurar OAuth

No site, escolha **Usar no Google com arquivo**. No computador, abra Google Agenda → Configurações → Importar e exportar; selecione `meu-semestre.ics`, escolha a agenda e importe. O download sozinho não cria eventos. Evite repetir a importação do mesmo arquivo. [Ajuda oficial](https://support.google.com/calendar/answer/37118?hl=pt-BR).
