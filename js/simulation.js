/* ============================================================
   SIMULATION ENGINE — buildSimState, tick, tickVav, tickExhaustFan
   ============================================================ */
const DT = 1;
const DAMPER_SLEW = 100 / 90;

function slew(current, target, maxStepPerSec){
  if(isNaN(target)) return isNaN(current)? 0 : current;
  if(isNaN(current)) return target;
  const d = target-current;
  if(d> maxStepPerSec) return current+maxStepPerSec;
  if(d< -maxStepPerSec) return current-maxStepPerSec;
  return target;
}

function fanWallCapacityFraction(list){
  if(!list.length) return 0;
  const running = list.filter(f=>!f.fail).length;
  return running/list.length;
}

function getAgeLoss(age){
  if(age <= 0) return 0;
  if(age <= 5) return 0 + (age - 0) * (2 / 5);
  if(age <= 10) return 2 + (age - 5) * (3 / 5);
  if(age <= 15) return 5 + (age - 10) * (5 / 5);
  if(age <= 20) return 10 + (age - 15) * (5 / 5);
  if(age <= 30) return 15 + (age - 20) * (10 / 10);
  if(age <= 40) return 25 + (age - 30) * (10 / 10);
  return 35 + (age - 40) * (10 / 10);
}

function getAhuBaseEfficiency(oat, oaRH, hasVfd){
  const rh = oaRH * 100;
  const econActive = sim && sim.economizerEnabled;
  if(oat <= 50){
    return {
      eff: hasVfd ? 95 : 60,
      driver: "Free Cooling: Hydronic valve shuts down entirely. No plant energy used.",
      state: hasVfd ? "Max Savings" : "Low Savings"
    };
  } else if(oat <= 65){
    return {
      eff: (hasVfd && econActive) ? 90 : 65,
      driver: econActive ? "Economizer Window: Air satisfies space; water valve closed." : "Economizer Disabled: Forced mechanical cooling.",
      state: (hasVfd && econActive) ? "High Efficiency" : "Moderate Penalty"
    };
  } else if(oat <= 90){
    return {
      eff: (hasVfd && econActive) ? 80 : 45,
      driver: "Sensible + Latent Blend: Max water flow required.",
      state: (hasVfd && econActive) ? "Optimized Flow" : "Severe Flow Penalty"
    };
  } else {
    return {
      eff: hasVfd ? 70 : 35,
      driver: "Low Delta-T Syndrome: Return water warm, pumping efficiency collapses.",
      state: hasVfd ? "Managed Saturation" : "Coil Saturation"
    };
  }
}

function buildSimState(){
  config.supplyFan = config.supplyFanCount > 1 ? 'wall' : 'single';
  if(config.airSystem==='oa100'){ config.returnFanCount = 1; }
  config.returnFan = config.returnFanCount > 1 ? 'wall' : 'single';

  sim = {
    enabled:false,
    economizerEnabled: sim ? (sim.economizerEnabled !== undefined ? sim.economizerEnabled : true) : true,
    economizerActive: false,
    economizerLowLimitAllowed: true,
    dehumidEnabled: config.dehumidEnabled !== undefined ? config.dehumidEnabled : true,
    humidEnabled: sim ? (sim.humidEnabled !== undefined ? sim.humidEnabled : true) : true,
    oat: clamp(sim? sim.oat:55, 0,110),
    oatTarget: clamp(sim? sim.oat:55, 0,110),
    age: clamp(sim? sim.age:0, 0, 50),
    ageTarget: clamp(sim? sim.age:0, 0, 50),
    oaRH:0.5, oaRHTarget:0.5, raRH:0.5, raTemp:72,
    supplyCfm:0, returnCfm:0, oaCfm:0, staticPressure:0,
    maTemp:72, preheatLvg:72, coil1Lvg:72, coil2Lvg:72, saTemp:72, satDisplayTemp:72, coldDeckTemp:72, hotDeckTemp:72,
    spaceTemp:72, saRH:0.3, W_supply:0,
    preheatValve:0, coil1Valve:0, coil2Valve:0, reheatValve:0, humidValve:0, hotDeckValve:0,
    oaDamperPos:0, raDamperPos:100, fireDamperPos:0, supplyDamperPos:0, eaDamperPos:0, exhaustCfm:0,
    coldDeckDamperPos:0, hotDeckDamperPos:0,
    hotOaDamperPos:0, hotRaDamperPos:100, hotOaCfm:0, hotMaTemp:72,
    supplyFanPct:0, returnFanPct:0, hotDeckFanPct:0,
    boosterPumpRun:false, preheatWaterTemp:WATER.phw, hotDeckCfm:0,
    supplyFans:[], returnFans:[], hotDeckFans:[],
    overrideSupplyFanSpeed: false, overrideSupplyFanSpeedVal: 0,
    overrideSupplyFanStart: false, overrideSupplyFanStartVal: false,
    overrideReturnFanSpeed: false, overrideReturnFanSpeedVal: 0,
    overrideReturnFanStart: false, overrideReturnFanStartVal: false,
    overrideHotDeckFanSpeed: false, overrideHotDeckFanSpeedVal: 0,
    overrideHotDeckFanStart: false, overrideHotDeckFanStartVal: false,
    pid: {
      supplyFlow: new PID(0.008,0.004,0,0,100),
      staticP: new PID(18,2.5,0,0,100),
      supplyDamper: new PID(0.008,0.004,0,0,100),
      oaDamper: new PID(0.006,0.003,0,0,100),
      hotOaDamper: new PID(0.006,0.003,0,0,100),
      returnFlow: new PID(0.007,0.003,0,0,100),
      hotDeckFlow: new PID(0.008,0.004,0,0,100),
      preheat: new PID(1.2,0.05,0,0,100),
      coil1: new PID(2,0.3,0,0,100),
      coil2: new PID(2,0.3,0,0,100),
      hotDeck: new PID(0.6,0.02,0,0,100),
      reheat: new PID(2.4,0.4,0,0,100),
      humid: new PID(1.2,0.2,0,0,100)
    }
  };
  if(config.supplyFan==='wall'){
    for(let i=0;i<config.supplyFanCount;i++) sim.supplyFans.push({id:i+1, fail:false, run:false});
  }
  if(config.returnFan==='wall' && config.airSystem!=='oa100'){
    for(let i=0;i<config.returnFanCount;i++) sim.returnFans.push({id:i+1, fail:false, run:false});
  }
  if(config.ductType==='dual' && config.dualDuctIndependent && config.supplyFan==='wall'){
    for(let i=0;i<config.supplyFanCount;i++) sim.hotDeckFans.push({id:i+1, fail:false, run:false});
  }
  sim.vav = [];
  let zoneIndex = 1;
  for(let i=0; i<config.vavCount; i++){
    sim.vav.push({
      id: 'VAV-' + (i+1), type: 'vav', zoneIndex: zoneIndex++,
      zoneTemp: 72, zoneDisplayTemp: 72, zoneSP: 72,
      damperPos: 10, coldDamperPos: 10, hotDamperPos: 0, reheatValve: 0, electricStage: 0,
      airflowCfm: 0, airflowDisplayCfm: 0, dischargeTemp: 55,
      pid: { cool: new PID(6,1,0,0,100), heat: new PID(6,1,0,0,100) }
    });
  }
  for(let i=0; i<config.vavsExhaustCount; i++){
    sim.vav.push({
      id: 'ExVAV-' + (i+1), type: 'vav-exhaust', zoneIndex: zoneIndex++,
      zoneTemp: 72, zoneDisplayTemp: 72, zoneSP: 72,
      pressurize: 'positive',
      damperPos: 10, coldDamperPos: 10, hotDamperPos: 0, exhaustDamperPos: 10, reheatValve: 0, electricStage: 0,
      airflowCfm: 0, airflowDisplayCfm: 0, exhaustAirflowCfm: 0, dischargeTemp: 55,
      pid: { cool: new PID(6,1,0,0,100), heat: new PID(6,1,0,0,100) }
    });
  }
  for(let i=0; i<config.fcuCount; i++){
    sim.vav.push({
      id: 'FCU-' + (i+1), type: 'fcu', zoneIndex: zoneIndex++,
      zoneTemp: 72, zoneDisplayTemp: 72, zoneSP: 72,
      fanSpeed: 10, coolingValve: 0, heatingValve: 0,
      airflowCfm: 0, airflowDisplayCfm: 0, dischargeTemp: 72,
      pid: { cool: new PID(6,1,0,0,100), heat: new PID(6,1,0,0,100) }
    });
  }
  for(let i=0; i<config.orCount; i++){
    sim.vav.push({
      id: 'OR-' + (i+1), type: 'or', zoneIndex: zoneIndex++,
      zoneTemp: 72, zoneDisplayTemp: 72, zoneSP: 72,
      zoneHumid: 45, zoneDisplayHumid: 45,
      pressurize: 'positive',
      damperPos: 10, coldDamperPos: 10, hotDamperPos: 0, exhaustDamperPos: 10, reheatValve: 0, electricStage: 0,
      airflowCfm: 0, airflowDisplayCfm: 0, exhaustAirflowCfm: 0, dischargeTemp: 55,
      pid: { cool: new PID(6,1,0,0,100), heat: new PID(6,1,0,0,100) }
    });
  }
  for(let i=0; i<config.prCount; i++){
    sim.vav.push({
      id: 'PR-' + (i+1), type: 'pr', zoneIndex: zoneIndex++,
      zoneTemp: 72, zoneDisplayTemp: 72, zoneSP: 72,
      zoneHumid: 45, zoneDisplayHumid: 45,
      pressurize: 'positive',
      damperPos: 10, coldDamperPos: 10, hotDamperPos: 0, exhaustDamperPos: 10, reheatValve: 0, electricStage: 0,
      airflowCfm: 0, airflowDisplayCfm: 0, exhaustAirflowCfm: 0, dischargeTemp: 55,
      pid: { cool: new PID(6,1,0,0,100), heat: new PID(6,1,0,0,100) }
    });
  }
  if(sim.vav.length > 0){
    const weights = sim.vav.map(() => 0.5 + Math.random());
    const weightSum = weights.reduce((a,b) => a+b, 0);
    const totalDesignCfm = sp.maxCfmSP;
    sim.vav.forEach((box, i) => {
      box.designCfm = Math.max(Math.round((weights[i] / weightSum) * totalDesignCfm / 50) * 50, 100);
      box.zoneTemp = 65 + Math.random() * 15;
      box.zoneSP   = 65 + Math.random() * 15;
      box.zoneDisplayTemp = box.zoneTemp;
      box.zoneHumid = 40 + Math.random() * 25;
      box.zoneDisplayHumid = box.zoneHumid;
    });
  }
  if(config.vavsExhaustCount > 0 || config.orCount > 0 || config.prCount > 0){
    sim.ef = {
      fanA: { run: false, fail: false, damperPos: 0, endSwitch: false },
      fanB: { run: false, fail: false, damperPos: 0, endSwitch: false },
      activeFan: 'A', switching: false, faultTimer: 0, cfm: 0
    };
  } else { sim.ef = null; }

  activeFaults = {};
  manualSafety = {fireAlarm:false, smokeDamperFail:false, doorOpen:false};
  latched = {freezestat:false, highStatic:false, aquastat:false, hotFreezestat:false};
}

function tick(){
  if(!sim) return;
  window.simTickCount = (window.simTickCount || 0) + 1;
  const age = sim.age || 0;
  const ageLossPct = getAgeLoss(age);
  const coilEff = 0.85 * (1 - (ageLossPct / 100) * 0.35);
  let drift = 0;
  if(age >= 10){ drift = Math.sin(window.simTickCount * 0.05) * 4; }

  // Ramp sliders toward their targets over ~120s
  sim.oat = slew(sim.oat, sim.oatTarget, 110 / 120);
  sim.oaRH = slew(sim.oaRH, sim.oaRHTarget, 1 / 120);
  sim.age = slew(sim.age, sim.ageTarget, 50 / 120);

  const fireAlarm = manualSafety.fireAlarm;
  const smokeDamperProven = !manualSafety.smokeDamperFail;
  const doorClosed = !manualSafety.doorOpen;
  const controllerPowerOK = !isWireDisconnected('Power (Hot)') && !isWireDisconnected('Power (Common)');
  const independentHotDeck = config.ductType==='dual' && config.dualDuctIndependent;
  const masterSafetyOK = !fireAlarm && smokeDamperProven && doorClosed && !latched.highStatic && controllerPowerOK;

  let coldSafetyOK, hotSafetyOK;
  if(independentHotDeck){
    coldSafetyOK = masterSafetyOK && !latched.freezestat && !latched.aquastat;
    hotSafetyOK = masterSafetyOK && !latched.hotFreezestat;
  } else {
    const allOK = masterSafetyOK && !latched.freezestat && !latched.aquastat && !latched.hotFreezestat;
    coldSafetyOK = allOK;
    hotSafetyOK = allOK;
  }
  const wantRunCold = sim.enabled && coldSafetyOK;
  const wantRunHot = sim.enabled && hotSafetyOK;
  sim.wantRunCold = wantRunCold;
  sim.wantRunHot = wantRunHot;
  const wantRun = wantRunCold;
  const sfStartCmd = (sim.overrideSupplyFanStart ? sim.overrideSupplyFanStartVal : wantRun) || sim.overrideSupplyFanSpeed;
  const hdStartCmd = (sim.overrideHotDeckFanStart ? sim.overrideHotDeckFanStartVal : wantRunHot) || sim.overrideHotDeckFanSpeed;
  const rfStartCmd = (sim.overrideReturnFanStart ? sim.overrideReturnFanStartVal : (wantRunCold || wantRunHot)) || sim.overrideReturnFanSpeed;
  const loadBias = 72 + (sim.oat-55)*0.22;

  if(sim.vav && sim.vav.length > 0){
    const avgTemp = sim.vav.reduce((sum, b)=>sum + b.zoneTemp, 0) / sim.vav.length;
    const avgHumid = sim.vav.reduce((sum, b)=>sum + b.zoneHumid, 0) / sim.vav.length;
    sim.raTemp = avgTemp;
    sim.raRH = avgHumid / 100;
  } else {
    if(wantRun){
      if(!config.reheat){
        const flowRatio = clamp(sim.supplyCfm / (sp.maxCfmSP || 6000), 0.1, 1.2);
        const coolingTransfer = 0.0015 * flowRatio;
        const roomLoad = 0.004;
        sim.spaceTemp = (sim.spaceTemp || 72) + ((sim.saTemp || 72) - (sim.spaceTemp || 72)) * coolingTransfer + (loadBias - (sim.spaceTemp || 72)) * roomLoad;
      }
    } else {
      sim.spaceTemp = (sim.spaceTemp || 72) + (sim.oat - (sim.spaceTemp || 72)) * 0.003;
    }
    sim.raTemp = sim.spaceTemp;
    const supplyW_ra = sim.W_supply || humidityRatio(sim.saTemp || 72, sim.saRH || 0.5);
    const supplyAirHumid = rhFromW(sim.raTemp || 72, supplyW_ra) * 100;
    const latentLoad = clamp(30 + (sim.oat - 20) * 0.38, 22, 62);
    if(wantRun){
      const flowRatio = sim.supplyCfm / (sp.maxCfmSP || 6000);
      const airExchangeFrac = flowRatio * 0.02;
      const targetHumid = airExchangeFrac * supplyAirHumid + (1 - airExchangeFrac) * (activeFaults.spaceHumidRogue? 75 : latentLoad);
      sim.raRH = sim.raRH + (targetHumid/100 - sim.raRH) * 0.02;
    } else {
      sim.raRH = sim.raRH + ((activeFaults.spaceHumidRogue? 75 : latentLoad)/100 - sim.raRH) * 0.005;
    }
    sim.raRH = clamp(sim.raRH, 0.15, 0.95);
  }

  // OA dry-air infiltration: when OA is drier than RA, RA humidity drifts toward OA
  // unless steam humidification is actively countering it.
  // The preheat valve amplifies this: drawing in cold OA and heating it accelerates drying
  // of the return air when no steam humidification is present.
  if(config.includeOa && sim.oaRH < sim.raRH){
    const oaFrac = config.airSystem === 'oa100' ? 1 : clamp(sim.oaDamperPos / 100, 0, 1);
    if(oaFrac > 0.01){
      let dryPull = (sim.oaRH - sim.raRH) * 0.02 * oaFrac;
      if(!config.steamHumid && sim.preheatValve > 5){
        dryPull *= 1.0 + (sim.preheatValve / 100) * 5.0;
      }
      const humidBoost = config.steamHumid && sim.humidValve > 5 ? 0.004 : 0;
      sim.raRH += dryPull + humidBoost;
    }
  }
  sim.raRH = clamp(sim.raRH, 0.15, 0.95);

  sim.fireDamperPos = slew(sim.fireDamperPos, wantRun? 100 : 0, DAMPER_SLEW);

  const orPrDehumidCall = wantRun && sim.dehumidEnabled && sim.vav && sim.vav.some(box => (box.type === 'or' || box.type === 'pr') && box.zoneDisplayHumid > sp.humidityMaxSP);
  sim.dehumidActive = wantRun && sim.dehumidEnabled && ((sim.raRH * 100) > sp.humidityMaxSP || orPrDehumidCall);
  sim.humidActive = wantRun && config.steamHumid && sim.humidEnabled && (sim.raRH * 100) < sp.humidityMinSP;

  const ddcOat = activeFaults.oatSensorDriftHigh ? sim.oat + 15 : (activeFaults.oatSensorDriftLow ? sim.oat - 15 : sim.oat);
  sim.oatDisplayTemp = ddcOat;
  sim.raDisplayTemp = activeFaults.ratSensorDriftHigh ? sim.raTemp + 10 : sim.raTemp;

  let phwTarget = 180;
  if(ddcOat >= 50) phwTarget = 120;
  else if(ddcOat > 10) phwTarget = 180 - ((ddcOat - 10) / 40) * 60;
  sim.preheatWaterTemp = (config.preheat && activeFaults.preheatBoilerFail)? 70 : (config.preheat && activeFaults.steamBundleFouled? 100 : phwTarget);

  function airPath(o){
    const pathWantRun = o.wantRun !== undefined ? o.wantRun : wantRun;
    let minOaDmp = 0, minRaDmp = 0;
    if(age >= 30){ minOaDmp = 20; minRaDmp = 20; }
    else if(age >= 15){ minOaDmp = 8; minRaDmp = 8; }

    let oaDamperTargetPos;
    if(o.isEconActive){
      oaDamperTargetPos = o.oaDamperFault !== undefined ? o.oaDamperFault : 100;
    } else {
      let oaDamperOut;
      if(o.oaDamperFault!==undefined){ oaDamperOut = o.oaDamperFault; }
      else { oaDamperOut = o.pidOa.update(o.oaCfmSetpoint, o.curOaCfm, DT, false); }
      oaDamperTargetPos = pathWantRun? oaDamperOut : 0;
    }
    const isHotDeck = !!o.isHotDeck;
    const isOaDisc = isHotDeck ? isWireDisconnected('Hot Deck Outside Air Damper') : isWireDisconnected('Outside Air Damper');
    if(isOaDisc) oaDamperTargetPos = 0;
    if(!config.includeOa) oaDamperTargetPos = 0;

    if(pathWantRun && config.includeOa && !isOaDisc && !o.isEconActive){
      oaDamperTargetPos = clamp(oaDamperTargetPos + drift, minOaDmp, 100);
    }
    const oaDamperPos = slew(o.curOaDamperPos, oaDamperTargetPos, DAMPER_SLEW);
    const isFreezestatTripped = isHotDeck ? latched.hotFreezestat : latched.freezestat;
    let raDamperTargetPos;
    if(o.isEconActive){
      raDamperTargetPos = 0;
    } else {
      if(config.driveType==='vfd' && pathWantRun){ raDamperTargetPos = 100; }
      else { raDamperTargetPos = pathWantRun? clamp(100-oaDamperPos+20,0,100) : 100; }
      if(isFreezestatTripped) raDamperTargetPos = 0;
      if(isHotDeck && isWireDisconnected('Hot Deck Return Air Damper')) raDamperTargetPos = 0;
      if(!config.includeOa) raDamperTargetPos = 100;
      if(pathWantRun && config.includeOa && !(isHotDeck && isWireDisconnected('Hot Deck Return Air Damper')) && !isFreezestatTripped && !(config.driveType==='vfd')){
        raDamperTargetPos = clamp(raDamperTargetPos + drift, minRaDmp, 100);
      }
    }
    const raDamperPos = slew(o.curRaDamperPos, raDamperTargetPos, DAMPER_SLEW);
    const capCfm = Math.max(o.capacityCfm || 0, 1);
    let oaCfm = pathWantRun? (capCfm * (oaDamperPos/100) * 1.25) : 0;
    oaCfm = clamp(oaCfm, 0, capCfm);
    if(!config.includeOa) oaCfm = 0;
    const oaFraction = capCfm>0? clamp((oaCfm/capCfm) + (config.includeOa ? 0.08 : 0), 0, 1) : 0;
    let effectiveOat = sim.oat;
    if(sim.oat < 38){
      const diff = 38 - sim.oat;
      effectiveOat -= 1.2 * Math.pow(diff, 1.05);
    }
    const maTemp = effectiveOat*oaFraction + sim.raTemp*(1-oaFraction);
    const Woa = humidityRatio(sim.oat, sim.oaRH);
    const Wra = humidityRatio(sim.raTemp, sim.raRH);
    const Wmix = Woa*oaFraction + Wra*(1-oaFraction);

    let entering = maTemp;
    let preheatValve = 0, preheatLvg = entering;
    if(o.hasPreheat){
      let valve;
      if(o.preheatValveFault!==undefined){ valve = o.preheatValveFault; }
      else {
        if(pathWantRun) { valve = o.pidPreheat.update(sp.preheatDischargeSP, o.curPreheatLvg, DT, false); }
        else {
          if(latched.freezestat){
            o.pidPreheat.integral = 100 / (o.pidPreheat.ki || 1);
            o.pidPreheat.prevErr = 0;
            o.pidPreheat.first = true;
            valve = 100;
          } else { o.pidPreheat.reset(); valve = 0; }
        }
      }
      let preheatCmd = (pathWantRun || latched.freezestat) ? valve : 0;
      if(isWireDisconnected('Preheat Valve Actuator Command')) preheatCmd = 0;
      if(pathWantRun && age >= 10 && !isWireDisconnected('Preheat Valve Actuator Command')){
        preheatCmd = clamp(preheatCmd + drift, 0, 100);
      }
      preheatValve = slew(o.curPreheatValve, preheatCmd, 6);
      const waterAvail = o.preheatNoFlowFault? entering : sim.preheatWaterTemp;
      const maxDelta = Math.max(0, waterAvail-entering);
      const cfmPct = clamp((o.capacityCfm || 0) / sp.maxCfmSP, 0.05, 1.5);
      const flowCorr = 0.26 * Math.pow(0.75 / cfmPct, 0.6);
      preheatLvg = entering + (preheatValve/100)*maxDelta*coilEff*flowCorr;
    }
    return {oaDamperPos, raDamperPos, oaCfm, maTemp, Wmix, preheatValve, preheatLvg};
  }

  let oaFraction, Wmix;
  if(config.airSystem==='oa100'){
    sim.oaCfm = sim.supplyCfm;
    let effectiveOat = sim.oat;
    if(sim.oat < 38){
      const diff = 38 - sim.oat;
      effectiveOat -= 1.2 * Math.pow(diff, 1.05);
    }
    sim.raTemp = NaN; sim.maTemp = effectiveOat;
    oaFraction = 1;
    Wmix = humidityRatio(sim.oat, sim.oaRH);
    sim.oaDamperPos = 100; sim.raDamperPos = 0;
    if(config.preheat){
      let valve;
      if(activeFaults.preheatValveStuck!==undefined){ valve = activeFaults.preheatValveStuck; }
      else {
        if(wantRun) { valve = sim.pid.preheat.update(sp.preheatDischargeSP, sim.preheatLvg, DT, false); }
        else { sim.pid.preheat.reset(); valve = 0; }
      }
      let preheatCmd = wantRun? valve : 0;
      if(latched.freezestat) preheatCmd = 100;
      if(isWireDisconnected('Preheat Valve Actuator Command')) preheatCmd = 0;
      sim.preheatValve = slew(sim.preheatValve, preheatCmd, 6);
      const noFlow = activeFaults.preheatNoFlow || (config.preheatBoosterPump && activeFaults.boosterPumpFail);
      const waterAvail = noFlow? sim.maTemp : sim.preheatWaterTemp;
      const maxDelta = Math.max(0, waterAvail-sim.maTemp);
      const cfmPct = clamp(sim.supplyCfm / sp.maxCfmSP, 0.05, 1.5);
      const flowCorr = 0.26 * Math.pow(0.75 / cfmPct, 0.6);
      sim.preheatLvg = sim.maTemp + (sim.preheatValve/100)*maxDelta*coilEff*flowCorr;
    } else { sim.preheatValve = 0; sim.preheatLvg = sim.maTemp; }
    if(independentHotDeck){
      sim.hotMaTemp = effectiveOat;
      sim.hotOaDamperPos = sim.dehumidActive ? 0 : 100;
      sim.hotRaDamperPos = 0;
      sim.hotOaCfm = sim.dehumidActive ? 0 : sim.hotDeckCfm;
    }
  } else {
    const hOa = enthalpy(sim.oat, sim.oaRH);
    const hRa = enthalpy(sim.raTemp, sim.raRH);
    const isEconConditionMet = (sim.oatDisplayTemp >= sp.preheatDischargeSP) && (sim.oatDisplayTemp <= sim.raDisplayTemp) && (hOa < hRa);
    let econTargetFlow = sp.oaCfmSP;
    let econActive = false;
    if(sim.economizerEnabled && !sim.dehumidActive && isEconConditionMet){
      econActive = true;
      const denominator = sim.oatDisplayTemp - sim.raDisplayTemp;
      let targetOaFrac = 0;
      if(Math.abs(denominator) > 2){
        targetOaFrac = (sp.coolingDischargeSP - sim.raDisplayTemp) / denominator;
      }
      targetOaFrac = clamp(targetOaFrac, 0, 1);
      econTargetFlow = Math.max(sp.oaCfmSP, targetOaFrac * Math.max(sim.supplyCfm, 1));
    }
    sim.economizerActive = econActive;
    // Independent dual duct: each deck gets its own OA intake, split the minimum equally
    const oaSetpoint = independentHotDeck ? Math.max(econTargetFlow / 2, 200) : econTargetFlow;

    const r = airPath({
      oaCfmSetpoint: oaSetpoint, capacityCfm: sim.supplyCfm,
      curOaDamperPos: sim.oaDamperPos, curRaDamperPos: sim.raDamperPos, curOaCfm: sim.oaCfm,
      curPreheatValve: sim.preheatValve, curPreheatLvg: sim.preheatLvg,
      pidOa: sim.pid.oaDamper, pidPreheat: sim.pid.preheat, hasPreheat: config.preheat,
      oaDamperFault: activeFaults.oaDamperStuck, preheatValveFault: activeFaults.preheatValveStuck,
      preheatNoFlowFault: activeFaults.preheatNoFlow || (config.preheatBoosterPump && activeFaults.boosterPumpFail),
      isEconActive: sim.economizerActive
    });
    sim.oaDamperPos=r.oaDamperPos; sim.raDamperPos=r.raDamperPos; sim.oaCfm=r.oaCfm; sim.maTemp=r.maTemp;
    oaFraction = sim.supplyCfm>0? clamp(sim.oaCfm/Math.max(sim.supplyCfm,1),0,1) : 0;
    Wmix = r.Wmix;
    sim.preheatValve = r.preheatValve; sim.preheatLvg = r.preheatLvg;

    let eaTarget;
    if(activeFaults.eaDamperStuck!==undefined){ eaTarget = activeFaults.eaDamperStuck; }
    else { eaTarget = wantRun ? (sim.economizerActive ? 100 : 0) : 0; }
    if(!config.includeEa) eaTarget = 0;
    sim.eaDamperPos = slew(sim.eaDamperPos, eaTarget, DAMPER_SLEW);
    const sumDpr = sim.eaDamperPos + sim.raDamperPos;
    sim.exhaustCfm = (wantRun && sumDpr > 0) ? sim.returnCfm * (sim.eaDamperPos / sumDpr) : 0;
    if(!config.includeEa) sim.exhaustCfm = 0;

    if(independentHotDeck){
      const rh = airPath({
        oaCfmSetpoint: sp.oaCfmSP / 2, capacityCfm: sim.hotDeckCfm,
        curOaDamperPos: sim.hotOaDamperPos, curRaDamperPos: sim.hotRaDamperPos, curOaCfm: sim.hotOaCfm,
        curPreheatValve: 0, curPreheatLvg: sim.hotMaTemp,
        pidOa: sim.pid.hotOaDamper, pidPreheat: null, hasPreheat: false,
        oaDamperFault: activeFaults.hotOaDamperStuck,
        isHotDeck: true, wantRun: wantRunHot
      });
      sim.hotOaDamperPos=rh.oaDamperPos; sim.hotRaDamperPos=rh.raDamperPos; sim.hotOaCfm=rh.oaCfm; sim.hotMaTemp=rh.maTemp;
      if(sim.dehumidActive){
        sim.hotOaDamperPos = activeFaults.hotOaDamperStuck!==undefined? activeFaults.hotOaDamperStuck : 0;
        sim.hotRaDamperPos = 100;
        sim.hotOaCfm = 0;
        sim.hotMaTemp = sim.raTemp;
      }
    }
  }

  let entering = config.airSystem==='oa100'? sim.oat : sim.maTemp;
  if(config.preheat){
    const boosterFail = config.preheatBoosterPump && activeFaults.boosterPumpFail;
    sim.boosterPumpRun = config.preheatBoosterPump && wantRun && sim.preheatValve > sp.boosterPumpStartPct && !boosterFail;
  } else { sim.boosterPumpRun = false; }

  const fanHeat = wantRun? clamp(sim.staticPressure*0.6 + (sim.supplyFanPct/100)*1.2, 0, 3.5) : 0;
  let afterFan = sim.preheatLvg + fanHeat;

  let hotDeckEnteringIndependent = null;
  if(config.ductType==='dual' && config.dualDuctIndependent){
    let hotOutPct = sim.pid.hotDeckFlow.update(sp.supplyCfmSP / 2, sim.hotDeckCfm||0, DT, false);
    let hotTargetSpeed = hdStartCmd ? (sim.overrideHotDeckFanSpeed ? sim.overrideHotDeckFanSpeedVal : clamp(Math.max(hotOutPct,25),25,100)) : 0;
    const hotDeckFanSlew = config.driveType==='vfd' ? 100 / 120 : 20;
    sim.hotDeckFanPct = slew(sim.hotDeckFanPct, hotTargetSpeed, hotDeckFanSlew);
    sim.hotDeckFans.forEach(f=>{ f.run = hdStartCmd && !f.fail; });
    const hotFanHeat = hdStartCmd ? clamp((sim.hotDeckFanPct/100)*1.0,0,2.5) : 0;
    hotDeckEnteringIndependent = sim.hotMaTemp + hotFanHeat;
  } else {
    sim.hotDeckFanPct = 0;
    sim.hotDeckCfm = config.ductType==='dual'? sim.supplyCfm : sim.hotDeckCfm;
  }

  const maRH = rhFromW(sim.maTemp || afterFan, Wmix);
  const dewIn = dewPointF(sim.maTemp || afterFan, maRH);
  let activeCoolingSP = sp.coolingDischargeSP;
  if (sim.dehumidActive) {
    const maxRH = Math.max(sim.raRH * 100, orPrDehumidCall ? Math.max(...sim.vav.filter(b=>b.type==='or'||b.type==='pr').map(b=>b.zoneDisplayHumid)) : 0);
    const error = maxRH - sp.humidityMaxSP;
    activeCoolingSP = Math.min(sp.coolingDischargeSP, clamp(60.0 - error * 1.0, 50.0, 60.0));
  }

  function runCoil(pidObj, sp_, enteringT, faultStuck, faultNoFlow, prevValve, prevLvg, active){
    let valve;
    if(faultStuck!==undefined){ valve = faultStuck; }
    else {
      if(active) { valve = pidObj.update(sp_, prevLvg, DT, true); }
      else { pidObj.reset(); valve = 0; }
    }
    let valveCmd = active? valve : 0;
    if(active && age >= 10 && faultStuck===undefined){ valveCmd = clamp(valveCmd + drift, 0, 100); }
    valve = slew(prevValve||0, valveCmd, 8);
    const waterAvail = faultNoFlow? enteringT : WATER.chw;
    const latentFactor = 1 + clamp((Wmix - 0.008) * 15, 0, 0.4);
    const maxDelta = Math.max(0, enteringT-waterAvail)*coilEff / latentFactor;
    const lvg = enteringT - (valve/100)*maxDelta;
    return {valve, lvg};
  }
  const satDriftOffset = activeFaults.satSensorDrift? 15 : 0;
  let feedbackTemp = sim.coil1Lvg + satDriftOffset;
  const isCDTempDisc = config.ductType==='dual' ? isWireDisconnected('Cold Deck Leaving Air Temperature Sensor Signal') : isWireDisconnected('Discharge Air Temperature Sensor Signal');
  if(isCDTempDisc) feedbackTemp = 0;
  let coil1 = runCoil(sim.pid.coil1, activeCoolingSP, afterFan, activeFaults.coil1ValveStuck, activeFaults.coil1NoFlow, sim.coil1Valve, feedbackTemp, wantRun);
  if(isWireDisconnected('Cooling Coil 1 Valve Actuator Command')){
    coil1.valve = 0;
    const waterAvail = activeFaults.coil1NoFlow? afterFan : WATER.chw;
    const latentFactor = 1 + clamp((Wmix - 0.008) * 15, 0, 0.4);
    const maxDelta = Math.max(0, afterFan-waterAvail)*coilEff / latentFactor;
    coil1.lvg = afterFan - (0/100)*maxDelta;
  }
  sim.coil1Valve = coil1.valve; sim.coil1Lvg = coil1.lvg;
  let afterCooling = coil1.lvg;
  if(config.coolingCoils==='dual'){
    let stage2Target = sim.coil1Valve>85? activeCoolingSP : afterCooling;
    let coil2 = runCoil(sim.pid.coil2, stage2Target, afterCooling, activeFaults.coil2ValveStuck, activeFaults.coil2NoFlow, sim.coil2Valve, sim.coil2Lvg, wantRun && sim.coil1Valve>85);
    if(isWireDisconnected('Cooling Coil 2 Valve Actuator Command')){
      coil2.valve = 0;
      const waterAvail = activeFaults.coil2NoFlow? afterCooling : WATER.chw;
      const latentFactor = 1 + clamp((Wmix - 0.008) * 15, 0, 0.4);
      const maxDelta = Math.max(0, afterCooling-waterAvail)*coilEff / latentFactor;
      coil2.lvg = afterCooling - (0/100)*maxDelta;
    }
    sim.coil2Valve = sim.coil1Valve>85? coil2.valve : 0;
    afterCooling = sim.coil1Valve>85? coil2.lvg : afterCooling;
    sim.coil2Lvg = afterCooling;
  } else { sim.coil2Valve = 0; sim.coil2Lvg = afterCooling; }

  let Wafter = Wmix;
  if(afterCooling < dewIn){
    const Wsat = humidityRatio(afterCooling,1.0);
    Wafter = Wmix - coilEff*(Wmix-Wsat);
    Wafter = Math.max(Wafter, Wsat*0.98);
  }

  if(config.steamHumid){
    const humidActive = wantRun && !activeFaults.humidNoSteam && sim.humidEnabled;
    let hv;
    if(activeFaults.humidValveStuck!==undefined){ hv = activeFaults.humidValveStuck; }
    else {
      if(humidActive) { hv = sim.pid.humid.update(sp.humidityMinSP, sim.raRH*100, DT, false); }
      else { sim.pid.humid.reset(); hv = 0; }
    }
    let hvTarget = humidActive? hv : 0;
    if(isWireDisconnected('Humidifier Valve Actuator Command')) hvTarget = 0;
    if(wantRun && age >= 10 && !isWireDisconnected('Humidifier Valve Actuator Command') && activeFaults.humidValveStuck===undefined){
      hvTarget = clamp(hvTarget + drift, 0, 100);
    }
    const tempForLimit = config.ductType === 'dual' ? afterCooling : (config.reheat ? afterCooling + (sim.reheatValve/100)*(WATER.rhw-afterCooling)*coilEff : afterCooling);
    const W_limit = humidityRatio(tempForLimit, 0.85);
    const hvMax = clamp(((W_limit - Wafter) / 0.008) * 100, 0, 100);
    hvTarget = Math.min(hvTarget, hvMax);
    sim.humidValve = slew(sim.humidValve, hvTarget, 8);
    const maxAddW = 0.008;
    Wafter = Wafter + (sim.humidValve/100)*maxAddW;
  } else { sim.humidValve = 0; }

  // When preheat is active without steam humidification, the supply air is
  // dominated by heated OA — pull the humidity ratio toward the OA W value
  // directly, breaking the RA→Wmix→SA→RA recirculation loop.
  if(!config.steamHumid && config.preheat && sim.preheatValve > 5 && sim.oaRH > 0.01){
    const Woa = humidityRatio(sim.oat, sim.oaRH);
    Wafter += (Woa - Wafter) * 0.5;
  }

  if(config.ductType==='dual'){
    sim.coldDeckTemp = afterCooling;
    const hotDeckSource = config.dualDuctIndependent? hotDeckEnteringIndependent : afterFan;
    let hd;
    if(activeFaults.hotDeckValveStuck!==undefined){ hd = activeFaults.hotDeckValveStuck; }
    else if(!wantRunHot){
      if(latched.hotFreezestat){
        sim.pid.hotDeck.integral = 100 / (sim.pid.hotDeck.ki || 1);
        sim.pid.hotDeck.prevErr = 0;
        sim.pid.hotDeck.first = true;
        hd = 100;
      } else { sim.pid.hotDeck.reset(); hd = 0; }
    } else {
      let feedbackHot = sim.hotDeckTemp;
      if(isWireDisconnected('Hot Deck Leaving Air Temperature Sensor Signal')) feedbackHot = 0;
      hd = sim.pid.hotDeck.update(sp.hotDeckSP, feedbackHot, DT, false);
    }
    let hdTarget = (wantRunHot || latched.hotFreezestat) ? hd : 0;
    if(isWireDisconnected('Hot Deck Valve Actuator Command')) hdTarget = 0;
    if(wantRunHot && age >= 10 && !isWireDisconnected('Hot Deck Valve Actuator Command') && activeFaults.hotDeckValveStuck===undefined){
      hdTarget = clamp(hdTarget + drift, 0, 100);
    }
    sim.hotDeckValve = slew(sim.hotDeckValve, hdTarget, 4);
    const maxDelta = Math.max(0, WATER.rhw-hotDeckSource)*coilEff;
    sim.hotDeckTemp = hotDeckSource + (sim.hotDeckValve/100)*maxDelta;
    sim.saTemp = sim.coldDeckTemp;
    sim.W_supply = Wafter;
    sim.saRH = rhFromW(sim.coldDeckTemp, Wafter);
  } else {
    let downstream = afterCooling;
    if(config.reheat){
      let rv;
      if(activeFaults.reheatValveStuck!==undefined){ rv = activeFaults.reheatValveStuck; }
      else if(!wantRun){ sim.pid.reheat.reset(); rv = 0; }
      else { rv = sim.pid.reheat.update(sp.reheatSpaceSP, sim.spaceTemp, DT, false); }
      let rvTarget = wantRun? rv : 0;
      if(isWireDisconnected('Reheat Valve Actuator Command')) rvTarget = 0;
      if(wantRun && age >= 10 && !isWireDisconnected('Reheat Valve Actuator Command') && activeFaults.reheatValveStuck===undefined){
        rvTarget = clamp(rvTarget + drift, 0, 100);
      }
      sim.reheatValve = slew(sim.reheatValve, rvTarget, 8);
      const waterAvail = activeFaults.reheatNoFlow? downstream : WATER.rhw;
      const maxDelta = Math.max(0, waterAvail-downstream)*coilEff;
      downstream = downstream + (sim.reheatValve/100)*maxDelta;
      const flowRatio = clamp(sim.supplyCfm / (sp.maxCfmSP || 6000), 0.1, 1.2);
      sim.spaceTemp += (downstream - sim.spaceTemp) * 0.008 * flowRatio + (loadBias - sim.spaceTemp) * 0.002;
    } else { sim.reheatValve = 0; }
    sim.saTemp = downstream;
    sim.W_supply = Wafter;
    sim.saRH = rhFromW(downstream, Wafter);
  }
  sim.satDisplayTemp = activeFaults.satSensorDrift? sim.saTemp + satDriftOffset : sim.saTemp;

  let capFracSupply = fanWallCapacityFraction(sim.supplyFans);
  let capFracReturn = fanWallCapacityFraction(sim.returnFans);

  if(config.driveType==='vfd'){
    let outPct;
    if(sim.overrideSupplyFanSpeed){ sim.pid.supplyFlow.reset(); sim.pid.staticP.reset(); outPct = 0; }
    else if(!sfStartCmd){ sim.pid.supplyFlow.reset(); sim.pid.staticP.reset(); outPct = 0; }
    else if(config.controlType==='cfm'){
      const cfmSP = config.ductType==='dual'? sp.supplyCfmSP / 2 : sp.supplyCfmSP;
      outPct = sim.pid.supplyFlow.update(cfmSP, sim.supplyCfm, DT, false);
    } else { outPct = sim.pid.staticP.update(sp.staticSP, sim.staticPressureDisplay, DT, false); }
    let targetPct = sfStartCmd ? (sim.overrideSupplyFanSpeed ? sim.overrideSupplyFanSpeedVal : clamp(Math.max(outPct,25),25,100)) : 0;
    if(isWireDisconnected('Supply Fan Drive Speed Command')) targetPct = 0;
    sim.supplyFanPct = slew(sim.supplyFanPct, targetPct, 100 / 120);
    sim.supplyDamperPos = slew(sim.supplyDamperPos, sfStartCmd? 100 : 0, DAMPER_SLEW);
    supplyFlowFraction = sim.supplyFanPct/100;
  } else {
    let targetPct = sfStartCmd ? (sim.overrideSupplyFanSpeed ? sim.overrideSupplyFanSpeedVal : 100) : 0;
    sim.supplyFanPct = slew(sim.supplyFanPct, targetPct, 20);
    let damperOut;
    if(!sfStartCmd){ sim.pid.supplyDamper.reset(); damperOut = 0; }
    else if(config.controlType==='cfm'){
      const cfmSP = config.ductType==='dual'? sp.supplyCfmSP / 2 : sp.supplyCfmSP;
      damperOut = sim.pid.supplyDamper.update(cfmSP, sim.supplyCfm, DT, false);
    } else { damperOut = sim.pid.supplyDamper.update(sp.staticSP, sim.staticPressureDisplay, DT, false); }
    let damperTarget = sfStartCmd? damperOut : 0;
    if(isWireDisconnected('Supply Duct Damper Actuator Command')) damperTarget = 0;
    sim.supplyDamperPos = slew(sim.supplyDamperPos, damperTarget, DAMPER_SLEW);
    supplyFlowFraction = sim.supplyDamperPos/100;
  }
  sim.supplyFans.forEach(f=>{ f.run = sfStartCmd && !f.fail; });
  const designCfm = config.ductType==='dual'? sp.maxCfmSP / 2 : sp.maxCfmSP;
  const flowDegradation = 1 - (ageLossPct / 100) * 0.45;
  let casingLeak = 0;
  if(age >= 50) casingLeak = 0.12;
  else if(age >= 40) casingLeak = 0.06;
  sim.supplyCfm = wantRun? designCfm*supplyFlowFraction*capFracSupply*(0.97+0.06*Math.random())*flowDegradation*(1-casingLeak) : 0;
  if(config.controlType==='static'){
    if(sim.vav && sim.vav.length > 0){
      const vavDprs = sim.vav.filter(b => b.type !== 'fcu' && b.damperPos !== undefined).map(b => b.damperPos);
      const avgDpr = vavDprs.length > 0 ? vavDprs.reduce((a,b) => a+b, 0) / vavDprs.length : VAV_MIN_PCT;
      const dprFrac = clamp((avgDpr - VAV_MIN_PCT) / (100 - VAV_MIN_PCT), 0, 1);
      sim.staticPressure = wantRun ? sp.highStaticSP * 0.9 * (1 - dprFrac) : 0;
    } else {
      const driveFrac = config.driveType==='vfd' ? (sim.supplyFanPct/100) : (sim.supplyDamperPos/100);
      const variation = 0.9 + Math.random() * 0.2;
      sim.staticPressure = wantRun ? driveFrac * sp.highStaticSP * 0.9 * variation : 0;
    }
  } else {
    sim.staticPressure = wantRun? clamp(supplyFlowFraction*sp.staticSP*1.15*(activeFaults.dirtyFilter? 1.6:1)*flowDegradation + (1-capFracSupply)*0.3,0,10) : 0;
  }
  sim.staticPressureDisplay = activeFaults.staticPressureSensorDrift ? Math.max(0, sim.staticPressure - 0.6) : sim.staticPressure;
  if(!(sim.vav && sim.vav.length > 0) && wantRun){
    const t = sim.age || 0;
    const fluct = 1 + 0.04 * Math.sin(t * 0.08) + 0.025 * Math.sin(t * 0.17);
    sim.staticPressureDisplay *= fluct;
  }
  if(sim.sp23Base === undefined) sim.sp23Base = 1 + Math.random() * 1.5;
  if(wantRun){
    const t = sim.age || 0;
    const fluct23 = 0.08 * Math.sin(t * 0.06) + 0.05 * Math.sin(t * 0.14);
    const driveFrac = config.driveType==='vfd' ? (sim.supplyFanPct/100) : (sim.supplyDamperPos/100);
    sim.sp23 = clamp(driveFrac * (sim.sp23Base + fluct23), 0, 3);
  } else { sim.sp23 = 0; }

  if(config.ductType==='dual'){
    let coldDamperTarget = activeFaults.coldDeckDamperStuck!==undefined? activeFaults.coldDeckDamperStuck : (wantRunCold? 92 : 0);
    if(isWireDisconnected('Cold Deck Regulating Damper')) coldDamperTarget = 0;
    sim.coldDeckDamperPos = slew(sim.coldDeckDamperPos, coldDamperTarget, DAMPER_SLEW);
    sim.supplyCfm = sim.supplyCfm * (sim.coldDeckDamperPos/100);
    if(config.dualDuctIndependent){
      const capFracHot = fanWallCapacityFraction(sim.hotDeckFans);
      const filterDerate = activeFaults.hotDeckDirtyFilter? 0.75 : 1;
      sim.hotDeckCfm = hdStartCmd? (sp.maxCfmSP / 2)*(sim.hotDeckFanPct/100)*capFracHot*filterDerate*(0.97+0.06*Math.random())*flowDegradation : 0;
    }
    let hotDamperTarget = activeFaults.hotDeckDamperStuck!==undefined? activeFaults.hotDeckDamperStuck : (wantRunHot? 92 : 0);
    if(isWireDisconnected('Hot Deck Regulating Damper')) hotDamperTarget = 0;
    sim.hotDeckDamperPos = slew(sim.hotDeckDamperPos, hotDamperTarget, DAMPER_SLEW);
    sim.hotDeckCfm = sim.hotDeckCfm * (sim.hotDeckDamperPos/100);
  } else { sim.coldDeckDamperPos = 0; sim.hotDeckDamperPos = 0; }

  const wantRunReturn = wantRunCold || wantRunHot;
  if(config.airSystem!=='oa100'){
    const totalSupplyForReturn = config.ductType==='dual' ? sim.supplyCfm + (sim.hotDeckCfm || 0) : sim.supplyCfm;
    let target;
    if(sim.economizerActive){
      target = totalSupplyForReturn;
    } else {
      target = sp.oaCfmSP;
    }
    let targetReturnPct;
    if(config.driveType==='vfd'){
      let outPct;
      if(sim.overrideReturnFanSpeed){ sim.pid.returnFlow.reset(); outPct = 0; }
      else if(!rfStartCmd){ sim.pid.returnFlow.reset(); outPct = 0; }
      else { outPct = sim.pid.returnFlow.update(target, (totalSupplyForReturn - sim.returnCfm), DT, false); }
      targetReturnPct = rfStartCmd ? (sim.overrideReturnFanSpeed ? sim.overrideReturnFanSpeedVal : clamp(Math.max(outPct,25),25,100)) : 0;
    } else { targetReturnPct = rfStartCmd ? (sim.overrideReturnFanSpeed ? sim.overrideReturnFanSpeedVal : 100) : 0; }
    if(isWireDisconnected('Return Fan Drive Speed Command')) targetReturnPct = 0;
    const returnFanSlew = config.driveType==='vfd' ? 100 / 90 : 20;
    sim.returnFanPct = slew(sim.returnFanPct, targetReturnPct, returnFanSlew);
    sim.returnFans.forEach(f=>{ f.run = rfStartCmd && !f.fail; });
    sim.returnCfm = rfStartCmd ? (0.75 * sp.maxCfmSP) * (sim.returnFanPct/100) * capFracReturn * (0.97+0.06*Math.random()) * flowDegradation : 0;
  } else if(config.airSystem==='return' && config.returnFanCount === 0){
    sim.returnCfm = wantRun && sim.raDamperPos > 0 ? Math.max(0, sim.supplyCfm - sim.oaCfm) : 0;
    sim.returnFanPct = 0;
  } else { sim.returnCfm = NaN; }

  // Freezestat recovery: after reset, prevent re-trip until PHC-LAT rises back above
  // the setpoint by 2\u00b0F — gives the preheat coil unlimited time to recover
  // regardless of how cold the OA is.
  const freezeSensedTemp = config.preheat? sim.preheatLvg : entering;
  if(latched.freezestat){
    freezestatRecovering = false;
  } else if(freezestatRecovering && freezeSensedTemp > sp.freezestatSP + 2){
    freezestatRecovering = false;
  }
  if(config.includeOa && freezeSensedTemp < sp.freezestatSP && wantRunCold && !freezestatRecovering){
    latched.freezestat = true;
    freezestatRecovering = true;
  }
  if(sim.staticPressure > sp.highStaticSP && wantRunCold) latched.highStatic = true;
  if(config.preheat && config.preheatAquastat && sim.preheatWaterTemp < sp.aquastatSP && wantRunCold) latched.aquastat = true;
  if(independentHotDeck){
    if(config.includeOa && sim.hotDeckTemp < sp.freezestatSP && wantRunHot) latched.hotFreezestat = true;
  }
  if(config.vavsExhaustCount > 0 || config.orCount > 0 || config.prCount > 0){ tickExhaustFan(wantRunReturn); }
  tickVav(wantRunReturn);
}

function tickVav(wantRun){
  if(!sim.vav || !sim.vav.length) return;
  const primaryTemp = sim.saTemp;
  const loadBias = 72 + (sim.oat-55)*0.22;
  const designMax = config.ductType==='dual'? (sp.maxCfmSP / 2) : sp.maxCfmSP;
  const ahuFlowRatio = wantRun ? sim.supplyCfm / (designMax || 3000) : 0;
  sim.vav.forEach((box, idx)=>{
    const n = idx+1;
    const vavPowerLost = isVavDisconnected(n, 1) || isVavDisconnected(n, 2) || activeFaults['vavPowerLost'+n];
    const supplyW = sim.W_supply || humidityRatio(sim.saTemp || 72, sim.saRH || 0.5);
    const latentLoad = clamp(30 + (sim.oat - 20) * 0.38, 22, 62);
    if(wantRun && !vavPowerLost){
      const flowVal = box.type === 'fcu'? (box.fanSpeed * 4) : box.airflowCfm;
      let airExchangeFrac = (flowVal / (box.designCfm || 400)) * 0.02;
      // When preheat is on without humidification, dry supply air dominates
      if(!config.steamHumid && config.preheat && sim.preheatValve > 5){
        airExchangeFrac = Math.max(airExchangeFrac, 0.12);
      }
      const effectiveSAHumid = rhFromW(box.zoneTemp, supplyW) * 100;
      box.zoneHumid += airExchangeFrac * (effectiveSAHumid - box.zoneHumid) + (1 - airExchangeFrac) * (latentLoad - box.zoneHumid) * 0.005;
    } else { box.zoneHumid += (latentLoad - box.zoneHumid) * 0.002; }
    box.zoneHumid = clamp(box.zoneHumid, 15, 95);
    box.zoneDisplayHumid = activeFaults['vavZoneHumiditySensorDrift'+n] ? clamp(box.zoneHumid + 20, 15, 95) : box.zoneHumid;

    if(box.type === 'or' || box.type === 'pr'){
      let effectiveSP = box.zoneSP;
      if(box.zoneDisplayHumid > 50){
        const excess = clamp((box.zoneDisplayHumid - 50) / 10, 0, 1);
        effectiveSP += excess * 3.0;
      }
      box.effectiveSP = effectiveSP;
      if(box.type === 'or') box.pressurize = 'positive';
    }
    const activeSP = (box.type === 'or' || box.type === 'pr') ? (box.effectiveSP || box.zoneSP) : box.zoneSP;
    const tempError = box.zoneTemp - activeSP;

    if(box.type === 'fcu'){
      let fanTargetSpeed = 10, coolTargetValve = 0, heatTargetValve = 0;
      if(!vavPowerLost){
        if(tempError > 0){
          fanTargetSpeed = clamp(10 + tempError * 80, 10, 100);
          coolTargetValve = clamp(tempError * 80, 0, 100);
        } else if(tempError < 0){
          fanTargetSpeed = clamp(10 - tempError * 80, 10, 100);
          heatTargetValve = clamp(-tempError * 80, 0, 100);
        }
        if(activeFaults['fcuFanFail'+n]) fanTargetSpeed = 0;
        if(activeFaults['fcuCoolValveStuck'+n] !== undefined) coolTargetValve = activeFaults['fcuCoolValveStuck'+n];
        if(activeFaults['fcuHeatValveStuck'+n] !== undefined) heatTargetValve = activeFaults['fcuHeatValveStuck'+n];
      } else { fanTargetSpeed = 0; coolTargetValve = 0; heatTargetValve = 0; }
      box.fanSpeed = wantRun? slew(box.fanSpeed || 10, fanTargetSpeed, 8) : 0;
      box.coolingValve = wantRun? slew(box.coolingValve || 0, coolTargetValve, 8) : 0;
      box.heatingValve = wantRun? slew(box.heatingValve || 0, heatTargetValve, 8) : 0;
      const clgDrop = (box.coolingValve/100) * 20;
      const htgRise = (box.heatingValve/100) * 35;
      const enteringAirTemp = (wantRun && !vavPowerLost) ? primaryTemp : box.zoneTemp;
      box.dischargeTemp = enteringAirTemp - clgDrop + htgRise;
      if(sim.dehumidActive){ box.dischargeTemp = Math.min(box.dischargeTemp, box.zoneSP + 5); }
      box.airflowCfm = wantRun? (box.fanSpeed/100)*(box.designCfm || 400) : 0;
      const isBoxActive = wantRun && !vavPowerLost;
      box.zoneTemp += isBoxActive? ((box.dischargeTemp-box.zoneTemp)*0.012*(box.fanSpeed/100) + (loadBias-box.zoneTemp)*0.004) : (sim.oat-box.zoneTemp)*0.003;
    } else {
      if(config.ductType==='dual'){
        const coldDamperStuck = activeFaults['vavColdDamperStuck'+n];
        const hotDamperStuck = activeFaults['vavHotDamperStuck'+n];
        const mixSignal = clamp(50 + tempError*18, 0, 100);
        let coldTarget = coldDamperStuck!==undefined? coldDamperStuck : (sim.wantRunCold? mixSignal : 0);
        let hotTarget = hotDamperStuck!==undefined? hotDamperStuck : (sim.wantRunHot? (100-mixSignal) : 0);
        if(vavPowerLost || isVavDisconnected(n, 3) || isVavDisconnected(n, 4) || isVavDisconnected(n, 5)){ coldTarget = box.coldDamperPos; }
        if(vavPowerLost || isVavDisconnected(n, 6) || isVavDisconnected(n, 7) || isVavDisconnected(n, 8)){ hotTarget = box.hotDamperPos; }
        if(vavPowerLost){ coldTarget = 0; hotTarget = 0; }
        const prevCold = box.coldDamperPos, prevHot = box.hotDamperPos;
        box.coldDamperPos = slew(box.coldDamperPos, coldTarget, DAMPER_SLEW);
        box.hotDamperPos = slew(box.hotDamperPos, hotTarget, DAMPER_SLEW);
        box.coldDamperDir = box.coldDamperPos>prevCold+0.05? 'open' : (box.coldDamperPos<prevCold-0.05? 'close' : 'idle');
        box.hotDamperDir = box.hotDamperPos>prevHot+0.05? 'open' : (box.hotDamperPos<prevHot-0.05? 'close' : 'idle');
        const designMax2 = sp.maxCfmSP / 2;
        const coldRatio = sim.wantRunCold ? sim.supplyCfm / (designMax2 || 3000) : 0;
        const hotRatio = sim.wantRunHot ? sim.hotDeckCfm / (designMax2 || 3000) : 0;
        const coldFlow = box.designCfm * (box.coldDamperPos/100) * coldRatio;
        const hotFlow = box.designCfm * (box.hotDamperPos/100) * hotRatio;
        const blendedTemp = (coldFlow + hotFlow) > 1 ? (coldFlow*sim.coldDeckTemp + hotFlow*sim.hotDeckTemp)/(coldFlow + hotFlow) : sim.coldDeckTemp;
        box.dischargeTemp = blendedTemp;
        if(sim.dehumidActive){ box.dischargeTemp = Math.min(box.dischargeTemp, box.zoneSP + 5); }
        if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
          const damperStuck = activeFaults['vavDamperStuck'+n];
          let coolTarget;
          if(tempError > 0.3){ coolTarget = clamp(VAV_MIN_PCT + tempError*16, VAV_MIN_PCT, 100); }
          else if(tempError < -0.3){ coolTarget = clamp(VAV_MIN_PCT + (-tempError)*15, VAV_MIN_PCT, 50); }
          else { coolTarget = VAV_MIN_PCT; }
          let damperTarget = damperStuck!==undefined? damperStuck : (sim.wantRunCold? coolTarget : 0);
          if(vavPowerLost) damperTarget = 0;
          box.damperPos = slew(box.damperPos || 10, damperTarget, DAMPER_SLEW);
          box.airflowCfm = coldFlow;
          const offset = box.pressurize === 'negative' ? 600 : -600;
          const exhStuck = activeFaults['vavExhaustDamperStuck'+n];
          const efRunning = sim.ef && (sim.ef.fanA.run || sim.ef.fanB.run);
          if(exhStuck !== undefined){
            const targetExhDmp = (vavPowerLost || !efRunning) ? 0 : exhStuck;
            box.exhaustDamperPos = slew(box.exhaustDamperPos || 0, targetExhDmp, DAMPER_SLEW);
            box.exhaustAirflowCfm = (sim.wantRunCold && efRunning) ? box.designCfm * (box.exhaustDamperPos / 100) : 0;
          } else {
            box.exhaustAirflowCfm = (sim.wantRunCold && !vavPowerLost && efRunning) ? Math.max(0, box.airflowCfm + offset) : 0;
            const targetExhDmp = (vavPowerLost || !sim.wantRunCold || !efRunning) ? 0 : clamp((box.exhaustAirflowCfm / box.designCfm) * 100, 0, 100);
            box.exhaustDamperPos = slew(box.exhaustDamperPos || 0, targetExhDmp, DAMPER_SLEW);
          }
          const isBoxActive = sim.wantRunCold && !vavPowerLost;
          box.zoneTemp += isBoxActive? ((blendedTemp-box.zoneTemp)*0.012*(box.damperPos/100) + (loadBias-box.zoneTemp)*0.004) : (sim.oat-box.zoneTemp)*0.003;
        } else {
          box.airflowCfm = coldFlow + hotFlow;
          const isBoxActive = (sim.wantRunCold || sim.wantRunHot) && !vavPowerLost;
          box.zoneTemp += isBoxActive? ((blendedTemp-box.zoneTemp)*0.012 + (loadBias-box.zoneTemp)*0.004) : (sim.oat-box.zoneTemp)*0.003;
        }
      } else {
        const damperStuck = activeFaults['vavDamperStuck'+n];
        const reheatStuck = activeFaults['vavReheatStuck'+n];
        const electricFail = activeFaults['vavElectricFail'+n];
        let coolTarget, reheatTarget;
        if(tempError > 0.3){
          coolTarget = clamp(VAV_MIN_PCT + tempError*16, VAV_MIN_PCT, 100);
          reheatTarget = 0;
        } else if(tempError < -0.3){
          coolTarget = clamp(VAV_MIN_PCT + (-tempError)*15, VAV_MIN_PCT, 100);
          reheatTarget = clamp(-tempError*40, 0, 100);
        } else { coolTarget = VAV_MIN_PCT; reheatTarget = 0; }
        let damperTarget = damperStuck!==undefined? damperStuck : (wantRun? coolTarget : 0);
        if(vavPowerLost || isVavDisconnected(n, 3)) damperTarget = 0;
        box.damperPos = slew(box.damperPos, damperTarget, DAMPER_SLEW);
        box.airflowCfm = wantRun? box.designCfm*(box.damperPos/100)*ahuFlowRatio : 0;
        if(box.type === 'vav-exhaust' || box.type === 'or' || box.type === 'pr'){
          const offset = box.pressurize === 'negative' ? 600 : -600;
          const exhStuck = activeFaults['vavExhaustDamperStuck'+n];
          const efRunning = sim.ef && (sim.ef.fanA.run || sim.ef.fanB.run);
          if(exhStuck !== undefined){
            const targetExhDmp = (vavPowerLost || !efRunning) ? 0 : exhStuck;
            box.exhaustDamperPos = slew(box.exhaustDamperPos || 0, targetExhDmp, DAMPER_SLEW);
            box.exhaustAirflowCfm = (wantRun && efRunning) ? box.designCfm * (box.exhaustDamperPos / 100) : 0;
          } else {
            box.exhaustAirflowCfm = (wantRun && !vavPowerLost && efRunning) ? Math.max(0, box.airflowCfm + offset) : 0;
            const targetExhDmp = (vavPowerLost || !wantRun || !efRunning) ? 0 : clamp((box.exhaustAirflowCfm / box.designCfm) * 100, 0, 100);
            box.exhaustDamperPos = slew(box.exhaustDamperPos || 0, targetExhDmp, DAMPER_SLEW);
          }
        }
        if(config.vavReheatType==='electric'){
          let elecTarget = electricFail!==undefined? electricFail : (wantRun? reheatTarget : 0);
          if(vavPowerLost || isVavDisconnected(n, 4)) elecTarget = 0;
          box.electricStage = slew(box.electricStage, elecTarget, 12);
          box.reheatValve = 0;
        } else {
          let rhTarget = reheatStuck!==undefined? reheatStuck : (wantRun? reheatTarget : 0);
          if(vavPowerLost || isVavDisconnected(n, 4)) rhTarget = 0;
          box.reheatValve = slew(box.reheatValve, rhTarget, 8);
          box.electricStage = 0;
        }
        const reheatPct = config.vavReheatType==='electric'? box.electricStage : box.reheatValve;
        const reheatRise = (reheatPct/100) * 50;
        const dischargeTemp2 = primaryTemp + reheatRise;
        box.dischargeTemp = dischargeTemp2;
        if(sim.dehumidActive){ box.dischargeTemp = Math.min(box.dischargeTemp, box.zoneSP + 5); }
        const isBoxActive2 = wantRun && !vavPowerLost;
        box.zoneTemp += isBoxActive2? ((box.dischargeTemp-box.zoneTemp)*0.01*(box.airflowCfm/box.designCfm+0.15) + (loadBias-box.zoneTemp)*0.004) : (sim.oat-box.zoneTemp)*0.003;
      }
    }
    box.airflowDisplayCfm = (activeFaults['vavAirflowSensorFault'+n] || vavPowerLost)? 0 : box.airflowCfm;
    box.zoneDisplayTemp = activeFaults['vavZoneSensorDrift'+n]? box.zoneTemp + 8 : box.zoneTemp;
  });
}

function tickExhaustFan(wantRun){
  if(!sim.ef) return;
  const dprSlewRate = 100 / 90;
  const fanA = sim.ef.fanA;
  const fanB = sim.ef.fanB;

  if(wantRun){
    let targetFan = sim.ef.activeFan;
    if(targetFan === 'A' && fanA.fail && !fanB.fail){
      sim.ef.activeFan = 'B'; targetFan = 'B';
      sim.ef.switching = true; sim.ef.faultTimer = 0;
    } else if(targetFan === 'B' && fanB.fail && !fanA.fail){
      sim.ef.activeFan = 'A'; targetFan = 'A';
      sim.ef.switching = true; sim.ef.faultTimer = 0;
    }
    if(targetFan === 'A' && !fanA.fail){
      const dprATarget = activeFaults.efDprAFail ? 0 : 100;
      fanA.damperPos = slew(fanA.damperPos, dprATarget, dprSlewRate);
      fanB.damperPos = slew(fanB.damperPos, 0, dprSlewRate);
      fanA.endSwitch = (fanA.damperPos >= 100);
      fanB.endSwitch = false;
      fanA.run = fanA.endSwitch && !fanA.fail;
      fanB.run = false;
      if(!fanA.run){
        sim.ef.faultTimer += DT;
        if(sim.ef.faultTimer >= 90){ activeFaults.efAFail = true; fanA.fail = true; sim.ef.faultTimer = 0; }
      } else { sim.ef.faultTimer = 0; sim.ef.switching = false; }
    } else if(targetFan === 'B' && !fanB.fail){
      const dprBTarget = activeFaults.efDprBFail ? 0 : 100;
      fanB.damperPos = slew(fanB.damperPos, dprBTarget, dprSlewRate);
      fanA.damperPos = slew(fanA.damperPos, 0, dprSlewRate);
      fanB.endSwitch = (fanB.damperPos >= 100);
      fanA.endSwitch = false;
      fanB.run = fanB.endSwitch && !fanB.fail;
      fanA.run = false;
      if(!fanB.run){
        sim.ef.faultTimer += DT;
        if(sim.ef.faultTimer >= 90){ activeFaults.efBFail = true; fanB.fail = true; sim.ef.faultTimer = 0; }
      } else { sim.ef.faultTimer = 0; sim.ef.switching = false; }
    } else {
      fanA.damperPos = slew(fanA.damperPos, 0, dprSlewRate);
      fanB.damperPos = slew(fanB.damperPos, 0, dprSlewRate);
      fanA.endSwitch = false; fanB.endSwitch = false;
      fanA.run = false; fanB.run = false;
      sim.ef.faultTimer = 0; sim.ef.switching = false;
    }
  } else {
    fanA.damperPos = slew(fanA.damperPos, 0, dprSlewRate);
    fanB.damperPos = slew(fanB.damperPos, 0, dprSlewRate);
    fanA.endSwitch = false; fanB.endSwitch = false;
    fanA.run = false; fanB.run = false;
    sim.ef.faultTimer = 0; sim.ef.switching = false;
  }
  if(fanA.run || fanB.run){
    sim.ef.cfm = sim.vav.reduce((sum, box) => sum + (box.type === 'vav-exhaust' ? box.exhaustAirflowCfm : 0), 0);
  } else { sim.ef.cfm = 0; }
}
