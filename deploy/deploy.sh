#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# NextOps 一键部署脚本（临时服务器）
# 用法: cd nextops && bash deploy/deploy.sh
# ============================================================

HOST="47.109.85.168"
USER="root"
PASS="Sfpy5NN;e"
REMOTE_DIR="/root/nextops"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARBALL="/tmp/nextops-deploy.tar.gz"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

log() { echo -e "\033[1;34m>>>\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m  $*"; }
err() { echo -e "\033[1;31m✗\033[0m  $*" >&2; }

ssh_run() { sshpass -p "$PASS" ssh $SSH_OPTS "${USER}@${HOST}" "$@"; }

# ---------- 1. 打包 ----------
log "打包项目..."
cd "$LOCAL_DIR"
tar czf "$TARBALL" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='__pycache__' \
  apps/ deploy/ package.json package-lock.json .env
ok "打包完成 ($(du -h "$TARBALL" | cut -f1))"

# ---------- 2. 上传 ----------
log "上传到 ${HOST}..."
sshpass -p "$PASS" scp $SSH_OPTS "$TARBALL" "${USER}@${HOST}:/tmp/"
ok "上传完成"

# ---------- 3. 远程部署 ----------
log "远程构建并启动容器..."
ssh_run bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

cd /tmp
rm -rf nextops-deploy
mkdir nextops-deploy
cd nextops-deploy
tar xzf /tmp/nextops-deploy.tar.gz 2>/dev/null

# 覆盖到项目目录
cp -r * /root/nextops/ 2>/dev/null || true
cp -r .* /root/nextops/ 2>/dev/null || true

cd /root/nextops/deploy

# 停掉旧容器
docker compose down 2>/dev/null || true

# 构建
echo "=== 构建镜像 ==="
docker compose build --no-cache

# 启动
echo "=== 启动容器 ==="
docker compose up -d

# 等待健康检查（最多 60 秒）
echo "=== 等待服务就绪 ==="
for i in $(seq 1 12); do
  sleep 5
  RUNNING=$(docker compose ps --format '{{.Name}} {{.Status}}' | grep -c "healthy" || true)
  TOTAL=$(docker compose ps --format '{{.Name}}' | wc -l | tr -d ' ')
  echo "  ${RUNNING}/${TOTAL} 个服务就绪"
  if [ "$RUNNING" -ge "$TOTAL" ]; then
    break
  fi
done

# 最终状态
echo "=== 部署结果 ==="
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# 验证 HTTP
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3019/ || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "HTTP 检查通过 (200)"
else
  echo "警告: HTTP 返回 ${HTTP_CODE}"
fi

# 清理
rm -f /tmp/nextops-deploy.tar.gz
REMOTE_SCRIPT

ok "部署完成！访问 http://${HOST}:3019"
