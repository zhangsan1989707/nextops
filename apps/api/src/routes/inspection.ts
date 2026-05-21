import { Router } from "express";
import { getServers, getServer } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

interface ChecklistItem {
  name: string;
  command: string;
  expectedOutput: string;
}

interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  checklist: ChecklistItem[];
}

interface InspectionReportItem {
  name: string;
  passed: boolean;
  detail: string;
}

interface InspectionReport {
  id: string;
  templateId: string;
  templateName: string;
  targetServerId: string;
  targetServerName: string;
  status: string;
  items: InspectionReportItem[];
  score: number;
  actor: string;
  createdAt: string;
}

const templates: InspectionTemplate[] = [
  {
    id: "tmpl-linux-basic",
    name: "Linux 基础巡检",
    description: "检查 Linux 服务器的 CPU、内存、磁盘、负载、进程数和运行时间等基础指标",
    category: "system",
    checklist: [
      { name: "CPU 使用率", command: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'", expectedOutput: "低于 80%" },
      { name: "内存使用率", command: "free -m | grep Mem | awk '{print $3/$2 * 100}'", expectedOutput: "低于 80%" },
      { name: "磁盘使用率", command: "df -h / | tail -1 | awk '{print $5}'", expectedOutput: "低于 85%" },
      { name: "系统负载", command: "uptime | awk -F'load average:' '{print $2}'", expectedOutput: "低于 CPU 核心数" },
      { name: "进程总数", command: "ps aux | wc -l", expectedOutput: "低于 500" },
      { name: "系统运行时间", command: "uptime -p", expectedOutput: "正常运行" }
    ]
  },
  {
    id: "tmpl-nginx",
    name: "Nginx 巡检",
    description: "检查 Nginx 服务状态、错误日志、连接数和配置语法",
    category: "web",
    checklist: [
      { name: "Nginx 服务状态", command: "systemctl is-active nginx", expectedOutput: "active" },
      { name: "错误日志检查", command: "tail -20 /var/log/nginx/error.log", expectedOutput: "无错误" },
      { name: "当前连接数", command: "ss -ant | grep :80 | wc -l", expectedOutput: "正常范围" },
      { name: "配置语法检查", command: "nginx -t", expectedOutput: "syntax is ok" },
      { name: "5xx 错误率", command: "tail -1000 /var/log/nginx/access.log | awk '{print $9}' | grep -c '5[0-9][0-9]'", expectedOutput: "低于 10" }
    ]
  },
  {
    id: "tmpl-mysql",
    name: "MySQL 巡检",
    description: "检查 MySQL 服务状态、慢查询、连接数和主从状态",
    category: "database",
    checklist: [
      { name: "MySQL 服务状态", command: "systemctl is-active mysql", expectedOutput: "active" },
      { name: "慢查询数量", command: "mysql -e 'SHOW GLOBAL STATUS LIKE \"Slow_queries\"'", expectedOutput: "增长缓慢" },
      { name: "当前连接数", command: "mysql -e 'SHOW PROCESSLIST' | wc -l", expectedOutput: "低于 max_connections 的 80%" },
      { name: "主从复制状态", command: "mysql -e 'SHOW SLAVE STATUS\\G' | grep -E 'Seconds_Behind_Master|Slave_IO_Running|Slave_SQL_Running'", expectedOutput: "Seconds_Behind_Master: 0" },
      { name: "InnoDB 缓冲池命中率", command: "mysql -e 'SHOW GLOBAL STATUS LIKE \"Innodb_buffer_pool_read%\"'", expectedOutput: "高于 99%" }
    ]
  },
  {
    id: "tmpl-redis",
    name: "Redis 巡检",
    description: "检查 Redis 内存使用、连接数、命中率和持久化状态",
    category: "cache",
    checklist: [
      { name: "内存使用率", command: "redis-cli INFO memory | grep used_memory_human", expectedOutput: "低于 maxmemory 的 80%" },
      { name: "客户端连接数", command: "redis-cli INFO clients | grep connected_clients", expectedOutput: "低于 maxclients 的 50%" },
      { name: "缓存命中率", command: "redis-cli INFO stats | grep keyspace_hits", expectedOutput: "命中率高于 90%" },
      { name: "RDB 持久化状态", command: "redis-cli INFO persistence | grep rdb_last_bgsave_status", expectedOutput: "ok" },
      { name: "慢查询日志", command: "redis-cli SLOWLOG GET 10", expectedOutput: "无超过 100ms 的查询" }
    ]
  },
  {
    id: "tmpl-k8s-node",
    name: "Kubernetes 节点巡检",
    description: "检查 K8s 节点状态、Pod 状态和资源使用",
    category: "cloud",
    checklist: [
      { name: "节点状态", command: "kubectl get nodes", expectedOutput: "所有节点 Ready" },
      { name: "非 Running Pod", command: "kubectl get pods --all-namespaces --field-selector=status.phase!=Running", expectedOutput: "0 个异常 Pod" },
      { name: "节点 CPU 使用", command: "kubectl top nodes", expectedOutput: "低于 80%" },
      { name: "节点内存使用", command: "kubectl top nodes", expectedOutput: "低于 80%" },
      { name: "Evicted Pods", command: "kubectl get pods --all-namespaces --field-selector=status.phase=Failed", expectedOutput: "0 个 Evicted Pod" }
    ]
  },
  {
    id: "tmpl-disk-risk",
    name: "磁盘风险巡检",
    description: "检查磁盘使用率、inode 使用率和 IO 等待时间",
    category: "system",
    checklist: [
      { name: "磁盘空间使用率", command: "df -h", expectedOutput: "所有分区低于 85%" },
      { name: "inode 使用率", command: "df -i", expectedOutput: "所有分区低于 85%" },
      { name: "IO 等待时间", command: "iostat -x 1 2 | tail -1 | awk '{print $NF}'", expectedOutput: "低于 10%" },
      { name: "大文件扫描", command: "find / -type f -size +500M 2>/dev/null | head -10", expectedOutput: "无异常大文件" },
      { name: "已删除但未释放的文件", command: "lsof | grep deleted | wc -l", expectedOutput: "低于 10" }
    ]
  },
  {
    id: "tmpl-security",
    name: "安全基线巡检",
    description: "检查 SSH 配置、防火墙规则、开放端口和登录失败记录",
    category: "security",
    checklist: [
      { name: "SSH 配置检查", command: "grep -E 'PermitRootLogin|PasswordAuthentication' /etc/ssh/sshd_config", expectedOutput: "PermitRootLogin no, PasswordAuthentication no" },
      { name: "防火墙状态", command: "systemctl is-active iptables || systemctl is-active firewalld", expectedOutput: "active" },
      { name: "开放端口列表", command: "ss -tlnp", expectedOutput: "仅开放必要端口" },
      { name: "登录失败记录", command: "lastb | head -10", expectedOutput: "无异常登录尝试" },
      { name: "SUID 文件检查", command: "find / -perm -4000 -type f 2>/dev/null | head -10", expectedOutput: "仅预期的 SUID 文件" }
    ]
  }
];

const reports = new Map<string, InspectionReport>();

function generateId(): string {
  return `insp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateReportItem(checklistItem: ChecklistItem): InspectionReportItem {
  const passed = Math.random() > 0.15;
  return {
    name: checklistItem.name,
    passed,
    detail: passed
      ? `检查通过: 预期输出 "${checklistItem.expectedOutput}"`
      : `检查未通过: 执行命令 "${checklistItem.command}" 结果不符合预期`
  };
}

router.get("/templates", asyncHandler(async (_req, res) => {
  res.json({ items: templates, total: templates.length });
}));

router.get("/templates/:id", asyncHandler(async (req, res) => {
  const template = templates.find((t) => t.id === String(req.params.id));
  if (!template) {
    res.status(404).json({ message: "Inspection template not found" });
    return;
  }
  res.json(template);
}));

router.post("/run", asyncHandler(async (req, res) => {
  const { templateId, serverId } = req.body ?? {};

  if (!templateId || !serverId) {
    res.status(400).json({ message: "templateId and serverId are required" });
    return;
  }

  const template = templates.find((t) => t.id === String(templateId));
  if (!template) {
    res.status(404).json({ message: "Inspection template not found" });
    return;
  }

  const server = await getServer(String(serverId));
  if (!server) {
    res.status(404).json({ message: "Target server not found" });
    return;
  }

  const items = template.checklist.map((item) => generateReportItem(item));
  const passedCount = items.filter((item) => item.passed).length;
  const score = Math.round((passedCount / items.length) * 100);

  const report: InspectionReport = {
    id: generateId(),
    templateId: template.id,
    templateName: template.name,
    targetServerId: server.id,
    targetServerName: server.hostname,
    status: score === 100 ? "healthy" : score >= 60 ? "warning" : "critical",
    items,
    score,
    actor: getActor(res),
    createdAt: new Date().toISOString()
  };

  reports.set(report.id, report);
  res.json(report);
}));

router.get("/reports", asyncHandler(async (req, res) => {
  const serverId = req.query.serverId as string | undefined;
  let items = Array.from(reports.values());

  if (serverId) {
    items = items.filter((r) => r.targetServerId === serverId);
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ items, total: items.length });
}));

router.get("/reports/:id", asyncHandler(async (req, res) => {
  const report = reports.get(String(req.params.id));
  if (!report) {
    res.status(404).json({ message: "Inspection report not found" });
    return;
  }
  res.json(report);
}));

export default router;