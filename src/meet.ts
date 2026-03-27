import puppeteer, { type Browser, type Page } from "puppeteer";
import { spawn, execSync, type ChildProcess } from "child_process";
import fs from "fs";
import type { AudioManager } from "./audio";
import { normalizeMeetUrl } from "./urls";
import type { InjectAudioResult } from "./types";

export interface MeetBotOptions {
  sourceName: string;
  sinkName: string;
  guestName?: string;
  audioManager?: AudioManager | null;
}

export class MeetBot {
  sourceName: string;
  sinkName: string;
  guestName: string;
  audioManager: AudioManager | null;
  browser: Browser | null = null;
  page: Page | null = null;
  inMeeting = false;
  private _xvfb: ChildProcess | null = null;
  private readonly _display = ":99";
  constructor({
    sourceName,
    sinkName,
    guestName = "Music Bot",
    audioManager = null,
  }: MeetBotOptions) {
    this.sourceName = sourceName;
    this.sinkName = sinkName;
    this.guestName = guestName;
    this.audioManager = audioManager;
  }

  async launch(): Promise<this> {
    await this._startXvfb();

    const chromePath = this._findChrome();
    const uid = typeof process.getuid === "function" ? process.getuid() : "";
    const pulseServer =
      process.env.PULSE_SERVER ||
      (uid ? `unix:/run/user/${uid}/pulse/native` : undefined);

    this.browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        `--display=${this._display}`,
        "--use-fake-ui-for-media-stream",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1280,720",
        "--alsa-input-device=pulse",
        "--alsa-output-device=pulse",
        "--disable-webrtc-hw-encoding",
        "--disable-webrtc-hw-decoding",
        "--disable-features=WebRtcApmInAudioService,ChromeWideEchoCancellation,WebRtcHideLocalIpsWithMdns,WebRtcAllowInputVolumeAdjustment,AudioServiceOutOfProcess",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-web-security",
        "--allow-running-insecure-content",
      ],
      env: {
        ...process.env,
        DISPLAY: this._display,
        PULSE_SOURCE: this.sourceName,
        PULSE_SINK: this.sinkName,
        ...(pulseServer ? { PULSE_SERVER: pulseServer } : {}),
      },
      ignoreDefaultArgs: ["--enable-automation"],
    });

    this.page = await this.browser.newPage();

    await this.page.setBypassCSP(true);

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await this.page.evaluateOnNewDocument(() => {
      window.__botPeerConnections = [];
      const _OrigPC = window.RTCPeerConnection;

      window.RTCPeerConnection = function (
        config: RTCConfiguration | undefined,
      ) {
        const pc = new _OrigPC(config);
        window.__botPeerConnections.push(pc);
        return pc;
      } as unknown as typeof window.RTCPeerConnection;
      window.RTCPeerConnection.prototype = _OrigPC.prototype;
      window.RTCPeerConnection.generateCertificate =
        _OrigPC.generateCertificate;

      const origGUM = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async function (
        constraints?: MediaStreamConstraints,
      ) {
        const c = constraints ?? { audio: true };
        if (c.audio) {
          const base = typeof c.audio === "object" ? c.audio : {};
          c.audio = {
            ...base,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googEchoCancellation: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googAutoGainControl: false,
            googAutoGainControl2: false,
            googNoiseSuppression2: false,
            googTypingNoiseDetection: false,
          } as MediaTrackConstraints & Record<string, unknown>;
        }
        if (c.video) c.video = false;
        return origGUM(c);
      };
    });

    const ctx = this.browser.defaultBrowserContext();
    await ctx.overridePermissions("https://meet.google.com", [
      "microphone",
      "notifications",
    ]);

    return this;
  }

  async injectAudioStream(port: number): Promise<InjectAudioResult | false> {
    if (!this.page || !this.inMeeting) return false;

    const result = await this.page.evaluate(async (p: number) => {
      try {
        // Limpar injeção anterior
        if (window.__botAudioEl) {
          window.__botAudioEl.pause();
          window.__botAudioEl.remove();
        }
        if (window.__botAudioCtx) {
          try {
            await window.__botAudioCtx.close();
          } catch {
            /* ignore */
          }
        }

        // ── Web Audio API bypass ─────────────────────────────────
        // Criar AudioContext → MediaElementSource → Destination
        // A track resultante de createMediaStreamDestination NÃO
        // passa pelo APM (noise suppression, echo cancellation,
        // AGC) do Chrome — é tratada como áudio sintético.
        const ctx = new AudioContext({ sampleRate: 48000 });
        const audio = document.createElement("audio");
        audio.src = `http://127.0.0.1:${p}/stream`;
        audio.crossOrigin = "anonymous";
        audio.volume = 1;
        document.body.appendChild(audio);

        // Conectar: audio → AudioContext → MediaStreamDestination
        const source = ctx.createMediaElementSource(audio);
        const dest = ctx.createMediaStreamDestination();
        source.connect(dest);
        // Conectar também aos speakers para monitoramento local
        source.connect(ctx.destination);

        await audio.play();
        await new Promise<void>((r) => setTimeout(r, 500));

        const track = dest.stream.getAudioTracks()[0];
        if (!track)
          return {
            ok: false,
            error: "sem audio track no createMediaStreamDestination",
          };

        // Substituir tracks de áudio em todas as PeerConnections
        const pcs = window.__botPeerConnections || [];
        let replaced = 0;
        for (const pc of pcs) {
          if (pc.connectionState === "closed") continue;
          for (const sender of pc.getSenders()) {
            if (sender.track && sender.track.kind === "audio") {
              await sender.replaceTrack(track);
              replaced++;
            }
          }
        }

        window.__botAudioEl = audio;
        window.__botAudioCtx = ctx;
        return { ok: true, replaced, pcs: pcs.length };
      } catch (e) {
        const err = e as Error;
        return { ok: false, error: err.message };
      }
    }, port);

    return result;
  }

  async join(meetUrl: string): Promise<boolean> {
    if (!this.page)
      throw new Error("Browser não iniciado. Chame launch() primeiro.");

    const cleanUrl = normalizeMeetUrl(meetUrl);
    console.log(`Abrindo: ${cleanUrl}`);

    await this.page.goto(cleanUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await this._sleep(3000);

    await this._dismissCameraPopup();
    await this._sleep(800);

    await this._fillGuestName(this.guestName);
    await this._sleep(1000);

    await this._forceCameraOff();
    await this._sleep(1500);

    const joined = await this._clickJoinButton();

    if (joined) {
      this.inMeeting = true;
      await this._sleep(3000);
      await this._forceCameraOff();
      await this._ensureMicOn();
      await this._selectVirtualMic();
      await this._disableNoiseCancellation();
      if (this.audioManager) {
        await this._sleep(1000);
        await this.audioManager.moveChromeToBotSource();
      }
    }

    return joined;
  }

  async leave(): Promise<void> {
    if (!this.page) return;
    try {
      const leaveSelectors = [
        '[data-tooltip*="Leave"]',
        '[data-tooltip*="Sair"]',
        '[aria-label*="Leave"]',
        '[aria-label*="Sair"]',
        'button[jsname="CQylAd"]',
      ];
      for (const sel of leaveSelectors) {
        const btn = await this.page.$(sel).catch(() => null);
        if (btn) {
          await btn.click();
          break;
        }
      }
    } catch {
      /* ignore */
    }
    this.inMeeting = false;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
      this.inMeeting = false;
    }
    this._stopXvfb();
  }

  private async _startXvfb(): Promise<void> {
    try {
      execSync("which Xvfb", { stdio: "ignore" });
    } catch {
      throw new Error(
        "Xvfb não encontrado. Instale com:\n  sudo apt install xvfb",
      );
    }
    try {
      execSync(`pkill -f "Xvfb ${this._display}"`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
    await this._sleep(500);

    return new Promise((resolve, reject) => {
      this._xvfb = spawn(
        "Xvfb",
        [
          this._display,
          "-screen",
          "0",
          "1280x720x24",
          "-ac",
          "+extension",
          "GLX",
          "+render",
          "-noreset",
        ],
        { stdio: "ignore" },
      );
      this._xvfb.on("error", (e) => reject(new Error(`Xvfb: ${e.message}`)));
      setTimeout(resolve, 1000);
    });
  }

  private _stopXvfb(): void {
    if (this._xvfb) {
      try {
        this._xvfb.kill();
      } catch {
        /* ignore */
      }
      this._xvfb = null;
    }
  }

  private async _dismissCameraPopup(): Promise<void> {
    if (!this.page) return;
    try {
      const clicked = await this.page.evaluate(() => {
        const kw = [
          "continue without camera",
          "continuar sem câmera",
          "continuar sem camera",
        ];
        for (const el of document.querySelectorAll("button, a")) {
          if (
            kw.some((k) => el.textContent?.trim().toLowerCase().includes(k))
          ) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (!clicked) {
        await this._sleep(1500);
        await this.page.evaluate(() => {
          const kw = [
            "continue without camera",
            "continuar sem câmera",
            "continuar sem camera",
          ];
          for (const el of document.querySelectorAll("button, a")) {
            if (
              kw.some((k) => el.textContent?.trim().toLowerCase().includes(k))
            ) {
              (el as HTMLElement).click();
              return;
            }
          }
        });
      }
    } catch {
      /* ignore */
    }
  }

  private async _fillGuestName(name: string): Promise<void> {
    if (!this.page) return;
    for (const sel of [
      'input[aria-label="Your name"]',
      'input[aria-label="Seu nome"]',
      'input[placeholder*="name"]',
      'input[placeholder*="nome"]',
      'input[jsname="YPqjbf"]',
    ]) {
      try {
        const input = await this.page.$(sel);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(name, { delay: 60 });
          return;
        }
      } catch {
        /* ignore */
      }
    }
  }

  private async _forceCameraOff(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.evaluate(() => {
        for (const btn of document.querySelectorAll("button")) {
          const label = (btn.getAttribute("aria-label") || "").toLowerCase();
          if (
            !(
              label.includes("camera") ||
              label.includes("câmera") ||
              label.includes("video")
            )
          )
            continue;
          if (
            label.includes("desativar") ||
            label.includes("turn off") ||
            label.includes("stop")
          )
            btn.click();
        }
      });
    } catch {
      /* ignore */
    }
  }

  private async _ensureMicOn(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.evaluate(() => {
        for (const btn of document.querySelectorAll("button")) {
          const label = (btn.getAttribute("aria-label") || "").toLowerCase();
          if (!(label.includes("microphone") || label.includes("microfone")))
            continue;
          if (
            label.includes("ativar") ||
            label.includes("unmute") ||
            label.includes("turn on mic")
          )
            btn.click();
        }
      });
    } catch {
      /* ignore */
    }
  }

  private async _selectVirtualMic(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.evaluate(async (targetLabel: string) => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mic = devices.find(
          (d) =>
            d.kind === "audioinput" &&
            (d.label.toLowerCase().includes(targetLabel.toLowerCase()) ||
              d.label.toLowerCase().includes("meetmusicbot") ||
              d.label.toLowerCase().includes("monitor") ||
              d.label.toLowerCase().includes("virtual")),
        );
        if (!mic) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: mic.deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        stream.getTracks().forEach((t) => t.stop());
      }, this.sourceName);
    } catch {
      /* ignore */
    }
  }

  private async _disableNoiseCancellation(): Promise<void> {
    if (!this.page) return;
    try {
      // Tentar abrir Settings → Audio → desligar Noise cancellation
      // 1. Clicar no botão "More options" (⋮)
      const moreBtn = await this.page.$(
        '[aria-label*="More options"], [aria-label*="Mais opções"], [data-tooltip*="More options"], [data-tooltip*="Mais opções"]',
      );
      if (!moreBtn) return;
      await moreBtn.click();
      await this._sleep(800);

      // 2. Clicar em "Settings" / "Configurações"
      const clicked = await this.page.evaluate(() => {
        const kw = ["settings", "configurações", "configuracoes"];
        for (const el of document.querySelectorAll(
          '[role="menuitem"], li, div[role="option"]',
        )) {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (kw.some((k) => text.includes(k))) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (!clicked) return;
      await this._sleep(1000);

      // 3. Navegar para aba "Audio" / "Áudio"
      await this.page.evaluate(() => {
        const kw = ["audio", "áudio"];
        for (const el of document.querySelectorAll(
          '[role="tab"], button, [data-tab-id]',
        )) {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (kw.some((k) => text === k)) {
            (el as HTMLElement).click();
            return;
          }
        }
      });
      await this._sleep(800);

      // 4. Desligar "Noise cancellation" se estiver ativado
      await this.page.evaluate(() => {
        const kw = [
          "noise cancellation",
          "cancelamento de ruído",
          "noise suppression",
          "supressão de ruído",
        ];
        // Procurar por label + toggle (switch/checkbox)
        for (const label of document.querySelectorAll("label, div, span")) {
          const text = label.textContent?.trim().toLowerCase() || "";
          if (!kw.some((k) => text.includes(k))) continue;
          // Encontrar o toggle/checkbox mais próximo
          const parent = label.closest(
            '[role="presentation"], [role="listitem"], div',
          );
          if (!parent) continue;
          const toggle = parent.querySelector(
            '[role="switch"][aria-checked="true"], input[type="checkbox"]:checked, [aria-pressed="true"]',
          );
          if (toggle) {
            (toggle as HTMLElement).click();
            return;
          }
        }
      });
      await this._sleep(500);

      // 5. Fechar dialog de settings
      await this.page.evaluate(() => {
        const closeBtn = document.querySelector(
          '[aria-label="Close"], [aria-label="Fechar"], button[jsname="j6LnEc"]',
        );
        if (closeBtn) (closeBtn as HTMLElement).click();
      });
    } catch {
      /* ignore — noise cancellation toggle is best-effort */
    }
  }

  private async _clickJoinButton(): Promise<boolean> {
    if (!this.page) return false;
    for (const sel of [
      '[jsname="Qx7uuf"]',
      '[jsname="V67aGc"]',
      'button[jsaction*="click:TvD9wd"]',
    ]) {
      try {
        await this.page.waitForSelector(sel, { timeout: 4000 });
        await this.page.click(sel);
        return true;
      } catch {
        /* try next */
      }
    }
    try {
      return await this.page.evaluate(() => {
        const kw = [
          "join now",
          "ask to join",
          "entrar agora",
          "pedir para entrar",
          "participar",
        ];
        for (const btn of document.querySelectorAll("button")) {
          if (
            kw.some((k) => btn.textContent?.trim().toLowerCase().includes(k))
          ) {
            btn.click();
            return true;
          }
        }
        return false;
      });
    } catch {
      return false;
    }
  }

  private _findChrome(): string | undefined {
    for (const p of [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
      "/usr/bin/brave-browser",
    ]) {
      if (fs.existsSync(p)) return p;
    }
    return undefined;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

declare global {
  interface Window {
    __botPeerConnections: RTCPeerConnection[];
    __botAudioEl?: HTMLAudioElement;
    __botAudioCtx?: AudioContext;
  }
}
