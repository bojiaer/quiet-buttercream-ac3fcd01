/* ====== computer-knowledge API Client ====== */
// All requests go through Cloudflare Workers API
// No Supabase keys exposed to frontend

// Change this after deploying your Worker
var API_BASE = "https://computer-knowledge-api.yaojinguan.workers.dev";
// Or use local proxy for dev: "http://localhost:8787"

// ====== AUTH STATE ======
var currentUser = null;
// token declared below in loadSession

function loadSession() {
  try {
    var s = JSON.parse(localStorage.getItem("ck_session") || "{}");
    if (s && s.token && s.user) {
      token = s.token;
      currentUser = s.user;
    }
  } catch(e) {}
}

function saveSession() {
  localStorage.setItem("ck_session", JSON.stringify({ token: token, user: currentUser }));
}

function clearSession() {
  token = null;
  currentUser = null;
  localStorage.removeItem("ck_session");
}

function isLoggedIn() {
  return !!(token && currentUser);
}

function getUserEmail() {
  return currentUser ? currentUser.email : "";
}

// ====== API HELPERS ======
async function api(path, options) {
  var opts = options || {};
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  if (opts.headers) Object.assign(headers, opts.headers);

  var res = await fetch(API_BASE + path, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  var data;
  try { data = await res.json(); } catch(e) { data = {}; }

  if (!res.ok) {
    throw new Error(data.error || ("Request failed: " + res.status));
  }
  return data;
}

async function apiPost(path, body) {
  return await api(path, { method: "POST", body: body });
}

async function apiPatch(path, body) {
  return await api(path, { method: "PATCH", body: body });
}

async function apiDelete(path) {
  return await api(path, { method: "DELETE" });
}

async function loadPosts() {
  return await api("/api/posts");
}

function fmtNow() {
  var d = new Date();
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  var h = d.getHours();
  var mi = d.getMinutes();
  return d.getFullYear() + "-" + (mm < 10 ? "0" + mm : mm) + "-" + (dd < 10 ? "0" + dd : dd) + " " + (h < 10 ? "0" + h : h) + ":" + (mi < 10 ? "0" + mi : mi);
}


// ====== AUTH FLOWS ======

// Step 1: Request verification code
async function sendLoginCode() {
  var emailInput = document.getElementById("loginEmail");
  var email = emailInput.value.trim();
  if (!email) { alert("\u8bf7\u8f93\u5165\u90ae\u7bb1"); return; }

  var btn = event.target;
  btn.disabled = true;
  btn.textContent = "\u53d1\u9001\u4e2d...";

  try {
    await apiPost("/api/auth/send-code", { email: email });
    document.getElementById("loginStep1").style.display = "none";
    document.getElementById("loginStep2").style.display = "";
    document.getElementById("loginEmailDisplay").textContent = email;
  } catch(e) {
    alert("\u53d1\u9001\u5931\u8d25: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "\u53d1\u9001\u9a8c\u8bc1\u7801";
  }
}

// Step 2: Verify code and login
async function verifyLoginCode() {
  var email = document.getElementById("loginEmail").value.trim();
  var code = document.getElementById("loginCode").value.trim();
  if (!code) { alert("\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801"); return; }

  var btn = event.target;
  btn.disabled = true;
  btn.textContent = "\u9a8c\u8bc1\u4e2d...";

  try {
    var data = await apiPost("/api/auth/verify-code", { email: email, code: code });
    token = data.token;
    currentUser = data.user;
    saveSession();
    loginClose();
    updateUserUI();
  } catch(e) {
    alert("\u9a8c\u8bc1\u5931\u8d25: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "\u767b\u5165";
  }
}

function logout() {
  clearSession();
  updateUserUI();
}

// UI
function showLogin() {
  var m = document.getElementById("loginModal");
  if (m) m.classList.add("open");
  document.getElementById("loginStep1").style.display = "";
  document.getElementById("loginStep2").style.display = "none";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginCode").value = "";
}

function loginClose() {
  document.getElementById("loginModal").classList.remove("open");
}

function updateUserUI() {
  var email = getUserEmail();
  var btns = document.querySelectorAll(".auth-btn-area");
  for (var i = 0; i < btns.length; i++) {
    if (email) {
      btns[i].innerHTML = '<span class="tag-filter" style="color:var(--accent);border-color:var(--accent);">' + email + '</span>' +
        '<button class="tag-filter" onclick="logout()">\u9000\u51fa</button>';
    } else {
      btns[i].innerHTML = '<button class="tag-filter" onclick="showLogin()" style="background:var(--accent,#7c6ff7);color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:.85rem;cursor:pointer;font-weight:600">\u767b\u5f55</button>';
    }
  }
}

// ====== SEARCH INDEX ======
var pagesIndex = [
  {t:"CPU / i3 — 入门 / 轻办公",p:"hardware/cpu.html",kw:"cpu i3 — 入门 / 轻办公 处理器 i3"},
  {t:"CPU / i5 — 主流性能",p:"hardware/cpu.html",kw:"cpu i5 — 主流性能 处理器 i5"},
  {t:"CPU / i7 — 高端多任务",p:"hardware/cpu.html",kw:"cpu i7 — 高端多任务 处理器 i7"},
  {t:"CPU / i9 — 旗舰极限性能",p:"hardware/cpu.html",kw:"cpu i9 — 旗舰极限性能 处理器 i9"},
  {t:"CPU / Core Ultra 5 / 7 / 9",p:"hardware/cpu.html",kw:"cpu core ultra 5 / 7 / 9 处理器 core ultra 5 7 9 ore ltra tra"},
  {t:"CPU / Ryzen 3 — 入门",p:"hardware/cpu.html",kw:"cpu ryzen 3 — 入门 处理器 ryzen 3 yzen zen"},
  {t:"CPU / Ryzen 5 — 主流甜点",p:"hardware/cpu.html",kw:"cpu ryzen 5 — 主流甜点 处理器 ryzen 5 yzen zen"},
  {t:"CPU / Ryzen 7 — 高效多核",p:"hardware/cpu.html",kw:"cpu ryzen 7 — 高效多核 处理器 ryzen 7 yzen zen"},
  {t:"CPU / Ryzen 9 — 桌面旗舰",p:"hardware/cpu.html",kw:"cpu ryzen 9 — 桌面旗舰 处理器 ryzen 9 yzen zen"},
  {t:"GPU / XX50 级 — 入门卡",p:"hardware/gpu.html",kw:"gpu xx50 级 — 入门卡 显卡 图形卡 xx50 x50"},
  {t:"GPU / XX60 级 — 甜点级（装机最大体量）",p:"hardware/gpu.html",kw:"gpu xx60 级 — 甜点级（装机最大体量） 显卡 图形卡 xx60 x60"},
  {t:"GPU / XX70 级 — 高端起步",p:"hardware/gpu.html",kw:"gpu xx70 级 — 高端起步 显卡 图形卡 xx70 x70"},
  {t:"GPU / XX80 级 — 次旗舰",p:"hardware/gpu.html",kw:"gpu xx80 级 — 次旗舰 显卡 图形卡 xx80 x80"},
  {t:"GPU / XX90 级 — 卡皇",p:"hardware/gpu.html",kw:"gpu xx90 级 — 卡皇 显卡 图形卡 xx90 x90"},
  {t:"GPU / 30 系 (Ampere)→40 系 (Ada Lovelace)→50 系 (Blackwell, 2025+)",p:"hardware/gpu.html",kw:"gpu 30 系 (ampere)→40 系 (ada lovelace)→50 系 (blackwell, 2025+) 显卡 图形卡 30 ampere 40 ada lovelace 50 blackwell 2025 mpere pere ere ovelace velace elace lace ace lackwell ackwell ckwell kwell well ell 025"},
  {t:"GPU / RX X600 级→X700(甜点)→X800(次旗舰)→X900(旗舰)",p:"hardware/gpu.html",kw:"gpu rx x600 级→x700(甜点)→x800(次旗舰)→x900(旗舰) 显卡 图形卡 rx x600 x700 x800 x900 600 700 800 900"},
  {t:"GPU / Arc A300 / A500 / A700 → Battlemage (B 系列)",p:"hardware/gpu.html",kw:"gpu arc a300 / a500 / a700 → battlemage (b 系列) 显卡 图形卡 arc a300 a500 a700 battlemage b 300 500 700 attlemage ttlemage tlemage lemage emage mage age"},
  {t:"GPU / 🏷 一线大厂（工程积累深厚）",p:"hardware/gpu.html",kw:"gpu 🏷 一线大厂（工程积累深厚） 显卡 图形卡"},
  {t:"GPU / 🏷 中国主要品牌",p:"hardware/gpu.html",kw:"gpu 🏷 中国主要品牌 显卡 图形卡"},
  {t:"GPU / 🏷 其他精选品牌",p:"hardware/gpu.html",kw:"gpu 🏷 其他精选品牌 显卡 图形卡"},
  {t:"GPU / 带宽公式",p:"hardware/gpu.html",kw:"gpu 带宽公式 显卡 图形卡"},
  {t:"GPU / 推荐大小",p:"hardware/gpu.html",kw:"gpu 推荐大小 显卡 图形卡"},
  {t:"主板 / H610 — 入门级",p:"hardware/motherboard.html",kw:"主板 h610 — 入门级 主板与机箱 h610 610"},
  {t:"主板 / B760 — 主流",p:"hardware/motherboard.html",kw:"主板 b760 — 主流 主板与机箱 b760 760"},
  {t:"主板 / Z790 — 旗舰",p:"hardware/motherboard.html",kw:"主板 z790 — 旗舰 主板与机箱 z790 790"},
  {t:"主板 / A620 — 入门 (AM5)",p:"hardware/motherboard.html",kw:"主板 a620 — 入门 (am5) 主板与机箱 a620 am5 620"},
  {t:"主板 / B650 / B650E — 主流",p:"hardware/motherboard.html",kw:"主板 b650 / b650e — 主流 主板与机箱 b650 b650e 650 650e 50e"},
  {t:"主板 / X670 / X670E — 旗舰",p:"hardware/motherboard.html",kw:"主板 x670 / x670e — 旗舰 主板与机箱 x670 x670e 670 670e 70e"},
  {t:"主板 / 📡 带 WiFi 版本",p:"hardware/motherboard.html",kw:"主板 📡 带 wifi 版本 主板与机箱 wifi ifi"},
  {t:"主板 / 🔌 不带 WiFi 版本",p:"hardware/motherboard.html",kw:"主板 🔌 不带 wifi 版本 主板与机箱 wifi ifi"},
  {t:"主板 / Mini-ITX（170mm × 170mm）",p:"hardware/motherboard.html",kw:"主板 mini-itx（170mm × 170mm） 主板与机箱 mini itx 170mm ini 70mm 0mm"},
  {t:"主板 / Micro-ATX（244mm × 244mm）",p:"hardware/motherboard.html",kw:"主板 micro-atx（244mm × 244mm） 主板与机箱 micro atx 244mm icro cro 44mm 4mm"},
  {t:"主板 / Standard ATX（305mm × 244mm）",p:"hardware/motherboard.html",kw:"主板 standard atx（305mm × 244mm） 主板与机箱 standard atx 305mm 244mm tandard andard ndard dard ard 05mm 5mm 44mm 4mm"},
  {t:"主板 / Extended-ATX（305mm × 277mm+）",p:"hardware/motherboard.html",kw:"主板 extended-atx（305mm × 277mm+） 主板与机箱 extended atx 305mm 277mm xtended tended ended nded ded 05mm 5mm 77mm 7mm"},
  {t:"主板 / ITX 机箱",p:"hardware/motherboard.html",kw:"主板 itx 机箱 主板与机箱 itx"},
  {t:"主板 / M-ATX 机箱",p:"hardware/motherboard.html",kw:"主板 m-atx 机箱 主板与机箱 m atx"},
  {t:"主板 / ATX 中塔",p:"hardware/motherboard.html",kw:"主板 atx 中塔 主板与机箱 atx"},
  {t:"主板 / E-ATX 全塔",p:"hardware/motherboard.html",kw:"主板 e-atx 全塔 主板与机箱 e atx"},
  {t:"内存 / 适用场景",p:"hardware/ram.html",kw:"内存 适用场景 ram"},
  {t:"内存 / 双通道 vs 四通道",p:"hardware/ram.html",kw:"内存 双通道 vs 四通道 ram vs"},
  {t:"硬盘 / SATA SSD",p:"hardware/storage.html",kw:"硬盘 sata ssd ssd hdd 磁盘 sata ssd ata"},
  {t:"硬盘 / M.2 NVMe SSD",p:"hardware/storage.html",kw:"硬盘 m.2 nvme ssd ssd hdd 磁盘 m 2 nvme ssd vme"},
  {t:"硬盘 / 大容量归档",p:"hardware/storage.html",kw:"硬盘 大容量归档 ssd hdd 磁盘"},
  {t:"硬盘 / CMR vs SMR",p:"hardware/storage.html",kw:"硬盘 cmr vs smr ssd hdd 磁盘 cmr vs smr"},
  {t:"电源 / 450W - 550W",p:"hardware/psu.html",kw:"电源 450w - 550w 450w 550w 50w"},
  {t:"电源 / 650W - 750W",p:"hardware/psu.html",kw:"电源 650w - 750w 650w 750w 50w"},
  {t:"电源 / 850W - 1200W",p:"hardware/psu.html",kw:"电源 850w - 1200w 850w 1200w 50w 200w 00w"},
  {t:"电源 / 🇯🇵 日本电容（日系电容）",p:"hardware/psu.html",kw:"电源 🇯🇵 日本电容（日系电容）"},
  {t:"电源 / 🇹🇼 台湾电容",p:"hardware/psu.html",kw:"电源 🇹🇼 台湾电容"},
  {t:"电源 / 🇨🇳 大陆电容",p:"hardware/psu.html",kw:"电源 🇨🇳 大陆电容"},
  {t:"散热 / 风冷散热",p:"hardware/cooling.html",kw:"散热 风冷散热 风扇 水冷"},
  {t:"散热 / 水冷散热",p:"hardware/cooling.html",kw:"散热 水冷散热 风扇 水冷"},
  {t:"散热 / 被动散热",p:"hardware/cooling.html",kw:"散热 被动散热 风扇 水冷"},
  {t:"散热 / 前吸后排",p:"hardware/cooling.html",kw:"散热 前吸后排 风扇 水冷"},
  {t:"散热 / 正压 vs 负压",p:"hardware/cooling.html",kw:"散热 正压 vs 负压 风扇 水冷 vs"},
  {t:"外设 / DPI (每英寸点数)",p:"hardware/peripherals.html",kw:"外设 dpi (每英寸点数) 键盘 鼠标 显示器 dpi"},
  {t:"外设 / 回报率 (Polling Rate)",p:"hardware/peripherals.html",kw:"外设 回报率 (polling rate) 键盘 鼠标 显示器 polling rate olling lling ling ing ate"},
  {t:"外设 / 📏 尺寸速查（常见参照物体）",p:"hardware/peripherals.html",kw:"外设 📏 尺寸速查（常见参照物体） 键盘 鼠标 显示器"},
  {t:"外设 / 🎨 色域详解",p:"hardware/peripherals.html",kw:"外设 🎨 色域详解 键盘 鼠标 显示器"},
  {t:"外设 / sRGB",p:"hardware/peripherals.html",kw:"外设 srgb 键盘 鼠标 显示器 rgb"},
  {t:"外设 / DCI-P3（电影级色域）",p:"hardware/peripherals.html",kw:"外设 dci-p3（电影级色域） 键盘 鼠标 显示器 dci p3"},
  {t:"外设 / Adobe RGB",p:"hardware/peripherals.html",kw:"外设 adobe rgb 键盘 鼠标 显示器 adobe rgb dobe obe"},
  {t:"外设 / 📌 选显示器要看的七个参数",p:"hardware/peripherals.html",kw:"外设 📌 选显示器要看的七个参数 键盘 鼠标 显示器"},
  {t:"系统错误 / 0x0000007B — INACCESSIBLE_BOOT_DEVICE",p:"system/errors.html",kw:"系统错误 0x0000007b — inaccessible_boot_device 蓝屏 bsod bugcheck bug 0x0000007b inaccessible boot device x0000007b 0000007b 000007b 00007b 0007b 007b 07b naccessible accessible ccessible cessible essible ssible sible ible ble oot evice vice ice"},
  {t:"系统错误 / 0x000000EA — THREAD_STUCK_IN_DEVICE_DRIVER",p:"system/errors.html",kw:"系统错误 0x000000ea — thread_stuck_in_device_driver 蓝屏 bsod bugcheck bug 0x000000ea thread stuck in device driver x000000ea 000000ea 00000ea 0000ea 000ea 00ea 0ea hread read ead tuck uck evice vice ice river iver ver"},
  {t:"系统错误 / 0x00000050 — PAGE_FAULT_IN_NONPAGED_AREA",p:"system/errors.html",kw:"系统错误 0x00000050 — page_fault_in_nonpaged_area 蓝屏 bsod bugcheck bug 0x00000050 page fault in nonpaged area x00000050 00000050 0000050 000050 00050 0050 050 age ault ult onpaged npaged paged aged ged rea"},
  {t:"系统错误 / 0x0000001A — MEMORY_MANAGEMENT",p:"system/errors.html",kw:"系统错误 0x0000001a — memory_management 蓝屏 bsod bugcheck bug 0x0000001a memory management x0000001a 0000001a 000001a 00001a 0001a 001a 01a emory mory ory anagement nagement agement gement ement ment ent"},
  {t:"系统错误 / 0x000000D1 — DRIVER_IRQL_NOT_LESS_OR_EQUAL",p:"system/errors.html",kw:"系统错误 0x000000d1 — driver_irql_not_less_or_equal 蓝屏 bsod bugcheck bug 0x000000d1 driver irql not less or equal x000000d1 000000d1 00000d1 0000d1 000d1 00d1 0d1 river iver ver rql ess qual ual"},
  {t:"系统错误 / 0x0000003B — SYSTEM_SERVICE_EXCEPTION",p:"system/errors.html",kw:"系统错误 0x0000003b — system_service_exception 蓝屏 bsod bugcheck bug 0x0000003b system service exception x0000003b 0000003b 000003b 00003b 0003b 003b 03b ystem stem tem ervice rvice vice ice xception ception eption ption tion ion"},
  {t:"系统错误 / 0x0000009F — DRIVER_POWER_STATE_FAILURE",p:"system/errors.html",kw:"系统错误 0x0000009f — driver_power_state_failure 蓝屏 bsod bugcheck bug 0x0000009f driver power state failure x0000009f 0000009f 000009f 00009f 0009f 009f 09f river iver ver ower wer tate ate ailure ilure lure ure"},
  {t:"系统错误 / 0x00000124 — WHEA_UNCORRECTABLE_ERROR",p:"system/errors.html",kw:"系统错误 0x00000124 — whea_uncorrectable_error 蓝屏 bsod bugcheck bug 0x00000124 whea uncorrectable error x00000124 00000124 0000124 000124 00124 0124 124 hea ncorrectable correctable orrectable rrectable rectable ectable ctable table able ble rror ror"},
  {t:"系统错误 / 0x00000D1 — IRQL Drive...重复→算旧版本含其他关联。",p:"system/errors.html",kw:"系统错误 0x00000d1 — irql drive...重复→算旧版本含其他关联。 蓝屏 bsod bugcheck bug 0x00000d1 irql drive x00000d1 00000d1 0000d1 000d1 00d1 0d1 rql rive ive"},
  {t:"系统错误 / 0xC000021A — STATUS_SYSTEM_PROCESS_TERMINATED",p:"system/errors.html",kw:"系统错误 0xc000021a — status_system_process_terminated 蓝屏 bsod bugcheck bug 0xc000021a status system process terminated xc000021a c000021a 000021a 00021a 0021a 021a 21a tatus atus tus ystem stem tem rocess ocess cess ess erminated rminated minated inated nated ated ted"},
  {t:"系统错误 / CRITICAL_PROCESS_DIED",p:"system/errors.html",kw:"系统错误 critical_process_died 蓝屏 bsod bugcheck bug critical process died ritical itical tical ical cal rocess ocess cess ess ied"},
  {t:"系统错误 / KERNEL_SECURITY_CHECK_FAILURE",p:"system/errors.html",kw:"系统错误 kernel_security_check_failure 蓝屏 bsod bugcheck bug kernel security check failure ernel rnel nel ecurity curity urity rity ity heck eck ailure ilure lure ure"},
  {t:"系统错误 / 无法启动此程序，因为计算机中丢失 xxx.dll",p:"system/errors.html",kw:"系统错误 无法启动此程序，因为计算机中丢失 xxx.dll 蓝屏 bsod bugcheck bug xxx dll"},
  {t:"系统错误 / 错误 0x80070002 / 0x80070003 — 找不到文件",p:"system/errors.html",kw:"系统错误 错误 0x80070002 / 0x80070003 — 找不到文件 蓝屏 bsod bugcheck bug 0x80070002 0x80070003 x80070002 80070002 0070002 070002 70002 0002 002 x80070003 80070003 0070003 070003 70003 0003 003"},
  {t:"系统错误 / 0xc0000225 — 找不到启动设备",p:"system/errors.html",kw:"系统错误 0xc0000225 — 找不到启动设备 蓝屏 bsod bugcheck bug 0xc0000225 xc0000225 c0000225 0000225 000225 00225 0225 225"},
  {t:"系统错误 / 0xc000000F — Windows 启动管理器错误",p:"system/errors.html",kw:"系统错误 0xc000000f — windows 启动管理器错误 蓝屏 bsod bugcheck bug 0xc000000f windows xc000000f c000000f 000000f 00000f 0000f 000f 00f indows ndows dows ows"},
  {t:"系统错误 / 0x80004005 — 未指明的通用错误",p:"system/errors.html",kw:"系统错误 0x80004005 — 未指明的通用错误 蓝屏 bsod bugcheck bug 0x80004005 x80004005 80004005 0004005 004005 04005 4005 005"},
  {t:"系统错误 / DNS 服务器未响应",p:"system/errors.html",kw:"系统错误 dns 服务器未响应 蓝屏 bsod bugcheck bug dns"},
  {t:"系统错误 / ERR_CONNECTION_RESET / 连接已重置",p:"system/errors.html",kw:"系统错误 err_connection_reset / 连接已重置 蓝屏 bsod bugcheck bug err connection reset onnection nnection nection ection ction tion ion eset set"},
  {t:"系统错误 / ERR_NAME_NOT_RESOLVED / 无法解析服务器地址",p:"system/errors.html",kw:"系统错误 err_name_not_resolved / 无法解析服务器地址 蓝屏 bsod bugcheck bug err name not resolved ame esolved solved olved lved ved"},
  {t:"系统错误 / 0x800CCC0F — 邮件端口出站被挡",p:"system/errors.html",kw:"系统错误 0x800ccc0f — 邮件端口出站被挡 蓝屏 bsod bugcheck bug 0x800ccc0f x800ccc0f 800ccc0f 00ccc0f 0ccc0f ccc0f cc0f c0f"},
  {t:"系统错误 / 0x80070020 — 程序正在使用",p:"system/errors.html",kw:"系统错误 0x80070020 — 程序正在使用 蓝屏 bsod bugcheck bug 0x80070020 x80070020 80070020 0070020 070020 70020 0020 020"},
  {t:"系统错误 / 0x80072EE2  / 0x80072F8F — 时间与服务器不同步",p:"system/errors.html",kw:"系统错误 0x80072ee2  / 0x80072f8f — 时间与服务器不同步 蓝屏 bsod bugcheck bug 0x80072ee2 0x80072f8f x80072ee2 80072ee2 0072ee2 072ee2 72ee2 2ee2 ee2 x80072f8f 80072f8f 0072f8f 072f8f 72f8f 2f8f f8f"},
  {t:"系统错误 / 0x800F0922 — 太小的系统保留分区",p:"system/errors.html",kw:"系统错误 0x800f0922 — 太小的系统保留分区 蓝屏 bsod bugcheck bug 0x800f0922 x800f0922 800f0922 00f0922 0f0922 f0922 0922 922"},
  {t:"系统错误 / 0x8024200B — 更新下载损坏",p:"system/errors.html",kw:"系统错误 0x8024200b — 更新下载损坏 蓝屏 bsod bugcheck bug 0x8024200b x8024200b 8024200b 024200b 24200b 4200b 200b 00b"},
  {t:"系统错误 / 0x800703EE (文件污染)",p:"system/errors.html",kw:"系统错误 0x800703ee (文件污染) 蓝屏 bsod bugcheck bug 0x800703ee x800703ee 800703ee 00703ee 0703ee 703ee 03ee 3ee"},
  {t:"系统错误 / 0x8007001F — 设备未运行完全",p:"system/errors.html",kw:"系统错误 0x8007001f — 设备未运行完全 蓝屏 bsod bugcheck bug 0x8007001f x8007001f 8007001f 007001f 07001f 7001f 001f 01f"},
  {t:"Windows / 用户界面与交互变化",p:"system/win1011.html",kw:"windows 用户界面与交互变化 win windows win"},
  {t:"Windows / 硬件与底层架构差异",p:"system/win1011.html",kw:"windows 硬件与底层架构差异 win windows win"},
  {t:"Windows / 性能与兼容性",p:"system/win1011.html",kw:"windows 性能与兼容性 win windows win"},
  {t:"Windows / 升级建议",p:"system/win1011.html",kw:"windows 升级建议 win windows win"},
  {t:"Windows / UEFI 安全策略",p:"system/win1011.html",kw:"windows uefi 安全策略 win windows win uefi efi"},
  {t:"Windows / 注意事项",p:"system/win1011.html",kw:"windows 注意事项 win windows win"},
  {t:"Linux/macOS / Linux 发行版定位与选择",p:"system/linux-mac.html",kw:"linux/macos linux 发行版定位与选择 linux ubuntu macos mac os linux inux nux"},
  {t:"Linux/macOS / 终端常用姿势",p:"system/linux-mac.html",kw:"linux/macos 终端常用姿势 linux ubuntu macos mac os"},
  {t:"Linux/macOS / WSL2——在 Windows 中运行真实 Linux 内核",p:"system/linux-mac.html",kw:"linux/macos wsl2——在 windows 中运行真实 linux 内核 linux ubuntu macos mac os wsl2 windows linux sl2 indows ndows dows ows inux nux"},
  {t:"Linux/macOS / macOS 系统",p:"system/linux-mac.html",kw:"linux/macos macos 系统 linux ubuntu macos mac os macos acos cos"},
  {t:"Linux/macOS / 跨平台差异化",p:"system/linux-mac.html",kw:"linux/macos 跨平台差异化 linux ubuntu macos mac os"},
  {t:"激活 / 什么是数字许可证",p:"system/activation.html",kw:"激活 什么是数字许可证"},
  {t:"激活 / 操作步骤",p:"system/activation.html",kw:"激活 操作步骤"},
  {t:"激活 / KMS 是什么",p:"system/activation.html",kw:"激活 kms 是什么 kms"},
  {t:"激活 / 常用 slmgr 命令",p:"system/activation.html",kw:"激活 常用 slmgr 命令 slmgr lmgr mgr"},
  {t:"下载 / ISO 镜像下载页",p:"system/download.html",kw:"下载 iso 镜像下载页 iso"},
  {t:"下载 / 官方工具集",p:"system/download.html",kw:"下载 官方工具集"},
  {t:"下载 / 激活与许可证",p:"system/download.html",kw:"下载 激活与许可证"},
  {t:"AI Agent / 核心区别：AI 聊天 vs AI Agent",p:"software/ai-agent.html",kw:"ai agent 核心区别：ai 聊天 vs ai agent ai vs agent gent ent"},
  {t:"AI Agent / 💻 OpenAI Codex CLI",p:"software/ai-agent.html",kw:"ai agent 💻 openai codex cli openai codex cli penai enai nai odex dex"},
  {t:"AI Agent / ☁️ Claude Code",p:"software/ai-agent.html",kw:"ai agent ☁️ claude code claude code laude aude ude ode"},
  {t:"AI Agent / 🤖 其他重要 Agent 工具",p:"software/ai-agent.html",kw:"ai agent 🤖 其他重要 agent 工具 agent gent ent"},
  {t:"AI Agent / 🔑 API Key = 你的数字身份证",p:"software/ai-agent.html",kw:"ai agent 🔑 api key = 你的数字身份证 api key"},
  {t:"AI Agent / 📋 从哪能免费拿到 API Key？",p:"software/ai-agent.html",kw:"ai agent 📋 从哪能免费拿到 api key？ api key"},
  {t:"AI Agent / 📜 Rule（规则）= 你给 Agent 写的法律规定",p:"software/ai-agent.html",kw:"ai agent 📜 rule（规则）= 你给 agent 写的法律规定 rule agent ule gent ent"},
  {t:"AI Agent / 另一种 Rule：定期自动执行",p:"software/ai-agent.html",kw:"ai agent 另一种 rule：定期自动执行 rule ule"},
  {t:"AI Agent / 🎯 Skill = 一套专属的说明书",p:"software/ai-agent.html",kw:"ai agent 🎯 skill = 一套专属的说明书 skill kill ill"},
  {t:"AI Agent / 实际例子",p:"software/ai-agent.html",kw:"ai agent 实际例子"},
  {t:"AI Agent / Token 是什么",p:"software/ai-agent.html",kw:"ai agent token 是什么 token oken ken"},
  {t:"AI Agent / RAG — 给 AI 更有实料的知识",p:"software/ai-agent.html",kw:"ai agent rag — 给 ai 更有实料的知识 rag ai"},
  {t:"GitHub / Star（收藏）",p:"software/github.html",kw:"github star（收藏） 开源 git star tar"},
  {t:"GitHub / Fork（叉一叉）",p:"software/github.html",kw:"github fork（叉一叉） 开源 git fork ork"},
  {t:"GitHub / Pull Request (PR)",p:"software/github.html",kw:"github pull request (pr) 开源 git pull request pr ull equest quest uest est"},
  {t:"GitHub / Issues",p:"software/github.html",kw:"github issues 开源 git ssues sues ues"},
  {t:"GitHub / 🎵 GenP — Adobe 激活补丁",p:"software/github.html",kw:"github 🎵 genp — adobe 激活补丁 开源 git genp adobe enp dobe obe"},
  {t:"GitHub / 🧠 LM Studio — 图形化本地大模型管家",p:"software/github.html",kw:"github 🧠 lm studio — 图形化本地大模型管家 开源 git lm studio tudio udio dio"},
  {t:"GitHub / 🎨 Stable Diffusion WebUI — 本地 AI 画图（浏览器版）",p:"software/github.html",kw:"github 🎨 stable diffusion webui — 本地 ai 画图（浏览器版） 开源 git stable diffusion webui ai table able ble iffusion ffusion fusion usion sion ion ebui bui"},
  {t:"GitHub / 🔮 ComfyUI — 节点式 AI 作图工作流",p:"software/github.html",kw:"github 🔮 comfyui — 节点式 ai 作图工作流 开源 git comfyui ai omfyui mfyui fyui yui"},
  {t:"GitHub / 🛠 图吧工具箱 — 电脑硬件检测合集",p:"software/github.html",kw:"github 🛠 图吧工具箱 — 电脑硬件检测合集 开源 git"},
  {t:"GitHub / 🧩 ImHex — 十六进制文件编辑器",p:"software/github.html",kw:"github 🧩 imhex — 十六进制文件编辑器 开源 git imhex mhex hex"},
  {t:"GitHub / 🔊 OBS Studio — 免费直播/录屏/推流",p:"software/github.html",kw:"github 🔊 obs studio — 免费直播/录屏/推流 开源 git obs studio tudio udio dio"},
  {t:"GitHub / 📁 EverythingToolbar — 秒级全盘文件搜索",p:"software/github.html",kw:"github 📁 everythingtoolbar — 秒级全盘文件搜索 开源 git everythingtoolbar verythingtoolbar erythingtoolbar rythingtoolbar ythingtoolbar thingtoolbar hingtoolbar ingtoolbar ngtoolbar gtoolbar toolbar oolbar olbar lbar bar"},
  {t:"GitHub / 🌲 PowerToys — 微软官方增强套件",p:"software/github.html",kw:"github 🌲 powertoys — 微软官方增强套件 开源 git powertoys owertoys wertoys ertoys rtoys toys oys"},
  {t:"安全 / 火绒安全软件",p:"software/security.html",kw:"安全 火绒安全软件 病毒 防火墙 杀毒"},
  {t:"安全 / 360 安全卫士",p:"software/security.html",kw:"安全 360 安全卫士 病毒 防火墙 杀毒 360"},
  {t:"安全 / 🦊 银狐病毒 (Silver Fox)",p:"software/security.html",kw:"安全 🦊 银狐病毒 (silver fox) 病毒 防火墙 杀毒 silver fox ilver lver ver"},
  {t:"安全 / 🐴 木马病毒 (Trojan)",p:"software/security.html",kw:"安全 🐴 木马病毒 (trojan) 病毒 防火墙 杀毒 trojan rojan ojan jan"},
  {t:"安全 / ⛏ 挖矿病毒 / CryptoJacking",p:"software/security.html",kw:"安全 ⛏ 挖矿病毒 / cryptojacking 病毒 防火墙 杀毒 cryptojacking ryptojacking yptojacking ptojacking tojacking ojacking jacking acking cking king ing"},
  {t:"安全 / 🔒 勒索病毒 (Ransomware)",p:"software/security.html",kw:"安全 🔒 勒索病毒 (ransomware) 病毒 防火墙 杀毒 ransomware ansomware nsomware somware omware mware ware are"},
  {t:"安全 / 📢 流氓软件 / 广告弹窗",p:"software/security.html",kw:"安全 📢 流氓软件 / 广告弹窗 病毒 防火墙 杀毒"},
  {t:"网络 / 国内镜像站",p:"software/network.html",kw:"网络 国内镜像站 dns 代理 翻墙"},
  {t:"网络 / Gitee 国内同步",p:"software/network.html",kw:"网络 gitee 国内同步 dns 代理 翻墙 gitee itee tee"},
  {t:"网络 / arXiv · 论文识别",p:"software/network.html",kw:"网络 arxiv · 论文识别 dns 代理 翻墙 arxiv rxiv xiv"},
  {t:"网络 / 谷歌学术 / Google Scholar",p:"software/network.html",kw:"网络 谷歌学术 / google scholar dns 代理 翻墙 google scholar oogle ogle gle cholar holar olar lar"},
  {t:"网络 / Stack Overflow",p:"software/network.html",kw:"网络 stack overflow dns 代理 翻墙 stack overflow tack ack verflow erflow rflow flow low"},
  {t:"网络 / Dev.to + Medium",p:"software/network.html",kw:"网络 dev.to + medium dns 代理 翻墙 dev to medium edium dium ium"},
  {t:"网络 / edX / Coursera",p:"software/network.html",kw:"网络 edx / coursera dns 代理 翻墙 edx coursera oursera ursera rsera sera era"},
  {t:"网络 / Hugging Face",p:"software/network.html",kw:"网络 hugging face dns 代理 翻墙 hugging face ugging gging ging ing ace"},
  {t:"Python / 很多厉害的工具依赖它",p:"software/python.html",kw:"python 很多厉害的工具依赖它 python pip conda"},
  {t:"Python / 下载安装包",p:"software/python.html",kw:"python 下载安装包 python pip conda"},
  {t:"Python / 装好后验证",p:"software/python.html",kw:"python 装好后验证 python pip conda"},
  {t:"Adobe / 核心作用",p:"software/adobe.html",kw:"adobe 核心作用"},
  {t:"网址 / 🛠 图吧工具箱 — 官方网站",p:"software/links.html",kw:"网址 🛠 图吧工具箱 — 官方网站 链接 网站"},
  {t:"网址 / 📊 游戏加加 — 游戏帧数监控与优化",p:"software/links.html",kw:"网址 📊 游戏加加 — 游戏帧数监控与优化 链接 网站"},
  {t:"网址 / 🖥 CPU-Z / GPU-Z 官网",p:"software/links.html",kw:"网址 🖥 cpu-z / gpu-z 官网 链接 网站 cpu z gpu"},
  {t:"网址 / 📏 HWiNFO — 深度硬件监护",p:"software/links.html",kw:"网址 📏 hwinfo — 深度硬件监护 链接 网站 hwinfo winfo info nfo"},
  {t:"网址 / 🎮 Steam — 全球最大游戏平台",p:"software/links.html",kw:"网址 🎮 steam — 全球最大游戏平台 链接 网站 steam team eam"},
  {t:"网址 / 🟠 Epic Games Store",p:"software/links.html",kw:"网址 🟠 epic games store 链接 网站 epic games store pic ames mes tore ore"},
  {t:"网址 / 🟢 NVIDIA 驱动下载",p:"software/links.html",kw:"网址 🟢 nvidia 驱动下载 链接 网站 nvidia vidia idia dia"},
  {t:"网址 / 🔵 AMD Adrenalin — Radeon 官方驱动",p:"software/links.html",kw:"网址 🔵 amd adrenalin — radeon 官方驱动 链接 网站 amd adrenalin radeon drenalin renalin enalin nalin alin lin adeon deon eon"},
  {t:"网址 / 🔷 Intel 驱动与支持助手",p:"software/links.html",kw:"网址 🔷 intel 驱动与支持助手 链接 网站 intel ntel tel"},
  {t:"网址 / BlueScreenView / WinDbg Preview",p:"software/links.html",kw:"网址 bluescreenview / windbg preview 链接 网站 bluescreenview windbg preview luescreenview uescreenview escreenview screenview creenview reenview eenview enview nview view iew indbg ndbg dbg review eview"},
  {t:"网址 / Rufus — 纯净 U 盘制作工具",p:"software/links.html",kw:"网址 rufus — 纯净 u 盘制作工具 链接 网站 rufus u ufus fus"},
];

String.prototype.has = function(s) { return this.toLowerCase().indexOf(s.toLowerCase()) >= 0; };

function goToPage(p) {
  // Works for both file:// local and http:// deployed
  if (location.protocol === "file:") {
    // file:// needs relative path from current page
    // e.g. from hardware/cpu.html -> ../hardware/gpu.html
    var cur = location.pathname;
    var dir = cur.substring(0, cur.lastIndexOf("/"));
    // count depth relative to site root
    var parts = dir.split("/").filter(Boolean);
    // site root is "computer-knowledge" - go up to that level
    var siteIdx = parts.length - 1;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i].toLowerCase() === "computer-knowledge") { siteIdx = i; break; }
    }
    var depth = parts.length - siteIdx - 1;
    var rel = "";
    for (var i = 0; i < depth; i++) { rel += "../"; }
    location.href = rel + p;
  } else {
    // http/https: use absolute root path
    location.href = p.startsWith("/") ? p : "/" + p;
  }
}

// ====== SEARCH WIDGET ======
document.addEventListener("DOMContentLoaded", function() {
  var inp = document.getElementById("searchInput");
  var res = document.getElementById("searchResults");
  if (!inp) return;
  inp.addEventListener("input", function() {
    var q = this.value.trim();
    if (q.length < 1) { res.style.display = "none"; return; }
    var hits = pagesIndex.filter(function(p) {
      return p.t.toLowerCase().includes(q.toLowerCase()) || (p.kw || "").toLowerCase().includes(q.toLowerCase());
    });
    if (hits.length === 0) { res.style.display = "none"; return; }
    res.innerHTML = hits.map(function(h) {
      return '<div class="hit" onmousedown="goToPage(\'' + h.p + '\')" onclick="goToPage(\'' + h.p + '\')"><div class="htitle">' + h.t + '</div><div class="hpath">' + h.p + '</div></div>';
    }).join("");
    res.style.display = "block";
  });
  inp.addEventListener("blur", function() {
    setTimeout(function() { res.style.display = "none"; }, 300);
  });
});


// ====== COMMUNITY ======
var postsCache = null;


var currentTag = null;
var COLORS = ["#4fc3f7","#66bb6a","#ffa726","#ff5252","#ab47bc","#26c6da","#ef5350","#42a5f5","#9ccc65"];

function getTagCounts(posts) {
  var counts = {};
  for (var i = 0; i < posts.length; i++) {
    var tag = posts[i].tag || "\u672a\u5206\u7c7b";
    counts[tag] = (counts[tag] || 0) + 1;
  }
  return counts;
}

function renderTagBar(posts) {
  var bar = document.getElementById("tagBar");
  if (!bar) return;
  var counts = getTagCounts(posts);
  var html = '<button class="tag-filter' + (currentTag === null ? '" style="background:var(--accent2);color:#fff;"' : '"') + ' onclick="showAllTags()">\u5168\u90e8 (' + posts.length + ')</button>';
  var tags = Object.keys(counts).sort(function(a,b) { return counts[b] - counts[a]; });
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    var active = currentTag === t;
    html += '<button class="tag-filter' + (active ? '" style="background:var(--accent2);color:#fff;"' : '') + ' onclick="filterByTag(\'' + t.replace(/\//g,"\\'").replace(/'/g,"\\'") + '\')">#' + t + ' (' + counts[t] + ')</button>';
  }
  bar.innerHTML = html;
}

async function renderC() {
  var stg = document.getElementById("stage");
  if (!stg) return;

  var posts = [];
  try { posts = await loadPosts(); } catch(e) { console.error(e); }

  if (currentTag !== null) {
    posts = posts.filter(function(p) { return (p.tag || "\u672a\u5216\u7c7b") === currentTag; });
  }

  renderTagBar(posts);

  var n = posts.length || 6;
  var html = "";
  for (var i = 0; i < n; i++) {
    var p = posts[i];
    var c = COLORS[i % 9];
    var x = (i * 13 + 7) % 70;
    var y = (i * 11 + 9) % 45;
    var rot = (i * 5) % 8 - 4;
    var del = ((i * 2.8) % 11).toFixed(1);

    if (p) {
      var rc = (p.replies && p.replies.length) || 0;
      var dateStr = (new Date(p.created_at)).toISOString().slice(0, 10);
      var tagText = p.tag || "\u672a\u5206\u7c7b";
      var bodyText = (p.body || "").slice(0, 80);
      var pid = p.id;
      html += '<div class="note" style="left:' + x + '%;top:' + y + '%;transform:rotate(' + rot + 'deg);animation-delay:' + del + 's;border-left:4px solid ' + c + ';" onclick="openReply(\'' + pid + '\')"><div class="del-btn" onclick="event.stopPropagation();deletePost(\'' + pid + '\')">x</div><div class="note-tag" style="color:' + c + '">#' + tagText + '</div><div class="body">' + bodyText + '</div><div class="time">' + dateStr + (rc > 0 ? " \u00b7 " + rc + " \u015b\u015e\u015f\u015e" : "") + "</div></div>";
    } else {
      html += '<div class="note empty-note" style="left:' + x + '%;top:' + y + '%;transform:rotate(' + rot + 'deg);animation-delay:' + del + 's;border-left:4px solid ' + c + ';">\u0154\u0165\u015d\u016a\u0157\u015e...</div>';
    }
  }
  stg.innerHTML = html;
}

function filterByTag(tagName) { currentTag = tagName; renderC(); }
function showAllTags() { currentTag = null; renderC(); }

// ---- Post ----
function communityPostOpen() {
  document.getElementById("postModal").classList.add("open");
}

function communityPostClose() {
  document.getElementById("postModal").classList.remove("open");
  document.getElementById("postBody").value = "";
  document.getElementById("postTag").value = "";
}

async function communityPost() {
  if (!isLoggedIn()) { alert("\u6cbf\u5148\u767b\u5f55\u518d\u53d1\u5e16"); return; }
  var body = document.getElementById("postBody").value.trim();
  var tag = document.getElementById("postTag").value.trim() || "\u672a\u5206\u7c7b";
  if (!body) return alert("\u5185\u0169\u4e0d\u80fd\u4e3a\u7a7a");

  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await apiPost("/api/posts", { id: id, tag: tag, body: body, replies: [] });
    communityPostClose();
    currentTag = null;
    renderC();
  } catch(e) { alert("\u53d1\u5e03\u5931\u8d25: " + e.message); }
}

async function deletePost(id) {
  if (!confirm("\u5bec\u8a0e\u8fd9\u676f\u8ba8\u8aea\u7ffc\uff1f")) return;
  try {
    await apiDelete("/api/posts/" + id);
    renderC();
  } catch(e) { alert("\u5220\u9664\u5931\u8d25: " + e.message); }
}

// ---- Reply ----
async function openReply(postId) {
  var posts = [];
  try { posts = await loadPosts(); } catch(e) { return; }
  var post = null;
  for (var i = 0; i < posts.length; i++) {
    if (posts[i].id === postId) { post = posts[i]; break; }
  }
  if (!post) return;

  document.getElementById("replyPostId").value = postId;
  document.getElementById("replyPostBody").textContent = post.body;
  document.getElementById("replyPostTag").textContent = "#" + (post.tag || "\u672a\u5206\u7c7b");
  
  var replies = post.replies || [];
  var rh = "";
  for (var j = 0; j < replies.length; j++) {
    rh += '<div class="reply-item"><span class="reply-ts">' + replies[j].ts + '</span><span class="reply-text">' + replies[j].body + '</span></div>';
  }
  document.getElementById("replyList").innerHTML = rh || '<div class="reply-empty">\u0155\u0170\u0161\u0162\u015a\u016f\u0161\u0163\uff0c\u016d\u0165\u015d\u0157\u015f\u0167\u0163\u0069\u006c\u0069\u006d\u0069\u0123\u006f\u0069\u0063\u0061\u0069\u0123\u0069</div>';
  document.getElementById("replyModal").classList.add("open");
}

async function replyPost() {
  if (!isLoggedIn()) { alert("\u6cbf\u5148\u767b\u5f55\u518d\u0159\u015e\u015f\u015e"); return; }
  var postId = document.getElementById("replyPostId").value;
  var text = document.getElementById("replyInput").value.trim();
  if (!text) return alert("\u0159\u0105\u015e\u015f\u015e\u0163\u0161\u0162\u013b\u0170\u0161\u0163");

  var posts = [];
  try { posts = await loadPosts(); } catch(e) { return; }
  for (var i = 0; i < posts.length; i++) {
    if (posts[i].id === postId) {
      var replies = posts[i].replies || [];
      replies.push({ ts: fmtNow(), body: text });
      try {
        await apiPatch("/api/posts/" + postId + "/replies", { replies: replies });
        document.getElementById("replyInput").value = "";
        replyClose();
        renderC();
      } catch(e) { alert("\u0159\u015e\u015f\u015e\u0163\u016e\u0161\u0163"); }
      break;
    }
  }
}

function replyClose() {
  document.getElementById("replyModal").classList.remove("open");
}

// ---- Community over insert ----
function communityOpen() {
  document.getElementById("mainPage").style.display = "none";
  document.getElementById("co").classList.add("open");
  setTimeout(renderC, 50);
}

function communityClose() {
  document.getElementById("mainPage").style.display = "";
  document.getElementById("co").classList.remove("open");
}

// ====== INIT ======
window.addEventListener("load", function() {
  loadSession();
  updateUserUI();
});

