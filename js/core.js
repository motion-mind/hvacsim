"use strict";

window.onerror = function(message, source, lineno, colno, error) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = "position:fixed;top:0;left:0;width:100%;background:#fee2e2;color:#991b1b;border-bottom:3px solid #ef4444;padding:15px;z-index:999999;font-family:monospace;font-size:14px;";
  errDiv.innerHTML = "<b>FATAL ERROR IN AHU SIMULATOR:</b><br/>" + message + "<br/>At line: " + lineno + ":" + colno + "<br/>Source: " + source;
  document.body.appendChild(errDiv);
  return false;
};

/* ============================================================
   PERSISTENCE
   ============================================================ */
const hasCloudStorage = (typeof window.storage !== 'undefined');
async function storageSet(key, value){
  if(hasCloudStorage) return window.storage.set(key, value, false);
  try{ localStorage.setItem(key, value); return {key,value}; }catch(e){ return null; }
}
async function storageGet(key){
  if(hasCloudStorage) return window.storage.get(key, false);
  try{ const v = localStorage.getItem(key); return v===null? null : {key, value:v}; }catch(e){ return null; }
}
async function storageList(prefix){
  if(hasCloudStorage) return window.storage.list(prefix, false);
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && (!prefix || k.indexOf(prefix)===0)) keys.push(k); }
    return {keys};
  }catch(e){ return {keys:[]}; }
}
async function storageDelete(key){
  if(hasCloudStorage) return window.storage.delete(key, false);
  try{ localStorage.removeItem(key); return {key,deleted:true}; }catch(e){ return null; }
}

/* ============================================================
   MATH HELPERS
   ============================================================ */
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function round(v,d){const m=Math.pow(10,d===undefined?0:d);return Math.round(v*m)/m;}
function fmt(v,d){if(v===null||v===undefined||isNaN(v))return "---";return round(v,d===undefined?1:d).toFixed(d===undefined?1:d);}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function rnd(min,max){return min+Math.random()*(max-min);}

/* ============================================================
   PID CONTROLLER
   ============================================================ */
class PID{
  constructor(kp,ki,kd,min,max){this.kp=kp;this.ki=ki;this.kd=kd;this.min=min;this.max=max;this.integral=0;this.prevErr=0;this.first=true;}
  update(sp,pv,dt,reverse){
    let err = reverse ? (pv-sp) : (sp-pv);
    this.integral += err*dt;
    const span = (this.max-this.min);
    const intLimit = this.ki>1e-9 ? span/this.ki : 1e9;
    this.integral = clamp(this.integral, -intLimit, intLimit);
    let deriv = this.first? 0 : (err-this.prevErr)/dt;
    this.first=false;
    this.prevErr = err;
    let out = this.kp*err + this.ki*this.integral + this.kd*deriv;
    return clamp(out,this.min,this.max);
  }
  reset(){this.integral=0;this.prevErr=0;this.first=true;}
}

/* ============================================================
   PSYCHROMETRICS  (approx, sea level)
   ============================================================ */
function satPressurePsia(tempF){
  const tempC=(tempF-32)*5/9;
  const es_kPa = 0.61094*Math.exp((17.625*tempC)/(tempC+243.04));
  return es_kPa*0.145038;
}
function humidityRatio(tempF, rhFrac, P){
  P = P||14.696;
  const pws = satPressurePsia(tempF);
  const pw = clamp(rhFrac,0,1)*pws;
  return 0.622*pw/Math.max(0.01,(P-pw));
}
function enthalpy(tempF, rhFrac) {
  const W = humidityRatio(tempF, rhFrac);
  return 0.240 * tempF + W * (1061 + 0.444 * tempF);
}
function rhFromW(tempF, W, P){
  P = P||14.696;
  const pws = satPressurePsia(tempF);
  const pw = (W*P)/(0.622+W);
  return clamp(pw/pws,0,1);
}
function dewPointF(tempF, rhFrac){
  const W = humidityRatio(tempF, rhFrac);
  let lo=-40, hi=tempF;
  for(let i=0;i<40;i++){
    const mid=(lo+hi)/2;
    const Wsat = humidityRatio(mid,1.0);
    if(Wsat>W) hi=mid; else lo=mid;
  }
  return (lo+hi)/2;
}

/* ============================================================
   POINT NAME HELPER
   ============================================================ */
function pn(full, acr){ return acr? (full+" ("+acr+")") : full; }

/* ============================================================
   CONFIG / STATE
   ============================================================ */
let config = {
  controlType:'cfm',
  ductType:'single',
  dualDuctIndependent:false,
  airSystem:'return',
  includeOa:true,
  includeEa:true,
  supplyFan:'single',
  supplyFanCount:1,
  returnFan:'single',
  returnFanCount:1,
  driveType:'vfd',
  singleDrive:true,
  driveSignal:'pct',
  damperSignal:'pct',
  valveSignal:'pct',
  coolingCoils:'single',
  preheat:true,
  reheat:false,
  dehumidEnabled:true,
  steamHumid:false,
  preheatBoosterPump:false,
  preheatAquastat:false,
  vavCount:0,
  vavsExhaustCount:0,
  fcuCount:0,
  orCount:0,
  prCount:0,
  vavReheatType:'hotwater'
};

let sp = {
  supplyCfmSP:24800, maxCfmSP:30000, staticSP:1.6, oaCfmSP:8500, diffCfmSP:16300,
  preheatDischargeSP:50, coolingDischargeSP:55, hotDeckSP:95,
  reheatSpaceSP:72, humidityMinSP:38, humidityMaxSP:55, freezestatSP:37, highStaticSP:4.5,
  minOaDamperPos:20, aquastatSP:110, boosterPumpStartPct:5, hotDeckCfmSP:4000, hotDeckOaCfmSP:800
};

/* ============================================================
   CONSTANTS
   ============================================================ */
const WATER = { chw:43, phw:160, rhw:160 };
const VAV_MIN_PCT = 10;

/* ============================================================
   SIMULATION STATE VARIABLES
   ============================================================ */
let sim = null;
let faultsCatalog = [];
let activeFaults = {};
let activeScenario = null;
let manualSafety = { fireAlarm:false, smokeDamperFail:false, doorOpen:false };
let latched = { freezestat:false, highStatic:false, aquastat:false, hotFreezestat:false };
let freezestatRecovering = false;
let meterDamaged = false;
let meterMode = 'vdc';
let probeRed=null, probeBlack=null;
let disconnectedTerminals = new Set();
let vavMeterDamaged = false;
let vavMeterMode = 'vdc';
let vavProbeRed=null, vavProbeBlack=null;
let disconnectedVavTerminals = new Set();
let vavTerminals = [];
let terminals = [];
let currentFaultDesc = [];
let currentVavFaultDesc = [];
let activeVavScenario = null;
