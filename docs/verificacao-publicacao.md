# Verificação da publicação — 15/10/2026

Endereço informado pelo responsável: https://app-agendas.vercel.app/ .

## Primeira publicação

Oito dos nove cenários de navegador passaram: grade XLS e conversão XLSX com 180 aulas e metadados, período ausente/alterado, demonstração móvel, arquivo inválido isolado, PDFs reais, cancelamento OCR e limite de páginas. O teste de OCR de PDF escaneado/misto excedeu 90 segundos em duas tentativas.

O rastreamento mostrou o núcleo OCR carregado e o download do idioma ainda pendente ao fim do teste. O servidor respondeu HTTP 200, mas o idioma original incluía 6.755.162 bytes de dados. Não houve evidência de erro de interpretação de texto; a leitura não chegou a terminar.

## Ajuste

O app usa OEM 1 (LSTM), mas copiava o pacote completo com dados legados. O build passa a copiar `4.0.0_best_int`, com 1.392.239 bytes, da mesma dependência fixada. Essa é a variante que o próprio Tesseract.js seleciona por padrão para LSTM, conforme `node_modules/tesseract.js/src/worker-script/index.js`. Redução de aproximadamente 79% no download do idioma, sem API externa.

O build local e os testes direcionados de OCR escaneado/misto e cancelamento passaram antes do envio. A validação do endereço público deve ser repetida após o deploy da correção.

## Limites

- Google direto ainda não configurado nem testado com conta real.
- Emulação móvel confirma layout e download; não comprova importação no app Calendário de um iPhone real.
- Documentos processados no navegador. Nenhum evento de teste foi enviado a uma agenda real.
