# Documentação — Meet Music Bot

## Contexto

Projeto de bot de música para Google Meet no Linux: microfone virtual via PulseAudio ou PipeWire, automação de navegador com Puppeteer e fila de reprodução com yt-dlp e ffmpeg.

## Onde encontrar o quê

| Documento                                                                              | Conteúdo                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [README na raiz do repositório](../README.md)                                          | Visão geral, pré-requisitos, instalação rápida, comandos e diagramas resumidos |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                                   | Camadas, componentes e fluxos com referência aos diagramas                     |
| [diagrams/meet-music-bot-overview.md](./diagrams/meet-music-bot-overview.md)           | Fluxogramas e diagramas de sequência em Mermaid                                |
| [TEST_REPORT.md](./TEST_REPORT.md)                                                     | Como rodar testes e o que é coberto                                            |
| [changes.md](./changes.md)                                                             | Alterações recentes e dependências                                             |
| [DECISIONS/ADR-20260325-cobertura-e-ci.md](./DECISIONS/ADR-20260325-cobertura-e-ci.md) | Escopo de cobertura e CI                                                       |
| [TODO/melhorias.md](../TODO/melhorias.md)                                              | Backlog sugerido (vídeo, outras plataformas, etc.)                             |

## Comandos (referência textual)

Na raiz do projeto, instale dependências Node com o gerenciador de pacotes configurado e execute o script de start definido no arquivo de manifesto do pacote. O script de start compila o TypeScript e inicia o processo compilado em `dist`. Para apenas compilar, use o script de build definido no mesmo manifesto.

O setup do sistema operacional e dependências nativas é feito pelo script shell de setup na raiz, com permissão de execução aplicada antes da primeira execução.

Para testes automatizados, use os scripts de teste e de teste em modo observação definidos no manifesto; o relatório de cobertura é gerado no diretório habitual do Vitest (ignorado pelo controlo de versões).

O pipeline de integração contínua no GitHub Actions está definido em `.github/workflows/ci.yml` e executa compilação, testes e empacotamento.

## Diagramas

Todos os fluxogramas e diagramas de arquitetura relevantes estão em formato Mermaid sob `docs/diagrams/`, nomeados por contexto do projeto.
