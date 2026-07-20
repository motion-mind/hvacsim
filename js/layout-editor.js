/* ============================================================
   LAYOUT EDITOR — drag/drop, save/load templates, export/import
   ============================================================ */
const factoryLayoutAdjustments = {
  'oaDamperIcon_mixbox': {dx:-45.3, dy:0},
  'oaDamperIcon_hotMixbox': {dx:-45.3, dy:0},
  'readout_mixbox': {dx:2.1, dy:0},
  'readout_hotMixbox': {dx:2.1, dy:0},
  'readout_oaDamper_mixbox': {dx:-45.3, dy:0},
  'readout_oaDamper_hotMixbox': {dx:-45.3, dy:0},
  'readout_oaIntake': {dx:-43.6, dy:0},
  'readout_hotOaIntake': {dx:-43.6, dy:0},
  'lowLimitIcon_preheat': {dx:0, dy:0},
  'vfdIcon_supply': {dx:1, dy:5.2},
  'vfdIcon_return': {dx:3.1, dy:-2.1},
  'raDamperIcon_mixbox': {dx:0, dy:2.1},
  'raDamperIcon_hotMixbox': {dx:0, dy:2.1}
};
let layoutEditMode = false;
let layoutOverrides = {...factoryLayoutAdjustments};
let layoutDragState = null;
let customElements = [];
let customElementCounter = 0;

const elementTypeLabels = {
  sensorTemp:'Temperature Sensor', sensorHumidity:'Humidity Sensor', sensorPressure:'Pressure Sensor',
  sensorStaticPressure:'Static Pressure Sensor', sensorFlow:'Flow Sensor',
  gateValve:'Gate Valve', ballValve:'Ball Valve', butterflyValve:'Butterfly Valve',
  alarmStatus:'Alarm', faultStatus:'Fault', manualOverride:'Manual Override', outOfService:'Out of Service',
  thermalWheel:'Energy Recovery Wheel', ductSection:'Ductwork Section'
};
function describeElementType(type){ return elementTypeLabels[type] || type; }

function svgPointFromEvent(evt, svg){
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  if(!ctm) return {x:0,y:0};
  const p = pt.matrixTransform(ctm.inverse());
  return {x:p.x, y:p.y};
}

function applyOverrideToEl(el, id){
  const ov = layoutOverrides[id];
  if(!ov) return;
  let base = el.getAttribute('data-basetransform');
  if(base===null){ base = el.getAttribute('transform') || ''; el.setAttribute('data-basetransform', base); }
  el.setAttribute('transform', 'translate('+ov.dx+','+ov.dy+') '+base);
}

function applyAllLayoutOverrides(){
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  Object.keys(layoutOverrides).forEach(id=>{
    const el = document.getElementById(id);
    if(el) applyOverrideToEl(el, id);
  });
}

function addCustomElement(type){
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  const vb = svg.viewBox.baseVal;
  const cascade = customElementCounter % 6;
  const x = (vb.width||1400)/2 - 120 + cascade*40;
  const y = (vb.height||380)/2 + cascade*22;
  customElementCounter++;
  const uid = 'custom_'+type+'_'+Date.now()+'_'+customElementCounter;
  customElements.push({uid, type, x, y});
  renderCustomElements();
}

function removeCustomElement(uid){
  customElements = customElements.filter(c=>c.uid!==uid);
  renderCustomElements();
}

function renderCustomElements(){
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  svg.querySelectorAll('[data-custom-el]').forEach(el=>el.remove());
  customElements.forEach(ce=>{
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('id', ce.uid);
    g.setAttribute('data-custom-el','1');
    g.setAttribute('transform','translate('+ce.x+','+ce.y+')');
    g.style.cursor = layoutEditMode? 'move':'default';
    g.innerHTML = gfxWrap(ce.type, '', 1.7);
    svg.appendChild(g);
    g.ondblclick = layoutEditMode? (evt)=>{ evt.preventDefault(); evt.stopPropagation(); removeCustomElement(ce.uid); } : null;
  });
  attachLayoutDragging();
}

function layoutDragStart(evt, el, svg){
  if(!layoutEditMode) return;
  evt.preventDefault(); evt.stopPropagation();
  const start = svgPointFromEvent(evt, svg);
  const isCustom = el.hasAttribute('data-custom-el');
  if(isCustom){
    const ce = customElements.find(c=>c.uid===el.id);
    layoutDragState = {id:el.id, el, startPX:start.x, startPY:start.y, isCustom:true, startX: ce?ce.x:0, startY: ce?ce.y:0};
  } else {
    const ov = layoutOverrides[el.id] || {dx:0,dy:0};
    layoutDragState = {id:el.id, el, startPX:start.x, startPY:start.y, isCustom:false, startDx:ov.dx, startDy:ov.dy};
  }
  try{ el.setPointerCapture(evt.pointerId); }catch(e){}
}

function layoutDragMove(evt, svg){
  if(!layoutDragState) return;
  const p = svgPointFromEvent(evt, svg);
  const ddx = p.x - layoutDragState.startPX, ddy = p.y - layoutDragState.startPY;
  if(layoutDragState.isCustom){
    const ce = customElements.find(c=>c.uid===layoutDragState.id);
    if(ce){ ce.x = layoutDragState.startX + ddx; ce.y = layoutDragState.startY + ddy; layoutDragState.el.setAttribute('transform', 'translate('+ce.x+','+ce.y+')'); }
  } else {
    const dx = layoutDragState.startDx + ddx, dy = layoutDragState.startDy + ddy;
    layoutOverrides[layoutDragState.id] = {dx, dy};
    applyOverrideToEl(layoutDragState.el, layoutDragState.id);
  }
}

function layoutDragEnd(evt){
  if(layoutDragState){ try{ layoutDragState.el.releasePointerCapture(evt.pointerId); }catch(e){} }
  layoutDragState = null;
}

function attachLayoutDragging(){
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  if(!svg._layoutBound){
    svg.addEventListener('pointermove', (e)=>layoutDragMove(e, svg));
    svg.addEventListener('pointerup', layoutDragEnd);
    svg.addEventListener('pointerleave', layoutDragEnd);
    svg._layoutBound = true;
  }
  svg.querySelectorAll('g[id]').forEach(el=>{
    el.style.cursor = layoutEditMode? 'move':'';
    el.onpointerdown = layoutEditMode? (evt)=>layoutDragStart(evt, el, svg) : null;
    if(el.hasAttribute('data-custom-el')){ el.ondblclick = layoutEditMode? (evt)=>{ evt.preventDefault(); evt.stopPropagation(); removeCustomElement(el.id); } : null; }
  });
}

async function saveLayoutTemplate(){
  const name = document.getElementById('layoutTemplateName').value.trim();
  if(!name){ alert('Enter a name for this layout template first.'); return; }
  try{
    const payload = { overrides: layoutOverrides, customElements: customElements };
    await storageSet('ahu-layout:'+name, JSON.stringify(payload));
    document.getElementById('layoutTemplateName').value = '';
    refreshLayoutTemplateList();
  }catch(e){ alert('Could not save layout template: '+e); }
}

async function refreshLayoutTemplateList(){
  const sel = document.getElementById('layoutTemplateSelect');
  try{
    const res = await storageList('ahu-layout:');
    const keys = (res && res.keys) || [];
    sel.innerHTML = '<option value="">— Default Layout —</option>' + keys.map(k=>'<option value="'+k+'">'+k.replace('ahu-layout:','')+'</option>').join('');
  }catch(e){}
}

async function loadLayoutTemplate(key){
  if(!key){ layoutOverrides = {...factoryLayoutAdjustments}; customElements = []; buildSchematic(); return; }
  try{
    const res = await storageGet(key);
    if(!res) return;
    const data = JSON.parse(res.value);
    if(data && data.overrides && !Array.isArray(data.overrides)){
      layoutOverrides = data.overrides;
      customElements = data.customElements || [];
    } else { layoutOverrides = data; customElements = []; }
    buildSchematic();
  }catch(e){ alert('Could not load that layout template.'); }
}

async function deleteLayoutTemplate(key){
  if(!key) return;
  try{ await storageDelete(key); refreshLayoutTemplateList(); }catch(e){}
}

function describeElementId(id){
  const prefixMap = [
    ['hotOaIntake','Hot Deck Outside Air Intake'],
    ['oaIntake','Outside Air Intake'],
    ['hotFilter','Hot Deck Filter Bank'],
    ['filterIcon','Filter Bank'],
    ['oaDamperIcon','Outside Air (OA) Damper'],
    ['raDamperIcon_hotMixbox','Hot Deck Mixed Air (RA) Damper'],
    ['raDamperIcon','Mixed Air (RA) Damper'],
    ['eaDamperIcon','Exhaust Air (EA) Damper'],
    ['supplyDamperIcon_coldDamper','Cold Deck Regulating Damper'],
    ['supplyDamperIcon_hotDamper','Hot Deck Regulating Damper'],
    ['supplyDamperIcon','Supply Duct Damper'],
    ['coilIcon_preheat','Preheat Coil'],
    ['coilIcon_cooling','Cooling Coil'],
    ['coilIcon_hotdeck','Hot Deck Heating Coil'],
    ['coilIcon_reheat','Reheat Coil'],
    ['coilIcon','Coil'],
    ['fanicon_hotdeck','Hot Deck Fan'],
    ['fanicon_supply','Supply Fan'],
    ['fanicon_return','Return Fan'],
    ['humidIcon','Steam Humidifier'],
    ['lowLimitIcon_hotFilter','Hot Deck Freezestat'],
    ['lowLimitIcon','Freezestat (Low Limit)'],
    ['boosterPumpIcon','Preheat Booster Pump'],
    ['aquastatIcon','Aquastat'],
    ['vfdIcon_hotdeck','Hot Deck Fan VFD'],
    ['vfdIcon_supply','Supply Fan VFD'],
    ['vfdIcon_return','Return Fan VFD'],
    ['readout_hotOaIntake','Hot Deck OA Intake Info Box'],
    ['readout_hotMixbox','Hot Deck Mixing Box Info Box'],
    ['readout_hotFilter','Hot Deck Filter Info Box'],
    ['readout_hotdeckfan','Hot Deck Fan Info Box'],
    ['readout_hotdeck','Hot Deck Coil Info Box'],
    ['readout_hotDamper','Hot Deck Damper Info Box'],
    ['readout_hotdischarge','Hot Deck Discharge Info Box'],
    ['readout_coldDamper','Cold Deck Damper Info Box'],
    ['readout_returnfan','Return Fan Info Box'],
    ['readout_raSensor','Return Air Temperature Sensor Info Box'],
    ['readout_exhaust','Exhaust Air Info Box'],
    ['readout_','Info Box']
  ];
  for(const [prefix,label] of prefixMap){ if(id.indexOf(prefix)===0) return label; }
  return id;
}

function buildLayoutExport(){
  const entries = Object.keys(layoutOverrides).map(id=>{
    const ov = layoutOverrides[id];
    return { id, label: describeElementId(id), dx: Math.round(ov.dx*10)/10, dy: Math.round(ov.dy*10)/10 };
  });
  const addedEntries = customElements.map(ce=>({ uid: ce.uid, type: ce.type, label: describeElementType(ce.type), x: Math.round(ce.x*10)/10, y: Math.round(ce.y*10)/10 }));
  return { exportedAt: new Date().toISOString(), note: 'dx/dy are pixel offsets from each element\'s computed default position.', unitConfig: { ductType:config.ductType, dualDuctIndependent:config.dualDuctIndependent, airSystem:config.airSystem, driveType:config.driveType, coolingCoils:config.coolingCoils }, overrides: entries, customElements: addedEntries };
}

function exportLayout(){
  const json = JSON.stringify(buildLayoutExport(), null, 2);
  document.getElementById('exportLayoutText').value = json;
  document.getElementById('exportLayoutBox').style.display = 'block';
  document.getElementById('exportLayoutText').select();
}

function downloadLayoutExport(){
  const json = document.getElementById('exportLayoutText').value;
  if(!json) return;
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ahu-layout-export.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyLayoutExport(){
  const text = document.getElementById('exportLayoutText').value;
  if(!text) return;
  try{ await navigator.clipboard.writeText(text); }
  catch(e){ const ta = document.getElementById('exportLayoutText'); ta.select(); document.execCommand('copy'); }
}

function importLayoutFromJSON(jsonText){
  try{
    const data = JSON.parse(jsonText);
    const newOverrides = {};
    (data.overrides||[]).forEach(o=>{ if(o.id) newOverrides[o.id] = {dx:o.dx||0, dy:o.dy||0}; });
    layoutOverrides = newOverrides;
    customElements = (data.customElements||[]).map(c=>({ uid: c.uid || ('custom_'+c.type+'_'+Date.now()+'_'+Math.random()), type: c.type, x: c.x||0, y: c.y||0 }));
    buildSchematic();
    return true;
  }catch(e){ return false; }
}
