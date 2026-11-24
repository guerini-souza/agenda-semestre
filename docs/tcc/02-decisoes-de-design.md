# 2. Decisões de design

Redesenho completo feito com as skills Impeccable (direção e verificação), Genjutsu (movimento) e o processo de brainstorming. O código e o conteúdo foram preservados; a aparência anterior foi tratada como referência do que evitar.

## Problemas da interface anterior
- Texto de 9 a 11 px em vários pontos, difícil de ler, sobretudo no celular.
- Visual de painel azul genérico, sem personalidade e sem relação com o assunto (agenda, caderno).
- Um único fluxo feito só para aluno.
- Conferência apenas em lista longa, sem visão de calendário.
- Rótulos decorativos em caixa alta acima dos títulos (kickers).

## Direção: papel e tinta
Uma agenda de papel. Fundo creme quente, texto em tinta azul-marinho escura, cantos arredondados com um canto "dobrado" nos ícones, destaque em amarelo-marca-texto. Escolhida pela cena de uso: alguém conferindo datas, muitas vezes no celular, em ambiente claro.

## Tokens
| Token | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#f6f1e6` | fundo |
| `--surface` | `#fffdf7` | cartões e campos |
| `--ink` | `#1f2433` | texto |
| `--muted` | `#585e70` | texto secundário (contraste ≥ 5,5:1 sobre o fundo) |
| `--accent` aluno | `#2a4bb3` | azul-tinta |
| `--accent` professor | `#1f6a4d` | verde-lousa (`html[data-role=teacher]`) |
| `--marker` | `#e8b04a` | foco, destaque |
| `--exam` | `#b9432f` | provas |
| `--teal` | `#1f7a78` | apresentações |

O destaque muda com o perfil por uma única variável CSS, então toda a interface troca de cor junto (botões, passos, calendário, ilustrações).

## Tipografia
- **Fraunces** (variável, serifada) nos títulos e números de data: dá o ar de caderno e de documento acadêmico.
- **Instrument Sans** (variável) no texto e nos controles.
- Ambas **autohospedadas** (`@fontsource-variable`), para não violar a regra de nenhuma requisição externa. Texto mínimo de 12 px; corpo em 15 a 16 px.

## Estrutura
- **Escolha de perfil** na entrada, com duas portas grandes e ilustradas.
- **Cabeçalho** com alternador Aluno / Professor sempre visível.
- **Etapas** em três passos, com os nomes adaptados ao perfil.
- **Conferência** com alternância Lista / Calendário; o calendário mensal usa cor por tipo (aula, prova, entrega, apresentação, outro) e legenda.
- **Resumo lateral** fixo com o número de eventos e o botão de avançar.
- **Construtor do professor** em seções (disciplina, quando tem aula, avaliações), com prévia viva "Serão criadas N aulas e M avaliações" e botão de preencher exemplo.

## Ilustrações
As imagens do site são **SVGs autorais desenhados em código** (`src/components/Illustrations.tsx`): capa (calendário, PDF, lápis e nota), cena do aluno (livros, celular e plano) e cena do professor (lousa e lista de verificação). Vantagens: nítidas em qualquer tela, poucos bytes, herdam as cores do perfil e não dependem de serviço externo. Não foi usado gerador de imagem por IA, que não estava disponível no ambiente de trabalho.

## Movimento
Um momento autoral: na entrada, o texto, a capa e os dois cartões de perfil sobem em sequência. Troca de etapa com entrada suave. Todo o movimento é desligado com `prefers-reduced-motion`.

## Acessibilidade
Foco visível em amarelo, link para pular ao conteúdo, grupos com rótulo (`role="group"`), botões de alternância com `aria-pressed`, calendário como tabela real, com legenda de cores, erros do formulário em `role="alert"`, alvos de toque de pelo menos 40 px, sem rolagem horizontal em 390 px (verificado por teste).

## Verificação
Detector de design da Impeccable sem achados nos arquivos alterados; conferência visual em computador e em 375 px de largura.
