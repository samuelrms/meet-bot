#!/bin/bash

set -e

echo "🎵 Meet Music Bot - Setup"
echo "=========================="

# ── Atualiza pacotes (ignora erros de repos com problema de assinatura) ────────
echo "📦 Atualizando pacotes..."
sudo apt-get update -qq 2>/dev/null || true

# ── Detecta qual pacote do Chromium está disponível ───────────────────────────
echo "📦 Detectando versão do Chromium disponível..."
if apt-cache show chromium &>/dev/null; then
  CHROMIUM_PKG="chromium"
  echo "   → Usando: chromium"
elif apt-cache show chromium-browser &>/dev/null; then
  CHROMIUM_PKG="chromium-browser"
  echo "   → Usando: chromium-browser"
else
  CHROMIUM_PKG=""
  echo "   → Chromium não encontrado nos repos, tentará usar o Chrome instalado"
fi

# ── Instala dependências do sistema ───────────────────────────────────────────
echo "📦 Instalando dependências do sistema..."
PKGS="ffmpeg pulseaudio pulseaudio-utils nodejs npm curl python3"

if [ -n "$CHROMIUM_PKG" ]; then
  PKGS="$PKGS $CHROMIUM_PKG"
fi

sudo apt-get install -y $PKGS

# ── Instala yt-dlp ────────────────────────────────────────────────────────────
echo "📦 Instalando yt-dlp..."
sudo curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

yt-dlp --version && echo "   ✔ yt-dlp instalado"

# ── Instala dependências do Node ──────────────────────────────────────────────
echo "📦 Instalando dependências do Node.js..."
npm install

# ── Verifica qual binário do Chromium/Chrome está disponível ─────────────────
echo ""
echo "🔍 Verificando navegador disponível..."
FOUND_BROWSER=""
for BIN in chromium chromium-browser google-chrome google-chrome-stable /snap/bin/chromium; do
  if command -v "$BIN" &>/dev/null; then
    FOUND_BROWSER="$BIN"
    echo "   ✔ Encontrado: $(command -v $BIN)"
    break
  fi
done

if [ -z "$FOUND_BROWSER" ]; then
  echo "   ⚠ Nenhum navegador encontrado. Instale com uma das opções:"
  echo ""
  echo "   Opção 1 - Chromium via snap:"
  echo "     sudo snap install chromium"
  echo ""
  echo "   Opção 2 - Google Chrome:"
  echo "     wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"
  echo "     sudo apt install ./google-chrome-stable_current_amd64.deb"
fi

# ── Verifica PulseAudio ───────────────────────────────────────────────────────
echo ""
echo "🔍 Verificando PulseAudio..."
if pulseaudio --check 2>/dev/null; then
  echo "   ✔ PulseAudio já está rodando"
else
  pulseaudio --start 2>/dev/null && echo "   ✔ PulseAudio iniciado" || \
    echo "   ⚠ Inicie manualmente com: pulseaudio --start"
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "🚀 Para iniciar o bot:"
echo "   pnpm start"
echo ""
echo "📋 Comandos disponíveis no bot:"
echo "   !join <url-do-meet>    → Entrar na sala"
echo "   !play <url ou busca>   → Tocar música"
echo "   !skip                  → Pular música"
echo "   !queue                 → Ver fila"
echo "   !volume <0-200>        → Ajustar volume"
echo "   !loop                  → Ativar/desativar loop"
echo "   !stop                  → Parar música"
echo "   !leave                 → Sair da sala"
echo "   !help                  → Ver todos os comandos"
