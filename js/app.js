/* ====== computer-knowledge API Client ====== */
// All requests go through Cloudflare Workers API
// No Supabase keys exposed to frontend

// Change this after deploying your Worker
var API_BASE = "/api"; // 同源代理：Netlify _redirects 转发到 Cloudflare Worker
// Or use local proxy for dev: "http://localhost:8787"

// ====== AUTH STATE ======
var currentUser = null;
var token = null;
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
  if (!email) { alert("鐠囩柉绶崗銉╁仏缁?); return; }

  var btn = event.target;
  btn.disabled = true;
  btn.textContent = "閸欐垿鈧椒鑵?..";

  try {
    await apiPost("/api/auth/send-code", { email: email });
    document.getElementById("loginStep1").style.display = "none";
    document.getElementById("loginStep2").style.display = "";
    document.getElementById("loginEmailDisplay").textContent = email;
  } catch(e) {
    alert("閸欐垿鈧礁銇戠拹? " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "閸欐垿鈧線鐛欑拠浣虹垳";
  }
}

// Step 2: Verify code and login
async function verifyLoginCode() {
  var email = document.getElementById("loginEmail").value.trim();
  var code = document.getElementById("loginCode").value.trim();
  if (!code) { alert("鐠囩柉绶崗銉╃崣鐠囦胶鐖?); return; }

  var btn = event.target;
  btn.disabled = true;
  btn.textContent = "妤犲矁鐦夋稉?..";

  try {
    var data = await apiPost("/api/auth/verify-code", { email: email, code: code });
    token = data.token;
    currentUser = data.user;
    saveSession();
    loginClose();
    updateUserUI();
  } catch(e) {
    alert("妤犲矁鐦夋径杈Е: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "閻ц缍?;
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
  {t:"CPU / i3 閳?閸忋儵妫?/ 鏉炶濮欓崗?,p:"hardware/cpu.html",kw:"cpu i3 閳?閸忋儵妫?/ 鏉炶濮欓崗?婢跺嫮鎮婇崳?i3"},
  {t:"CPU / i5 閳?娑撶粯绁﹂幀褑鍏?,p:"hardware/cpu.html",kw:"cpu i5 閳?娑撶粯绁﹂幀褑鍏?婢跺嫮鎮婇崳?i5"},
  {t:"CPU / i7 閳?妤傛顏径姘崲閸?,p:"hardware/cpu.html",kw:"cpu i7 閳?妤傛顏径姘崲閸?婢跺嫮鎮婇崳?i7"},
  {t:"CPU / i9 閳?閺冩鍩岄弸渚€妾洪幀褑鍏?,p:"hardware/cpu.html",kw:"cpu i9 閳?閺冩鍩岄弸渚€妾洪幀褑鍏?婢跺嫮鎮婇崳?i9"},
  {t:"CPU / Core Ultra 5 / 7 / 9",p:"hardware/cpu.html",kw:"cpu core ultra 5 / 7 / 9 婢跺嫮鎮婇崳?core ultra 5 7 9 ore ltra tra"},
  {t:"CPU / Ryzen 3 閳?閸忋儵妫?,p:"hardware/cpu.html",kw:"cpu ryzen 3 閳?閸忋儵妫?婢跺嫮鎮婇崳?ryzen 3 yzen zen"},
  {t:"CPU / Ryzen 5 閳?娑撶粯绁﹂悽婊呭仯",p:"hardware/cpu.html",kw:"cpu ryzen 5 閳?娑撶粯绁﹂悽婊呭仯 婢跺嫮鎮婇崳?ryzen 5 yzen zen"},
  {t:"CPU / Ryzen 7 閳?妤傛ɑ鏅ユ径姘壋",p:"hardware/cpu.html",kw:"cpu ryzen 7 閳?妤傛ɑ鏅ユ径姘壋 婢跺嫮鎮婇崳?ryzen 7 yzen zen"},
  {t:"CPU / Ryzen 9 閳?濡楀矂娼伴弮妤勫煂",p:"hardware/cpu.html",kw:"cpu ryzen 9 閳?濡楀矂娼伴弮妤勫煂 婢跺嫮鎮婇崳?ryzen 9 yzen zen"},
  {t:"GPU / XX50 缁?閳?閸忋儵妫崡?,p:"hardware/gpu.html",kw:"gpu xx50 缁?閳?閸忋儵妫崡?閺勬儳宕?閸ユ儳鑸伴崡?xx50 x50"},
  {t:"GPU / XX60 缁?閳?閻㈡粎鍋ｇ痪褝绱欑憗鍛簚閺堚偓婢堆傜秼闁插骏绱?,p:"hardware/gpu.html",kw:"gpu xx60 缁?閳?閻㈡粎鍋ｇ痪褝绱欑憗鍛簚閺堚偓婢堆傜秼闁插骏绱?閺勬儳宕?閸ユ儳鑸伴崡?xx60 x60"},
  {t:"GPU / XX70 缁?閳?妤傛顏挧閿嬵劄",p:"hardware/gpu.html",kw:"gpu xx70 缁?閳?妤傛顏挧閿嬵劄 閺勬儳宕?閸ユ儳鑸伴崡?xx70 x70"},
  {t:"GPU / XX80 缁?閳?濞嗏剝妫楅懜?,p:"hardware/gpu.html",kw:"gpu xx80 缁?閳?濞嗏剝妫楅懜?閺勬儳宕?閸ユ儳鑸伴崡?xx80 x80"},
  {t:"GPU / XX90 缁?閳?閸楋紕娈?,p:"hardware/gpu.html",kw:"gpu xx90 缁?閳?閸楋紕娈?閺勬儳宕?閸ユ儳鑸伴崡?xx90 x90"},
  {t:"GPU / 30 缁?(Ampere)閳?0 缁?(Ada Lovelace)閳?0 缁?(Blackwell, 2025+)",p:"hardware/gpu.html",kw:"gpu 30 缁?(ampere)閳?0 缁?(ada lovelace)閳?0 缁?(blackwell, 2025+) 閺勬儳宕?閸ユ儳鑸伴崡?30 ampere 40 ada lovelace 50 blackwell 2025 mpere pere ere ovelace velace elace lace ace lackwell ackwell ckwell kwell well ell 025"},
  {t:"GPU / RX X600 缁狙€鍟媂700(閻㈡粎鍋?閳壔800(濞嗏剝妫楅懜?閳壔900(閺冩鍩?",p:"hardware/gpu.html",kw:"gpu rx x600 缁狙€鍟媥700(閻㈡粎鍋?閳姸800(濞嗏剝妫楅懜?閳姸900(閺冩鍩? 閺勬儳宕?閸ユ儳鑸伴崡?rx x600 x700 x800 x900 600 700 800 900"},
  {t:"GPU / Arc A300 / A500 / A700 閳?Battlemage (B 缁鍨?",p:"hardware/gpu.html",kw:"gpu arc a300 / a500 / a700 閳?battlemage (b 缁鍨? 閺勬儳宕?閸ユ儳鑸伴崡?arc a300 a500 a700 battlemage b 300 500 700 attlemage ttlemage tlemage lemage emage mage age"},
  {t:"GPU / 棣冨娇 娑撯偓缁惧灝銇囬崢鍌︾礄瀹搞儳鈻肩粔顖滅柈濞ｅ崬甯ら敍?,p:"hardware/gpu.html",kw:"gpu 棣冨娇 娑撯偓缁惧灝銇囬崢鍌︾礄瀹搞儳鈻肩粔顖滅柈濞ｅ崬甯ら敍?閺勬儳宕?閸ユ儳鑸伴崡?},
  {t:"GPU / 棣冨娇 娑擃厼娴楁稉鏄忣洣閸濅胶澧?,p:"hardware/gpu.html",kw:"gpu 棣冨娇 娑擃厼娴楁稉鏄忣洣閸濅胶澧?閺勬儳宕?閸ユ儳鑸伴崡?},
  {t:"GPU / 棣冨娇 閸忔湹绮划楣冣偓澶婃惂閻?,p:"hardware/gpu.html",kw:"gpu 棣冨娇 閸忔湹绮划楣冣偓澶婃惂閻?閺勬儳宕?閸ユ儳鑸伴崡?},
  {t:"GPU / 鐢箑顔旈崗顒€绱?,p:"hardware/gpu.html",kw:"gpu 鐢箑顔旈崗顒€绱?閺勬儳宕?閸ユ儳鑸伴崡?},
  {t:"GPU / 閹恒劏宕樻径褍鐨?,p:"hardware/gpu.html",kw:"gpu 閹恒劏宕樻径褍鐨?閺勬儳宕?閸ユ儳鑸伴崡?},
  {t:"娑撶粯婢?/ H610 閳?閸忋儵妫痪?,p:"hardware/motherboard.html",kw:"娑撶粯婢?h610 閳?閸忋儵妫痪?娑撶粯婢樻稉搴㈡簚缁?h610 610"},
  {t:"娑撶粯婢?/ B760 閳?娑撶粯绁?,p:"hardware/motherboard.html",kw:"娑撶粯婢?b760 閳?娑撶粯绁?娑撶粯婢樻稉搴㈡簚缁?b760 760"},
  {t:"娑撶粯婢?/ Z790 閳?閺冩鍩?,p:"hardware/motherboard.html",kw:"娑撶粯婢?z790 閳?閺冩鍩?娑撶粯婢樻稉搴㈡簚缁?z790 790"},
  {t:"娑撶粯婢?/ A620 閳?閸忋儵妫?(AM5)",p:"hardware/motherboard.html",kw:"娑撶粯婢?a620 閳?閸忋儵妫?(am5) 娑撶粯婢樻稉搴㈡簚缁?a620 am5 620"},
  {t:"娑撶粯婢?/ B650 / B650E 閳?娑撶粯绁?,p:"hardware/motherboard.html",kw:"娑撶粯婢?b650 / b650e 閳?娑撶粯绁?娑撶粯婢樻稉搴㈡簚缁?b650 b650e 650 650e 50e"},
  {t:"娑撶粯婢?/ X670 / X670E 閳?閺冩鍩?,p:"hardware/motherboard.html",kw:"娑撶粯婢?x670 / x670e 閳?閺冩鍩?娑撶粯婢樻稉搴㈡簚缁?x670 x670e 670 670e 70e"},
  {t:"娑撶粯婢?/ 棣冩憲 鐢?WiFi 閻楀牊婀?,p:"hardware/motherboard.html",kw:"娑撶粯婢?棣冩憲 鐢?wifi 閻楀牊婀?娑撶粯婢樻稉搴㈡簚缁?wifi ifi"},
  {t:"娑撶粯婢?/ 棣冩敳 娑撳秴鐢?WiFi 閻楀牊婀?,p:"hardware/motherboard.html",kw:"娑撶粯婢?棣冩敳 娑撳秴鐢?wifi 閻楀牊婀?娑撶粯婢樻稉搴㈡簚缁?wifi ifi"},
  {t:"娑撶粯婢?/ Mini-ITX閿?70mm 鑴?170mm閿?,p:"hardware/motherboard.html",kw:"娑撶粯婢?mini-itx閿?70mm 鑴?170mm閿?娑撶粯婢樻稉搴㈡簚缁?mini itx 170mm ini 70mm 0mm"},
  {t:"娑撶粯婢?/ Micro-ATX閿?44mm 鑴?244mm閿?,p:"hardware/motherboard.html",kw:"娑撶粯婢?micro-atx閿?44mm 鑴?244mm閿?娑撶粯婢樻稉搴㈡簚缁?micro atx 244mm icro cro 44mm 4mm"},
  {t:"娑撶粯婢?/ Standard ATX閿?05mm 鑴?244mm閿?,p:"hardware/motherboard.html",kw:"娑撶粯婢?standard atx閿?05mm 鑴?244mm閿?娑撶粯婢樻稉搴㈡簚缁?standard atx 305mm 244mm tandard andard ndard dard ard 05mm 5mm 44mm 4mm"},
  {t:"娑撶粯婢?/ Extended-ATX閿?05mm 鑴?277mm+閿?,p:"hardware/motherboard.html",kw:"娑撶粯婢?extended-atx閿?05mm 鑴?277mm+閿?娑撶粯婢樻稉搴㈡簚缁?extended atx 305mm 277mm xtended tended ended nded ded 05mm 5mm 77mm 7mm"},
  {t:"娑撶粯婢?/ ITX 閺堣櫣顔?,p:"hardware/motherboard.html",kw:"娑撶粯婢?itx 閺堣櫣顔?娑撶粯婢樻稉搴㈡簚缁?itx"},
  {t:"娑撶粯婢?/ M-ATX 閺堣櫣顔?,p:"hardware/motherboard.html",kw:"娑撶粯婢?m-atx 閺堣櫣顔?娑撶粯婢樻稉搴㈡簚缁?m atx"},
  {t:"娑撶粯婢?/ ATX 娑擃厼顢?,p:"hardware/motherboard.html",kw:"娑撶粯婢?atx 娑擃厼顢?娑撶粯婢樻稉搴㈡簚缁?atx"},
  {t:"娑撶粯婢?/ E-ATX 閸忋劌顢?,p:"hardware/motherboard.html",kw:"娑撶粯婢?e-atx 閸忋劌顢?娑撶粯婢樻稉搴㈡簚缁?e atx"},
  {t:"閸愬懎鐡?/ 闁倻鏁ら崷鐑樻珯",p:"hardware/ram.html",kw:"閸愬懎鐡?闁倻鏁ら崷鐑樻珯 ram"},
  {t:"閸愬懎鐡?/ 閸欏矂鈧岸浜?vs 閸ユ盯鈧岸浜?,p:"hardware/ram.html",kw:"閸愬懎鐡?閸欏矂鈧岸浜?vs 閸ユ盯鈧岸浜?ram vs"},
  {t:"绾剛娲?/ SATA SSD",p:"hardware/storage.html",kw:"绾剛娲?sata ssd ssd hdd 绾句胶娲?sata ssd ata"},
  {t:"绾剛娲?/ M.2 NVMe SSD",p:"hardware/storage.html",kw:"绾剛娲?m.2 nvme ssd ssd hdd 绾句胶娲?m 2 nvme ssd vme"},
  {t:"绾剛娲?/ 婢堆冾啇闁插繐缍婂?,p:"hardware/storage.html",kw:"绾剛娲?婢堆冾啇闁插繐缍婂?ssd hdd 绾句胶娲?},
  {t:"绾剛娲?/ CMR vs SMR",p:"hardware/storage.html",kw:"绾剛娲?cmr vs smr ssd hdd 绾句胶娲?cmr vs smr"},
  {t:"閻㈠灚绨?/ 450W - 550W",p:"hardware/psu.html",kw:"閻㈠灚绨?450w - 550w 450w 550w 50w"},
  {t:"閻㈠灚绨?/ 650W - 750W",p:"hardware/psu.html",kw:"閻㈠灚绨?650w - 750w 650w 750w 50w"},
  {t:"閻㈠灚绨?/ 850W - 1200W",p:"hardware/psu.html",kw:"閻㈠灚绨?850w - 1200w 850w 1200w 50w 200w 00w"},
  {t:"閻㈠灚绨?/ 棣冨殹棣冨毃 閺冦儲婀伴悽闈涱啇閿涘牊妫╃化鑽ゆ暩鐎圭櫢绱?,p:"hardware/psu.html",kw:"閻㈠灚绨?棣冨殹棣冨毃 閺冦儲婀伴悽闈涱啇閿涘牊妫╃化鑽ゆ暩鐎圭櫢绱?},
  {t:"閻㈠灚绨?/ 棣冨毈棣冨毎 閸欑増鍜曢悽闈涱啇",p:"hardware/psu.html",kw:"閻㈠灚绨?棣冨毈棣冨毎 閸欑増鍜曢悽闈涱啇"},
  {t:"閻㈠灚绨?/ 棣冨殮棣冨殾 婢堆囨閻㈤潧顔?,p:"hardware/psu.html",kw:"閻㈠灚绨?棣冨殮棣冨殾 婢堆囨閻㈤潧顔?},
  {t:"閺侊絿鍎?/ 妞嬪骸鍠庨弫锝囧劰",p:"hardware/cooling.html",kw:"閺侊絿鍎?妞嬪骸鍠庨弫锝囧劰 妞嬪孩澧?濮樻潙鍠?},
  {t:"閺侊絿鍎?/ 濮樻潙鍠庨弫锝囧劰",p:"hardware/cooling.html",kw:"閺侊絿鍎?濮樻潙鍠庨弫锝囧劰 妞嬪孩澧?濮樻潙鍠?},
  {t:"閺侊絿鍎?/ 鐞氼偄濮╅弫锝囧劰",p:"hardware/cooling.html",kw:"閺侊絿鍎?鐞氼偄濮╅弫锝囧劰 妞嬪孩澧?濮樻潙鍠?},
  {t:"閺侊絿鍎?/ 閸撳秴鎯涢崥搴㈠笓",p:"hardware/cooling.html",kw:"閺侊絿鍎?閸撳秴鎯涢崥搴㈠笓 妞嬪孩澧?濮樻潙鍠?},
  {t:"閺侊絿鍎?/ 濮濓絽甯?vs 鐠愮喎甯?,p:"hardware/cooling.html",kw:"閺侊絿鍎?濮濓絽甯?vs 鐠愮喎甯?妞嬪孩澧?濮樻潙鍠?vs"},
  {t:"婢舵牞顔?/ DPI (濮ｅ繗瀚崇€靛摜鍋ｉ弫?",p:"hardware/peripherals.html",kw:"婢舵牞顔?dpi (濮ｅ繗瀚崇€靛摜鍋ｉ弫? 闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?dpi"},
  {t:"婢舵牞顔?/ 閸ョ偞濮ら悳?(Polling Rate)",p:"hardware/peripherals.html",kw:"婢舵牞顔?閸ョ偞濮ら悳?(polling rate) 闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?polling rate olling lling ling ing ate"},
  {t:"婢舵牞顔?/ 棣冩惞 鐏忓搫顕柅鐔哥叀閿涘牆鐖剁憴浣稿棘閻撗呭⒖娴ｆ搫绱?,p:"hardware/peripherals.html",kw:"婢舵牞顔?棣冩惞 鐏忓搫顕柅鐔哥叀閿涘牆鐖剁憴浣稿棘閻撗呭⒖娴ｆ搫绱?闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?},
  {t:"婢舵牞顔?/ 棣冨腹 閼规彃鐓欑拠锕佇?,p:"hardware/peripherals.html",kw:"婢舵牞顔?棣冨腹 閼规彃鐓欑拠锕佇?闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?},
  {t:"婢舵牞顔?/ sRGB",p:"hardware/peripherals.html",kw:"婢舵牞顔?srgb 闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?rgb"},
  {t:"婢舵牞顔?/ DCI-P3閿涘牏鏁歌ぐ杈╅獓閼规彃鐓欓敍?,p:"hardware/peripherals.html",kw:"婢舵牞顔?dci-p3閿涘牏鏁歌ぐ杈╅獓閼规彃鐓欓敍?闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?dci p3"},
  {t:"婢舵牞顔?/ Adobe RGB",p:"hardware/peripherals.html",kw:"婢舵牞顔?adobe rgb 闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?adobe rgb dobe obe"},
  {t:"婢舵牞顔?/ 棣冩惗 闁妯夌粈鍝勬珤鐟曚胶婀呴惃鍕娑擃亜寮弫?,p:"hardware/peripherals.html",kw:"婢舵牞顔?棣冩惗 闁妯夌粈鍝勬珤鐟曚胶婀呴惃鍕娑擃亜寮弫?闁款喚娲?姒х姵鐖?閺勫墽銇氶崳?},
  {t:"缁崵绮洪柨娆掝嚖 / 0x0000007B 閳?INACCESSIBLE_BOOT_DEVICE",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x0000007b 閳?inaccessible_boot_device 閽冩繂鐫?bsod bugcheck bug 0x0000007b inaccessible boot device x0000007b 0000007b 000007b 00007b 0007b 007b 07b naccessible accessible ccessible cessible essible ssible sible ible ble oot evice vice ice"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x000000EA 閳?THREAD_STUCK_IN_DEVICE_DRIVER",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x000000ea 閳?thread_stuck_in_device_driver 閽冩繂鐫?bsod bugcheck bug 0x000000ea thread stuck in device driver x000000ea 000000ea 00000ea 0000ea 000ea 00ea 0ea hread read ead tuck uck evice vice ice river iver ver"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x00000050 閳?PAGE_FAULT_IN_NONPAGED_AREA",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x00000050 閳?page_fault_in_nonpaged_area 閽冩繂鐫?bsod bugcheck bug 0x00000050 page fault in nonpaged area x00000050 00000050 0000050 000050 00050 0050 050 age ault ult onpaged npaged paged aged ged rea"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x0000001A 閳?MEMORY_MANAGEMENT",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x0000001a 閳?memory_management 閽冩繂鐫?bsod bugcheck bug 0x0000001a memory management x0000001a 0000001a 000001a 00001a 0001a 001a 01a emory mory ory anagement nagement agement gement ement ment ent"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x000000D1 閳?DRIVER_IRQL_NOT_LESS_OR_EQUAL",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x000000d1 閳?driver_irql_not_less_or_equal 閽冩繂鐫?bsod bugcheck bug 0x000000d1 driver irql not less or equal x000000d1 000000d1 00000d1 0000d1 000d1 00d1 0d1 river iver ver rql ess qual ual"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x0000003B 閳?SYSTEM_SERVICE_EXCEPTION",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x0000003b 閳?system_service_exception 閽冩繂鐫?bsod bugcheck bug 0x0000003b system service exception x0000003b 0000003b 000003b 00003b 0003b 003b 03b ystem stem tem ervice rvice vice ice xception ception eption ption tion ion"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x0000009F 閳?DRIVER_POWER_STATE_FAILURE",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x0000009f 閳?driver_power_state_failure 閽冩繂鐫?bsod bugcheck bug 0x0000009f driver power state failure x0000009f 0000009f 000009f 00009f 0009f 009f 09f river iver ver ower wer tate ate ailure ilure lure ure"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x00000124 閳?WHEA_UNCORRECTABLE_ERROR",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x00000124 閳?whea_uncorrectable_error 閽冩繂鐫?bsod bugcheck bug 0x00000124 whea uncorrectable error x00000124 00000124 0000124 000124 00124 0124 124 hea ncorrectable correctable orrectable rrectable rectable ectable ctable table able ble rror ror"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x00000D1 閳?IRQL Drive...闁插秴顦查埆鎺旂暬閺冄呭閺堫剙鎯堥崗鏈电铂閸忓疇浠堥妴?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x00000d1 閳?irql drive...闁插秴顦查埆鎺旂暬閺冄呭閺堫剙鎯堥崗鏈电铂閸忓疇浠堥妴?閽冩繂鐫?bsod bugcheck bug 0x00000d1 irql drive x00000d1 00000d1 0000d1 000d1 00d1 0d1 rql rive ive"},
  {t:"缁崵绮洪柨娆掝嚖 / 0xC000021A 閳?STATUS_SYSTEM_PROCESS_TERMINATED",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0xc000021a 閳?status_system_process_terminated 閽冩繂鐫?bsod bugcheck bug 0xc000021a status system process terminated xc000021a c000021a 000021a 00021a 0021a 021a 21a tatus atus tus ystem stem tem rocess ocess cess ess erminated rminated minated inated nated ated ted"},
  {t:"缁崵绮洪柨娆掝嚖 / CRITICAL_PROCESS_DIED",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 critical_process_died 閽冩繂鐫?bsod bugcheck bug critical process died ritical itical tical ical cal rocess ocess cess ess ied"},
  {t:"缁崵绮洪柨娆掝嚖 / KERNEL_SECURITY_CHECK_FAILURE",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 kernel_security_check_failure 閽冩繂鐫?bsod bugcheck bug kernel security check failure ernel rnel nel ecurity curity urity rity ity heck eck ailure ilure lure ure"},
  {t:"缁崵绮洪柨娆掝嚖 / 閺冪姵纭堕崥顖氬З濮濄倗鈻兼惔蹇ョ礉閸ョ姳璐熺拋锛勭暬閺堣桨鑵戞稉銏犮亼 xxx.dll",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 閺冪姵纭堕崥顖氬З濮濄倗鈻兼惔蹇ョ礉閸ョ姳璐熺拋锛勭暬閺堣桨鑵戞稉銏犮亼 xxx.dll 閽冩繂鐫?bsod bugcheck bug xxx dll"},
  {t:"缁崵绮洪柨娆掝嚖 / 闁挎瑨顕?0x80070002 / 0x80070003 閳?閹靛彞绗夐崚鐗堟瀮娴?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 闁挎瑨顕?0x80070002 / 0x80070003 閳?閹靛彞绗夐崚鐗堟瀮娴?閽冩繂鐫?bsod bugcheck bug 0x80070002 0x80070003 x80070002 80070002 0070002 070002 70002 0002 002 x80070003 80070003 0070003 070003 70003 0003 003"},
  {t:"缁崵绮洪柨娆掝嚖 / 0xc0000225 閳?閹靛彞绗夐崚鏉挎儙閸斻劏顔曟径?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0xc0000225 閳?閹靛彞绗夐崚鏉挎儙閸斻劏顔曟径?閽冩繂鐫?bsod bugcheck bug 0xc0000225 xc0000225 c0000225 0000225 000225 00225 0225 225"},
  {t:"缁崵绮洪柨娆掝嚖 / 0xc000000F 閳?Windows 閸氼垰濮╃粻锛勬倞閸ｃ劑鏁婄拠?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0xc000000f 閳?windows 閸氼垰濮╃粻锛勬倞閸ｃ劑鏁婄拠?閽冩繂鐫?bsod bugcheck bug 0xc000000f windows xc000000f c000000f 000000f 00000f 0000f 000f 00f indows ndows dows ows"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x80004005 閳?閺堫亝瀵氶弰搴ｆ畱闁氨鏁ら柨娆掝嚖",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x80004005 閳?閺堫亝瀵氶弰搴ｆ畱闁氨鏁ら柨娆掝嚖 閽冩繂鐫?bsod bugcheck bug 0x80004005 x80004005 80004005 0004005 004005 04005 4005 005"},
  {t:"缁崵绮洪柨娆掝嚖 / DNS 閺堝秴濮熼崳銊︽弓閸濆秴绨?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 dns 閺堝秴濮熼崳銊︽弓閸濆秴绨?閽冩繂鐫?bsod bugcheck bug dns"},
  {t:"缁崵绮洪柨娆掝嚖 / ERR_CONNECTION_RESET / 鏉╃偞甯村鏌ュ櫢缂?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 err_connection_reset / 鏉╃偞甯村鏌ュ櫢缂?閽冩繂鐫?bsod bugcheck bug err connection reset onnection nnection nection ection ction tion ion eset set"},
  {t:"缁崵绮洪柨娆掝嚖 / ERR_NAME_NOT_RESOLVED / 閺冪姵纭剁憴锝嗙€介張宥呭閸ｃ劌婀撮崸鈧?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 err_name_not_resolved / 閺冪姵纭剁憴锝嗙€介張宥呭閸ｃ劌婀撮崸鈧?閽冩繂鐫?bsod bugcheck bug err name not resolved ame esolved solved olved lved ved"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x800CCC0F 閳?闁喕娆㈢粩顖氬經閸戣櫣鐝悮顐ｅ皡",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x800ccc0f 閳?闁喕娆㈢粩顖氬經閸戣櫣鐝悮顐ｅ皡 閽冩繂鐫?bsod bugcheck bug 0x800ccc0f x800ccc0f 800ccc0f 00ccc0f 0ccc0f ccc0f cc0f c0f"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x80070020 閳?缁嬪绨锝呮躬娴ｈ法鏁?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x80070020 閳?缁嬪绨锝呮躬娴ｈ法鏁?閽冩繂鐫?bsod bugcheck bug 0x80070020 x80070020 80070020 0070020 070020 70020 0020 020"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x80072EE2  / 0x80072F8F 閳?閺冨爼妫挎稉搴㈡箛閸斺€虫珤娑撳秴鎮撳?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x80072ee2  / 0x80072f8f 閳?閺冨爼妫挎稉搴㈡箛閸斺€虫珤娑撳秴鎮撳?閽冩繂鐫?bsod bugcheck bug 0x80072ee2 0x80072f8f x80072ee2 80072ee2 0072ee2 072ee2 72ee2 2ee2 ee2 x80072f8f 80072f8f 0072f8f 072f8f 72f8f 2f8f f8f"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x800F0922 閳?婢额亜鐨惃鍕兇缂佺喍绻氶悾娆忓瀻閸?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x800f0922 閳?婢额亜鐨惃鍕兇缂佺喍绻氶悾娆忓瀻閸?閽冩繂鐫?bsod bugcheck bug 0x800f0922 x800f0922 800f0922 00f0922 0f0922 f0922 0922 922"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x8024200B 閳?閺囧瓨鏌婃稉瀣祰閹圭喎娼?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x8024200b 閳?閺囧瓨鏌婃稉瀣祰閹圭喎娼?閽冩繂鐫?bsod bugcheck bug 0x8024200b x8024200b 8024200b 024200b 24200b 4200b 200b 00b"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x800703EE (閺傚洣娆㈠Ч鈩冪厠)",p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x800703ee (閺傚洣娆㈠Ч鈩冪厠) 閽冩繂鐫?bsod bugcheck bug 0x800703ee x800703ee 800703ee 00703ee 0703ee 703ee 03ee 3ee"},
  {t:"缁崵绮洪柨娆掝嚖 / 0x8007001F 閳?鐠佹儳顦張顏囩箥鐞涘苯鐣崗?,p:"system/errors.html",kw:"缁崵绮洪柨娆掝嚖 0x8007001f 閳?鐠佹儳顦張顏囩箥鐞涘苯鐣崗?閽冩繂鐫?bsod bugcheck bug 0x8007001f x8007001f 8007001f 007001f 07001f 7001f 001f 01f"},
  {t:"Windows / 閻劍鍩涢悾宀勬桨娑撳簼姘︽禍鎺戝綁閸?,p:"system/win1011.html",kw:"windows 閻劍鍩涢悾宀勬桨娑撳簼姘︽禍鎺戝綁閸?win windows win"},
  {t:"Windows / 绾兛娆㈡稉搴＄俺鐏炲倹鐏﹂弸鍕▕瀵?,p:"system/win1011.html",kw:"windows 绾兛娆㈡稉搴＄俺鐏炲倹鐏﹂弸鍕▕瀵?win windows win"},
  {t:"Windows / 閹嗗厴娑撳骸鍚嬬€硅鈧?,p:"system/win1011.html",kw:"windows 閹嗗厴娑撳骸鍚嬬€硅鈧?win windows win"},
  {t:"Windows / 閸楀洨楠囧楦款唴",p:"system/win1011.html",kw:"windows 閸楀洨楠囧楦款唴 win windows win"},
  {t:"Windows / UEFI 鐎瑰鍙忕粵鏍殣",p:"system/win1011.html",kw:"windows uefi 鐎瑰鍙忕粵鏍殣 win windows win uefi efi"},
  {t:"Windows / 濞夈劍鍓版禍瀣€?,p:"system/win1011.html",kw:"windows 濞夈劍鍓版禍瀣€?win windows win"},
  {t:"Linux/macOS / Linux 閸欐垼顢戦悧鍫濈暰娴ｅ秳绗岄柅澶嬪",p:"system/linux-mac.html",kw:"linux/macos linux 閸欐垼顢戦悧鍫濈暰娴ｅ秳绗岄柅澶嬪 linux ubuntu macos mac os linux inux nux"},
  {t:"Linux/macOS / 缂佸牏顏敮鍝ユ暏婵灝濞?,p:"system/linux-mac.html",kw:"linux/macos 缂佸牏顏敮鍝ユ暏婵灝濞?linux ubuntu macos mac os"},
  {t:"Linux/macOS / WSL2閳ユ柡鈧柨婀?Windows 娑擃叀绻嶇悰宀€婀＄€?Linux 閸愬懏鐗?,p:"system/linux-mac.html",kw:"linux/macos wsl2閳ユ柡鈧柨婀?windows 娑擃叀绻嶇悰宀€婀＄€?linux 閸愬懏鐗?linux ubuntu macos mac os wsl2 windows linux sl2 indows ndows dows ows inux nux"},
  {t:"Linux/macOS / macOS 缁崵绮?,p:"system/linux-mac.html",kw:"linux/macos macos 缁崵绮?linux ubuntu macos mac os macos acos cos"},
  {t:"Linux/macOS / 鐠恒劌閽╅崣鏉挎▕瀵倸瀵?,p:"system/linux-mac.html",kw:"linux/macos 鐠恒劌閽╅崣鏉挎▕瀵倸瀵?linux ubuntu macos mac os"},
  {t:"濠碘偓濞?/ 娴犫偓娑斿牊妲搁弫鏉跨摟鐠佺褰茬拠?,p:"system/activation.html",kw:"濠碘偓濞?娴犫偓娑斿牊妲搁弫鏉跨摟鐠佺褰茬拠?},
  {t:"濠碘偓濞?/ 閹垮秳缍斿銉╊€?,p:"system/activation.html",kw:"濠碘偓濞?閹垮秳缍斿銉╊€?},
  {t:"濠碘偓濞?/ KMS 閺勵垯绮堟稊?,p:"system/activation.html",kw:"濠碘偓濞?kms 閺勵垯绮堟稊?kms"},
  {t:"濠碘偓濞?/ 鐢摜鏁?slmgr 閸涙垝鎶?,p:"system/activation.html",kw:"濠碘偓濞?鐢摜鏁?slmgr 閸涙垝鎶?slmgr lmgr mgr"},
  {t:"娑撳娴?/ ISO 闂€婊冨剼娑撳娴囨い?,p:"system/download.html",kw:"娑撳娴?iso 闂€婊冨剼娑撳娴囨い?iso"},
  {t:"娑撳娴?/ 鐎规ɑ鏌熷銉ュ徔闂?,p:"system/download.html",kw:"娑撳娴?鐎规ɑ鏌熷銉ュ徔闂?},
  {t:"娑撳娴?/ 濠碘偓濞茶绗岀拋绋垮讲鐠?,p:"system/download.html",kw:"娑撳娴?濠碘偓濞茶绗岀拋绋垮讲鐠?},
  {t:"AI Agent / 閺嶇绺鹃崠鍝勫焼閿涙I 閼卞﹤銇?vs AI Agent",p:"software/ai-agent.html",kw:"ai agent 閺嶇绺鹃崠鍝勫焼閿涙瓫i 閼卞﹤銇?vs ai agent ai vs agent gent ent"},
  {t:"AI Agent / 棣冩崌 OpenAI Codex CLI",p:"software/ai-agent.html",kw:"ai agent 棣冩崌 openai codex cli openai codex cli penai enai nai odex dex"},
  {t:"AI Agent / 閳戒緤绗?Claude Code",p:"software/ai-agent.html",kw:"ai agent 閳戒緤绗?claude code claude code laude aude ude ode"},
  {t:"AI Agent / 棣冾樆 閸忔湹绮柌宥堫洣 Agent 瀹搞儱鍙?,p:"software/ai-agent.html",kw:"ai agent 棣冾樆 閸忔湹绮柌宥堫洣 agent 瀹搞儱鍙?agent gent ent"},
  {t:"AI Agent / 棣冩斀 API Key = 娴ｇ姷娈戦弫鏉跨摟闊偂鍞ょ拠?,p:"software/ai-agent.html",kw:"ai agent 棣冩斀 api key = 娴ｇ姷娈戦弫鏉跨摟闊偂鍞ょ拠?api key"},
  {t:"AI Agent / 棣冩惖 娴犲骸鎽㈤懗钘夊帳鐠愯瀣侀崚?API Key閿?,p:"software/ai-agent.html",kw:"ai agent 棣冩惖 娴犲骸鎽㈤懗钘夊帳鐠愯瀣侀崚?api key閿?api key"},
  {t:"AI Agent / 棣冩憪 Rule閿涘牐顫夐崚娆欑礆= 娴ｇ姷绮?Agent 閸愭瑧娈戝▔鏇炵伐鐟欏嫬鐣?,p:"software/ai-agent.html",kw:"ai agent 棣冩憪 rule閿涘牐顫夐崚娆欑礆= 娴ｇ姷绮?agent 閸愭瑧娈戝▔鏇炵伐鐟欏嫬鐣?rule agent ule gent ent"},
  {t:"AI Agent / 閸欙缚绔寸粔?Rule閿涙艾鐣鹃張鐔诲殰閸斻劍澧界悰?,p:"software/ai-agent.html",kw:"ai agent 閸欙缚绔寸粔?rule閿涙艾鐣鹃張鐔诲殰閸斻劍澧界悰?rule ule"},
  {t:"AI Agent / 棣冨箚 Skill = 娑撯偓婵傛ぞ绗撶仦鐐垫畱鐠囧瓨妲戞稊?,p:"software/ai-agent.html",kw:"ai agent 棣冨箚 skill = 娑撯偓婵傛ぞ绗撶仦鐐垫畱鐠囧瓨妲戞稊?skill kill ill"},
  {t:"AI Agent / 鐎圭偤妾笟瀣摍",p:"software/ai-agent.html",kw:"ai agent 鐎圭偤妾笟瀣摍"},
  {t:"AI Agent / Token 閺勵垯绮堟稊?,p:"software/ai-agent.html",kw:"ai agent token 閺勵垯绮堟稊?token oken ken"},
  {t:"AI Agent / RAG 閳?缂?AI 閺囧瓨婀佺€圭偞鏋￠惃鍕叀鐠?,p:"software/ai-agent.html",kw:"ai agent rag 閳?缂?ai 閺囧瓨婀佺€圭偞鏋￠惃鍕叀鐠?rag ai"},
  {t:"GitHub / Star閿涘牊鏁归挊蹇ョ礆",p:"software/github.html",kw:"github star閿涘牊鏁归挊蹇ョ礆 瀵偓濠?git star tar"},
  {t:"GitHub / Fork閿涘牆寮舵稉鈧崣澶涚礆",p:"software/github.html",kw:"github fork閿涘牆寮舵稉鈧崣澶涚礆 瀵偓濠?git fork ork"},
  {t:"GitHub / Pull Request (PR)",p:"software/github.html",kw:"github pull request (pr) 瀵偓濠?git pull request pr ull equest quest uest est"},
  {t:"GitHub / Issues",p:"software/github.html",kw:"github issues 瀵偓濠?git ssues sues ues"},
  {t:"GitHub / 棣冨箥 GenP 閳?Adobe 濠碘偓濞叉槒藟娑?,p:"software/github.html",kw:"github 棣冨箥 genp 閳?adobe 濠碘偓濞叉槒藟娑?瀵偓濠?git genp adobe enp dobe obe"},
  {t:"GitHub / 棣冾潵 LM Studio 閳?閸ユ儳鑸伴崠鏍ㄦ拱閸︽澘銇囧Ο鈥崇€风粻鈥愁啀",p:"software/github.html",kw:"github 棣冾潵 lm studio 閳?閸ユ儳鑸伴崠鏍ㄦ拱閸︽澘銇囧Ο鈥崇€风粻鈥愁啀 瀵偓濠?git lm studio tudio udio dio"},
  {t:"GitHub / 棣冨腹 Stable Diffusion WebUI 閳?閺堫剙婀?AI 閻㈣娴橀敍鍫熺セ鐟欏牆娅掗悧鍫礆",p:"software/github.html",kw:"github 棣冨腹 stable diffusion webui 閳?閺堫剙婀?ai 閻㈣娴橀敍鍫熺セ鐟欏牆娅掗悧鍫礆 瀵偓濠?git stable diffusion webui ai table able ble iffusion ffusion fusion usion sion ion ebui bui"},
  {t:"GitHub / 棣冩暛 ComfyUI 閳?閼哄倻鍋ｅ?AI 娴ｆ粌娴樺銉ょ稊濞?,p:"software/github.html",kw:"github 棣冩暛 comfyui 閳?閼哄倻鍋ｅ?ai 娴ｆ粌娴樺銉ょ稊濞?瀵偓濠?git comfyui ai omfyui mfyui fyui yui"},
  {t:"GitHub / 棣冩礈 閸ユ儳鎯傚銉ュ徔缁?閳?閻絻鍓崇涵顑挎濡偓濞村鎮庨梿?,p:"software/github.html",kw:"github 棣冩礈 閸ユ儳鎯傚銉ュ徔缁?閳?閻絻鍓崇涵顑挎濡偓濞村鎮庨梿?瀵偓濠?git"},
  {t:"GitHub / 棣冃?ImHex 閳?閸椾礁鍙氭潻娑樺煑閺傚洣娆㈢紓鏍帆閸?,p:"software/github.html",kw:"github 棣冃?imhex 閳?閸椾礁鍙氭潻娑樺煑閺傚洣娆㈢紓鏍帆閸?瀵偓濠?git imhex mhex hex"},
  {t:"GitHub / 棣冩敯 OBS Studio 閳?閸忓秷鍨傞惄瀛樻尡/瑜版洖鐫?閹恒劍绁?,p:"software/github.html",kw:"github 棣冩敯 obs studio 閳?閸忓秷鍨傞惄瀛樻尡/瑜版洖鐫?閹恒劍绁?瀵偓濠?git obs studio tudio udio dio"},
  {t:"GitHub / 棣冩惂 EverythingToolbar 閳?缁夋帞楠囬崗銊ф磸閺傚洣娆㈤幖婊呭偍",p:"software/github.html",kw:"github 棣冩惂 everythingtoolbar 閳?缁夋帞楠囬崗銊ф磸閺傚洣娆㈤幖婊呭偍 瀵偓濠?git everythingtoolbar verythingtoolbar erythingtoolbar rythingtoolbar ythingtoolbar thingtoolbar hingtoolbar ingtoolbar ngtoolbar gtoolbar toolbar oolbar olbar lbar bar"},
  {t:"GitHub / 棣冨埃 PowerToys 閳?瀵邦喛钂嬬€规ɑ鏌熸晶鐐插繁婵傛ぞ娆?,p:"software/github.html",kw:"github 棣冨埃 powertoys 閳?瀵邦喛钂嬬€规ɑ鏌熸晶鐐插繁婵傛ぞ娆?瀵偓濠?git powertoys owertoys wertoys ertoys rtoys toys oys"},
  {t:"鐎瑰鍙?/ 閻忣偆绮х€瑰鍙忔潪顖欐",p:"software/security.html",kw:"鐎瑰鍙?閻忣偆绮х€瑰鍙忔潪顖欐 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?},
  {t:"鐎瑰鍙?/ 360 鐎瑰鍙忛崡顐紜",p:"software/security.html",kw:"鐎瑰鍙?360 鐎瑰鍙忛崡顐紜 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?360"},
  {t:"鐎瑰鍙?/ 棣冾洴 闁惧墎瀚勯惀鍛槰 (Silver Fox)",p:"software/security.html",kw:"鐎瑰鍙?棣冾洴 闁惧墎瀚勯惀鍛槰 (silver fox) 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?silver fox ilver lver ver"},
  {t:"鐎瑰鍙?/ 棣冩償 閺堛劑鈹堥惀鍛槰 (Trojan)",p:"software/security.html",kw:"鐎瑰鍙?棣冩償 閺堛劑鈹堥惀鍛槰 (trojan) 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?trojan rojan ojan jan"},
  {t:"鐎瑰鍙?/ 閴€?閹告牜鐔嗛惀鍛槰 / CryptoJacking",p:"software/security.html",kw:"鐎瑰鍙?閴€?閹告牜鐔嗛惀鍛槰 / cryptojacking 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?cryptojacking ryptojacking yptojacking ptojacking tojacking ojacking jacking acking cking king ing"},
  {t:"鐎瑰鍙?/ 棣冩晙 閸曟帞鍌ㄩ惀鍛槰 (Ransomware)",p:"software/security.html",kw:"鐎瑰鍙?棣冩晙 閸曟帞鍌ㄩ惀鍛槰 (ransomware) 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?ransomware ansomware nsomware somware omware mware ware are"},
  {t:"鐎瑰鍙?/ 棣冩憴 濞翠焦鐨虫潪顖欐 / 楠炲灝鎲″鍦崶",p:"software/security.html",kw:"鐎瑰鍙?棣冩憴 濞翠焦鐨虫潪顖欐 / 楠炲灝鎲″鍦崶 閻ュ懏鐦?闂冭尙浼€婢?閺夆偓濮?},
  {t:"缂冩垹绮?/ 閸ヨ棄鍞撮梹婊冨剼缁?,p:"software/network.html",kw:"缂冩垹绮?閸ヨ棄鍞撮梹婊冨剼缁?dns 娴狅絿鎮?缂堣顣?},
  {t:"缂冩垹绮?/ Gitee 閸ヨ棄鍞撮崥灞绢劄",p:"software/network.html",kw:"缂冩垹绮?gitee 閸ヨ棄鍞撮崥灞绢劄 dns 娴狅絿鎮?缂堣顣?gitee itee tee"},
  {t:"缂冩垹绮?/ arXiv 璺?鐠佺儤鏋冪拠鍡楀焼",p:"software/network.html",kw:"缂冩垹绮?arxiv 璺?鐠佺儤鏋冪拠鍡楀焼 dns 娴狅絿鎮?缂堣顣?arxiv rxiv xiv"},
  {t:"缂冩垹绮?/ 鐠嬮攱鐡曠€涳附婀?/ Google Scholar",p:"software/network.html",kw:"缂冩垹绮?鐠嬮攱鐡曠€涳附婀?/ google scholar dns 娴狅絿鎮?缂堣顣?google scholar oogle ogle gle cholar holar olar lar"},
  {t:"缂冩垹绮?/ Stack Overflow",p:"software/network.html",kw:"缂冩垹绮?stack overflow dns 娴狅絿鎮?缂堣顣?stack overflow tack ack verflow erflow rflow flow low"},
  {t:"缂冩垹绮?/ Dev.to + Medium",p:"software/network.html",kw:"缂冩垹绮?dev.to + medium dns 娴狅絿鎮?缂堣顣?dev to medium edium dium ium"},
  {t:"缂冩垹绮?/ edX / Coursera",p:"software/network.html",kw:"缂冩垹绮?edx / coursera dns 娴狅絿鎮?缂堣顣?edx coursera oursera ursera rsera sera era"},
  {t:"缂冩垹绮?/ Hugging Face",p:"software/network.html",kw:"缂冩垹绮?hugging face dns 娴狅絿鎮?缂堣顣?hugging face ugging gging ging ing ace"},
  {t:"Python / 瀵板牆顦块崢澶婎唺閻ㄥ嫬浼愰崗铚傜贩鐠ф牕鐣?,p:"software/python.html",kw:"python 瀵板牆顦块崢澶婎唺閻ㄥ嫬浼愰崗铚傜贩鐠ф牕鐣?python pip conda"},
  {t:"Python / 娑撳娴囩€瑰顥婇崠?,p:"software/python.html",kw:"python 娑撳娴囩€瑰顥婇崠?python pip conda"},
  {t:"Python / 鐟佸懎銈介崥搴ㄧ崣鐠?,p:"software/python.html",kw:"python 鐟佸懎銈介崥搴ㄧ崣鐠?python pip conda"},
  {t:"Adobe / 閺嶇绺炬担婊呮暏",p:"software/adobe.html",kw:"adobe 閺嶇绺炬担婊呮暏"},
  {t:"缂冩垵娼?/ 棣冩礈 閸ユ儳鎯傚銉ュ徔缁?閳?鐎规ɑ鏌熺純鎴犵彲",p:"software/links.html",kw:"缂冩垵娼?棣冩礈 閸ユ儳鎯傚銉ュ徔缁?閳?鐎规ɑ鏌熺純鎴犵彲 闁剧偓甯?缂冩垹鐝?},
  {t:"缂冩垵娼?/ 棣冩惓 濞撳憡鍨欓崝鐘插 閳?濞撳憡鍨欑敮褎鏆熼惄鎴炲付娑撳簼绱崠?,p:"software/links.html",kw:"缂冩垵娼?棣冩惓 濞撳憡鍨欓崝鐘插 閳?濞撳憡鍨欑敮褎鏆熼惄鎴炲付娑撳簼绱崠?闁剧偓甯?缂冩垹鐝?},
  {t:"缂冩垵娼?/ 棣冩灱 CPU-Z / GPU-Z 鐎规缍?,p:"software/links.html",kw:"缂冩垵娼?棣冩灱 cpu-z / gpu-z 鐎规缍?闁剧偓甯?缂冩垹鐝?cpu z gpu"},
  {t:"缂冩垵娼?/ 棣冩惞 HWiNFO 閳?濞ｅ崬瀹崇涵顑挎閻╂垶濮?,p:"software/links.html",kw:"缂冩垵娼?棣冩惞 hwinfo 閳?濞ｅ崬瀹崇涵顑挎閻╂垶濮?闁剧偓甯?缂冩垹鐝?hwinfo winfo info nfo"},
  {t:"缂冩垵娼?/ 棣冨箖 Steam 閳?閸忋劎鎮嗛張鈧径褎鐖堕幋蹇撻挬閸?,p:"software/links.html",kw:"缂冩垵娼?棣冨箖 steam 閳?閸忋劎鎮嗛張鈧径褎鐖堕幋蹇撻挬閸?闁剧偓甯?缂冩垹鐝?steam team eam"},
  {t:"缂冩垵娼?/ 棣冪厷 Epic Games Store",p:"software/links.html",kw:"缂冩垵娼?棣冪厷 epic games store 闁剧偓甯?缂冩垹鐝?epic games store pic ames mes tore ore"},
  {t:"缂冩垵娼?/ 棣冪厺 NVIDIA 妞瑰崬濮╂稉瀣祰",p:"software/links.html",kw:"缂冩垵娼?棣冪厺 nvidia 妞瑰崬濮╂稉瀣祰 闁剧偓甯?缂冩垹鐝?nvidia vidia idia dia"},
  {t:"缂冩垵娼?/ 棣冩暩 AMD Adrenalin 閳?Radeon 鐎规ɑ鏌熸す鍗炲З",p:"software/links.html",kw:"缂冩垵娼?棣冩暩 amd adrenalin 閳?radeon 鐎规ɑ鏌熸す鍗炲З 闁剧偓甯?缂冩垹鐝?amd adrenalin radeon drenalin renalin enalin nalin alin lin adeon deon eon"},
  {t:"缂冩垵娼?/ 棣冩暫 Intel 妞瑰崬濮╂稉搴㈡暜閹镐礁濮幍?,p:"software/links.html",kw:"缂冩垵娼?棣冩暫 intel 妞瑰崬濮╂稉搴㈡暜閹镐礁濮幍?闁剧偓甯?缂冩垹鐝?intel ntel tel"},
  {t:"缂冩垵娼?/ BlueScreenView / WinDbg Preview",p:"software/links.html",kw:"缂冩垵娼?bluescreenview / windbg preview 闁剧偓甯?缂冩垹鐝?bluescreenview windbg preview luescreenview uescreenview escreenview screenview creenview reenview eenview enview nview view iew indbg ndbg dbg review eview"},
  {t:"缂冩垵娼?/ Rufus 閳?缁绢垰鍣?U 閻╂ê鍩楁担婊冧紣閸?,p:"software/links.html",kw:"缂冩垵娼?rufus 閳?缁绢垰鍣?u 閻╂ê鍩楁担婊冧紣閸?闁剧偓甯?缂冩垹鐝?rufus u ufus fus"},
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
      html += '<div class="note" style="left:' + x + '%;top:' + y + '%;transform:rotate(' + rot + 'deg);animation-delay:' + del + 's;border-left:4px solid ' + c + ';" onclick="openReply(\'' + pid + '\')"><div class="del-btn" onclick="event.stopPropagation();deletePost(\'' + pid + '\')">x</div><div class="note-tag" style="color:' + c + '">#' + tagText + '</div><div class="body">' + bodyText + '</div><div class="time">' + dateStr + (rc > 0 ? " \u00b7 " + rc + " 閸ョ偛顦? : "") + "</div></div>";
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
  if (!isLoggedIn()) { alert("鐠囧嘲鍘涢惂璇茬秿閸愬秴褰傜敮?); return; }
  var body = document.getElementById("postBody").value.trim();
  var tag = document.getElementById("postTag").value.trim() || "\u672a\u5206\u7c7b";
  if (!body) return alert("閸愬懎顔愭稉宥堝厴娑撹櫣鈹?);

  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await apiPost("/api/posts", { id: id, tag: tag, body: body, replies: [] });
    communityPostClose();
    currentTag = null;
    renderC();
  } catch(e) { alert("閸欐垵绔锋径杈Е: " + e.message); }
}

async function deletePost(id) {
  if (!confirm("绾喛顓婚崚鐘绘珟鏉╂瑦娼拋銊啈閿?)) return;
  try {
    await apiDelete("/api/posts/" + id);
    renderC();
  } catch(e) { alert("閸掔娀娅庢径杈Е: " + e.message); }
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
  document.getElementById("replyList").innerHTML = rh || '<div class="reply-empty">閺嗗倹妫ら崶鐐差槻閿涘本娼甸崘娆戭儑娑撯偓閺?/div>';
  document.getElementById("replyModal").classList.add("open");
}

async function replyPost() {
  if (!isLoggedIn()) { alert("鐠囧嘲鍘涢惂璇茬秿閸愬秴娲栨径?); return; }
  var postId = document.getElementById("replyPostId").value;
  var text = document.getElementById("replyInput").value.trim();
  if (!text) return alert("閸ョ偛顦叉稉宥堝厴娑撹櫣鈹?);

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
      } catch(e) { alert("閸ョ偛顦叉径杈Е: " + e.message); }
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
  updateUserUI();
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

