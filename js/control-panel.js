/* ============================================================
   CONTROL PANEL — terminals, meter, probes
   ============================================================ */
function isWireDisconnected(nameSub){
  if(!terminals || !disconnectedTerminals) return false;
  const t = terminals.find(x => x.name.indexOf(nameSub) !== -1);
  return t ? disconnectedTerminals.has(t.id) : false;
}

function isVavDisconnected(boxNum, index){
  if(!disconnectedVavTerminals) return false;
  return disconnectedVavTerminals.has('VTB-' + boxNum + '-' + index);
}

const SIG_LABELS = {pct:'0-100%', vdc:'0-10 VDC', ma:'4-20 mA', hz:'0-60 Hz', psi38:'3-8 PSI (Pneumatic)', psi315:'3-15 PSI (Pneumatic)'};

function buildTerminals(){
  terminals = [];
  let n=1;
  function T(name, kind, valueFn, group, sigType, section){
    const id = 'TB-'+(n++);
    return {id, name, kind, valueFn, group, sigType, section};
  }
  const power = [];
  const ao = {};
  const ai = {};
  const loopTests = [];
  const digital = [];
  const pushAo = (t)=>{ (ao[t.section]=ao[t.section]||[]).push(t); };
  const pushAi = (t)=>{ (ai[t.section]=ai[t.section]||[]).push(t); };

  power.push(T('24 VAC Control Power (Hot)', 'power_24vac', ()=>24.0, 'Power'));
  power.push(T('24 VAC Control Power (Common)', 'common_24vac', ()=>0, 'Power'));

  const driveSigLabel = SIG_LABELS[config.driveSignal];
  const dmpSigLabel = SIG_LABELS[config.damperSignal];
  const vlvSigLabel = SIG_LABELS[config.valveSignal];
  const designCfm = config.ductType==='dual'? sp.maxCfmSP / 2 : sp.maxCfmSP;
  const dmpIsPneumatic = config.damperSignal==='psi38' || config.damperSignal==='psi315';
  const vlvIsPneumatic = config.valveSignal==='psi38' || config.valveSignal==='psi315';
  const driveSection = 'ao_'+config.driveSignal;
  const dmpKind = dmpIsPneumatic? 'signal_pneumatic' : 'signal_elec';
  const dmpSection = 'ao_'+config.damperSignal;
  const vlvKind = vlvIsPneumatic? 'signal_pneumatic' : 'signal_elec';
  const vlvSection = 'ao_'+config.valveSignal;

  pushAo(T('Supply Fan Drive Speed Command ('+driveSigLabel+')', 'signal_elec', ()=>sim?sim.supplyFanPct:0, 'Supply Fan', config.driveSignal, driveSection));
  loopTests.push(T('Supply Fan Drive Loop Test Point ('+driveSigLabel+')', 'loop_test', ()=>sim?sim.supplyFanPct:0, 'Supply Fan', config.driveSignal, driveSection));
  digital.push(T('Supply Fan Drive Run Status (Dry Contact)', 'dry_contact', ()=>(sim&&sim.supplyFanPct>0), 'Supply Fan'));

  if(config.driveType==='starter'){ pushAo(T('Supply Duct Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.supplyDamperPos:0, 'Supply Fan', config.damperSignal, dmpSection)); }
  if(config.ductType==='dual'){
    pushAo(T('Cold Deck Regulating Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.coldDeckDamperPos:0, 'Cooling Coil', config.damperSignal, dmpSection));
    pushAo(T('Hot Deck Regulating Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.hotDeckDamperPos:0, 'Hot Deck', config.damperSignal, dmpSection));
  }
  if(config.airSystem==='return'){
    pushAo(T('Return Fan Drive Speed Command ('+driveSigLabel+')', 'signal_elec', ()=>sim?sim.returnFanPct:0, 'Return Fan', config.driveSignal, driveSection));
    digital.push(T('Return Fan Drive Run Status (Dry Contact)', 'dry_contact', ()=>(sim&&sim.returnFanPct>0), 'Return Fan'));
  }

  const independentHot = config.ductType==='dual' && config.dualDuctIndependent;
  if(independentHot){
    pushAo(T('Hot Deck Fan Drive Speed Command ('+driveSigLabel+')', 'signal_elec', ()=>sim?sim.hotDeckFanPct:0, 'Hot Deck Fan', config.driveSignal, driveSection));
    digital.push(T('Hot Deck Fan Drive Run Status (Dry Contact)', 'dry_contact', ()=>(sim&&sim.hotDeckFanPct>0), 'Hot Deck Fan'));
    if(config.airSystem==='return'){
      pushAo(T('Hot Deck Outside Air Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.hotOaDamperPos:0, 'Hot Deck Fan', config.damperSignal, dmpSection));
      pushAo(T('Hot Deck Return Air Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.hotRaDamperPos:0, 'Hot Deck Fan', config.damperSignal, dmpSection));
    }
    if(config.includeOa) digital.push(T('Hot Deck Low Temperature Detector (Freezestat) Contact', 'dry_contact', ()=>!latched.hotFreezestat, 'Hot Deck Fan'));
  }

  if(config.preheat){
    pushAo(T('Preheat Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.preheatValve:0, 'Preheat Coil', config.valveSignal, vlvSection));
    if(config.preheatBoosterPump) digital.push(T('Preheat Booster Pump Run Status (Dry Contact)', 'dry_contact', ()=>(sim&&sim.boosterPumpRun), 'Preheat Coil'));
    if(config.preheatAquastat) digital.push(T('Preheat Water Low-Temperature Aquastat Contact', 'dry_contact', ()=>!latched.aquastat, 'Preheat Coil'));
  }
  pushAo(T('Cooling Coil 1 Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.coil1Valve:0, 'Cooling Coil', config.valveSignal, vlvSection));
  if(config.coolingCoils==='dual') pushAo(T('Cooling Coil 2 Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.coil2Valve:0, 'Cooling Coil', config.valveSignal, vlvSection));
  if(config.ductType==='dual'){
    pushAi(T('Cold Deck Leaving Air Temperature Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.coldDeckTemp,0,100):0, 'Cooling Coil', config.valveSignal, 'ai_'+config.valveSignal));
    pushAi(T('Hot Deck Leaving Air Temperature Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.hotDeckTemp,0,100):0, 'Hot Deck', config.valveSignal, 'ai_'+config.valveSignal));
  } else { pushAi(T('Discharge Air Temperature Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.satDisplayTemp,0,100):0, 'Cooling Coil', config.valveSignal, 'ai_'+config.valveSignal)); }
  if(config.driveType==='vfd'){
    pushAi(T('Duct Static Pressure Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.staticPressureDisplay * 2,0,10):0, 'Supply Fan', config.valveSignal, 'ai_'+config.valveSignal));
    pushAi(T('Supply Air Flow Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp((sim.supplyCfm / (designCfm || 6000)) * 10,0,10):0, 'Supply Fan', config.valveSignal, 'ai_'+config.valveSignal));
  }
  if(config.ductType==='dual'){ pushAo(T('Hot Deck Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.hotDeckValve:0, 'Hot Deck', config.valveSignal, vlvSection)); }
  else {
    if(config.reheat) pushAo(T('Reheat Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.reheatValve:0, 'Reheat Coil', config.valveSignal, vlvSection));
    if(config.steamHumid) pushAo(T('Humidifier Valve Actuator Command ('+vlvSigLabel+')', vlvKind, ()=>sim?sim.humidValve:0, 'Humidifier', config.valveSignal, vlvSection));
  }
  if(config.airSystem==='return'){
    pushAi(T('Return Air Temperature Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.raDisplayTemp,0,100):0, 'Dampers', config.valveSignal, 'ai_'+config.valveSignal));
    pushAi(T('Return Air Humidity Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.raRH*100,0,100):0, 'Dampers', config.valveSignal, 'ai_'+config.valveSignal));
  } else { pushAi(T('Return Air Humidity Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.raRH*100,0,100):0, 'Dampers', config.valveSignal, 'ai_'+config.valveSignal)); }
  pushAi(T('Discharge Air Humidity Sensor Signal ('+vlvSigLabel+')', vlvKind, ()=>sim?clamp(sim.saRH*100,0,100):0, 'Cooling Coil', config.valveSignal, 'ai_'+config.valveSignal));
  if(config.airSystem==='return'){
    pushAo(T('Outside Air Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.oaDamperPos:0, 'Dampers', config.damperSignal, dmpSection));
    pushAo(T('Return Air (Mixed Air) Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.raDamperPos:0, 'Dampers', config.damperSignal, dmpSection));
    pushAo(T('Exhaust Air Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.eaDamperPos:0, 'Dampers', config.damperSignal, dmpSection));
  }
  pushAo(T('Fire / Smoke Damper Actuator Command ('+dmpSigLabel+')', dmpKind, ()=>sim?sim.fireDamperPos:0, 'Dampers', config.damperSignal, dmpSection));

  if(config.includeOa) digital.push(T('Low Temperature Detector (Freezestat) Contact', 'dry_contact', ()=>!latched.freezestat, 'Safeties'));
  digital.push(T('High Static Pressure Detector Contact', 'dry_contact', ()=>!latched.highStatic, 'Safeties'));
  digital.push(T('General Fire Alarm Contact', 'dry_contact', ()=>!manualSafety.fireAlarm, 'Safeties'));
  digital.push(T('Smoke Damper End Switch Contact', 'dry_contact', ()=>!manualSafety.smokeDamperFail, 'Safeties'));
  digital.push(T('Door Safety Switch Contact', 'dry_contact', ()=>!manualSafety.doorOpen, 'Safeties'));

  terminals.push(...power);
  Object.keys(ao).forEach(sec=>{
    terminals.push(...ao[sec]);
    if(sec.indexOf('psi')<0) terminals.push(T('Analog Output Common \u2014 '+SIG_LABELS[sec.slice(3)]+' (Shared)', 'common', ()=>0, 'Analog Outputs', null, sec));
  });
  Object.keys(ai).forEach(sec=>{
    terminals.push(...ai[sec]);
    if(sec.indexOf('psi')<0) terminals.push(T('Analog Input Common \u2014 '+SIG_LABELS[sec.slice(3)]+' (Shared)', 'common', ()=>0, 'Analog Inputs', null, sec));
  });
  terminals.push(...loopTests);
  terminals.push(...digital);
}

const TERM_ABBREV_RULES = [
  [/^Return Air Humidity Sensor Signal/, 'RA-HUM'], [/^Discharge Air Humidity Sensor Signal/, 'SA-HUM'],
  [/^Zone Humidity Sensor Signal/, 'ZN-HUM'], [/^24 VAC Control Power \(Hot\)$/, '24V-HOT'],
  [/^24 VAC Control Power \(Common\)$/, '24V-COM'], [/24 VAC Supply Power \(Hot\)$/, '24V-HOT'],
  [/24 VAC Supply Power \(Common\)$/, '24V-COM'], [/^Supply Fan Drive Speed Command/, 'SF-SPD'],
  [/^Supply Fan Drive Loop Test Point/, 'SF-LOOP'], [/^Supply Fan Drive Run Status/, 'SF-STAT'],
  [/^Return Fan Drive Speed Command/, 'RF-SPD'], [/^Return Fan Drive Run Status/, 'RF-STAT'],
  [/^Hot Deck Fan Drive Speed Command/, 'HDF-SPD'], [/^Hot Deck Fan Drive Run Status/, 'HDF-STAT'],
  [/^Supply Duct Damper Actuator Command/, 'SPLY-DPR'], [/^Cold Deck Regulating Damper Actuator Command/, 'CD-DPR'],
  [/^Hot Deck Regulating Damper Actuator Command/, 'HD-DPR'], [/^Hot Deck Outside Air Damper Actuator Command/, 'HD-OADPR'],
  [/^Hot Deck Return Air Damper Actuator Command/, 'HD-RADPR'], [/^Hot Deck Low Temperature Detector/, 'HD-FRZ'],
  [/^Hot Deck Valve Actuator Command/, 'HD-VLV'], [/^Preheat Valve Actuator Command/, 'PHC-VLV'],
  [/^Preheat Booster Pump Run Status/, 'PHC-PMP'], [/^Preheat Water Low-Temperature Aquastat/, 'PHC-AQST'],
  [/^Cooling Coil 1 Valve Actuator Command/, 'CC1-VLV'], [/^Cooling Coil 2 Valve Actuator Command/, 'CC2-VLV'],
  [/^Discharge Air Temperature Sensor Signal/, 'SAT-SIG'], [/^Cold Deck Leaving Air Temperature Sensor Signal/, 'CLG-LAT'],
  [/^Hot Deck Leaving Air Temperature Sensor Signal/, 'HD-LAT'], [/^Reheat Valve Actuator Command/, 'RHT-VLV'],
  [/^Humidifier Valve Actuator Command/, 'HUM-VLV'], [/^Outside Air Damper Actuator Command/, 'OA-DPR'],
  [/^Return Air \(Mixed Air\) Damper Actuator Command/, 'RA-DPR'], [/^Exhaust Air Damper Actuator Command/, 'EA-DPR'],
  [/^Fire \/ Smoke Damper Actuator Command/, 'FSD-DPR'], [/^Low Temperature Detector/, 'FRZSTAT'],
  [/^High Static Pressure Detector/, 'HI-STAT'], [/^Duct Static Pressure Sensor Signal/, 'S-PRES'],
  [/^Supply Air Flow Sensor Signal/, 'S-FLOW'], [/^General Fire Alarm/, 'FIRE-ALM'],
  [/^Smoke Damper End Switch/, 'SMK-SW'], [/^Door Safety Switch/, 'DOOR-SW'],
  [/^Return Air Temperature Sensor Signal/, 'RAT-SIG'], [/^Analog Output Common/, 'AO-COM'],
  [/^Analog Input Common/, 'AI-COM'], [/^Primary Air Damper Actuator Command/, 'PRI-DPR'],
  [/^Local Airflow Sensor Signal/, 'V-FLOW'], [/^Hot Water Reheat Valve Actuator Command/, 'RHT-VLV'],
  [/^Electric Reheat Command/, 'RHT-ELEC'], [/Cold Deck Damper Actuator \u2014 Open Triac/, 'CD-OPEN'],
  [/Cold Deck Damper Actuator \u2014 Close Triac/, 'CD-CLOSE'], [/Cold Deck Damper Actuator \u2014 Common/, 'CD-COM'],
  [/Hot Deck Damper Actuator \u2014 Open Triac/, 'HD-OPEN'], [/Hot Deck Damper Actuator \u2014 Close Triac/, 'HD-CLOSE'],
  [/Hot Deck Damper Actuator \u2014 Common/, 'HD-COM']
];

function abbrevTermName(name){
  for(const [re,abbr] of TERM_ABBREV_RULES){ if(re.test(name)) return abbr; }
  return name.length>12? name.slice(0,11)+'\u2026' : name;
}

function wireIconSvg(connected){
  return '<svg class="term-wire" viewBox="0 0 40 26" width="40" height="26">'+
    '<circle cx="20" cy="7" r="5.2" fill="#9aa1a8" stroke="#4a4f55" stroke-width="1"/>'+
    '<line x1="15.8" y1="7" x2="24.2" y2="7" stroke="#2b2f33" stroke-width="1.4"/>'+
    (connected? '<path d="M20,10 L20,24" stroke="#c9862a" stroke-width="2.6" fill="none" stroke-linecap="round"/>' : '<path d="M20,10 L31,22" stroke="#c9862a" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="1,4.2"/>')+
    '</svg>';
}

function buildVavTerminals(boxNum){
  vavTerminalBoxNum = boxNum;
  vavTerminals = [];
  let n=1;
  function T(name, kind, valueFn, section, sigType){
    const id = 'VTB-'+boxNum+'-'+(n++);
    return {id, name, kind, valueFn, section, sigType, group:section};
  }
  const box = sim.vav && sim.vav[boxNum-1];
  if(!box) return;

  const power = [
    T('VAV-'+boxNum+' 24 VAC Supply Power (Hot)', 'power_24vac', ()=>24.0, 'power'),
    T('VAV-'+boxNum+' 24 VAC Supply Power (Common)', 'common_24vac', ()=>0, 'power')
  ];
  vavTerminals.push(...power);

  const ao = {}, ai = {};
  const pushAo = (t)=>{ (ao[t.section]=ao[t.section]||[]).push(t); };
  const pushAi = (t)=>{ (ai[t.section]=ai[t.section]||[]).push(t); };

  if(box.type === 'fcu'){
    pushAo(T('Local Fan Speed Command (0-10 VDC)', 'signal_elec', ()=>box.fanSpeed, 'ao_vdc', 'vdc'));
    pushAo(T('Cooling Valve Actuator Command (0-10 VDC)', 'signal_elec', ()=>box.coolingValve, 'ao_vdc', 'vdc'));
    pushAo(T('Heating Valve Actuator Command (0-10 VDC)', 'signal_elec', ()=>box.heatingValve, 'ao_vdc', 'vdc'));
    pushAi(T('Discharge Air Temperature Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp(box.dischargeTemp,0,100), 'ai_ma', 'ma'));
  } else if(config.ductType==='dual'){
    const addFloating = (label, dirFn, sectionKey)=>{
      vavTerminals.push(T(label+' \u2014 Open Triac (24 VAC)', 'triac_24vac', ()=>dirFn()==='open'?24:0, sectionKey));
      vavTerminals.push(T(label+' \u2014 Close Triac (24 VAC)', 'triac_24vac', ()=>dirFn()==='close'?24:0, sectionKey));
      vavTerminals.push(T(label+' \u2014 Common', 'common', ()=>0, sectionKey));
    };
    addFloating('Cold Deck Damper Actuator', ()=>box.coldDamperDir, 'triac_cold');
    addFloating('Hot Deck Damper Actuator', ()=>box.hotDamperDir, 'triac_hot');
    pushAi(T('Discharge Air Temperature Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp(box.dischargeTemp,0,100), 'ai_ma', 'ma'));
    pushAi(T('Local Airflow Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp((box.airflowDisplayCfm / (box.designCfm || 400)) * 16 + 4, 4, 20), 'ai_ma', 'ma'));
    if(box.type === 'or' || box.type === 'pr') pushAi(T('Zone Humidity Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp(box.zoneHumid,0,100), 'ai_ma', 'ma'));
  } else {
    pushAo(T('Primary Air Damper Actuator Command (0-10 VDC)', 'signal_elec', ()=>box.damperPos, 'ao_vdc', 'vdc'));
    if(config.vavReheatType==='electric'){ pushAo(T('Electric Reheat Command (0-10 VDC)', 'signal_elec', ()=>box.electricStage, 'ao_vdc', 'vdc')); }
    else { pushAo(T('Hot Water Reheat Valve Actuator Command (0-10 VDC)', 'signal_elec', ()=>box.reheatValve, 'ao_vdc', 'vdc')); }
    pushAi(T('Discharge Air Temperature Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp(box.dischargeTemp,0,100), 'ai_ma', 'ma'));
    pushAi(T('Local Airflow Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp((box.airflowDisplayCfm / (box.designCfm || 400)) * 16 + 4, 4, 20), 'ai_ma', 'ma'));
    if(box.type === 'or' || box.type === 'pr') pushAi(T('Zone Humidity Sensor Signal (4-20 mA)', 'signal_elec', ()=>clamp(box.zoneHumid,0,100), 'ai_ma', 'ma'));
  }

  Object.keys(ao).forEach(sec=>{ vavTerminals.push(...ao[sec]); vavTerminals.push(T('Analog Output Common \u2014 '+SIG_LABELS[sec.slice(3)]+' (Shared)', 'common', ()=>0, sec)); });
  Object.keys(ai).forEach(sec=>{ vavTerminals.push(...ai[sec]); vavTerminals.push(T('Analog Input Common \u2014 '+SIG_LABELS[sec.slice(3)]+' (Shared)', 'common', ()=>0, sec)); });
}

function vavSectionHeaderFor(t){
  if(t.kind==='power_24vac' || t.kind==='common_24vac') return 'Power';
  if(t.section==='triac_cold') return '24 VAC Floating Control \u2014 Cold Deck Damper';
  if(t.section==='triac_hot') return '24 VAC Floating Control \u2014 Hot Deck Damper';
  if(t.section && t.section.indexOf('ao_')===0) return 'Analog Outputs \u2014 '+SIG_LABELS[t.section.slice(3)];
  if(t.section && t.section.indexOf('ai_')===0) return 'Analog Inputs \u2014 '+SIG_LABELS[t.section.slice(3)];
  return t.section || 'Other';
}

function sectionHeaderFor(t){
  if(t.kind==='power_24vac' || t.kind==='common_24vac') return 'Power';
  if(t.kind==='loop_test') return 'Loop Test Points';
  if(t.kind==='dry_contact') return 'Digital / Status Inputs (Dry Contacts)';
  if(t.section && t.section.indexOf('ao_')===0) return 'Analog Outputs \u2014 '+SIG_LABELS[t.section.slice(3)];
  if(t.section && t.section.indexOf('ai_')===0) return 'Analog Inputs \u2014 '+SIG_LABELS[t.section.slice(3)];
  return t.group;
}

function renderTerminalBoard(){
  const el = document.getElementById('terminalBoard');
  const groups = {};
  const order = [];
  terminals.forEach(t=>{
    const g = sectionHeaderFor(t);
    if(!groups[g]){ groups[g]=[]; order.push(g); }
    groups[g].push(t);
  });
  let html='';
  order.forEach(g=>{
    html += '<div class="tblock"><h3>'+g+'</h3><div class="tstrip">'+groups[g].map(t=>{
      let cls='terminal';
      if(probeRed && probeRed.id===t.id) cls+=' probe-red';
      if(probeBlack && probeBlack.id===t.id) cls+=' probe-black';
      if(disconnectedTerminals.has(t.id)) cls+=' wire-disconnected';
      return '<div class="'+cls+'" data-term="'+t.id+'" title="'+t.name.replace(/"/g,'&quot;')+'">'+wireIconSvg(!disconnectedTerminals.has(t.id))+'<span class="tid">'+t.id+'</span><span class="tname">'+abbrevTermName(t.name)+'</span></div>';
    }).join('')+'</div></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.terminal').forEach(d=>{
    d.addEventListener('click', ()=>{
      if(meterDamaged) return;
      const t = terminals.find(x=>x.id===d.dataset.term);
      const isDisc = disconnectedTerminals.has(t.id);
      if(!probeRed){ probeRed = t; }
      else if(!probeBlack){
        if(probeRed.id===t.id && !isDisc){ probeRed = null; }
        else { probeBlack = t; }
      } else {
        if(probeRed.id===probeBlack.id && probeRed.id===t.id){ probeRed=null; probeBlack=null; }
        else { probeRed = t; probeBlack = null; }
      }
      refreshMeter();
    });
    d.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      if(meterDamaged) return;
      const id = d.dataset.term;
      if(disconnectedTerminals.has(id)) disconnectedTerminals.delete(id);
      else disconnectedTerminals.add(id);
      renderTerminalBoard();
      refreshMeter();
    });
  });
}

function renderVavTerminalBoard(){
  const el = document.getElementById('vavTerminalBoard');
  if(!el) return;
  const groups = {};
  const order = [];
  vavTerminals.forEach(t=>{
    const g = vavSectionHeaderFor(t);
    if(!groups[g]){ groups[g]=[]; order.push(g); }
    groups[g].push(t);
  });
  let html='';
  order.forEach(g=>{
    html += '<div class="tblock"><h3>'+g+'</h3><div class="tstrip">'+groups[g].map(t=>{
      let cls='terminal';
      if(vavProbeRed && vavProbeRed.id===t.id) cls+=' probe-red';
      if(vavProbeBlack && vavProbeBlack.id===t.id) cls+=' probe-black';
      if(disconnectedVavTerminals.has(t.id)) cls+=' wire-disconnected';
      return '<div class="'+cls+'" data-term="'+t.id+'" title="'+t.name.replace(/"/g,'&quot;')+'">'+wireIconSvg(!disconnectedVavTerminals.has(t.id))+'<span class="tid">'+t.id+'</span><span class="tname">'+abbrevTermName(t.name)+'</span></div>';
    }).join('')+'</div></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.terminal').forEach(d=>{
    d.addEventListener('click', ()=>{
      if(vavMeterDamaged) return;
      const t = vavTerminals.find(x=>x.id===d.dataset.term);
      const isDisc = disconnectedVavTerminals.has(t.id);
      if(!vavProbeRed){ vavProbeRed = t; }
      else if(!vavProbeBlack){
        if(vavProbeRed.id===t.id && !isDisc){ vavProbeRed = null; }
        else { vavProbeBlack = t; }
      } else {
        if(vavProbeRed.id===vavProbeBlack.id && vavProbeRed.id===t.id){ vavProbeRed=null; vavProbeBlack=null; }
        else { vavProbeRed = t; vavProbeBlack = null; }
      }
      refreshVavMeter();
    });
    d.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      if(vavMeterDamaged) return;
      const id = d.dataset.term;
      if(disconnectedVavTerminals.has(id)) disconnectedVavTerminals.delete(id);
      else disconnectedVavTerminals.add(id);
      renderVavTerminalBoard();
      refreshVavMeter();
    });
  });
}

const METER_MODES = [{id:'vdc', label:'VDC'},{id:'vac', label:'VAC'},{id:'ohm', label:'Resistance (\u03a9)'},{id:'ma', label:'mA (Current)'}];

function renderMeterModes(){
  document.getElementById('meterModes').innerHTML = METER_MODES.map(m=>'<button class="btn '+(meterMode===m.id?'sel':'')+'" data-mode="'+m.id+'">'+m.label+'</button>').join('');
  document.querySelectorAll('#meterModes button').forEach(b=>{ b.addEventListener('click', ()=>{ if(meterDamaged) return; meterMode=b.dataset.mode; renderMeterModes(); refreshMeter(); }); });
}

function renderVavMeterModes(){
  const el = document.getElementById('vavMeterModes');
  if(!el) return;
  el.innerHTML = METER_MODES.map(m=>'<button class="btn '+(vavMeterMode===m.id?'sel':'')+'" data-mode="'+m.id+'">'+m.label+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>{ b.addEventListener('click', ()=>{ if(vavMeterDamaged) return; vavMeterMode=b.dataset.mode; renderVavMeterModes(); refreshVavMeter(); }); });
}

function convertSignal(pct, sigType){
  switch(sigType){
    case 'vdc': return {value:(pct/100)*10, unit:'VDC', digits:2};
    case 'ma': return {value:4+(pct/100)*16, unit:'mA', digits:2};
    case 'hz': return {value:(pct/100)*60, unit:'Hz', digits:1};
    case 'psi38': return {value:3+(pct/100)*5, unit:'PSI', digits:1};
    case 'psi315': return {value:3+(pct/100)*12, unit:'PSI', digits:1};
    default: return {value:pct, unit:'%', digits:0};
  }
}

function isLive(t){ return t.kind==='power_24vac' || t.kind==='signal_elec' || t.kind==='loop_test' || t.kind==='triac_24vac'; }

function sameCircuit(a,b){
  const sameBucket = (a.section && b.section) ? a.section===b.section : a.group===b.group;
  if(sameBucket){
    if(((a.kind.startsWith('signal')||a.kind==='triac_24vac') && b.kind==='common')||((b.kind.startsWith('signal')||b.kind==='triac_24vac') && a.kind==='common')) return true;
    if(a.kind==='triac_24vac' && b.kind==='triac_24vac') return true;
    if(a.kind==='loop_test' && b.kind==='common') return true;
    if(b.kind==='loop_test' && a.kind==='common') return true;
    if(a.kind==='dry_contact' && b.kind==='dry_contact' && a.id===b.id) return true;
    if(a.id===b.id) return true;
  }
  if(a.kind==='power_24vac' && b.kind==='common_24vac') return true;
  if(b.kind==='power_24vac' && a.kind==='common_24vac') return true;
  if(a.kind==='dry_contact') return true;
  if(b.kind==='dry_contact') return true;
  return a.group===b.group;
}

function refreshMeter(){
  document.getElementById('probeRedName').textContent = probeRed? (probeRed.id+' \u2014 '+probeRed.name) : 'not connected';
  document.getElementById('probeBlackName').textContent = probeBlack? (probeBlack.id+' \u2014 '+probeBlack.name) : 'not connected';
  const screen = document.getElementById('meterScreen');
  const readingEl = document.getElementById('meterReading');
  const unitEl = document.getElementById('meterUnit');
  const msgEl = document.getElementById('meterMsg');
  const replaceBtn = document.getElementById('btnReplaceMeter');

  if(meterDamaged){
    screen.classList.add('damaged');
    readingEl.textContent='\u2620 OL'; unitEl.textContent='METER DAMAGED';
    msgEl.textContent='Internal fuse blown. Replace the meter to continue.';
    replaceBtn.style.display='inline-block';
    return;
  }
  replaceBtn.style.display='none';
  screen.classList.remove('damaged');

  if(!probeRed || !probeBlack){ readingEl.textContent='- - -'; unitEl.textContent=''; msgEl.textContent='Connect both probes to take a reading.'; return; }

  const same = sameCircuit(probeRed, probeBlack);
  const energized = !sim || sim.enabled;
  const pneumatic = probeRed.kind==='signal_pneumatic' || probeBlack.kind==='signal_pneumatic';

  function damage(msg){
    meterDamaged = true;
    renderTerminalBoard();
    readingEl.textContent='\u2620 OL'; unitEl.textContent='METER DAMAGED'; msgEl.textContent=msg;
    screen.classList.add('damaged');
    replaceBtn.style.display='inline-block';
  }

  if(pneumatic){ readingEl.textContent='N/A'; unitEl.textContent=meterMode.toUpperCase(); msgEl.textContent='This is a pneumatic (compressed air) signal, not electrical. Check it with a pressure gauge instead.'; return; }

  const bridging = probeRed.id===probeBlack.id && disconnectedTerminals.has(probeRed.id);
  const eitherDisconnected = disconnectedTerminals.has(probeRed.id) || disconnectedTerminals.has(probeBlack.id);
  if(bridging){
    const t = probeRed;
    if(meterMode==='ma'){
      if(t.sigType==='ma'){ const c = convertSignal(t.valueFn(), t.sigType); readingEl.textContent = fmt(c.value,2); unitEl.textContent='mA'; msgEl.textContent = 'Correct technique — the wire is disconnected at '+t.id+' and the meter is bridging the gap.'; return; }
      readingEl.textContent='0.00'; unitEl.textContent='mA'; msgEl.textContent = 'Not a current loop.'; return;
    }
    if(meterMode==='vdc' && t.kind==='signal_elec' && (t.sigType==='vdc'||t.sigType==='pct'||t.sigType==='hz')){ const c = convertSignal(t.valueFn(), t.sigType); readingEl.textContent=fmt(c.value,c.digits); unitEl.textContent='VDC'; msgEl.textContent='Reading through the bridge at '+t.id+'.'; return; }
    readingEl.textContent = meterMode==='ohm'? 'OL':'0.00';
    unitEl.textContent = meterMode==='ohm'? '\u03a9':meterMode.toUpperCase();
    msgEl.textContent = 'Wrong meter mode for this bridge.';
    return;
  }
  if(eitherDisconnected && sameCircuit(probeRed,probeBlack)){
    const brokenId = disconnectedTerminals.has(probeRed.id)? probeRed.id : probeBlack.id;
    readingEl.textContent = meterMode==='ohm'? 'OL':'0.00';
    unitEl.textContent = meterMode==='ohm'? '\u03a9 (open circuit)':meterMode.toUpperCase();
    msgEl.textContent = 'Open circuit — the wire at '+brokenId+' is disconnected.';
    return;
  }

  if(meterMode==='ohm'){
    if(energized && (isLive(probeRed) || isLive(probeBlack))){ damage('Resistance/continuity was measured across an energized circuit.'); return; }
    if(!same){ readingEl.textContent='OL'; unitEl.textContent='\u03a9 (open circuit)'; msgEl.textContent='No continuity between these two points.'; return; }
    if(probeRed.kind==='dry_contact'){ const closed = probeRed.valueFn(); readingEl.textContent = closed? '0.4':'OL'; unitEl.textContent='\u03a9'; msgEl.textContent = closed? 'Contact is closed (continuity).' : 'Contact is open.'; return; }
    readingEl.textContent = fmt(rnd(180,420),0); unitEl.textContent='\u03a9 (actuator coil)'; msgEl.textContent='De-energized coil resistance reading.';
    return;
  }
  if(meterMode==='ma'){
    if(probeRed.kind!=='loop_test' && probeBlack.kind!=='loop_test' && (isLive(probeRed)||isLive(probeBlack)) && !same){ damage('Current mode placed across a voltage source.'); return; }
    if(!same){ readingEl.textContent='0.00'; unitEl.textContent='mA'; msgEl.textContent='No loop current.'; return; }
    if(probeRed.kind==='loop_test' || probeBlack.kind==='loop_test'){ const t = probeRed.kind==='loop_test'? probeRed : probeBlack; const c = convertSignal(t.valueFn(), t.sigType); readingEl.textContent = t.sigType==='ma'? fmt(c.value,2) : fmt(t.valueFn(),0); unitEl.textContent = t.sigType==='ma'? 'mA' : c.unit+' (not a current signal)'; msgEl.textContent = t.sigType==='ma'? 'Correct technique — meter in series with the loop.' : 'Wrong meter mode for this signal type.'; return; }
    if(probeRed.sigType==='ma'){ damage('Current mode connected in parallel across a live 4-20 mA signal.'); return; }
    readingEl.textContent='0.00'; unitEl.textContent='mA'; msgEl.textContent='Not a current loop connection.';
    return;
  }
  if(meterMode==='vdc'){
    if(!same){ readingEl.textContent='0.00'; unitEl.textContent='VDC'; msgEl.textContent='No potential between these two points.'; return; }
    if(probeRed.kind==='signal_elec' && (probeRed.sigType==='vdc'||probeRed.sigType==='pct'||probeRed.sigType==='hz')){ const c = convertSignal(probeRed.valueFn(), probeRed.sigType); readingEl.textContent=fmt(c.value,c.digits); unitEl.textContent='VDC'; msgEl.textContent='Correct — reading a DC control signal.'; return; }
    if(probeRed.kind==='dry_contact'){ readingEl.textContent='0.00'; unitEl.textContent='VDC'; msgEl.textContent='This is a dry contact — no voltage. Use resistance mode.'; return; }
    if(probeRed.kind==='power_24vac'){ readingEl.textContent='0.0'; unitEl.textContent='VDC (AC present, wrong mode)'; msgEl.textContent='This circuit is AC — switch to VAC mode.'; return; }
    if(probeRed.sigType==='ma'){ readingEl.textContent='0.0'; unitEl.textContent='VDC (wrong mode)'; msgEl.textContent='This is a 4-20 mA loop, not voltage. Switch to mA.'; return; }
    readingEl.textContent='0.00'; unitEl.textContent='VDC'; return;
  }
  if(meterMode==='vac'){
    if(!same){ readingEl.textContent='0.0'; unitEl.textContent='VAC'; msgEl.textContent='No potential between these two points.'; return; }
    if(probeRed.kind==='power_24vac'){ readingEl.textContent=fmt(24+rnd(-0.4,0.4),1); unitEl.textContent='VAC'; msgEl.textContent='Correct — reading 24 VAC control power.'; return; }
    if(probeRed.kind==='triac_24vac' && probeBlack.kind==='triac_24vac'){ const diff = Math.abs(probeRed.valueFn()-probeBlack.valueFn()); readingEl.textContent=fmt(diff,1); unitEl.textContent='VAC'; msgEl.textContent = diff>1? 'One triac is actively energized.' : 'Neither triac is energized.'; return; }
    if(probeRed.kind==='triac_24vac' || probeBlack.kind==='triac_24vac'){ const t = probeRed.kind==='triac_24vac'? probeRed : probeBlack; const v = t.valueFn(); readingEl.textContent=fmt(v,1); unitEl.textContent='VAC'; msgEl.textContent = v>1? 'Correct — triac energized.' : 'Triac not energized.'; return; }
    if(probeRed.kind==='signal_elec'){ readingEl.textContent='0.0'; unitEl.textContent='VAC (DC present, wrong mode)'; msgEl.textContent='This circuit is DC — switch to VDC mode.'; return; }
    readingEl.textContent='0.0'; unitEl.textContent='VAC'; return;
  }
}

function refreshVavMeter(){
  document.getElementById('vavProbeRedName').textContent = vavProbeRed? (vavProbeRed.id+' \u2014 '+vavProbeRed.name) : 'not connected';
  document.getElementById('vavProbeBlackName').textContent = vavProbeBlack? (vavProbeBlack.id+' \u2014 '+vavProbeBlack.name) : 'not connected';
  const screen = document.getElementById('vavMeterScreen');
  const readingEl = document.getElementById('vavMeterReading');
  const unitEl = document.getElementById('vavMeterUnit');
  const msgEl = document.getElementById('vavMeterMsg');
  const replaceBtn = document.getElementById('btnReplaceVavMeter');

  if(vavMeterDamaged){
    screen.classList.add('damaged');
    readingEl.textContent='\u2620 OL'; unitEl.textContent='METER DAMAGED';
    msgEl.textContent='Internal fuse blown. Replace the meter to continue.';
    replaceBtn.style.display='inline-block';
    return;
  }
  replaceBtn.style.display='none';
  screen.classList.remove('damaged');

  if(!vavProbeRed || !vavProbeBlack){ readingEl.textContent='- - -'; unitEl.textContent=''; msgEl.textContent='Connect both probes to take a reading.'; return; }

  const same = sameCircuit(vavProbeRed, vavProbeBlack);
  const energized = !sim || sim.enabled;

  function damage(msg){
    vavMeterDamaged = true;
    renderVavTerminalBoard();
    readingEl.textContent='\u2620 OL'; unitEl.textContent='METER DAMAGED'; msgEl.textContent=msg;
    screen.classList.add('damaged');
    replaceBtn.style.display='inline-block';
  }

  const bridging = vavProbeRed.id===vavProbeBlack.id && disconnectedVavTerminals.has(vavProbeRed.id);
  const eitherDisconnected = disconnectedVavTerminals.has(vavProbeRed.id) || disconnectedVavTerminals.has(vavProbeBlack.id);
  if(bridging){
    const t = vavProbeRed;
    if(vavMeterMode==='ma'){
      if(t.sigType==='ma'){ const c = convertSignal(t.valueFn(), t.sigType); readingEl.textContent = fmt(c.value,2); unitEl.textContent='mA'; msgEl.textContent = 'Correct technique — bridging the loop.'; return; }
      readingEl.textContent='0.00'; unitEl.textContent='mA'; return;
    }
    if(vavMeterMode==='vdc' && t.kind==='signal_elec' && t.sigType==='vdc'){ const c = convertSignal(t.valueFn(), t.sigType); readingEl.textContent=fmt(c.value,c.digits); unitEl.textContent='VDC'; msgEl.textContent='Reading through the bridge at '+t.id+'.'; return; }
    readingEl.textContent = vavMeterMode==='ohm'? 'OL':'0.00';
    unitEl.textContent = vavMeterMode==='ohm'? '\u03a9':vavMeterMode.toUpperCase();
    return;
  }
  if(eitherDisconnected && sameCircuit(vavProbeRed,vavProbeBlack)){
    const brokenId = disconnectedVavTerminals.has(vavProbeRed.id)? vavProbeRed.id : vavProbeBlack.id;
    readingEl.textContent = vavMeterMode==='ohm'? 'OL':'0.00';
    unitEl.textContent = vavMeterMode==='ohm'? '\u03a9 (open circuit)':vavMeterMode.toUpperCase();
    msgEl.textContent = 'Open circuit at '+brokenId+'.';
    return;
  }

  if(vavMeterMode==='ohm'){
    if(energized && (isLive(vavProbeRed) || isLive(vavProbeBlack))){ damage('Resistance measured across an energized circuit.'); return; }
    if(!same){ readingEl.textContent='OL'; unitEl.textContent='\u03a9 (open circuit)'; msgEl.textContent='No continuity.'; return; }
    readingEl.textContent = fmt(rnd(180,420),0); unitEl.textContent='\u03a9 (actuator coil)'; msgEl.textContent='De-energized coil resistance.';
    return;
  }
  if(vavMeterMode==='ma'){
    if((isLive(vavProbeRed)||isLive(vavProbeBlack)) && !same){ damage('Current mode across a voltage source.'); return; }
    if(!same){ readingEl.textContent='0.00'; unitEl.textContent='mA'; msgEl.textContent='No loop current.'; return; }
    if(vavProbeRed.sigType==='ma'){ damage('Current mode in parallel across a live 4-20 mA signal.'); return; }
    readingEl.textContent='0.00'; unitEl.textContent='mA'; msgEl.textContent='Not a current loop.'; return;
  }
  if(vavMeterMode==='vdc'){
    if(!same){ readingEl.textContent='0.00'; unitEl.textContent='VDC'; msgEl.textContent='No potential.'; return; }
    if(vavProbeRed.kind==='signal_elec' && vavProbeRed.sigType==='vdc'){ const c = convertSignal(vavProbeRed.valueFn(), vavProbeRed.sigType); readingEl.textContent=fmt(c.value,c.digits); unitEl.textContent='VDC'; msgEl.textContent='Correct — DC signal.'; return; }
    if(vavProbeRed.kind==='power_24vac' || vavProbeRed.kind==='triac_24vac'){ readingEl.textContent='0.0'; unitEl.textContent='VDC (AC present)'; msgEl.textContent='This is AC — use VAC mode.'; return; }
    if(vavProbeRed.sigType==='ma'){ readingEl.textContent='0.0'; unitEl.textContent='VDC (wrong mode)'; msgEl.textContent='This is a 4-20 mA loop.'; return; }
    readingEl.textContent='0.00'; unitEl.textContent='VDC'; return;
  }
  if(vavMeterMode==='vac'){
    if(!same){ readingEl.textContent='0.0'; unitEl.textContent='VAC'; msgEl.textContent='No potential.'; return; }
    if(vavProbeRed.kind==='power_24vac'){ readingEl.textContent=fmt(24+rnd(-0.4,0.4),1); unitEl.textContent='VAC'; msgEl.textContent='Correct \u2014 24 VAC supply.'; return; }
    if(vavProbeRed.kind==='triac_24vac' && vavProbeBlack.kind==='triac_24vac'){ const diff = Math.abs(vavProbeRed.valueFn()-vavProbeBlack.valueFn()); readingEl.textContent=fmt(diff,1); unitEl.textContent='VAC'; msgEl.textContent = diff>1? 'Triac energized.' : 'Triac idle.'; return; }
    if(vavProbeRed.kind==='triac_24vac' || vavProbeBlack.kind==='triac_24vac'){ const t = vavProbeRed.kind==='triac_24vac'? vavProbeRed : vavProbeBlack; const v = t.valueFn(); readingEl.textContent=fmt(v,1); unitEl.textContent='VAC'; msgEl.textContent = v>1? 'Triac energized.' : 'Triac idle.'; return; }
    if(vavProbeRed.kind==='signal_elec'){ readingEl.textContent='0.0'; unitEl.textContent='VAC (DC present)'; msgEl.textContent='This is DC — use VDC mode.'; return; }
    readingEl.textContent='0.0'; unitEl.textContent='VAC'; return;
  }
}
