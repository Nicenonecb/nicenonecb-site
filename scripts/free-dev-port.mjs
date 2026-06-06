import { execFile } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.argv[2] ?? 5888);

async function findListeningPids() {
  try {
    const { stdout } = await execFileAsync("lsof", [
      "-nP",
      `-iTCP:${port}`,
      "-sTCP:LISTEN",
      "-t",
    ]);

    return stdout
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) {
      return [];
    }

    throw error;
  }
}

async function waitUntilFree() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pids = await findListeningPids();

    if (pids.length === 0) {
      return true;
    }

    await wait(150);
  }

  return false;
}

const pids = await findListeningPids();

if (pids.length > 0) {
  console.log(`[dev] Port ${port} is busy; killing listener PID(s): ${pids.join(", ")}`);

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
        continue;
      }

      throw error;
    }
  }

  // 先给旧 dev server 温和退出的机会，端口仍未释放时再升级为强制结束。
  const released = await waitUntilFree();

  if (!released) {
    const remaining = await findListeningPids();

    console.log(`[dev] Port ${port} is still busy; force killing PID(s): ${remaining.join(", ")}`);

    for (const pid of remaining) {
      process.kill(pid, "SIGKILL");
    }

    await waitUntilFree();
  }
}
