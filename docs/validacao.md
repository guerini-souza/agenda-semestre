# Atualização — 15/10/2026

Aulas da planilha agora são geradas automaticamente com os períodos documentados, sem o antigo botão de confirmação. Se um horário não tem período, a interface informa a pendência e bloqueia a exportação de “Aulas e avaliações” até preenchê-lo; “Só avaliações” continua disponível. Título inclui o código da disciplina e os dois exportadores preservam nome, código, sala/local e turma.

TypeScript, lint, build, 36 testes unitários e 9 testes de navegador passaram. Os testes de navegador conferiram a grade original XLS e uma conversão em memória para XLSX: **180 aulas**, incluindo 20 ocorrências de Ciências Ambientais (ICT128), sala PC-B-113, segunda-feira 21:15–23:15, de 03/08 a 14/12. Esses testes verificam o ICS baixado sem geração manual, a releitura sem multiplicar eventos, período ausente e alteração posterior do intervalo. A conferência Google continua simulada; nenhuma conta real autorizada nesta sessão.

O primeiro teste de navegador falhou porque a prévia isolada estava inacessível. A prévia foi iniciada fora do isolamento para a validação. As evidências históricas abaixo descrevem a versão anterior quando houver diferença de comportamento.

# Validação — 08/10/2026

**Atualização de fluxo:** a pedido do usuário, confirmação individual/global removida; avaliações sem horário usam dia inteiro. A seção original abaixo registra a primeira entrega e foi substituída nessa regra. Após a mudança, 33 testes unitários, typecheck, lint e build passaram. Dois cenários de navegador no build final validaram demonstração móvel, botão de importação manual Google e exportação das 14 avaliações reais como dia inteiro sem confirmação/duração. Datas inválidas continuam bloqueadas. Google segue sem cliente OAuth; há importação manual assistida via ICS.

## Resultado local

Marco A demonstrável: upload real, grade XLS, XLSX sintético, PDF textual real, OCR de PDF escaneado/misto sintético, edição, confirmação e ICS. Isso não comprova interpretação universal nem desempenho em iPhone real. Marco B permanece pendente por acesso Vercel, cliente OAuth e aparelho.

## Amostras reais autorizadas

Originais na raiz, ignorados pelo Git e pelo envio Vercel; nenhum original incluído em `public/`, `tests/fixtures/` ou `dist/`.

| Amostra | Leitura observada | Comparação |
| --- | --- | --- |
| Horarios (1).xls | 18 linhas → 9 horários semanais | Disciplina, turma, local, dia, início/fim e período explicitamente presentes nas células. Referência: ICT128, segunda, 21:15–23:15, 03/08 a 14/12/2026. |
| Gestão Industrial | 30 candidatos, 5 avaliações | 02/09, 21/10, 25/11, 27/11 e 02/12/2026. |
| Gestão de Produtos | 15 candidatos, 4 avaliações | 24/09, 05/11, 12/11 e 19/11/2026. |
| Ciências Ambientais | 5 avaliações | 31/08, 19/10, 16/11, 23/11 e 30/11/2026, página 5. |

Datas comparadas com o texto documental e fixadas individualmente em testes locais condicionais. Provas sem horário permanecem pendentes. Cabeçalho com ano e horário de aulas fica anexado como fonte. Não foi inferido horário de prova a partir da aula habitual. O aluno pode confirmar a relação manualmente, editando horário e desmarcando a aula sobreposta.

As aulas do PDF e as recorrências da planilha podem sobrepor: o aplicativo alerta e pede escolha. Não há conciliação automática por aproximação de nome. Recuperação condicional de Ciências não recebeu uma data inventada. Linhas de feriado/semana pedagógica são excluídas da interpretação do plano, mas as recorrências da grade **ainda exigem exclusões confirmadas pelo aluno**. Não há calendário institucional presumido.

## Testes

- TypeScript: passou.
- ESLint: passou.
- Vitest: **32 testes passaram**, de domínio, ICS, transporte Google simulado e importação; inclui exemplos reais condicionais, 1904/1900, células mescladas, fórmulas como texto, datas de avaliações e evidências.
- Playwright: seis cenários passaram ao longo da execução: demonstração em 390×844 até download ICS; XLSX/PDF com falha isolada; OCR escaneado/misto; quatro amostras reais; cancelar OCR preservando arquivo anterior; limite de 31 páginas preservando próxima planilha.
- Rede: nenhuma requisição HTTP externa durante os testes de documentos reais ou OCR sintético. Workers/idioma vieram do servidor local. Não houve chamada a IA.
- Build estático: passou. Dependências grandes em chunks carregados sob demanda; aviso de tamanho para ExcelJS e bundle principal registrado. Não há backend.
- No build servido em `127.0.0.1:4173`, os cenários de OCR e amostras reais também passaram (4,2 s e 1,6 s respectivamente, incluindo assertions).
- `npm audit`: zero vulnerabilidades após PDF.js 6.4.299 e override uuid 11.1.1 de ExcelJS.

Google **somente simulado**: IDs estáveis, duplicata 409 verificada, falha parcial, cota 429, expiração 401 e proteção contra trocar conta numa retomada. Nenhum evento real enviado e nenhuma agenda real criada.

## Medições do ambiente de desenvolvimento

Chrome de teste em Windows: lote real (4 arquivos, 7 páginas PDF) chegou à revisão e expandiu as aulas dentro do cenário de aproximadamente 3,7 s. Cenário OCR de duas páginas sintéticas levou aproximadamente 9,3 s, incluindo navegação e assertions. Esses tempos incluem o teste, não são benchmark do parser e não representam celular. Cancelamento liberou a interface dentro do limite verificado de 10 s.

Assets locais de PDF/OCR: cerca de 53,0 MiB. Build inicial: cerca de 56,7 MiB no disco. A biblioteca carrega um núcleo OCR apropriado ao navegador, não todas as variantes. Main JS ~191 kB gzip; ExcelJS ~256 kB gzip e PDF.js ~129 kB gzip sob demanda. A memória de pico não foi medida de forma confiável; render OCR limitado a 1.800 px no maior lado e canvas liberado por página. Falta medir em aparelho móvel com pouca memória.

## Pendências externas e limitações

1. **Recessos/feriados/reposições:** confirmar exclusões e uma disciplina de referência com o aluno antes de importar o semestre real.
2. **Google:** configurar `VITE_GOOGLE_CLIENT_ID`, projeto sem faturamento e conta de teste; validar escopo efetivo, popup, conta trocada, duplicatas e retentativa real. Sem segredo OAuth.
3. **iPhone:** testar conta Google no Calendário e ICS pelo Mail em aparelho real. Emulação móvel só verificou layout e download.
4. **Vercel:** conector listou projetos existentes, mas consulta à conta retornou 403 sem acesso; CLI não tem credenciais. Nenhum projeto criado/publicado. Confirmar conta pessoal Hobby elegível antes de publicar. Nenhum serviço faturável ativado.
5. **Novos layouts:** XLSX reconhece modelo explícito; XLS reconhece layout observado. Outros layouts entram em assistência. PDF com OCR divergente pode gerar candidatos distintos, preservados para revisão. XLSX pesado ainda é lido na thread principal; limites de arquivo restringem o piloto, mas o comportamento em celulares lentos merece evolução para worker dedicado.
6. **Exclusão de estado:** documentos não persistem; fechar/recarregar perde revisão. Cache Google sem segredo usa localStorage; sua perda não permite descobrir automaticamente a agenda anterior com o escopo mínimo. Não há sincronização contínua.

Para reexecutar sem os originais, os testes pessoais são ignorados; fixtures sintéticas continuam disponíveis. Inicie o servidor antes de `npm run test:e2e`; instale Chromium com `npx playwright install chromium` se necessário.
