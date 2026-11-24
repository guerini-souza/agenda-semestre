# Design — Semestre

Registro do sistema visual entregue em 05/11/2026. Detalhes e motivos em `docs/tcc/02-decisoes-de-design.md`.

## Mundo
Agenda de papel. Fundo creme, tinta azul-marinho, marca-texto amarelo. Superfície de **trabalho** (Operate): clareza e leitura acima de ornamento; a personalidade vem da tipografia, das ilustrações e do destaque por perfil.

## Cores
Papel `#f6f1e6`, superfície `#fffdf7`, tinta `#1f2433`, secundário `#585e70`, linhas `#e2d9c6`. Destaque por perfil: aluno `#2a4bb3`, professor `#1f6a4d` (via `html[data-role]`). Marca-texto `#e8b04a`, prova `#b9432f`, apresentação `#1f7a78`. Alerta: fundo `#fbeecb`, texto `#6f4504`.

## Tipografia
Títulos e números de data: Fraunces variável (600). Corpo e controles: Instrument Sans variável. Corpo 15–16 px; mínimo 12 px. Títulos com `text-wrap: balance` e tracking leve negativo.

## Formas e profundidade
Cartões com raio 16–22 px e borda de 1,5 px; botões em pílula; ícones com um canto de raio menor (efeito de página dobrada). Sombra suave com deslocamento vertical. Sem bordas coloridas laterais, sem gradiente em texto, sem blocos de sombra dura.

## Componentes
Botões `primary` (destaque), `secondary` (contorno), `ghost`. Alternadores segmentados com `aria-pressed`. Chips por tipo de evento no calendário. Etiquetas de estado (Pronto / Dados incompletos). Avisos `warning`, `neutral`, `success`.

## Movimento
Entrada em sequência na escolha de perfil e fade curto entre etapas, com `cubic-bezier(.16,1,.3,1)`. Desligado em `prefers-reduced-motion`.

## Regras para próximas mudanças
- Nenhum texto abaixo de 12 px.
- Nada de rótulo decorativo acima de título.
- Cores novas entram como variável em `:root`, e o destaque sempre usa `--accent`.
- Fontes e imagens ficam no próprio site (sem CDN), para manter a regra de nenhuma requisição externa.
