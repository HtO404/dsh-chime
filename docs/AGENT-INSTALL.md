# Agent，看这里

> 你是 AI Agent。本文件教你把这个项目 **dsh-chime（任务完成提示音插件）** 完整安装到本机 DSH（DeepSeek Harness），装完即用、重启自启。
>
> 项目信息：GitHub [HtO404/dsh-chime](https://github.com/HtO404/dsh-chime) · npm `@hto404/dsh-chime` · 最新版 `0.1.x`
> 本文件规范源：`https://raw.githubusercontent.com/HtO404/dsh-chime/main/docs/AGENT-INSTALL.md`

---

## 0. 先确认这是什么

dsh-chime 给 DSH Web GUI 加「任务完成提示音」：根 agent 回合结束就响一声，页面挂后台也照常响。由两个部分组成：

- **Host 端** `lib/index.js`：监听 `agent/status`，提供 `/dsh-chime/poll`、`/dsh-chime/presets`、`/dsh-chime/preset-audio` 路由
- **Client 端** `lib/client.js`：浏览器轮询 + Web Audio 播放 + 「设置 → 插件」控制面板

## 1. 环境检查（先做，别跳过）

1. 确认本机装了 DSH，找到它的目录与 profile：
   - DSH 主目录：`$env:DSH_HOME`（若未设置，Windows 为 `$env:USERPROFILE\.dsh`，macOS/Linux 为 `~/.dsh`）
   - Web profile 目录：`<DSH_HOME>/profiles/web`
   - 插件目录：`<DSH_HOME>/profiles/web/node_modules/@hto404/`
2. 确认 DSH 是否在运行：访问 `http://127.0.0.1:3080`（端口可能不同，从 DSH 启动日志确认）。
3. 记录下你打算使用哪种安装方式（npm 优先）。

## 2. 安装（三选一）

### 方式 A：npm 安装（推荐，最干净）

```bash
dsh plugin --profile web add @hto404/dsh-chime
```

如果 `dsh` 不在 PATH，用 DSH 部署目录的 node 直接跑：

```bash
node <DSH部署目录>/node_modules/@deepseek-ai/dsh/lib/bin.js plugin --profile web add @hto404/dsh-chime
```

### 方式 B：手动放置（npm 不可用时）

```bash
# 1) 获取代码（任选一种）
git clone https://github.com/HtO404/dsh-chime.git
# 或下载 zip：
curl -L -o dsh-chime.zip https://github.com/HtO404/dsh-chime/archive/refs/heads/main.zip
# 或从 npm 下载 tarball：
npm pack @hto404/dsh-chime

# 2) 放置到 profile 的 node_modules
mkdir -p "<DSH_HOME>/profiles/web/node_modules/@hto404"
cp -r <解压出的包目录> "<DSH_HOME>/profiles/web/node_modules/@hto404/dsh-chime"
```

### 方式 C：如果你是 DSH 会话里的 Agent（本机已有 web profile 在跑）

直接编辑用户级补丁 `~/.dsh/cordis.patch.yml`（Windows 为 `%USERPROFILE%\.dsh\cordis.patch.yml`），在文件**末尾**追加（若已有 `id: chime` 行则跳过）：

```yaml
- insert:
    - id: chime
      name: '@hto404/dsh-chime'
```

并把包目录放进 `profiles/web/node_modules/@hto404/dsh-chime/`（方式 B 的第 2 步）。

## 3. 重启 DSH（必须，组合变更只在启动时加载）

1. 停止当前 DSH（终端里 Ctrl+C，或杀掉对应进程）。
2. 用原来的启动方式重启（如 `start-dsh.bat` 或 `dsh web`）。
3. 等待 `http://127.0.0.1:3080` 恢复可访问（最多等 60 秒）。

## 4. 验证（装没装成，看这里）

```bash
# ① 预设列表应返回 JSON，presets 含 10 个音效
curl -s http://127.0.0.1:3080/dsh-chime/presets

# ② 轮询接口应返回 {"pending":0}
curl -s http://127.0.0.1:3080/dsh-chime/poll

# ③ 取一个预设音频应返回 200 + audio/mpeg
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "http://127.0.0.1:3080/dsh-chime/preset-audio?id=01-%E6%AC%A2%E5%BF%AB%E9%93%83%E5%A3%B0.mp3"
```

三条都通过 = 安装成功。最后打开 Web GUI，在 **设置 → 插件** 里确认出现「🔔 任务完成提示音」卡片；让用户点一次「测试声音」解锁浏览器自动播放。

## 5. 常见问题

| 症状 | 原因与修复 |
| --- | --- |
| `/dsh-chime/presets` 404 | 插件未挂载。检查：① 补丁行 `id: chime / name: '@hto404/dsh-chime'` 是否在 `~/.dsh/cordis.patch.yml`；② 包目录是否在 `profiles/web/node_modules/@hto404/dsh-chime/`；③ `package.json` 的 `name` 是否为 `@hto404/dsh-chime`；④ 是否重启过 |
| presets 返回空数组 | 预设目录为空或不存在。首次运行会自动把包内 `assets/sounds/` 播种到 `<DSH_HOME>/dsh-chime/sounds`；也可手动 `mkdir -p <DSH_HOME>/dsh-chime/sounds` 后重启 |
| 设置页没有卡片 | 浏览器缓存旧 bundle：硬刷新（Ctrl+F5）。仍无则确认客户端 bundle 是否被服务：`curl -s http://127.0.0.1:3080/plugins/chime/client.js` 应返回 JS |
| 端口不是 3080 | 从 DSH 启动日志找实际端口，替换上面的验证 URL |

## 6. 完成后的汇报模板

向用户说明：
1. 安装方式（npm / 手动 / 会话内补丁）与是否已重启；
2. 三项验证结果（presets 数量、poll、preset-audio 状态码）；
3. 使用入口：**设置 → 插件 →「任务完成提示音」**，选预设 / 调音量 / 导入自定义声音；
4. 提醒：首次点「测试声音」解锁自动播放。
