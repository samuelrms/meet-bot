import { exec, spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import { PassThrough } from 'stream';
import http from 'http';
import type { AddressInfo } from 'net';
import type { ServerResponse } from 'http';
import type { QueueItem } from './types';
import { buildYtDlpQueryUrl } from './urls';
import { clampVolumePercent } from './volume';

const execAsync = promisify(exec);

const SINK_NAME = 'MeetMusicBot';
const SOURCE_NAME = 'MeetMusicBotSrc';

export class AudioManager {
  currentYtdlp: ChildProcess | null = null;
  currentFfmpeg: ChildProcess | null = null;
  sinkModule: string | null = null;
  sourceModule: string | null = null;
  volume = 0.8;
  isPipeWire = false;
  onEnd: (() => void) | null = null;
  streamPort = 0;
  private _streamServer: http.Server | null = null;
  private _mp3Stream = new PassThrough();
  private readonly _httpClients = new Set<ServerResponse>();

  private async _detectBackend(): Promise<void> {
    try {
      const { stdout } = await execAsync('pactl info 2>/dev/null');
      this.isPipeWire = stdout.toLowerCase().includes('pipewire');
    } catch {
      this.isPipeWire = false;
    }
  }

  async setup(): Promise<boolean> {
    try {
      await this._detectBackend();

      if (this.isPipeWire) {
        await execAsync('systemctl --user start pipewire pipewire-pulse wireplumber 2>/dev/null || true');
      } else {
        await execAsync('pulseaudio --start --log-target=syslog 2>/dev/null || true');
      }
      await this._sleep(800);

      await this._unloadOldModules();

      const { stdout: s1 } = await execAsync(
        `pactl load-module module-null-sink ` +
          `sink_name=${SINK_NAME} ` +
          `sink_properties=device.description="${SINK_NAME}"`
      );
      this.sinkModule = s1.trim();
      await this._sleep(500);

      const remapCmd = this.isPipeWire
        ? `pactl load-module module-remap-source source_name=${SOURCE_NAME} master=${SINK_NAME}.monitor source_properties=device.description="${SOURCE_NAME}"`
        : `pactl load-module module-virtual-source source_name=${SOURCE_NAME} master=${SINK_NAME}.monitor source_properties=device.description="${SOURCE_NAME}"`;

      try {
        const { stdout: s2 } = await execAsync(remapCmd);
        this.sourceModule = s2.trim();
        await execAsync(`pactl set-default-source ${SOURCE_NAME}`).catch(() => {});
      } catch {
        this.sourceModule = null;
        await execAsync(`pactl set-default-source ${SINK_NAME}.monitor`).catch(() => {});
      }

      await execAsync(`pactl set-default-sink ${SINK_NAME}`).catch(() => {});

      const paVol = Math.round(this.volume * 65536);
      await execAsync(`pactl set-sink-volume ${SINK_NAME} ${paVol}`).catch(() => {});

      return true;
    } catch (err) {
      const e = err as Error;
      console.error('Erro ao criar dispositivo de áudio virtual:', e.message);
      return false;
    }
  }

  startStreamServer(): Promise<number> {
    return new Promise((resolve) => {
      this._streamServer = http.createServer((req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
          res.end();
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache, no-store',
          'Access-Control-Allow-Origin': '*',
          Connection: 'keep-alive',
        });

        this._httpClients.add(res);
        const onData = (chunk: Buffer): void => {
          res.write(chunk);
        };
        this._mp3Stream.on('data', onData);

        const cleanup = (): void => {
          this._mp3Stream.removeListener('data', onData);
          this._httpClients.delete(res);
        };

        req.on('close', cleanup);
        req.on('error', cleanup);
        res.on('error', cleanup);
      });

      this._streamServer.listen(0, '127.0.0.1', () => {
        const addr = this._streamServer?.address();
        if (addr && typeof addr === 'object') {
          this.streamPort = (addr as AddressInfo).port;
        }
        resolve(this.streamPort);
      });
    });
  }

  stopStreamServer(): void {
    if (this._streamServer) {
      this._streamServer.close();
      this._streamServer = null;
    }
  }

  async moveChromeToBotSource(): Promise<number> {
    const target = this.sourceName;
    try {
      const { stdout } = await execAsync('pactl list source-outputs short 2>/dev/null');
      const lines = stdout.trim().split('\n').filter(Boolean);
      let moved = 0;
      for (const line of lines) {
        const id = line.trim().split('\t')[0];
        if (!id || Number.isNaN(Number(id))) continue;
        try {
          await execAsync(`pactl move-source-output ${id} ${target}`);
          moved++;
        } catch {
          /* ignore */
        }
      }
      return moved;
    } catch {
      return 0;
    }
  }

  get sourceName(): string {
    return this.sourceModule ? SOURCE_NAME : `${SINK_NAME}.monitor`;
  }

  get sinkName(): string {
    return SINK_NAME;
  }

  async getInfo(query: string): Promise<QueueItem> {
    const url = buildYtDlpQueryUrl(query);
    try {
      const { stdout } = await execAsync(
        `yt-dlp --print "%(title)s|||%(uploader)s|||%(duration_string)s|||%(webpage_url)s" ` +
          `--no-playlist --no-warnings -q "${url}" 2>/dev/null`,
        { timeout: 15000 }
      );
      const parts = stdout.trim().split('|||');
      return {
        title: parts[0] || 'Desconhecido',
        uploader: parts[1] || '',
        duration: parts[2] || '??:??',
        url: parts[3] || url,
        query,
      };
    } catch {
      return { title: query, uploader: '', duration: '??:??', url, query };
    }
  }

  play(url: string): Promise<void> {
    this.stop();

    this._mp3Stream = new PassThrough();

    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', ['--no-playlist', '--quiet', '-x', '--audio-format', 'opus', '--audio-quality', '0', '-o', '-', url]);

      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-loglevel',
          'error',
          '-i',
          'pipe:0',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-f',
          'pulse',
          SINK_NAME,
          '-f',
          'mp3',
          '-ab',
          '128k',
          '-write_xing',
          '0',
          'pipe:3',
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
        }
      );

      ytdlp.stdout?.pipe(ffmpeg.stdin as NodeJS.WritableStream);
      ytdlp.stderr?.on('data', () => {});

      const fd3 = ffmpeg.stdio[3];
      if (fd3 && typeof fd3 !== 'string' && 'on' in fd3) {
        fd3.on('data', (chunk: Buffer) => {
          try {
            this._mp3Stream.write(chunk);
          } catch {
            /* ignore */
          }
        });
      }

      ffmpeg.stderr?.on('data', (d: Buffer) => {
        const msg = d.toString().trim();
        if (msg) console.error('[ffmpeg]', msg);
      });

      ytdlp.on('error', (e) => reject(new Error(`yt-dlp: ${e.message}`)));
      ffmpeg.on('error', (e) => reject(new Error(`ffmpeg: ${e.message}`)));

      ytdlp.on('close', (code) => {
        if (code !== 0 && code !== null) ffmpeg.stdin?.end();
      });

      ffmpeg.on('close', (code) => {
        this.currentYtdlp = null;
        this.currentFfmpeg = null;
        if (code === 0 || code === null) {
          resolve();
          if (this.onEnd) this.onEnd();
        } else {
          reject(new Error(`ffmpeg encerrou com código ${code}`));
        }
      });

      this.currentYtdlp = ytdlp;
      this.currentFfmpeg = ffmpeg;
    });
  }

  stop(): void {
    if (this.currentFfmpeg) {
      try {
        this.currentFfmpeg.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
    if (this.currentYtdlp) {
      try {
        this.currentYtdlp.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
    this.currentFfmpeg = null;
    this.currentYtdlp = null;
  }

  async setVolume(pct: number): Promise<void> {
    this.volume = clampVolumePercent(pct) / 100;
    const paVol = Math.round(this.volume * 65536);
    await execAsync(`pactl set-sink-volume ${SINK_NAME} ${paVol}`).catch(() => {});
  }

  getVolume(): number {
    return Math.round(this.volume * 100);
  }

  async teardown(): Promise<void> {
    this.stop();
    this.stopStreamServer();
    await this._sleep(300);
    if (this.sourceModule) {
      await execAsync(`pactl unload-module ${this.sourceModule}`).catch(() => {});
    }
    if (this.sinkModule) {
      await execAsync(`pactl unload-module ${this.sinkModule}`).catch(() => {});
    }
    this.sourceModule = null;
    this.sinkModule = null;
  }

  private async _unloadOldModules(): Promise<void> {
    try {
      const { stdout } = await execAsync('pactl list modules short');
      for (const line of stdout.split('\n')) {
        if (line.includes(SINK_NAME) || line.includes(SOURCE_NAME)) {
          const id = line.trim().split('\t')[0];
          await execAsync(`pactl unload-module ${id}`).catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
