
/* ============ CONFIG & STATE ============ */
const DEFAULT_BASE = "https://kimibg1.onrender.com";
const DEFAULT_TOKEN = "SARFRAZco1@";
const state = {
  baseUrl: localStorage.getItem('kimi_base_url') || DEFAULT_BASE,
  token: localStorage.getItem('kimi_token') || DEFAULT_TOKEN,
  model: localStorage.getItem('kimi_model') || 'thinking',
  sessionId: localStorage.getItem('kimi_session_id') || null,
  messages: JSON.parse(localStorage.getItem('kimi_messages') || '[]'),
  theme: localStorage.getItem('kimi_theme') || 'light',
  streaming: localStorage.getItem('kimi_streaming') !== 'off',
  ttsAuto: localStorage.getItem('kimi_tts_auto') === 'on',
  mode: 'chat',
  imageStyle: 'realistic',
  transFrom: 'auto', transTo: 'hi',
  codeMode: 'explain', writeMode: 'blog', summaryMode: 'text',
  responseTimes: [],
  isOnline: true,
  agentTask: {
    running: false,
    collapsed: false,
    steps: [],
    files: [],
    prompt: '',
    wantsZip: false,
    autoHideTimer: null
  }
};

function genUUID(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16)})}
if(!state.sessionId){state.sessionId=genUUID();localStorage.setItem('kimi_session_id',state.sessionId)}

function HEADERS(){return{"Content-Type":"application/json","Authorization":`Bearer ${state.token}`}}

/* ============ UTILS ============ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function save(){localStorage.setItem('kimi_messages',JSON.stringify(state.messages));localStorage.setItem('kimi_session_id',state.sessionId);localStorage.setItem('kimi_model',state.model)}
function escapeHtml(t){return(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderMD(t){
  if(!t)return '';
  t=escapeHtml(t);
  t=t.replace(/```(\w*)\n?([\s\S]*?)```/g,(m,lang,code)=>`<pre><button class="copy-code-btn" onclick="copyCode(this)">Copy</button><code class="lang-${lang||'plain'}">${code.trim()}</code></pre>`);
  t=t.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/^\s*[-*]\s+(.+)$/gm,'<li>$1</li>');
  t=t.replace(/(<li>.*<\/li>(\n|$))+/g,m=>'<ul>'+m+'</ul>');
  t=t.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank">$1</a>');
  t=t.replace(/\n/g,'<br>');
  return t;
}
function copyCode(btn){const code=btn.nextElementSibling.innerText;navigator.clipboard.writeText(code);btn.innerText='Copied';setTimeout(()=>btn.innerText='Copy',1500)}
function toast(msg){const t=$('#toast');t.innerText=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)}
function timeAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function fmtUptime(s){if(!s||s<0)return '—';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return `${h}h ${m}m`}

function escRegExp(str){return String(str||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sanitizeError(msg){
  let out = String(msg||'Unknown error');
  if(state.token) out = out.replace(new RegExp(escRegExp(state.token),'g'),'[hidden]');
  if(state.baseUrl) out = out.replace(new RegExp(escRegExp(state.baseUrl),'g'),'[backend]');
  out = out.replace(/https?:\/\/[^\s)]+/g,'[url]').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [hidden]');
  return out.replace(/\s+/g,' ').trim().slice(0,160);
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

let layoutViewportHeight = window.innerHeight;
let floatingLayoutFrame = 0;

function queueFloatingLayout(){
  if(floatingLayoutFrame)cancelAnimationFrame(floatingLayoutFrame);
  floatingLayoutFrame=requestAnimationFrame(()=>{
    floatingLayoutFrame=0;
    syncFloatingLayout();
  });
}
function measureComposerHeight(){
  const composer=$('#composer');
  const h = composer ? Math.ceil(composer.offsetHeight || 0) : 0;
  document.documentElement.style.setProperty('--composer-height', `${h}px`);
  return h;
}
function measureAgentPanelHeight(){
  const panel=$('#agentPanel');
  const visible = panel && !panel.classList.contains('hidden');
  const h = visible ? Math.ceil(panel.offsetHeight || 0) + 12 : 0;
  document.documentElement.style.setProperty('--activity-panel-height', `${h}px`);
  return h;
}
function syncViewportMetrics(forceBase=false){
  const vv = window.visualViewport;
  const current = vv ? Math.round(vv.height + vv.offsetTop) : window.innerHeight;
  if(forceBase || current >= layoutViewportHeight - 80){
    layoutViewportHeight = current;
  }
  const keyboard = vv ? Math.max(0, Math.round(layoutViewportHeight - (vv.height + vv.offsetTop))) : 0;
  document.documentElement.style.setProperty('--keyboard-offset', `${keyboard}px`);
  document.documentElement.style.setProperty('--app-height', `${current}px`);
  document.body.classList.toggle('keyboard-open', keyboard > 80);
}
function syncFloatingLayout(forceBase=false){
  syncViewportMetrics(forceBase);
  measureComposerHeight();
  measureAgentPanelHeight();
}
function registerFloatingLayoutListeners(){
  const vv = window.visualViewport;
  const sync = ()=>queueFloatingLayout();
  window.addEventListener('resize', ()=>syncFloatingLayout(true));
  window.addEventListener('orientationchange', ()=>setTimeout(()=>syncFloatingLayout(true),180));
  document.addEventListener('focusin', ()=>setTimeout(sync,60));
  document.addEventListener('focusout', ()=>setTimeout(()=>syncFloatingLayout(true),120));
  if(vv){
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
  }
}

function slugifyPrompt(text){return (String(text||'project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48) || 'project')}
function countLines(text){return String(text||'').replace(/\n$/,'').split(/\r?\n/).length}
function inferLangFromName(name=''){const ext=(name.split('.').pop()||'').toLowerCase();return({js:'javascript',mjs:'javascript',cjs:'javascript',ts:'typescript',tsx:'tsx',jsx:'jsx',py:'python',html:'html',css:'css',json:'json',md:'markdown',sh:'bash',txt:'text'}[ext]||ext||'text')}
function langToExt(info=''){const key=String(info||'').toLowerCase().trim().split(/\s+/)[0];return({javascript:'js',js:'js',typescript:'ts',tsx:'tsx',jsx:'jsx',python:'py',py:'py',html:'html',css:'css',json:'json',markdown:'md',md:'md',bash:'sh',shell:'sh',sh:'sh',text:'txt'}[key]||'txt')}
function isProjectIntent(text){return /\b(build|create|make|develop|website|web\s*app|landing page|portfolio|project|app|script|frontend|backend|dashboard|clone|tool|game)\b/i.test(text||'')}
function wantsZip(text){return /\bzip\b|download all|zip chahiye|zip bana|zip file/i.test(text||'')}
function stripCodeBlocks(text){return String(text||'').replace(/```[^\n`]*\n?[\s\S]*?```/g,'').trim()}
function guessFileName(info,index,content=''){
  const clean = String(info||'').trim();
  const quoted = clean.match(/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?=$|\s)/);
  if(quoted) return quoted[1].split('/').pop();
  const ext = langToExt(clean);
  if(ext==='html' && /<style[\s>]|<script[\s>]|<html/i.test(content)) return 'index.html';
  if(ext==='css') return 'style.css';
  if(ext==='js') return 'script.js';
  if(ext==='json') return 'data.json';
  return `file-${index+1}.${ext}`;
}
function extractCodeBlocks(text){
  const blocks=[];
  const re=/```([^\n`]*)\n?([\s\S]*?)```/g;
  let m, i=0;
  while((m=re.exec(String(text||'')))){
    const info=(m[1]||'').trim();
    const content=(m[2]||'').trim();
    if(!content) continue;
    blocks.push({info,content,name:guessFileName(info,i,content)});
    i++;
  }
  return blocks;
}
function normalizeAgentStep(raw,index){
  const type = String(raw.type||raw.kind||'think').toLowerCase();
  const label = raw.label || raw.name || raw.title || raw.command || raw.filename || '';
  const detail = raw.detail || raw.description || raw.output || '';
  const map = {
    file:{icon:'📄',title:'File created'},
    terminal:{icon:'▶️',title:'Execute Terminal'},
    think:{icon:'💭',title:'Think'},
    read:{icon:'📖',title:'Read'},
    edit:{icon:'✏️',title:'Edit'},
    deploy:{icon:'🚀',title:'Website deployed'},
    zip:{icon:'📦',title:'Creating ZIP...'},
    error:{icon:'⚠️',title:'Step failed'}
  };
  const meta = map[type] || {icon:'•',title:label||`Step ${index+1}`};
  return {
    type,
    icon: meta.icon,
    title: meta.title,
    detail: sanitizeError(label || detail || ''),
    content: raw.content || raw.preview || raw.output || raw.details || ''
  };
}
function clearAgentAutoHide(){
  if(state.agentTask.autoHideTimer){
    clearTimeout(state.agentTask.autoHideTimer);
    state.agentTask.autoHideTimer = null;
  }
}
function scheduleAgentAutoHide(delay=2600){
  clearAgentAutoHide();
  state.agentTask.autoHideTimer = setTimeout(()=>{
    if(state.agentTask.running)return;
    $('#agentPanel').classList.add('hidden');
    queueFloatingLayout();
  },delay);
}
function resetAgentPanel(){
  clearAgentAutoHide();
  const panel=$('#agentPanel');
  panel.classList.remove('collapsed','expanded','hidden');
  $('#agentSteps').innerHTML='';
  $('#agentProgressLabel').innerText='Task 0/0';
  $('#agentStatusText').innerText='Spinning up live activity';
  $('#agentMiniProgressFill').style.width='0%';
  $('#agentRunDot').className='agent-run-dot running';
  state.agentTask.steps=[];
  state.agentTask.files=[];
  queueFloatingLayout();
}
function syncAgentPanelVisibility(forceOpen=false){
  const panel=$('#agentPanel');
  const shouldShow = state.agentTask.running || state.agentTask.steps.length;
  if(!shouldShow){
    panel.classList.add('hidden');
    document.documentElement.style.setProperty('--activity-panel-height','0px');
    return;
  }
  panel.classList.remove('hidden');
  if(forceOpen || state.agentTask.running)panel.classList.remove('collapsed');
  queueFloatingLayout();
  if(!state.agentTask.running)scheduleAgentAutoHide();
}
function scrollAgentPanel(){const body=$('#agentPanelBody');if(body)setTimeout(()=>{body.scrollTop=body.scrollHeight;queueFloatingLayout()},20)}
function updateAgentProgress(done,total,status){
  const safeTotal = Math.max(total || 0, 1);
  const safeDone = Math.min(done || 0, safeTotal);
  $('#agentProgressLabel').innerText = `Task ${safeDone}/${safeTotal}`;
  $('#agentStatusText').innerText = status || (safeDone>=safeTotal?'✅ Complete':'Running');
  $('#agentMiniProgressFill').style.width = `${Math.max(0, Math.min(100, (safeDone/safeTotal)*100))}%`;
}
function buildStepPreview(step){
  if(step.content){
    return `<pre><code>${escapeHtml(String(step.content).slice(0,5000))}</code></pre>`;
  }
  if(step.detail){
    return `<div class="agent-step-text">${escapeHtml(step.detail)}</div>`;
  }
  return '<div class="agent-step-text">Completed</div>';
}
function createAgentStepRow(step,index){
  const row=el('div','agent-step running');
  row.dataset.index=index;
  row.innerHTML = `<div class="agent-step-head"><span class="agent-step-icon">${step.icon}</span><div class="agent-step-copy"><span class="agent-step-title">${escapeHtml(step.title)}</span>${step.detail?`<span class="agent-step-detail">${escapeHtml(step.detail)}</span>`:''}</div><span class="agent-step-live" aria-hidden="true"><i></i><i></i><i></i></span><span class="agent-step-arrow">›</span></div><div class="agent-step-content">${buildStepPreview(step)}</div>`;
  row.onclick=()=>row.classList.toggle('open');
  $('#agentSteps').appendChild(row);
  scrollAgentPanel();
  return row;
}
async function animateSteps(steps){
  state.agentTask.steps = steps;
  syncAgentPanelVisibility(true);
  const total = steps.length || 1;
  for(let i=0;i<steps.length;i++){
    const step=steps[i];
    updateAgentProgress(i,total,step.detail || step.title || 'Running');
    const row=createAgentStepRow(step,i);
    await sleep(step.type==='think'?520:380);
    row.classList.remove('running');
    row.classList.add(step.type==='error'?'failed':'done');
    updateAgentProgress(i+1,total,i+1===total?'✅ Complete':'Working through remaining steps');
    queueFloatingLayout();
  }
  $('#agentRunDot').className='agent-run-dot done';
  scheduleAgentAutoHide();
}
function makeBlobDownload(filename,content,mime='text/plain;charset=utf-8'){
  const blob = new Blob([content],{type:mime});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function renderFileDownloads(files,promptText,zipMode){
  const wrap=el('div','file-downloads');
  files.forEach((file,idx)=>{
    const card=el('div','file-download-card');
    const row=el('div','file-download-row');
    row.innerHTML=`<span>📄</span><div class="file-download-name">${escapeHtml(file.name||`file-${idx+1}.txt`)}</div>`;
    const actions=el('div','file-download-actions');
    const previewBtn=el('button','file-btn secondary','Preview');
    const downBtn=el('button','file-btn','↓');
    previewBtn.onclick=()=>card.classList.toggle('show-preview');
    downBtn.onclick=()=>makeBlobDownload(file.name||`file-${idx+1}.txt`,file.content||'');
    actions.appendChild(previewBtn);
    actions.appendChild(downBtn);
    row.appendChild(actions);
    card.appendChild(row);
    card.appendChild(el('pre','file-preview',escapeHtml(file.content||'')));
    wrap.appendChild(card);
  });
  if(files.length>1){
    const zipBtn=el('button','zip-btn'+(zipMode?'':' subtle'),zipMode?'📦 Download ZIP':'📦 Download all as ZIP?');
    zipBtn.onclick=()=>createAndDownloadZip(files, `${slugifyPrompt(promptText)}.zip`, zipBtn);
    wrap.appendChild(zipBtn);
  }
  return wrap;
}
async function createAndDownloadZip(files,zipName,btn){
  if(!window.JSZip){toast('JSZip failed to load');return}
  const original = btn ? btn.innerHTML : '';
  if(btn){btn.disabled=true;btn.innerHTML='<span class="zip-spinner"></span>Creating ZIP...'}
  const zip = new JSZip();
  files.forEach(file=>zip.file(file.name||'file.txt', file.content||''));
  const blob = await zip.generateAsync({type:'blob'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=zipName;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  toast('📦 ZIP ready!');
  if(btn){btn.disabled=false;btn.innerHTML=original || '📦 Download ZIP'}
}
function parseStepsFromResponse(payload,promptText){
  const data = payload && payload.data ? payload.data : payload;
  const reply = data?.reply || data?.message || data?.content || data?.response || (typeof data==='string' ? data : 'Your project is ready!');
  const filesFromData = Array.isArray(data?.files) ? data.files.map((f,i)=>({name:f.name||guessFileName(f.name||'',i,f.content||''),content:f.content||''})) : [];
  let steps = Array.isArray(data?.steps) ? data.steps.map((s,i)=>normalizeAgentStep(s,i)) : [];
  let files = filesFromData.length ? filesFromData : [];
  if(!files.length && steps.length){
    files = steps.filter(s=>s.type==='file' && s.content).map((s,i)=>({name:s.detail || `file-${i+1}.txt`,content:s.content||''}));
  }
  if(!steps.length || !files.length){
    const blocks = extractCodeBlocks(reply);
    const stripped = stripCodeBlocks(reply);
    if(!files.length && blocks.length){
      files = blocks.map((b,i)=>({name:b.name||guessFileName(b.info,i,b.content),content:b.content}));
    }
    if(!steps.length && files.length){
      steps = [normalizeAgentStep({type:'think',label:'Planning the project'},0)];
      files.forEach((f,i)=>steps.push(normalizeAgentStep({type:'file',label:f.name,content:f.content},i+1)));
      steps.push(normalizeAgentStep({type:'deploy',label:'Project ready'},steps.length));
    }
    if(files.length===1 && countLines(files[0].content)<=30 && !isProjectIntent(promptText)){
      return {
        inline: true,
        reply: stripped || 'Here is your code:',
        code: files[0].content,
        filename: files[0].name,
        lang: inferLangFromName(files[0].name),
        files,
        steps: []
      };
    }
  }
  if(files.length>1 && wantsZip(promptText)){
    steps.push(normalizeAgentStep({type:'zip',label:'Creating ZIP...'},steps.length));
  }
  return {inline:false,reply,files,steps};
}
async function doAgent(text){
  resetAgentPanel();
  state.agentTask.running = true;
  state.agentTask.prompt = text;
  state.agentTask.wantsZip = wantsZip(text);
  syncAgentPanelVisibility();
  let payload, ms=0;
  try{
    try{
      const res = await api('/api/agent',{method:'POST',body:{prompt:text,model:'agent',session_id:state.sessionId}});
      payload = res.data; ms = res.ms;
    }catch(err){
      if(String(err.message||'').includes('HTTP 404')){
        const msgs = state.messages.filter(m=>m.role==='user'||m.role==='ai').map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}));
        const res = await api('/api/chat',{method:'POST',body:{messages:msgs,model:'agent',session_id:state.sessionId}});
        payload = res.data; ms = res.ms;
      }else{
        throw err;
      }
    }
    const parsed = parseStepsFromResponse(payload,text);
    if(parsed.inline){
      state.agentTask.running = false;
      state.agentTask.steps = [];
      syncAgentPanelVisibility();
      const inlineContent = (parsed.reply ? parsed.reply + '\n\n' : '') + `**Inline code (${parsed.filename})**\n\n\`\`\`${parsed.lang}\n${parsed.code}\n\`\`\``;
      appendBubble('ai', inlineContent,{ms});
      loadHistoryList();
      return;
    }
    state.agentTask.files = parsed.files || [];
    if(parsed.steps?.length) await animateSteps(parsed.steps);
    const wrap=el('div','msg ai');
    const bub=el('div','bubble');
    if(parsed.reply){
      bub.innerHTML = `${renderMD(parsed.reply)}${parsed.files?.length?'<div class="inline-note">Generated files are ready below.</div>':''}`;
    }else{
      bub.innerHTML = parsed.files?.length ? '<div class="inline-note">Generated files are ready below.</div>' : '✅ Complete';
    }
    if(parsed.files?.length){
      bub.appendChild(renderFileDownloads(parsed.files,text,wantsZip(text)));
    }
    wrap.appendChild(bub);
    const meta_el=el('div','msg-meta');
    if(ms)meta_el.appendChild(el('span','',`${ms}ms`));
    const copyBtn=el('button','','📋');
    copyBtn.onclick=()=>{navigator.clipboard.writeText(parsed.reply||'Project ready');toast('Copied!')};
    meta_el.appendChild(copyBtn);
    wrap.appendChild(meta_el);
    $('#chatArea').appendChild(wrap);
    scrollDown();
    state.messages.push({role:'ai',content:parsed.reply||'[Agent files ready]',meta:{ms,files:(parsed.files||[]).map(f=>f.name)},ts:Date.now()});
    save();
    state.agentTask.running = false;
    $('#agentRunDot').className='agent-run-dot done';
    $('#agentStatusText').innerText='✅ Complete';
    loadHistoryList();
  }catch(err){
    state.agentTask.running = false;
    $('#agentRunDot').className='agent-run-dot failed';
    $('#agentStatusText').innerText='⚠️ Failed';
    const failed = normalizeAgentStep({type:'error',label:sanitizeError(err.message)},0);
    const row=createAgentStepRow(failed, $('#agentSteps').children.length);
    row.classList.remove('running');
    row.classList.add('failed','open');
    appendBubble('ai',`⚠️ Step failed: ${sanitizeError(err.message)}`);
    throw err;
  }finally{
    syncAgentPanelVisibility();
  }
}


/* ============ API HELPER ============ */
async function api(path,opts={}){
  const url = state.baseUrl + path;
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(),60000);
  const t0 = performance.now();
  try{
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.formData ? {"Authorization":`Bearer ${state.token}`} : HEADERS(),
      body: opts.body ? (opts.formData ? opts.body : JSON.stringify(opts.body)) : undefined,
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const ms = Math.round(performance.now()-t0);
    state.responseTimes.push(ms);
    if(state.responseTimes.length>5)state.responseTimes.shift();
    if(res.status===401){toast("🔑 Wrong token. Update in Settings.");openSheet('settingsSheet');throw new Error('401')}
    if(res.status===429){toast("⏳ Too many requests. Wait 60s.");throw new Error('429')}
    if(!res.ok){const txt=await res.text().catch(()=>'');throw new Error(`HTTP ${res.status}: ${txt.slice(0,100)}`)}
    state.isOnline=true; updateFabStatus();
    const ct = res.headers.get('content-type')||'';
    if(ct.includes('application/json')) return {data:await res.json(),ms};
    return {data:await res.text(),ms};
  }catch(e){
    clearTimeout(timer);
    if(e.name==='AbortError'){toast("⏱️ Request timed out. Try again.");throw new Error('timeout')}
    if(e.message.includes('Failed to fetch')||e.message.includes('NetworkError')){
      state.isOnline=false;updateFabStatus();
      toast("❌ Backend offline. Check status.");
    }
    throw e;
  }
}

/* ============ DRAWER & SHEETS ============ */
function openDrawer(){$('#drawer').classList.add('show');$('#overlay').classList.add('show')}
function closeDrawer(){$('#drawer').classList.remove('show');$('#overlay').classList.remove('show')}
function openSheet(id){$('#'+id).classList.add('show');$('#overlay').classList.add('show')}
function closeSheet(id){$('#'+id).classList.remove('show');if(!document.querySelector('.drawer.show'))$('#overlay').classList.remove('show')}
$('#menuBtn').onclick=openDrawer;
$('#overlay').onclick=()=>{closeDrawer();$$('.sheet').forEach(s=>s.classList.remove('show'))};
$$('[data-close-sheet]').forEach(b=>b.onclick=()=>closeSheet(b.dataset.closeSheet));

$('#agentPanelHeader').onclick=()=>{
  if(!state.agentTask.steps.length && !state.agentTask.running)return;
  $('#agentPanel').classList.toggle('collapsed');
};
$('#agentOpenBtn').onclick=e=>{e.stopPropagation();clearAgentAutoHide();$('#agentPanel').classList.remove('collapsed','hidden');scrollAgentPanel();queueFloatingLayout()};
$('#agentExpandBtn').onclick=e=>{e.stopPropagation();clearAgentAutoHide();$('#agentPanel').classList.toggle('expanded');queueFloatingLayout()};

/* ============ MODEL SELECTOR ============ */
$('#modelSelector').onclick=(e)=>{e.stopPropagation();$('#modelDropdown').classList.toggle('show')};
document.addEventListener('click',()=>$('#modelDropdown').classList.remove('show'));
$$('.model-option').forEach(o=>o.onclick=e=>{
  e.stopPropagation();
  state.model=o.dataset.model;save();
  $$('.model-option').forEach(x=>x.classList.remove('active'));
  o.classList.add('active');
  $('#modelLabel').innerText=o.innerText.trim();
  $('#modelDot').className='model-dot '+state.model;
  $('#modelDropdown').classList.remove('show');
});
// init model selector
(function(){const opt=document.querySelector(`.model-option[data-model="${state.model}"]`);if(opt){$$('.model-option').forEach(x=>x.classList.remove('active'));opt.classList.add('active');$('#modelLabel').innerText=opt.innerText.trim();$('#modelDot').className='model-dot '+state.model}})();

/* ============ CHAT RENDERING ============ */
function renderAllMessages(){
  const area = $('#chatArea');
  area.innerHTML='';
  if(state.messages.length===0){
    area.appendChild(document.getElementById('welcome')||el('div','welcome'));
    queueFloatingLayout();
    return;
  }
  state.messages.forEach(m=>appendBubble(m.role,m.content,m.meta||{},false));
  scrollDown();
  queueFloatingLayout();
}
function appendBubble(role,content,meta={},store=true){
  if($('#welcome'))$('#welcome').remove();
  const wrap=el('div','msg '+role);
  const bub=el('div','bubble');
  bub.innerHTML = role==='ai' ? renderMD(content) : escapeHtml(content);
  wrap.appendChild(bub);
  if(role==='ai'){
    const meta_el=el('div','msg-meta');
    if(meta.ms)meta_el.appendChild(el('span','',`${meta.ms}ms`));
    if(meta.tokens)meta_el.appendChild(el('span','',`· ${meta.tokens} tokens`));
    const ttsBtn=el('button','','🔊');
    ttsBtn.onclick=()=>doTTS(content,ttsBtn);
    meta_el.appendChild(ttsBtn);
    const copyBtn=el('button','','📋');
    copyBtn.onclick=()=>{navigator.clipboard.writeText(content);toast('Copied!')};
    meta_el.appendChild(copyBtn);
    wrap.appendChild(meta_el);
  }
  $('#chatArea').appendChild(wrap);
  if(store){state.messages.push({role,content,meta,ts:Date.now()});save()}
  scrollDown();
  return bub;
}
function scrollDown(){const a=$('#chatArea');setTimeout(()=>a.scrollTop=a.scrollHeight,30)}
function showTyping(){const t=el('div','typing','<span></span><span></span><span></span>');t.id='typingIndicator';$('#chatArea').appendChild(t);scrollDown();return t}
function hideTyping(){const t=$('#typingIndicator');if(t)t.remove()}

/* ============ MAIN SEND ============ */
const input = $('#messageInput');
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';queueFloatingLayout()});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}});
$('#sendBtn').onclick=handleSend;

async function handleSend(){
  const text=input.value.trim();
  if(!text)return;
  input.value='';input.style.height='auto';
  appendBubble('user',text);

  try{
    switch(state.mode){
      case 'search': return await doSearch(text);
      case 'image': return await doImage(text);
      case 'translate': return await doTranslate(text);
      case 'summarize':
        if(state.summaryMode==='youtube')return await doSummarizeYT(text);
        if(state.summaryMode==='url')return await doSummarizeURL(text);
        return await doSummarizeText(text);
      case 'youtube': return await doSummarizeYT(text);
      case 'code': return await doCode(text);
      case 'write': return await doWrite(text);
      case 'agent': return await doAgent(text);
      default: return state.streaming ? await doChatStream(text) : await doChat(text);
    }
  }catch(e){
    hideTyping();
    appendBubble('ai',`⚠️ Sorry, something went wrong: ${e.message}`);
  }
}

/* ============ CHAT (Non-streaming) ============ */
async function doChat(text){
  const typing=showTyping();
  const msgs = state.messages.filter(m=>m.role==='user'||m.role==='ai').map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}));
  try{
    const {data,ms} = await api('/api/chat',{method:'POST',body:{messages:msgs,model:state.model,session_id:state.sessionId}});
    hideTyping();
    const reply = data.reply || data.message || data.content || data.response || JSON.stringify(data);
    appendBubble('ai',reply,{ms,tokens:data.tokens||data.usage?.total_tokens});
    if(state.ttsAuto)doTTS(reply);
    loadHistoryList();
  }catch(e){hideTyping();throw e}
}

/* ============ CHAT (Streaming) ============ */
async function doChatStream(text){
  const typing=showTyping();
  const msgs = state.messages.filter(m=>m.role==='user'||m.role==='ai').map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}));
  let bub=null, full='', t0=performance.now();
  try{
    const res = await fetch(state.baseUrl+'/api/chat/stream',{
      method:'POST',headers:HEADERS(),
      body:JSON.stringify({messages:msgs,model:state.model,session_id:state.sessionId,stream:true})
    });
    hideTyping();
    if(!res.ok){
      if(res.status===401){toast("🔑 Wrong token.");openSheet('settingsSheet');throw new Error('401')}
      // fallback to non-stream
      return await doChat(text);
    }
    bub=appendBubble('ai','',{},false);
    bub.innerHTML='<span class="cursor-blink"></span>';
    const reader=res.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      buffer += decoder.decode(value,{stream:true});
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for(const line of lines){
        const trimmed = line.trim();
        if(!trimmed)continue;
        if(trimmed.startsWith('data: ')){
          const payload = trimmed.slice(6);
          if(payload==='[DONE]')continue;
          try{
            const json=JSON.parse(payload);
            if(json.done)continue;
            const delta = json.delta || json.content || json.text || '';
            if(delta){full+=delta;bub.innerHTML=renderMD(full)+'<span class="cursor-blink"></span>';scrollDown()}
          }catch(e){/* maybe plain text */ full+=payload;bub.innerHTML=renderMD(full)+'<span class="cursor-blink"></span>'}
        }
      }
    }
    const ms = Math.round(performance.now()-t0);
    state.responseTimes.push(ms);if(state.responseTimes.length>5)state.responseTimes.shift();
    bub.innerHTML=renderMD(full);
    // store
    state.messages.push({role:'ai',content:full,meta:{ms},ts:Date.now()});save();
    // add meta row
    const wrap = bub.parentElement;
    const meta_el=el('div','msg-meta');
    meta_el.appendChild(el('span','',`${ms}ms`));
    const ttsBtn=el('button','','🔊');ttsBtn.onclick=()=>doTTS(full,ttsBtn);meta_el.appendChild(ttsBtn);
    const copyBtn=el('button','','📋');copyBtn.onclick=()=>{navigator.clipboard.writeText(full);toast('Copied!')};meta_el.appendChild(copyBtn);
    wrap.appendChild(meta_el);
    if(state.ttsAuto&&full)doTTS(full);
    loadHistoryList();
  }catch(e){hideTyping();if(bub)bub.innerHTML+=' <em>(error)</em>';throw e}
}

/* ============ SEARCH ============ */
async function doSearch(query){
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/search',{method:'POST',body:{query,num_results:5,summarize:true}});
    hideTyping();
    const results = data.results || data.items || [];
    let html='';
    results.forEach(r=>{
      html += `<div class="search-card">
        <div class="title">📰 ${escapeHtml(r.title||'Result')}</div>
        <div class="snippet">${escapeHtml(r.snippet||r.description||'')}</div>
        <div class="meta"><a href="${escapeHtml(r.url||'#')}" target="_blank">🔗 ${escapeHtml((r.url||'').replace(/^https?:\/\//,'').split('/')[0])}</a>${r.date?'<span>📅 '+escapeHtml(r.date)+'</span>':''}</div>
      </div>`;
    });
    if(data.summary)html+='<div style="margin-top:10px"><strong>✨ AI Summary:</strong><br>'+renderMD(data.summary)+'</div>';
    if(!html)html='<em>No results found.</em>';
    const bub = appendBubble('ai','',{ms},false);
    bub.innerHTML=html;
    state.messages.push({role:'ai',content:'[Search results for: '+query+']',meta:{ms},ts:Date.now()});save();
  }catch(e){hideTyping();throw e}
}

/* ============ IMAGE GEN ============ */
async function doImage(prompt){
  if($('#welcome'))$('#welcome').remove();
  const wrap=el('div','msg ai');
  const bub=el('div','bubble');
  bub.innerHTML='<div class="shimmer"></div><div style="margin-top:8px;font-size:13px;color:var(--text-2)">🎨 Generating "<strong>'+escapeHtml(prompt)+'</strong>"...</div>';
  wrap.appendChild(bub);
  $('#chatArea').appendChild(wrap);scrollDown();
  try{
    const {data,ms} = await api('/api/image/generate',{method:'POST',body:{prompt,style:state.imageStyle,width:1024,height:1024}});
    const imgUrl = data.url || data.image_url || data.image || (data.b64 ? `data:image/png;base64,${data.b64}` : '');
    const seed = data.seed || data.id || '—';
    bub.innerHTML=`<img class="gen-image" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(prompt)}"/>
      <div class="image-meta"><span>Seed: ${escapeHtml(String(seed))} · ${ms}ms</span>
      <button onclick="downloadImage('${escapeHtml(imgUrl)}','${escapeHtml(prompt.slice(0,20))}')">💾 Download</button></div>`;
    state.messages.push({role:'ai',content:'[Image: '+prompt+']',meta:{ms,imageUrl:imgUrl},ts:Date.now()});save();
  }catch(e){bub.innerHTML='⚠️ Image generation failed: '+escapeHtml(e.message)}
}
function downloadImage(url,name){const a=document.createElement('a');a.href=url;a.download=(name||'kimi-image')+'.png';a.target='_blank';a.click()}

/* ============ TRANSLATE ============ */
async function doTranslate(text){
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/translate',{method:'POST',body:{text,from_lang:state.transFrom,to_lang:state.transTo}});
    hideTyping();
    const translated = data.translated || data.translation || data.text || data.result || '';
    const bub=appendBubble('ai','',{ms},false);
    bub.innerHTML=`<div class="trans-box">
      <div class="trans-side orig"><div class="lbl">Original (${state.transFrom})</div>${escapeHtml(text)}</div>
      <div class="trans-side tran"><div class="lbl">${state.transTo}</div>${escapeHtml(translated)}</div>
    </div>`;
    state.messages.push({role:'ai',content:translated,meta:{ms},ts:Date.now()});save();
  }catch(e){hideTyping();throw e}
}

/* ============ SUMMARIZE ============ */
async function doSummarizeText(text){
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/summarize/text',{method:'POST',body:{text,length:'medium'}});
    hideTyping();
    const summary = data.summary || data.result || data.text || '';
    appendBubble('ai',`**📝 Summary:**\n\n${summary}`,{ms});
  }catch(e){hideTyping();throw e}
}
async function doSummarizeURL(url){
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/summarize/url',{method:'POST',body:{url,length:'medium'}});
    hideTyping();
    let txt = `**📝 ${escapeHtml(data.title||'Summary')}:**\n\n${data.summary||data.result||''}`;
    if(data.key_points)txt+='\n\n**Key Points:**\n'+data.key_points.map((p,i)=>`${i+1}. ${p}`).join('\n');
    appendBubble('ai',txt,{ms});
  }catch(e){hideTyping();throw e}
}
async function doSummarizeYT(url){
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/summarize/youtube',{method:'POST',body:{url,language:'en'}});
    hideTyping();
    let txt = `**▶️ Video Summary:**\n\n${data.summary||''}`;
    if(data.key_points)txt+='\n\n**Key Points:**\n'+data.key_points.map((p,i)=>`${i+1}. ${p}`).join('\n');
    appendBubble('ai',txt,{ms});
  }catch(e){hideTyping();throw e}
}

/* ============ CODE TOOLS ============ */
async function doCode(text){
  const typing=showTyping();
  try{
    const endpoint = '/api/code/'+state.codeMode;
    const body = state.codeMode==='convert' ? {code:text,to_language:'python'} :
                 state.codeMode==='generate' ? {prompt:text,language:'python'} : {code:text};
    const {data,ms} = await api(endpoint,{method:'POST',body});
    hideTyping();
    const out = data.result || data.code || data.review || data.fix || data.explanation || data.output || JSON.stringify(data);
    const lang = data.language || 'plain';
    appendBubble('ai',`**💻 ${state.codeMode.charAt(0).toUpperCase()+state.codeMode.slice(1)}:** \`${lang}\`\n\n\`\`\`${lang}\n${out}\n\`\`\``,{ms});
  }catch(e){hideTyping();throw e}
}

/* ============ WRITE TOOLS ============ */
async function doWrite(prompt){
  const typing=showTyping();
  try{
    let endpoint='/api/write/generate',body={prompt,type:state.writeMode};
    if(state.writeMode==='improve'){endpoint='/api/write/improve';body={text:prompt}}
    if(state.writeMode==='email'){endpoint='/api/write/email';body={prompt}}
    const {data,ms} = await api(endpoint,{method:'POST',body});
    hideTyping();
    const out = data.result || data.text || data.content || '';
    const wc = (out.match(/\S+/g)||[]).length;
    const bub=appendBubble('ai','',{ms},false);
    bub.innerHTML=`<div style="font-size:11px;color:var(--text-2);margin-bottom:6px">📊 ${wc} words · ${ms}ms</div>${renderMD(out)}
      <div style="margin-top:8px;display:flex;gap:6px"><button onclick="navigator.clipboard.writeText(\`${out.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`);window.toast?.('Copied!')" style="padding:5px 10px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:12px">📋 Copy</button>
      <button onclick="document.getElementById('messageInput').value='${escapeHtml(prompt).replace(/'/g,"\\'")}';document.getElementById('sendBtn').click()" style="padding:5px 10px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:12px">🔄 Try Again</button></div>`;
    state.messages.push({role:'ai',content:out,meta:{ms},ts:Date.now()});save();
  }catch(e){hideTyping();throw e}
}
window.toast = toast;

/* ============ TTS ============ */
async function doTTS(text,btn){
  if(!text)return;
  try{
    if(btn)btn.innerText='⏳';
    const {data} = await api('/api/tts',{method:'POST',body:{text:text.slice(0,500),language:'auto'}});
    const b64 = data.audio || data.audio_base64 || data.b64;
    const url = data.url;
    let audio;
    if(b64)audio = new Audio(`data:audio/mp3;base64,${b64}`);
    else if(url)audio = new Audio(url);
    else throw new Error('No audio returned');
    audio.play();
    if(btn)btn.innerText='🔊';
  }catch(e){if(btn)btn.innerText='🔊';toast('TTS failed')}
}

/* ============ QUICK CHIPS ============ */
const styleRow = $('#styleRow');
const placeholders = {
  chat:"Ask Kimi anything...", search:"Search anything...", image:"Describe an image...",
  translate:"Type text to translate...", summarize:"Paste text or URL...",
  code:"Paste your code...", write:"What should I write?", agent:"Describe the project or task...", youtube:"Paste YouTube URL...",
};
function setMode(mode){
  state.mode=mode;
  $$('.chip').forEach(c=>c.classList.toggle('active',c.dataset.mode===mode));
  input.placeholder = placeholders[mode] || "Type a message...";
  styleRow.innerHTML='';styleRow.style.display='none';
  syncAgentPanelVisibility();
  queueFloatingLayout();
  if(mode==='image'){
    styleRow.style.display='flex';
    ['Realistic','Anime','3D','Sketch','Painting'].forEach(s=>{
      const c=el('div','style-chip'+(state.imageStyle===s.toLowerCase()?' active':''),s);
      c.onclick=()=>{state.imageStyle=s.toLowerCase();$$('.style-chip',styleRow).forEach(x=>x.classList.remove('active'));c.classList.add('active');queueFloatingLayout()};
      styleRow.appendChild(c);
    });
  } else if(mode==='translate'){
    styleRow.style.display='flex';
    [['auto','From:Auto'],['en','EN'],['hi','HI'],['ur','UR'],['ar','AR']].forEach(([k,lbl])=>{
      const c=el('div','style-chip'+(state.transTo===k?' active':''),lbl);
      c.onclick=()=>{if(k==='auto')state.transFrom='auto';else state.transTo=k;$$('.style-chip',styleRow).forEach(x=>x.classList.remove('active'));c.classList.add('active');queueFloatingLayout()};
      styleRow.appendChild(c);
    });
  } else if(mode==='summarize'){
    styleRow.style.display='flex';
    [['text','📄 Text'],['url','🔗 URL'],['youtube','▶️ YouTube']].forEach(([k,lbl])=>{
      const c=el('div','style-chip'+(state.summaryMode===k?' active':''),lbl);
      c.onclick=()=>{state.summaryMode=k;$$('.style-chip',styleRow).forEach(x=>x.classList.remove('active'));c.classList.add('active');queueFloatingLayout()};
      styleRow.appendChild(c);
    });
  } else if(mode==='code'){
    styleRow.style.display='flex';
    [['review','🔍 Review'],['fix','🐛 Fix'],['explain','💡 Explain'],['convert','🔄 Convert'],['generate','✨ Generate']].forEach(([k,lbl])=>{
      const c=el('div','style-chip'+(state.codeMode===k?' active':''),lbl);
      c.onclick=()=>{state.codeMode=k;$$('.style-chip',styleRow).forEach(x=>x.classList.remove('active'));c.classList.add('active');queueFloatingLayout()};
      styleRow.appendChild(c);
    });
  } else if(mode==='write'){
    styleRow.style.display='flex';
    [['blog','📝 Blog'],['email','📧 Email'],['social','📱 Social'],['improve','✨ Improve']].forEach(([k,lbl])=>{
      const c=el('div','style-chip'+(state.writeMode===k?' active':''),lbl);
      c.onclick=()=>{state.writeMode=k;$$('.style-chip',styleRow).forEach(x=>x.classList.remove('active'));c.classList.add('active');queueFloatingLayout()};
      styleRow.appendChild(c);
    });
  }
}
$$('.chip').forEach(c=>c.onclick=()=>{
  if(c.dataset.mode==='status'){openStatusSheet();return}
  setMode(c.dataset.mode);
});

/* ============ STATUS PANEL ============ */
function updateFabStatus(){
  const dot = $('#statusFabDot');
  if(!state.isOnline)dot.className='status-fab-dot offline';
  else if(state.responseTimes.length&&state.responseTimes.slice(-1)[0]>5000)dot.className='status-fab-dot slow';
  else dot.className='status-fab-dot';
}
$('#statusFab').onclick=openStatusSheet;

let lastStatusCheck = null;
async function openStatusSheet(){
  openSheet('statusSheet');
  await renderStatusSheet();
}
async function renderStatusSheet(){
  const body = $('#statusSheetBody');
  body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-2)">Loading status...</div>';
  let backendOk=false, info={};
  try{
    const {data} = await api('/api/status');
    info = data;
    backendOk = true;
  }catch(e){backendOk=false}
  lastStatusCheck = Date.now();

  const dot = backendOk?'green':'red';
  const uptime = info.uptime_seconds || info.uptime || info.uptime_s;
  const keysWorking = info.keys_working ?? info.api_keys_working;
  const keysTotal = info.keys_total ?? info.api_keys_total;
  const totalReq = info.total_requests ?? info.requests ?? '—';
  const errors = info.errors ?? info.error_count ?? '—';

  body.innerHTML = `
    <div class="status-card">
      <div class="status-row"><span class="label">Backend</span>
        <span class="value"><span class="status-dot ${dot}"></span>${backendOk?'Online':'Offline'}</span></div>
      <div class="status-row"><span class="label">⏱️ Uptime</span><span class="value">${fmtUptime(uptime)}</span></div>
      <div class="status-row"><span class="label">🔑 API Keys</span><span class="value">${keysWorking??'?'}/${keysTotal??'?'} working</span></div>
      <div class="status-row"><span class="label">📊 Total Requests</span><span class="value">${totalReq}</span></div>
      <div class="status-row"><span class="label">⚠️ Errors</span><span class="value">${errors}</span></div>
      <div class="status-row"><span class="label">Last checked</span><span class="value" id="lastChecked">just now</span></div>
    </div>

    <button class="test-btn" id="testAllBtn">🔄 Test All Features</button>
    <div class="progress-bar"><div class="progress-fill" id="testProgress"></div></div>
    <div class="feature-grid" id="featureGrid">
      ${featureList.map(f=>`<div class="feature-row" id="frow-${f.id}">
        <span>${f.icon}</span><span class="name">${f.name}</span>
        <span class="status-text">⏳ Not tested</span></div>`).join('')}
    </div>

    <div class="status-card" style="margin-top:14px">
      <div class="status-row"><span class="label">📈 Last 5 response times</span></div>
      <div class="bar-chart" id="barChart">
        ${(state.responseTimes.length?state.responseTimes:[0,0,0,0,0]).map(ms=>{
          const h = Math.min(100,(ms/3000)*100);
          return `<div class="bar" style="height:${h}%" data-ms="${ms||'—'}ms"></div>`;
        }).join('')}
      </div>
    </div>
  `;
  $('#testAllBtn').onclick=runAllTests;
  // update last checked label
  setInterval(()=>{const el=$('#lastChecked');if(el&&lastStatusCheck)el.innerText='Last checked: '+timeAgo(lastStatusCheck)},10000);
}

const featureList = [
  {id:'chat',icon:'💬',name:'Chat',test:async()=>await api('/api/chat',{method:'POST',body:{messages:[{role:'user',content:'hi'}],model:'instant',session_id:'test'}})},
  {id:'search',icon:'🔍',name:'Web Search',test:async()=>await api('/api/search',{method:'POST',body:{query:'test',num_results:1}})},
  {id:'image',icon:'🖼️',name:'Image Gen',test:async()=>await api('/api/image/generate',{method:'POST',body:{prompt:'test',width:256,height:256}})},
  {id:'tts',icon:'🔊',name:'TTS',test:async()=>await api('/api/tts',{method:'POST',body:{text:'test',language:'en'}})},
  {id:'upload',icon:'📁',name:'File Upload',test:async()=>await api('/api/upload/url',{method:'POST',body:{url:'https://example.com'}})},
  {id:'translate',icon:'🌐',name:'Translate',test:async()=>await api('/api/translate',{method:'POST',body:{text:'hello',from_lang:'auto',to_lang:'hi'}})},
  {id:'summarize',icon:'📝',name:'Summarize',test:async()=>await api('/api/summarize/text',{method:'POST',body:{text:'This is a long enough piece of text for the summarizer to work on. It has a few sentences.',length:'short'}})},
  {id:'code',icon:'💻',name:'Code Tools',test:async()=>await api('/api/code/explain',{method:'POST',body:{code:'print(1)'}})},
  {id:'docintel',icon:'📊',name:'Doc Intel',test:async()=>await api('/api/upload/url',{method:'POST',body:{url:'https://example.com'}})},
  {id:'write',icon:'✍️',name:'Write Tools',test:async()=>await api('/api/write/generate',{method:'POST',body:{prompt:'test',type:'blog'}})},
  {id:'history',icon:'💬',name:'History',test:async()=>await api('/api/history/list')}
];

async function runAllTests(){
  const btn=$('#testAllBtn');btn.disabled=true;btn.innerText='Testing...';
  const prog=$('#testProgress');
  let pass=0;
  for(let i=0;i<featureList.length;i++){
    const f=featureList[i];
    const row=$('#frow-'+f.id);
    row.className='feature-row testing';
    row.querySelector('.status-text').innerText='⏳ Testing...';
    try{
      const t0=performance.now();
      await f.test();
      const ms=Math.round(performance.now()-t0);
      row.className='feature-row success';
      row.querySelector('.status-text').innerText=`✅ ${ms}ms`;
      pass++;
    }catch(e){
      row.className='feature-row error';
      row.querySelector('.status-text').innerText='❌ '+(e.message||'error').slice(0,30);
    }
    prog.style.width=`${((i+1)/featureList.length)*100}%`;
  }
  btn.disabled=false;
  btn.innerText=`✅ ${pass}/${featureList.length} features working ${pass===featureList.length?'🎉':''}`;
  toast(`${pass}/${featureList.length} features working`);
}

// Periodic ping
async function pingStatus(){
  try{await api('/api/status');state.isOnline=true}
  catch(e){state.isOnline=false}
  updateFabStatus();
}
pingStatus();
setInterval(pingStatus,60000);

/* ============ HISTORY ============ */
async function loadHistoryList(){
  const list = $('#historyList');
  list.innerHTML='<div class="history-section-title">Recent Chats</div>';
  try{
    const {data} = await api('/api/history/list');
    const items = data.history || data.sessions || data.items || data || [];
    if(Array.isArray(items)&&items.length){
      items.slice(0,30).forEach(h=>{
        const sid = h.session_id||h.id;
        const title = h.title||h.name||'Untitled';
        const date = h.date||h.updated_at||h.created_at||'';
        const itm=el('div','history-item');
        itm.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <div class="info"><div class="title">${escapeHtml(title)}</div><div class="date">${escapeHtml(date)}</div></div>
          <div class="history-actions">
            <button title="Export">📤</button>
            <button title="Delete">🗑️</button>
          </div>`;
        itm.querySelector('.info').onclick=()=>loadSession(sid);
        const [exportBtn,delBtn]=itm.querySelectorAll('.history-actions button');
        exportBtn.onclick=e=>{e.stopPropagation();exportSession(sid,title)};
        delBtn.onclick=e=>{e.stopPropagation();deleteSession(sid,itm)};
        list.appendChild(itm);
      });
    } else {
      list.innerHTML+='<div style="padding:18px;text-align:center;color:var(--text-2);font-size:13px">No chats yet</div>';
    }
  }catch(e){
    list.innerHTML+='<div style="padding:18px;text-align:center;color:var(--text-2);font-size:13px">Cannot load history</div>';
  }
}
async function loadSession(sid){
  try{
    const {data} = await api('/api/history/'+sid);
    const msgs = data.messages || data.history || [];
    state.sessionId = sid; localStorage.setItem('kimi_session_id',sid);
    state.messages = msgs.map(m=>({role:m.role==='assistant'?'ai':m.role,content:m.content||m.message||'',ts:Date.now()}));
    save();renderAllMessages();closeDrawer();
  }catch(e){toast('Cannot load chat')}
}
async function deleteSession(sid,itm){
  if(!confirm('Delete this chat?'))return;
  try{
    await api('/api/history/'+sid,{method:'DELETE'});
    itm.remove();toast('Deleted');
  }catch(e){toast('Cannot delete')}
}
async function exportSession(sid,title){
  try{
    const res = await fetch(state.baseUrl+'/api/history/export/'+sid,{method:'POST',headers:HEADERS()});
    const blob = await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(title||'chat')+'.txt';
    a.click();
  }catch(e){toast('Export failed')}
}
$('#newChatBtn').onclick=()=>{
  state.sessionId=genUUID();state.messages=[];save();
  renderAllMessages();
  $('#chatArea').innerHTML=`<div class="welcome" id="welcome"><div class="welcome-logo">K</div><h2>Hello! I'm Kimi</h2><p>Ask me anything, or pick a tool below 👇</p></div>`;
  queueFloatingLayout();
  closeDrawer();
};

/* ============ ATTACH ============ */
$('#plusBtn').onclick=()=>openSheet('attachSheet');
$('#attachDoc').onclick=()=>{closeSheet('attachSheet');$('#fileInputDoc').click()};
$('#attachImg').onclick=()=>{closeSheet('attachSheet');$('#fileInputImg').click()};
$('#attachUrl').onclick=()=>{
  closeSheet('attachSheet');
  const url=prompt('Paste URL to analyze:');
  if(url)doAnalyzeURL(url);
};
$('#fileInputDoc').onchange=e=>{const f=e.target.files[0];if(f)doUploadDoc(f)};
$('#fileInputImg').onchange=e=>{const f=e.target.files[0];if(f)doUploadImg(f)};

async function doUploadDoc(file){
  appendBubble('user',`📄 Uploaded: ${file.name}`);
  const typing=showTyping();
  try{
    const fd=new FormData();fd.append('file',file);
    const {data,ms} = await api('/api/upload',{method:'POST',body:fd,formData:true});
    hideTyping();
    const bub=appendBubble('ai','',{ms},false);
    bub.innerHTML=`<div class="file-info"><div class="icon">📄</div><div class="meta">
      <div class="name">${escapeHtml(data.filename||file.name)}</div>
      <div class="sub">${(file.size/1024).toFixed(1)} KB · ${data.word_count||'—'} words</div></div></div>
      <strong>AI Analysis:</strong><br>${renderMD(data.analysis||data.summary||data.content||'')}`;
    state.messages.push({role:'ai',content:data.analysis||data.summary||'',meta:{ms},ts:Date.now()});save();
  }catch(e){hideTyping();appendBubble('ai','⚠️ Upload failed: '+e.message)}
}
async function doUploadImg(file){
  appendBubble('user',`🖼️ Uploaded: ${file.name}`);
  const typing=showTyping();
  try{
    const fd=new FormData();fd.append('file',file);fd.append('image',file);
    const {data,ms} = await api('/api/upload/image',{method:'POST',body:fd,formData:true});
    hideTyping();
    const bub=appendBubble('ai','',{ms},false);
    let html='<strong>🖼️ Image Analysis:</strong><br>'+renderMD(data.description||data.analysis||'');
    if(data.objects)html+='<br><strong>Objects:</strong> '+(Array.isArray(data.objects)?data.objects.join(', '):data.objects);
    if(data.text)html+='<br><strong>Text found:</strong> '+escapeHtml(data.text);
    bub.innerHTML=html;
    state.messages.push({role:'ai',content:data.description||'',meta:{ms},ts:Date.now()});save();
  }catch(e){hideTyping();appendBubble('ai','⚠️ Upload failed: '+e.message)}
}
async function doAnalyzeURL(url){
  appendBubble('user',`🔗 Analyze: ${url}`);
  const typing=showTyping();
  try{
    const {data,ms} = await api('/api/upload/url',{method:'POST',body:{url}});
    hideTyping();
    let txt = `**🔗 ${data.title||'Page'}:**\n\n${data.summary||data.content||''}`;
    if(data.key_points)txt+='\n\n**Key Points:**\n'+(Array.isArray(data.key_points)?data.key_points.map((p,i)=>`${i+1}. ${p}`).join('\n'):data.key_points);
    appendBubble('ai',txt,{ms});
  }catch(e){hideTyping();appendBubble('ai','⚠️ URL analysis failed: '+e.message)}
}

/* ============ VOICE BTN (uses TTS for now, since input voice needs mic + STT) ============ */
$('#voiceBtn').onclick=()=>{
  toast('🎤 Hold to speak (coming soon)');
};

/* ============ SETTINGS ============ */
$('#settingsBtn').onclick=()=>{
  $('#setBaseUrl').value=state.baseUrl;
  $('#setToken').value=state.token;
  $('#toggleTheme').classList.toggle('on',state.theme==='dark');
  $('#toggleStream').classList.toggle('on',state.streaming);
  $('#toggleTts').classList.toggle('on',state.ttsAuto);
  closeDrawer();openSheet('settingsSheet');
};
$('#setBaseUrl').addEventListener('change',e=>{state.baseUrl=e.target.value.trim();localStorage.setItem('kimi_base_url',state.baseUrl);toast('Backend URL updated')});
$('#setToken').addEventListener('change',e=>{state.token=e.target.value.trim();localStorage.setItem('kimi_token',state.token);toast('Token updated')});
$('#toggleTheme').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('kimi_theme',state.theme);document.documentElement.setAttribute('data-theme',state.theme);$('#toggleTheme').classList.toggle('on')};
$('#toggleStream').onclick=()=>{state.streaming=!state.streaming;localStorage.setItem('kimi_streaming',state.streaming?'on':'off');$('#toggleStream').classList.toggle('on')};
$('#toggleTts').onclick=()=>{state.ttsAuto=!state.ttsAuto;localStorage.setItem('kimi_tts_auto',state.ttsAuto?'on':'off');$('#toggleTts').classList.toggle('on')};
$('#testConnBtn').onclick=async()=>{
  $('#testConnBtn').innerText='Testing...';
  const t0=performance.now();
  try{await api('/api/status');const ms=Math.round(performance.now()-t0);$('#testConnBtn').innerText=`✅ Connected · ${ms}ms`;toast(`Connected in ${ms}ms`)}
  catch(e){$('#testConnBtn').innerText='❌ Failed';toast('Connection failed')}
  setTimeout(()=>$('#testConnBtn').innerText='🔌 Test Connection',3500);
};
$('#clearAllBtn').onclick=()=>{
  if(!confirm('Clear ALL local chat data?'))return;
  localStorage.removeItem('kimi_messages');
  localStorage.removeItem('kimi_session_id');
  state.messages=[];state.sessionId=genUUID();save();
  renderAllMessages();
  $('#chatArea').innerHTML=`<div class="welcome" id="welcome"><div class="welcome-logo">K</div><h2>Hello! I'm Kimi</h2><p>Ask me anything, or pick a tool below 👇</p></div>`;
  queueFloatingLayout();
  toast('Cleared');
};
$('#aboutBtn').onclick=()=>{toast('Kimi AI · Built by SARFRAZ')};

/* ============ INIT ============ */
document.documentElement.setAttribute('data-theme',state.theme);
registerFloatingLayoutListeners();
renderAllMessages();
loadHistoryList();
setMode('chat');
setTimeout(()=>syncFloatingLayout(true),40);
