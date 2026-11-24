# Decisões de execução — 08/10/2026

O pedido de executar o PROMPT-MESTRE.md autoriza a arquitetura e o fluxo nele propostos. Nenhum requisito técnico de conteúdo extraído será tratado como instrução.

## Escopo aceito

Site estático React/Vite/TypeScript em português, dados processados no aparelho, sem API de IA, servidor, cadastro obrigatório ou faturamento. Enviar → conferir → adicionar. ICS disponível sem OAuth. Google depende de cliente público configurado e consentimento. Não há vínculo institucional.

## Ordem escolhida

1. Contratos e validação, base local e fixtures sintéticas.
2. Interface e importação em paralelo, com responsabilidade de arquivos separada.
3. Integração, regras de datas/recorrência/conciliação, ICS e verificação local.
4. Google e documentação do iPhone, preparação de build portável.
5. Validação com amostras reais, conta Google e iPhone; publicação depende de acesso e elegibilidade Hobby.

Começar pelo Google atrasaria a validação da transformação. Implementar um parser presumido da UNIFAL poderia produzir datas erradas. Portanto o primeiro adaptador XLSX reconhecerá somente um modelo sintético explícito; outros layouts terão leitura assistida de células e texto.

As amostras chegaram durante a execução. A grade era XLS binário, portanto foi acrescentado SheetJS CE 0.20.3 da distribuição oficial para esse formato. O layout real observado recebeu adaptador: cabeçalhos Horário/Turma/Turma Prática/Salas/Responsáveis/Observações, horário explícito e período por linha. ExcelJS permanece no XLSX. Os dois planos de Gestão receberam agrupamento espacial da tabela e Ciências Ambientais fornece avaliações na página 5. Não houve adivinhação de códigos de horários.

## Fronteiras

`src/lib/domain/types.ts` contém contratos Zod e TypeScript. Importação: `importFiles(files: File[], context: ImportContext, options?: ImportOptions): Promise<ImportResult>`. Expansão: `expandSchedules(schedules, context): EventCandidate[]`. Conciliação: `reconcileEvents(events): EventCandidate[]`. Confirmação: `confirmEvents(events, context): ConfirmedEvent[]`. ICS: `createIcs(events): string`. Google: `exportToGoogle(events, title, options?): Promise<ExportReport>`.

## Aceite e lacunas externas

Nenhum candidato vira evento exportável sem revisão, data válida e horário válido ou escolha explícita de dia inteiro. Preservar evidência e falhas por arquivo. Não assumir ano, semestre, feriado ou códigos de horário. Nenhuma amostra real disponível inicialmente. Sem amostras, conta/aparelho e acesso à hospedagem não se declara Marco A/B validado em uso real.


## Correção solicitada pelo usuário — 08/10/2026

A instrução posterior substitui a exigência do prompt mestre de confirmação individual/global. A lista agora permite seguir direto para adicionar. Avaliações (prova, entrega, apresentação e outro) sem início ou fim são exportadas como dia inteiro; duração não é presumida. Data inválida/ausente, título/disciplina vazios, horário preenchido inválido e período de aulas desatualizado continuam bloqueando. Sobreposição e avisos de leitura são informativos. Edição e seleção continuam opcionais.

O Google OAuth não estava configurado, razão do botão desabilitado. A interface agora oferece importação manual ICS no Google com instruções claras enquanto o responsável configura o cliente público. Nenhuma gravação automática é simulada. Guia do responsável em `docs/google-setup.md`.
