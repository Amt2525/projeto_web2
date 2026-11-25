# ADR 0010 — Adaptadores de integração e API simuladora

**Status:** Aprovada (ajuste de Atos e Bryan: criar uma API que simule os dados caso as plataformas não liberem acesso)

## Contexto

Não há confirmação de acesso às APIs dos fabricantes. É proibido inventar endpoints ou respostas de plataformas reais.

## Decisão

1. **Contrato interno** `ProvedorMonitoramento` (listar usinas, ler medições, ler alarmes) e **um adaptador por fabricante**. Dados externos são validados (Zod) e normalizados para o modelo interno.
2. **`apps/simulator`**: serviço HTTP separado, no monorepo, que **simula uma plataforma de monitoramento fictícia**.
   - Contrato **próprio e documentado (OpenAPI)**. Não reproduz nem afirma reproduzir a API de nenhum fabricante.
   - Dados **determinísticos** (curva solar por horário e latitude, com semente fixa) para testes reproduzíveis.
   - **Injeção de falhas** para testes e demonstração: latência, erro 500, limite 429, indisponibilidade, dado velho, payload inválido.
   - Autenticação por chave definida em variável de ambiente (apenas demonstração).
   - Toda resposta traz `simulated: true`; a plataforma cadastrada tem `is_simulated = true`; a interface exibe "Dados simulados".
3. O **adaptador do simulador** é consumido por HTTP, passando pelo mesmo caminho dos reais (timeout, retentativas com backoff, tratamento de erro, normalização).
4. URL base de cada integração vem de **configuração fixa**, nunca de entrada do usuário (prevenção de SSRF).
5. Integração real só entra após verificação da documentação oficial, do acesso e das condições de uso.

## Alternativas

- **Mock dentro do processo:** mais simples, mas não exercita rede, timeout e falhas. Fixtures continuam usadas em testes unitários.

## Consequências

- Um app a mais para manter e documentar; em troca, a demonstração roda sem internet e as falhas externas ficam testáveis.
- Risco: o simulador "parecer real". Mitigação: rótulos obrigatórios e documentação do contrato fictício.
