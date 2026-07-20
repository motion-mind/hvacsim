/* ============================================================
   SETUP TAB — build config UI
   ============================================================ */
const setupFields = [
  {key:'ductType', label:'AHU Type', type:'select', opts:[['single','Single Duct'],['dual','Dual Duct']], section:'supply',
    onChange:(c)=>{ if(c.ductType==='dual'){ c.coolingCoils='single'; c.reheat=false; c.steamHumid=false; } }},
  {key:'dualDuctIndependent', label:'Hot Deck / Cold Deck Fans', type:'bool', section:'supply',
    on:'Independent (each deck has its own dedicated fan)', off:'Shared (common fan bank feeds both decks)',
    hideIf: c=>c.ductType!=='dual'},
  {key:'supplyFanCount', label:'Supply Fan Motors', type:'number', min:1, max:12, section:'supply'},
  {key:'driveType', label:'Motor Drive Type', type:'select', opts:[['vfd','Variable Frequency Drive (VFD)'],['starter','Motor Starter (Fixed Speed)']], section:'supply'},
  {key:'singleDrive', label:'VFD Drive Configuration', type:'bool', section:'supply',
    on:'Single Drive (one shared VFD drives all motors)', off:'Separate Drives (one VFD drive per motor)',
    hideIf: c=> c.driveType !== 'vfd' || (c.supplyFanCount <= 1 && (c.airSystem === 'oa100' || c.returnFanCount <= 1))},
  {key:'controlType', label:'Fan Control Method', type:'select', opts:[['cfm','CFM (Airflow) Control'],['static','Static Pressure Control']], section:'supply'},
  {key:'_starterNote', label:'', type:'info', hideIf: c=>c.driveType!=='starter', section:'supply',
    text:'Motor starters can\'t modulate speed, so a modulating Supply Duct Damper is automatically added.'},
  {key:'driveSignal', label:'VFD Speed Signal', type:'select', hideIf: c=>c.driveType!=='vfd', section:'signals',
    opts:[['pct','0\u2013100%'],['vdc','0\u201310 VDC'],['ma','4\u201320 mA'],['hz','0\u201360 Hz']]},
  {key:'damperSignal', label:'Damper Signal', type:'select', section:'signals',
    opts:[['pct','0\u2013100%'],['vdc','0\u201310 VDC'],['ma','4\u201320 mA'],['psi38','3\u20138 PSI (Pneumatic)'],['psi315','3\u201315 PSI (Pneumatic)']]},
  {key:'valveSignal', label:'Valve Signal', type:'select', section:'signals',
    opts:[['pct','0\u2013100%'],['vdc','0\u201310 VDC'],['ma','4\u201320 mA'],['psi38','3\u20138 PSI (Pneumatic)'],['psi315','3\u201315 PSI (Pneumatic)']]},
  {key:'airSystem', label:'Air System', type:'select', opts:[['return','Return Air System'],['oa100','100% Outside Air (OA)']], section:'return',
    onChange:(c)=>{ if(c.airSystem==='oa100'){ c.returnFanCount=1; c.returnFan='single'; } }},
  {key:'returnFanCount', label:'Return Fan Motors', type:'number', min:1, max:12, hideIf: c=>c.airSystem==='oa100', section:'return'},
  {key:'coolingCoils', label:'Cooling Coil(s)', type:'select', opts:[['single','Single Cooling Coil'],['dual','Dual (2-Stage) Cooling Coils']], section:'coils'},
  {key:'preheat', label:'Preheat Coil', type:'bool', on:'Preheat Coil Installed', off:'No Preheat Coil', section:'coils',
    onChange:(c)=>{ if(!c.preheat){ c.preheatBoosterPump=false; c.preheatAquastat=false; } }},
  {key:'reheat', label:'Reheat Coil', type:'bool', on:'Reheat Coil Installed', off:'No Reheat Coil', hideIf: c=>c.ductType==='dual', section:'coils',
    onChange:(c)=>{ if(c.reheat){ c.vavCount=0; c.vavsExhaustCount=0; c.fcuCount=0; } }},
  {key:'_reheatVavNote', label:'', type:'info', hideIf: c=>c.ductType==='dual' || !c.reheat, section:'coils',
    text:'A single-duct AHU with its own reheat coil acts as a single-zone VAV unit.'},
  {key:'steamHumid', label:'Humidification', type:'bool', on:'Steam Humidifier Installed', off:'No Humidifier', section:'other'},
  {key:'preheatBoosterPump', label:'Preheat Water Booster Pump', type:'bool', on:'Booster Pump Installed', off:'No Booster Pump', hideIf: c=>!c.preheat, section:'other'},
  {key:'preheatAquastat', label:'Preheat Water Low-Temperature Aquastat', type:'bool', on:'Aquastat Installed', off:'No Aquastat', hideIf: c=>!c.preheat, section:'other'},
  {key:'vavCount', label:'VAVs', type:'number', min:0, max:10, section:'terminals'},
  {key:'vavsExhaustCount', label:'Exhaust VAVs', type:'number', min:0, max:10, section:'terminals'},
  {key:'fcuCount', label:'Fan Coil Units', type:'number', min:0, max:10, section:'terminals'},
  {key:'orCount', label:'Operating Rooms', type:'number', min:0, max:10, section:'terminals',
    onChange:(c)=>{ if((c.orCount||0)>0 || (c.prCount||0)>0) c.steamHumid=true; }},
  {key:'prCount', label:'Procedure Rooms', type:'number', min:0, max:10, section:'terminals',
    onChange:(c)=>{ if((c.orCount||0)>0 || (c.prCount||0)>0) c.steamHumid=true; }},
  {key:'vavReheatType', label:'VAV Reheat Type', type:'select', opts:[['hotwater','Hot Water Reheat'],['electric','Electric Reheat']],
    hideIf: c=>(c.vavCount===0 && c.vavsExhaustCount===0 && c.orCount===0 && c.prCount===0) || c.ductType==='dual', section:'terminals'}
];

function renderSetupGrid(){
  const el = document.getElementById('setupGrid');
  el.innerHTML='';

  const sections = [
    {id:'supply', label:'Supply Air'},
    {id:'return', label:'Return Air'},
    {id:'coils', label:'Coils'},
    {id:'signals', label:'Signals'},
    {id:'other', label:'Other'},
    {id:'terminals', label:'Terminal Boxes'}
  ];

  sections.forEach(sec=>{
    const fields = setupFields.filter(f=>f.section === sec.id);
    const visibleFields = fields.filter(f=>!f.hideIf || !f.hideIf(config));
    if(visibleFields.length === 0) return;

    const secBox = document.createElement('div');
    secBox.className = 'setup-section';
    secBox.style = 'background:var(--panel-inset);border:1px solid var(--line-soft);border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:10px;';

    let html = '<h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);font-family:var(--mono);margin:0 0 4px;border-bottom:1px dashed var(--line-soft);padding-bottom:6px;">'+sec.label+'</h3>';
    secBox.innerHTML = html;

    visibleFields.forEach(f=>{
      const wrap = document.createElement('div');
      if(f.type==='select'){
        wrap.innerHTML = '<label class="field">'+f.label+
          '<select data-key="'+f.key+'">'+
          f.opts.map(o=>'<option value="'+o[0]+'" '+(config[f.key]===o[0]?'selected':'')+'>'+o[1]+'</option>').join('')+
          '</select></label>';
      } else if(f.type==='bool'){
        wrap.innerHTML = '<label class="field">'+f.label+
          '<div class="checkrow"><input type="checkbox" data-key="'+f.key+'" '+(config[f.key]?'checked':'')+'>'+
          '<span>'+(config[f.key]?f.on:f.off)+'</span></div></label>';
      } else if(f.type==='info'){
        wrap.innerHTML = '<div class="helpbox" style="margin:4px 0;">'+f.text+'</div>';
      } else if(f.type==='number'){
        wrap.innerHTML = '<label class="field">'+f.label+
          '<input type="number" min="'+(f.min!==undefined?f.min:0)+'" max="'+(f.max!==undefined?f.max:12)+'" data-key="'+f.key+'" value="'+config[f.key]+'">'+
          '</label>';
      }
      secBox.appendChild(wrap);
    });
    el.appendChild(secBox);
  });

  el.querySelectorAll('select[data-key]').forEach(sel=>{
    sel.addEventListener('change',()=>{
      config[sel.dataset.key]=sel.value;
      const f = setupFields.find(x=>x.key===sel.dataset.key);
      if(f && f.onChange) f.onChange(config);
      renderSetupGrid();
    });
  });
  el.querySelectorAll('input[type=checkbox][data-key]').forEach(chk=>{
    chk.addEventListener('change',()=>{
      config[chk.dataset.key]=chk.checked;
      const f = setupFields.find(x=>x.key===chk.dataset.key);
      if(f && f.onChange) f.onChange(config);
      renderSetupGrid();
    });
  });
  el.querySelectorAll('input[type=number][data-key]').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const key = inp.dataset.key;
      let minVal = (['vavCount','vavsExhaustCount','fcuCount','orCount','prCount'].includes(key))? 0 : 1;
      let maxVal = 12;
      if(['vavCount','vavsExhaustCount','fcuCount','orCount','prCount'].includes(key)) maxVal = 10;
      config[key]=clamp(parseInt(inp.value)||0, minVal, maxVal);
      if(key === 'supplyFanCount'){
        config.supplyFan = config.supplyFanCount > 1 ? 'wall' : 'single';
      } else if(key === 'returnFanCount'){
        config.returnFan = config.returnFanCount > 1 ? 'wall' : 'single';
      }
      renderSetupGrid();
    });
  });
}
