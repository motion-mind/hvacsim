/* ============================================================
   AHU TAB — readings, setpoints, safeties, render loop
   ============================================================ */
function readingCard(label, val, unit, alarm, fullLabel){
  const tip = fullLabel ? ' title="'+fullLabel+'"' : (label.length > 28 ? ' title="'+label+'"' : '');
  return '<div class="readout'+(alarm?' alarm':'')+'"'+tip+'><div class="rlabel">'+label+'</div><div class="rval">'+val+'<span class="runit">'+unit+'</span></div></div>';
}

function renderFlowReadings(){
  const el = document.getElementById('flowReadings');
  let html = '';
  html += readingCard(
    config.ductType==='dual' && config.dualDuctIndependent ? 'Cold Deck CFM' : 'Supply Air CFM',
    fmt(sim.supplyCfm,0), 'cfm', false, 'Supply Air (SA) CFM');
  if(config.ductType==='dual' && config.dualDuctIndependent){
    html += readingCard('Hot Deck CFM', fmt(sim.hotDeckCfm,0), 'cfm', false, 'Hot Deck CFM (Independent Fan)');
  }
  if(config.airSystem==='return'){
    html += readingCard('Return Air CFM', fmt(sim.returnCfm,0), 'cfm', false, 'Return Air (RA) CFM');
    if(config.includeOa){
      html += readingCard(config.ductType==='dual' && config.dualDuctIndependent ? 'Cold Deck OA CFM' : 'Outside Air CFM', fmt(sim.oaCfm,0), 'cfm', false);
      if(config.ductType==='dual' && config.dualDuctIndependent){ html += readingCard('Hot Deck OA CFM', fmt(sim.hotOaCfm,0), 'cfm', false); }
    }
    if(config.includeEa){ html += readingCard('Exhaust Air CFM', fmt(sim.exhaustCfm,0), 'cfm', false); }
  } else { html += readingCard('Outside Air CFM', fmt(sim.oaCfm,0), 'cfm', false); }
  const spFluct = 1 + 0.1 * Math.sin((sim.age||0) * 0.07) * Math.sin((sim.age||0) * 0.13);
  html += readingCard('Static Pressure', fmt(sp.highStaticSP * 0.8 * spFluct, 2), 'in. w.c.', sim.staticPressureDisplay>sp.highStaticSP*0.9);
  el.innerHTML = html;
}

function renderTempReadings(){
  const el = document.getElementById('tempReadings');
  let html = '';
  const indep = config.ductType==='dual' && config.dualDuctIndependent;
  if(config.includeOa) html += readingCard('Outside Air Temp', fmt(sim.oatDisplayTemp,1), '\u00b0F', false);
  if(config.airSystem==='return') html += readingCard(indep ? 'Mixed Air Temp (Cold Deck)' : 'Mixed Air Temp', fmt(sim.maTemp,1), '\u00b0F', false);
  if(indep && config.airSystem==='return') html += readingCard('Mixed Air Temp (Hot Deck)', fmt(sim.hotMaTemp,1), '\u00b0F', latched.hotFreezestat);
  if(config.preheat) html += readingCard(indep ? 'Preheat Lvg Temp (Cold Deck)' : 'Preheat Lvg Temp', fmt(sim.preheatLvg,1), '\u00b0F', latched.freezestat);
  if(config.preheat && (config.preheatAquastat || config.preheatBoosterPump)) html += readingCard('Preheat Entering Water Temp', fmt(sim.preheatWaterTemp,1), '\u00b0F', latched.aquastat);
  html += readingCard('Cooling Coil 1 Lvg Temp', fmt(sim.coil1Lvg,1), '\u00b0F', false);
  if(config.coolingCoils==='dual') html += readingCard('Cooling Coil 2 Lvg Temp', fmt(sim.coil2Lvg,1), '\u00b0F', false);
  if(config.ductType==='dual'){
    html += readingCard('Cold Deck SAT', fmt(sim.coldDeckTemp,1), '\u00b0F', false);
    html += readingCard('Hot Deck SAT', fmt(sim.hotDeckTemp,1), '\u00b0F', false);
  } else {
    html += readingCard('Supply Air Temp', fmt(sim.satDisplayTemp,1), '\u00b0F', false);
    if(config.reheat) html += readingCard('Space Temp', fmt(sim.spaceTemp,1), '\u00b0F', false);
  }
  if(config.airSystem==='return') html += readingCard('Return Air Humidity', fmt(sim.raRH*100,0), '% RH', false);
  if(config.includeOa) html += readingCard('Outside Air Humidity', fmt(sim.oaRH*100,0), '% RH', false);
  const effSaRH = sim.W_supply ? rhFromW(sim.raTemp || 72, sim.W_supply) * 100 : sim.saRH * 100;
  html += readingCard('Supply Air Humidity', fmt(effSaRH,0), '% RH', false);
  el.innerHTML = html;
}

function renderEfficiencyReadings(){
  const el = document.getElementById('efficiencyReadings');
  if(!el) return;
  const hasVfd = config.driveType === 'vfd';
  const age = sim ? (sim.age || 0) : 0;
  const base = getAhuBaseEfficiency(sim.oat, sim.oaRH, hasVfd);
  const agePenalty = getAgeLoss(age);
  const netEff = Math.max(0, base.eff - agePenalty);
  let html = '';
  html += readingCard('Net AHU Efficiency', fmt(netEff, 0), '%', netEff < 50, 'Current overall system efficiency after all penalties and age degradation');
  html += readingCard('Theoretical Base', fmt(base.eff, 0), '%', false, 'Expected efficiency for new equipment under current weather and drive type: ' + base.state);
  html += readingCard('Age Penalty Loss', '-' + fmt(agePenalty, 1), '%', agePenalty > 15, 'Efficiency lost due to aging actuators, dampers, belt slip, and casing leaks');
  html += readingCard('Performance Mode', base.state, '', false, 'Current operating efficiency profile');
  html += readingCard('Primary Penalty Driver', base.driver, '', false, 'Main factor affecting hydronic, fan, or thermodynamic efficiency under current state');
  el.innerHTML = html;
}

function driveSignalDisplay(pct){
  switch(config.driveSignal){
    case 'vdc': return fmt((pct/100)*10,2)+' VDC';
    case 'ma': return fmt(4+(pct/100)*16,1)+' mA';
    case 'hz': return fmt((pct/100)*60,1)+' Hz';
    default: return fmt(pct,0)+' %';
  }
}

function actuatorSignalDisplay(pct, sigType){
  const sig = sigType || config.damperSignal;
  switch(sig){
    case 'vdc': return fmt((pct/100)*10,2)+' VDC';
    case 'ma': return fmt(4+(pct/100)*16,1)+' mA';
    case 'psi38': return fmt(3+(pct/100)*5,1)+' PSI';
    case 'psi315': return fmt(3+(pct/100)*12,1)+' PSI';
    default: return fmt(pct,0)+' %';
  }
}

function renderSetpoints(){
  const rows = [];
  function row(label, key, unit, step){ rows.push('<tr><td class="pointname">'+label+'</td><td><input type="number" step="'+(step||1)+'" data-sp="'+key+'" value="'+sp[key]+'"></td><td>'+unit+'</td></tr>'); }
  function overrideRow(label, baseKey, unit, step, isBoolOverride){
    const active = sim && sim['override' + baseKey];
    const valKey = 'override' + baseKey + 'Val';
    const activeKey = 'override' + baseKey;
    const val = sim ? sim[valKey] : (isBoolOverride ? false : 0);
    let valControl = '';
    if(isBoolOverride){
      const valBool = !!val;
      valControl = '<select data-ov-val="'+valKey+'" '+(active?'':'disabled')+' style="width:100%; height:24px; padding:2px; font-size:11px; border:1px solid var(--line); border-radius:3px; background:var(--panel-inset); color:var(--text);">'+
        '<option value="true" '+(valBool?'selected':'')+'>ON (Start)</option>'+
        '<option value="false" '+(!valBool?'selected':'')+'>OFF (Stop)</option></select>';
    } else {
      valControl = '<input type="number" step="'+(step||1)+'" min="0" max="100" data-ov-val="'+valKey+'" value="'+val+'" '+(active?'':'disabled')+' style="width:100%; height:24px; padding:2px; font-size:11px;">';
    }
    const modeBtn = '<button class="btn btn-xs '+(active?'danger':'secondary')+'" data-ov-toggle="'+activeKey+'" style="margin-left: 6px; padding: 2px 6px; font-size: 10px; min-width: 60px;">'+(active?'Release':'Override')+'</button>';
    rows.push('<tr><td class="pointname">'+label+'</td><td>'+valControl+'</td><td style="white-space:nowrap;">'+unit+modeBtn+'</td></tr>');
  }

  row('Maximum AHU Supply Air CFM Rating','maxCfmSP','cfm',100);
  if(config.controlType==='cfm') row(pn('Supply Air','SA')+' CFM Setpoint','supplyCfmSP','cfm',100);
  else row('Supply Duct Static Pressure Setpoint','staticSP','in. w.c.',0.1);
  if(config.airSystem==='return' && config.includeOa) row(pn('Outside Air','OA')+' CFM Setpoint (Minimum Fresh Air)','oaCfmSP','cfm',50);
  if(config.preheat) row('Preheat Coil Discharge Air Temperature Setpoint','preheatDischargeSP','\u00b0F',1);
  if(config.preheat && config.preheatBoosterPump) row('Preheat Booster Pump Start Setpoint (Valve Position)','boosterPumpStartPct','%',1);
  if(config.preheat && config.preheatAquastat) row('Preheat Water Low-Temperature Aquastat Setpoint','aquastatSP','\u00b0F',1);
  row('Cooling Coil Discharge Air Temperature Setpoint','coolingDischargeSP','\u00b0F',1);
  if(config.ductType==='dual') row('Hot Deck Discharge Air Temperature Setpoint','hotDeckSP','\u00b0F',1);
  if(config.ductType!=='dual' && config.reheat) row('Space Temperature Setpoint (Reheat Control)','reheatSpaceSP','\u00b0F',0.5);
  row('Return Air Humidity \u2014 Low Limit (Enables Humidification)','humidityMinSP','% RH',1);
  row('Return Air Humidity \u2014 High Limit (Enables Dehumidification)','humidityMaxSP','% RH',1);
  if(config.includeOa) row('Low Temperature Detector (Freezestat) Setpoint','freezestatSP','\u00b0F',1);
  row('High Static Pressure Detector Setpoint','highStaticSP','in. w.c.',0.1);

  if(sim){
    overrideRow('Supply Fan Start Command Override', 'SupplyFanStart', 'state', 1, true);
    if(config.driveType==='vfd') overrideRow('Supply Fan Speed Reference Override', 'SupplyFanSpeed', '%', 1);
    if(config.airSystem==='return'){
      overrideRow('Return Fan Start Command Override', 'ReturnFanStart', 'state', 1, true);
      if(config.driveType==='vfd') overrideRow('Return Fan Speed Reference Override', 'ReturnFanSpeed', '%', 1);
    }
    if(config.ductType==='dual' && config.dualDuctIndependent){
      overrideRow('Hot Deck Fan Start Command Override', 'HotDeckFanStart', 'state', 1, true);
      if(config.driveType==='vfd') overrideRow('Hot Deck Fan Speed Reference Override', 'HotDeckFanSpeed', '%', 1);
    }
  }

  document.getElementById('setpointTable').querySelector('tbody').innerHTML = rows.join('');
  document.querySelectorAll('#setpointTable input[data-sp]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      let val = parseFloat(inp.value);
      const key = inp.dataset.sp;
      if(key === 'humidityMinSP'){ val = Math.min(val, sp.humidityMaxSP - 10); inp.value = val; }
      else if(key === 'humidityMaxSP'){ val = Math.max(val, sp.humidityMinSP + 10); inp.value = val; }
      sp[key] = val;
    });
  });
  document.querySelectorAll('#setpointTable button[data-ov-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const key = btn.dataset.ovToggle; if(sim){ sim[key] = !sim[key]; renderSetpoints(); } });
  });
  document.querySelectorAll('#setpointTable select[data-ov-val], #setpointTable input[data-ov-val]').forEach(ctrl=>{
    ctrl.addEventListener('change', ()=>{ const key = ctrl.dataset.ovVal; if(sim){ sim[key] = ctrl.tagName==='SELECT' ? ctrl.value==='true' : parseFloat(ctrl.value); } });
  });
}

function renderFanStatus(){
  const el = document.getElementById('fanStatusArea');
  let html = '';
  function fanBlock(title, arr, pct, singleLabel){
    let inner = '<h3 style="font-size:11px;color:var(--text-dim);font-family:var(--mono);text-transform:uppercase;margin:0 0 8px;">'+title+' &mdash; '+fmt(pct,0)+'% Speed</h3>';
    if(arr.length){ inner += '<div class="fanwall">'+arr.map(f=>{ const cls = f.fail? 'fail' : (f.run? 'run':'off'); return '<div class="fan-unit '+cls+'"><div class="glyph">&#9881;</div><div class="lbl">M'+f.id+' '+(f.fail?'FAIL':(f.run?'RUN':'OFF'))+'</div></div>'; }).join('')+'</div>'; }
    else { const cls = pct>0? 'run':'off'; inner += '<div class="fanwall"><div class="fan-unit '+cls+'"><div class="glyph">&#9881;</div><div class="lbl">'+singleLabel+'</div></div></div>'; }
    return inner;
  }
  html += '<div>'+fanBlock((config.ductType==='dual'&&config.dualDuctIndependent)?'Cold Deck Fan':'Supply Fan', sim.supplyFans, sim.supplyFanPct, sim.supplyFanPct>0?'RUN':'OFF')+'</div>';
  if(config.ductType==='dual' && config.dualDuctIndependent) html += '<div>'+fanBlock('Hot Deck Fan', sim.hotDeckFans, sim.hotDeckFanPct, sim.hotDeckFanPct>0?'RUN':'OFF')+'</div>';
  if(config.airSystem==='return') html += '<div>'+fanBlock('Return Fan', sim.returnFans, sim.returnFanPct, sim.returnFanPct>0?'RUN':'OFF')+'</div>';
  if(config.preheat && config.preheatBoosterPump){
    html += '<div><h3 style="font-size:11px;color:var(--text-dim);font-family:var(--mono);text-transform:uppercase;margin:0 0 8px;">Preheat Booster Pump</h3><div class="fanwall"><div class="fan-unit '+(sim.boosterPumpRun?'run':'off')+'"><div class="glyph">&#9881;</div><div class="lbl">'+(sim.boosterPumpRun?'RUN':'OFF')+'</div></div></div></div>';
  }
  el.innerHTML = html;
}

function renderSafeties(){
  const el = document.getElementById('safetyArea');
  function chip(label, tripped, resettable, resetFn){
    return '<div class="safety-chip"><span class="dot '+(tripped?'trip':'on')+'"></span><span class="lbl">'+label+': <b style="color:'+(tripped?'var(--red)':'var(--green)')+'">'+(tripped?'TRIPPED':'NORMAL')+'</b></span>'+(resettable && tripped? '<button data-reset="'+resetFn+'">Reset</button>':'')+'</div>';
  }
  let html = '';
  if(config.includeOa){
    html += chip('Low Temp Detector (Freezestat), '+pn('Outside Air','OA'), latched.freezestat, true, 'freezestat');
    if(config.ductType==='dual' && config.dualDuctIndependent) html += chip('Low Temp Detector (Freezestat), Hot Deck', latched.hotFreezestat, true, 'hotfreezestat');
  }
  html += chip('High Static Detector, '+pn('Supply Air','SA'), latched.highStatic, true, 'highstatic');
  if(config.preheat && config.preheatAquastat) html += chip('Preheat Water Low-Temperature Aquastat', latched.aquastat, true, 'aquastat');
  html += chip('General Fire Alarm', manualSafety.fireAlarm, true, 'firealarm');
  html += chip('Smoke Damper End Switch', manualSafety.smokeDamperFail, true, 'smokedamper');
  html += chip('Door Safety Switch', manualSafety.doorOpen, true, 'door');
  el.innerHTML = html;
  el.querySelectorAll('button[data-reset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.dataset.reset;
      if(k==='freezestat'){ latched.freezestat=false; freezestatRecovering=true; }
      if(k==='hotfreezestat') latched.hotFreezestat=false;
      if(k==='highstatic') latched.highStatic=false;
      if(k==='aquastat') latched.aquastat=false;
      if(k==='firealarm') manualSafety.fireAlarm=false;
      if(k==='smokedamper') manualSafety.smokeDamperFail=false;
      if(k==='door') manualSafety.doorOpen=false;
    });
  });
  const lockoutMsg = document.getElementById('lockoutMsg');
  const tripped = latched.freezestat||latched.highStatic||latched.aquastat||latched.hotFreezestat||manualSafety.fireAlarm||manualSafety.smokeDamperFail||manualSafety.doorOpen;
  lockoutMsg.textContent = tripped? '\u26a0 Safety lockout active — unit will not run until safeties are cleared/reset above.' : '';
  lockoutMsg.style.color = tripped? 'var(--red)':'var(--text-dim)';
}

function setEnabledUI(on){
  sim.enabled = on;
  document.getElementById('enableToggle').classList.toggle('on', on);
  document.getElementById('enableCard').classList.toggle('on', on);
  document.getElementById('enableLabel').textContent = on? 'ENABLED':'DISABLED';
}

function setEconomizerUI(on){
  if(!sim) return;
  sim.economizerEnabled = on;
  const toggle = document.getElementById('econToggle');
  const card = document.getElementById('econCard');
  const label = document.getElementById('econLabel');
  if(toggle) toggle.classList.toggle('on', on);
  if(card) card.classList.toggle('on', on);
  if(label) label.textContent = on? 'ENABLED':'DISABLED';
}

function setDehumidUI(on){
  if(!sim) return;
  sim.dehumidEnabled = on;
  config.dehumidEnabled = on;
  const toggle = document.getElementById('dehumidToggle');
  const card = document.getElementById('dehumidCard');
  const label = document.getElementById('dehumidLabel');
  if(toggle) toggle.classList.toggle('on', on);
  if(card) card.classList.toggle('on', on);
  if(label) label.textContent = on? 'ENABLED':'DISABLED';
}

function setHumidUI(on){
  if(!sim) return;
  sim.humidEnabled = on;
  const toggle = document.getElementById('humidToggle');
  const card = document.getElementById('humidCard');
  const label = document.getElementById('humidLabel');
  if(toggle) toggle.classList.toggle('on', on);
  if(card) card.classList.toggle('on', on);
  if(label) label.textContent = on? 'ENABLED':'DISABLED';
}

function syncOatReadout(){ document.getElementById('oatReadout').textContent = fmt(sim.oatTarget,1)+' \u00b0F'; }
function syncOaRhReadout(){ document.getElementById('oaRhReadout').textContent = fmt(sim.oaRHTarget*100,0)+' %RH'; }
function syncAgeReadout(){
  const el = document.getElementById('ageReadout');
  if(!el) return;
  const age = sim ? (sim.age || 0) : 0;
  let desc = "(New)";
  let color = "var(--green)";
  if(age > 0){
    if(age <= 10){ desc = "(Good)"; color = "var(--green)"; }
    else if(age <= 20){ desc = "(Worn)"; color = "var(--amber)"; }
    else if(age <= 30){ desc = "(Aged)"; color = "var(--amber)"; }
    else { desc = "(Decommission Candidate)"; color = "var(--red)"; }
  }
  el.textContent = age + " Years " + desc;
  el.style.color = color;
}

let lastFrame=0;
function loopThrottle(ts){
  if(ts-lastFrame>250){ lastFrame=ts; renderAhuFrame(); }
  else requestAnimationFrame(loopThrottle);
}

function renderAhuFrame(){
  if(!sim) return;
  syncOatReadout();
  syncOaRhReadout();
  syncAgeReadout();
  updateSchematicReadouts();
  renderFlowReadings();
  renderTempReadings();
  renderEfficiencyReadings();
  if(sim.vav && sim.vav.length && document.getElementById('tab-vav').classList.contains('active')){ updateVavBoxGridValues(); }
  if(sim.ef && document.getElementById('tab-ef').classList.contains('active')){ renderExhaustFanTab(); }
  renderFanStatus();
  renderSafeties();
  const enDot = document.getElementById('topEnableDot');
  const enTxt = document.getElementById('topEnableText');
  const tripped = latched.freezestat||latched.highStatic||latched.aquastat||latched.hotFreezestat||manualSafety.fireAlarm||manualSafety.smokeDamperFail||manualSafety.doorOpen;
  if(sim.enabled && tripped){ enDot.className='dot trip'; enTxt.textContent='LOCKED OUT'; }
  else if(sim.enabled){ enDot.className='dot on'; enTxt.textContent='RUNNING'; }
  else { enDot.className='dot'; enTxt.textContent='DISABLED'; }
  const econDot = document.getElementById('econActiveDot'); if(econDot) econDot.classList.toggle('on', sim.economizerActive);
  const dehumidDot = document.getElementById('dehumidActiveDot'); if(dehumidDot) dehumidDot.classList.toggle('warn', sim.dehumidActive);
  const humidDot = document.getElementById('humidActiveDot'); if(humidDot) humidDot.classList.toggle('blue', sim.humidActive);
  const svgEl = document.getElementById('schematicSvg');
  if(svgEl){
    const sfRun = (config.ductType==='dual' && config.dualDuctIndependent) ? (sim.wantRunCold && sim.supplyFanPct > 5) : (sim.enabled && !tripped && sim.supplyFanPct > 5);
    const hdRun = (config.ductType==='dual' && config.dualDuctIndependent) ? (sim.wantRunHot && sim.hotDeckFanPct > 5) : (config.ductType==='dual' ? sfRun : (sim.enabled && !tripped && sim.hotDeckFanPct > 5));
    const rfRun = (sim.wantRunCold || sim.wantRunHot) && sim.returnFanPct > 5;
    const supplyDamperOpen = config.driveType==='starter' ? (sim.supplyDamperPos >= 5) : true;
    const coldDamperOpen = config.ductType==='dual' ? (sim.coldDeckDamperPos >= 5) : true;
    const hotDamperOpen = config.ductType==='dual' ? (sim.hotDeckDamperPos >= 5) : true;
    const raDamperOpen = (sim.raDamperPos >= 5);
    const hotRaDamperOpen = (sim.hotRaDamperPos >= 5);

    const preForkEl = svgEl.querySelector('#flow_preForkSupply'); if(preForkEl) preForkEl.classList.toggle('flow-running', sfRun && supplyDamperOpen);
    const coldSupplyEl = svgEl.querySelector('#flow_coldSupply'); if(coldSupplyEl) coldSupplyEl.classList.toggle('flow-running', sfRun && (config.ductType==='dual' ? coldDamperOpen : supplyDamperOpen));
    const coldSplitterEl = svgEl.querySelector('#flow_coldSplitter'); if(coldSplitterEl) coldSplitterEl.classList.toggle('flow-running', sfRun && (config.ductType==='dual' ? coldDamperOpen : supplyDamperOpen));
    const hotSupplyEl = svgEl.querySelector('#flow_hotSupply'); if(hotSupplyEl) hotSupplyEl.classList.toggle('flow-running', hdRun && hotDamperOpen);
    const hotSplitterEl = svgEl.querySelector('#flow_hotSplitter'); if(hotSplitterEl) hotSplitterEl.classList.toggle('flow-running', hdRun && hotDamperOpen);
    const coldRiserEl = svgEl.querySelector('#flow_coldRiser'); if(coldRiserEl) coldRiserEl.classList.toggle('flow-running', rfRun && raDamperOpen);
    const hotRiserEl = svgEl.querySelector('#flow_hotRiser'); if(hotRiserEl) hotRiserEl.classList.toggle('flow-running', rfRun && hotRaDamperOpen);
    const returnEl = svgEl.querySelector('#flow_returnMain'); if(returnEl) returnEl.classList.toggle('flow-running', rfRun);
    const eaDamperOpen = config.includeEa && (sim.eaDamperPos >= 5);
    const returnExhaustEl = svgEl.querySelector('#flow_returnExhaust'); if(returnExhaustEl) returnExhaustEl.classList.toggle('flow-running', rfRun && eaDamperOpen);
    const coldStubEl = svgEl.querySelector('#flow_coldSupplyStub'); if(coldStubEl) coldStubEl.classList.toggle('flow-running', sfRun && (config.ductType==='dual' ? coldDamperOpen : supplyDamperOpen));
    const hotStubEl = svgEl.querySelector('#flow_hotSupplyStub'); if(hotStubEl) hotStubEl.classList.toggle('flow-running', hdRun && hotDamperOpen);
  }
  requestAnimationFrame(loopThrottle);
}
