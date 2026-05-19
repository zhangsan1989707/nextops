import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const API_URL = process.env.NEXTOPS_API_URL ?? "http://localhost:4000";
const AGENT_ID = process.env.NEXTOPS_AGENT_ID ?? `local-${os.hostname().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const INTERVAL_MS = Number(process.env.NEXTOPS_AGENT_INTERVAL_MS ?? 10000);
const AGENT_ENV = process.env.NEXTOPS_AGENT_ENVIRONMENT ?? "local";
const AGENT_TAGS = process.env.NEXTOPS_AGENT_TAGS?.split(",").map(s => s.trim()).filter(Boolean) ?? ["local", "agent"];
const VERSION = "0.1.0";

type CpuSample = {
  idle: number;
  total: number;
};

type Inventory = {
  kernel: string;
  cpuModel: string;
  cpuCores: number;
  memoryTotalMb: number;
  diskTotalGb: number;
  uptimeSeconds: number;
  networkCards: string[];
  bootTime: string;
  platform: string;
  version: string;
  arch: string;
};

async function main() {
  const inventory = await collectInventory();
  await postJson("/api/agents/register", {
    agentId: AGENT_ID,
    hostname: os.hostname(),
    ip: primaryIp(),
    os: `${os.type()} ${os.release()}`,
    environment: AGENT_ENV,
    version: VERSION,
    tags: AGENT_TAGS,
    inventory
  });

  console.log(`NextOps local agent registered: ${AGENT_ID}`);
  await sendMetrics();
  setInterval(() => {
    void sendMetrics().catch((error) => {
      console.error("Failed to send metrics", error);
    });
  }, INTERVAL_MS);
}

async function sendMetrics() {
  await withRetry(async () => {
    const [cpuUsage, memoryUsage, diskUsage, inventory, topProcesses, services, recentLogs, networkConnections, diskDetails] = await Promise.all([
      sampleCpuUsage(),
      memoryUsagePercent(),
      diskUsagePercent(),
      collectInventory(),
      collectTopProcesses(),
      collectServices(),
      collectRecentLogs(),
      collectNetworkConnections(),
      collectDiskDetails()
    ]);
    const loadAvg = os.loadavg()[0] ?? 0;
    await postJson(`/api/agents/${encodeURIComponent(AGENT_ID)}/metrics`, {
      cpuUsage,
      memoryUsage,
      diskUsage,
      loadAvg,
      inventory,
      topProcesses,
      services,
      recentLogs,
      networkConnections,
      diskDetails
    });
    console.log(
      `metrics sent cpu=${cpuUsage}% memory=${memoryUsage}% disk=${diskUsage}% load=${loadAvg.toFixed(2)}`
    );
  }, 3, 2000);
}

async function memoryUsagePercent(): Promise<number> {
  if (os.platform() === "darwin") {
    try {
      return await macMemoryPressurePercent();
    } catch (error) {
      console.warn("Falling back to Node memory calculation", error);
    }
  }
  return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
}

async function macMemoryPressurePercent(): Promise<number> {
  const { stdout } = await execFileAsync("vm_stat");
  const pageSizeMatch = stdout.match(/page size of (\d+) bytes/i);
  const pageSize = Number(pageSizeMatch?.[1] ?? 4096);
  const pages = new Map<string, number>();
  for (const line of stdout.split("\n")) {
    const match = line.match(/^Pages (.+):\s+([0-9.]+)\./);
    if (match) {
      pages.set(match[1].trim().toLowerCase(), Number(match[2]));
    }
  }

  const active = pages.get("active") ?? 0;
  const wired = pages.get("wired down") ?? 0;
  const compressed = pages.get("occupied by compressor") ?? 0;
  const appLikeBytes = (active + wired + compressed) * pageSize;
  return Math.max(0, Math.min(100, Math.round((appLikeBytes / os.totalmem()) * 100)));
}

async function collectInventory(): Promise<Inventory> {
  const platformInfo = collectPlatformInfo();
  return {
    kernel: os.release(),
    cpuModel: os.cpus()[0]?.model ?? "unknown",
    cpuCores: os.cpus().length,
    memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
    diskTotalGb: await diskTotalGb(),
    uptimeSeconds: Math.round(os.uptime()),
    networkCards: Object.keys(os.networkInterfaces()),
    bootTime: new Date(Date.now() - os.uptime() * 1000).toISOString(),
    platform: platformInfo.platform,
    version: platformInfo.version,
    arch: platformInfo.arch
  };
}

function collectPlatformInfo(): { platform: string; version: string; arch: string } {
  return {
    platform: os.platform(),
    version: os.release(),
    arch: os.arch()
  };
}

async function sampleCpuUsage(): Promise<number> {
  const start = cpuSample();
  await wait(350);
  const end = cpuSample();
  const idle = end.idle - start.idle;
  const total = end.total - start.total;
  if (total <= 0) {
    return 0;
  }
  return Math.round((1 - idle / total) * 100);
}

function cpuSample(): CpuSample {
  return os.cpus().reduce(
    (acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      return {
        idle: acc.idle + cpu.times.idle,
        total: acc.total + total
      };
    },
    { idle: 0, total: 0 }
  );
}

async function diskUsagePercent(): Promise<number> {
  const { stdout } = await execFileAsync("df", ["-k", "/"]);
  const line = stdout.trim().split("\n")[1];
  const parts = line?.split(/\s+/) ?? [];
  const used = Number(parts[2] ?? 0);
  const available = Number(parts[3] ?? 0);
  const total = used + available;
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

async function diskTotalGb(): Promise<number> {
  const { stdout } = await execFileAsync("df", ["-k", "/"]);
  const line = stdout.trim().split("\n")[1];
  const totalKb = Number(line?.split(/\s+/)[1] ?? 0);
  return Math.round(totalKb / 1024 / 1024);
}

async function collectTopProcesses(): Promise<Array<{ pid: string; user: string; cpu: string; mem: string; command: string }>> {
  try {
    const { stdout } = await execFileAsync("ps", ["aux", "--sort=-%mem"]);
    const lines = stdout.trim().split("\n").slice(1, 21);
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0] ?? "",
        pid: parts[1] ?? "",
        cpu: parts[2] ?? "",
        mem: parts[3] ?? "",
        command: parts.slice(10).join(" ")
      };
    });
  } catch {
    return [];
  }
}

async function collectServices(): Promise<Array<{ name: string; active: string; sub: string; description: string }>> {
  const platform = os.platform();

  if (platform === "darwin") {
    return collectMacServices();
  } else if (platform === "win32") {
    return collectWindowsServices();
  } else {
    return collectLinuxServices();
  }
}

async function collectMacServices(): Promise<Array<{ name: string; active: string; sub: string; description: string }>> {
  try {
    const { stdout } = await execFileAsync("launchctl", ["list"]);
    const lines = stdout.trim().split("\n").slice(1, 21);
    return lines.map((line) => {
      const parts = line.split("\t");
      return {
        name: parts[2] || "",
        active: parts[3] === "0" ? "running" : "stopped",
        sub: "-",
        description: parts[1] || ""
      };
    }).filter(s => s.name);
  } catch {
    return [];
  }
}

async function collectWindowsServices(): Promise<Array<{ name: string; active: string; sub: string; description: string }>> {
  try {
    const { stdout } = await execFileAsync("sc", ["query", "state=", "all"]);
    const services: Array<{ name: string; active: string; sub: string; description: string }> = [];
    const entries = stdout.split("SERVICE_NAME:");
    for (const entry of entries.slice(1)) {
      const lines = entry.trim().split("\n");
      const name = lines[0].trim();
      const stateMatch = entry.match(/STATE\s+:\s+(\d+)\s+(\w+)/);
      services.push({
        name,
        active: stateMatch?.[2]?.toLowerCase() || "unknown",
        sub: stateMatch?.[1] || "-",
        description: ""
      });
    }
    return services.slice(0, 20);
  } catch {
    return [];
  }
}

async function collectLinuxServices(): Promise<Array<{ name: string; active: string; sub: string; description: string }>> {
  try {
    const { stdout } = await execFileAsync("systemctl", ["list-units", "--type=service", "--no-pager", "--plain", "--no-legend"]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        name: parts[0] || "",
        active: parts[2] || "",
        sub: parts[3] || "",
        description: parts.slice(4).join(" ")
      };
    }).slice(0, 20);
  } catch {
    return [];
  }
}

async function collectRecentLogs(): Promise<string> {
  const platform = os.platform();

  try {
    if (platform === "darwin") {
      const { stdout } = await execFileAsync("log", ["show", "--predicate", "eventMessage contains 'error'", "--last", "1h", "--limit", "50"]);
      return stdout.trim() || "无最近错误日志";
    } else if (platform === "win32") {
      const { stdout } = await execFileAsync("powershell", ["-Command", "Get-WinEvent -FilterHashtable @{LogName='Application';Level=2;StartTime=(Get-Date).AddHours(-1)} -MaxEvents 50 | Format-List"]);
      return stdout.trim() || "无最近错误日志";
    } else {
      const { stdout } = await execFileAsync("journalctl", ["-p", "err", "--since", "1 hour ago", "--no-pager", "-n", "50", "-o", "short-iso"]);
      return stdout.trim() || "无最近错误日志";
    }
  } catch {
    return "日志收集失败";
  }
}

async function collectNetworkConnections(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("ss", ["-tunap"]);
    const lines = stdout.trim().split("\n").slice(0, 31);
    return lines.join("\n");
  } catch {
    return "";
  }
}

async function collectDiskDetails(): Promise<Array<{ mount: string; size: string; used: string; avail: string; percent: string }>> {
  try {
    const { stdout } = await execFileAsync("df", ["-h", "--output=target,size,used,avail,pcent"]);
    const lines = stdout.trim().split("\n").slice(1);
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        mount: parts[0] ?? "",
        size: parts[1] ?? "",
        used: parts[2] ?? "",
        avail: parts[3] ?? "",
        percent: parts[4] ?? ""
      };
    });
  } catch {
    return [];
  }
}

function primaryIp(): string {
  for (const records of Object.values(os.networkInterfaces())) {
    for (const record of records ?? []) {
      if (record.family === "IPv4" && !record.internal) {
        return record.address;
      }
    }
  }
  return "127.0.0.1";
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${path} failed: HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const waitTime = delay * Math.pow(2, i);
        console.log(`Attempt ${i + 1} failed, retrying in ${waitTime}ms...`);
        await wait(waitTime);
      }
    }
  }

  throw lastError || new Error("All retries failed");
}

let isShuttingDown = false;

process.on("SIGINT", async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
