# GuShen K3s集群敏感信息与配置文档 | Secrets and Configuration

> ⚠️ **警告 | WARNING**
>
> 本文档包含敏感配置信息，请妥善保管！
> This document contains sensitive configuration. Keep it secure!
>
> - 🔒 **不要提交到Git仓库** | DO NOT commit to Git
> - 🔒 **不要通过非加密渠道传输** | DO NOT transmit over unencrypted channels
> - 🔒 **定期更新密码** | Rotate passwords regularly
> - 🔒 **限制访问权限** | Restrict access permissions

---

## 目录 | Table of Contents

1. [Kubernetes Secrets管理](#1-kubernetes-secrets管理)
2. [API密钥和凭据](#2-api密钥和凭据)
3. [数据库配置](#3-数据库配置)
4. [Redis配置](#4-redis配置)
5. [TLS证书](#5-tls证书)
6. [环境变量完整清单](#6-环境变量完整清单)
7. [密钥轮换流程](#7-密钥轮换流程)
8. [安全审计](#8-安全审计)
9. [应急响应](#9-应急响应)

---

## 1. Kubernetes Secrets管理

### 1.1 Secret资源位置

**文件路径**: `lurus-ai-qtrd/k8s/ai-qtrd/01-secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ai-qtrd-secrets
  namespace: ai-qtrd
type: Opaque
data:
  # 所有值都是base64编码
  DEEPSEEK_API_KEY: <base64-encoded>
  DATABASE_PASSWORD: <base64-encoded>
  REDIS_PASSWORD: <base64-encoded>
  NEXTAUTH_SECRET: <base64-encoded>
  LURUS_API_KEY: <base64-encoded>
```

### 1.2 查看Secret内容

```bash
# 查看Secret列表
kubectl get secrets -n ai-qtrd

# 查看Secret详情（base64编码）
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o yaml

# 解码单个Secret值
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d
echo

# 解码所有Secret值
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o json | jq -r '.data | to_entries[] | "\(.key)=\(.value | @base64d)"'
```

### 1.3 更新Secret

```bash
# 方法1: 直接编辑
kubectl edit secret ai-qtrd-secrets -n ai-qtrd

# 方法2: 使用patch更新单个值
NEW_VALUE=$(echo -n "new-password" | base64)
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"REDIS_PASSWORD\":\"$NEW_VALUE\"}}"

# 方法3: 从文件更新
kubectl create secret generic ai-qtrd-secrets \
  --from-literal=DEEPSEEK_API_KEY='sk-xxx' \
  --from-literal=DATABASE_PASSWORD='db-pass' \
  --from-literal=REDIS_PASSWORD='redis-pass' \
  --dry-run=client -o yaml | kubectl apply -f -

# 重要: 更新Secret后需要重启Pod使其生效
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd
kubectl rollout restart statefulset/redis -n ai-qtrd
```

### 1.4 备份Secret

```bash
# 备份所有Secrets（注意：明文保存，需加密存储）
kubectl get secret -n ai-qtrd -o yaml > secrets-backup-$(date +%Y%m%d).yaml

# 加密备份文件（推荐）
gpg --symmetric --cipher-algo AES256 secrets-backup-$(date +%Y%m%d).yaml
rm secrets-backup-$(date +%Y%m%d).yaml  # 删除明文

# 恢复Secret
gpg --decrypt secrets-backup-20260122.yaml.gpg | kubectl apply -f -
```

---

## 2. API密钥和凭据

### 2.1 DEEPSEEK API密钥

**用途**: AI模型调用（策略生成、投资顾问）

**Secret Key**: `DEEPSEEK_API_KEY`

**当前值位置**:
```bash
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o jsonpath='{.data.DEEPSEEK_API_KEY}' | base64 -d
```

**格式**: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**使用位置**:
- 后端服务 (`ai-qtrd-api`): 调用DeepSeek API
- 前端服务 (`ai-qtrd-web`): 调用Lurus API代理

**配置方式**:
```yaml
# 在Deployment中注入
env:
- name: DEEPSEEK_API_KEY
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: DEEPSEEK_API_KEY
```

**API端点**:
```
Base URL: https://api.lurus.cn/v1
Model: deepseek-chat
Authentication: Bearer <DEEPSEEK_API_KEY>
```

**测试API密钥**:
```bash
# 测试DeepSeek API
API_KEY=$(kubectl get secret ai-qtrd-secrets -n ai-qtrd -o jsonpath='{.data.DEEPSEEK_API_KEY}' | base64 -d)

curl https://api.lurus.cn/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'

# 预期输出: JSON响应，包含choices和usage字段
```

**密钥轮换**:
```bash
# 1. 在Lurus平台生成新的API Key
# 2. 更新Secret
NEW_KEY="sk-new-key-here"
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"DEEPSEEK_API_KEY\":\"$(echo -n $NEW_KEY | base64)\"}}"

# 3. 重启服务
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd

# 4. 验证新密钥
kubectl logs deployment/ai-qtrd-api -n ai-qtrd | grep -i "api.*success"
```

### 2.2 LURUS API密钥

**用途**: 前端调用Lurus API网关

**Secret Key**: `LURUS_API_KEY`

**配置**:
```yaml
env:
- name: LURUS_API_KEY
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: LURUS_API_KEY
```

**API端点**:
```
Base URL: https://api.lurus.cn
Usage: 策略生成、AI对话、市场数据
```

### 2.3 NextAuth密钥

**用途**: NextAuth.js会话加密

**Secret Key**: `NEXTAUTH_SECRET`

**生成方式**:
```bash
# 生成随机密钥（32字节）
openssl rand -base64 32

# 更新Secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"NEXTAUTH_SECRET\":\"$(echo -n $NEXTAUTH_SECRET | base64)\"}}"

# 重启前端
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
```

**配置**:
```yaml
env:
- name: NEXTAUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: NEXTAUTH_SECRET
- name: NEXTAUTH_URL
  value: "https://gushen.lurus.cn"
```

---

## 3. 数据库配置

### 3.1 PostgreSQL连接信息

**数据库类型**: PostgreSQL
**数据库名称**: `gushen`
**用户名**: `postgres` (或其他管理员用户)
**端口**: `5432`

**连接字符串格式**:
```
postgresql://username:password@host:port/database
```

**Secret Key**: `DATABASE_PASSWORD`

**当前密码**:
```bash
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d
```

**完整连接字符串**:
```bash
# 在Pod中使用
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@<db-host>:5432/gushen"
```

**配置方式**:
```yaml
env:
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: DATABASE_PASSWORD
- name: DATABASE_URL
  value: "postgresql://postgres:$(DATABASE_PASSWORD)@<db-host>:5432/gushen"
```

**测试数据库连接**:
```bash
# 从前端Pod测试
kubectl exec deployment/ai-qtrd-web -n ai-qtrd -- /bin/sh -c \
  "echo 'SELECT 1' | psql \$DATABASE_URL"

# 从后端Pod测试
kubectl exec deployment/ai-qtrd-api -n ai-qtrd -- python3 -c \
  "import psycopg2; conn = psycopg2.connect('$DATABASE_URL'); print('Connected OK'); conn.close()"
```

### 3.2 数据库备份

```bash
# 备份数据库
pg_dump -h <db-host> -U postgres -d gushen -F c -f gushen-backup-$(date +%Y%m%d).dump

# 备份单个表
pg_dump -h <db-host> -U postgres -d gushen -t stocks -F c -f stocks-backup.dump

# 恢复数据库
pg_restore -h <db-host> -U postgres -d gushen gushen-backup-20260122.dump

# 恢复单个表
pg_restore -h <db-host> -U postgres -d gushen -t stocks stocks-backup.dump
```

### 3.3 数据库用户权限

```sql
-- 查看当前用户权限
SELECT * FROM information_schema.role_table_grants
WHERE grantee = 'postgres';

-- 创建只读用户（用于监控）
CREATE USER readonly WITH PASSWORD 'readonly-pass';
GRANT CONNECT ON DATABASE gushen TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- 创建应用用户（限制权限）
CREATE USER gushen_app WITH PASSWORD 'app-pass';
GRANT CONNECT ON DATABASE gushen TO gushen_app;
GRANT USAGE ON SCHEMA public TO gushen_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gushen_app;
```

---

## 4. Redis配置

### 4.1 Redis密码

**Secret Key**: `REDIS_PASSWORD`

**当前密码**:
```bash
kubectl get secret ai-qtrd-secrets -n ai-qtrd -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d
```

**配置方式**:
```yaml
# 前端和后端Pod中
env:
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: REDIS_PASSWORD
- name: REDIS_HOST
  value: "redis-service.ai-qtrd.svc.cluster.local"
- name: REDIS_PORT
  value: "6379"

# Redis StatefulSet中
env:
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: REDIS_PASSWORD
```

**测试Redis连接**:
```bash
# 从Redis Pod内部测试
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} ping
# 预期输出: PONG

# 从应用Pod测试
kubectl exec deployment/ai-qtrd-web -n ai-qtrd -- /bin/sh -c \
  "redis-cli -h redis-service -p 6379 -a \$REDIS_PASSWORD ping"

# 查看Redis信息
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} INFO server
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} INFO replication
```

### 4.2 Redis主从架构详情

**主节点 (Master)**:
```
Pod Name: redis-0
DNS: redis-0.redis-headless.ai-qtrd.svc.cluster.local
Role: master
Replica: 2 (redis-1, redis-2)
```

**从节点 (Replicas)**:
```
Pod Name: redis-1, redis-2
DNS:
  - redis-1.redis-headless.ai-qtrd.svc.cluster.local
  - redis-2.redis-headless.ai-qtrd.svc.cluster.local
Role: slave
Master: redis-0.redis-headless.ai-qtrd.svc.cluster.local:6379
```

**查看主从状态**:
```bash
# 查看主节点信息
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} info replication

# 预期输出:
# role:master
# connected_slaves:2
# slave0:ip=redis-1.redis-headless.ai-qtrd.svc.cluster.local,port=6379,state=online
# slave1:ip=redis-2.redis-headless.ai-qtrd.svc.cluster.local,port=6379,state=online

# 查看从节点信息
kubectl exec redis-1 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} info replication

# 预期输出:
# role:slave
# master_host:redis-0.redis-headless.ai-qtrd.svc.cluster.local
# master_port:6379
# master_link_status:up
```

### 4.3 Redis故障切换

**场景1: 主节点故障**

```bash
# 1. 检测主节点状态
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} ping
# 如果失败，主节点不可用

# 2. 提升从节点为主节点
kubectl exec redis-1 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} SLAVEOF NO ONE

# 3. 配置其他从节点指向新主节点
kubectl exec redis-2 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} \
  SLAVEOF redis-1.redis-headless.ai-qtrd.svc.cluster.local 6379

# 4. 验证新主从状态
kubectl exec redis-1 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} info replication

# 5. 更新应用配置（如果硬编码了redis-0）
# 或使用Service自动负载均衡（推荐）
```

**场景2: 自动化故障切换（使用Redis Sentinel，可选）**

```yaml
# 部署Redis Sentinel (未来改进)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-sentinel
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: sentinel
        image: redis:7.2-alpine
        command:
        - redis-sentinel
        - /etc/redis/sentinel.conf
```

### 4.4 Redis密钥轮换

```bash
# 1. 生成新密码
NEW_REDIS_PASSWORD=$(openssl rand -base64 32)

# 2. 更新Secret
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"REDIS_PASSWORD\":\"$(echo -n $NEW_REDIS_PASSWORD | base64)\"}}"

# 3. 更新Redis ConfigMap
kubectl edit configmap redis-config -n ai-qtrd
# 添加: requirepass <new-password>

# 4. 逐个重启Redis Pod（保持主从同步）
kubectl delete pod redis-2 -n ai-qtrd && sleep 10
kubectl delete pod redis-1 -n ai-qtrd && sleep 10
kubectl delete pod redis-0 -n ai-qtrd

# 5. 重启应用服务
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd

# 6. 验证
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a $NEW_REDIS_PASSWORD ping
```

---

## 5. TLS证书

### 5.1 证书管理

**证书名称**: `gushen-lurus-cn-tls`
**域名**: `gushen.lurus.cn`
**颁发机构**: Let's Encrypt (via cert-manager)
**有效期**: 90天
**自动续期**: 30天前自动触发

**查看证书状态**:
```bash
# 查看Certificate资源
kubectl get certificate -n ai-qtrd

# 查看证书详情
kubectl describe certificate gushen-lurus-cn-tls -n ai-qtrd

# 预期输出:
# Status:
#   Conditions:
#     Type:     Ready
#     Status:   True
#   Not After:  2026-04-22T00:00:00Z
```

**查看证书内容**:
```bash
# 查看Secret中的证书
kubectl get secret gushen-lurus-cn-tls -n ai-qtrd -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/tls.crt

# 查看证书信息
openssl x509 -in /tmp/tls.crt -text -noout

# 查看证书有效期
openssl x509 -in /tmp/tls.crt -noout -dates
# 输出:
# notBefore=Jan 22 00:00:00 2026 GMT
# notAfter=Apr 22 23:59:59 2026 GMT
```

### 5.2 手动触发证书续期

```bash
# 删除证书Secret触发重新申请
kubectl delete secret gushen-lurus-cn-tls -n ai-qtrd

# cert-manager会自动重新申请证书

# 查看cert-manager日志
kubectl logs -n cert-manager deployment/cert-manager -f

# 验证新证书
kubectl get certificate -n ai-qtrd
```

### 5.3 证书备份

```bash
# 备份证书和私钥
kubectl get secret gushen-lurus-cn-tls -n ai-qtrd -o yaml > tls-cert-backup-$(date +%Y%m%d).yaml

# 加密备份（私钥敏感）
gpg --symmetric --cipher-algo AES256 tls-cert-backup-$(date +%Y%m%d).yaml
rm tls-cert-backup-$(date +%Y%m%d).yaml

# 恢复证书
gpg --decrypt tls-cert-backup-20260122.yaml.gpg | kubectl apply -f -
```

### 5.4 自定义证书（可选）

```bash
# 如果需要使用自己的证书（而非Let's Encrypt）

# 1. 准备证书文件
# tls.crt - 证书文件
# tls.key - 私钥文件

# 2. 创建Secret
kubectl create secret tls gushen-lurus-cn-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n ai-qtrd

# 3. 更新IngressRoute使用新证书
kubectl apply -f lurus-ai-qtrd/k8s/ai-qtrd/06-ingress-routes.yaml
```

---

## 6. 环境变量完整清单

### 6.1 前端服务 (ai-qtrd-web)

```yaml
env:
# Redis配置
- name: REDIS_HOST
  value: "redis-service.ai-qtrd.svc.cluster.local"
- name: REDIS_PORT
  value: "6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: REDIS_PASSWORD
- name: REDIS_DB
  value: "0"
- name: REDIS_ENABLED
  value: "true"

# 数据库配置
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: DATABASE_PASSWORD
- name: DATABASE_URL
  value: "postgresql://postgres:$(DATABASE_PASSWORD)@<db-host>:5432/gushen"

# 身份认证
- name: NEXTAUTH_URL
  value: "https://gushen.lurus.cn"
- name: NEXTAUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: NEXTAUTH_SECRET

# API配置
- name: BACKEND_API_URL
  value: "http://ai-qtrd-api:8000"
- name: LURUS_API_URL
  value: "https://api.lurus.cn"
- name: LURUS_API_KEY
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: LURUS_API_KEY

# Node环境
- name: NODE_ENV
  value: "production"
```

### 6.2 后端服务 (ai-qtrd-api)

```yaml
env:
# Web服务器配置
- name: WEB_HOST
  value: "0.0.0.0"
- name: WEB_PORT
  value: "8000"

# AI API配置
- name: DEEPSEEK_API_BASE
  value: "https://api.lurus.cn/v1"
- name: DEEPSEEK_MODEL
  value: "deepseek-chat"
- name: DEEPSEEK_API_KEY
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: DEEPSEEK_API_KEY

# 数据库配置
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: DATABASE_PASSWORD
- name: DATABASE_URL
  value: "postgresql://postgres:$(DATABASE_PASSWORD)@<db-host>:5432/gushen"

# Redis配置
- name: REDIS_HOST
  value: "redis-service"
- name: REDIS_PORT
  value: "6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: REDIS_PASSWORD

# CORS配置
- name: CORS_ORIGINS
  value: '["https://gushen.lurus.cn"]'

# URL配置
- name: WEB_URL
  value: "https://gushen.lurus.cn"
- name: API_URL
  value: "https://gushen.lurus.cn/api"

# Python环境
- name: PYTHONUNBUFFERED
  value: "1"
```

### 6.3 Redis StatefulSet

```yaml
env:
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: ai-qtrd-secrets
      key: REDIS_PASSWORD
```

---

## 7. 密钥轮换流程

### 7.1 密钥轮换周期

| 密钥类型 | 轮换周期 | 优先级 | 影响范围 |
|---------|---------|--------|---------|
| REDIS_PASSWORD | 每3个月 | 中 | 所有服务，需重启 |
| DATABASE_PASSWORD | 每6个月 | 高 | 所有服务，需重启 |
| DEEPSEEK_API_KEY | 按需 | 中 | 后端API调用 |
| NEXTAUTH_SECRET | 每12个月 | 低 | 前端会话，用户需重新登录 |
| TLS证书 | 自动(90天) | 高 | HTTPS访问 |

### 7.2 Redis密码轮换

```bash
#!/bin/bash
# rotate-redis-password.sh

# 1. 生成新密码
NEW_PASSWORD=$(openssl rand -base64 32)
echo "新Redis密码: $NEW_PASSWORD"

# 2. 更新Secret
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"REDIS_PASSWORD\":\"$(echo -n $NEW_PASSWORD | base64)\"}}"

# 3. 重启Redis（逐个重启避免服务中断）
echo "重启Redis从节点..."
kubectl delete pod redis-2 -n ai-qtrd
kubectl wait --for=condition=ready pod/redis-2 -n ai-qtrd --timeout=60s
kubectl delete pod redis-1 -n ai-qtrd
kubectl wait --for=condition=ready pod/redis-1 -n ai-qtrd --timeout=60s

echo "重启Redis主节点..."
kubectl delete pod redis-0 -n ai-qtrd
kubectl wait --for=condition=ready pod/redis-0 -n ai-qtrd --timeout=60s

# 4. 重启应用服务
echo "重启应用服务..."
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd

# 5. 验证
echo "验证Redis连接..."
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a $NEW_PASSWORD ping

echo "Redis密码轮换完成！"
```

### 7.3 数据库密码轮换

```bash
#!/bin/bash
# rotate-database-password.sh

# 1. 生成新密码
NEW_DB_PASSWORD=$(openssl rand -base64 32)
echo "新数据库密码: $NEW_DB_PASSWORD"

# 2. 在数据库服务器上更新密码
psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_DB_PASSWORD';"

# 3. 更新K8s Secret
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"DATABASE_PASSWORD\":\"$(echo -n $NEW_DB_PASSWORD | base64)\"}}"

# 4. 重启应用服务
kubectl rollout restart deployment/ai-qtrd-web -n ai-qtrd
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd

# 5. 验证
echo "验证数据库连接..."
kubectl exec deployment/ai-qtrd-web -n ai-qtrd -- /bin/sh -c \
  "echo 'SELECT 1' | psql \$DATABASE_URL"

echo "数据库密码轮换完成！"
```

### 7.4 API密钥轮换

```bash
#!/bin/bash
# rotate-api-keys.sh

# 1. 在API提供商平台生成新密钥
# （手动操作）

# 2. 更新Secret
NEW_DEEPSEEK_KEY="sk-new-key-here"
kubectl patch secret ai-qtrd-secrets -n ai-qtrd \
  -p "{\"data\":{\"DEEPSEEK_API_KEY\":\"$(echo -n $NEW_DEEPSEEK_KEY | base64)\"}}"

# 3. 重启后端服务
kubectl rollout restart deployment/ai-qtrd-api -n ai-qtrd

# 4. 验证API调用
kubectl logs deployment/ai-qtrd-api -n ai-qtrd --tail=50 | grep -i "api.*success"

echo "API密钥轮换完成！"
```

---

## 8. 安全审计

### 8.1 密钥使用审计

```bash
# 查看哪些Pod使用了Secret
kubectl get pods -n ai-qtrd -o json | \
  jq -r '.items[] | .metadata.name as $pod | .spec.containers[] |
    select(.env[]?.valueFrom.secretKeyRef.name == "ai-qtrd-secrets") |
    $pod'

# 查看Secret的访问历史（通过审计日志）
kubectl get events -n ai-qtrd --sort-by='.lastTimestamp' | grep secret

# 查看最近访问过Secret的用户
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "secret.*ai-qtrd-secrets"
```

### 8.2 密钥泄露检测

```bash
# 检查Secret是否被意外输出到日志
kubectl logs deployment/ai-qtrd-web -n ai-qtrd | grep -i "password\|secret\|api.*key"
kubectl logs deployment/ai-qtrd-api -n ai-qtrd | grep -i "password\|secret\|api.*key"

# 检查ConfigMap中是否有敏感信息
kubectl get configmap ai-qtrd-config -n ai-qtrd -o yaml | grep -i "password\|secret"

# 检查环境变量配置
kubectl get deployment ai-qtrd-web -n ai-qtrd -o yaml | grep -A 5 "env:"
```

### 8.3 权限审计

```bash
# 查看ServiceAccount权限
kubectl auth can-i --list --namespace=ai-qtrd --as=system:serviceaccount:ai-qtrd:default

# 查看谁可以访问Secrets
kubectl auth can-i get secrets --namespace=ai-qtrd --as=<user>

# 查看Secret的RBAC权限
kubectl get rolebindings,clusterrolebindings -A -o json | \
  jq -r '.items[] | select(.subjects[]?.namespace == "ai-qtrd") |
    .metadata.name, .subjects[].name'
```

---

## 9. 应急响应

### 9.1 密钥泄露应急流程

**场景**: 发现API密钥或数据库密码泄露

**立即执行**:

```bash
# 1. 立即轮换所有可能泄露的密钥
./rotate-redis-password.sh
./rotate-database-password.sh
./rotate-api-keys.sh

# 2. 检查是否有未授权访问
# 查看API调用日志
kubectl logs deployment/ai-qtrd-api -n ai-qtrd --since=24h | grep -i "unauthorized\|401\|403"

# 查看数据库连接日志
psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# 查看Redis连接
kubectl exec redis-0 -n ai-qtrd -- redis-cli -a ${REDIS_PASSWORD} CLIENT LIST

# 3. 通知相关人员
# 发送告警邮件/企业微信

# 4. 记录事件
echo "$(date): 密钥泄露事件处理完成" >> /var/log/security-incidents.log
```

### 9.2 服务被攻击应急响应

**症状**: 异常高流量、大量失败请求

```bash
# 1. 查看Traefik日志
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik --tail=1000 | grep -E "40[0-9]|50[0-9]"

# 2. 临时限流（在Traefik Middleware中添加）
cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: ai-qtrd
spec:
  rateLimit:
    average: 100
    burst: 200
EOF

# 3. 更新IngressRoute应用限流
kubectl edit ingressroute gushen-web-https -n ai-qtrd
# 添加 middleware: rate-limit

# 4. 如果攻击严重，临时关闭服务
kubectl scale deployment/ai-qtrd-web -n ai-qtrd --replicas=0

# 5. 分析攻击源
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik --tail=10000 | \
  grep -oP 'ClientAddr:\K[0-9.]+' | sort | uniq -c | sort -rn | head -20
```

### 9.3 数据泄露应急响应

**场景**: 发现数据库被非法访问

```bash
# 1. 立即修改数据库密码
./rotate-database-password.sh

# 2. 检查数据库访问日志
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE usename='postgres';"

# 3. 检查可疑查询
psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY calls DESC LIMIT 50;"

# 4. 备份当前数据（取证）
pg_dump -h <db-host> -U postgres -d gushen -F c -f gushen-incident-$(date +%Y%m%d-%H%M%S).dump

# 5. 审查RBAC权限
kubectl get rolebindings -n ai-qtrd -o yaml

# 6. 通知安全团队
# 发送详细报告
```

### 9.4 证书过期应急响应

**场景**: TLS证书过期导致HTTPS无法访问

```bash
# 1. 检查证书状态
kubectl describe certificate gushen-lurus-cn-tls -n ai-qtrd

# 2. 手动触发续期
kubectl delete secret gushen-lurus-cn-tls -n ai-qtrd

# 3. 检查cert-manager日志
kubectl logs -n cert-manager deployment/cert-manager -f

# 4. 如果cert-manager失败，使用备用证书
kubectl apply -f /backup/tls-cert-backup.yaml

# 5. 验证证书
curl -I https://gushen.lurus.cn
openssl s_client -connect gushen.lurus.cn:443 -showcerts
```

---

## 10. 安全最佳实践

### 10.1 密钥管理原则

✅ **DO (推荐做法)**:
- 使用强随机密码（至少32字符）
- 定期轮换密钥（按照轮换周期）
- 使用K8s Secrets存储敏感信息
- 备份Secret时加密存储
- 限制Secret的访问权限（RBAC）
- 审计Secret的访问日志
- 在应用中不打印敏感信息到日志

❌ **DON'T (禁止做法)**:
- 不要在代码中硬编码密钥
- 不要将Secret提交到Git仓库
- 不要通过明文渠道传输密钥（邮件/聊天）
- 不要在ConfigMap中存储敏感信息
- 不要使用弱密码或默认密码
- 不要多个环境共用同一密钥
- 不要在日志中输出Secret值

### 10.2 网络隔离

```yaml
# 配置NetworkPolicy限制Pod间通信
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-qtrd-network-policy
  namespace: ai-qtrd
spec:
  podSelector:
    matchLabels:
      app: ai-qtrd-web
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: kube-system  # 只允许Traefik访问
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/component: api
    ports:
    - protocol: TCP
      port: 8000
```

### 10.3 最小权限原则

```yaml
# 为应用创建只读ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ai-qtrd-readonly
  namespace: ai-qtrd

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ai-qtrd-readonly-role
  namespace: ai-qtrd
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]  # 只读Secret

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ai-qtrd-readonly-binding
  namespace: ai-qtrd
subjects:
- kind: ServiceAccount
  name: ai-qtrd-readonly
  namespace: ai-qtrd
roleRef:
  kind: Role
  name: ai-qtrd-readonly-role
  apiGroup: rbac.authorization.k8s.io
```

---

## 11. 联系方式与支持

### 安全事件报告
- **安全邮箱**: security@lurus.cn
- **紧急热线**: [待补充]
- **响应时间**: 1小时内响应严重安全事件

### 技术支持
- **技术邮箱**: support@lurus.cn
- **企业微信**: GuShen运维群
- **工作时间**: 9:00-18:00 (工作日)

---

**文档版本**: v1.0
**最后更新**: 2026-01-22
**维护者**: GuShen Security Team
**下次审查**: 2026-04-22

> ⚠️ **再次提醒 | Reminder**
>
> 本文档包含敏感信息，请务必：
> - 🔒 加密存储
> - 🔒 限制访问
> - 🔒 定期审计
> - 🔒 及时更新
