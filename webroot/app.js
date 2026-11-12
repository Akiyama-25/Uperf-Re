// Uperf-Re WebUI 控制核心 (Material 3 Expressive & Scene 风格可视化分应用调度)
let _cmdSeq = 0;
let _currentConfigObj = null;
let _refreshTimer = null;

// 1. Android 常用应用与热门手游友好中文识别字典
const APP_DICTIONARY = {
  // 知名手游
  "com.miHoYo.Yuanshen": { name: "原神", isGame: true },
  "com.miHoYo.hkrpg": { name: "崩坏：星穹铁道", isGame: true },
  "com.miHoYo.Nap": { name: "绝区零", isGame: true },
  "com.miHoYo.bh3.bilibili": { name: "崩坏3 (B服)", isGame: true },
  "com.miHoYo.enterprise.NGHSoD": { name: "崩坏3", isGame: true },
  "com.tencent.tmgp.sgame": { name: "王者荣耀", isGame: true },
  "com.tencent.tmgp.pubgmhd": { name: "和平精英", isGame: true },
  "com.tencent.tmgp.cod": { name: "使命召唤手游", isGame: true },
  "com.tencent.tmgp.cf": { name: "穿越火线：枪战王者", isGame: true },
  "com.tencent.tmgp.speedmobile": { name: "QQ飞车手游", isGame: true },
  "com.tencent.tmgp.dwrg": { name: "第五人格", isGame: true },
  "com.tencent.lolm": { name: "英雄联盟手游", isGame: true },
  "com.tencent.tmgp.tft": { name: "金铲铲之战", isGame: true },
  "com.tencent.tmgp.hyrz": { name: "火影忍者手游", isGame: true },
  "com.hypergryph.arknights": { name: "明日方舟", isGame: true },
  "com.hypergryph.arknights.bilibili": { name: "明日方舟 (B服)", isGame: true },
  "com.kurogame.kjz.aligames": { name: "鸣潮", isGame: true },
  "com.kurogame.haru.aligames": { name: "战双帕弥什", isGame: true },
  "com.bilibili.azurlane": { name: "碧蓝航线", isGame: true },
  "com.bilibili.fatego": { name: "Fate/Grand Order", isGame: true },
  "com.netease.yys": { name: "阴阳师", isGame: true },
  "com.netease.party": { name: "蛋仔派对", isGame: true },
  "com.netease.mrzh": { name: "明日之后", isGame: true },
  "com.netease.nshm": { name: "逆水寒手游", isGame: true },
  "com.moonton.mobilehero": { name: "决胜巅峰", isGame: true },
  "com.papegames.lysk.cn": { name: "恋与深空", isGame: true },
  "com.netease.sky": { name: "光·遇", isGame: true },
  "com.mojang.minecraftpe": { name: "我的世界 (Minecraft)", isGame: true },
  "com.roblox.client": { name: "Roblox", isGame: true },
  "com.riotgames.league.wildrift": { name: "Wild Rift", isGame: true },

  // 日常主力应用与系统组件
  "com.tencent.mm": { name: "微信", isGame: false },
  "com.tencent.mobileqq": { name: "QQ", isGame: false },
  "com.coolapk.market": { name: "酷安", isGame: false },
  "tv.danmaku.bili": { name: "哔哩哔哩", isGame: false },
  "com.ss.android.ugc.aweme": { name: "抖音", isGame: false },
  "com.ss.android.article.news": { name: "今日头条", isGame: false },
  "com.smile.gifmaker": { name: "快手", isGame: false },
  "com.netease.cloudmusic": { name: "网易云音乐", isGame: false },
  "com.kugou.android": { name: "酷狗音乐", isGame: false },
  "com.tencent.qqmusic": { name: "QQ音乐", isGame: false },
  "com.taobao.taobao": { name: "手机淘宝", isGame: false },
  "com.jingdong.app.mall": { name: "京东", isGame: false },
  "com.xunmeng.pinduoduo": { name: "拼多多", isGame: false },
  "com.sankuai.meituan": { name: "美团", isGame: false },
  "com.zhihu.android": { name: "知乎", isGame: false },
  "com.sina.weibo": { name: "微博", isGame: false },
  "com.autonavi.minimap": { name: "高德地图", isGame: false },
  "com.baidu.BaiduMap": { name: "百度地图", isGame: false },
  "com.omarea.vtools": { name: "Scene 性能工具", isGame: false },
  "io.github.a13e300.ksu": { name: "KernelSU", isGame: false },
  "me.bmax.apatch": { name: "APatch", isGame: false },
  "com.topjohnwu.magisk": { name: "Magisk", isGame: false },
  "com.akari.uperf": { name: "Uperf 控制中心", isGame: false },
  "com.google.android.inputmethod.latin": { name: "Gboard 谷歌输入法", isGame: false },
  "com.miui.home": { name: "系统桌面", isGame: false },
  "com.android.launcher": { name: "系统桌面", isGame: false },
  "com.android.chrome": { name: "Chrome 浏览器", isGame: false },
  "org.mozilla.firefox": { name: "Firefox 浏览器", isGame: false }
};

// 模式名称对应表
const MODE_NAMES = {
  auto: "自动",
  powersave: "省电",
  balance: "均衡",
  performance: "性能",
  fast: "极速"
};

// 2. KernelSU / APatch / Companion APP 异步非阻塞执行桥接
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
      } else if (cmd.includes("perapp_powermode.txt")) {
        resolve({
          code: 0,
          stdout: "# 分应用性能模式配置\n* balance\n- powersave\ncom.tencent.tmgp.sgame performance\ncom.miHoYo.Yuanshen fast\ncom.coolapk.market powersave\n",
          stderr: ""
        });
      } else if (cmd.includes("pm list packages")) {
        resolve({
          code: 0,
          stdout: "com.tencent.tmgp.sgame\ncom.miHoYo.Yuanshen\ncom.miHoYo.hkrpg\ncom.miHoYo.Nap\ncom.coolapk.market\ncom.tencent.mm\ncom.tencent.mobileqq\ntv.danmaku.bili\ncom.ss.android.ugc.aweme\ncom.omarea.vtools\nio.github.a13e300.ksu\ncom.akari.uperf\n",
          stderr: ""
        });
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
        resolve({
          code: 0,
          stdout: "{\"mode\":\"balance\",\"pid\":\"27016 27019\",\"freqs\":\"1344000 1344000 1344000 1344000 1804800 1804800 2400000 3190000\",\"bat_temp\":\"363\",\"bat_cap\":\"29\",\"bat_stat\":\"Discharging\",\"bat_curr\":\"397\",\"top_app\":\"com.miHoYo.Yuanshen\"}",
          stderr: ""
        });
      }
    }, 120);
  });
}

function showMessage(text, isError = false) {
  const box = document.getElementById("msgBox");
  if (!box) return;
  box.style.display = "block";
  box.style.backgroundColor = isError ? "var(--m3e-fast-bg)" : "var(--m3e-primary-container)";
  box.style.color = isError ? "var(--m3e-fast)" : "var(--m3e-on-primary-container)";
  box.textContent = text;
  setTimeout(() => {
    box.style.display = "none";
  }, 3200);
}

// 3. Tab 导航切换
let _perAppLoaded = false;
document.querySelectorAll(".tab-nav .tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-nav .tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-tab");
    const pane = document.getElementById(targetId);
    if (pane) pane.classList.add("active");

    if (targetId === "tab-perapp" && !_perAppLoaded) {
      loadPerAppEnvironment();
    } else if (targetId === "tab-config" && !_currentConfigObj) {
      loadConfigParameters();
    }
  });
});

// 4. 运行模式管理
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

// 5. 状态与监控数据获取
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

    // 运行模式按钮
    updateModeButtons(data.mode);

    // 守护进程状态与 PID
    const statusEl = document.getElementById("daemonStatus");
    const pidEl = document.getElementById("daemonPid");
    if (data.pid) {
      statusEl.textContent = "运行中";
      statusEl.style.color = "var(--m3e-powersave)";
      pidEl.textContent = data.pid;
    } else {
      statusEl.textContent = "未运行";
      statusEl.style.color = "var(--m3e-fast)";
      pidEl.textContent = "-";
    }

    // 顶层前台应用 (友好解析)
    const topAppEl = document.getElementById("topApp");
    const rawTop = (data.top_app || "").trim();
    if (rawTop) {
      const match = APP_DICTIONARY[rawTop];
      if (match) {
        topAppEl.textContent = `${match.name} (${rawTop})`;
      } else {
        topAppEl.textContent = rawTop;
      }
    } else {
      topAppEl.textContent = "系统空闲 / 待机";
    }

    // 电池与温度
    const tempVal = parseFloat(data.bat_temp);
    const displayTemp = tempVal > 1000 ? (tempVal / 1000).toFixed(1) : (tempVal > 100 ? (tempVal / 10).toFixed(1) : tempVal.toFixed(1));
    document.getElementById("batTemp").textContent = `${displayTemp} °C`;
    document.getElementById("batCap").textContent = `${data.bat_cap} %`;
    document.getElementById("batStat").textContent = data.bat_stat;

    const currVal = parseInt(data.bat_curr, 10);
    const displayCurr = Math.abs(currVal) > 10000 ? Math.round(currVal / 1000) : currVal;
    document.getElementById("batCurr").textContent = `${displayCurr} mA`;

    // CPU 核心频率列表
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

// 6. Scene 风格可视化分应用调度模块
let _appList = []; // { pkg, name, isGame, mode }
let _currentFilter = "all";
let _searchKeyword = "";

// 辅助推断应用信息
function resolveAppMeta(pkg) {
  if (APP_DICTIONARY[pkg]) {
    return {
      name: APP_DICTIONARY[pkg].name,
      isGame: APP_DICTIONARY[pkg].isGame
    };
  }

  // 根据包名字段智能推测
  const lower = pkg.toLowerCase();
  const isLikelyGame = lower.includes("game") || lower.includes("tmgp") || lower.includes("mihoyo") ||
                       lower.includes("kuro") || lower.includes("hypergryph") || lower.includes("mojang") ||
                       lower.includes("netease.sky") || lower.includes("riotgames") || lower.includes("papegames");

  // 生成缩略友好名
  const parts = pkg.split(".");
  let friendlyName = parts[parts.length - 1] || pkg;
  if (friendlyName.length < 3 && parts.length > 1) {
    friendlyName = parts[parts.length - 2] + "." + friendlyName;
  }
  friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);

  return {
    name: friendlyName,
    isGame: isLikelyGame
  };
}

// 解析 perapp_powermode.txt 规则文本
function parsePerAppRules(rawText) {
  const rules = {};
  let defaultMode = "balance";
  let offscreenMode = "powersave";

  const lines = rawText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const key = parts[0];
      const mode = parts[1];
      if (key === "*") {
        defaultMode = mode;
      } else if (key === "-") {
        offscreenMode = mode;
      } else {
        rules[key] = mode;
      }
    }
  }

  return { defaultMode, offscreenMode, rules };
}

// 序列化回 perapp_powermode.txt 格式
function serializePerAppRules(defaultMode, offscreenMode, appList) {
  const lines = [
    "# 分应用性能模式配置 (Uperf-Re)",
    "# '*' 为未配置应用的全局默认模式，'-' 为熄屏待机策略",
    `* ${defaultMode}`,
    `- ${offscreenMode}`,
    ""
  ];

  // 排序应用规则保证整齐
  const configuredApps = appList
    .filter((a) => a.mode && a.mode.trim() !== "")
    .sort((a, b) => a.pkg.localeCompare(b.pkg));

  for (const item of configuredApps) {
    lines.push(`${item.pkg} ${item.mode}`);
  }

  return lines.join("\n") + "\n";
}

// 扫描系统已装应用并合并配置
async function loadPerAppEnvironment() {
  _perAppLoaded = true;
  const listContainer = document.getElementById("appListContainer");
  const badgeEl = document.getElementById("appSummaryBadge");
  if (badgeEl) badgeEl.textContent = "正在读取配置...";

  // 1. 读取规则文本
  const resRule = await ksuExec("cat /sdcard/Android/yc/uperf/perapp_powermode.txt 2>/dev/null");
  const rawRuleText = resRule.stdout || "";
  const txtRaw = document.getElementById("txtPerApp");
  if (txtRaw) txtRaw.value = rawRuleText;

  const { defaultMode, offscreenMode, rules } = parsePerAppRules(rawRuleText);

  // 设置全局默认和熄屏下拉选择
  const selDef = document.getElementById("selDefaultMode");
  const selOff = document.getElementById("selOffscreenMode");
  if (selDef) selDef.value = defaultMode;
  if (selOff) selOff.value = offscreenMode;

  if (badgeEl) badgeEl.textContent = "扫描系统第三方应用...";

  // 2. 扫描已安装第三方应用 (pm list packages -3)
  const resPkgs = await ksuExec("pm list packages -3 2>/dev/null | sed 's/^package://' | sort");
  let scannedPkgs = [];
  if (resPkgs.code === 0 && resPkgs.stdout) {
    scannedPkgs = resPkgs.stdout.split("\n").map((p) => p.trim()).filter(Boolean);
  }

  // 3. 将规则文件中已有的包名也合并进来 (包括系统应用或特别指定的包)
  const pkgSet = new Set(scannedPkgs);
  Object.keys(rules).forEach((pkg) => pkgSet.add(pkg));

  // 若为空（如全新环境），预装常见主流应用作为基础展示
  if (pkgSet.size === 0) {
    Object.keys(APP_DICTIONARY).slice(0, 15).forEach((pkg) => pkgSet.add(pkg));
  }

  // 4. 构建全量 App 列表
  _appList = Array.from(pkgSet).map((pkg) => {
    const meta = resolveAppMeta(pkg);
    const assignedMode = rules[pkg] || "";
    return {
      pkg,
      name: meta.name,
      isGame: meta.isGame,
      mode: assignedMode
    };
  });

  // 按中文名/包名排序
  _appList.sort((a, b) => {
    // 已配置规则的应用排在前面
    if (a.mode && !b.mode) return -1;
    if (!a.mode && b.mode) return 1;
    // 游戏排在应用前面
    if (a.isGame && !b.isGame) return -1;
    if (!a.isGame && b.isGame) return 1;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  renderAppList();
}

// 渲染 App 列表卡片
function renderAppList() {
  const container = document.getElementById("appListContainer");
  if (!container) return;

  const keyword = _searchKeyword.toLowerCase().trim();

  // 统计各类数量
  let countAll = _appList.length;
  let countConfigured = 0;
  let countGame = 0;
  let countApp = 0;

  for (const item of _appList) {
    if (item.mode) countConfigured++;
    if (item.isGame) countGame++;
    else countApp++;
  }

  document.getElementById("countAll").textContent = countAll;
  document.getElementById("countConfigured").textContent = countConfigured;
  document.getElementById("countGame").textContent = countGame;
  document.getElementById("countApp").textContent = countApp;

  const badgeEl = document.getElementById("appSummaryBadge");
  if (badgeEl) {
    badgeEl.textContent = `已载入 ${countAll} 款应用 (已配置 ${countConfigured} 款)`;
  }

  // 过滤展示列表
  const filtered = _appList.filter((item) => {
    // 标签筛选
    if (_currentFilter === "configured" && !item.mode) return false;
    if (_currentFilter === "game" && !item.isGame) return false;
    if (_currentFilter === "app" && item.isGame) return false;

    // 关键词筛选
    if (keyword) {
      const matchName = item.name.toLowerCase().includes(keyword);
      const matchPkg = item.pkg.toLowerCase().includes(keyword);
      if (!matchName && !matchPkg) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 28px 0; color: var(--m3e-text-muted);">未找到匹配的应用</div>`;
    return;
  }

  container.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const item of filtered) {
    const card = document.createElement("div");
    card.className = "app-card";

    // 首字符头像
    const avatarChar = item.name.charAt(0) || "应";
    const avatarClass = item.isGame ? "app-avatar game" : "app-avatar";

    // 模式选择下拉框类名
    const modeClass = item.mode ? `mode-${item.mode}` : "";

    card.innerHTML = `
      <div class="app-meta">
        <div class="${avatarClass}">${avatarChar}</div>
        <div class="app-info">
          <div class="app-name">${item.name}</div>
          <div class="app-pkg">${item.pkg}</div>
        </div>
      </div>
      <select class="app-mode-select ${modeClass}" data-pkg="${item.pkg}">
        <option value="" ${item.mode === "" ? "selected" : ""}>跟随默认 (*)</option>
        <option value="powersave" ${item.mode === "powersave" ? "selected" : ""}>省电</option>
        <option value="balance" ${item.mode === "balance" ? "selected" : ""}>均衡</option>
        <option value="performance" ${item.mode === "performance" ? "selected" : ""}>性能</option>
        <option value="fast" ${item.mode === "fast" ? "selected" : ""}>极速</option>
        <option value="auto" ${item.mode === "auto" ? "selected" : ""}>自动</option>
      </select>
    `;

    // 绑定下拉切换事件
    const selectEl = card.querySelector(".app-mode-select");
    selectEl.addEventListener("change", (e) => {
      const newMode = e.target.value;
      item.mode = newMode;

      // 更新样式
      selectEl.className = "app-mode-select " + (newMode ? `mode-${newMode}` : "");

      // 更新计数
      let newConfigured = _appList.filter((a) => a.mode).length;
      document.getElementById("countConfigured").textContent = newConfigured;
      if (badgeEl) badgeEl.textContent = `已载入 ${_appList.length} 款应用 (已配置 ${newConfigured} 款)`;

      // 实时同步到底部源码框预览
      syncToRawText();
    });

    frag.appendChild(card);
  }

  container.appendChild(frag);
}

// 实时将可视化状态同步到底部源码框
function syncToRawText() {
  const selDef = document.getElementById("selDefaultMode");
  const selOff = document.getElementById("selOffscreenMode");
  const def = selDef ? selDef.value : "balance";
  const off = selOff ? selOff.value : "powersave";

  const newText = serializePerAppRules(def, off, _appList);
  const txtRaw = document.getElementById("txtPerApp");
  if (txtRaw) txtRaw.value = newText;
}

// 保存分应用配置
async function savePerAppRulesVisual() {
  const selDef = document.getElementById("selDefaultMode");
  const selOff = document.getElementById("selOffscreenMode");
  const def = selDef ? selDef.value : "balance";
  const off = selOff ? selOff.value : "powersave";

  const content = serializePerAppRules(def, off, _appList);
  const txtRaw = document.getElementById("txtPerApp");
  if (txtRaw) txtRaw.value = content;

  const b64 = btoa(unescape(encodeURIComponent(content)));
  const cmd = `echo "${b64}" | base64 -d > /sdcard/Android/yc/uperf/perapp_powermode.txt`;
  const res = await ksuExec(cmd);
  if (res.code === 0) {
    showMessage("分应用调度策略已保存并生效");
  } else {
    showMessage("保存失败: " + res.stderr, true);
  }
}

// 保存底部原始文本
async function savePerAppRulesRaw() {
  const txt = document.getElementById("txtPerApp");
  if (!txt) return;
  const content = txt.value;
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const cmd = `echo "${b64}" | base64 -d > /sdcard/Android/yc/uperf/perapp_powermode.txt`;
  const res = await ksuExec(cmd);
  if (res.code === 0) {
    showMessage("原始文本规则已成功写入");
    // 重新回显到可视化列表
    const { defaultMode, offscreenMode, rules } = parsePerAppRules(content);
    const selDef = document.getElementById("selDefaultMode");
    const selOff = document.getElementById("selOffscreenMode");
    if (selDef) selDef.value = defaultMode;
    if (selOff) selOff.value = offscreenMode;

    for (const item of _appList) {
      item.mode = rules[item.pkg] || "";
    }
    renderAppList();
  } else {
    showMessage("保存失败: " + res.stderr, true);
  }
}

// 绑定搜索与筛选标签
document.getElementById("appSearchInput")?.addEventListener("input", (e) => {
  _searchKeyword = e.target.value;
  renderAppList();
});

document.querySelectorAll(".chip-bar .filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip-bar .filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    _currentFilter = chip.getAttribute("data-filter") || "all";
    renderAppList();
  });
});

document.getElementById("selDefaultMode")?.addEventListener("change", syncToRawText);
document.getElementById("selOffscreenMode")?.addEventListener("change", syncToRawText);

document.getElementById("btnRescanApps")?.addEventListener("click", () => {
  loadPerAppEnvironment();
  showMessage("已重新扫描系统应用");
});

document.getElementById("btnSavePerAppRules")?.addEventListener("click", savePerAppRulesVisual);

document.getElementById("btnReloadPerAppRaw")?.addEventListener("click", async () => {
  const res = await ksuExec("cat /sdcard/Android/yc/uperf/perapp_powermode.txt 2>/dev/null");
  const txt = document.getElementById("txtPerApp");
  if (txt) txt.value = res.stdout || "";
  showMessage("规则文本已重载");
});

document.getElementById("btnSavePerAppRaw")?.addEventListener("click", savePerAppRulesRaw);

// 7. 核心参数配置 (uperf.json)
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

document.getElementById("btnReloadParams")?.addEventListener("click", () => {
  loadConfigParameters();
  showMessage("配置已重新读取");
});
document.getElementById("btnSaveParams")?.addEventListener("click", saveConfigParameters);
document.getElementById("btnReloadRawJson")?.addEventListener("click", loadConfigParameters);
document.getElementById("btnSaveRawJson")?.addEventListener("click", saveRawJson);

// 初始化启动
window.addEventListener("DOMContentLoaded", () => {
  fetchMonitorData();
  setupAutoRefresh();
});
