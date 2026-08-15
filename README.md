<div align="center">

![dsh-chime](docs/banner.svg)

[![npm version](https://img.shields.io/npm/v/@hto404/dsh-chime?style=flat-square&label=npm)](https://www.npmjs.com/package/@hto404/dsh-chime)
[![npm downloads](https://img.shields.io/npm/dm/@hto404/dsh-chime?style=flat-square&label=downloads)](https://www.npmjs.com/package/@hto404/dsh-chime)
[![GitHub stars](https://img.shields.io/github/stars/HtO404/dsh-chime?style=flat-square&label=stars)](https://github.com/HtO404/dsh-chime)
[![license](https://img.shields.io/github/license/HtO404/dsh-chime?style=flat-square)](LICENSE)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f?style=flat-square)](https://github.com/topics/dsh-plugin)
[![platform](https://img.shields.io/badge/platform-web-6366f1?style=flat-square)](https://github.com/HtO404/dsh-chime)

**A task-completion chime for the [DeepSeek Harness](https://github.com/deepseek-ai/dsh) (DSH) Web GUI.**

The moment a root agent turn finishes, it rings — **even while the tab is in the background**. Stop watching the task list; it will tell you the second you're done.

</div>

---

### Contents

[Features](#features) · [Quick Start](#quick-start) · [Usage](#usage) · [How It Works](#how-it-works) · [Presets](#presets) · [FAQ](#faq) · [Support](#support) · [Agent Install](#agent-install)

---

> You kicked off a 20-minute task, then switched tabs to watch a video.
> 20 minutes later you come back: the task finished **long** ago — and you have no idea when.
>
> — dsh-chime exists to fill that one second.

---

## Features

<table>
  <tr>
    <td width="33%" align="center"><b>⏱ Rings in the background</b><br/><sub>Web Audio playback; works when the tab is hidden</sub></td>
    <td width="33%" align="center"><b>🎵 10 curated presets</b><br/><sub>Seeded on first run, ready out of the box</sub></td>
    <td width="33%" align="center"><b>📂 Bring your own sound</b><br/><sub>wav / mp3 / ogg — use your own audio</sub></td>
  </tr>
  <tr>
    <td width="33%" align="center"><b>🔊 Volume control</b><br/><sub>0–100% slider, preview on release</sub></td>
    <td width="33%" align="center"><b>⚙️ One panel, everything</b><br/><sub>Settings → Plugins, preferences persist</sub></td>
    <td width="33%" align="center"><b>♻️ Survives restarts</b><br/><sub>Auto-starts with DSH; settings shared across Web & DSH Desktop</sub></td>
  </tr>
</table>

---

## Quick Start

### Option 1 — npm

```powershell
dsh plugin --profile web add @hto404/dsh-chime
```

### Option 2 — local folder

```powershell
dsh plugin --profile web add link:C:\path\to\dsh-chime
```

### Option 3 — manual

Place `dsh-chime` under `node_modules/@hto404/` in your web profile, then append to `~/.dsh/cordis.patch.yml`:

```yaml
- insert:
    - id: chime
      name: '@hto404/dsh-chime'
```

Restart DSH (`start-dsh.bat`).

**Using [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop)?** Install into the desktop profile instead:

```powershell
dsh plugin --profile desktop add @hto404/dsh-chime
```

Settings are stored host-side (`~/.dsh/dsh-chime/prefs.json`), so your volume, mute state and chosen sound are **shared across every environment** — switch between the Web profile and DSH Desktop without re-configuring.

---

## Usage

![Settings panel](docs/panel.svg)

**Live demo** — try the controls yourself: [docs/demo.html](docs/demo.html)

![Demo animation](docs/demo.gif)

1. Restart DSH and open the Web GUI.
2. Go to **Settings → Plugins →「🔔 任务完成提示音」**.
3. Pick a preset, import your own sound, drag the volume, or mute — all applied and saved instantly.
4. From then on, every finished task rings — even in a background tab.

> Didn't hear anything the first time? Click **测试声音** once to unlock the browser's autoplay policy — everything works after that.

---

## How It Works

![Flow](docs/flow.svg)

| Role | What it does |
| --- | --- |
| **Host** `lib/index.js` | Listens to `agent/status`; queues a notification when a root agent turns `idle`; serves `/dsh-chime/poll`, `/dsh-chime/presets`, `/dsh-chime/preset-audio` |
| **Client** `lib/client.js` | Polls `/dsh-chime/poll` every 2s; plays the selected sound with Web Audio; the control panel lives in the `settings.plugin.item` slot |

**Rule of thumb**: only **root agents (main sessions)** trigger the chime — intermediate subagent completions don't. A long task with a dozen subagents won't ping you mid-way; you hear it only when the final result lands.

---

## Presets

Preset directory: `$DSH_HOME/dsh-chime/sounds` (default `~/.dsh/dsh-chime/sounds`). The 10 bundled sounds are seeded there on first run. Drop any mp3/wav/ogg into that folder and restart the plugin to add your own.

| Preset | Vibe |
| --- | --- |
| 01-欢快铃声 · Cheerful Bell | Light and pleasant, like good news arriving |
| 02-双声蜂鸣 · Double Beep | Classic electronic, no-nonsense |
| 03-消息弹出 · Message Pop | Short and light, presence without noise |
| 04-确认音 · Confirmation | Steady and assured, the ritual of finishing |
| 05-数字短音 · Quick Tone | One crisp note, unmistakable |
| 06-快速叮咚 · Fast Ding | Bright and loud, hardest to miss |
| 07-气泡通知 · Bubble Pop | Playful, a little cute |
| 08-清亮提示音 · Clear Chime | Airy and mellow, for softer tastes |
| 09-吉他通知 · Guitar Alert | A warm chord, like someone calling you |
| 10-游戏成功 · Game Win | A rising sense of victory — task done! |

Bundled sounds come from [Mixkit Free Sound Effects](https://mixkit.co/free-sound-effects/alerts/) under the [Mixkit License](https://mixkit.co/license/) (free for commercial use).

---

## FAQ

<details>
<summary><b>The task finished but nothing rang — why?</b></summary>

Check, in order:
1. Is **Mute** on, or the volume dragged to 0?
2. Was it a **subagent**? dsh-chime only rings for root agents (main sessions).
3. Did the browser block autoplay? Click **测试声音** once to unlock it.

</details>

<details>
<summary><b>Can I hear it while the tab is in the background?</b></summary>

Yes. Web Audio playback doesn't depend on page visibility — that's the whole point of dsh-chime.

</details>

<details>
<summary><b>How do I use my own sound?</b></summary>

Two ways: click **导入声音** in the panel and pick a local audio file, or drop an mp3/wav/ogg into the preset directory — it appears in the dropdown after a plugin restart.

</details>

<details>
<summary><b>Do I need to re-enable it after a DSH restart?</b></summary>

No. dsh-chime is a static, composition-mounted plugin — it starts automatically with DSH, and your sound settings persist.

</details>

<details>
<summary><b>My settings don't carry over between the Web profile and DSH Desktop?</b></summary>

They do — since v0.1.2 the plugin keeps its preferences host-side in `~/.dsh/dsh-chime/prefs.json` (exposed via `/dsh-chime/prefs`), so volume, mute and the chosen sound are shared by every environment that mounts the plugin. If an old page still shows defaults, reload the page (or restart DSH Desktop).

</details>

---

## Agent Install

Running an AI agent and want it to install this plugin for you? Point it at the instructions:

👉 **[AGENT-INSTALL.md](docs/AGENT-INSTALL.md)** — starts with "Agent，看这里" and walks any agent through installing this repo into DSH end-to-end.

---

## Support

<div align="center">

**If it saved you from one extra glance at the task list —**

give it a ⭐ so more people who've been walked around by their agents find it.

> The point of a tool is to give your attention back to yourself.
> The eyes that used to watch the task list can rest now.

</div>

---

<div align="center">

[Apache-2.0](LICENSE) · Made for [DeepSeek Harness](https://github.com/deepseek-ai/dsh) · Sounds from [Mixkit](https://mixkit.co)

</div>
