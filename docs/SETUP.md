# Publicação do Semestre — contas de projetos UNIFAL

Atualizado em 15/10/2026. Nenhum valor secreto deve ser salvo neste documento, no código ou no Git.

## Destino informado pelo responsável

- GitHub: conta `caronasunifal`. Repositório privado criado e acesso de escrita verificado: https://github.com/caronasunifal/app-agendas .
- Vercel: time `Caronas UNiFAL`, plano Hobby informado pelo responsável. Criar um projeto independente para este repositório, com endereço próprio.
- Site publicado pelo responsável: https://app-agendas.vercel.app/ . A versão inicial usa importação manual ICS; OAuth Google ainda não configurado.
- O repositório `caronasunifal/app-caronas`, seus deploys, banco e credenciais não fazem parte deste trabalho.
- Usar as contas de projetos da UNIFAL. Não trocar a conta pessoal ativa no GitHub CLI nem publicar na conta pessoal da Vercel.
- A decisão anterior de criar outra conta Vercel foi substituída por este destino. O acesso ao time Caronas ainda precisa ser verificado; a conexão disponível anteriormente apontava para outra conta.

## Arquitetura recomendada para este aplicativo

O app existente usa React, Vite, TypeScript e Tailwind e processa os documentos no navegador. Não precisa de servidor, autenticação própria, banco de dados ou SMTP para importar horários e exportar calendários.

Recomendação: manter essa arquitetura. Não há uso atual que justifique migrar para Next.js ou consumir o segundo projeto gratuito do Supabase. Se o responsável decidir adicionar contas de alunos ou histórico sincronizado, planejar um Supabase separado; nunca reutilizar o banco ou chaves do caronas.

As variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` não são usadas por esta versão. Não copiá-las para este site. Região `gru1` configura execução no servidor; este app entrega arquivos estáticos.

## Passo 1 — criar o repositório

1. Acessar https://github.com/new conectado como `caronasunifal`.
2. Conferir o proprietário `caronasunifal` e informar `app-agendas` como nome (ou outro nome escolhido pelo responsável).
3. Escolher **Private**.
4. Não adicionar README, `.gitignore` ou licença no formulário.
5. Criar e informar somente o link do novo repositório para conectar os arquivos locais.

O código local será versionado na branch `main` desse repositório. Antes de cada envio, revisar o conjunto de arquivos: originais pessoais da raiz, ambientes, caches, navegadores de teste e relatórios não entram no Git. `.gitignore` e `.vercelignore` excluem os documentos pessoais da raiz. Somente exemplos sintéticos entram em `public/examples`.

Na etapa de push, verificar acesso como `caronasunifal` sem mudar o login global. Não imprimir tokens nem colocá-los na URL remota. Um token disponibilizado ao `gh` não autentica por si só qualquer comando `git`: é preciso confirmar o uso do credential helper do GitHub CLI ou de outro mecanismo seguro. Não copiar literalmente sintaxe de Bash em PowerShell.

## Passo 2 — publicar na Vercel (após o primeiro envio)

1. Entrar no time **Caronas UNiFAL** e escolher **Add New → Project**.
2. Importar apenas o novo repositório. Se não aparecer, liberar acesso a ele na integração GitHub do time.
3. Conferir framework **Vite**, build `npm run build`, saída `dist`, Node 24.x.
4. A versão com arquivo ICS não precisa de variável de ambiente.
5. Publicar e conferir upload, leitura e download no novo endereço HTTPS.

Não ativar trial, Pro, domínio pago ou extras. As franquias da hospedagem são compartilhadas pelo time. Confirmar elegibilidade de uso pessoal/não comercial antes da publicação; o app é independente e não afirma vínculo institucional com a UNIFAL.

## Passo 3 — Google Agenda direto

Seguir `google-setup.md` usando a conta de projetos indicada pelo responsável. É necessário criar um cliente OAuth próprio para este app; credenciais de SMTP ou Supabase não o substituem.

- Única variável de build desta integração: `VITE_GOOGLE_CLIENT_ID` (identificador público).
- Autorizar a origem HTTPS exata do novo site no cliente Web.
- Configurar consentimento e usuários do piloto; preparar privacidade, termos e contato antes de acesso público geral.
- Recriar o build após configurar o ID.
- Testar criação real, repetição sem duplicatas, negativa de acesso e recuperação de falha. Atualmente Google é validado apenas por testes simulados.

## Próximas decisões

- Repositório definido: `caronasunifal/app-agendas`; próxima etapa é importar esse repositório no time correto da Vercel.
- Acesso ao time correto da Vercel.
- Confirmação da recomendação de não provisionar Supabase nesta versão.
- Canal público de contato e configuração OAuth Google.

Referências: https://vercel.com/docs/projects ; https://vercel.com/docs/frameworks/frontend/vite ; https://vercel.com/docs/plans/hobby .
