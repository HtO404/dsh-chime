<div align="center">

# dsh-chime 🔔

### 任务跑完的那一刻，它替你喊一嗓子。

`dsh-chime` 是 [DeepSeek Harness](https://github.com/deepseek-ai/dsh)（DSH）Web GUI 的任务完成提示音插件：根 agent 回合结束就响一声——**页面挂在后台标签页也照常响**。你不需要盯着任务列表，它会在对的那一秒提醒你。

[![npm version](https://img.shields.io/npm/v/@hto404/dsh-chime)](https://www.npmjs.com/package/@hto404/dsh-chime)
[![npm downloads](https://img.shields.io/npm/dm/@hto404/dsh-chime)](https://www.npmjs.com/package/@hto404/dsh-chime)
[![license](https://img.shields.io/github/license/HtO404/dsh-chime)](LICENSE)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)
[![platform](https://img.shields.io/badge/platform-web-6366f1)](https://github.com/HtO404/dsh-chime)

</div>

---

> 你发了一个 20 分钟的任务，然后切走去看视频了。
> 20 分钟后你回来：任务**早**就跑完了——而你永远不知道，它是什么时候跑完的。
>
> —— dsh-chime，就是来补上这一秒的。

---

## 为什么需要它

跑 agent 的人，都经历过同一种焦虑：

- **挂后台**：任务在跑，人去看视频、去做饭了——什么时候完？不知道。
- **切标签页**：页面在后台，错过完成的瞬间，就得再傻等下一轮。
- **多任务并行**：几个任务一起跑，哪个先完、哪个卡住，全靠肉眼盯。

dsh-chime 的做法很简单：**根 agent 回合结束的那一刻，浏览器响一声**。子任务的中间完成不响，只在你真正等的那次结束时报信——不吵，不糊弄。

## 特性

- **后台也能听到** —— Web Audio 合成播放，标签页挂后台照常响
- **10 个精选预设音效** —— 欢快铃声 / 双声蜂鸣 / 消息弹出 / 确认音 / 数字短音 / 快速叮咚 / 气泡通知 / 清亮提示音 / 吉他通知 / 游戏成功
- **自定义导入** —— 支持 wav / mp3 / ogg 等格式，换自己的声音
- **音量自由** —— 0~100% 滑杆，松手即试听
- **一处设置，处处生效** —— 控制面板在「设置 → 插件」，音量 / 所选声音 / 静音持久保存
- **重启自动拉起** —— 静态 host + client 插件，随 DSH 自启，不依赖会话、不用手动运行

## 30 秒上手

```powershell
# 方式一：本地安装（推荐先试用）
dsh plugin --profile web add link:C:\path\to\dsh-chime

# 方式二：npm 安装（发布后）
dsh plugin --profile web add @hto404/dsh-chime
```

也可以手动安装：把 `dsh-chime` 放进 web profile 的 `node_modules/@linxin666/` 下，在 `~/.dsh/cordis.patch.yml` 追加下面两行，然后重启 DSH：

```yaml
- insert:
    - id: chime
      name: '@hto404/dsh-chime'
```

重启后打开 **设置 → 插件 →「🔔 任务完成提示音」**，选声音、调音量、点「测试声音」——完事。之后任意任务跑完（哪怕页面在后台），它都会响。

## 它是怎么工作的

![工作流程](docs/flow.svg)

| 角色 | 做什么 |
| --- | --- |
| Host 端 `lib/index.js` | 监听 `agent/status`，根 agent 转为 `idle` 时计入待通知队列；提供 `/dsh-chime/poll`、`/dsh-chime/presets`、`/dsh-chime/preset-audio` 三个路由 |
| Client 端 `lib/client.js` | 浏览器每 2 秒轮询一次 `/dsh-chime/poll`，有完成通知就用 Web Audio 播放当前选中的声音；控制面板注册在 `settings.plugin.item` 插槽 |

判定规则：**只响应根 agent（主会话）的完成**，子任务（subagent）的中间完成不响——所以长任务里十几个子 agent 跑完也不会吵你，只有最终结果出来才报信。

## 预设音效

预设目录：`$DSH_HOME/dsh-chime/sounds`（默认 `~/.dsh/dsh-chime/sounds`）。首次运行会自动把包内自带的 10 个音效播种进去；想加预设，把 mp3/wav/ogg 文件丢进该目录，重启插件即自动出现在下拉列表。

内置音效来自 [Mixkit Free Sound Effects](https://mixkit.co/free-sound-effects/alerts/)，遵循 [Mixkit License](https://mixkit.co/license/)（免费可商用）。

## 给你的一句话

> 工具的意义，是让你可以把注意力放回人身上。
> 盯任务列表的那双眼睛，可以歇一歇了。

如果它帮你少盯了一次任务——**点个 ⭐**，让更多被 agent 遛过的人看到它。

## License

[Apache-2.0](LICENSE)
