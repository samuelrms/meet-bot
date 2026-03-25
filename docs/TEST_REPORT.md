# Relatório de testes

## Como executar

Comandos (definidos no `package.json` do projeto):

- Testes com cobertura: script `test`
- Testes em modo observação: script `test:watch`
- Compilação TypeScript: script `build`

## Resultado esperado

- Todos os testes devem passar.
- Cobertura reportada pelo Vitest para `src/queue.ts`, `src/urls.ts`, `src/volume.ts` (ver `vitest.config.ts`).

## Observações

- Testes não levantam PulseAudio nem Puppeteer; foco em lógica de fila e funções puras.
