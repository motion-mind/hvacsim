/* ============================================================
   FAULT CATALOG
   ============================================================ */
function buildFaultCatalog(){
  faultsCatalog = [
    {id:'preheatValveStuck', label:'Preheat Valve Stuck Closed', cat:'Equipment Fault', applies:c=>c.preheat,
      apply:()=>{activeFaults.preheatValveStuck=0;}, desc:'The preheat coil control valve has failed and is stuck fully closed. Preheat discharge temperature will not respond to the control loop and will track entering air temperature, risking a freezestat trip in cold weather.'},
    {id:'preheatValveOpen', label:'Preheat Valve Stuck Open', cat:'Equipment Fault', applies:c=>c.preheat,
      apply:()=>{activeFaults.preheatValveStuck=100;}, desc:'The preheat valve is stuck fully open, continuously heating entering air regardless of setpoint. Downstream cooling coil will have to work harder, and mixed/preheat temperature readings will run high.'},
    {id:'preheatNoFlow', label:'Preheat Coil \u2014 Loss of Hot Water Flow', cat:'Equipment Fault', applies:c=>c.preheat,
      apply:()=>{activeFaults.preheatNoFlow=true;}, desc:'Hot water circulation to the preheat coil has been lost (failed pump, closed isolation valve, air-bound coil). The valve will drive fully open trying to reach setpoint but leaving temperature will not rise.'},
    {id:'coil1ValveStuck', label:'Cooling Coil Valve Stuck Closed', cat:'Equipment Fault', applies:c=>true,
      apply:()=>{activeFaults.coil1ValveStuck=0;}, desc:'The primary cooling coil valve is stuck closed. No mechanical cooling will occur; supply air temperature will track upstream (fan/preheat) temperature.'},
    {id:'coil1NoFlow', label:'Cooling Coil \u2014 Loss of Chilled Water Flow', cat:'Equipment Fault', applies:c=>true,
      apply:()=>{activeFaults.coil1NoFlow=true;}, desc:'Chilled water flow to the cooling coil has been lost. The valve opens fully attempting to reach setpoint, but leaving air temperature will not fall.'},
    {id:'satSensorDrift', label:'Discharge Air Temperature Sensor Calibration Drift', cat:'Equipment Fault', applies:c=>c.ductType!=='dual',
      apply:()=>{activeFaults.satSensorDrift=true;}, desc:'The discharge air temperature sensor has drifted out of calibration, reading warmer than the air actually is. The cooling coil control loop trusts that reading, so it keeps the valve open trying to "reach" a setpoint it already passed \u2014 overcooling the real supply air while the DDC graphics still show a plausible number.'},
    {id:'coil2ValveStuck', label:'2nd Stage Cooling Coil Valve Stuck Closed', cat:'Equipment Fault', applies:c=>c.coolingCoils==='dual',
      apply:()=>{activeFaults.coil2ValveStuck=0;}, desc:'The second cooling coil valve is stuck closed. On high load days the first stage will saturate at 100% and the discharge temperature will not reach setpoint.'},
    {id:'reheatValveStuck', label:'Reheat Valve Stuck Closed', cat:'Equipment Fault', applies:c=>c.reheat && c.ductType==='single',
      apply:()=>{activeFaults.reheatValveStuck=0;}, desc:'The reheat valve is stuck closed. Space temperature will drift below setpoint any time the cooling coil is delivering air colder than the space needs.'},
    {id:'reheatValveOpen', label:'Reheat Valve Stuck Open', cat:'Equipment Fault', applies:c=>c.reheat && c.ductType==='single',
      apply:()=>{activeFaults.reheatValveStuck=100;}, desc:'The reheat valve is stuck fully open, continuously heating supply air. Space temperature will drift high and energy use will spike.'},
    {id:'reheatNoFlow', label:'Reheat Coil \u2014 Loss of Hot Water Flow', cat:'Equipment Fault', applies:c=>c.reheat && c.ductType==='single',
      apply:()=>{activeFaults.reheatNoFlow=true;}, desc:'Hot water flow to the reheat coil has been lost. Space temperature will drift cold with the valve reading fully open on the graphic.'},
    {id:'hotDeckValveStuck', label:'Hot Deck Heating Valve Stuck Closed', cat:'Equipment Fault', applies:c=>c.ductType==='dual',
      apply:()=>{activeFaults.hotDeckValveStuck=0;}, desc:'The dual duct hot deck heating valve is stuck closed. Hot deck discharge temperature will track fan discharge temperature and heating zones will be starved of heat.'},
    {id:'hotDeckFanWallOneFail', label:'One Hot Deck Fan-Wall Motor Fails', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent && c.supplyFan==='wall',
      apply:()=>{ if(sim.hotDeckFans.length) sim.hotDeckFans[0].fail=true; }, desc:'One motor in the hot deck\'s dedicated fan wall has failed, reducing hot deck airflow capacity proportionally since it runs independently of the cold deck fans.'},
    {id:'hotDeckFanSingleFail', label:'Hot Deck Fan Motor Failure', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent && c.supplyFan==='single',
      apply:()=>{ sim.hotDeckFans=[{id:1,fail:true,run:false}]; }, desc:'The hot deck\'s dedicated fan motor has failed. Since the hot deck runs independently of the cold deck in this configuration, hot deck airflow will drop to zero while the cold deck keeps running.'},
    {id:'hotOaDamperStuckClosed', label:'Hot Deck Outside Air Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent && c.airSystem==='return',
      apply:()=>{activeFaults.hotOaDamperStuck=0;}, desc:'The hot deck\'s own outside air damper is stuck fully closed. Because this deck has a totally independent air path, this only affects the hot deck \u2014 its outside air CFM will read near zero while the cold deck is unaffected.'},
    {id:'hotOaDamperStuckOpen', label:'Hot Deck Outside Air Damper Stuck Open', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent && c.airSystem==='return',
      apply:()=>{activeFaults.hotOaDamperStuck=100;}, desc:'The hot deck\'s own outside air damper is stuck fully open, driving up heating load on that deck independent of the cold deck.'},
    {id:'hotDeckDirtyFilter', label:'Hot Deck \u2014 Dirty / Clogged Filter', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent,
      apply:()=>{activeFaults.hotDeckDirtyFilter=true;}, desc:'The hot deck\'s own filter bank is heavily loaded with dirt. Since this deck has independent ductwork, only its airflow capacity is reduced \u2014 the cold deck is unaffected.'},
    {id:'hotFreezestatNuisance', label:'Hot Deck Freezestat Sensing Element Fault (Nuisance Trip)', cat:'Equipment Fault', applies:c=>c.ductType==='dual' && c.dualDuctIndependent && c.includeOa,
      apply:()=>{ latched.hotFreezestat=true; }, desc:'The hot deck\'s own low temperature detector has faulted or drifted, causing a nuisance trip even though conditions on that deck are actually safe.'},
    {id:'boosterPumpFail', label:'Preheat Water Booster Pump Fails to Run', cat:'Equipment Fault', applies:c=>c.preheat && c.preheatBoosterPump,
      apply:()=>{activeFaults.boosterPumpFail=true;}, desc:'The preheat hot water booster pump has failed to start when called. Circulation through the preheat coil drops off, so leaving air temperature will not rise even though the valve is calling for heat.'},
    {id:'preheatBoilerFail', label:'Preheat Boiler / Heat Source Failure (Low Water Temperature)', cat:'Equipment Fault', applies:c=>c.preheat,
      apply:()=>{activeFaults.preheatBoilerFail=true;}, desc:'The heat source feeding the preheat hot water loop has failed or is off line.'},
    {id:'supplyDamperStuck', label:'Supply Duct Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.driveType==='starter',
      apply:()=>{activeFaults.supplyDamperStuck=0;}, desc:'The modulating supply duct damper (used because this unit has constant-speed motor starters rather than VFDs) is stuck closed.'},
    {id:'coldDeckDamperStuckClosed', label:'Cold Deck Regulating Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.ductType==='dual',
      apply:()=>{activeFaults.coldDeckDamperStuck=0;}, desc:'Cold deck supply airflow will drop even though the fan and coil are otherwise working normally.'},
    {id:'coldDeckDamperStuckOpen', label:'Cold Deck Regulating Damper Stuck Open', cat:'Equipment Fault', applies:c=>c.ductType==='dual',
      apply:()=>{activeFaults.coldDeckDamperStuck=100;}, desc:'The regulating damper downstream of the cooling coil is stuck fully open.'},
    {id:'hotDeckDamperStuckClosed', label:'Hot Deck Regulating Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.ductType==='dual',
      apply:()=>{activeFaults.hotDeckDamperStuck=0;}, desc:'Hot deck airflow will drop even though the fan and coil are otherwise working normally.'},
    {id:'hotDeckDamperStuckOpen', label:'Hot Deck Regulating Damper Stuck Open', cat:'Equipment Fault', applies:c=>c.ductType==='dual',
      apply:()=>{activeFaults.hotDeckDamperStuck=100;}, desc:'The regulating damper downstream of the hot deck heating coil is stuck fully open.'},
    {id:'humidValveStuck', label:'Steam Humidifier Valve Stuck Closed', cat:'Equipment Fault', applies:c=>c.steamHumid && c.ductType==='single',
      apply:()=>{activeFaults.humidValveStuck=0;}, desc:'The steam humidifier valve is stuck closed. Supply air humidity will run low regardless of the humidity setpoint.'},
    {id:'humidNoSteam', label:'Steam Humidifier \u2014 Loss of Steam Supply', cat:'Equipment Fault', applies:c=>c.steamHumid && c.ductType==='single',
      apply:()=>{activeFaults.humidNoSteam=true;}, desc:'Steam supply to the humidifier has been lost.'},
    {id:'oaDamperStuckClosed', label:'Outside Air Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.airSystem==='return',
      apply:()=>{activeFaults.oaDamperStuck=0;}, desc:'The outside air damper is stuck fully closed.'},
    {id:'oaDamperStuckOpen', label:'Outside Air Damper Stuck Open', cat:'Equipment Fault', applies:c=>c.airSystem==='return',
      apply:()=>{activeFaults.oaDamperStuck=100;}, desc:'The outside air damper is stuck fully open.'},
    {id:'eaDamperStuckClosed', label:'Exhaust Air Damper Stuck Closed', cat:'Equipment Fault', applies:c=>c.airSystem==='return',
      apply:()=>{activeFaults.eaDamperStuck=0;}, desc:'The exhaust/relief air damper is stuck fully closed.'},
    {id:'eaDamperStuckOpen', label:'Exhaust Air Damper Stuck Open', cat:'Equipment Fault', applies:c=>c.airSystem==='return',
      apply:()=>{activeFaults.eaDamperStuck=100;}, desc:'The exhaust/relief air damper is stuck fully open.'},
    {id:'supplyFanSingleFail', label:'Supply Fan Motor Failure', cat:'Equipment Fault', applies:c=>c.supplyFan==='single',
      apply:()=>{ sim.supplyFans=[{id:1,fail:true,run:false}]; }, desc:'The single supply fan motor has failed to start.'},
    {id:'supplyFanWallOneFail', label:'One Supply Fan-Wall Motor Fails', cat:'Equipment Fault', applies:c=>c.supplyFan==='wall',
      apply:()=>{ if(sim.supplyFans.length) sim.supplyFans[0].fail=true; }, desc:'One motor in the supply fan wall has failed.'},
    {id:'returnFanSingleFail', label:'Return Fan Motor Failure', cat:'Equipment Fault', applies:c=>c.returnFan==='single' && c.airSystem==='return',
      apply:()=>{ sim.returnFans=[{id:1,fail:true,run:false}]; }, desc:'The single return fan motor has failed.'},
    {id:'returnFanWallOneFail', label:'One Return Fan-Wall Motor Fails', cat:'Equipment Fault', applies:c=>c.returnFan==='wall' && c.airSystem==='return',
      apply:()=>{ if(sim.returnFans.length) sim.returnFans[0].fail=true; }, desc:'One motor in the return fan wall has failed.'},
    {id:'dirtyFilter', label:'Dirty / Clogged Air Filter', cat:'Equipment Fault', applies:c=>true,
      apply:()=>{activeFaults.dirtyFilter=true;}, desc:'The air filter bank is heavily loaded with dirt, restricting airflow.'},
    {id:'freezestatNuisance', label:'Freezestat Sensing Element Fault (Nuisance Trip)', cat:'Equipment Fault', applies:c=>c.includeOa,
      apply:()=>{ latched.freezestat=true; }, desc:'The low temperature detector (freezestat) sensing element has faulted or drifted, causing a nuisance trip.'},
    {id:'aquastatNuisance', label:'Preheat Aquastat Sensing Element Fault (Nuisance Trip)', cat:'Equipment Fault', applies:c=>c.preheat && c.preheatAquastat,
      apply:()=>{ latched.aquastat=true; }, desc:'The preheat water low-temperature aquastat has faulted or drifted.'},
    {id:'oaHighHumidity', label:'Extreme Humidity Event (Monsoon / Tropical Air Mass)', cat:'Extreme Weather', applies:c=>true,
      apply:()=>{ sim.oaRHTarget=0.92; sim.oaRH=0.92; document.getElementById('oaRhSlider').value=92; syncOaRhReadout(); }, desc:'Outside air relative humidity is pinned near saturation.'},
    {id:'oaVeryDry', label:'Extreme Dry Air Event (Arid Air Mass)', cat:'Extreme Weather', applies:c=>true,
      apply:()=>{ sim.oaRHTarget=0.12; sim.oaRH=0.12; document.getElementById('oaRhSlider').value=12; syncOaRhReadout(); }, desc:'Outside air relative humidity is very low.'},
    {id:'fireAlarm', label:'General Fire Alarm Activation', cat:'Emergency', applies:c=>true,
      apply:()=>{ manualSafety.fireAlarm=true; }, desc:'A general fire alarm signal has been received.'},
    {id:'smokeDamperFail', label:'Smoke Damper Fails to Prove Open', cat:'Emergency', applies:c=>true,
      apply:()=>{ manualSafety.smokeDamperFail=true; }, desc:'The smoke damper end switch is not proving the damper open.'},
    {id:'doorOpen', label:'Access Door Safety Switch Open', cat:'Emergency', applies:c=>true,
      apply:()=>{ manualSafety.doorOpen=true; }, desc:'An access door safety switch is open.'},
    {id:'heatWave', label:'Extreme Heat Wave (Push OAT to 105-110\u00b0F)', cat:'Extreme Weather', applies:c=>true,
      apply:()=>{ sim.oatTarget=rnd(105,110); sim.oat=rnd(105,110); document.getElementById('oatSlider').value=sim.oatTarget; syncOatReadout(); }, desc:'An extreme heat wave has pushed outside air temperature to the top of the design range.'},
    {id:'deepFreeze', label:'Extreme Deep Freeze (Push OAT to 0-10\u00b0F)', cat:'Extreme Weather', applies:c=>true,
      apply:()=>{ sim.oatTarget=rnd(0,10); sim.oat=rnd(0,10); document.getElementById('oatSlider').value=sim.oatTarget; syncOatReadout(); }, desc:'An extreme deep-freeze event.'},
    {id:'steamBundleFouled', label:'Steam Bundle Heat Exchanger Fouling', cat:'Equipment Fault', applies:c=>c.preheat,
      apply:()=>{activeFaults.steamBundleFouled=true;}, desc:'The steam-to-hot-water heat exchanger tube bundle has suffered mineral fouling.'},
    {id:'staticPressureSensorDrift', label:'Supply Duct Static Pressure Sensor Drift (-0.6" w.g.)', cat:'Equipment Fault', applies:c=>c.driveType==='vfd',
      apply:()=>{activeFaults.staticPressureSensorDrift=true;}, desc:'The supply duct static pressure sensor has drifted and reads 0.6" w.g. lower than actual pressure.'},
    {id:'humidValveStuckOpen', label:'Steam Humidifier Valve Stuck Open', cat:'Equipment Fault', applies:c=>c.steamHumid && c.ductType==='single',
      apply:()=>{activeFaults.humidValveStuck=100;}, desc:'The steam humidifier valve is stuck 100% open.'},
    {id:'oatSensorDriftHigh', label:'Outside Air Temperature Sensor Drift (+15\u00b0F)', cat:'Equipment Fault', applies:c=>true,
      apply:()=>{activeFaults.oatSensorDriftHigh=true;}, desc:'The Outside Air Temperature sensor has drifted +15\u00b0F high.'},
    {id:'oatSensorDriftLow', label:'Outside Air Temperature Sensor Drift (-15\u00b0F)', cat:'Equipment Fault', applies:c=>true,
      apply:()=>{activeFaults.oatSensorDriftLow=true;}, desc:'The Outside Air Temperature sensor has drifted -15\u00b0F low.'},
    {id:'ratSensorDriftHigh', label:'Return Air Temperature Sensor Drift (+10\u00b0F)', cat:'Equipment Fault', applies:c=>c.airSystem==='return',
      apply:()=>{activeFaults.ratSensorDriftHigh=true;}, desc:'The Return Air Temperature sensor has drifted +10\u00b0F high.'}
  ];
}

function applicableFaults(){ return faultsCatalog.filter(f=>f.applies(config)); }

function populateFaultPicker(){
  const sel = document.getElementById('faultPicker');
  sel.innerHTML='';
  const groups = {};
  applicableFaults().forEach(f=>{
    groups[f.cat] = groups[f.cat]||[];
    groups[f.cat].push(f);
  });
  Object.keys(groups).forEach(cat=>{
    const og = document.createElement('optgroup'); og.label=cat;
    groups[cat].forEach(f=>{
      const opt=document.createElement('option'); opt.value=f.id; opt.textContent=f.label; og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function clearAllFaults(){
  activeFaults = {};
  manualSafety = {fireAlarm:false, smokeDamperFail:false, doorOpen:false};
  latched = {freezestat:false, highStatic:false, aquastat:false, hotFreezestat:false};
  freezestatRecovering = true;
  sim.supplyFans.forEach(f=>f.fail=false);
  sim.returnFans.forEach(f=>f.fail=false);
  sim.hotDeckFans.forEach(f=>f.fail=false);
  currentFaultDesc = [];
  renderActiveFaults();
}

function clearManualFaultsOnly(){
  activeFaults = {};
  sim.supplyFans.forEach(f=>f.fail=false);
  sim.returnFans.forEach(f=>f.fail=false);
  sim.hotDeckFans.forEach(f=>f.fail=false);
  currentFaultDesc = [];
  renderActiveFaults();
}

function applyFaultById(id){
  const f = faultsCatalog.find(x=>x.id===id);
  if(!f) return;
  f.apply();
  currentFaultDesc.push({label:f.label, desc:f.desc});
  renderActiveFaults();
}

function renderActiveFaults(){
  const list = document.getElementById('activeFaultList');
  const rb = document.getElementById('revealBox');
  if(activeScenario){
    list.innerHTML = '<span style="color:var(--text-faint);font-size:12px;">Scenario in progress \u2014 diagnose the system using its readings and control panel terminals (see the Troubleshooting Scenario panel above).</span>';
    rb.style.display='none';
    return;
  }
  if(currentFaultDesc.length===0){
    list.innerHTML = '<span style="color:var(--text-faint);font-size:12px;">No active faults \u2014 system nominal.</span>';
    rb.style.display='none';
    return;
  }
  list.innerHTML = currentFaultDesc.map(f=>'<div class="fault-item"><span class="fname">'+f.label+'</span><span style="color:var(--amber);font-size:11px;">ACTIVE</span></div>').join('');
  rb.style.display='block';
  document.getElementById('revealBody').innerHTML = currentFaultDesc.map(f=>'<div style="margin-bottom:8px;"><b style="color:var(--text);">'+f.label+':</b> '+f.desc+'</div>').join('');
}

/* ============================================================
   TROUBLESHOOTING SCENARIOS
   ============================================================ */
const scenarioCatalog = [
  { id:'summerSwelter', title:'Scenario 1: The Summer Swelter',
    narrative:'Trainees report that office spaces are climbing in temperature and getting stuffy. The DDC graphics show the cooling coil valve commanded to 100% (10V), but the air temperature leaving the Air Handler remains high. Find the culprit!',
    setup:{ damperSignal:'vdc', valveSignal:'vdc' }, setpoints:{}, faults:['coil1NoFlow'],
    solution:'The cooling coil valve is fully open and correctly commanded (10V = 100%), but chilled water flow to the coil has been lost \u2014 check the CHW isolation valves, the strainer for blockage, and confirm the chiller/pump is actually running.' },
  { id:'arcticBlast', title:'Scenario 2: The Arctic Blast',
    narrative:'Tenants are complaining that the building is freezing. The rooms are dropping to 64\u00b0F. Inspecting the Air Handler shows the supply fan running at 100% and discharge air temperature holding very low.',
    setup:{ controlType:'cfm', reheat:false }, setpoints:{ coolingDischargeSP:48 }, faults:['dirtyFilter'],
    solution:'Two separate problems: the cooling discharge setpoint has been left far too low (48\u00b0F instead of ~55\u00b0F), and a dirty filter is choking airflow.' },
  { id:'ventilationNightmare', title:'Scenario 3: Ventilation Nightmare',
    narrative:'Energy bills are skyrocketing and the cooling coil cannot keep up on hot humid afternoons. Mixed air temperature matches outdoor air temperature.',
    setup:{ airSystem:'return' }, setpoints:{}, faults:['oaDamperStuckOpen'],
    solution:'The outside air damper is mechanically stuck wide open.' },
  { id:'driftingSensor', title:'Scenario 4: The Drifting Sensor',
    narrative:'Trainees are complaining of very chilly drafts. The discharge air temp sensor reads 55\u00b0F, but the air leaving the diffuser feels much colder.',
    setup:{ ductType:'single', reheat:false, damperSignal:'vdc', valveSignal:'vdc' }, setpoints:{}, faults:['satSensorDrift'],
    solution:'The discharge air sensor has drifted and is reading warmer than the air actually is.' },
  { id:'weakPreheat', title:'Scenario 5: The Weak Preheat (Fouled Steam Bundle)',
    narrative:'In the middle of a winter freeze (OAT = 15\u00b0F), the preheat coil leaving air temperature is dropping dangerously close to the freezestat trip point (38\u00b0F).',
    setup:{ preheat:true, includeOa:true, airSystem:'return' }, setpoints:{ preheatDischargeSP:45 }, faults:['steamBundleFouled'],
    solution:'The steam-to-hot-water heat exchanger tube bundle has suffered severe fouling/scaling.' },
  { id:'tropicalDampness', title:'Scenario 6: Tropical Dampness (Humidifier Stuck Open)',
    narrative:'Occupants in single-duct zones are complaining of high humidity and damp smells.',
    setup:{ steamHumid:true, ductType:'single' }, setpoints:{ humidityMinSP:30, humidityMaxSP:60 }, faults:['humidValveStuckOpen'],
    solution:'The steam humidifier valve is stuck fully open.' },
  { id:'economizerGlitch', title:'Scenario 7: The Economizer Glitch (OAT Sensor Drift)',
    narrative:'It is a mild spring morning (OAT = 55\u00b0F) and the economizer is enabled, but the AHU is still running mechanical cooling.',
    setup:{ airSystem:'return', driveType:'vfd' }, setpoints:{ coolingDischargeSP:55 }, faults:['oatSensorDriftHigh'],
    solution:'The Outside Air Temperature sensor has drifted +15\u00b0F high.' },
  { id:'runawayStatic', title:'Scenario 8: Runaway Static Pressure (Sensor Drift)',
    narrative:'The unit has tripped on High Static Pressure safety contact, shutting down all fans.',
    setup:{ airSystem:'return', driveType:'vfd' }, setpoints:{ staticSP:1.5 }, faults:['staticPressureSensorDrift'],
    solution:'The supply duct static pressure sensor has drifted and is reading 0.6" w.g. lower than actual pressure.' },
  { id:'ratSensorDrift', title:'Scenario 9: The Ghost Heat (RAT Sensor Drift)',
    narrative:'On a cool autumn afternoon (OAT = 60\u00b0F), the economizer is enabled, but the outside air damper has driven to 100% open.',
    setup:{ airSystem:'return', driveType:'vfd', reheat:true }, setpoints:{ coolingDischargeSP:55 }, faults:['ratSensorDriftHigh'],
    solution:'The Return Air Temperature (RAT) sensor has drifted +10\u00b0F high.' }
];

function populateScenarioPicker(){
  const sel = document.getElementById('scenarioSelect');
  sel.innerHTML = '<option value="">\u2014 Choose a Scenario \u2014</option>' +
    scenarioCatalog.map(s=>'<option value="'+s.id+'">'+s.title+'</option>').join('');
}

function applyScenario(id){
  const sc = scenarioCatalog.find(s=>s.id===id);
  if(!sc) return;
  Object.keys(sc.setup||{}).forEach(k=>{ config[k] = sc.setup[k]; });
  renderSetupGrid();
  applyConfiguration();
  Object.keys(sc.setpoints||{}).forEach(k=>{ sp[k] = sc.setpoints[k]; });
  if(Object.keys(sc.setpoints||{}).length) renderSetpoints();
  activeScenario = sc;
  sc.faults.forEach(fid=>applyFaultById(fid));
  setEnabledUI(true);
  document.getElementById('scenarioBriefingTitle').textContent = sc.title;
  document.getElementById('scenarioBriefingText').textContent = sc.narrative;
  document.getElementById('scenarioBriefing').style.display = 'block';
  document.getElementById('scenarioSolutionText').style.display = 'none';
  document.getElementById('scenarioSolutionText').textContent = '';
  document.getElementById('btnRevealSolution').textContent = 'Reveal Solution';
  document.getElementById('btnEndScenario').style.display = 'inline-block';
  renderActiveFaults();
}

function endScenario(){
  activeScenario = null;
  clearAllFaults();
  document.getElementById('scenarioBriefing').style.display = 'none';
  document.getElementById('scenarioSelect').value = '';
  document.getElementById('btnEndScenario').style.display = 'none';
}

/* ============================================================
   VAV FAULT TYPES & SCENARIOS
   ============================================================ */
function vavFaultTypesFor(box){
  const common = [
    {id:'airflowSensorFault', label:'Airflow Sensor Failed (Reads Zero)',
      apply:(n)=>{activeFaults['vavAirflowSensorFault'+n]=true;},
      desc:'The zone airflow sensor has failed and reads zero.'},
    {id:'zoneSensorDrift', label:'Zone Temperature Sensor Drift (+8\u00b0F)',
      apply:(n)=>{activeFaults['vavZoneSensorDrift'+n]=true;},
      desc:'The zone temperature sensor has drifted and reads about 8\u00b0F warmer.'},
    {id:'zoneHumiditySensorFault', label:'Zone Humidity Sensor Drift (+20% RH)',
      apply:(n)=>{activeFaults['vavZoneHumiditySensorDrift'+n]=true;},
      desc:'The zone relative humidity sensor has drifted +20% RH high.'},
    {id:'vavPowerLost', label:'Controller Power Failure (Tripped Transformer)',
      apply:(n)=>{activeFaults['vavPowerLost'+n]=true;},
      desc:'The VAV box controller 24VAC transformer has tripped.'}
  ];
  if(!box) return common;
  if(box.type === 'fcu'){
    return [
      {id:'fcuFanFail', label:'Recirculating Blower Fan Motor Failure', apply:(n)=>{activeFaults['fcuFanFail'+n]=true;}, desc:'The local FCU blower motor has failed.'},
      {id:'fcuCoolValveStuckClosed', label:'Cooling Valve Stuck Closed', apply:(n)=>{activeFaults['fcuCoolValveStuck'+n]=0;}, desc:'The local chilled water control valve actuator is stuck closed.'},
      {id:'fcuCoolValveStuckOpen', label:'Cooling Valve Stuck Open', apply:(n)=>{activeFaults['fcuCoolValveStuck'+n]=100;}, desc:'The local chilled water control valve actuator is stuck wide open.'},
      {id:'fcuHeatValveStuckClosed', label:'Heating Valve Stuck Closed', apply:(n)=>{activeFaults['fcuHeatValveStuck'+n]=0;}, desc:'The local heating hot water control valve is stuck closed.'},
      {id:'fcuHeatValveStuckOpen', label:'Heating Valve Stuck Open', apply:(n)=>{activeFaults['fcuHeatValveStuck'+n]=100;}, desc:'The local hot water control valve is stuck wide open.'},
      ...common
    ];
  }
  if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
    const reheatFaults = config.vavReheatType==='electric'? [
      {id:'electricFailOff', label:'Electric Reheat Failed Off', apply:(n)=>{activeFaults['vavElectricFail'+n]=0;}, desc:'The electric reheat element has failed.'},
      {id:'electricFailOn', label:'Electric Reheat Failed On (Stuck Energized)', apply:(n)=>{activeFaults['vavElectricFail'+n]=100;}, desc:'The electric reheat element has failed stuck energized.'}
    ] : [
      {id:'reheatStuckClosed', label:'Hot Water Reheat Valve Stuck Closed', apply:(n)=>{activeFaults['vavReheatStuck'+n]=0;}, desc:'This box\'s hot water reheat valve is stuck closed.'},
      {id:'reheatStuckOpen', label:'Hot Water Reheat Valve Stuck Open', apply:(n)=>{activeFaults['vavReheatStuck'+n]=100;}, desc:'This box\'s hot water reheat valve is stuck wide open.'}
    ];
    return [
      {id:'damperStuckClosed', label:'Primary Air Damper Stuck Closed', apply:(n)=>{activeFaults['vavDamperStuck'+n]=0;}, desc:'This box\'s primary air damper is mechanically stuck closed.'},
      {id:'damperStuckOpen', label:'Primary Air Damper Stuck Open', apply:(n)=>{activeFaults['vavDamperStuck'+n]=100;}, desc:'This box\'s primary air damper is stuck wide open.'},
      {id:'exhaustDamperStuckClosed', label:'Exhaust Damper Stuck Closed', apply:(n)=>{activeFaults['vavExhaustDamperStuck'+n]=0;}, desc:'The exhaust tracking damper is mechanically stuck closed.'},
      {id:'exhaustDamperStuckOpen', label:'Exhaust Damper Stuck Open', apply:(n)=>{activeFaults['vavExhaustDamperStuck'+n]=100;}, desc:'The exhaust tracking damper is stuck wide open.'},
      ...reheatFaults,
      ...common
    ];
  }
  if(config.ductType==='dual'){
    return [
      {id:'coldDamperStuckClosed', label:'Cold Deck Damper Stuck Closed', apply:(n)=>{activeFaults['vavColdDamperStuck'+n]=0;}, desc:'This box\'s cold deck damper is stuck closed.'},
      {id:'coldDamperStuckOpen', label:'Cold Deck Damper Stuck Open', apply:(n)=>{activeFaults['vavColdDamperStuck'+n]=100;}, desc:'This box\'s cold deck damper is stuck wide open.'},
      {id:'hotDamperStuckClosed', label:'Hot Deck Damper Stuck Closed', apply:(n)=>{activeFaults['vavHotDamperStuck'+n]=0;}, desc:'This box\'s hot deck damper is stuck closed.'},
      {id:'hotDamperStuckOpen', label:'Hot Deck Damper Stuck Open', apply:(n)=>{activeFaults['vavHotDamperStuck'+n]=100;}, desc:'This box\'s hot deck damper is stuck wide open.'},
      ...common
    ];
  }
  const reheatFaults = config.vavReheatType==='electric'? [
    {id:'electricFailOff', label:'Electric Reheat Failed Off', apply:(n)=>{activeFaults['vavElectricFail'+n]=0;}, desc:'The electric reheat element has failed.'},
    {id:'electricFailOn', label:'Electric Reheat Failed On (Stuck Energized)', apply:(n)=>{activeFaults['vavElectricFail'+n]=100;}, desc:'The electric reheat element has failed stuck energized.'}
  ] : [
    {id:'reheatStuckClosed', label:'Hot Water Reheat Valve Stuck Closed', apply:(n)=>{activeFaults['vavReheatStuck'+n]=0;}, desc:'This box\'s hot water reheat valve is stuck closed.'},
    {id:'reheatStuckOpen', label:'Hot Water Reheat Valve Stuck Open', apply:(n)=>{activeFaults['vavReheatStuck'+n]=100;}, desc:'This box\'s hot water reheat valve is stuck wide open.'}
  ];
  return [
    {id:'damperStuckClosed', label:'Primary Air Damper Stuck Closed', apply:(n)=>{activeFaults['vavDamperStuck'+n]=0;}, desc:'This box\'s primary air damper is stuck closed.'},
    {id:'damperStuckOpen', label:'Primary Air Damper Stuck Open', apply:(n)=>{activeFaults['vavDamperStuck'+n]=100;}, desc:'This box\'s primary air damper is stuck wide open.'},
    ...reheatFaults,
    ...common
  ];
}

const vavScenarioCatalog = [
  { id:'vavFrozenZone', title:'VAV Scenario 1: The Frozen Zone',
    narrative:'Occupants in one zone are working in coats at their desks.', faultId: (box)=> config.ductType==='dual'? 'hotDamperStuckClosed' : (config.vavReheatType==='electric'? 'electricFailOff' : 'reheatStuckClosed'),
    solution:'The heating source for this box has failed to respond at all.' },
  { id:'vavOverheatedZone', title:'VAV Scenario 2: The Overheated Conference Room',
    narrative:'A conference room is running well above setpoint.', faultId: (box)=> config.ductType==='dual'? 'coldDamperStuckClosed' : 'damperStuckClosed',
    solution:'The primary (cold) air damper for this box is mechanically stuck closed.' },
  { id:'vavRunawayReheat', title:'VAV Scenario 3: Runaway Reheat',
    narrative:'A zone is overheating badly and energy use for that terminal unit is unusually high.', faultId: (box)=> config.ductType==='dual'? 'hotDamperStuckOpen' : (config.vavReheatType==='electric'? 'electricFailOn' : 'reheatStuckOpen'),
    solution:'The heating source is stuck fully on regardless of what the box is calling for.' },
  { id:'vavPowerOutage', title:'VAV Scenario 4: Tripped Controller Transformer',
    narrative:'A zone has completely disappeared from the BAS graphics.', faultId: (box)=> 'vavPowerLost',
    solution:'The 24VAC power supply transformer feeding this VAV controller has tripped.' },
  { id:'vavPressurizationFail', title:'VAV Scenario 5: Pressurization Failure',
    targetType:'vav-exhaust', narrative:'A hospital lab zone is set for negative pressure to contain contaminants, but alarms show the room pressure is running positive.', faultId: (box)=> 'exhaustDamperStuckClosed',
    solution:'The Exhaust VAV damper is stuck closed.' },
  { id:'fcuSeizedFan', title:'VAV Scenario 6: Seized Recirculating Fan',
    targetType:'fcu', narrative:'Occupants in an FCU-fed zone report that the air is stagnant.', faultId: (box)=> 'fcuFanFail',
    solution:'The local recirculating fan inside the Fan Coil Unit has failed.' },
  { id:'vavOrHumidityGlitch', title:'VAV Scenario 7: Operating Room Setpoint Reset Glitch',
    targetType:'or', narrative:'Occupants in Operating Room OR-1 report that the room is too warm.', faultId: (box)=> 'zoneHumiditySensorFault',
    solution:'The OR relative humidity sensor has drifted +20% RH high.' }
];
