# ADR-20260325 — Cobertura mínima e escopo de testes no CI

## Contexto

O projeto inclui integração com PulseAudio/PipeWire, processos `yt-dlp`/`ffmpeg` e Puppeteer. Testes unitários completos para esses caminhos exigem mocks pesados ou ambiente gráfico/áudio, pouco estável em runners gratuitos.

As regras internas pedem cobertura global ≥ 60% e ≥ 70% em módulos críticos de domínio.

## Decisão

1. **Gates de cobertura no Vitest** restringidos a ficheiros de domínio e helpers puros: `queue.ts`, `urls.ts`, `volume.ts`, com limiares ≥ 70% nesse conjunto.
2. **CI** executa `pnpm run build`, `pnpm run test` (com cobertura nesse escopo) e `pnpm pack` para garantir que o pacote publicável é válido.
3. **Não** falhar o pipeline por cobertura baixa em `audio.ts` / `meet.ts` / `index.ts` até existirem testes de integração dedicados.

## Alternativas

- **Cobertura global 60% com mocks** de `child_process`, `http` e Puppeteer — maior custo de manutenção e fragilidade.
- **Sem gate de cobertura** — regressões em fila/URLs/volume passariam despercebidas.
- **Testes de integração no GitHub** com Chrome headless + PulseAudio — possível fase futura; complexidade e tempo de job maiores.

## Consequências

- Domínio e regras puras permanecem protegidas por testes rápidos no PR.
- Camada de infraestrutura continua validada indiretamente por build e execução manual; documentar limitação em `docs/changes.md`.
