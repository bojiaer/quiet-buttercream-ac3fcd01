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
      btns[i].innerHTML = '<button class="tag-filter" onclick="showLogin()" style="cursor:pointer;border-color:var(--accent2);color:var(--accent2);">\u767b\u5f55</button>';
    }
  }
}

// ====== SEARCH INDEX ======
var pagesIndex = [
  {t:"CPU\u8be6\u89e3",p:"hardware/cpu.html",kw:"cpu intel amd core ultra"},
  {t:"\u663e\u5361(GPU)\u8be6\u89e3",p:"hardware/gpu.html",kw:"\u663e\u5361 nvidia amd intel arc 5060 60\u7cfb 70 80 90 \u7cd96\u5217"},
  {t:"\u4e3b\u677f\u4e0e\u673a\u7bb1",p:"hardware/motherboard.html",kw:"\u783e\u7247\u7ec4 h610 b760 z790"},
  {t:"\u5185\u5b58",p:"hardware/ram.html",kw:"ddr4 ddr5 \u65f6\u5ead \u53cc\u901a\u9013"},
  {t:"\u786\u76d8",p:"hardware/storage.html",kw:"ssd nvme sata hdd"},
  {t:"\u7535\u6e90",p:"hardware/psu.html",kw:"psu \u7535\u5bb9 \u6a21\u7ec4"},
  {t:"\u673a\u7bb1\u6363\u70ed",p:"hardware/cooling.html",kw:"\u98ce\u51b7 \u6c34\u51b7 \u98ce\u9013"},
  {t:"\u5916\u8bbe",p:"hardware/peripherals.html",kw:"\u952e\u76d8 \u9f20\u6807 \u663e\u793a\u5668 \u8272\u57df"},
  {t:"Win10 vs Win11",p:"system/win1011.html",kw:"windows \u52bf\u6bd4 tpm"},
  {t:"Linux \u4e0e macOS",p:"system/linux-mac.html",kw:"ubuntu mint fedora macos"},
  {t:"Windows \u9519\u8bef\u4ee3\u7801",p:"system/errors.html",kw:"\u84dd\u5c4f \u9519\u8bef 0x7b \u4ee3\u7801"},
  {t:"Windows \u6fc0\u6d3b",p:"system/activation.html",kw:"kms slmgr \u6570\u5b57\u8bb8\u53ef\u8bc1"},
  {t:"\u5b98\u65b9\u955c\u50cf\u4e0b\u8f7d",p:"system/download.html",kw:"iso \u955c\u50cf \u5a92\u4f53\u521b\u5efa\u5de5\u5177e"},
  {t:"AI Agent",p:"software/ai-agent.html",kw:"AI \u5927\u6a21\u578b API RAG"},
  {t:"GitHub",p:"software/github.html",kw:"\u5f00\u6e90 fork pr"},
  {t:"Adobe \u5957\u4ef6",p:"software/adobe.html",kw:"ps ai pr after effects"},
  {t:"\u5b9e\u7528\u7f51\u5740",p:"software/links.html",kw:"\u56fe\u5427 \u5de5\u5177\u7bb1 steam"},
  {t:"\u7f51\u7edc\u8bbf\u95ee",p:"software/network.html",kw:"\u5b66\u672f \u955c\u4f60 \u8d44\u6e90"},
  {t:"Python",p:"software/python.html",kw:"python \u4f9d\u6258 comfyui stable diffusion"},
  {t:"\u5b89\u5168",p:"software/security.html",kw:"\u706b\u7ed1 360 \u75c5\u6bd2 \u94f6\u72d0"},
  {t:"\u529e\u516c",p:"software/office.html",kw:"excel word markdown git"}
];

String.prototype.has = function(s) { return this.toLowerCase().indexOf(s.toLowerCase()) >= 0; };

// ====== SEARCH WIDGET ======
document.addEventListener("DOMContentLoaded", function() {
  var inp = document.getElementById("searchInput");
  var res = document.getElementById("searchResults");
  if (!inp) return;
  inp.addEventListener("input", function() {
    var q = this.value.trim();
    if (q.length < 1) { res.style.display = "none"; return; }
    var hits = pagesIndex.filter(function(p) { return p.t.has(q) || (p.kw || "").has(q); });
    if (hits.length === 0) { res.style.display = "none"; return; }
    res.innerHTML = hits.map(function(h) {
      return '<div class="hit" onclick="location.href=\'' + h.p + '\'"><div class="htitle">' + h.t + '</div><div class="hpath">' + h.p + '</div></div>';
    }).join("");
    res.style.display = "block";
  });
  inp.addEventListener("blur", function() { setTimeout(function() { res.style.display = "none"; }, 200); });
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
      html += '<div class="note" style="left:' + x + '%;top:' + y + '%;transform:rotate(' + rot + 'deg);animation-delay:' + del + 's;border-left:4px solid ' + c + ';" onclick="openReply(\'' + pid + '\')"><div class="del-btn" onclick="event.stopPropagation();delC(\'' + pid + '\')">x</div><div class="note-tag" style="color:' + c + '">#' + tagText + '</div><div class="body">' + bodyText + '</div><div class="time">' + dateStr + (rc > 0 ? " \u00b7 " + rc + " \u015b\u015e\u015f\u015e" : "") + "</div></div>";
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

