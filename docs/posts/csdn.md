# 给 DeepSeek Harness 加个「任务完成提示音」：页面挂后台也能听到（DSH 插件实战）

> 你发了一个 20 分钟的任务，然后切走去看视频了。
> 20 分钟后你回来：任务**早**就跑完了——而你永远不知道，它是什么时候跑完的。
>
> 这就是我写 `dsh-chime` 的原因：让 DSH 在任务跑完的那一刻，替你喊一嗓子。

---

## 一、先说痛点

用 [DeepSeek Harness](https://github.com/deepseek-ai/dsh)（以下简称 DSH）的人都知道：一个长任务往往要跑几分钟、十几分钟，甚至更久。

这段时间你通常不会干等——切去写代码、刷视频、处理别的事。但问题是：

- 页面挂后台时，任务什么时候跑完，**没有任何提示**；
- 你不放心，隔一会儿就切回来刷新一眼任务列表；
- 终于切回来一看：早跑完了，白白浪费了等待的时间。

「盯着任务列表」这件事本身，就是最大的时间黑洞。所以我做了个插件：**任务一完成就响一声提示音，页面挂在后台标签页也照常响**——你只需要听到声音，再回来收结果。

![dsh-chime](https://raw.githubusercontent.com/HtO404/dsh-chime/main/docs/banner.png)

## 二、它是什么

`dsh-chime` 是一个随 DSH 自启的**静态双面插件**（Host + Client），开源免费，Apache-2.0 协议。

| 能力 | 说明 |
| --- | --- |
| 🔔 后台也响 | 用 Web Audio 播放，页面切走、标签页挂后台，照常响 |
| 🎵 10 个精选预设 | 开箱即用，首次运行自动播种到预设目录 |
| 📂 自定义声音 | 导入自己的 wav / mp3 / ogg |
| 🔊 音量调节 | 0~100% 滑杆，松手即试听 |
| ⚙️ 设置面板 | 在「设置 → 插件」里，一处设置、处处生效 |
| ♻️ 重启自启 | 静态插件随组合挂载，DSH 启动即自动拉起 |

## 三、安装（三选一）

### 方式一：npm 安装（推荐）

```powershell
dsh plugin --profile web add @hto404/dsh-chime
```

### 方式二：本地目录

```powershell
dsh plugin --profile web add link:C:\path\to\dsh-chime
```

### 方式三：手动

把 `dsh-chime` 放进 web profile 的 `node_modules/@hto404/` 下，在 `~/.dsh/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: chime
      name: '@hto404/dsh-chime'
```

然后重启 DSH（`start-dsh.bat`）即可。

## 四、使用

![设置面板](https://raw.githubusercontent.com/HtO404/dsh-chime/main/docs/panel.png)

1. 重启 DSH 后打开 Web GUI；
2. 进入 **设置 → 插件 →「🔔 任务完成提示音」**；
3. 选预设声音、导入自定义声音、拖音量、或一键静音——全部即时生效并保存；
4. 之后任意任务跑完（哪怕页面在后台）都会响提示音。

> 首次如果没听到声音：点一次「测试声音」即可解锁浏览器的自动播放策略，之后一切正常。

演示动图（[在线试玩 demo.html](https://github.com/HtO404/dsh-chime/blob/main/docs/demo.html)）：

![演示动画](https://raw.githubusercontent.com/HtO404/dsh-chime/main/docs/demo.gif)

## 五、工作原理

![工作流程](https://raw.githubusercontent.com/HtO404/dsh-chime/main/docs/flow.png)

| 角色 | 做什么 |
| --- | --- |
| **Host 端** `lib/index.js` | 监听 `agent/status`，根 agent 转为 `idle` 时计入待通知队列；提供 `/dsh-chime/poll`、`/dsh-chime/presets`、`/dsh-chime/preset-audio` 三个路由 |
| **Client 端** `lib/client.js` | 浏览器每 2 秒轮询 `/dsh-chime/poll`，有完成通知就用 Web Audio 播放当前选中的声音；控制面板注册在 `settings.plugin.item` 插槽 |

几个值得展开的设计决策：

**为什么用 Web Audio 而不是 `<audio>` 标签？** 因为 `AudioContext` 的播放不依赖页面可见性——这正是「后台标签页也能响」的关键。`<audio>` 在隐藏标签页里会被浏览器节流甚至暂停，而 Web Audio 不会。

**为什么用 2 秒轮询而不是 SSE / WebSocket？** 提示音这种「丢了也无所谓、最多晚 2 秒」的通知，用最朴素的轮询最省事：无需维持长连接、无需处理断线重连、部署零成本。复杂度是成本，简单是美德。

**为什么只响根 agent？** 判定规则只响应**根 agent（主会话）**的完成——子任务（subagent）的中间完成不响。所以一个长任务里十几个子 agent 跑完也不会吵你，只有最终结果出来才报信。

## 六、预设音效与自定义

预设目录：`$DSH_HOME/dsh-chime/sounds`（默认 `~/.dsh/dsh-chime/sounds`）。首次运行自动把包内 10 个音效播种进去；想加预设，把 mp3/wav/ogg 丢进该目录，重启插件即自动出现在下拉列表。

| 预设 | 气质 |
| --- | --- |
| 01-欢快铃声 | 轻盈悦耳，像收到一条好消息 |
| 02-双声蜂鸣 | 经典电子提示，干脆不拖泥带水 |
| 03-消息弹出 | 轻巧短促，存在感刚好 |
| 04-确认音 | 沉稳肯定，任务收尾的仪式感 |
| 05-数字短音 | 利落的一声，毫不含糊 |
| 06-快速叮咚 | 清脆响亮，最不容易错过 |
| 07-气泡通知 | 活泼俏皮，有点可爱 |
| 08-清亮提示音 | 通透悠扬，适合喜欢柔和的人 |
| 09-吉他通知 | 温暖和弦，像有人在喊你 |
| 10-游戏成功 | 上扬的胜利感，任务达成！ |

内置音效来自 [Mixkit Free Sound Effects](https://mixkit.co/free-sound-effects/alerts/)，遵循 [Mixkit License](https://mixkit.co/license/)（免费可商用）。

## 七、常见问题

**Q：任务跑完了，为什么没有响？**

依次检查：① 是否点了「静音」、音量是否被拖到了 0；② 该任务是否属于**子任务（subagent）**——只在根 agent 完成时报信；③ 浏览器是否拦截了自动播放——点一次「测试声音」解锁。

**Q：页面在后台标签页能听到吗？**

能。Web Audio 播放不依赖页面可见性，这正是 dsh-chime 存在的意义。

**Q：想换自己的提示音？**

两种方式：在设置面板点「导入声音」选本地音频；或把 mp3/wav/ogg 文件放进预设目录，重启插件后它自动出现在下拉列表里。

**Q：重启 DSH 后还需要手动开启吗？**

不需要。dsh-chime 是随组合挂载的静态插件，DSH 启动即自动拉起，声音设置持久保存。

## 八、开源与链接

- GitHub：<https://github.com/HtO404/dsh-chime>
- npm：<https://www.npmjs.com/package/@hto404/dsh-chime>
- 主题标签：<https://github.com/topics/dsh-plugin>
- 协议：Apache-2.0

如果你也想让 Agent 帮你装，把 [AGENT-INSTALL.md](https://github.com/HtO404/dsh-chime/blob/main/docs/AGENT-INSTALL.md) 丢给任意 AI Agent——开头就是「Agent，看这里」，照着做就能一键装好。

**如果它帮你少盯了一次任务——点个 ⭐，让更多被 agent 遛过的人看到它。**

> 工具的意义，是让你可以把注意力放回人身上。
> 盯任务列表的那双眼睛，可以歇一歇了。

---

> 提示：文中图片若显示失败（外链防盗链），请将仓库 `docs/` 目录下的同名图片（`banner.png`、`panel.png`、`flow.png`、`demo.gif`）上传到本文。
