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

function openPopOut(){
  if(popOutWindow && !popOutWindow.closed){ popOutWindow.focus(); return; }
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  const mainSvg = document.getElementById('schemContainer');
  if(mainSvg) mainSvg.style.display = 'none';
  const w = Math.min(1400, window.innerWidth - 100);
  const h = Math.min(800, window.innerHeight - 100);
  popOutWindow = window.open('', 'schematic_popout',
    'width='+w+',height='+h+',scrollbars=no,resizable=yes');
  if(!popOutWindow){ if(mainSvg) mainSvg.style.display = ''; return; }

  const cssLinks = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.outerHTML).join('\n');
  const isLight = document.body.classList.contains('theme-light');
  const panZoomJs = `
function enablePanZoom(){
  var svg=document.getElementById('schematicSvg'); if(!svg) return;
  var vb=svg.getAttribute('viewBox').split(' ').map(Number);
  var isPanning=false,sx,sy,svb,ld=0;
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
}
enablePanZoom();`;
  popOutWindow.document.write('<!DOCTYPE html><html><head><title>AHU-1 Schematic</title>'+
    '<style>body{margin:0;background:#1a1c1e;overflow:hidden;height:100vh;}'+
    'body.light{background:#f4f5f7;}#schematicSvg{display:block;width:100%;height:100vh;cursor:grab;}</style>'+
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
  setTimeout(() => { window.scrollTo(0, tabScrolls[name] || 0); }, 0);
}
document.querySelectorAll('.tab-btn').forEach(b=> b.addEventListener('click', ()=>switchTab(b.dataset.tab)) );

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

document.getElementById('oatSlider').addEventListener('input', (e)=>{ sim.oatTarget = parseFloat(e.target.value); syncOatReadout(); updateSchematicReadouts(); });
document.getElementById('oaRhSlider').addEventListener('input', (e)=>{ sim.oaRHTarget = parseFloat(e.target.value)/100; syncOaRhReadout(); updateSchematicReadouts(); });
document.getElementById('ageSlider').addEventListener('input', (e)=>{ sim.ageTarget = parseFloat(e.target.value); syncAgeReadout(); updateSchematicReadouts(); });

document.getElementById('sooHeader').addEventListener('click', ()=>{
  const content = document.getElementById('sooContent');
  const arrow = document.getElementById('sooToggleArrow');
  if(content.style.display==='none'){ content.style.display='block'; arrow.style.transform='rotate(180deg)'; if(typeof renderSoo === 'function') renderSoo(); }
  else { content.style.display='none'; arrow.style.transform='rotate(0deg)'; }
});

document.getElementById('themeToggleBtn').addEventListener('click', ()=>{
  document.body.classList.toggle('theme-light');
  const light = document.body.classList.contains('theme-light');
  document.getElementById('themeToggleBtn').innerHTML = light? '\u263d' : '\u2600';
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
document.getElementById('enableToggle').addEventListener('click', ()=>{ setEnabledUI(!sim.enabled); });
document.getElementById('econToggle').addEventListener('click', ()=>{ setEconomizerUI(!sim.economizerEnabled); });
document.getElementById('dehumidToggle').addEventListener('click', ()=>{ setDehumidUI(!sim.dehumidEnabled); });
document.getElementById('humidToggle').addEventListener('click', ()=>{ setHumidUI(!sim.humidEnabled); });
document.getElementById('btnResetSafeties').addEventListener('click', ()=>{
  latched.freezestat=false; latched.highStatic=false; latched.aquastat=false; latched.hotFreezestat=false;
  freezestatRecovering=true;
  manualSafety.fireAlarm=false; manualSafety.smokeDamperFail=false; manualSafety.doorOpen=false;
});

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

document.getElementById('editLayoutToggle').addEventListener('click', ()=>{
  layoutEditMode = !layoutEditMode;
  document.getElementById('editLayoutToggle').classList.toggle('on', layoutEditMode);
  document.getElementById('layoutEditControls').style.display = layoutEditMode? 'flex':'none';
  document.getElementById('addElementRow').style.display = layoutEditMode? 'flex':'none';
  document.getElementById('layoutEditHint').style.display = layoutEditMode? 'block':'none';
  renderCustomElements();
  attachLayoutDragging();
});
document.getElementById('btnAddElement').addEventListener('click', ()=>{ addCustomElement(document.getElementById('addElementType').value); });
document.getElementById('btnRefreshLayoutTemplates').addEventListener('click', refreshLayoutTemplateList);
document.getElementById('btnSaveLayoutTemplate').addEventListener('click', ()=>{ saveLayoutTemplate(); });
document.getElementById('layoutTemplateSelect').addEventListener('change', (e)=>loadLayoutTemplate(e.target.value));
document.getElementById('btnDeleteLayoutTemplate').addEventListener('click', ()=>{ const key = document.getElementById('layoutTemplateSelect').value; if(!key){ alert('Select a template to delete first.'); return; } deleteLayoutTemplate(key); });
document.getElementById('btnResetLayout').addEventListener('click', ()=>{ layoutOverrides = {...factoryLayoutAdjustments}; customElements = []; document.getElementById('layoutTemplateSelect').value = ''; buildSchematic(); });
document.getElementById('btnExportLayout').addEventListener('click', ()=>{ if(Object.keys(layoutOverrides).length===0 && customElements.length===0){ alert('Nothing has been moved or added yet.'); return; } exportLayout(); });
document.getElementById('btnCopyExportLayout').addEventListener('click', copyLayoutExport);
document.getElementById('btnDownloadExportLayout').addEventListener('click', downloadLayoutExport);
document.getElementById('btnImportLayout').addEventListener('click', ()=>{ document.getElementById('importLayoutFile').click(); });
document.getElementById('importLayoutFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (evt)=>{ const ok = importLayoutFromJSON(evt.target.result); if(ok){ alert('Layout imported.'); } else{ alert('Could not read that file.'); } };
  reader.readAsText(file);
  e.target.value = '';
});

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
requestAnimationFrame(loopThrottle);
