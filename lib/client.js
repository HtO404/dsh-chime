window.__ModuleLoader__.load({
  id: "@hto404/dsh-chime",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let React = require("react");

    // ---- persisted settings (same keys as the dynamic-plugin era, so existing
    //      volume / preset / custom-sound choices carry over seamlessly) ----
    var PREFS_KEY = "dsh.chime.prefs.v1";
    var CUSTOM_KEY = "dsh.chime.custom.v1";
    var LEGACY_KEY = "dsh.chime.settings.v1";
    var MAX_CUSTOM_BYTES = 1500000;

    var sound = { volume: 70, muted: false, presetId: null, dataUrl: null, name: null };
    try {
      var rawPrefs = localStorage.getItem(PREFS_KEY);
      if (rawPrefs) {
        var p = JSON.parse(rawPrefs);
        if (p && typeof p === "object") {
          if (typeof p.volume === "number" && p.volume >= 0 && p.volume <= 100) sound.volume = p.volume;
          if (typeof p.muted === "boolean") sound.muted = p.muted;
          if (typeof p.presetId === "string" && p.presetId) sound.presetId = p.presetId;
        }
      } else {
        var rawLegacy = localStorage.getItem(LEGACY_KEY);
        if (rawLegacy) {
          var pl = JSON.parse(rawLegacy);
          if (pl && typeof pl === "object") {
            if (typeof pl.volume === "number" && pl.volume >= 0 && pl.volume <= 100) sound.volume = pl.volume;
            if (typeof pl.muted === "boolean") sound.muted = pl.muted;
            if (typeof pl.presetId === "string" && pl.presetId) sound.presetId = pl.presetId;
            if (typeof pl.dataUrl === "string" && pl.dataUrl) {
              sound.dataUrl = pl.dataUrl;
              sound.name = (typeof pl.name === "string" && pl.name) ? pl.name : "自定义声音";
            }
          }
        }
      }
      var rawCustom = localStorage.getItem(CUSTOM_KEY);
      if (rawCustom) {
        var c = JSON.parse(rawCustom);
        if (c && typeof c === "object" && typeof c.dataUrl === "string" && c.dataUrl) {
          sound.dataUrl = c.dataUrl;
          sound.name = (typeof c.name === "string" && c.name) ? c.name : "自定义声音";
        }
      }
    } catch (e) { /* storage unavailable */ }

    function saveSettings() {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: sound.volume, muted: sound.muted, presetId: sound.presetId }));
      } catch (e) { /* storage unavailable */ }
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify({ dataUrl: sound.dataUrl, name: sound.name }));
      } catch (e) { /* quota exceeded — prefs still saved */ }
    }

    // ---- shared re-render ----
    var rerender = new Set();
    function notify() {
      for (var _f of Array.from(rerender)) { try { _f() } catch (e) { /* ignore */ } }
    }

    var lastError = null;
    function setError(msg) { lastError = msg || null; notify(); }

    // ---- host fetch helpers (same origin HTTP routes from the host half) ----
    function pollHost() {
      return fetch("/dsh-chime/poll").then(function (r) { return r.json(); }).catch(function () { return null; });
    }
    function fetchPresets() {
      return fetch("/dsh-chime/presets").then(function (r) { return r.json(); }).catch(function () { return null; });
    }
    function fetchPresetAudio(id) {
      return fetch("/dsh-chime/preset-audio?id=" + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .catch(function () { return null; });
    }

    // ---- audio ----
    var audioCtx = null;
    var cachedBuffer = null;
    var bufferCache = new Map();
    var AC = (typeof window !== "undefined" && window.AudioContext)
      ? window.AudioContext
      : ((typeof window !== "undefined" && window.webkitAudioContext) ? window.webkitAudioContext : null);

    function ensureCtx() {
      if (!AC) return null;
      if (!audioCtx) {
        try { audioCtx = new AC(); } catch (e) { return null; }
      }
      return audioCtx;
    }

    function resumeIfNeeded(actx) {
      if (actx.state === "suspended") { try { actx.resume(); } catch (e) { /* autoplay policy */ } }
    }

    function dataUrlToBuffer(dataUrl) {
      if (typeof atob !== "function") return null;
      var comma = dataUrl.indexOf(",");
      if (comma < 0) return null;
      try {
        var bin = atob(dataUrl.slice(comma + 1));
        var len = bin.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      } catch (e) {
        console.error("dsh-chime: atob failed", e);
        return null;
      }
    }

    function decodeBuffer(arrayBuffer) {
      var actx = ensureCtx();
      if (!actx || !arrayBuffer) return Promise.resolve(null);
      return actx.decodeAudioData(arrayBuffer).catch(function () { return null; });
    }

    function playBuffer(buffer, vol) {
      var actx = ensureCtx();
      if (!actx || !buffer) return;
      try {
        resumeIfNeeded(actx);
        var src = actx.createBufferSource();
        src.buffer = buffer;
        var gain = actx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, vol));
        src.connect(gain);
        gain.connect(actx.destination);
        src.start();
      } catch (err) { console.error("dsh-chime: play failed", err); }
    }

    function playDefaultChime(count, vol) {
      var actx = ensureCtx();
      if (!actx) return;
      try {
        resumeIfNeeded(actx);
        var now = actx.currentTime;
        var seq = count > 1 ? [880, 1108.73, 1318.51] : [880, 1318.51];
        for (var k = 0; k < seq.length; k++) {
          var t = now + k * 0.18;
          var osc = actx.createOscillator();
          var g = actx.createGain();
          osc.type = "sine";
          osc.frequency.value = seq[k];
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.22 * Math.max(0, Math.min(1, vol)), t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
          osc.connect(g);
          g.connect(actx.destination);
          osc.start(t);
          osc.stop(t + 0.6);
        }
      } catch (err) { console.error("dsh-chime: chime failed", err); }
    }

    function loadCustomBuffer() {
      if (!sound.dataUrl) return Promise.resolve(null);
      if (cachedBuffer) return Promise.resolve(cachedBuffer);
      return decodeBuffer(dataUrlToBuffer(sound.dataUrl)).then(function (buf) {
        cachedBuffer = buf;
        return buf;
      });
    }

    function loadPresetBuffer(id) {
      if (bufferCache.has(id)) return Promise.resolve(bufferCache.get(id));
      return fetchPresetAudio(id)
        .then(function (ab) { return ab ? decodeBuffer(ab) : null; })
        .then(function (buf) { if (buf) bufferCache.set(id, buf); return buf; })
        .catch(function () { return null; });
    }

    function playNow(count) {
      if (sound.muted) return;
      var vol = Math.max(0, Math.min(1, (sound.volume || 0) / 100));
      if (vol <= 0.001) return;
      setError(null);
      if (sound.dataUrl) {
        loadCustomBuffer().then(function (buf) {
          if (buf) playBuffer(buf, vol);
          else { setError("自定义音频解码失败（已回退内置提示音）"); playDefaultChime(count, vol); }
        });
      } else if (sound.presetId) {
        loadPresetBuffer(sound.presetId).then(function (buf) {
          if (buf) playBuffer(buf, vol);
          else { setError("预设音频加载失败（已回退内置提示音）"); playDefaultChime(count, vol); }
        });
      } else {
        playDefaultChime(count, vol);
      }
    }

    // ---- poll the host for completed root agents (works in background tabs) ----
    function startPolling() {
      window.setInterval(function () {
        pollHost().then(function (res) {
          var pending = (res && typeof res === "object" && typeof res.pending === "number") ? res.pending : 0;
          if (pending > 0) playNow(pending);
        });
      }, 2000);
    }

    // ---- UI state ----
    var presets = [];
    var soundsDir = null;
    var ui = { fileInput: null };

    // ---- styles ----
    var settingsCardStyle = { display: "flex", flexDirection: "column", gap: "10px", padding: "12px 14px", borderRadius: "10px", fontSize: "13px", border: "1px solid var(--color-border, rgba(128,128,128,0.25))", background: "var(--color-card-bg, rgba(128,128,128,0.06))" };
    var btnStyle = { padding: "3px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid var(--color-border, rgba(128,128,128,0.4))", background: "transparent", color: "inherit" };
    var rowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
    var selectStyle = { fontSize: "12px", padding: "2px 4px", borderRadius: "6px", maxWidth: "180px" };
    var hintStyle = { fontSize: "12px", opacity: 0.6 };
    var errorStyle = { fontSize: "12px", color: "#e5484d", opacity: 0.9 };
    var ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];

    function onFilePicked(file) {
      if (!file || typeof FileReader === "undefined") return;
      if (file.size > MAX_CUSTOM_BYTES) {
        setError("音频文件过大（超过 1.5MB），请换一个更小的音频");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        sound.dataUrl = String(reader.result);
        sound.name = file.name || "自定义声音";
        sound.presetId = null;
        saveSettings();
        notify();
        playNow(1);
      };
      reader.onerror = function () { console.error("dsh-chime: read file failed"); };
      reader.readAsDataURL(file);
    }

    function onSelectSound(v) {
      if (v === "__custom__") return;
      sound.presetId = v || null;
      sound.dataUrl = null;
      sound.name = null;
      saveSettings();
      notify();
      if (sound.presetId) playNow(1);
    }

    function toggleMute() {
      sound.muted = !sound.muted;
      saveSettings();
      notify();
    }

    function buildControls() {
      return function () {
        var _useState = React.useState(0), _force = _useState[1];
        React.useEffect(function () { rerender.add(_force); return function () { rerender.delete(_force); }; }, []);

        var _useState2 = React.useState(String(sound.volume)), localVol = _useState2[0], setLocalVol = _useState2[1];
        React.useEffect(function () { setLocalVol(String(sound.volume)); }, [sound.volume]);

        var label = "🔔 内置提示音";
        if (sound.muted) label = "🔇 提示音已静音";
        else if (sound.volume <= 0) label = "🔕 音量 0%（静音）";
        else if (sound.dataUrl) label = "🔔 自定义：" + (sound.name || "声音");
        else if (sound.presetId) {
          var found = null;
          for (var i = 0; i < presets.length; i++) if (presets[i].id === sound.presetId) { found = presets[i]; break; }
          label = "🔔 预设：" + (found ? found.name : sound.presetId);
        }

        var selectValue = sound.dataUrl ? "__custom__" : (sound.presetId || "");
        var options = [React.createElement("option", { key: "", value: "" }, "内置双音提示音")];
        for (var j = 0; j < presets.length; j++) {
          options.push(React.createElement("option", { key: presets[j].id, value: presets[j].id }, presets[j].name));
        }
        if (sound.dataUrl) options.push(React.createElement("option", { key: "__custom__", value: "__custom__" }, "自定义：" + (sound.name || "声音")));

        var picker = React.createElement("input", {
          ref: function (el) { ui.fileInput = el; },
          type: "file", accept: "audio/*", style: { display: "none" },
          onChange: function (e) { var f = e.target.files && e.target.files[0]; onFilePicked(f); e.target.value = ""; },
        });

        var selectEl = React.createElement("select", { value: selectValue, onChange: function (e) { onSelectSound(e.target.value); }, style: selectStyle }, options);
        var testBtn = React.createElement("button", { style: btnStyle, onClick: function () { playNow(1); } }, "测试声音");
        var importBtn = React.createElement("button", { style: btnStyle, onClick: function () { if (ui.fileInput) ui.fileInput.click(); } }, "导入声音");
        var muteBtn = React.createElement("button", { style: btnStyle, onClick: toggleMute }, sound.muted ? "恢复声音" : "静音");
        var volumeRow = React.createElement("div", { style: rowStyle },
          React.createElement("span", null, "音量"),
          React.createElement("input", {
            type: "range", min: "0", max: "100", value: localVol,
            onChange: function (e) {
              var v = e.target.value;
              setLocalVol(v);
              sound.volume = Number(v) || 0;
              saveSettings();
            },
            onPointerUp: function () { notify(); playNow(1); },
            onKeyUp: function (e) { if (ARROW_KEYS.indexOf(e.key) !== -1) { notify(); playNow(1); } },
            style: { width: "110px" },
          }),
          React.createElement("span", null, localVol + "%"),
        );
        var errorLine = lastError ? React.createElement("div", { style: errorStyle }, "⚠ " + lastError) : null;

        return React.createElement("div", { style: settingsCardStyle },
          React.createElement("div", { style: rowStyle },
            React.createElement("span", { style: { fontWeight: 600 } }, "🔔 任务完成提示音"),
            React.createElement("span", { style: hintStyle }, label),
          ),
          React.createElement("div", { style: rowStyle },
            React.createElement("span", null, "声音"),
            selectEl,
            testBtn,
            importBtn,
            muteBtn,
            picker,
          ),
          volumeRow,
          errorLine,
          React.createElement("div", { style: hintStyle }, "预设目录：" + (soundsDir || "（获取中…）") + "（放入 mp3/wav/ogg 文件后重启插件即可加入列表）"),
        );
      };
    }

    // ---- plugin entry ----
    var inject = ["slots"];

    function apply(ctx) {
      startPolling();

      fetchPresets().then(function (res) {
        var list = (res && Array.isArray(res.presets)) ? res.presets : [];
        presets = list.filter(function (p) { return p && typeof p.id === "string" && typeof p.name === "string"; });
        if (res && typeof res.soundsDir === "string" && res.soundsDir) soundsDir = res.soundsDir;
        if (sound.presetId && !presets.some(function (p) { return p.id === sound.presetId; })) {
          sound.presetId = null;
          saveSettings();
        }
        if (sound.presetId) loadPresetBuffer(sound.presetId);
        notify();
      }).catch(function () { /* host routes unavailable yet */ });

      var slots = (typeof ctx.get === "function") ? ctx.get("slots") : ctx.slots;
      if (!slots) return;

      slots.inject("settings.plugin.item", function () {
        return slots.register(
          { name: "settings.plugin.item", id: "task-chime", label: "任务完成提示音", order: 100 },
          buildControls()
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;

    return module.exports;
  }
});
