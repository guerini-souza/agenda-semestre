# 1. Visão geral

## Problema
Alunos recebem a grade de horários em planilha (XLS/XLSX) e cada disciplina entrega um plano de ensino em PDF, com datas de provas e entregas espalhadas. Passar tudo para a agenda é manual e propenso a erro. Professores têm o problema inverso: o plano de ensino existe, mas não está na agenda deles.

## Objetivo
Permitir que qualquer pessoa leve esses documentos para o Google Agenda, conferindo cada data antes, sem cadastro, sem servidor e sem custo.

## Perfis
| | Aluno | Professor |
| --- | --- | --- |
| Ponto de partida | Enviar grade (XLS/XLSX) e planos (PDF) | **Montar o plano na tela** ou importar PDF/planilha |
| Entrada | Leitura local com OCR quando preciso | Formulário: disciplina, turma, sala, dias, horários, período, dias sem aula, avaliações |
| Conferência | Lista e calendário mensal | Lista e calendário mensal |
| Saída | Google Agenda ou arquivo `.ics` | Google Agenda ou arquivo `.ics` |
| Cor de destaque | Azul-tinta | Verde-lousa |

O perfil é escolhido na primeira visita, fica salvo no navegador (`localStorage`, chave `semestre:role`) e pode ser trocado a qualquer momento no cabeçalho.

O professor também pode **gerar o PDF do Plano de aula** no padrão do modelo e enviá-lo à turma; o aluno importa esse PDF no aplicativo (detalhes em [05-plano-de-aula-em-pdf.md](05-plano-de-aula-em-pdf.md)).

**Decisão de escopo (05/11/2026):** o plano do professor vai **somente para a agenda do próprio professor**. Compartilhar o plano com a turma por link, ou publicar com login e banco de dados, ficam como trabalhos futuros, porque exigem servidor ou dados dentro de links.

## Fluxo
1. **Enviar / Montar:** arquivos lidos no aparelho, ou plano preenchido na tela.
2. **Conferir:** todos os eventos ficam visíveis, com avisos do que precisa de atenção. Dados faltando bloqueiam a exportação; avaliações sem horário viram dia inteiro.
3. **Adicionar:** Google Agenda (agenda secundária criada pelo app) ou `.ics`.

## Arquitetura
Site estático em React 19, Vite e TypeScript. Nada é enviado a servidores do projeto.

```
src/
  App.tsx                      estado geral, perfil, etapas
  lib/role.ts                  perfil e textos por perfil
  lib/domain/types.ts          contratos Zod
  lib/domain/calendar.ts       expansão de aulas, conciliação, confirmação
  lib/domain/teaching.ts       NOVO: plano de ensino -> aulas + avaliações
  lib/import/                  leitura de XLS/XLSX/PDF/OCR
  lib/calendar/                ICS e Google Agenda
  lib/auth/google.ts           autorização Google (token em memória)
  components/                  telas (RoleGate, TeacherPlanBuilder, MonthCalendar, ...)
```

O plano do professor reaproveita o motor do aluno: `buildTeachingPlan` devolve um horário semanal (`CourseSchedule`) e os eventos; a conferência, o ICS e o envio ao Google são exatamente os mesmos.

## Privacidade e custo
Documentos ficam no aparelho; fontes e OCR são servidos pelo próprio site (nenhuma requisição externa durante a leitura, verificado por teste). Token do Google só em memória. Hospedagem estática gratuita; Google Calendar API sem faturamento.
