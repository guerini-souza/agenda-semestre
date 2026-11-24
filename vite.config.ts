import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// pdf-lib é carregada sob demanda (botão "Baixar plano de aula"); pré-empacotar evita o recarregamento do servidor de desenvolvimento no primeiro uso.
export default defineConfig({ plugins: [react(), tailwindcss()], optimizeDeps: { include: ['pdf-lib'] }, test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 } });
