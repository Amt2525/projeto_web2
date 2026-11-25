import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cria o banco de teste e aplica as migrations antes de rodar os testes.
    globalSetup: ['./test/global-setup.ts'],
    // Os testes de integração compartilham UM banco de teste e o esvaziam a cada teste.
    // Rodar arquivos em paralelo faria um apagar os dados do outro.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
