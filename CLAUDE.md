# Development Workflow | 开发工作流程

**Always use `bun`, not `npm`.**
**始终使用 `bun`,而不是 `npm`。**

```sh
# 1. Make changes | 进行修改

# 2. Typecheck (fast) | 类型检查（快速）
bun run typecheck

# 3. Run tests | 运行测试
bun run test -- -t "test_name"     # Single suite | 单个测试套件
bun run test:file -- "glob"         # Specific files | 特定文件

# 4. Lint before committing | 提交前进行 Lint 检查
bun run lint:file -- "file1.ts"    # Specific files | 特定文件
bun run lint                        # All files | 所有文件

# 5. Before creating PR | 创建 PR 之前
bun run lint:claude && bun run test
```

如果需要在k3s集群上操作，查看C:\Users\Administrator\Desktop\lurus\gushen\README.md