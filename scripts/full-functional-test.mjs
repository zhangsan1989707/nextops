const results = [];

const BASE_URL = "http://47.109.85.168:3019";
const API_BASE = `${BASE_URL}/api`;

let authToken = "";
let testServerIds = [];

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    throw new Error(`网络请求失败: ${error}`);
  }
}

async function runTest(module, test, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ module, test, status: "PASS", duration: Date.now() - start });
    console.log(`✅ ${module} > ${test}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ module, test, status: "FAIL", message, duration: Date.now() - start });
    console.log(`❌ ${module} > ${test}: ${message}`);
  }
}

async function cleanupTestData() {
  console.log("\n🧹 清理测试数据...");
  
  for (const serverId of testServerIds) {
    try {
      await apiRequest(`/servers/${serverId}`, { method: "DELETE" });
      console.log(`   删除服务器: ${serverId}`);
    } catch (e) {
      console.log(`   删除服务器失败: ${serverId}`);
    }
  }
  
  console.log("✅ 测试数据清理完成");
}

async function runTests() {
  console.log("🚀 开始 NextOps 全量功能测试\n");
  console.log(`📍 测试地址: ${BASE_URL}\n`);
  
  console.log("=".repeat(60));
  console.log("1️⃣  认证模块测试");
  console.log("=".repeat(60));
  
  await runTest("认证", "登录API - 正确凭证", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "leo@example.com",
        password: "admin123"
      })
    });
    
    if (res.status === 200 && res.data.token) {
      authToken = res.data.token;
      console.log(`   获取Token: ${authToken.substring(0, 20)}...`);
    } else {
      throw new Error(`登录失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("认证", "登录API - 错误凭证", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "wrong@example.com",
        password: "wrongpass"
      })
    });
    
    if (res.status !== 401) {
      throw new Error(`期望401，实际: ${res.status}`);
    }
  });
  
  await runTest("认证", "获取当前用户信息", async () => {
    const res = await apiRequest("/auth/me");
    
    if (res.status === 200 && res.data.email) {
      console.log(`   用户: ${res.data.name} (${res.data.role})`);
    } else {
      throw new Error(`获取用户信息失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("2️⃣  仪表盘模块测试");
  console.log("=".repeat(60));
  
  await runTest("仪表盘", "获取摘要数据", async () => {
    const res = await apiRequest("/dashboard/summary");
    
    if (res.status === 200 && res.data.servers) {
      console.log(`   服务器总数: ${res.data.servers.total}`);
      console.log(`   告警总数: ${res.data.alerts.total}`);
      console.log(`   脚本数量: ${res.data.automation?.scripts || 0}`);
    } else {
      throw new Error(`获取仪表盘数据失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("3️⃣  服务器管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("服务器", "获取服务器列表", async () => {
    const res = await apiRequest("/servers");
    
    if (res.status === 200 && Array.isArray(res.data.items)) {
      console.log(`   服务器列表: ${res.data.items.length} 台`);
    } else {
      throw new Error(`获取服务器列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("服务器", "创建服务器", async () => {
    const timestamp = Date.now();
    const hostname = `test-server-${timestamp}`;
    
    const res = await apiRequest("/servers", {
      method: "POST",
      body: JSON.stringify({
        ip: "192.168.1." + (timestamp % 256),
        hostname: hostname,
        environment: "staging",
        port: 22,
        os: "Ubuntu 22.04",
        tags: ["test", "auto"]
      })
    });
    
    if (res.status === 201 && res.data.id) {
      testServerIds.push(res.data.id);
      console.log(`   创建服务器: ${res.data.hostname} (ID: ${res.data.id})`);
    } else {
      throw new Error(`创建服务器失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("服务器", "更新服务器", async () => {
    if (testServerIds.length === 0) {
      throw new Error("没有可更新的服务器");
    }
    
    const res = await apiRequest(`/servers/${testServerIds[0]}`, {
      method: "PUT",
      body: JSON.stringify({
        hostname: `test-server-updated-${Date.now()}`,
        tags: ["test", "updated"]
      })
    });
    
    if (res.status !== 200) {
      throw new Error(`更新服务器失败: ${JSON.stringify(res.data)}`);
    }
    console.log(`   更新服务器成功`);
  });
  
  await runTest("服务器", "获取服务器详情", async () => {
    if (testServerIds.length === 0) {
      throw new Error("没有可查询的服务器");
    }
    
    const res = await apiRequest(`/servers/${testServerIds[0]}`);
    
    if (res.status === 200 && res.data.hostname) {
      console.log(`   服务器详情: ${res.data.hostname}`);
    } else {
      throw new Error(`获取服务器详情失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("4️⃣  告警管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("告警", "获取告警列表", async () => {
    const res = await apiRequest("/alerts");
    
    if (res.status === 200 && Array.isArray(res.data.items)) {
      console.log(`   告警列表: ${res.data.items.length} 条`);
    } else {
      throw new Error(`获取告警列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("5️⃣  脚本管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("脚本", "获取脚本列表", async () => {
    const res = await apiRequest("/scripts");
    
    if (res.status === 200 && Array.isArray(res.data.items)) {
      console.log(`   脚本列表: ${res.data.items.length} 个`);
      for (const script of res.data.items) {
        console.log(`     - ${script.name} (${script.riskLevel})`);
      }
    } else {
      throw new Error(`获取脚本列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("脚本", "获取脚本详情", async () => {
    const res = await apiRequest("/scripts/scr-001");
    
    if (res.status === 200 && res.data.name) {
      console.log(`   脚本详情: ${res.data.name}`);
    } else {
      throw new Error(`获取脚本详情失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("脚本", "执行脚本(低风险)", async () => {
    const res = await apiRequest("/scripts/scr-001/run", {
      method: "POST",
      body: JSON.stringify({
        targetId: testServerIds[0] || "srv-prod-web-01"
      })
    });
    
    if (res.status === 200 && res.data.taskId) {
      console.log(`   任务ID: ${res.data.taskId}`);
      console.log(`   任务状态: ${res.data.status}`);
    } else {
      throw new Error(`执行脚本失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("6️⃣  ChatOps模块测试");
  console.log("=".repeat(60));
  
  await runTest("ChatOps", "发送消息 - 巡检命令", async () => {
    const res = await apiRequest("/chatops/message", {
      method: "POST",
      body: JSON.stringify({
        message: "帮我巡检所有服务器",
        useModel: false
      })
    });
    
    if (res.status === 200 && res.data.intent) {
      console.log(`   意图识别: ${res.data.intent}`);
      console.log(`   风险等级: ${res.data.riskLevel}`);
      console.log(`   任务ID: ${res.data.taskId}`);
    } else {
      throw new Error(`ChatOps消息失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("ChatOps", "发送消息 - SSH连接", async () => {
    const res = await apiRequest("/chatops/message", {
      method: "POST",
      body: JSON.stringify({
        message: "/ssh 192.168.1.100",
        useModel: false
      })
    });
    
    if (res.status === 200 && res.data.intent) {
      console.log(`   意图识别: ${res.data.intent}`);
    } else {
      throw new Error(`ChatOps SSH消息失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("ChatOps", "发送消息 - AI诊断", async () => {
    const res = await apiRequest("/chatops/message", {
      method: "POST",
      body: JSON.stringify({
        message: "帮我诊断服务器问题",
        useModel: false
      })
    });
    
    if (res.status === 200 && res.data.intent) {
      console.log(`   意图识别: ${res.data.intent}`);
    } else {
      throw new Error(`ChatOps诊断消息失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("ChatOps", "发送消息 - 部署计划", async () => {
    const res = await apiRequest("/chatops/message", {
      method: "POST",
      body: JSON.stringify({
        message: "帮我部署应用到生产环境",
        useModel: false
      })
    });
    
    if (res.status === 200 && res.data.intent) {
      console.log(`   意图识别: ${res.data.intent}`);
      console.log(`   需要审批: ${res.data.requiresApproval}`);
    } else {
      throw new Error(`ChatOps部署消息失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("ChatOps", "流式响应", async () => {
    const res = await fetch(`${API_BASE}/chatops/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
        message: "检查服务器状态",
        useModel: false
      })
    });
    
    if (res.status === 200) {
      console.log(`   流式响应启动成功`);
    } else {
      throw new Error(`流式响应失败: ${res.status}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("7️⃣  AI模型管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("模型", "获取模型列表", async () => {
    const res = await apiRequest("/models");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   模型列表: ${res.data.items.length} 个`);
      for (const model of res.data.items || []) {
        console.log(`     - ${model.name} (${model.status})`);
      }
    } else {
      throw new Error(`获取模型列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("模型", "创建模型", async () => {
    const timestamp = Date.now();
    const res = await apiRequest("/models", {
      method: "POST",
      body: JSON.stringify({
        id: `test-model-${timestamp}`,
        name: `测试模型-${timestamp}`,
        provider: "Test Provider",
        type: "chat",
        endpoint: "https://test.example.com/v1",
        contextWindow: "32k",
        capabilities: ["测试", "ChatOps"]
      })
    });
    
    if (res.status === 201) {
      console.log(`   创建模型: ${res.data.name}`);
      
      await apiRequest(`/models/${res.data.id}`, { method: "DELETE" });
      console.log(`   清理测试模型: ${res.data.id}`);
    } else {
      throw new Error(`创建模型失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("模型", "设置默认模型", async () => {
    const res = await apiRequest("/models/deepseek-v4-flash/default", {
      method: "POST"
    });
    
    if (res.status === 200 && res.data.isDefault) {
      console.log(`   设置默认模型成功`);
    } else {
      throw new Error(`设置默认模型失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("模型", "切换模型状态", async () => {
    const res = await apiRequest("/models/deepseek-v4-flash/toggle", {
      method: "POST"
    });
    
    if (res.status === 200) {
      console.log(`   切换模型状态成功`);
    } else {
      throw new Error(`切换模型状态失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("8️⃣  成员管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("成员", "获取成员列表", async () => {
    const res = await apiRequest("/members");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   成员列表: ${res.data.items.length} 人`);
      console.log(`   统计: ${JSON.stringify(res.data.totals)}`);
    } else {
      throw new Error(`获取成员列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("成员", "切换成员状态", async () => {
    const res = await apiRequest("/members/mem-002/toggle", {
      method: "POST"
    });
    
    if (res.status === 200) {
      console.log(`   切换成员状态成功`);
    } else {
      throw new Error(`切换成员状态失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("成员", "更新成员角色", async () => {
    const res = await apiRequest("/members/mem-002/role", {
      method: "POST",
      body: JSON.stringify({
        role: "SRE"
      })
    });
    
    if (res.status === 200) {
      console.log(`   更新成员角色成功`);
    } else {
      throw new Error(`更新成员角色失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("9️⃣  团队管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("团队", "获取团队摘要", async () => {
    const res = await apiRequest("/teams/summary");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   团队列表: ${res.data.items.length} 个`);
      console.log(`   统计: ${JSON.stringify(res.data.totals)}`);
    } else {
      throw new Error(`获取团队摘要失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  await runTest("团队", "切换团队状态", async () => {
    const res = await apiRequest("/teams/team-platform/toggle", {
      method: "POST"
    });
    
    if (res.status === 200) {
      console.log(`   切换团队状态成功`);
    } else {
      throw new Error(`切换团队状态失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("🔟 审批工单模块测试");
  console.log("=".repeat(60));
  
  await runTest("审批", "获取审批工单列表", async () => {
    const res = await apiRequest("/approvals");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   工单列表: ${res.data.items.length} 个`);
      console.log(`   统计: ${JSON.stringify(res.data.totals)}`);
    } else {
      throw new Error(`获取审批工单列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣1️⃣ 任务记录模块测试");
  console.log("=".repeat(60));
  
  await runTest("任务", "获取任务列表", async () => {
    const res = await apiRequest("/tasks");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   任务列表: ${res.data.items.length} 条`);
    } else {
      throw new Error(`获取任务列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣2️⃣ 审计日志模块测试");
  console.log("=".repeat(60));
  
  await runTest("审计", "获取审计日志", async () => {
    const res = await apiRequest("/audit-logs");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   审计日志: ${res.data.items.length} 条`);
    } else {
      throw new Error(`获取审计日志失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣3️⃣ Slash命令模块测试");
  console.log("=".repeat(60));
  
  await runTest("Slash", "获取Slash命令列表", async () => {
    const res = await apiRequest("/slash-commands");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   Slash命令: ${res.data.items.length} 个`);
      for (const cmd of res.data.items) {
        console.log(`     ${cmd.command} - ${cmd.description}`);
      }
    } else {
      throw new Error(`获取Slash命令失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣4️⃣ 包管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("包", "获取包列表", async () => {
    const res = await apiRequest("/packages");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   包列表: ${res.data.items.length} 个`);
      for (const pkg of res.data.items) {
        console.log(`     - ${pkg.name} (${pkg.version})`);
      }
    } else {
      throw new Error(`获取包列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣5️⃣ 文件管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("文件", "获取文件列表", async () => {
    const res = await apiRequest("/files");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   文件列表: ${res.data.items.length} 个`);
    } else {
      throw new Error(`获取文件列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣6️⃣ 租户管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("租户", "获取租户列表", async () => {
    const res = await apiRequest("/tenants");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   租户列表: ${res.data.items.length} 个`);
      for (const tenant of res.data.items) {
        console.log(`     - ${tenant.name} (${tenant.status})`);
      }
    } else if (res.status === 200) {
      console.log(`   租户列表为空或无数据`);
    } else {
      throw new Error(`获取租户列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣7️⃣ 角色管理模块测试");
  console.log("=".repeat(60));
  
  await runTest("角色", "获取角色列表", async () => {
    const res = await apiRequest("/roles");
    
    if (res.status === 200 && res.data.items) {
      console.log(`   角色列表: ${res.data.items.length} 个`);
      for (const role of res.data.items) {
        console.log(`     - ${role.name} (${role.scope})`);
      }
    } else if (res.status === 200) {
      console.log(`   角色列表为空或无数据`);
    } else {
      throw new Error(`获取角色列表失败: ${JSON.stringify(res.data)}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣8️⃣ 健康检查模块测试");
  console.log("=".repeat(60));
  
  await runTest("健康", "API健康检查", async () => {
    const res = await apiRequest("/health");
    
    if (res.status === 200 || res.status === 404) {
      console.log(`   健康检查端点: ${res.status === 200 ? '正常' : '未配置'}`);
    } else {
      throw new Error(`健康检查失败: ${res.status}`);
    }
  });
  
  await cleanupTestData();
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试结果汇总");
  console.log("=".repeat(60));
  
  const passCount = results.filter(r => r.status === "PASS").length;
  const failCount = results.filter(r => r.status === "FAIL").length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (failCount > 0) {
    console.log("\n失败详情:");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`  ❌ ${r.module} > ${r.test}`);
      console.log(`     原因: ${r.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  
  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error("测试执行失败:", error);
  process.exit(1);
});
