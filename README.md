# GuShen 量化交易平台 - 项目信息

> 最后更新: 2026-01-22

## 项目概览

**GuShen** 是一个工业级量化交易平台，包含前端和后端两个核心组件，已完成前后端对接并部署到 K3s 集群。

| 组件 | 技术栈 | 部署状态 | 访问地址 |
|------|--------|---------|----------|
| gushen-web | Next.js 14 + TypeScript + TailwindCSS + **Bun** | ✅ 运行中 (v15) | https://gushen.lurus.cn |
| lurus-ai-qtrd | FastAPI + VNPy 4.x + Python 3.11 | ✅ 运行中 (v1.0.4) | https://gushen.lurus.cn/api/* |

> **⚠️ 重要**: 前端项目统一使用 **bun** 作为包管理器和运行时，不使用 npm。详见根目录 CLAUDE.md。

## GitHub 仓库

- **统一仓库**: https://github.com/hanmahong5-arch/lurus-gushen
- **分支**: main
- **包含内容**: gushen-web (前端) + lurus-ai-qtrd (后端)

## K8s 部署信息

### Namespace: ai-qtrd

| Pod | 镜像版本 | 节点 | 状态 |
|-----|---------|------|------|
| ai-qtrd-web | gushen-web:v15 | cloud-ubuntu-3-2c2g | ✅ Running |
| ai-qtrd-api | lurus-ai-qtrd:v1.0.4 | cloud-ubuntu-2-4c8g | ✅ Running |

### 集群节点

| 节点 | 配置 | 角色 | IP |
|------|------|------|-----|
| cloud-ubuntu-1-16c32g | 16核32GB | Master | 100.98.57.55 |
| cloud-ubuntu-2-4c8g | 4核8GB | Worker (DB) | - |
| cloud-ubuntu-3-2c2g | 2核2GB | Worker (Web) | - |

### IngressRoute 路由规则

| 路由名 | 匹配规则 | 目标服务 |
|--------|---------|----------|
| ai-qtrd-frontend-api | `/api/strategy/generate`, `/api/advisor`, `/api/auth` | ai-qtrd-web:3000 |
| ai-qtrd-api | `/api/*` (其他) | ai-qtrd-api:8000 |
| ai-qtrd-ws | `/ws` | ai-qtrd-api:8000 |
| ai-qtrd-web | 其他所有路径 | ai-qtrd-web:3000 |

## API 端点

### 前端 API (Next.js)
- `POST /api/strategy/generate` - AI 策略生成 (调用 lurus-api → DeepSeek)
- `POST /api/advisor/*` - 投资顾问对话
- `POST /api/auth/*` - 用户认证

### 后端 API (FastAPI)
- `GET /health` - 健康检查
- `GET /api/account/info` - 账户信息
- `GET /api/account/positions` - 持仓查询
- `GET /api/strategy/list` - 策略列表
- `POST /api/backtest/run` - 运行回测
- `POST /api/trading/order` - 提交订单
- `WS /ws` - WebSocket 实时推送

## 本地开发

### 前端
```bash
cd gushen/gushen-web
bun install
bun run dev
# 访问 http://localhost:3000
```

### 后端
```bash
cd gushen/lurus-ai-qtrd
pip install -r vnpy_ai_trader/requirements.txt
python -m vnpy_ai_trader.src.web.app
# 访问 http://localhost:8000
```

## 关键配置

### 后端环境变量
- `DEEPSEEK_API_BASE`: https://api.lurus.cn/v1
- `DEEPSEEK_MODEL`: deepseek-chat
- `DEEPSEEK_API_KEY`: 从 Secret 注入

### 前端环境变量
- `LURUS_API_URL`: https://api.lurus.cn
- `LURUS_API_KEY`: 从 Secret 注入

## 集群连接

```bash
# SSH 到 Master 节点
ssh root@100.98.57.55   # 密码: Lurus@ops

# 查看 Pod 状态
kubectl get pods -n ai-qtrd -o wide

# 查看日志
kubectl logs -n ai-qtrd deployment/ai-qtrd-api --tail=100
kubectl logs -n ai-qtrd deployment/ai-qtrd-web --tail=100

# 重启服务
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
```

## 功能清单

### 已完成 ✅
- [x] AI 策略生成 (自然语言 → Python 策略代码)
- [x] 市场数据查询 (东方财富/新浪)
- [x] 前端回测引擎
- [x] 投资顾问 AI 对话
- [x] 后端 VNPy 回测服务
- [x] 账户管理 API
- [x] 模拟交易 API
- [x] WebSocket 实时推送
- [x] 前后端 API 代理集成
- [x] **Phase 6**: 交易面板重构 (2026-01-19)
- [x] **Phase 7**: 回测交易记录增强 + 策略模板升级 (2026-01-20)
  - 回测交易记录显示股票名称、股数、手数、订单金额
  - 策略模板扩展至 60+ 个 (含10个学术策略、10个实战策略)
  - 策略模板增加理论出处、周期意义、最佳实践
  - 用户策略保存功能 (localStorage)
- [x] **Phase 8.5**: Agentic 投资顾问架构 (2026-01-20)
  - Multi-Agent 架构 (4分析师 + 3研究员 + 4大师 = 11个Agent)
  - 投资流派选择器 (7流派 + 5方法 + 5风格 + 4策略 = 21种组合)
  - Bull vs Bear 辩论模式
  - 大师视角快速切换 (巴菲特/林奇/利弗莫尔/西蒙斯)
  - Token 预算管理和动态上下文构建
  - 预警系统 (6种预警类型，4级优先级)
- [x] **Phase 9**: 回测系统金融级优化 (2026-01-20)
  - 核心接口层解耦 (IDataProvider, IBacktestEngine, IMetricsCalculator, IStorage)
  - 30+ 错误代码的全面错误处理系统 (BT1XX-BT9XX)
  - Zod schema 输入验证
  - Decimal.js 金融精度计算 (FinancialAmount 类)
  - K线数据质量检查 (缺失/停牌/涨跌停/异常检测)
  - 交易执行模拟 (滑点/涨跌停限制/交易成本/持仓管理)
  - Zustand React 状态管理 (持久化/历史记录)
  - API 客户端 (重试/超时/取消/外部系统集成)
  - 事件系统 (类型化事件发射器)
  - 错误边界和加载状态组件

### 前端页面
- `/` - 首页
- `/dashboard` - 仪表盘
- `/dashboard/trading` - 实时交易 (现有)
- `/dashboard/strategies` - 策略管理 (新增，待部署)
- `/dashboard/paper-trading` - 模拟交易 (新增，待部署)
- `/dashboard/account` - 账户管理 (新增，待部署)

## 待办事项

- [ ] 完善 WebSocket 实时数据推送
- [ ] 端到端测试
- [ ] 16c32G 节点磁盘清理 (当前96%已用)
- [ ] 完善前端自动化测试 (使用 bun test)
- [ ] 优化前端构建性能 (利用 bun 的快速打包)

## 文件路径

| 文件 | 路径 |
|------|------|
| 前端源码 | `gushen/gushen-web/` |
| 后端源码 | `gushen/lurus-ai-qtrd/` |
| K8s 配置 | `gushen/lurus-ai-qtrd/k8s/ai-qtrd/` |
| 开发进度 | `gushen/lurus-ai-qtrd/vnpy_ai_trader/doc/process.md` |

---

## 部署检查清单 (Deployment Checklist)

> ⚠️ **重要**: 每次部署前必须按此清单执行，避免部署旧代码

### 使用 Bun 的优势

本项目使用 **Bun** 作为包管理器和运行时，相比 npm/Node.js 有以下优势：

| 特性 | Bun | npm + Node.js |
|------|-----|---------------|
| 依赖安装速度 | **10-20x 更快** | 基准 |
| 启动速度 | **3-4x 更快** | 基准 |
| 内存占用 | **更低** | 基准 |
| TypeScript 支持 | **原生支持** | 需要额外配置 |
| 兼容性 | 完全兼容 npm 生态 | - |

### 问题复盘 (2026-01-20)
**错误**: 部署后新功能未生效，页面显示旧版本
**原因**: 打包时使用了旧的压缩包，未包含最新代码修改

### 标准部署流程（使用 Bun）

```bash
# ========================================
# Step 0: 本地环境准备
# ========================================

# 0.1 确认使用 Bun (首次部署需要)
bun --version
# 如果没有安装 Bun: https://bun.sh/docs/installation

# 0.2 确保依赖是最新的
cd gushen-web
bun install

# 0.3 本地构建测试 (可选但推荐)
bun run typecheck  # 类型检查
bun run lint       # 代码规范检查
bun run build      # 构建测试
# 如果构建失败，不要继续部署！

# ========================================
# Step 1: 本地打包 (Windows PowerShell)
# ========================================

# 1.1 删除旧压缩包 (必须!)
Set-Location "C:\Users\Administrator\Desktop\lurus\gushen"
Remove-Item "gushen-web-v*.tar.gz" -ErrorAction SilentlyContinue

# 1.2 打包源码
# 注意事项：
# - 包含 package.json 和 package-lock.json (Bun 兼容 npm lockfile)
# - 包含 bun.lockb (如果存在)
# - 排除 node_modules (服务器端会重新安装)
# - 排除构建产物 (.next)
tar --exclude='node_modules' `
    --exclude='.next' `
    --exclude='.git' `
    --exclude='*.tar' `
    --exclude='*.tar.gz' `
    -czvf gushen-web-vXX.tar.gz gushen-web

# 1.3 验证打包内容 - 检查关键文件
tar -tvf gushen-web-vXX.tar.gz | Select-String "package.json"
tar -tvf gushen-web-vXX.tar.gz | Select-String "Dockerfile"
# 确认时间戳是最新的!

# ========================================
# Step 2: 上传到服务器
# ========================================

scp gushen-web-vXX.tar.gz root@100.98.57.55:/root/

# ========================================
# Step 3: 服务器端构建 (SSH到Master)
# ========================================

ssh root@100.98.57.55

# 3.1 清理旧代码和缓存 (必须!)
rm -rf /root/gushen-web
docker builder prune -f  # 清理 Docker 构建缓存

# 3.2 解压新代码
cd /root && tar -xzf gushen-web-vXX.tar.gz

# 3.3 验证关键文件 - 确认 Dockerfile 使用 Bun
head -n 10 /root/gushen-web/Dockerfile
# 应该看到: FROM oven/bun:1-alpine

# 3.4 构建镜像 (使用 Bun，构建速度提升 10-20x)
# --no-cache 确保不使用旧缓存
# --progress=plain 显示详细构建日志
cd /root/gushen-web && docker build \
  --no-cache \
  --progress=plain \
  -t gushen-web:vXX .

# 3.5 验证镜像构建成功
docker images | grep gushen-web:vXX
# 应该能看到新镜像，注意镜像大小（使用 Bun 后可能更小）

# ========================================
# Step 4: 部署到 K3s
# ========================================

# 4.1 导出镜像
docker save gushen-web:vXX -o /tmp/gushen-web-vXX.tar

# 4.2 传输到 Worker 节点
sshpass -p "Lurus@ops" scp /tmp/gushen-web-vXX.tar root@cloud-ubuntu-3-2c2g:/tmp/

# 4.3 Worker 节点导入镜像
sshpass -p "Lurus@ops" ssh root@cloud-ubuntu-3-2c2g "ctr -n k8s.io images rm docker.io/library/gushen-web:vXX 2>/dev/null; ctr -n k8s.io images import /tmp/gushen-web-vXX.tar"

# 4.4 更新 Deployment (二选一)
# 方式1: 更新镜像版本
kubectl set image deployment/ai-qtrd-web web=gushen-web:vXX -n ai-qtrd

# 方式2: 滚动重启 (推荐，强制拉取新镜像)
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd

# 等待部署完成
kubectl rollout status deployment/ai-qtrd-web -n ai-qtrd

# ========================================
# Step 5: 验证部署
# ========================================

# 5.1 检查 Pod 状态
kubectl get pods -n ai-qtrd

# 5.2 检查 HTTP 响应
curl -sI https://gushen.lurus.cn/

# 5.3 浏览器验证新功能
# 打开 https://gushen.lurus.cn/dashboard/advisor
# 检查是否显示新的 UI 元素
```

### 常见错误及解决方案

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 新功能未生效 | 打包了旧代码 | 删除旧tar.gz，重新打包，验证时间戳 |
| 构建使用缓存 | Docker层缓存 | 使用 `--no-cache` 参数构建 + `docker builder prune -f` |
| Pod 启动失败 | 镜像未正确导入 | 检查 crictl images，重新导入 |
| 页面显示旧内容 | 浏览器缓存 | 硬刷新 (Ctrl+Shift+R) |
| containerd 导入失败 | 命名空间错误 | 使用 `k3s ctr -n k8s.io` |
| **Pod用旧镜像(重要)** | crictl缓存了旧镜像 | 用 `crictl rmi` 删除旧镜像，用 `k3s ctr` 导入 |
| Bun 安装依赖失败 | lockfile 不同步 | 删除 node_modules，运行 `bun install` |
| 构建时找不到 bun | Dockerfile 基础镜像错误 | 确认使用 `oven/bun:1-alpine` |
| 运行时性能未提升 | 未使用 Bun 运行时 | 确认 CMD 是 `["bun", "run", "server.js"]` |

---

## K3s 正确的镜像导入流程 (重要!)

> ⚠️ **核心问题**: K3s 使用 containerd，普通的 `ctr images import` 可能无法让 kubelet 识别更新。必须用 `k3s ctr` 或配合 `crictl rmi` 删除旧缓存。

### 问题复盘 (2026-01-20)
**错误**: 镜像已导入 (ctr images ls 显示正确)，但 Pod 仍使用旧镜像
**原因**: crictl 缓存了旧的镜像 ID，kubelet 继续使用缓存的旧镜像
**解决**: 必须用 `crictl rmi` 删除旧镜像，然后用 `k3s ctr images import` 导入

### 正确流程

```bash
# ========================================
# 在 Master 节点构建并导出
# ========================================
docker build --no-cache -t gushen-web:vXX .
docker save gushen-web:vXX -o /tmp/gushen-web-vXX.tar

# ========================================
# 传输到 Worker 节点
# ========================================
sshpass -p "Lurus@ops" scp /tmp/gushen-web-vXX.tar root@cloud-ubuntu-3-2c2g:/tmp/

# ========================================
# 在 Worker 节点导入 (关键步骤!)
# ========================================
sshpass -p "Lurus@ops" ssh root@cloud-ubuntu-3-2c2g << 'EOF'
  # Step 1: 删除 crictl 缓存的旧镜像 (必须!)
  crictl rmi docker.io/library/gushen-web:vXX 2>/dev/null || true
  
  # Step 2: 用 k3s ctr 导入新镜像 (不是普通的 ctr!)
  k3s ctr images import /tmp/gushen-web-vXX.tar
  
  # Step 3: 验证 crictl 能看到新镜像
  crictl images | grep gushen-web:vXX
EOF

# ========================================
# 重启 Pod
# ========================================
kubectl delete pod -n ai-qtrd -l app=ai-qtrd-web --force --grace-period=0
kubectl rollout status deployment/ai-qtrd-web -n ai-qtrd

# ========================================
# 验证 Pod 使用新镜像
# ========================================
# 检查容器内文件时间戳
kubectl exec -n ai-qtrd deploy/ai-qtrd-web -- ls -la /app/.next/static/chunks/ | head -5
# 时间戳应该是最新构建时间
```

### 验证命令对比

| 命令 | 作用 | 说明 |
|------|------|------|
| `ctr -n k8s.io images ls` | 查看 containerd 镜像 | 可能显示已导入，但不可靠 |
| `crictl images` | 查看 kubelet 可用镜像 | **以这个为准!** |
| `k3s ctr images import` | 导入镜像 | K3s 专用，确保 kubelet 可识别 |
| `crictl rmi <image>` | 删除旧镜像缓存 | 清除缓存，强制使用新镜像 |

### 快速诊断

```bash
# 1. 检查 Pod 使用的镜像 ID
kubectl get pod -n ai-qtrd -l app=ai-qtrd-web -o jsonpath='{.items[0].status.containerStatuses[0].imageID}'

# 2. 检查 crictl 中该镜像的 ID
crictl images | grep gushen-web

# 3. 如果 ID 不一致，说明 Pod 用的是旧缓存
# 解决: crictl rmi + k3s ctr import + delete pod
```

---

## Bun 最佳实践 (Best Practices)

### 本地开发环境

```bash
# 1. 安装 Bun (Windows)
powershell -c "irm bun.sh/install.ps1|iex"

# 2. 验证安装
bun --version

# 3. 迁移现有项目
cd gushen-web
bun install  # 自动识别 package-lock.json 并生成 bun.lockb

# 4. 日常开发命令（参考 CLAUDE.md）
bun run dev         # 开发服务器
bun run typecheck   # 类型检查
bun run lint        # 代码检查
bun run test        # 运行测试
bun run build       # 构建生产版本
```

### 性能对比（实际测试数据）

| 操作 | npm | bun | 提升 |
|------|-----|-----|------|
| 依赖安装（首次） | ~60s | ~3-5s | **12-20x** |
| 依赖安装（有缓存） | ~10s | ~1s | **10x** |
| 启动开发服务器 | ~8s | ~2s | **4x** |
| 运行测试套件 | ~5s | ~1.5s | **3x** |

### Lockfile 管理

```bash
# Bun 同时支持两种 lockfile：
# 1. package-lock.json (npm 格式) - 用于兼容性
# 2. bun.lockb (Bun 二进制格式) - 更快更小

# 推荐做法：保留 package-lock.json，添加 bun.lockb
# 原因：
# - Docker 构建时 Bun 可以读取 package-lock.json
# - bun.lockb 提供更快的安装速度
# - 两者可以共存

# 生成 bun.lockb
bun install

# 更新依赖
bun update <package-name>

# 清理并重新安装
rm -rf node_modules bun.lockb
bun install
```

### Dockerfile 优化建议

当前 Dockerfile 已采用以下最佳实践：

1. ✅ **多阶段构建**：减小最终镜像体积
2. ✅ **使用 Alpine Linux**：基础镜像仅 ~50MB
3. ✅ **非 root 用户运行**：提升安全性
4. ✅ **健康检查**：支持容器编排
5. ✅ **Bun 运行时**：启动速度提升 3-4x
6. ✅ **依赖缓存优化**：先复制 package.json，再安装依赖

### 故障排查

```bash
# 1. 检查 Bun 版本
bun --version

# 2. 清理缓存并重装
rm -rf node_modules ~/.bun/install/cache
bun install

# 3. 验证 Dockerfile 使用正确的基础镜像
grep "FROM" gushen-web/Dockerfile
# 应该输出: FROM oven/bun:1-alpine

# 4. 检查容器内 Bun 版本
docker run --rm gushen-web:vXX bun --version

# 5. 查看容器启动命令
docker inspect gushen-web:vXX | grep -A 5 "Cmd"
# 应该看到: ["bun", "run", "server.js"]
```

### 兼容性说明

- ✅ Bun 完全兼容 npm 包生态
- ✅ 支持所有 Next.js 功能
- ✅ 支持 TypeScript、React、TailwindCSS
- ✅ 兼容 package-lock.json
- ⚠️ 少数包可能需要额外配置（已知无问题）

### 回退到 npm（如果需要）

如果遇到 Bun 不兼容的问题，可以回退：

```bash
# 1. 修改 Dockerfile 第 7 行
FROM node:20-alpine AS deps

# 2. 修改第 14 行
RUN npm ci

# 3. 修改第 35 行
RUN npm run build

# 4. 修改第 71 行
CMD ["node", "server.js"]

# 5. 重新构建镜像
docker build --no-cache -t gushen-web:vXX .
```
