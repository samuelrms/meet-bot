# Registro de mudanças

## 2026-03-26 — Bypass Noise Suppression

### Added

- **Chrome flags `WebRtcApmInAudioService` e `ChromeWideEchoCancellation`** desabilitados no `puppeteer.launch()` para reduzir noise suppression no nível do APM.
- **Injeção via Web Audio API** (`AudioContext` → `createMediaStreamDestination` → `replaceTrack`) como caminho primário para áudio na sala. Bypassa completamente o pipeline de processamento de áudio do Chrome (noise suppression, echo cancellation, AGC).
- **Auto-desabilitar noise cancellation** do Meet via Puppeteer: novo método `_disableNoiseCancellation()` navega automaticamente em Settings → Audio → desliga "Noise cancellation".
- **TODO de migração Rust** documentado em `TODO/melhorias.md` (itens R-01 e R-02).

### Changed

- **`injectAudioStream()`** reescrito: não usa mais `MediaSource` + `captureStream()`, agora usa `AudioContext` + `createMediaStreamDestination()` para gerar track sintética sem APM.
- **Delay de injeção** reduzido de 4s para 1s (AudioContext não precisa de warmup do MediaSource).
- Mensagens de log atualizadas para indicar "Web Audio API bypass".

### Impacto

O áudio injetado no Meet agora preserva instrumentais e frequências completas, pois não passa pelo pipeline de noise suppression do Chrome. Os participantes no Meet devem ouvir a música com qualidade próxima à original.

### Como validar

- Compilar o projeto e iniciar o bot.
- Juntar-se a uma sala do Meet.
- Tocar uma música com instrumental via `!play`.
- Verificar que os instrumentais são audíveis na sala (diferentemente do comportamento anterior, onde apenas a voz do cantor era ouvida).

---

## Anterior

### Added

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
