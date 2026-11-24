# 5. Plano de aula em PDF (professor)

Funcionalidade acrescentada em 05/11/2026: o professor gera, no próprio aplicativo, o PDF do **Plano de aula** no padrão dos documentos de exemplo da pasta do projeto (`PlanoAula*.pdf`).

Exemplo gerado com dados fictícios: [exemplos/plano-de-aula-exemplo.pdf](exemplos/plano-de-aula-exemplo.pdf).

## Padrão seguido
| Elemento do modelo | No aplicativo |
| --- | --- |
| Título "PLANO DE AULA – Ensino Presencial" | **Diferente de propósito:** "PLANO DE AULA · DOCUMENTO DE APOIO", faixa de título na cor do Semestre, aviso "Gerado pelo Semestre. Não substitui o plano de aula oficial do sistema acadêmico." e rodapé "Documento de apoio gerado pelo Semestre · não oficial". A modalidade, se informada, vira uma linha de campo |
| TURMA/UNIDADE CURRICULAR | Turma, disciplina e código do formulário |
| ANO/SEMESTRE | Calculado pelo primeiro dia de aulas (até junho = 1, depois = 2) |
| DIA/HORÁRIO/SALA | Dias da semana com o horário de cada um, mais a sala |
| CARGA HORÁRIA | Soma das aulas (horas por aula automáticas pela duração, ou informadas) |
| Tabela DATA / CH / CONTEÚDO PROGRAMÁTICO | Uma linha por data, com o conteúdo digitado pelo professor |
| Linhas "Feriado" e "Semana Pedagógica" com "----" | Dias sem aula, com o motivo escolhido |
| Total do mês ("Agosto = 6") | Calculado e posicionado na última linha do mês |
| OBS | Campo de observação (opcional) |

Avaliações cadastradas entram na coluna de conteúdo da data correspondente (como "Avaliação de Desempenho 1"); em datas sem aula ganham linha própria com "----".

## Decisões
- **Cabeçalho institucional editável.** Os documentos oficiais trazem nome, endereço e telefone da universidade. Como o aplicativo declara não ter vínculo institucional, ele **não coloca nenhum nome nem brasão por conta própria**: o professor preenche o campo "Cabeçalho do documento" (até 3 linhas) se quiser.
- **Tudo no navegador.** O PDF é montado com a biblioteca `pdf-lib`, carregada só quando o botão é usado. Nenhum dado sai do aparelho.
- **Fonte padrão do PDF (Helvetica).** Cobre o português. Caracteres fora desse alfabeto (símbolos, emojis) viram "?" em vez de quebrar a geração.
- **Posições compatíveis com o leitor do app.** As colunas ficam onde o leitor de PDF do próprio aplicativo as procura. Por isso o PDF gerado pode ser importado de volta.

## Ciclo professor → aluno sem servidor
O professor gera o PDF e envia à turma (WhatsApp, e-mail, Moodle). O aluno escolhe o perfil Aluno e importa esse PDF: as aulas e avaliações entram na conferência e seguem para a agenda dele. Isso resolve o "compartilhar com a turma" sem login e sem banco de dados.

## Ajustes no leitor de PDF
Para o ciclo fechar, o leitor passou a aceitar: linha de aula com carga horária e **sem conteúdo** (título padrão "Aula · disciplina") e avaliação em data sem aula, marcada com "----" no lugar da carga horária.

## Verificação
- `tests/lessonPlan.test.ts`: cabeçalho, linhas, totais por mês, horas por aula, nome de arquivo e validações.
- `tests/lessonPlanPdf.test.ts`: PDF válido; **leitura de volta** com as mesmas funções do aplicativo (disciplina, turma, aulas, avaliações); várias páginas com cabeçalho repetido; caracteres fora do alfabeto e palavras longas.
- `tests/e2e/roles.spec.ts`: no navegador, o professor baixa o PDF e o aluno o importa e recebe 35 eventos, sem requisições externas.

## Decisão de 11/11/2026: só o plano de aula
O **Programa de ensino** é um documento oficial que só pode ser montado no sistema acadêmico. Por isso o aplicativo **não o gera**: a versão que existia foi removida (código, formulário e testes). O aluno continua podendo **importar** o Programa de ensino oficial em PDF, que o leitor do aplicativo entende.

O plano de aula gerado aqui é um **documento de apoio**: mantém a mesma organização do modelo, mas é identificado como gerado pelo Semestre, para não ser confundido com o oficial. As posições das colunas continuam as que o leitor reconhece, então o PDF ainda pode ser importado de volta.
