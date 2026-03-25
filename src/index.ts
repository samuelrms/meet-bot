#!/usr/bin/env node
import readline from 'readline';
import chalk from 'chalk';
import { AudioManager } from './audio';
import { MusicQueue } from './queue';
import { MeetBot } from './meet';

const c = {
  ok: chalk.green,
  err: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  bold: chalk.bold,
  dim: chalk.gray,
  music: chalk.magenta,
};

const audio = new AudioManager();
const queue = new MusicQueue();

let guestName = 'Music Bot';
let bot: MeetBot | null = null;

let isPlaying = false;
let initialized = false;
let isQuitting = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: c.music('♪ ') + c.bold('meet-bot') + c.dim(' > '),
});

function log(msg: string): void {
  if (isQuitting) return;
  try {
    process.stdout.write('\r\x1b[K' + msg + '\n');
    rl.prompt(true);
  } catch {
    /* ignore */
  }
}
function ok(msg: string): void {
  log(c.ok('✔ ') + msg);
}
function err(msg: string): void {
  log(c.err('✖ ') + msg);
}
function warn(msg: string): void {
  log(c.warn('⚠ ') + msg);
}
function info(msg: string): void {
  log(c.info('ℹ ') + msg);
}

async function playNext(): Promise<void> {
  const item = queue.shift();
  if (!item) {
    isPlaying = false;
    info('Fila vazia. Adicione músicas com ' + c.bold('!play <nome ou url>'));
    return;
  }

  isPlaying = true;
  log(
    c.music('\n▶  Tocando agora: ') +
      c.bold(item.title) +
      c.dim(` · ${item.duration} · ${item.uploader}`)
  );

  try {
    const playPromise = audio.play(item.url);

    if (bot && bot.inMeeting && audio.streamPort) {
      setTimeout(async () => {
        try {
          const res = await bot!.injectAudioStream(audio.streamPort);
          if (res && typeof res === 'object' && res.ok) {
            info(`Stream injetado (${res.replaced} sender(s), ${res.pcs} PC(s))`);
          } else if (res && typeof res === 'object' && res.error) {
            warn('Injeção de stream: ' + res.error);
          }
        } catch {
          /* ignore */
        }
      }, 4000);
    }

    await playPromise;
    await playNext();
  } catch (e) {
    const ex = e as Error;
    if (ex.message.includes('SIGTERM')) return;
    err(`Erro ao tocar: ${ex.message}`);
    await playNext();
  }
}

async function init(): Promise<void> {
  console.log('\n' + c.music('╔══════════════════════════════╗'));
  console.log(c.music('║') + c.bold('  🎵 Meet Music Bot v1.0      ') + c.music('║'));
  console.log(c.music('╚══════════════════════════════╝'));
  console.log(c.dim('  Digite !help para ver os comandos\n'));

  info('Configurando dispositivo de áudio virtual...');
  const okSetup = await audio.setup();
  if (!okSetup) {
    err('Falha ao criar microfone virtual. Verifique se o PulseAudio/PipeWire está instalado.');
    process.exit(1);
  }
  ok('Microfone virtual pronto: ' + c.bold(audio.sourceName));

  info('Iniciando servidor de stream de áudio...');
  const port = await audio.startStreamServer();
  ok('Stream HTTP pronto na porta ' + c.bold(String(port)));

  bot = new MeetBot({
    sourceName: audio.sourceName,
    sinkName: audio.sinkName,
    guestName,
    audioManager: audio,
  });

  info('Iniciando o navegador...');
  try {
    await bot.launch();
    ok('Navegador iniciado!');
  } catch (e) {
    const ex = e as Error;
    err('Falha ao iniciar o navegador: ' + ex.message);
    err(
      'Instale o Chrome: wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo apt install ./google-chrome-stable_current_amd64.deb'
    );
    process.exit(1);
  }

  initialized = true;
  console.log('');
  console.log(c.dim('  Use ' + c.bold('!join <url-do-meet> [nome]') + ' para entrar em uma sala'));
  console.log('');
  rl.prompt();
}

type CommandHandler = (args?: string) => Promise<void>;

const COMMANDS: Record<string, CommandHandler> = {
  async join(args) {
    if (!args) return err('Uso: !join <url ou código do Meet> [nome visitante]');
    const urlMatch = args.match(/^(https?:\/\/\S+|[a-z]{3}-[a-z]{4}-[a-z]{3})\s*(.*)?$/i);
    const url = urlMatch ? urlMatch[1] : args;
    const name = urlMatch && urlMatch[2] && urlMatch[2].trim() ? urlMatch[2].trim() : guestName;
    if (bot) bot.guestName = name;
    info(`Entrando como "${c.bold(name)}"...`);
    const joined = await bot!.join(url);
    if (joined) ok('Entrei na sala! Microfone virtual ativo.');
    else warn('Não consegui clicar em "Entrar". Tente manualmente na janela do navegador.');
  },

  async name(args) {
    if (!args) return info(`Nome atual: ${c.bold(guestName)}`);
    guestName = args;
    if (bot) bot.guestName = args;
    ok(`Nome de visitante: ${c.bold(guestName)}`);
  },

  async play(args) {
    if (!args) return err('Uso: !play <url do YouTube ou nome da música>');
    info(`Buscando: ${c.bold(args)}...`);
    const item = await audio.getInfo(args);
    queue.add(item);
    ok(`Adicionado: ${c.bold(item.title)} ${c.dim('[' + item.duration + ']')}`);
    if (!isPlaying) await playNext();
  },

  async skip() {
    if (!isPlaying) return warn('Nenhuma música tocando.');
    info('Pulando...');
    isPlaying = false;
    audio.stop();
    await playNext();
  },

  async stop() {
    audio.stop();
    queue.clear();
    isPlaying = false;
    ok('Música parada e fila limpa.');
  },

  async pause() {
    audio.stop();
    isPlaying = false;
    warn('Música pausada.');
  },

  async volume(args) {
    if (!args) return info(`Volume atual: ${c.bold(audio.getVolume() + '%')}`);
    const v = parseInt(args, 10);
    if (Number.isNaN(v) || v < 0 || v > 200) return err('Volume deve ser entre 0 e 200.');
    await audio.setVolume(v);
    ok(`Volume: ${c.bold(v + '%')}`);
  },

  async queue_cmd() {
    const items = queue.list();
    if (items.length === 0) {
      const cur = queue.current;
      if (cur) info(`Tocando: ${c.bold(cur.title)}`);
      else info('Fila vazia.');
      return;
    }
    log(c.bold('\n  Fila de músicas:'));
    if (queue.current) log(c.music('  ▶ ') + c.bold(queue.current.title) + c.dim(' (tocando)'));
    items.forEach((it, i) => log(c.dim(`  ${i + 1}. `) + it.title + c.dim(` [${it.duration}]`)));
    log('');
  },

  async loop() {
    const on = queue.toggleLoop();
    ok(`Loop ${on ? c.ok('ativado') : c.warn('desativado')}.`);
  },

  async clear() {
    queue.clear();
    audio.stop();
    isPlaying = false;
    ok('Fila limpa.');
  },

  async leave() {
    audio.stop();
    isPlaying = false;
    if (bot) await bot.leave();
    ok('Saí da sala.');
  },

  async help() {
    const cmds: [string, string][] = [
      ['!join <url> [nome]', 'Entrar em uma sala (nome opcional para visitante)'],
      ['!name <nome>', 'Definir nome de visitante (padrão: Music Bot)'],
      ['!play <url ou busca>', 'Tocar música (adiciona à fila)'],
      ['!skip', 'Pular música atual'],
      ['!pause', 'Pausar música'],
      ['!stop', 'Parar e limpar a fila'],
      ['!queue', 'Ver fila de músicas'],
      ['!loop', 'Ativar/desativar loop'],
      ['!clear', 'Limpar a fila'],
      ['!volume <0-200>', 'Ajustar volume (padrão: 80)'],
      ['!leave', 'Sair da sala'],
      ['!help', 'Mostrar esta ajuda'],
      ['!quit', 'Encerrar o bot'],
    ];
    log(c.bold('\n  Comandos disponíveis:'));
    cmds.forEach(([cmd, desc]) => log('  ' + c.music(cmd.padEnd(26)) + c.dim(desc)));
    log('');
  },

  async quit() {
    isQuitting = true;
    console.log('\nEncerrando...');
    audio.stop();
    await audio.teardown();
    if (bot) await bot.close();
    rl.close();
    process.exit(0);
  },
};

rl.on('line', async (line) => {
  rl.pause();
  const trimmed = line.trim();
  if (!trimmed) {
    rl.resume();
    rl.prompt();
    return;
  }

  if (!trimmed.startsWith('!')) {
    warn('Comandos começam com !  Ex: !play Lo-fi hip hop');
    rl.resume();
    rl.prompt();
    return;
  }

  const [cmd, ...rest] = trimmed.slice(1).split(' ');
  const args = rest.join(' ').trim();

  if (!initialized && cmd !== 'quit') {
    err('Bot ainda inicializando...');
    rl.resume();
    rl.prompt();
    return;
  }

  const key = cmd === 'queue' ? 'queue_cmd' : cmd;
  const handler = COMMANDS[key];
  if (!handler) {
    err(`Comando desconhecido: ${cmd}. Use !help.`);
  } else {
    try {
      await handler(args || undefined);
    } catch (e) {
      err(`Erro: ${(e as Error).message}`);
    }
  }

  rl.resume();
  rl.prompt();
});

process.on('SIGINT', async () => {
  console.log('');
  await COMMANDS.quit();
});

void init();
