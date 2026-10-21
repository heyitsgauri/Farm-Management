// One command to run the whole project (FastAPI backend + React frontend), MERN-style:
//   npm run dev
// Works on macOS, Linux and Windows. First run installs everything automatically.
// Press Ctrl+C to stop both servers.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const isWin = process.platform === 'win32';
const venvPython = path.join(root, '.venv', isWin ? 'Scripts\\python.exe' : 'bin/python');
const npm = isWin ? 'npm.cmd' : 'npm';
const apiPort = process.env.API_PORT || '8000';
const apiUrl = `http://localhost:${apiPort}`;

const log = (msg) => console.log(`\x1b[32m[farm]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[farm] ${msg}\x1b[0m`);
  process.exit(1);
};

function run(cmd, args, cwd = root) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin && cmd.endsWith('.cmd') });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(' ')}`);
}

function findSystemPython() {
  for (const cmd of isWin ? ['py', 'python', 'python3'] : ['python3', 'python']) {
    const res = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (res.status === 0 && /Python 3\./.test(`${res.stdout}${res.stderr}`)) return cmd;
  }
  return null;
}

async function backendHealthy() {
  try {
    const res = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── 0. Node version ──────────────────────────────────────────
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) fail(`Node.js 20 or newer is required (you have ${process.versions.node}). Download it from https://nodejs.org`);

// ── 1. Python environment ────────────────────────────────────
// A .venv copied from another computer won't work, so rebuild it if it can't import the backend packages.
const venvOk =
  existsSync(venvPython) &&
  spawnSync(venvPython, ['-c', 'import fastapi, uvicorn, stable_baselines3']).status === 0;

if (!venvOk) {
  const python = findSystemPython();
  if (!python) fail('Python 3 is not installed. Download it from https://www.python.org/downloads/');
  log('Setting up the Python environment (first run only, takes a few minutes)...');
  rmSync(path.join(root, '.venv'), { recursive: true, force: true });
  run(python, ['-m', 'venv', '.venv']);
  run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
}

// ── 2. Frontend packages ─────────────────────────────────────
const nm = path.join(frontend, 'node_modules');
if (!existsSync(path.join(nm, 'vite')) || !existsSync(path.join(nm, 'motion')) || !existsSync(path.join(nm, 'react-router-dom'))) {
  log('Installing frontend packages (first run only)...');
  run(npm, ['install'], frontend);
}

// ── 3. Backend ───────────────────────────────────────────────
const children = [];
let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  log('Stopping servers...');
  for (const child of children) if (child.exitCode === null) child.kill();
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

if (await backendHealthy()) {
  log(`Backend already running at ${apiUrl}`);
} else {
  log(`Starting backend at ${apiUrl} ...`);
  const backend = spawn(venvPython, ['scripts/run_api.py', '--port', apiPort, '--no-reload'], { cwd: root, stdio: 'inherit' });
  children.push(backend);
  backend.on('exit', (code) => {
    if (!stopping) {
      console.error(`\x1b[31m[farm] Backend stopped (exit code ${code}).\x1b[0m`);
      stopAll(1);
    }
  });

  let up = false;
  for (let i = 0; i < 90 && !stopping; i++) {
    if (await backendHealthy()) {
      up = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!up) {
    if (!stopping) fail('Backend did not start within 90 seconds. Check the errors above.');
  } else {
    log('Backend is ready.');
  }
}

// ── 4. Frontend (opens the browser) ──────────────────────────
log('Starting frontend...');
const web = spawn(npm, ['run', 'dev', '--', '--open'], {
  cwd: frontend,
  stdio: 'inherit',
  shell: isWin,
  env: { ...process.env, VITE_API_BASE_URL: apiUrl },
});
children.push(web);
web.on('exit', (code) => stopAll(code ?? 0));
