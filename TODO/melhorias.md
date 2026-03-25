# Possíveis próximas melhorias

Legenda de impacto (estimativa): **A** alto · **M** médio · **B** baixo · **?** depende de pesquisa.

---

## Mídia e formato

| ID | Ideia | Notas | Impacto |
|----|--------|------|---------|
| **M-01** | **Reprodução de vídeo** (além de áudio) | O Meet prioriza áudio; vídeo exigiria captura de tela virtual, mais CPU/GPU e latência. Avaliar se o objetivo é “mostrar slides/vídeo na reunião” vs. só música. | A |
| **M-02** | Pré-visualização local (thumbnail / waveform) antes de entrar na fila | Melhora UX; não altera o pipeline WebRTC por si só. | M |
| **M-03** | Suporte a ficheiros locais (MP3/FLAC) além de URLs | Evitar sempre yt-dlp; `ffmpeg` já está no fluxo. | M |
| **M-04** | Normalização de volume (loudness) entre faixas | Menos saltos de volume entre músicas; processamento extra no ffmpeg. | M |

---

## Plataformas e fontes (não só YouTube)

Hoje o fluxo assume **yt-dlp** com URLs ou `ytsearch` (em geral centrado no YouTube). Melhorias possíveis:

| ID | Ideia | Notas | Impacto |
|----|--------|------|---------|
| **P-01** | **Outras plataformas via yt-dlp** | SoundCloud, Bandcamp, Twitch VOD, etc., onde o yt-dlp suportar extrators. Muitas vezes basta passar a URL correta; ajustar mensagens de erro e testes de `getInfo`. | M |
| **P-02** | **Abstração “resolvedor de URL”** | Interface: dado um input do utilizador, devolver URL de stream + metadados. Implementações: só yt-dlp, ou plugins (spotify-downloader, etc.) com avisos legais/ToS. | A |
| **P-03** | Playlists (YouTube ou outras) | `yt-dlp` suporta; fila teria de aceitar expansão de playlist para N itens. | M |
| **P-04** | Integração com APIs oficiais (Spotify, Apple Music, etc.) | Requer tokens, quotas e **cumprimento estrito de termos de serviço**; geralmente só “metadata + busca” é seguro, não redistribuição de áudio. | ? / A |

---

## Experiência na reunião

| ID | Ideia | Notas | Impacto |
|----|--------|------|---------|
| **E-01** | Indicador na CLI de “microfone ativo” / nível de áudio (VU meter) | Via `pactl`/PipeWire ou leitura do stream; útil para diagnóstico. | M |
| **E-02** | Comandos remotos (mini HTTP API ou bot Discord/Telegram) | Controlar fila fora do terminal onde corre o bot. | M |
| **E-03** | Perfis de navegador reutilizáveis | Menos fricção no login Google; documentar risco de sessão. | B |

---

## Qualidade, segurança e manutenção

| ID | Ideia | Notas | Impacto |
|----|--------|------|---------|
| **T-01** | Testes de integração com ffmpeg/yt-dlp mockados ou em container | Aumentar confiança sem depender do Meet. | M |
| **T-02** | Atualizar Puppeteer / Chromium e políticas de sandbox | Acompanhar deprecações e avisos de segurança. | M |
| **T-03** | Empacotamento (AppImage, deb, Nix) | Instalação mais simples para utilizadores finais. | B |

---

## Riscos e compliance

- **Direitos de autor e ToS:** reproduzir conteúdo em reuniões pode estar sujeito a licenças e às regras de cada plataforma; documentar uso responsável.
- **Vídeo + partilha de ecrã:** pode exigir permissões e mais recursos; não é um “drop-in” em relação ao fluxo só de áudio atual.

---

## Ordem sugerida (não vinculativa)

1. **P-01** / **P-03** — maior valor com mudanças relativamente localizadas (URLs e fila).  
2. **M-03** — ficheiros locais, reutilizando ffmpeg.  
3. **M-01** — vídeo só após definir objetivo e limites de performance.  
4. **P-02** — quando a lista de fontes crescer e o código `getInfo`/`play` começar a ramificar demais.
