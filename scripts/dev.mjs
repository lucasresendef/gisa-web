import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const BASE_PORT = Number(process.env.PORT || 5173);
const MAX_TRIES = 30;

const respondsOn = (host, port) =>
  new Promise((res) => {
    const socket = net.connect({ host, port });
    let done = false;
    const finish = (busy) => {
      if (done) return;
      done = true;
      socket.destroy();
      res(busy);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(400, () => finish(false));
  });

const isPortBusy = async (port) =>
  (await respondsOn('127.0.0.1', port)) || (await respondsOn('::1', port));

const findFreePort = async () => {
  for (let port = BASE_PORT; port < BASE_PORT + MAX_TRIES; port += 1) {
    if (!(await isPortBusy(port))) return port;
  }
  return BASE_PORT;
};

const run = async () => {
  const port = await findFreePort();
  if (port !== BASE_PORT) {
    console.log(`\x1b[33mPorta ${BASE_PORT} ocupada — subindo na ${port}\x1b[0m`);
  }
  const bin = resolve(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vite.cmd' : 'vite',
  );
  const child = spawn(bin, ['--host', '--port', String(port)], { stdio: 'inherit', cwd: root });
  child.on('exit', (code) => process.exit(code ?? 0));
};

run();
