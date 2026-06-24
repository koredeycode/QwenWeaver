import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

export type InstallMode = 'npm' | 'docker' | 'git' | 'image';

export type UpdateStatus = 'current' | 'available' | 'unknown';

export interface UpdateInfo {
  installMode: InstallMode;
  currentVersion: string | null;
  remoteVersion: string | null;
  status: UpdateStatus;
  error: string | null;
  updateLogs: string[];
  updateRunning: boolean;
  updateFinishedAt: string | null;
}

const updateEvents = new EventEmitter();
updateEvents.setMaxListeners(100);

export { updateEvents };

let currentUpdateInfo: UpdateInfo = {
  installMode: 'npm',
  currentVersion: null,
  remoteVersion: null,
  status: 'unknown',
  error: null,
  updateLogs: [],
  updateRunning: false,
  updateFinishedAt: null,
};

function detectInstallMode(): InstallMode {
  const mode = process.env.INSTALL_MODE;
  if (mode === 'docker' || mode === 'git') return mode;
  return 'npm';
}

function readVersionFromPkg(path: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf-8'));
    return pkg.version || null;
  } catch {
    return null;
  }
}

function readCommitSha(): string | null {
  const sha = process.env.INSTALL_COMMIT_SHA;
  if (sha && sha !== 'unknown') return sha;
  return null;
}

async function runCommand(cmd: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: err.message }));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function appendLog(line: string) {
  currentUpdateInfo.updateLogs = [...currentUpdateInfo.updateLogs, line].slice(-200);
  updateEvents.emit('log', line);
}

function emitStatus() {
  updateEvents.emit('status', {
    updateRunning: currentUpdateInfo.updateRunning,
    updateFinishedAt: currentUpdateInfo.updateFinishedAt,
    error: currentUpdateInfo.error,
  });
}

async function checkNpmVersion(): Promise<UpdateInfo> {
  const currentVersion = readVersionFromPkg(
    join('/usr/lib/node_modules/@qwenweaver/cli', 'package.json'),
  );

  const result = await runCommand('npm', ['view', '@qwenweaver/cli', 'version']);
  const remoteVersion = result.code === 0 ? result.stdout.trim() : null;

  return {
    installMode: 'npm',
    currentVersion,
    remoteVersion,
    status: remoteVersion && currentVersion
      ? (currentVersion === remoteVersion ? 'current' : 'available')
      : 'unknown',
    error: result.code !== 0 ? result.stderr.trim() || 'npm view failed' : null,
    updateLogs: [],
    updateRunning: false,
    updateFinishedAt: null,
  };
}

async function checkDockerVersion(): Promise<UpdateInfo> {
  const currentSha = readCommitSha();

  const pullResult = await runCommand('docker', ['pull', 'ghcr.io/qwenweaver/qwenweaver:latest']);
  if (pullResult.code !== 0) {
    return {
      installMode: 'docker',
      currentVersion: currentSha,
      remoteVersion: null,
      status: 'unknown',
      error: pullResult.stderr.trim() || 'docker pull failed',
      updateLogs: [],
      updateRunning: false,
      updateFinishedAt: null,
    };
  }

  const inspectResult = await runCommand('docker', [
    'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}',
    'ghcr.io/qwenweaver/qwenweaver:latest',
  ]);
  const remoteSha = inspectResult.code === 0 ? inspectResult.stdout.trim() : null;

  return {
    installMode: 'docker',
    currentVersion: currentSha,
    remoteVersion: remoteSha,
    status: currentSha && remoteSha
      ? (currentSha === remoteSha ? 'current' : 'available')
      : 'unknown',
    error: null,
    updateLogs: [],
    updateRunning: false,
    updateFinishedAt: null,
  };
}

async function checkGitVersion(): Promise<UpdateInfo> {
  let currentSha = readCommitSha();
  if (!currentSha) {
    const result = await runCommand('git', ['rev-parse', 'HEAD']);
    currentSha = result.code === 0 ? result.stdout.trim() : null;
  }

  const fetchResult = await runCommand('git', ['fetch', 'origin', 'main']);
  if (fetchResult.code !== 0) {
    return {
      installMode: 'git',
      currentVersion: currentSha,
      remoteVersion: null,
      status: 'unknown',
      error: fetchResult.stderr.trim() || 'git fetch failed',
      updateLogs: [],
      updateRunning: false,
      updateFinishedAt: null,
    };
  }

  const remoteResult = await runCommand('git', ['rev-parse', 'origin/main']);
  const remoteSha = remoteResult.code === 0 ? remoteResult.stdout.trim() : null;

  return {
    installMode: 'git',
    currentVersion: currentSha,
    remoteVersion: remoteSha,
    status: currentSha && remoteSha
      ? (currentSha === remoteSha ? 'current' : 'available')
      : 'unknown',
    error: null,
    updateLogs: [],
    updateRunning: false,
    updateFinishedAt: null,
  };
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const mode = detectInstallMode();

  let info: UpdateInfo;
  switch (mode) {
    case 'docker':
      info = await checkDockerVersion();
      break;
    case 'git':
      info = await checkGitVersion();
      break;
    default:
      info = await checkNpmVersion();
      break;
  }

  currentUpdateInfo = { ...info, updateLogs: currentUpdateInfo.updateLogs };
  return currentUpdateInfo;
}

export function getUpdateInfo(): UpdateInfo {
  return { ...currentUpdateInfo };
}

async function runNpmUpdate(): Promise<void> {
  appendLog('Checking current version...');
  const info = await checkNpmVersion();
  if (info.status === 'current') {
    appendLog('Already on latest npm version.');
    return;
  }
  if (!info.remoteVersion) {
    throw new Error('Could not determine remote version.');
  }

  appendLog(`Updating from ${info.currentVersion} to ${info.remoteVersion}...`);
  const result = await runCommand('npm', ['update', '-g', '@qwenweaver/cli']);
  if (result.code !== 0) {
    throw new Error(`npm update failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  appendLog('npm update completed.');
  appendLog('Restarting service...');

  const restartResult = await runCommand('systemctl', ['restart', 'qwenweaver']);
  if (restartResult.code !== 0) {
    appendLog(`Warning: restart command failed: ${restartResult.stderr.trim()}`);
    appendLog('You may need to restart manually: sudo systemctl restart qwenweaver');
  } else {
    appendLog('Service restarted.');
  }
}

async function runDockerUpdate(): Promise<void> {
  appendLog('Pulling latest image...');
  const pullResult = await runCommand('docker', ['compose', 'pull', 'qwenweaver']);
  if (pullResult.code !== 0) {
    throw new Error(`docker compose pull failed: ${pullResult.stderr.trim() || pullResult.stdout.trim()}`);
  }
  appendLog('Image pulled. Recreating container...');
  const upResult = await runCommand('docker', ['compose', 'up', '-d', '--no-deps', 'qwenweaver']);
  if (upResult.code !== 0) {
    throw new Error(`docker compose up failed: ${upResult.stderr.trim() || upResult.stdout.trim()}`);
  }
  appendLog('Container updated. QwenWeaver will restart with the new image.');
}

async function runGitUpdate(): Promise<void> {
  appendLog('Fetching latest source...');
  const fetchResult = await runCommand('git', ['fetch', '--ff-only', 'origin', 'main']);
  if (fetchResult.code !== 0) {
    throw new Error(`git fetch failed: ${fetchResult.stderr.trim() || fetchResult.stdout.trim()}`);
  }

  appendLog('Merging changes...');
  const mergeResult = await runCommand('git', ['merge', '--ff-only', 'origin/main']);
  if (mergeResult.code !== 0) {
    throw new Error(`git merge failed: ${mergeResult.stderr.trim() || mergeResult.stdout.trim()}`);
  }

  appendLog('Installing dependencies...');
  const installResult = await runCommand('pnpm', ['install', '--frozen-lockfile']);
  if (installResult.code !== 0) {
    throw new Error(`pnpm install failed: ${installResult.stderr.trim() || installResult.stdout.trim()}`);
  }

  appendLog('Building...');
  const buildResult = await runCommand('pnpm', ['build']);
  if (buildResult.code !== 0) {
    throw new Error(`pnpm build failed: ${buildResult.stderr.trim() || buildResult.stdout.trim()}`);
  }

  appendLog('Build completed. Restarting service...');
  const restartResult = await runCommand('systemctl', ['restart', 'qwenweaver']);
  if (restartResult.code !== 0) {
    appendLog(`Warning: restart command failed: ${restartResult.stderr.trim()}`);
    appendLog('You may need to restart manually: sudo systemctl restart qwenweaver');
  } else {
    appendLog('Service restarted.');
  }
}

async function runUpdateInternal(): Promise<void> {
  currentUpdateInfo.updateRunning = true;
  currentUpdateInfo.updateLogs = [];
  currentUpdateInfo.updateFinishedAt = null;
  currentUpdateInfo.error = null;
  emitStatus();

  const mode = detectInstallMode();
  appendLog(`Update mode: ${mode}`);

  try {
    switch (mode) {
      case 'docker':
        await runDockerUpdate();
        break;
      case 'git':
        await runGitUpdate();
        break;
      default:
        await runNpmUpdate();
        break;
    }
    appendLog('Update completed successfully.');
    currentUpdateInfo.status = 'current';
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    appendLog(`Error: ${msg}`);
    currentUpdateInfo.error = msg;
  } finally {
    currentUpdateInfo.updateRunning = false;
    currentUpdateInfo.updateFinishedAt = new Date().toISOString();
    emitStatus();
  }
}

export function startUpdate(): { status: string; logs: string[] } {
  if (currentUpdateInfo.updateRunning) {
    return { status: 'already_running', logs: currentUpdateInfo.updateLogs };
  }

  runUpdateInternal();

  return { status: 'started', logs: currentUpdateInfo.updateLogs };
}
