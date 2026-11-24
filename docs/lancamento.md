# Lançamento — 15/10/2026

## Decisões e estado verificado

- Atualização: usar o time `Caronas UNiFAL` e GitHub `caronasunifal`, com projetos separados do caronas. A proposta de conta nova foi substituída. Ver `SETUP.md` para o passo a passo vigente.
- O cliente OAuth Google ainda não foi criado, conforme resposta do responsável.
- Site estático React/Vite, com configuração de build em `vercel.json`. Sem backend necessário.
- Nesta revisão: TypeScript e 33 testes unitários passaram. A primeira tentativa de testes falhou ao acessar temporários no isolamento; a execução fora dele passou.
- O conector Vercel atual lista outros projetos, mas a consulta à conta retorna 403. CLI sem credenciais. Nenhuma publicação realizada.
- Não há repositório Git inicializado nesta pasta. GitHub é uma opção para manutenção, não uma exigência para publicar o build estático.

## Frentes em paralelo

1. **Hospedagem:** conectar o time `Caronas UNiFAL` informado pelo responsável e confirmar elegibilidade ao Hobby; criar projeto próprio para Semestre; publicar e conferir URL HTTPS estável. Não contratar plano, domínio ou extras pagos.
2. **Google Agenda:** seguir `google-setup.md`; criar cliente Web público, cadastrar origem HTTPS final e usuários do piloto; configurar ID no build; testar criação, repetição de lote, falha parcial e troca de conta reais. Preparar consentimento para acesso geral conforme exigências do Google.
3. **Apresentação pública:** preparar páginas de privacidade, termos e contato com responsável/canal reais; manter identificação de ferramenta independente da universidade. Corrigir instrução iPhone quando Google direto estiver desligado e texto antigo de confirmação na descrição da agenda.
4. **Validação pública:** testar no endereço publicado upload XLS/PDF, OCR, exportação ICS e ausência de documentos pessoais no pacote; testar celular real antes de anunciar suporte garantido ao iPhone.

## Sequência de liberação

- Primeira versão pública pode usar ICS enquanto OAuth é configurado. A interface já explica que o arquivo precisa ser importado manualmente.
- Envio direto ao Google só deve ser anunciado depois de configurado e validado em conta real.
- Melhorias de layouts, desempenho em aparelhos lentos e tratamento de feriados podem ser priorizadas com os primeiros usuários; a versão atual não exclui automaticamente feriados das recorrências.

## Referências

- Vercel Hobby: https://vercel.com/docs/plans/hobby — uso pessoal, não comercial e sujeito a limites.
- Google OAuth: https://developers.google.com/identity/protocols/oauth2/policies — informações públicas do aplicativo e políticas para produção.
