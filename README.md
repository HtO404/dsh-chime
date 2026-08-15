# dsh-chime 🔔

任务完成提示音插件（DSH / DeepSeek Harness Web GUI）。

当一次任务（根 agent 回合）跑完时，在浏览器里播放提示音——**页面切到后台标签页也照常响**，不用一直盯着页面。

Task-completion notification chime for the DSH web GUI. Plays a sound when a root agent turn finishes — **works while the tab is in the background**.

## 功能 Features

- 🔔 任务（根 agent 回合）完成即响；子任务（subagent）中间完成不响，避免噪音
- 🎵 内置 **10 个默认预设音效**（欢快铃声 / 双声蜂鸣 / 消息弹出 / 确认音 / 数字短音 / 快速叮咚 / 气泡通知 / 清亮提示音 / 吉他通知 / 游戏成功）
- 🔊 音量滑杆 0~100%（松手即试听），设置持久保存
- 📂 自定义音频导入（wav / mp3 / ogg 等，≤1.5MB）
- 🔇 静音开关、测试声音
- ⚙️ 交互面板位于 **设置 → 插件 → 任务完成提示音**
- 💾 重启 DSH 后自动拉起（持久化静态插件，非进程内动态插件）

## 安装 Install

### 方式一：本地包（推荐先试用）

```powershell
# 把仓库 clone 或下载到本地，然后：
dsh plugin --profile web add link:C:\path\to\dsh-chime
```

### 方式二：手动（编辑用户级补丁）

把 `dsh-chime` 目录放到 web profile 的 `node_modules/@linxin666/` 下，并在 `~/.dsh/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: chime
      name: '@linxin666/dsh-chime'
```

然后重启 DSH（`start-dsh.bat`）。

### 方式三：npm（发布后）

```powershell
dsh plugin --profile web add @linxin666/dsh-chime
```

## 使用 Usage

1. 重启 DSH 后打开 Web GUI。
2. **设置 → 插件** → 找到「🔔 任务完成提示音」卡片。
3. 选择预设声音 / 导入自定义声音 / 调节音量 / 静音。
4. 之后任意任务跑完（即使页面在后台）都会响提示音。

## 预设声音 Preset sounds

预设目录：`$DSH_HOME/dsh-chime/sounds`（默认 `~/.dsh/dsh-chime/sounds`）。

- 首次运行会自动把包内自带的 10 个音效播种到该目录。
- 想加预设：把 mp3/wav/ogg 文件丢进该目录，重启插件即自动出现在下拉列表。

内置 10 个音效来自 [Mixkit Free Sound Effects](https://mixkit.co/free-sound-effects/alerts/)，适用 [Mixkit License](https://mixkit.co/license/)（免费可商用，详见仓库 README 与本包 LICENSE）。

## 工作原理 How it works

- **Host 端**（`lib/index.js`）：监听 `agent/status`，根 agent 转为 `idle` 时计入待通知队列；提供 `/dsh-chime/poll`、`/dsh-chime/presets`、`/dsh-chime/preset-audio` 三个路由。
- **Client 端**（`lib/client.js`）：浏览器每 2 秒轮询一次 `/dsh-chime/poll`，有完成通知就用 Web Audio 播放当前选中的声音；控制面板注册在 `settings.plugin.item` 插槽。

## License

Apache-2.0
