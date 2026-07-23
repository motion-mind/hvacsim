/* ============================================================
   TAB SWITCHING
   ============================================================ */
let currentTab = 'setup';
const tabScrolls = {};

/* ============================================================
   POP-OUT SCHEMATIC WINDOW
   ============================================================ */
let popOutWindow = null;
let popOutInterval = null;

function syncSvgNodes(src, tgt){
  if(src.nodeType === 3){ if(tgt.textContent !== src.textContent) tgt.textContent = src.textContent; return; }
  if(src.nodeType !== 1 || tgt.nodeType !== 1) return;
  const sc = src.getAttribute('class'), tc = tgt.getAttribute('class');
  if(sc !== tc) tgt.setAttribute('class', sc || '');
  const ss = src.getAttribute('style'), ts = tgt.getAttribute('style');
  if(ss !== ts) tgt.setAttribute('style', ss || '');
  let si = 0, ti = 0;
  while(si < src.childNodes.length && ti < tgt.childNodes.length){
    const sn = src.childNodes[si], tn = tgt.childNodes[ti];
    if(sn.nodeType === tn.nodeType && sn.nodeName === tn.nodeName){
      syncSvgNodes(sn, tn); si++; ti++;
    } else if(sn.nodeType === 3 || sn.nodeType === 1){ tgt.insertBefore(sn.cloneNode(true), tn); si++; }
    else { si++; }
  }
  while(ti < tgt.childNodes.length) tgt.removeChild(tgt.childNodes[ti]);
  while(si < src.childNodes.length){ tgt.appendChild(src.childNodes[si].cloneNode(true)); si++; }
}

/* ============================================================
   IN-PAGE FULLSCREEN SCHEMATIC MODAL
   ============================================================ */
let schematicModalInterval = null;

function openSchematicModal(){
  const modal = document.getElementById('schemModal');
  const container = document.getElementById('modalSchemContainer');
  const srcSvg = document.getElementById('schematicSvg');
  if(!modal || !container || !srcSvg) return;

  container.innerHTML = '';
  const clone = srcSvg.cloneNode(true);
  clone.id = 'modalSchematicSvg';
  container.appendChild(clone);
  modal.classList.add('active');

  enableModalPanZoom(clone);

  if(schematicModalInterval) clearInterval(schematicModalInterval);
  schematicModalInterval = setInterval(() => {
    const src = document.getElementById('schematicSvg');
    const tgt = document.getElementById('modalSchematicSvg');
    if(!modal.classList.contains('active')){
      clearInterval(schematicModalInterval);
      schematicModalInterval = null;
      return;
    }
    if(src && tgt) syncSvgNodes(src, tgt);
  }, 250);
}

function closeSchematicModal(){
  const modal = document.getElementById('schemModal');
  if(modal) modal.classList.remove('active');
  if(schematicModalInterval){
    clearInterval(schematicModalInterval);
    schematicModalInterval = null;
  }
}

function enableModalPanZoom(svg){
  if(!svg) return;
  const origVb = svg.getAttribute('viewBox');
  if(!svg.getAttribute('data-orig-viewbox')) svg.setAttribute('data-orig-viewbox', origVb);
  let vb = origVb.split(' ').map(Number);
  let isPanning = false, startX, startY, startVb;
  let lastDist = 0;

  function setViewBox(vbArr){
    vb = vbArr;
    svg.setAttribute('viewBox', vb.join(' '));
  }

  function zoomBy(scale){
    const nw = Math.max(100, vb[2] * scale);
    const nh = Math.max(100, vb[3] * scale);
    const nx = vb[0] + (vb[2] - nw) * 0.5;
    const ny = vb[1] + (vb[3] - nh) * 0.5;
    setViewBox([nx, ny, nw, nh]);
  }

  const btnIn = document.getElementById('modalZoomIn');
  if(btnIn){ btnIn.onclick = () => zoomBy(1/1.25); }
  const btnOut = document.getElementById('modalZoomOut');
  if(btnOut){ btnOut.onclick = () => zoomBy(1.25); }
  const btnReset = document.getElementById('modalZoomReset');
  if(btnReset){ btnReset.onclick = () => { if(origVb) setViewBox(origVb.split(' ').map(Number)); }; }
  const btnClose = document.getElementById('modalClose');
  if(btnClose){ btnClose.onclick = closeSchematicModal; }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const fx = mx / rect.width, fy = my / rect.height;
    const scale = e.deltaY > 0 ? 1.12 : 1/1.12;
    const nw = Math.max(100, vb[2] * scale), nh = Math.max(100, vb[3] * scale);
    const nx = vb[0] + (vb[2] - nw) * fx, ny = vb[1] + (vb[3] - nh) * fy;
    setViewBox([nx, ny, nw, nh]);
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    if(e.button !== 0) return;
    isPanning = true; startX = e.clientX; startY = e.clientY; startVb = [...vb];
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if(!isPanning) return;
    const rect = svg.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width * vb[2];
    const dy = (e.clientY - startY) / rect.height * vb[3];
    setViewBox([startVb[0] - dx, startVb[1] - dy, vb[2], vb[3]]);
  });

  window.addEventListener('mouseup', () => { if(isPanning){ isPanning = false; svg.style.cursor = ''; } });

  svg.addEventListener('touchstart', e => {
    if(e.touches.length === 1){
      isPanning = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; startVb = [...vb];
    } else if(e.touches.length === 2){
      isPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist = Math.sqrt(dx*dx + dy*dy);
    }
  }, { passive: true });

  svg.addEventListener('touchmove', e => {
    if(e.touches.length === 1 && isPanning){
      const rect = svg.getBoundingClientRect();
      const dx = (e.touches[0].clientX - startX) / rect.width * vb[2];
      const dy = (e.touches[0].clientY - startY) / rect.height * vb[3];
      setViewBox([startVb[0] - dx, startVb[1] - dy, vb[2], vb[3]]);
    } else if(e.touches.length === 2){
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(lastDist > 0){
        const scale = lastDist / dist;
        const rect = svg.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const fx = mx / rect.width, fy = my / rect.height;
        const nw = Math.max(100, vb[2] * scale), nh = Math.max(100, vb[3] * scale);
        const nx = vb[0] + (vb[2] - nw) * fx, ny = vb[1] + (vb[3] - nh) * fy;
        setViewBox([nx, ny, nw, nh]);
      }
      lastDist = dist;
    }
  }, { passive: true });

  svg.addEventListener('touchend', () => { isPanning = false; lastDist = 0; }, { passive: true });
}

/* ============================================================
   POP-OUT SCHEMATIC WINDOW
   ============================================================ */
function openPopOut(){
  if(popOutWindow && !popOutWindow.closed){ popOutWindow.focus(); return; }
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  const w = Math.min(1400, window.innerWidth - 100);
  const h = Math.min(800, window.innerHeight - 100);
  popOutWindow = window.open('', 'schematic_popout',
    'width='+w+',height='+h+',scrollbars=no,resizable=yes');
  if(!popOutWindow){
    openSchematicModal();
    return;
  }
  const mainSvg = document.getElementById('schemContainer');
  if(mainSvg) mainSvg.style.display = 'none';

  const cssLinks = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.outerHTML).join('\n');
  const isLight = document.body.classList.contains('theme-light');
  const panZoomJs = `
function enablePanZoom(){
  var svg=document.getElementById('schematicSvg'); if(!svg) return;
  var origVb=svg.getAttribute('viewBox'); if(!svg.getAttribute('data-orig-viewbox')) svg.setAttribute('data-orig-viewbox', origVb);
  var vb=origVb.split(' ').map(Number);
  var isPanning=false,sx,sy,svb,lastDist=0;
  svg.style.cursor='grab';
  svg.addEventListener('wheel',function(e){
    e.preventDefault(); var r=svg.getBoundingClientRect();
    var fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
    var s=e.deltaY>0?1.12:1/1.12;
    var nw=Math.max(100,vb[2]*s),nh=Math.max(100,vb[3]*s);
    var nx=vb[0]+(vb[2]-nw)*fx,ny=vb[1]+(vb[3]-nh)*fy;
    vb=[nx,ny,nw,nh]; svg.setAttribute('viewBox',vb.join(' '));
  },{passive:false});
  svg.addEventListener('mousedown',function(e){
    if(e.button!==0)return; isPanning=true; sx=e.clientX; sy=e.clientY; svb=vb.slice(); svg.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',function(e){
    if(!isPanning)return; var r=svg.getBoundingClientRect();
    var dx=(e.clientX-sx)/r.width*vb[2],dy=(e.clientY-sy)/r.height*vb[3];
    vb=[svb[0]-dx,svb[1]-dy,vb[2],vb[3]]; svg.setAttribute('viewBox',vb.join(' '));
  });
  window.addEventListener('mouseup',function(){if(isPanning){isPanning=false;svg.style.cursor='grab';}});
  svg.addEventListener('dblclick',function(){
    var o=svg.getAttribute('data-orig-viewbox'); if(o){ vb=o.split(' ').map(Number); svg.setAttribute('viewBox',o); }
  });
  svg.addEventListener('touchstart', function(e){
    if(e.touches.length===1){ isPanning=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; svb=vb.slice(); }
    else if(e.touches.length===2){ isPanning=false; var dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; lastDist=Math.sqrt(dx*dx+dy*dy); }
  },{passive:true});
  svg.addEventListener('touchmove', function(e){
    if(e.touches.length===1 && isPanning){ var r=svg.getBoundingClientRect(); var dx=(e.touches[0].clientX-sx)/r.width*vb[2], dy=(e.touches[0].clientY-sy)/r.height*vb[3]; vb=[svb[0]-dx,svb[1]-dy,vb[2],vb[3]]; svg.setAttribute('viewBox',vb.join(' ')); }
    else if(e.touches.length===2){ var dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY, dist=Math.sqrt(dx*dx+dy*dy); if(lastDist>0){ var scale=lastDist/dist, r=svg.getBoundingClientRect(), fx=((e.touches[0].clientX+e.touches[1].clientX)/2-r.left)/r.width, fy=((e.touches[0].clientY+e.touches[1].clientY)/2-r.top)/r.height, nw=Math.max(100,vb[2]*scale), nh=Math.max(100,vb[3]*scale), nx=vb[0]+(vb[2]-nw)*fx, ny=vb[1]+(vb[3]-nh)*fy; vb=[nx,ny,nw,nh]; svg.setAttribute('viewBox',vb.join(' ')); } lastDist=dist; }
  },{passive:true});
  svg.addEventListener('touchend', function(){ isPanning=false; lastDist=0; },{passive:true});
}
enablePanZoom();`;
  popOutWindow.document.write('<!DOCTYPE html><html><head><title>AHU-1 Schematic</title>'+
    '<style>body{margin:0;background:#1a1c1e;overflow:hidden;height:100vh;}'+
    'body.light{background:#f4f5f7;}#schematicSvg{display:block;width:100%;height:100vh;cursor:grab;background:var(--bg);}</style>'+
    cssLinks+'</head><body'+(isLight?' class="light"':'')+'>');
  popOutWindow.document.write(svg.outerHTML);
  popOutWindow.document.write('<script>'+panZoomJs+'</script></body></html>');
  popOutWindow.document.close();

  popOutWindow.addEventListener('beforeunload', function(){
    popOutWindow = null; if(popOutInterval) clearInterval(popOutInterval);
    var ms = document.getElementById('schemContainer');
    if(ms) ms.style.display = '';
  });

  if(popOutInterval) clearInterval(popOutInterval);
  popOutInterval = setInterval(function(){
    if(!popOutWindow || popOutWindow.closed){
      clearInterval(popOutInterval); popOutInterval = null; popOutWindow = null;
      var ms = document.getElementById('schemContainer');
      if(ms) ms.style.display = '';
      return;
    }
    var src = document.getElementById('schematicSvg');
    if(!src) return;
    var isLightNow = document.body.classList.contains('theme-light');
    popOutWindow.document.body.classList.toggle('light', isLightNow);
    var tgt = popOutWindow.document.getElementById('schematicSvg');
    if(tgt) syncSvgNodes(src, tgt);
  }, 300);
}

document.getElementById('btnPopOut').addEventListener('click', openPopOut);

function alignSidebarTabs(){
  const lower = document.getElementById('sidebarLower');
  if(!lower) return;
  if(window.innerWidth <= 768){
    lower.style.marginTop = '';
    return;
  }
  const activeTabPanel = document.querySelector('.tabpanel.active');
  if(!activeTabPanel) return;
  
  let activePanel = null;
  const panels = activeTabPanel.querySelectorAll('.panel');
  for(let p of panels){
    if(p.offsetWidth > 0 && p.offsetHeight > 0 && window.getComputedStyle(p).display !== 'none'){
      activePanel = p;
      break;
    }
  }
  if(!activePanel) activePanel = activeTabPanel.querySelector('.panel') || document.querySelector('#tab-setup .panel');
  const firstTab = document.querySelector('.sidebar .tab-btn');
  if(!activePanel || !firstTab) return;
  
  lower.style.marginTop = '0px';
  const panelTop = activePanel.getBoundingClientRect().top;
  const currentTabTop = firstTab.getBoundingClientRect().top;
  const delta = panelTop - currentTabTop;
  if(delta > 0){
    lower.style.marginTop = Math.round(delta) + 'px';
  }
}

function switchTab(name){
  tabScrolls[currentTab] = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='panel'){ buildTerminals(); renderTerminalBoard(); renderMeterModes(); refreshMeter(); }
  if(name==='ahu'){ buildSchematic(); renderSetpoints(); }
  if(name==='vav'){ renderVavTab(); }
  if(name==='ef'){ renderExhaustFanTab(); }
  alignSidebarTabs();
  setTimeout(() => { window.scrollTo(0, tabScrolls[name] || 0); alignSidebarTabs(); }, 0);
}
document.querySelectorAll('.tab-btn').forEach(b=> b.addEventListener('click', ()=>switchTab(b.dataset.tab)) );
window.addEventListener('resize', alignSidebarTabs);
window.addEventListener('load', alignSidebarTabs);

/* ============================================================
   APPLY CONFIGURATION
   ============================================================ */
function applyConfiguration(){
  buildSimState();
  buildFaultCatalog();
  populateFaultPicker();
  buildSchematic();
  renderSetpoints();
  activeVavScenario = null;
  currentVavFaultDesc = [];
  const vavBriefing = document.getElementById('vavScenarioBriefing');
  if(vavBriefing) vavBriefing.style.display = 'none';
  const vavEndBtn = document.getElementById('btnEndVavScenario');
  if(vavEndBtn) vavEndBtn.style.display = 'none';
  updateTabVisibilities();
  renderVavTab();
  document.getElementById('unitSubtitle').textContent =
    (config.airSystem==='oa100'?'100% OUTSIDE AIR':'RETURN AIR SYSTEM')+' \u00b7 '+
    (config.ductType==='dual'?'DUAL DUCT':'SINGLE DUCT')+' \u00b7 '+
    (config.controlType==='cfm'?'CFM CONTROL':'STATIC PRESSURE CONTROL');
  const ahuIdSub = document.getElementById('ahuIdSub');
  if(ahuIdSub) ahuIdSub.textContent = config.airSystem==='oa100'?'100% OUTSIDE AIR':'RETURN AIR SYSTEM';
  if(typeof renderSoo === 'function') renderSoo();
  const slider = document.getElementById('oatSlider');
  slider.value = sim.oat;
  syncOatReadout();
  document.getElementById('oaRhSlider').value = sim.oaRH*100;
  syncOaRhReadout();
  document.getElementById('ageSlider').value = sim.age;
  syncAgeReadout();
  setEconomizerUI(sim.economizerEnabled);
  setDehumidUI(sim.dehumidEnabled);
  setHumidUI(sim.humidEnabled);
  const humidCard = document.getElementById('humidCard');
  if(humidCard) humidCard.style.display = config.steamHumid ? 'flex' : 'none';
  setEnabledUI(false);
  currentFaultDesc = [];
  renderActiveFaults();
}

function updateTabVisibilities(){
  const showVav = (config.vavCount > 0 || config.vavsExhaustCount > 0 || config.fcuCount > 0);
  const showEf = (config.vavsExhaustCount > 0);
  const tabVavBtn = document.getElementById('tabBtnVav');
  if(tabVavBtn) tabVavBtn.style.display = showVav ? 'inline-block' : 'none';
  const tabEfBtn = document.getElementById('tabBtnEf');
  if(tabEfBtn) tabEfBtn.style.display = showEf ? 'inline-block' : 'none';
  const activeBtn = document.querySelector('.tab-btn.active');
  if(activeBtn && activeBtn.style.display === 'none'){ switchTab('setup'); }
}

/* ============================================================
   SAVE / LOAD
   ============================================================ */
async function saveSetup(){
  const name = document.getElementById('saveName').value.trim();
  if(!name){ alert('Enter a name for this setup first.'); return; }
  const payload = { config, sp };
  try{ await storageSet('ahu-setup:'+name, JSON.stringify(payload)); document.getElementById('saveName').value=''; refreshSavedList(); }
  catch(e){ alert('Could not save setup: '+e); }
}

async function refreshSavedList(){
  const el = document.getElementById('savedList');
  el.innerHTML = '<span style="color:var(--text-faint);font-size:12px;">Loading\u2026</span>';
  try{
    const res = await storageList('ahu-setup:');
    const keys = (res && res.keys) || [];
    if(!keys.length){ el.innerHTML = '<span style="color:var(--text-faint);font-size:12px;">No saved setups yet.</span>'; return; }
    el.innerHTML = keys.map(k=>{
      const name = k.replace('ahu-setup:','');
      return '<div class="saved-item"><span>'+name+'</span><div class="actions"><button class="btn" data-load="'+k+'">Load</button><button class="btn danger" data-del="'+k+'">Delete</button></div></div>';
    }).join('');
    el.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click', ()=>loadSetup(b.dataset.load)));
    el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>deleteSetup(b.dataset.del)));
  }catch(e){ el.innerHTML = '<span style="color:var(--text-faint);font-size:12px;">No saved setups yet.</span>'; }
}

async function loadSetup(key){
  try{
    const res = await storageGet(key);
    if(!res) return;
    const payload = JSON.parse(res.value);
    config = Object.assign(config, payload.config);
    if(payload.config && payload.config.actuatorSignal !== undefined){
      config.damperSignal = payload.config.actuatorSignal;
      config.valveSignal = payload.config.actuatorSignal;
      delete config.actuatorSignal;
    }
    if(payload.config && payload.config.vavEnabled !== undefined){
      const mode = payload.config.vavEnabled;
      if(mode === 'vav' || mode === true){ config.vavCount = payload.config.vavCount || 3; config.vavsExhaustCount = 0; config.fcuCount = 0; }
      else if(mode === 'fcu'){ config.fcuCount = payload.config.vavCount || 3; config.vavCount = 0; config.vavsExhaustCount = 0; }
      else { config.vavCount = 0; config.vavsExhaustCount = 0; config.fcuCount = 0; }
      delete config.vavEnabled;
    }
    sp = Object.assign(sp, payload.sp);
    renderSetupGrid();
    applyConfiguration();
    switchTab('setup');
  }catch(e){ alert('Could not load setup.'); }
}

async function deleteSetup(key){
  try{ await storageDelete(key); refreshSavedList(); }catch(e){}
}

/* ============================================================
   EVENT HANDLERS
   ============================================================ */
document.getElementById('btnApply').addEventListener('click', ()=>{ applyConfiguration(); switchTab('ahu'); });
document.getElementById('btnRandomizeCfg').addEventListener('click', ()=>{
  config.controlType = pick(['cfm','static']);
  config.airSystem = pick(['return','oa100']);
  config.ductType = pick(['single','dual']);
  config.dualDuctIndependent = config.ductType==='dual'? Math.random()<0.4 : false;
  config.preheat = Math.random()<0.7;
  config.coolingCoils = config.ductType==='dual'? 'single' : pick(['single','dual']);
  config.reheat = config.ductType==='dual'? false : Math.random()<0.6;
  config.steamHumid = config.ductType==='dual'? false : Math.random()<0.35;
  config.supplyFanCount = Math.random() < 0.5 ? 1 : Math.floor(rnd(3,7));
  config.supplyFan = config.supplyFanCount > 1 ? 'wall' : 'single';
  config.returnFanCount = config.airSystem==='oa100'? 1 : (Math.random() < 0.5 ? 1 : Math.floor(rnd(3,7)));
  config.returnFan = config.returnFanCount > 1 ? 'wall' : 'single';
  config.driveType = pick(['vfd','starter']);
  config.driveSignal = pick(['pct','vdc','ma','hz']);
  config.preheatBoosterPump = config.preheat? Math.random()<0.4 : false;
  config.preheatAquastat = config.preheat? Math.random()<0.4 : false;
  config.includeOa = true;
  config.includeEa = true;
  config.damperSignal = pick(['pct','vdc','ma','psi38','psi315']);
  config.valveSignal = pick(['pct','vdc','ma','psi38','psi315']);
  config.vavCount = Math.random() < 0.5 ? 0 : Math.floor(rnd(1, 5));
  config.vavsExhaustCount = Math.random() < 0.5 ? 0 : Math.floor(rnd(1, 4));
  config.fcuCount = Math.random() < 0.5 ? 0 : Math.floor(rnd(1, 4));
  if(config.vavCount===0 && config.vavsExhaustCount===0 && config.fcuCount===0) config.vavCount = 3;
  renderSetupGrid();
});
document.getElementById('btnSaveSetup').addEventListener('click', saveSetup);
document.getElementById('btnRefreshSaved').addEventListener('click', refreshSavedList);

document.getElementById('btnExportSetup').addEventListener('click', ()=>{
  const name = document.getElementById('saveName').value.trim() || 'ahu-setup';
  const payload = { config: JSON.parse(JSON.stringify(config)), name };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name+'.json'; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('btnImportSetup').addEventListener('click', ()=>{ document.getElementById('importSetupFile').click(); });
document.getElementById('importSetupFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (evt)=>{
    try {
      const data = JSON.parse(evt.target.result);
      if(data.config){ Object.assign(config, data.config); renderSetupGrid(); }
      else { alert('Invalid setup file.'); }
    } catch(err){ alert('Could not read setup file: '+err); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('oatSlider').addEventListener('input', (e)=>{ sim.oatTarget = parseFloat(e.target.value); syncOatReadout(); updateSchematicReadouts(); });
document.getElementById('oaRhSlider').addEventListener('input', (e)=>{ sim.oaRHTarget = parseFloat(e.target.value)/100; syncOaRhReadout(); updateSchematicReadouts(); });
document.getElementById('ageSlider').addEventListener('input', (e)=>{ sim.age = parseFloat(e.target.value); sim.ageTarget = sim.age; syncAgeReadout(); updateSchematicReadouts(); });

document.getElementById('sooHeader').addEventListener('click', ()=>{
  const content = document.getElementById('sooContent');
  const arrow = document.getElementById('sooToggleArrow');
  if(content.style.display==='none'){ content.style.display='block'; arrow.style.transform='rotate(180deg)'; if(typeof renderSoo === 'function') renderSoo(); }
  else { content.style.display='none'; arrow.style.transform='rotate(0deg)'; }
});

document.getElementById('themeToggleBtn').addEventListener('click', ()=>{
  document.body.classList.toggle('theme-light');
  const light = document.body.classList.contains('theme-light');
  document.getElementById('themeToggleBtn').textContent = light? 'DARK MODE' : 'LIGHT MODE';
  syncBasTheme();
  buildSchematic();
  renderVavBoxGrid();
});

let simSpeed = 1;
let tickHandle = setInterval(tick, 1000);
document.getElementById('speedGroup').querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    simSpeed = parseFloat(btn.dataset.speed);
    document.getElementById('speedGroup').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b===btn));
    clearInterval(tickHandle);
    tickHandle = setInterval(tick, 1000/simSpeed);
  });
});
const topEnableBtn = document.getElementById('topEnableBtn');
if(topEnableBtn){
  topEnableBtn.addEventListener('click', ()=>{
    const tripped = latched.freezestat||latched.highStatic||latched.aquastat||latched.hotFreezestat||manualSafety.fireAlarm||manualSafety.smokeDamperFail||manualSafety.doorOpen;
    if(tripped){
      latched.freezestat=false; latched.highStatic=false; latched.aquastat=false; latched.hotFreezestat=false;
      freezestatRecovering=true;
      manualSafety.fireAlarm=false; manualSafety.smokeDamperFail=false; manualSafety.doorOpen=false;
    }
    setEnabledUI(!sim.enabled);
  });
}
const sideEconBtn = document.getElementById('sideEconBtn');
if(sideEconBtn){
  sideEconBtn.addEventListener('click', ()=>{
    const avail = config.includeOa && config.airSystem === 'return';
    if(avail) setEconomizerUI(!sim.economizerEnabled);
  });
}
const sideDehumidBtn = document.getElementById('sideDehumidBtn');
if(sideDehumidBtn){
  sideDehumidBtn.addEventListener('click', ()=>{
    const avail = config.coolingCoils !== 'none';
    if(avail) setDehumidUI(!sim.dehumidEnabled);
  });
}
const sideHumidBtn = document.getElementById('sideHumidBtn');
if(sideHumidBtn){
  sideHumidBtn.addEventListener('click', ()=>{
    const avail = !!config.steamHumid;
    if(avail) setHumidUI(!sim.humidEnabled);
  });
}
const btnResetSafeties = document.getElementById('btnResetSafeties');
if(btnResetSafeties){
  btnResetSafeties.addEventListener('click', ()=>{
    latched.freezestat=false; latched.highStatic=false; latched.aquastat=false; latched.hotFreezestat=false;
    freezestatRecovering=true;
    manualSafety.fireAlarm=false; manualSafety.smokeDamperFail=false; manualSafety.doorOpen=false;
  });
}

document.getElementById('btnStartScenario').addEventListener('click', ()=>{ const id = document.getElementById('scenarioSelect').value; if(!id){ alert('Choose a scenario from the list first.'); return; } applyScenario(id); });
document.getElementById('btnEndScenario').addEventListener('click', endScenario);
document.getElementById('btnRevealSolution').addEventListener('click', ()=>{
  if(!activeScenario) return;
  const box = document.getElementById('scenarioSolutionText');
  const showing = box.style.display==='block';
  box.style.display = showing? 'none':'block';
  box.textContent = activeScenario.solution;
  document.getElementById('btnRevealSolution').textContent = showing? 'Reveal Solution':'Hide Solution';
});

document.getElementById('btnStartVavScenario').addEventListener('click', ()=>{ const id = document.getElementById('vavScenarioSelect').value; if(!id){ alert('Choose a scenario from the list first.'); return; } applyVavScenario(id); });
document.getElementById('btnEndVavScenario').addEventListener('click', endVavScenario);
document.getElementById('btnRevealVavSolution').addEventListener('click', ()=>{
  if(!activeVavScenario) return;
  const box = document.getElementById('vavScenarioSolutionText');
  const showing = box.style.display==='block';
  box.style.display = showing? 'none':'block';
  box.textContent = activeVavScenario.solution;
  document.getElementById('btnRevealVavSolution').textContent = showing? 'Reveal Solution':'Hide Solution';
});
document.getElementById('vavFaultBox').addEventListener('change', populateVavFaultPicker);
document.getElementById('btnApplyVavFault').addEventListener('click', ()=>{ const boxNum = parseInt(document.getElementById('vavFaultBox').value); const typeId = document.getElementById('vavFaultPicker').value; if(!typeId) return; applyVavFaultById(typeId, boxNum); });
document.getElementById('btnResetVavFaults').addEventListener('click', ()=>{ activeVavScenario = null; clearVavFaults(); document.getElementById('vavScenarioBriefing').style.display = 'none'; document.getElementById('vavScenarioSelect').value = ''; document.getElementById('btnEndVavScenario').style.display = 'none'; });



document.getElementById('btnApplyFault').addEventListener('click', ()=>{ const id = document.getElementById('faultPicker').value; if(id) applyFaultById(id); });
document.getElementById('btnRandomFault').addEventListener('click', ()=>{ const options = applicableFaults(); const f = pick(options); applyFaultById(f.id); });
document.getElementById('btnClearManualFaultsOnly').addEventListener('click', clearManualFaultsOnly);
document.getElementById('btnClearFaults').addEventListener('click', clearAllFaults);

document.getElementById('btnToggleFreezestat').addEventListener('click', ()=>{
  latched.freezestat = !latched.freezestat;
  if(latched.freezestat){ applyFaultById('freezestatNuisance'); }
  else { currentFaultDesc = currentFaultDesc.filter(f => f.label !== faultsCatalog.find(x=>x.id==='freezestatNuisance').label); renderActiveFaults(); }
  document.getElementById('btnToggleFreezestat').classList.toggle('danger', latched.freezestat);
});
document.getElementById('btnToggleStaticDrift').addEventListener('click', ()=>{
  activeFaults.staticPressureSensorDrift = !activeFaults.staticPressureSensorDrift;
  if(activeFaults.staticPressureSensorDrift){ applyFaultById('staticPressureSensorDrift'); }
  else { currentFaultDesc = currentFaultDesc.filter(f => f.label !== faultsCatalog.find(x=>x.id==='staticPressureSensorDrift').label); renderActiveFaults(); }
  document.getElementById('btnToggleStaticDrift').classList.toggle('danger', activeFaults.staticPressureSensorDrift);
});
document.getElementById('btnClearProbes').addEventListener('click', ()=>{ probeRed=null; probeBlack=null; renderTerminalBoard(); refreshMeter(); });
document.getElementById('btnReplaceMeter').addEventListener('click', ()=>{ meterDamaged=false; probeRed=null; probeBlack=null; renderTerminalBoard(); refreshMeter(); });
document.getElementById('btnClearVavProbes').addEventListener('click', ()=>{ vavProbeRed=null; vavProbeBlack=null; renderVavTerminalBoard(); refreshVavMeter(); });
document.getElementById('btnReplaceVavMeter').addEventListener('click', ()=>{ vavMeterDamaged=false; vavProbeRed=null; vavProbeBlack=null; renderVavTerminalBoard(); refreshVavMeter(); });
document.getElementById('vavTermBoxSelect').addEventListener('change', (e)=>{ vavProbeRed=null; vavProbeBlack=null; buildVavTerminals(parseInt(e.target.value)); renderVavTerminalBoard(); refreshVavMeter(); });

/* Exhaust fan event listeners */
const efLeadSel = document.getElementById('efLeadSelect');
if(efLeadSel){ efLeadSel.addEventListener('change', (e)=>{ if(sim.ef){ const nextLead = e.target.value; if(sim.ef.activeFan !== nextLead){ sim.ef.activeFan = nextLead; sim.ef.switching = true; sim.ef.faultTimer = 0; } } }); }
const b1 = document.getElementById('btnToggleFltMotorA');
if(b1){ b1.addEventListener('click', ()=>{ activeFaults.efAFail = !activeFaults.efAFail; if(sim.ef) sim.ef.fanA.fail = activeFaults.efAFail; renderExhaustFanTab(); }); }
const b2 = document.getElementById('btnToggleFltMotorB');
if(b2){ b2.addEventListener('click', ()=>{ activeFaults.efBFail = !activeFaults.efBFail; if(sim.ef) sim.ef.fanB.fail = activeFaults.efBFail; renderExhaustFanTab(); }); }
const b3 = document.getElementById('btnToggleFltDprA');
if(b3){ b3.addEventListener('click', ()=>{ activeFaults.efDprAFail = !activeFaults.efDprAFail; renderExhaustFanTab(); }); }
const b4 = document.getElementById('btnToggleFltDprB');
if(b4){ b4.addEventListener('click', ()=>{ activeFaults.efDprBFail = !activeFaults.efDprBFail; renderExhaustFanTab(); }); }
const b5 = document.getElementById('btnResetEfFaults');
if(b5){ b5.addEventListener('click', ()=>{ activeFaults.efAFail = false; activeFaults.efBFail = false; activeFaults.efDprAFail = false; activeFaults.efDprBFail = false; if(sim.ef){ sim.ef.fanA.fail = false; sim.ef.fanB.fail = false; } renderExhaustFanTab(); }); }

/* ============================================================
   INIT
   ============================================================ */
renderSetupGrid();
applyConfiguration();
refreshSavedList();
refreshLayoutTemplateList();
populateScenarioPicker();
alignSidebarTabs();
requestAnimationFrame(loopThrottle);
