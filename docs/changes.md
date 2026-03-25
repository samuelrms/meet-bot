# Registro de mudanças

## Added

- **Testes unitários** com Vitest: `MusicQueue`, helpers `urls` e `volume`.
- **CI GitHub Actions** (build, testes com cobertura, `pnpm pack`).
- Módulos **`src/urls.ts`** e **`src/volume.ts`** (extraídos de `AudioManager` / `MeetBot`) para testabilidade.

## Dependências (dev)

- `vitest` — runner de testes e cobertura v8.
- `@vitest/coverage-v8` — relatório de cobertura.

**Justificativa:** stack leve, suporte nativo a TypeScript, sem Jest + ts-jest extra.

## Cobertura

Os gates de cobertura no Vitest aplicam-se a `src/queue.ts`, `src/urls.ts` e `src/volume.ts` (domínio e helpers puros). `AudioManager`, `MeetBot` e a CLI dependem de PulseAudio, ffmpeg e navegador — candidatos a testes de integração ou e2e fora do escopo deste pipeline.

Ver [DECISIONS/ADR-20260325-cobertura-e-ci.md](./DECISIONS/ADR-20260325-cobertura-e-ci.md).

## Como validar

- Local: instalar dependências e executar o script de teste definido no `package.json`, depois o de build.
- CI: push ou PR para `main`/`master` dispara o workflow em `.github/workflows/ci.yml`.
