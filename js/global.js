/* ====================== PAGES INDEX ====================== */
var pagesIndex = [ 
  {title:"Python",               path:"software/python.html",      tags:["软件"], kw:"python 编程 依赖 stable diffusion comfyui"},
  {title:"Windows 激活方法",   path:"system/activation.html",   tags:["系统"], kw:"激活 kms slmgr 数字许可证 命令行"},
  {title:"实用网址推荐",       path:"software/links.html",         tags:["软件"], kw:"图吧工具箱 steam 游戏加加 cpuz gpuz 硬件检测 网址"},
  {title:"GitHub 开源平台",      path:"software/github.html",       tags:["软件"], kw:"github star fork pr pages 开源"},
  {title:"Adobe 创意套件",       path:"software/adobe.html",        tags:["软件"], kw:"photoshop illustrator premiere after effects 设计"},
  {title:"网络访问与实用工具",   path:"software/network.html",      tags:["软件"], kw:"上网 网络访问 学术 资源 gitee 镜像"},
  {title:"CPU详解",            path:"hardware/cpu.html",            tags:["硬件"], kw:"cpu intel amd 架构 性能 核心"},
  {title:"GPU（显卡）详解",            path:"hardware/gpu.html",            tags:["硬件"], kw:"显卡 nvidia 显存 nvidia amd intel arc"},
  {title:"主板与机箱",         path:"hardware/motherboard.html",   tags:["硬件"], kw:"z790 b650 xmp 芯片组 bios uefi"},
  {title:"内存",               path:"hardware/ram.html",           tags:["硬件"], kw:"ddr4 ddr5 频率 时序 双通道"},
  {title:"硬盘",               path:"hardware/storage.html",       tags:["硬件"], kw:"ssd nvme hdd sata m2"},
  {title:"电源",               path:"hardware/psu.html",           tags:["硬件"], kw:"额定功率 eps 模组 转换效率"},
  {title:"机箱与散热",         path:"hardware/cooling.html",       tags:["硬件"], kw:"风冷 水冷 atx itx 风道"},
  {title:"外设",               path:"hardware/peripherals.html",   tags:["硬件"], kw:"键盘 鼠标 显示器 dpi 刷新率 机械键盘"},
  {title:"Win10 vs Win11",     path:"system/win1011.html",         tags:["系统"], kw:"windows 系统 区别 界面 性能 tpm directstorage"},
  {title:"Linux 与 macOS",     path:"system/linux-mac.html",       tags:["系统"], kw:"ubuntu mint linux darwin unix fedora"},
  {title:"Windows 错误代码速查",path:"system/errors.html",         tags:["系统"], kw:"蓝屏 错误代码 解决方案 7b dns 0x 缺失 dll"},
  {title:"Windows 官方下载链接",path:"system/download.html",       tags:["系统"], kw:"iso 镜像 下载 官方 media creation tool"},
  {title:"AI Agent 详解",      path:"software/ai-agent.html",      tags:["软件"], kw:"AI 大模型 部署 rag prompt transformer ollama 提示词工程 anthropic"},
  {title:"办公工具",           path:"software/office.html",        tags:["软件"], kw:"word excel markdown git 办公"},
  {title:"安全工具",           path:"software/security.html",      tags:["软件"], kw:"杀毒 安全 防火墙 木马"}
];

/* ====================== UTILS ====================== */
String.prototype.contains = function(s) { return this.toLowerCase().indexOf(s.toLowerCase()) >= 0; };
function pad(n){ return n<10 ? "0"+n : String(n); }
function fmtNow() { var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes()); }

/* ====================== SEARCH ====================== */
document.addEventListener("DOMContentLoaded", function() {
  var inp = document.getElementById("searchInput");
  var res = document.getElementById("searchResults");
  if (!inp) return;
  inp.addEventListener("input",function(){
    var q = this.value.trim();
    if(q.length<1){ res.style.display="none"; return; }
    var hits = pagesIndex.filter(function(p){
      return p.title.contains(q) || (p.kw||"").contains(q) || (p.tags||[]).some(function(t){ return t.contains(q); });
    });
    if(hits.length===0){ res.style.display="none"; return; }
    res.innerHTML = hits.map(function(h){
      var t = (h.tags||[]).map(function(tag){
        var cls = tag==="硬件"?"tag-hw":(tag==="系统"?"tag-sys":"tag-sw");
        return '<span class="tag '+cls+'">'+tag+'</span>';
      }).join("");
      return '<div class="hit" onclick="location.href=\''+h.path+'\'"><div class="htitle">'+h.title+'</div><div class="hpath">'+t+' '+h.path+'</div></div>';
    }).join("");
    res.style.display="block";
  });
  inp.addEventListener("blur",function(){ setTimeout(function(){res.style.display="none";},200); });
});

/* ====================== COMMUNITY ====================== */
var COMMUNITY_KEY = "ck_community";
function getPostsFor(section) {
  var raw = localStorage.getItem(COMMUNITY_KEY);
  var arr = [];
  try { arr = JSON.parse(raw) || []; } catch(e) {}
  if(section) arr = arr.filter(function(p){ return p.section===section; });
  arr.sort(function(a,b){ return b.ts - a.ts; });
  return arr;
}
function savePosts(arr) { localStorage.setItem(COMMUNITY_KEY, JSON.stringify(arr)); }

function postCommunity(section) {
  var nameEl = document.getElementById("communityAuthor");
  var bodyEl = document.getElementById("communityBody");
  var author = (nameEl ? nameEl.value.trim() : "") || "匿名用户";
  var body = bodyEl ? bodyEl.value.trim() : "";
  if(!body) return alert("内容不能为空");
  var all = localStorage.getItem(COMMUNITY_KEY);
  try { all = JSON.parse(all) || []; } catch(e) { all = []; }
  all.push({ section:section, author:author, body:body, ts:Date.now(), id:Date.now().toString(36)+Math.random().toString(36).slice(2,6) });
  savePosts(all);
  if(nameEl) nameEl.value = "";
  if(bodyEl) bodyEl.value = "";
  renderCommunity(section);
}

function renderCommunity(section) {
  var area = document.getElementById("communityArea");
  if(!area) return;
  var posts = getPosts(section);
  if(posts.length===0){ area.innerHTML='<p style="color:var(--text-muted);font-size:.88rem;">暂无讨论，快来发布第一条！</p>'; return; }
  area.innerHTML = posts.map(function(p){
    return '<div class="post">'
      +'<div class="post-header"><span class="post-author">'+p.author+'</span><span class="post-time">'+fmtNow()+'</span></div>'
      +'<div class="post-body">'+p.body+'</div>'
      +'<div class="post-actions"><button onclick="deletePost(\''+p.id+'\',\''+section+'\')">删除</button></div>'
      +'</div>';
  }).join("");
}

function deletePost(id, section) {
  if(!confirm("删除这条讨论？")) return;
  var all = localStorage.getItem(COMMUNITY_KEY);
  try { all = JSON.parse(all) || []; } catch(e) { all = []; }
  all = all.filter(function(p){ return p.id !== id; });
  savePosts(all);
  renderCommunity(section);
}

/* ====================== EDIT ARTICLE ====================== */
function editArticle() {
  var article = document.querySelector(".article");
  if(!article) return;
  var current = article.innerHTML;
  var editDiv = document.getElementById("articleEditArea");
  if(editDiv) {
    // switching back
    article.style.display = "";
    editDiv.remove();
    return;
  }
  article.style.display = "none";
  var editor = document.createElement("div");
  editor.id = "articleEditArea";
  editor.className = "modal";
  editor.style.cssText = "margin:0 auto;max-width:840px;margin-bottom:40px;border-radius:12px;position:relative;";
  editor.innerHTML = ''
    + '<h3 style="margin-bottom:14px;">编辑文章 <span style="font-weight:400;font-size:.82rem;color:var(--text-muted);">》（支持 HTML / 纯文本）</span></h3>'
    + '<textarea id="articleRaw" style="width:100%;height:400px;font-family:monospace;font-size:.88rem;padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:#fff;resize:vertical;">'
    + article.innerHTML.replace(/</g,"&lt;").replace(/>/g,"&gt;")
    + '</textarea>'
    + '<div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">'
    + '<button class="btn-cancel" style="background:var(--bg-hover);color:var(--text);border:none;padding:10px 22px;border-radius:6px;cursor:pointer;font-size:.9rem;" onclick="cancelEditArticle()">取消</button>'
    + '<button class="btn-save" style="background:var(--accent2);color:#fff;border:none;padding:10px 22px;border-radius:6px;font-weight:600;cursor:pointer;font-size:.9rem;" onclick="saveArticle()">保存修改</button>'
    + '</div>';
  article.parentNode.insertBefore(editor, article.nextSibling);
  // scroll
  editor.scrollIntoView({behavior:"smooth"});
}

function cancelEditArticle() {
  var ed = document.getElementById("articleEditArea");
  if(ed) ed.remove();
  var ar = document.querySelector(".article");
  if(ar) ar.style.display = "";
}

function saveArticle() {
  var raw = document.getElementById("articleRaw").value;
  if(!raw) return;
  var decoded = raw.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  var article = document.querySelector(".article");
  if(article) article.innerHTML = decoded;
  cancelEditArticle();
}

/* ====================== LOCAL PROJECTS ====================== */
var PROJ_KEY = "ck_project_entries";
function getEntries() {
  var raw = localStorage.getItem(PROJ_KEY);
  if(!raw) return [];
  try { var v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch(e) { return []; }
}
function saveEntries(arr) { localStorage.setItem(PROJ_KEY, JSON.stringify(arr)); }

function addEntry(section, title, content) {
  var arr = getEntries();
  arr.unshift({ id:Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6), section:section, title:title, content:content, created:fmtNow() });
  saveEntries(arr);
  renderProjectList(section);
}

function deleteEntry(id, section) {
  if(!confirm("确认删除此项目？")) return;
  var arr = getEntries().filter(function(e){ return e.id !== id; });
  saveEntries(arr);
  renderProjectList(section);
}

function renderProjectList(section) {
  var area = document.getElementById("projectArea");
  if(!area) return;
  var all = getEntries();
  var filtered = section ? all.filter(function(e){ return e.section===section; }) : all;
  if(filtered.length===0){ area.innerHTML='<p style="color:var(--text-muted);font-size:.88rem;">暂无添加的项目。</p>'; return; }
  area.innerHTML = filtered.map(function(d){
    return '<div class="card" style="margin-bottom:14px;">'
      +'<h3>'+d.title+' <small style="color:var(--text-muted);font-weight:400;font-size:.75rem;">'+(d.created||"")+'</small></h3>'
      +'<p style="white-space:pre-wrap;">'+d.content.slice(0,300)+'...</p>'
      +'<button onclick="oneClickDelete(\''+d.id+'\',\''+(d.section||"")+'\')" style="background:var(--red);color:#fff;border:none;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:.8rem;margin-top:8px;">删除</button>'
      +'</div>';
  }).join("");
}

function oneClickDelete(id, section) {
  if(!confirm("确认删除此项目？")) return;
  deleteEntry(id, section);
}

function openAddModal(section) {
  var m = document.getElementById("addModal");
  if(!m) return;
  m.classList.add("open");
  document.getElementById("modalSection").value = section || "";
  document.getElementById("modalTitle").value = "";
  document.getElementById("modalContent").value = "";
}

function closeModal() {
  document.getElementById("addModal").classList.remove("open");
}

function saveModal() {
  var section = document.getElementById("modalSection").value.trim();
  var title = document.getElementById("modalTitle").value.trim();
  var content = document.getElementById("modalContent").value.trim();
  if(!title||!content) return alert("标题和内容不能为空");
  addEntry(section, title, content);
  closeModal();
}

/* ====================== INIT ====================== */
window.addEventListener("DOMContentLoaded", function(){
  var pa = document.getElementById("projectArea");
  if(pa) renderProjectList(pa.getAttribute("data-section")||"");
  var ca = document.getElementById("communityArea");
  if(ca) renderCommunity(ca.getAttribute("data-section")||"");
});


var EDITED_KEY = "ck_article_edits";

function getArticleEdits() {
  try { return JSON.parse(localStorage.getItem(EDITED_KEY)) || {}; } catch(e) { return {}; }
}
function setArticleEdit(path, html) {
  var all = getArticleEdits();
  all[path] = html;
  localStorage.setItem(EDITED_KEY, JSON.stringify(all));
}

function loadArticleFromStorage() {
  var path = window.location.pathname.replace(/^.*\/computer-knowledge\//, "").replace(/^\/+/, "");
  var edits = getArticleEdits();
  if (edits[path]) {
    var article = document.querySelector(".article");
    if (article) { article.innerHTML = edits[path]; }
  }
}

function saveArticle() {
  var raw = document.getElementById("articleRaw").value;
  if (!raw) return;
  var decoded = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  var article = document.querySelector(".article");
  if (!article) return;
  article.innerHTML = decoded;

  // persist to localStorage
  var path = window.location.pathname.replace(/^.*\/?computer-knowledge\//, "").replace(/^\/+/, "");
  setArticleEdit(path, decoded);
  cancelEditArticle();

  // show flash "已保存"
  var s = document.getElementById("saveBlink");
  if (!s) {
    s = document.createElement("div");
    s.id = "saveBlink";
    s.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);background:var(--accent2);color:#fff;padding:10px 28px;border-radius:8px;z-index:999;pointer-events:none;transition:opacity .4s;font-weight:600;font-size:.9rem;";
    document.body.appendChild(s);
  }
  s.innerText = "✔ 已保存";
  s.style.opacity = "1";
  clearTimeout(window._saveT0);
  window._saveT0 = setTimeout(function() { s.style.opacity = "0"; }, 1500);
}

window.addEventListener("DOMContentLoaded", function() { loadArticleFromStorage(); });











