/* ============================================================
   VAV TAB — rendering, fault management, scenario management
   ============================================================ */
let vavTerminalBoxNum = 1;

function populateVavFaultPicker(){
  const boxSel = document.getElementById('vavFaultBox');
  const typeSel = document.getElementById('vavFaultPicker');
  if(!boxSel || !typeSel) return;
  if(boxSel.innerHTML === '' && sim.vav){
    sim.vav.forEach((box, i)=>{ boxSel.innerHTML += '<option value="'+(i+1)+'">'+box.id+'</option>'; });
  }
  const boxNum = parseInt(boxSel.value) || 1;
  const box = sim.vav && sim.vav[boxNum-1];
  if(!box) return;
  const types = vavFaultTypesFor(box);
  typeSel.innerHTML = types.map(t=>'<option value="'+t.id+'">'+t.label+'</option>').join('');
}

function applyVavFaultById(typeId, boxNum){
  const box = sim.vav[boxNum-1];
  const t = vavFaultTypesFor(box).find(x=>x.id===typeId);
  if(!t) return;
  t.apply(boxNum);
  currentVavFaultDesc.push({label:(box ? box.id : 'VAV-'+boxNum)+': '+t.label, desc:t.desc});
  renderVavActiveFaults();
}

function clearVavFaults(){
  Object.keys(activeFaults).forEach(k=>{ if(k.indexOf('vav')===0) delete activeFaults[k]; });
  currentVavFaultDesc = [];
  renderVavActiveFaults();
}

function renderVavActiveFaults(){
  const list = document.getElementById('vavActiveFaultList');
  if(!list) return;
  if(activeVavScenario){
    list.innerHTML = '<span>Scenario in progress — diagnose the zone using its readings (see the VAV Troubleshooting Scenario panel above).</span>';
    return;
  }
  if(currentVavFaultDesc.length===0){ list.innerHTML = '<span>No active VAV faults.</span>'; return; }
  list.innerHTML = currentVavFaultDesc.map(f=>'<div style="margin-bottom:6px;"><b>'+f.label+'</b><br>'+f.desc+'</div>').join('');
}

function populateVavScenarioPicker(){
  const sel = document.getElementById('vavScenarioSelect');
  if(!sel) return;
  sel.innerHTML = '<option value="">\u2014 Choose a Scenario \u2014</option>' + vavScenarioCatalog.map(s=>'<option value="'+s.id+'">'+s.title+'</option>').join('');
}

function applyVavScenario(id){
  const sc = vavScenarioCatalog.find(s=>s.id===id);
  if(!sc || !sim.vav || !sim.vav.length) return;
  let boxNum = 1;
  if(sc.targetType){
    const idx = sim.vav.findIndex(b=>{
      if(sc.targetType==='vav-exhaust') return b.type==='vav-exhaust' || b.type==='or' || b.type==='pr';
      return b.type===sc.targetType;
    });
    if(idx===-1){
      alert("This scenario requires a box of type: "+(sc.targetType==='fcu'?'Fan Coil Unit':'Exhaust VAV')+". Please enable it on the Setup tab first!");
      document.getElementById('vavScenarioSelect').value = '';
      return;
    }
    boxNum = idx+1;
  }
  clearVavFaults();
  activeVavScenario = sc;
  const box = sim.vav[boxNum-1];
  const typeId = sc.faultId(box);
  const t = vavFaultTypesFor(box).find(x=>x.id===typeId);
  if(t) t.apply(boxNum);
  if(!sim.enabled) setEnabledUI(true);
  document.getElementById('vavScenarioBriefingTitle').textContent = sc.title + ' ('+box.id+')';
  document.getElementById('vavScenarioBriefingText').textContent = sc.narrative;
  document.getElementById('vavScenarioBriefing').style.display = 'block';
  document.getElementById('vavScenarioSolutionText').style.display = 'none';
  document.getElementById('vavScenarioSolutionText').textContent = '';
  document.getElementById('btnRevealVavSolution').textContent = 'Reveal Solution';
  document.getElementById('btnEndVavScenario').style.display = 'inline-block';
  renderVavActiveFaults();
}

function endVavScenario(){
  activeVavScenario = null;
  clearVavFaults();
  document.getElementById('vavScenarioBriefing').style.display = 'none';
  document.getElementById('vavScenarioSelect').value = '';
  document.getElementById('btnEndVavScenario').style.display = 'none';
}

function renderVavTab(){
  const disabledNote = document.getElementById('vavDisabledNote');
  const content = document.getElementById('vavContent');
  if(!sim.vav || !sim.vav.length){
    disabledNote.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  disabledNote.style.display = 'none';
  content.style.display = 'block';
  populateVavFaultPicker();
  populateVavScenarioPicker();
  renderVavActiveFaults();
  renderVavBoxGrid();
  populateVavTermBoxSelect();
  renderVavMeterModes();
  buildVavTerminals(vavTerminalBoxNum<=sim.vav.length? vavTerminalBoxNum : 1);
  renderVavTerminalBoard();
  refreshVavMeter();
}

function populateVavTermBoxSelect(){
  const sel = document.getElementById('vavTermBoxSelect');
  if(!sel) return;
  let opts = '';
  if(sim.vav){ sim.vav.forEach((box, i)=>{ opts += '<option value="'+(i+1)+'">'+box.id+'</option>'; }); }
  sel.innerHTML = opts;
}

function vavBoxDiagramSvg(box, n, isDual){
  if(box.type === 'fcu'){
    return '<svg viewBox="0 0 220 70" width="100%" style="display:block;margin-bottom:8px;">'+
      '<defs><style>'+collectGfxCss(['fan','coolingCoil','heatingCoil'])+'</style></defs>'+
      '<text x="6" y="11" font-family="Arial" font-size="8" fill="'+BAS.textDim+'">FAN COIL UNIT</text>'+
      '<rect x="6" y="15" width="120" height="40" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-dasharray="3 3" stroke-width="1.3"/>'+
      '<g id="fcuFanIcon'+n+'" transform="translate(28,35) scale(0.65)"></g>'+
      '<g id="fcuCoolCoilIcon'+n+'" transform="translate(68,35) scale(0.65)"></g>'+
      '<g id="fcuHeatCoilIcon'+n+'" transform="translate(102,35) scale(0.65)"></g>'+
      '<line x1="126" y1="35" x2="150" y2="35" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<rect x="150" y="10" width="64" height="50" rx="4" fill="none" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<circle cx="168" cy="35" r="7" fill="none" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<line x1="168" y1="35" x2="168" y2="28" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<text x="180" y="38" font-family="Arial" font-size="9" font-weight="700" fill="'+BAS.text+'">Zone '+n+'</text></svg>';
  }
  if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
    if(isDual){
      return '<svg viewBox="0 0 220 110" width="100%"><defs><style>'+collectGfxCss(['damper'])+'</style></defs>'+
        '<text x="6" y="9" font-family="Arial" font-size="7" fill="'+BAS.textDim+'">COLD DECK</text>'+
        '<rect x="6" y="12" width="70" height="18" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<g id="vavColdDmpIcon'+n+'" transform="translate(40,21) scale(0.65)"></g>'+
        '<text x="6" y="37" font-family="Arial" font-size="7" fill="'+BAS.textDim+'">HOT DECK</text>'+
        '<rect x="6" y="40" width="70" height="18" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<g id="vavHotDmpIcon'+n+'" transform="translate(40,49) scale(0.65)"></g>'+
        '<line x1="76" y1="21" x2="100" y2="35" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<line x1="76" y1="49" x2="100" y2="35" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<rect x="100" y="26" width="40" height="18" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<g id="vavDmpIcon'+n+'" transform="translate(120,35) scale(0.65)"></g>'+
        '<text x="6" y="75" font-family="Arial" font-size="7" fill="'+BAS.textDim+'">EXHAUST</text>'+
        '<rect x="6" y="78" width="134" height="18" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
        '<g id="vavExhDmpIcon'+n+'" transform="translate(70,87) scale(0.65)"></g>'+
        '<rect x="140" y="10" width="74" height="90" rx="4" fill="none" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
        '<circle cx="177" cy="55" r="7" fill="none" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
        '<line x1="177" y1="55" x2="177" y2="48" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
        '<text x="160" y="72" font-family="Arial" font-size="8" font-weight="700" fill="'+BAS.text+'">Zone '+n+'</text></svg>';
    }
    return '<svg viewBox="0 0 220 90" width="100%"><defs><style>'+collectGfxCss(['damper'])+'</style></defs>'+
      '<text x="6" y="11" font-family="Arial" font-size="8" fill="'+BAS.textDim+'">SUPPLY VAV</text>'+
      '<rect x="6" y="14" width="140" height="22" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
      '<g id="vavDmpIcon'+n+'" transform="translate(42,25) scale(0.8)"></g>'+
      '<g id="vavReheatIcon'+n+'" transform="translate(104,25) scale(0.8)"></g>'+
      '<line x1="146" y1="25" x2="150" y2="25" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<text x="6" y="51" font-family="Arial" font-size="8" fill="'+BAS.textDim+'">EXHAUST VAV</text>'+
      '<rect x="6" y="54" width="140" height="22" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
      '<g id="vavExhDmpIcon'+n+'" transform="translate(42,65) scale(0.8)"></g>'+
      '<line x1="146" y1="65" x2="150" y2="65" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<rect x="150" y="15" width="64" height="60" rx="4" fill="none" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<circle cx="168" cy="45" r="7" fill="none" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<line x1="168" y1="45" x2="168" y2="38" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<text x="180" y="48" font-family="Arial" font-size="9" font-weight="700" fill="'+BAS.text+'">Zone '+n+'</text></svg>';
  }
  if(isDual){
    return '<svg viewBox="0 0 220 90" width="100%"><defs><style>'+collectGfxCss(['damper'])+'</style></defs>'+
      '<text x="6" y="11" font-family="Arial" font-size="8" fill="'+BAS.textDim+'">COLD DECK</text>'+
      '<rect x="6" y="14" width="90" height="22" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
      '<g id="vavColdDmpIcon'+n+'" transform="translate(50,25) scale(0.8)"></g>'+
      '<text x="6" y="51" font-family="Arial" font-size="8" fill="'+BAS.textDim+'">HOT DECK</text>'+
      '<rect x="6" y="54" width="90" height="22" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
      '<g id="vavHotDmpIcon'+n+'" transform="translate(50,65) scale(0.8)"></g>'+
      '<line x1="96" y1="25" x2="150" y2="45" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<line x1="96" y1="65" x2="150" y2="45" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<rect x="150" y="20" width="64" height="50" rx="4" fill="none" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
      '<circle cx="168" cy="45" r="7" fill="none" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<line x1="168" y1="45" x2="168" y2="38" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
      '<text x="180" y="48" font-family="Arial" font-size="9" font-weight="700" fill="'+BAS.text+'">Zone '+n+'</text></svg>';
  }
  return '<svg viewBox="0 0 220 70" width="100%"><defs><style>'+collectGfxCss(['damper','heatingCoil'])+'</style></defs>'+
    '<rect x="6" y="18" width="140" height="24" fill="'+BAS.duct+'" stroke="'+BAS.line+'" stroke-width="1.3"/>'+
    '<g id="vavDmpIcon'+n+'" transform="translate(42,30) scale(0.85)"></g>'+
    '<g id="vavReheatIcon'+n+'" transform="translate(104,30) scale(0.85)"></g>'+
    '<line x1="146" y1="30" x2="150" y2="30" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
    '<rect x="150" y="5" width="64" height="50" rx="4" fill="none" stroke="'+BAS.line+'" stroke-width="1.5"/>'+
    '<circle cx="168" cy="30" r="7" fill="none" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
    '<line x1="168" y1="30" x2="168" y2="23" stroke="'+BAS.textDim+'" stroke-width="1.3"/>'+
    '<text x="180" y="33" font-family="Arial" font-size="9" font-weight="700" fill="'+BAS.text+'">Zone '+n+'</text></svg>';
}

function renderVavBoxGrid(){
  const el = document.getElementById('vavBoxGrid');
  if(!el || !sim.vav) return;
  const isDual = config.ductType==='dual';
  el.innerHTML = sim.vav.map((box,i)=>{
    const n = i+1;
    let rows = '';
    rows += '<div class="vrow"><span>Zone Temp</span><span class="vval" id="vavZoneTemp'+n+'"></span></div>';
    rows += '<div class="vrow"><span>Setpoint</span><span class="vval"><input type="number" step="0.5" value="'+box.zoneSP+'" data-vavbox="'+n+'"></span></div>';
    if(box.type === 'or' || box.type === 'pr'){ rows += '<div class="vrow"><span>Zone Humidity</span><span class="vval" id="vavZoneHumid'+n+'"></span></div>'; rows += '<div class="vrow"><span>Effective SP</span><span class="vval" id="vavEffSP'+n+'"></span></div>'; }
    if(box.type === 'fcu'){
      rows += '<div class="vrow"><span>Local Fan</span><span class="vval" id="fcuFanSpeed'+n+'"></span></div>';
      rows += '<div class="vrow"><span>Cooling Valve</span><span class="vval" id="fcuCool'+n+'"></span></div>';
      rows += '<div class="vrow"><span>Heating Valve</span><span class="vval" id="fcuHeat'+n+'"></span></div>';
    } else {
      rows += '<div class="vrow"><span>Supply Airflow</span><span class="vval" id="vavAirflow'+n+'"></span></div>';
      if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
        if(box.type === 'or'){ rows += '<div class="vrow"><span>Pressure Mode</span><span class="vval"><select data-vavpress="'+n+'" disabled><option value="positive" selected>Positive (Locked)</option></select></span></div>'; }
        else { rows += '<div class="vrow"><span>Pressure Mode</span><span class="vval"><select data-vavpress="'+n+'"><option value="positive" '+(box.pressurize==='positive'?'selected':'')+'>Positive</option><option value="negative" '+(box.pressurize==='negative'?'selected':'')+'>Negative</option></select></span></div>'; }
        rows += '<div class="vrow"><span>Exhaust Airflow</span><span class="vval" id="vavExhAirflow'+n+'"></span></div>';
        rows += '<div class="vrow"><span>Exhaust Damper</span><span class="vval" id="vavExhDmp'+n+'"></span></div>';
      }
      if(isDual){
        rows += '<div class="vrow"><span>Cold Damper</span><span class="vval" id="vavColdDmp'+n+'"></span></div>';
        rows += '<div class="vrow"><span>Hot Damper</span><span class="vval" id="vavHotDmp'+n+'"></span></div>';
        if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){ rows += '<div class="vrow"><span>Supply Damper</span><span class="vval" id="vavDmp'+n+'"></span></div>'; }
      } else {
        rows += '<div class="vrow"><span>Primary Damper</span><span class="vval" id="vavDmp'+n+'"></span></div>';
        if(config.vavReheatType==='electric'){ rows += '<div class="vrow"><span>Electric Reheat</span><span class="vval" id="vavReheat'+n+'"></span></div>'; }
        else { rows += '<div class="vrow"><span>Reheat Valve</span><span class="vval" id="vavReheat'+n+'"></span></div>'; }
      }
    }
    return '<div class="vav-box" id="vavBoxCard'+n+'"><h3>'+box.id+'</h3>'+vavBoxDiagramSvg(box,n,isDual)+rows+'</div>';
  }).join('');
  el.querySelectorAll('input[data-vavbox]').forEach(inp=>{ inp.addEventListener('change', (e)=>{ const idx = parseInt(e.target.dataset.vavbox)-1; if(sim.vav[idx]) sim.vav[idx].zoneSP = clamp(parseFloat(e.target.value)||72, 55, 90); }); });
  el.querySelectorAll('select[data-vavpress]').forEach(sel=>{ sel.addEventListener('change', (e)=>{ const idx = parseInt(e.target.dataset.vavpress)-1; if(sim.vav[idx]) sim.vav[idx].pressurize = e.target.value; }); });
  updateVavBoxGridValues();
}

function updateVavBoxGridValues(){
  if(!sim.vav) return;
  const isDual = config.ductType==='dual';
  sim.vav.forEach((box,i)=>{
    const n = i+1;
    const card = document.getElementById('vavBoxCard'+n);
    if(!card) return;
    const vavPowerLost = isVavDisconnected(n, 1) || isVavDisconnected(n, 2) || activeFaults['vavPowerLost'+n];
    card.classList.toggle('alarm', !vavPowerLost && Math.abs(box.zoneTemp-box.zoneSP)>4);
    const setTxt = (id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent = txt; };

    if(vavPowerLost){
      setTxt('vavZoneTemp'+n, 'COMM FAIL');
      if(box.type === 'or' || box.type === 'pr'){ setTxt('vavZoneHumid'+n, 'COMM FAIL'); setTxt('vavEffSP'+n, 'COMM FAIL'); }
      if(box.type === 'fcu'){ setTxt('fcuFanSpeed'+n, 'COMM FAIL'); setTxt('fcuCool'+n, 'COMM FAIL'); setTxt('fcuHeat'+n, 'COMM FAIL'); }
      else {
        setTxt('vavAirflow'+n, 'COMM FAIL');
        if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){ setTxt('vavExhAirflow'+n, 'COMM FAIL'); setTxt('vavExhDmp'+n, 'COMM FAIL'); }
        if(isDual){ setTxt('vavColdDmp'+n, 'COMM FAIL'); setTxt('vavHotDmp'+n, 'COMM FAIL'); if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr') setTxt('vavDmp'+n, 'COMM FAIL'); }
        else { setTxt('vavDmp'+n, 'COMM FAIL'); setTxt('vavReheat'+n, 'COMM FAIL'); }
      }
      ['fcuFanIcon','fcuCoolCoilIcon','fcuHeatCoilIcon','vavExhDmpIcon','vavColdDmpIcon','vavHotDmpIcon','vavDmpIcon','vavReheatIcon'].forEach(prefix=>{
        const el = document.getElementById(prefix+n); if(el) el.innerHTML = '';
      });
      return;
    }

    setTxt('vavZoneTemp'+n, fmt(box.zoneDisplayTemp,1)+'\u00b0F');
    if(box.type === 'or' || box.type === 'pr'){ setTxt('vavZoneHumid'+n, fmt(box.zoneDisplayHumid,0)+'% RH'); setTxt('vavEffSP'+n, fmt(box.effectiveSP || box.zoneSP,1)+'\u00b0F'); }
    if(box.type === 'fcu'){
      setTxt('fcuFanSpeed'+n, box.fanSpeed > 5 ? fmt(box.fanSpeed,0)+'%' : 'OFF');
      setTxt('fcuCool'+n, fmt(box.coolingValve,0)+'%');
      setTxt('fcuHeat'+n, fmt(box.heatingValve,0)+'%');
      const fi = document.getElementById('fcuFanIcon'+n); if(fi) fi.innerHTML = fanGfx(box.fanSpeed > 5 ? 'run' : 'off');
      const ci = document.getElementById('fcuCoolCoilIcon'+n); if(ci) ci.innerHTML = coolingCoilGfx(box.coolingValve, false);
      const hi = document.getElementById('fcuHeatCoilIcon'+n); if(hi) hi.innerHTML = heatingCoilGfx(box.heatingValve, false, 'fcu'+n);
    } else {
      setTxt('vavAirflow'+n, fmt(box.airflowDisplayCfm,0)+' CFM');
      if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
        setTxt('vavExhAirflow'+n, fmt(box.exhaustAirflowCfm,0)+' CFM');
        setTxt('vavExhDmp'+n, fmt(box.exhaustDamperPos,0)+'%');
        const ei = document.getElementById('vavExhDmpIcon'+n); if(ei) ei.innerHTML = damperGfx(box.exhaustDamperPos, false);
      }
      if(isDual){
        setTxt('vavColdDmp'+n, fmt(box.coldDamperPos,0)+'%');
        setTxt('vavHotDmp'+n, fmt(box.hotDamperPos,0)+'%');
        const ci = document.getElementById('vavColdDmpIcon'+n); if(ci) ci.innerHTML = damperGfx(box.coldDamperPos, false);
        const hi = document.getElementById('vavHotDmpIcon'+n); if(hi) hi.innerHTML = damperGfx(box.hotDamperPos, false);
        if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){ setTxt('vavDmp'+n, fmt(box.damperPos,0)+'%'); const di = document.getElementById('vavDmpIcon'+n); if(di) di.innerHTML = damperGfx(box.damperPos, false); }
      } else {
        setTxt('vavDmp'+n, fmt(box.damperPos,0)+'%');
        setTxt('vavReheat'+n, fmt(config.vavReheatType==='electric'?box.electricStage:box.reheatValve,0)+'%');
        const di = document.getElementById('vavDmpIcon'+n); if(di) di.innerHTML = damperGfx(box.damperPos, false);
        const ri = document.getElementById('vavReheatIcon'+n);
        if(ri){ const reheatPct = config.vavReheatType==='electric'? box.electricStage : box.reheatValve; ri.innerHTML = heatingCoilGfx(reheatPct, false, 'vav'+n); }
      }
    }
  });
}
