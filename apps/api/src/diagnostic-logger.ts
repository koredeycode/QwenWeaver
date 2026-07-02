import * as fs from 'node:fs';
import * as path from 'node:path';

const LOG_DIR = process.env.COPILOT_LOG_DIR || './logs/copilot';

export interface CopilotDiag {
  log(msg: string): void;
  logJson(label: string, data: unknown): void;
  close(): void;
  flushed: () => Promise<void>;
}

export function createDiagnosticLogger(sessionId: string): CopilotDiag {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(LOG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `copilot-${sessionId}-${ts}.log`);
  const fd = fs.openSync(filePath, 'w');

  const write = (s: string) => fs.writeSync(fd, s);
  const stamp = () => new Date().toISOString();

  write(`╔══════════════════════════════════════════════════════════╗\n`);
  write(`║            QwenWeaver Copilot Diagnostic Log            ║\n`);
  write(`╚══════════════════════════════════════════════════════════╝\n`);
  write(`Session ID : ${sessionId}\n`);
  write(`Started at : ${stamp()}\n`);
  write(`Log file   : ${filePath}\n`);
  write(`────────────────────────────────────────────────────────────\n\n`);

  return {
    log(msg: string) {
      write(`[${stamp()}] ${msg}\n`);
    },
    logJson(label: string, data: unknown) {
      write(`[${stamp()}] ${'─'.repeat(4)} ${label} ${'─'.repeat(4)}\n`);
      try {
        write(JSON.stringify(data, null, 2) + '\n\n');
      } catch {
        write(String(data) + '\n\n');
      }
    },
    close() {
      write(`\n────────────────────────────────────────────────────────────\n`);
      write(`[${stamp()}] Session ended\n`);
      fs.closeSync(fd);
    },
    flushed: async () => {
      // fs.writeSync is synchronous, so it's already flushed
    },
  };
}
