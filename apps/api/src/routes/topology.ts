import { Router } from "express";
import { getServers } from "../db.js";
import type { ServerRecord } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

type BusinessSystem = {
  id: string;
  name: string;
  description: string;
  services: ServiceNode[];
};

type ServiceNode = {
  id: string;
  name: string;
  type: string;
  hostname: string;
  ip: string;
  port: number;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  dependsOn: string[];
  children: ChildNode[];
};

type ChildNode = {
  type: "database" | "middleware" | "dependency";
  name: string;
  hostname: string;
  port: number;
  status: string;
  details: Record<string, string>;
};

function inferTopology(server: ServerRecord): ServiceNode[] {
  const services: ServiceNode[] = [];
  const tags = server.tags.map((t) => t.toLowerCase());
  const hostname = server.hostname.toLowerCase();
  const env = server.environment ?? "production";

  if (tags.includes("nginx") || hostname.includes("nginx")) {
    services.push({
      id: `svc-${server.id}-nginx`,
      name: `${server.hostname}-nginx`,
      type: "反向代理",
      hostname: server.hostname,
      ip: server.ip,
      port: 80,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: [
        { type: "dependency", name: "upstream-services", hostname: server.hostname, port: 0, status: server.status, details: { note: "负载均衡后端服务" } }
      ]
    });
  }

  if (tags.includes("web") || hostname.includes("web")) {
    services.push({
      id: `svc-${server.id}-web`,
      name: `${server.hostname}-web`,
      type: "前端服务",
      hostname: server.hostname,
      ip: server.ip,
      port: 80,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: [
        { type: "dependency", name: "api-gateway", hostname: server.hostname, port: 8080, status: server.status, details: { note: "API 网关依赖" } }
      ]
    });
  }

  if (tags.includes("api") || hostname.includes("api")) {
    services.push({
      id: `svc-${server.id}-api`,
      name: `${server.hostname}-api`,
      type: "API 服务",
      hostname: server.hostname,
      ip: server.ip,
      port: 8080,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: [
        { type: "database", name: "PostgreSQL", hostname: server.hostname, port: 5432, status: server.status, details: { version: "15", pool: "100" } },
        { type: "middleware", name: "Redis", hostname: server.hostname, port: 6379, status: server.status, details: { version: "7", memory: "2GB" } },
        { type: "dependency", name: "external-api", hostname: "", port: 0, status: "unknown", details: { note: "外部 API 调用" } }
      ]
    });
  }

  if (tags.includes("db") || tags.includes("database") || tags.includes("postgres") || hostname.includes("db") || hostname.includes("postgres")) {
    services.push({
      id: `svc-${server.id}-db`,
      name: `${server.hostname}-db`,
      type: "数据库",
      hostname: server.hostname,
      ip: server.ip,
      port: 5432,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: [
        { type: "middleware", name: "Redis Cache", hostname: server.hostname, port: 6379, status: server.status, details: { version: "7", role: "cache" } }
      ]
    });
  }

  if (tags.includes("redis") || hostname.includes("redis") || tags.includes("cache")) {
    services.push({
      id: `svc-${server.id}-redis`,
      name: `${server.hostname}-redis`,
      type: "缓存中间件",
      hostname: server.hostname,
      ip: server.ip,
      port: 6379,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: []
    });
  }

  if (tags.includes("k8s") || tags.includes("kubernetes") || hostname.includes("k8s") || hostname.includes("kube")) {
    services.push({
      id: `svc-${server.id}-k8s`,
      name: `${server.hostname}-k8s`,
      type: "Kubernetes 节点",
      hostname: server.hostname,
      ip: server.ip,
      port: 6443,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: [
        { type: "database", name: "etcd", hostname: server.hostname, port: 2379, status: server.status, details: { role: "key-value store" } },
        { type: "dependency", name: "container-runtime", hostname: server.hostname, port: 0, status: server.status, details: { runtime: "containerd" } }
      ]
    });
  }

  if (services.length === 0) {
    const svcType = env === "production" ? "生产服务" : env === "staging" ? "预发服务" : "测试服务";
    services.push({
      id: `svc-${server.id}-default`,
      name: server.hostname,
      type: svcType,
      hostname: server.hostname,
      ip: server.ip,
      port: server.port,
      status: server.status,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      dependsOn: [],
      children: []
    });
  }

  return services;
}

router.get("/topology", asyncHandler(async (_req, res) => {
  const servers: ServerRecord[] = await getServers();

  const businessSystems: BusinessSystem[] = [];
  const systems: Record<string, ServiceNode[]> = {};

  for (const server of servers) {
    const env = server.environment ?? "production";
    const systemName = `${env === "production" ? "生产" : env === "staging" ? "预发" : "测试"}环境`;

    if (!systems[env]) {
      systems[env] = [];
    }
    systems[env].push(...inferTopology(server));
  }

  for (const [env, services] of Object.entries(systems)) {
    const envLabel = env === "production" ? "生产" : env === "staging" ? "预发" : "测试";
    businessSystems.push({
      id: `bs-${env}`,
      name: `${envLabel}环境`,
      description: `${envLabel}环境业务系统，共 ${services.length} 个服务`,
      services
    });
  }

  const nodes: Array<{
    id: string;
    label: string;
    type: string;
    hostname: string;
    ip: string;
    status: string;
    cpuUsage: number;
    memoryUsage: number;
    port: number;
    group: string;
  }> = [];

  const edges: Array<{
    source: string;
    target: string;
    label: string;
  }> = [];

  for (const system of businessSystems) {
    for (const svc of system.services) {
      nodes.push({
        id: svc.id,
        label: svc.name,
        type: svc.type,
        hostname: svc.hostname,
        ip: svc.ip,
        status: svc.status,
        cpuUsage: svc.cpuUsage,
        memoryUsage: svc.memoryUsage,
        port: svc.port,
        group: system.name
      });

      for (const child of svc.children) {
        const childId = `${svc.id}-${child.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        nodes.push({
          id: childId,
          label: child.name,
          type: child.type,
          hostname: child.hostname || svc.hostname,
          ip: svc.ip,
          status: child.status,
          cpuUsage: 0,
          memoryUsage: 0,
          port: child.port,
          group: system.name
        });
        edges.push({
          source: svc.id,
          target: childId,
          label: child.type === "database" ? "数据库依赖" : child.type === "middleware" ? "中间件依赖" : "服务依赖"
        });
      }

      for (const dep of svc.dependsOn) {
        edges.push({
          source: svc.id,
          target: dep,
          label: "业务依赖"
        });
      }
    }
  }

  const stats = {
    totalServers: servers.length,
    totalServices: nodes.length,
    totalEdges: edges.length,
    environments: Object.keys(systems).length,
    healthScore: servers.length > 0
      ? Math.round((servers.filter((s) => s.status === "healthy").length / servers.length) * 100)
      : 100
  };

  res.json({
    businessSystems,
    nodes,
    edges,
    stats
  });
}));

export default router;