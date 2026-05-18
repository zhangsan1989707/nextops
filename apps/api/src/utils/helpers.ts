import type express from "express";

export function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildAlertRules(cpu: number, memory: number, disk: number) {
  const rules = [
    { id: "rule-cpu-80", name: "CPU 使用率高于 80%", metric: "cpu_usage", threshold: 80, enabled: true },
    { id: "rule-cpu-90", name: "CPU 使用率高于 90%", metric: "cpu_usage", threshold: 90, enabled: true },
    { id: "rule-mem-80", name: "内存使用率高于 80%", metric: "memory_usage", threshold: 80, enabled: true },
    { id: "rule-mem-90", name: "内存使用率高于 90%", metric: "memory_usage", threshold: 90, enabled: true },
    { id: "rule-disk-85", name: "磁盘使用率高于 85%", metric: "disk_usage", threshold: 85, enabled: true },
    { id: "rule-disk-95", name: "磁盘使用率高于 95%", metric: "disk_usage", threshold: 95, enabled: true }
  ];
  return rules.map((rule) => {
    let current = 0;
    if (rule.metric === "cpu_usage") current = cpu;
    else if (rule.metric === "memory_usage") current = memory;
    else if (rule.metric === "disk_usage") current = disk;
    return { ...rule, current, triggered: current >= rule.threshold };
  });
}

export function scriptDescription(id: string): string {
  const descriptions: Record<string, string> = {
    "scr-001": "采集 Linux 主机 CPU、内存、磁盘、负载、端口和基础服务状态，适合低风险巡检。",
    "scr-002": "对 Nginx 配置执行语法检查，通过后 reload 服务。生产环境需要审批。",
    "scr-003": "查询 PostgreSQL 当前连接数、活跃会话和等待事件，用于数据库连接数异常诊断。"
  };
  return descriptions[id] ?? "团队可复用自动化脚本。";
}

export function scriptParameters(
  id: string
): Array<{ name: string; required: boolean; defaultValue: string }> {
  const parameters: Record<string, Array<{ name: string; required: boolean; defaultValue: string }>> = {
    "scr-001": [
      { name: "items", required: false, defaultValue: "cpu,memory,disk,load" },
      { name: "timeout", required: false, defaultValue: "30s" }
    ],
    "scr-002": [
      { name: "service", required: true, defaultValue: "nginx" },
      { name: "validate_config", required: false, defaultValue: "true" }
    ],
    "scr-003": [
      { name: "database", required: true, defaultValue: "postgres" },
      { name: "min_duration", required: false, defaultValue: "30s" }
    ]
  };
  return parameters[id] ?? [];
}

export function scriptContent(id: string): string {
  const contents: Record<string, string> = {
    "scr-001": "#!/usr/bin/env bash\nset -euo pipefail\nuptime\ndf -h\nfree -m\nps aux --sort=-%cpu | head -10",
    "scr-002": "#!/usr/bin/env bash\nset -euo pipefail\nnginx -t\nsystemctl reload nginx\nsystemctl status nginx --no-pager",
    "scr-003":
      "select state, count(*) from pg_stat_activity group by state;\nselect pid, wait_event, query from pg_stat_activity where state = 'active' limit 10;"
  };
  return contents[id] ?? "";
}

export function writeStreamEvent(res: express.Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function chunkText(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>
): express.RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
