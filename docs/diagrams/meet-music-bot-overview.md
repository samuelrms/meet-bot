# Meet Music Bot — visão geral (diagramas)

Diagramas Mermaid do fluxo de áudio, da CLI e da integração com o Meet.

## Pipeline de áudio (YouTube → sala)

```mermaid
flowchart LR
  subgraph fonte["Fonte"]
    YT["YouTube / ytsearch"]
  end

  subgraph proc["Processamento"]
    YTDLP["yt-dlp"]
    FF["ffmpeg"]
  end

  subgraph saida["Saída"]
    PA["PulseAudio\nsink MeetMusicBot"]
    SRC["Source virtual\nMeetMusicBotSrc"]
    HTTP["Servidor HTTP local\nstream MP3"]
  end

  subgraph meet["Google Meet"]
    BR["Chrome / Puppeteer"]
    RTC["WebRTC"]
  end

  YT --> YTDLP --> FF
  FF --> PA
  FF --> HTTP
  PA --> SRC
  SRC --> BR
  HTTP --> BR
  BR --> RTC
```

## Fluxo da CLI (inicialização e reprodução)

```mermaid
flowchart TD
  START([Início]) --> INIT["init: AudioManager.setup\nstartStreamServer"]
  INIT --> LAUNCH["MeetBot.launch\nChrome + Xvfb"]
  LAUNCH --> READY{{CLI pronta}}
  READY --> CMD["Usuário: comando !*"]
  CMD --> PLAY{"!play?"}
  PLAY -->|sim| GET["getInfo + fila"]
  GET --> PN["playNext → ffmpeg"]
  PN --> INJ{"Em reunião?"}
  INJ -->|sim| INJS["injectAudioStream\nHTTP → MediaSource → WebRTC"]
  INJ -->|não| PN2["Só PulseAudio"]
  INJS --> PN2
  PLAY -->|não| OUTROS["outros comandos\njoin, volume, …"]
  OUTROS --> READY
  PN2 --> READY
```

## Sequência simplificada: tocar música na fila

```mermaid
sequenceDiagram
  participant U as Usuário
  participant CLI as index.ts / CLI
  participant AM as AudioManager
  participant MQ as MusicQueue
  participant MB as MeetBot
  participant M as Meet WebRTC

  U->>CLI: !play busca ou URL
  CLI->>AM: getInfo
  AM-->>CLI: metadados + URL
  CLI->>MQ: add
  CLI->>AM: play url
  AM->>AM: yt-dlp → ffmpeg → Pulse + MP3 stream
  Note over MB,M: Se em sala, após buffer
  CLI->>MB: injectAudioStream porta
  MB->>M: replaceTrack no RTCPeerConnection
```
