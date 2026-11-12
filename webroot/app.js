// Uperf-Re WebUI 核心控制逻辑
let _cmdSeq = 0;
let _currentConfigObj = null;
let _refreshTimer = null;

// 1. KernelSU / APatch 异步非阻塞执行桥接
function ksuExec(cmd) {
  return new Promise((resolve) => {
    if (typeof window.ksu !== "undefined") {
      const cbName = `__ksu_cb_${Date.now()}_${_cmdSeq++}`;
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          delete window[cbName];
          try {
            const out = window.ksu.exec(cmd);
            if (typeof out === "string") {
              resolve({ code: 0, stdout: out, stderr: "" });
              return;
            }
          } catch (_) {}
          resolve({ code: -1, stdout: "", stderr: "Timeout" });
        }
      }, 5000);

      window[cbName] = (code, stdout, stderr) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          delete window[cbName];
          resolve({
            code: typeof code === "number" ? code : 0,
            stdout: stdout ?? "",
            stderr: stderr ?? ""
          });
        }
      };

      try {
        window.ksu.exec(cmd, "{}", cbName);
      } catch (e1) {
        try {
          window.ksu.exec(cmd, cbName);
        } catch (e2) {
          try {
            const out = window.ksu.exec(cmd);
            resolved = true;
            clearTimeout(timer);
            delete window[cbName];
            resolve({ code: 0, stdout: typeof out === "string" ? out : "", stderr: "" });
          } catch (e3) {
            resolved = true;
            clearTimeout(timer);
            delete window[cbName];
            resolve({ code: -1, stdout: "", stderr: String(e3) });
          }
        }
      }
      return;
    }

    // 浏览器开发调试预览环境
    console.log("[Dev Preview] Executing:", cmd);
    setTimeout(() => {
      if (cmd.includes("cur_powermode.txt")) {
        resolve({ code: 0, stdout: "balance\n", stderr: "" });
      } else if (cmd.includes("uperf.json")) {
        resolve({
          code: 0,
          stdout: JSON.stringify({
            modules: {
              cpu: { slowLimitPower: 5.0, fastLimitPower: 8.0, margin: 0.25, burst: 0.6, baseSampleTime: 0.01 },
              input: { swipeThd: 0.03 },
              log: { level: "info" }
            }
          }, null, 2),
          stderr: ""
        });
      } else {
        resolve({ code: 0, stdout: "{\"mode\":\"balance\",\"pid\":\"1234\",\"freqs\":\"1800000 1800000 2400000 3190000\",\"bat_temp\":\"325\",\"bat_cap\":\"85\",\"bat_stat\":\"Discharging\",\"bat_curr\":\"-450\",\"top_app\":\"com.android.launcher3\"}", stderr: "" });
      }
    }, 100);
  });
}

function showMessage(text, isError = false) {
  const box = document.getElementById("msgBox");
  if (!box) return;
  box.style.display = "block";
  box.style.backgroundColor = isError ? "#5a1e1e" : "#1e3a5f";
  box.style.color = isError ? "#fca5a5" : "#93c5fd";
  box.textContent = text;
  setTimeout(() => {
    box.style.display = "none";
  }, 3500);
}

// 2. Tab 导航切换
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-tab");
    const pane = document.getElementById(targetId);
    if (pane) pane.classList.add("active");

    if (targetId === "tab-config" && !_currentConfigObj) {
      loadConfigParameters();
      loadPerAppRules();
    }
  });
});

// 3. 运行模式管理
const MODE_NAMES = {
  auto: "自动",
  powersave: "省电",
  balance: "均衡",
  performance: "性能",
  fast: "极速"
};

function updateModeButtons(currentMode) {
  const cleanMode = (currentMode || "unknown").trim();
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    if (btn.getAttribute("data-mode") === cleanMode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const headerBadge = document.getElementById("headerModeBadge");
  if (headerBadge) {
    headerBadge.textContent = MODE_NAMES[cleanMode] || cleanMode;
    headerBadge.className = "badge" + (cleanMode === "unknown" ? " inactive" : "");
  }
}

async function setMode(mode) {
  const cmd = `echo "${mode}" > /sdcard/Android/yc/uperf/cur_powermode.txt`;
  const res = await ksuExec(cmd);
  if (res.code === 0) {
    updateModeButtons(mode);
    showMessage(`模式已切换为: ${MODE_NAMES[mode] || mode}`);
  } else {
    showMessage("切换模式失败: " + res.stderr, true);
  }
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    if (mode) setMode(mode);
  });
});

// 4. 状态与监控数据获取
async function fetchMonitorData() {
  const script = `
    MODE=$(cat /sdcard/Android/yc/uperf/cur_powermode.txt 2>/dev/null || echo "unknown")
    PID=$(pidof uperf 2>/dev/null || echo "")

    FREQS=""
    for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq; do
      [ -f "$f" ] && FREQS="$FREQS $(cat $f 2>/dev/null)"
    done

    BAT_TEMP=$(cat /sys/class/power_supply/battery/temp 2>/dev/null || echo "0")
    BAT_CAP=$(cat /sys/class/power_supply/battery/capacity 2>/dev/null || echo "0")
    BAT_STAT=$(cat /sys/class/power_supply/battery/status 2>/dev/null || echo "未知")
    BAT_CURR=$(cat /sys/class/power_supply/battery/current_now 2>/dev/null || echo "0")

    TOP_PID=$(cat /dev/cpuset/top-app/cgroup.procs 2>/dev/null | tail -n 1 || echo "")
    TOP_CMD=""
    if [ -n "$TOP_PID" ] && [ -d "/proc/$TOP_PID" ]; then
      TOP_CMD=$(cat /proc/$TOP_PID/cmdline 2>/dev/null | tr '\\0' ' ' | awk '{print $1}')
    fi

    echo "{\\"mode\\":\\"$MODE\\",\\"pid\\":\\"$PID\\",\\"freqs\\":\\"$FREQS\\",\\"bat_temp\\":\\"$BAT_TEMP\\",\\"bat_cap\\":\\"$BAT_CAP\\",\\"bat_stat\\":\\"$BAT_STAT\\",\\"bat_curr\\":\\"$BAT_CURR\\",\\"top_app\\":\\"$TOP_CMD\\"}"
  `;

  const res = await ksuExec(script);
  if (res.code !== 0 || !res.stdout) return;

  try {
    const raw = res.stdout.trim();
    const data = JSON.parse(raw);

    // 更新运行模式
    updateModeButtons(data.mode);

    // 守护进程状态
    const statusEl = document.getElementById("daemonStatus");
    const pidEl = document.getElementById("daemonPid");
    if (data.pid) {
      statusEl.textContent = "运行中";
      statusEl.style.color = "#3fb950";
      pidEl.textContent = data.pid;
    } else {
      statusEl.textContent = "未运行";
      statusEl.style.color = "#f85149";
      pidEl.textContent = "-";
    }

    // 顶层前台应用
    const topAppEl = document.getElementById("topApp");
    topAppEl.textContent = data.top_app || "无/空闲";

    // 电池与温度
    const tempVal = parseFloat(data.bat_temp);
    const displayTemp = tempVal > 1000 ? (tempVal / 1000).toFixed(1) : (tempVal > 100 ? (tempVal / 10).toFixed(1) : tempVal.toFixed(1));
    document.getElementById("batTemp").textContent = `${displayTemp} °C`;
    document.getElementById("batCap").textContent = `${data.bat_cap} %`;
    document.getElementById("batStat").textContent = data.bat_stat;

    const currVal = parseInt(data.bat_curr, 10);
    const displayCurr = Math.abs(currVal) > 10000 ? Math.round(currVal / 1000) : currVal;
    document.getElementById("batCurr").textContent = `${displayCurr} mA`;

    // CPU 频率列表
    const freqContainer = document.getElementById("cpuFreqList");
    const freqArr = data.freqs.trim().split(/\s+/).filter(Boolean);
    if (freqArr.length > 0) {
      freqContainer.innerHTML = "";
      freqArr.forEach((f, idx) => {
        const mhz = Math.round(parseInt(f, 10) / 1000);
        const item = document.createElement("div");
        item.className = "cpu-freq-item";
        item.innerHTML = `<span>核心 ${idx}</span><span>${mhz} MHz</span>`;
        freqContainer.appendChild(item);
      });
    }
  } catch (err) {
    console.error("解析监控数据失败:", err);
  }
}

// 自动刷新管理
function setupAutoRefresh() {
  const chk = document.getElementById("chkAutoRefresh");
  if (_refreshTimer) clearInterval(_refreshTimer);

  if (chk && chk.checked) {
    _refreshTimer = setInterval(() => {
      const monitorPane = document.getElementById("tab-monitor");
      if (monitorPane && monitorPane.classList.contains("active")) {
        fetchMonitorData();
      }
    }, 2000);
  }

  if (chk) {
    chk.addEventListener("change", setupAutoRefresh);
  }
}

document.getElementById("btnRefreshStatus").addEventListener("click", () => {
  fetchMonitorData();
  showMessage("状态已刷新");
});

document.getElementById("btnRestartDaemon").addEventListener("click", async () => {
  showMessage("正在重启 Uperf 守护进程...");
  const cmd = `
    killall uperf 2>/dev/null
    sleep 1
    if [ -f /data/adb/modules/uperf/bin/uperf ]; then
      /data/adb/modules/uperf/bin/uperf /sdcard/Android/yc/uperf/uperf.json -o /sdcard/Android/yc/uperf/uperf_log.txt &
    fi
  `;
  await ksuExec(cmd);
  setTimeout(() => {
    fetchMonitorData();
    showMessage("Uperf 重启完成");
  }, 1500);
});

// 5. 分应用配置 (perapp_powermode.txt)
async function loadPerAppRules() {
  const res = await ksuExec("cat /sdcard/Android/yc/uperf/perapp_powermode.txt 2>/dev/null");
  const txt = document.getElementById("txtPerApp");
  if (txt) {
    txt.value = res.stdout || "";
  }
}

async function savePerAppRules() {
  const txt = document.getElementById("txtPerApp");
  if (!txt) return;
  const content = txt.value;
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const cmd = `echo "${b64}" | base64 -d > /sdcard/Android/yc/uperf/perapp_powermode.txt`;
  const res = await ksuExec(cmd);
  if (res.code === 0) {
    showMessage("分应用规则已保存");
  } else {
    showMessage("保存失败: " + res.stderr, true);
  }
}

document.getElementById("btnReloadPerApp").addEventListener("click", () => {
  loadPerAppRules();
  showMessage("分应用规则已重新载入");
});
document.getElementById("btnSavePerApp").addEventListener("click", savePerAppRules);

// 6. 核心参数配置 (uperf.json)
async function loadConfigParameters() {
  const res = await ksuExec("cat /sdcard/Android/yc/uperf/uperf.json 2>/dev/null");
  if (res.code !== 0 || !res.stdout) {
    showMessage("未能读取 uperf.json 配置文件", true);
    return;
  }

  try {
    _currentConfigObj = JSON.parse(res.stdout);
    document.getElementById("txtRawJson").value = JSON.stringify(_currentConfigObj, null, 2);

    const cpu = _currentConfigObj.modules?.cpu || {};
    const input = _currentConfigObj.modules?.input || {};
    const log = _currentConfigObj.modules?.log || {};

    if (typeof cpu.slowLimitPower !== "undefined") document.getElementById("cfgSlowLimitPower").value = cpu.slowLimitPower;
    if (typeof cpu.fastLimitPower !== "undefined") document.getElementById("cfgFastLimitPower").value = cpu.fastLimitPower;
    if (typeof cpu.margin !== "undefined") document.getElementById("cfgMargin").value = cpu.margin;
    if (typeof cpu.burst !== "undefined") document.getElementById("cfgBurst").value = cpu.burst;
    if (typeof cpu.baseSampleTime !== "undefined") document.getElementById("cfgBaseSampleTime").value = cpu.baseSampleTime;
    if (typeof input.swipeThd !== "undefined") document.getElementById("cfgSwipeThd").value = input.swipeThd;
    if (log.level) document.getElementById("cfgLogLevel").value = log.level;
  } catch (e) {
    showMessage("uperf.json 格式解析错误", true);
  }
}

async function saveConfigParameters() {
  if (!_currentConfigObj) {
    await loadConfigParameters();
  }
  if (!_currentConfigObj) return;

  if (!_currentConfigObj.modules) _currentConfigObj.modules = {};
  if (!_currentConfigObj.modules.cpu) _currentConfigObj.modules.cpu = {};
  if (!_currentConfigObj.modules.input) _currentConfigObj.modules.input = {};
  if (!_currentConfigObj.modules.log) _currentConfigObj.modules.log = {};

  const slowLimit = parseFloat(document.getElementById("cfgSlowLimitPower").value);
  if (!isNaN(slowLimit)) _currentConfigObj.modules.cpu.slowLimitPower = slowLimit;

  const fastLimit = parseFloat(document.getElementById("cfgFastLimitPower").value);
  if (!isNaN(fastLimit)) _currentConfigObj.modules.cpu.fastLimitPower = fastLimit;

  const margin = parseFloat(document.getElementById("cfgMargin").value);
  if (!isNaN(margin)) _currentConfigObj.modules.cpu.margin = margin;

  const burst = parseFloat(document.getElementById("cfgBurst").value);
  if (!isNaN(burst)) _currentConfigObj.modules.cpu.burst = burst;

  const sample = parseFloat(document.getElementById("cfgBaseSampleTime").value);
  if (!isNaN(sample)) _currentConfigObj.modules.cpu.baseSampleTime = sample;

  const swipe = parseFloat(document.getElementById("cfgSwipeThd").value);
  if (!isNaN(swipe)) _currentConfigObj.modules.input.swipeThd = swipe;

  _currentConfigObj.modules.log.level = document.getElementById("cfgLogLevel").value;

  const jsonStr = JSON.stringify(_currentConfigObj, null, 2);
  document.getElementById("txtRawJson").value = jsonStr;

  const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const cmd = `echo "${b64}" | base64 -d > /sdcard/Android/yc/uperf/uperf.json`;
  const res = await ksuExec(cmd);
  if (res.code === 0) {
    showMessage("配置已保存至 uperf.json");
  } else {
    showMessage("保存失败: " + res.stderr, true);
  }
}

async function saveRawJson() {
  const txt = document.getElementById("txtRawJson");
  if (!txt) return;
  try {
    const parsed = JSON.parse(txt.value);
    _currentConfigObj = parsed;
    const b64 = btoa(unescape(encodeURIComponent(txt.value)));
    const cmd = `echo "${b64}" | base64 -d > /sdcard/Android/yc/uperf/uperf.json`;
    const res = await ksuExec(cmd);
    if (res.code === 0) {
      loadConfigParameters();
      showMessage("完整 JSON 配置已保存");
    } else {
      showMessage("写入失败: " + res.stderr, true);
    }
  } catch (e) {
    showMessage("JSON 语法校验失败，请检查格式", true);
  }
}

document.getElementById("btnReloadParams").addEventListener("click", () => {
  loadConfigParameters();
  showMessage("配置已重新读取");
});
document.getElementById("btnSaveParams").addEventListener("click", saveConfigParameters);
document.getElementById("btnReloadRawJson").addEventListener("click", loadConfigParameters);
document.getElementById("btnSaveRawJson").addEventListener("click", saveRawJson);

// 初始化加载
window.addEventListener("DOMContentLoaded", () => {
  fetchMonitorData();
  setupAutoRefresh();
});
