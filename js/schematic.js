/* ============================================================
   SCHEMATIC — buildSchematicCore, drawStation, updateSchematicReadouts
   ============================================================ */
function collectGfxCss(names){
  const seen = {}; let css='';
  names.forEach(n=>{ if(!seen[n] && GFX[n]){ seen[n]=true; css+=GFX[n].css+'\n'; } });
  return css;
}

/* ---------- Duct drawing helpers (clean open-junction outlines) ---------- */
// Segments a 1-D range [min..max] around an array of gap {from,to} objects.
function _ductSegs(min, max, gaps){
  const sorted = (gaps||[]).slice().sort((a,b)=>a.from-b.from);
  const segs=[]; let cur=min;
  for(const g of sorted){
    if(g.from>cur+0.1) segs.push([cur,g.from]);
    cur=Math.max(cur,g.to);
  }
  if(cur<max-0.1) segs.push([cur,max]);
  return segs;
}
// Builds a stroke-only <path> for a horizontal duct rect with optional gaps
// in the bottom edge (holesBot) and/or top edge (holesTop). Each hole is {from:x1, to:x2}.
// openLeft/openRight: suppress the vertical end-cap on that side (used at duct junctions).
function horizDuctSVG(x, y, w, h, holesBot, holesTop, openLeft, openRight){
  const x2=x+w, y2=y+h;
  const fill=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BAS.duct}" stroke="none"/>`;
  let d='';
  // top edge
  _ductSegs(x,x2,holesTop).forEach(([a,b])=>{ d+=`M ${a} ${y} L ${b} ${y} `; });
  // right edge
  if(!openRight) d+=`M ${x2} ${y} L ${x2} ${y2} `;
  // bottom edge
  _ductSegs(x,x2,holesBot).forEach(([a,b])=>{ d+=`M ${a} ${y2} L ${b} ${y2} `; });
  // left edge
  if(!openLeft)  d+=`M ${x} ${y} L ${x} ${y2} `;
  return fill+`<path d="${d.trim()}" fill="none" stroke="${BAS.line}" stroke-width="2" stroke-linecap="square"/>`;
}
// Vertical duct (riser) — draws fill + left/right sides only; no caps at junctions.
// openTop/openBottom: true = omit that cap (connection to another duct).
function vertDuctSVG(x, y, w, h, openTop, openBottom){
  const x2=x+w, y2=y+h;
  const fill=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BAS.duct}" stroke="none"/>`;
  let d=`M ${x} ${y} L ${x} ${y2} M ${x2} ${y} L ${x2} ${y2} `;
  if(!openTop)    d+=`M ${x} ${y}  L ${x2} ${y}  `;
  if(!openBottom) d+=`M ${x} ${y2} L ${x2} ${y2} `;
  return fill+`<path d="${d.trim()}" fill="none" stroke="${BAS.line}" stroke-width="2" stroke-linecap="square"/>`;
}

function shortDuctLabel(text){
  let t = text.replace(/\s*\(Cold Deck\)/i,'').replace(/\s*\(Hot Deck\)/i,'');
  t = t.replace(/Outside Air \(OA\)/i,'OA').replace(/Return Air \(RA\)/i,'RA');
  return t.toUpperCase();
}

function drawStation(it, ductY, ductH, laneFlip){
  const cx = it.cx, topY = ductY-ductH/2, botY = ductY+ductH/2;
  const outward = (dist)=> laneFlip==='down'? botY+dist : topY-dist;
  const labelY = laneFlip==='up'? (topY-26) : botY;
  let html = '<g>';
  if(it.kind==='oaIntake' || it.kind==='oaIntake100'){
    html += stationLabel(cx, labelY, shortDuctLabel(it.title));
  } else if(it.kind==='firedamper'){
    html += '<g id="fireDamperIcon_'+it.id+'" transform="translate('+cx+','+ductY+')">'+damperGfx(0,false)+'</g>';
    html += stationLabel(cx, labelY, shortDuctLabel(it.title));
  } else if(it.kind==='supplydamper'){
    html += '<g id="supplyDamperIcon_'+it.id+'" transform="translate('+cx+','+ductY+')">'+damperGfx(0,false)+'</g>';
    const dmpLbl = it.id==='coldDamper'?'COLD DECK DAMPER':it.id==='hotDamper'?'HOT DECK DAMPER':'SUPPLY DUCT DAMPER';
    html += stationLabel(cx, labelY, dmpLbl);
  } else if(it.kind==='filter'){
    html += '<g id="filterIcon_'+it.id+'" transform="translate('+cx+','+ductY+')">'+filterGfx(false)+'</g>';
    const filterLabelY = (config.ductType==='single' && !config.includeOa) ? (topY - 26) : labelY;
    html += stationLabel(cx, filterLabelY, shortDuctLabel(it.title));
  } else if(it.kind==='mixdampers'){
    html += '<g id="oaDamperIcon_'+it.id+'" transform="translate('+(it.x+16)+','+ductY+')">'+damperGfx(0,false)+'</g>';
    html += '<g id="readout_oaDamper_'+it.id+'"></g>';
  } else if(it.kind==='coil'){
    const isHeat = (it.id==='preheat'||it.id==='reheat'||it.id==='hotdeck');
    html += '<g id="coilIcon_'+it.id+'" transform="translate('+cx+','+ductY+')">'+(isHeat? heatingCoilGfx(0,false,it.id) : coolingCoilGfx(0,false))+'</g>';
    const pipeColor = isHeat? '#c0392b':'#2b6cb0';
    html += '<line x1="'+cx+'" y1="'+outward(50)+'" x2="'+cx+'" y2="'+outward(0)+'" stroke="'+pipeColor+'" stroke-width="3"/>';
    html += '<g transform="translate('+cx+','+outward(50)+') scale(2.1)">'+gfxWrap('globeValve','',1)+'</g>';
    if(it.id==='preheat' && config.includeOa){
      html += '<g id="lowLimitIcon_'+it.id+'" transform="translate('+(cx+36)+','+outward(6)+') scale(0.85)">'+lowLimitGfx(false)+'</g>';
    }
    if(it.id==='hotdeck' && config.includeOa && config.dualDuctIndependent){
      html += '<g id="lowLimitIcon_hotFilter" transform="translate('+(cx+36)+','+outward(6)+') scale(0.85)">'+lowLimitGfx(false)+'</g>';
    }
    if(it.id==='preheat'){
      if(config.preheatBoosterPump){ html += '<g id="boosterPumpIcon" transform="translate('+(cx-26)+','+outward(26)+') scale(0.8)">'+pumpGfx('off')+'</g>'; }
      if(config.preheatAquastat){ html += '<g id="aquastatIcon" transform="translate('+(cx+26)+','+outward(26)+') scale(0.85)">'+lowLimitGfx(false)+'</g>'; }
    }
    const sensorOffset = (it.id === 'cooling' || it.id === 'coil1' || it.id === 'coil2') ? 88 : ((it.id === 'preheat' || it.id === 'hotdeck') ? 36 : 72);
    html += '<g id="readout_'+it.id+'_lat"></g>';
    const coilLabels = { preheat:'PREHEAT COIL', reheat:'REHEAT COIL', hotdeck:'HOT DECK COIL', coil1:'COOLING COIL 1', coil2:'COOLING COIL 2' };
    const lbl = coilLabels[it.id] || (config.coolingCoils==='dual'?'COOLING COILS 1 & 2':'COOLING COIL');
    html += stationLabel(cx, labelY, lbl);
  } else if(it.kind==='fan'){
    if(it.id==='supplyfan'){
      const n = config.supplyFan==='wall'? config.supplyFanCount:1;
      for(let i=0;i<n;i++){ const fx = n===1? cx : (it.x+22+i*28); html += '<g id="fanicon_supply_'+i+'" transform="translate('+fx+','+ductY+')">'+fanSupplyGfx('off')+'</g>'; }
      if(config.driveType==='vfd'){
        if(config.singleDrive || n===1){ html += '<g id="vfdIcon_supply" transform="translate('+(it.x+it.w+20)+','+outward(6)+') scale(0.8)">'+gfxWrap('vfd','','1','supply')+'</g>'; }
        else { for(let i=0;i<n;i++){ const fx = it.x+22+i*28; html += '<g id="vfdIcon_supply_'+i+'" transform="translate('+(fx-10)+','+(ductY-45)+') scale(0.6)">'+gfxWrap('vfd','','1','supply_'+i)+'</g>'; } }
      }
    } else if(it.id==='hotdeckfan'){
      const n = config.supplyFan==='wall'? config.supplyFanCount:1;
      for(let i=0;i<n;i++){ const fx = n===1? cx : (it.x+22+i*28); html += '<g id="fanicon_hotdeck_'+i+'" transform="translate('+fx+','+ductY+')">'+fanSupplyGfx('off')+'</g>'; }
      if(config.driveType==='vfd'){
        if(config.singleDrive || n===1){ html += '<g id="vfdIcon_hotdeck" transform="translate('+(it.x+it.w+20)+','+outward(6)+') scale(0.8)">'+gfxWrap('vfd','','1','hotdeckfan')+'</g>'; }
        else { for(let i=0;i<n;i++){ const fx = it.x+22+i*28; html += '<g id="vfdIcon_hotdeck_'+i+'" transform="translate('+(fx-10)+','+(ductY-45)+') scale(0.6)">'+gfxWrap('vfd','','1','hotdeck_'+i)+'</g>'; } }
      }
    }
    html += stationLabel(cx, labelY, shortDuctLabel(it.title));
  } else if(it.kind==='humid'){
    html += '<rect x="'+it.x+'" y="'+topY+'" width="'+it.w+'" height="'+ductH+'" fill="'+BAS.duct+'" stroke="none"/>';
    html += '<g id="humidIcon" transform="translate('+cx+','+ductY+')">'+humidifierGfx(false,false)+'</g>';
    html += stationLabel(cx, labelY, 'STEAM HUMIDIFIER');
  }
  html += '<g id="readout_'+it.id+'"></g>';
  html += '</g>';
  return html;
}

function arrowFlowLine(x1, y1, x2, y2, dir, id, flowCls){
  const isHoriz = y1 === y2;
  const len = isHoriz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const count = Math.max(2, Math.floor(len / 36));
  const spacing = len / count;
  const ddx = isHoriz ? Math.sign(x2 - x1) * spacing : 0;
  const ddy = isHoriz ? 0 : Math.sign(y2 - y1) * spacing;
  const animCls = dir === 'fwd' ? (isHoriz ? 'flow-arrow' : 'flow-arrow-down') : (isHoriz ? 'flow-arrow-rev' : 'flow-arrow-up');
  const pts = dir === 'fwd' ? (isHoriz ? '-7,-4 7,0 -7,4' : '-4,-7 0,7 4,-7') : (isHoriz ? '7,-4 -7,0 7,4' : '4,7 0,-7 -4,7');

  let html = '<g id="'+id+'" class="'+flowCls+'">';
  for (let i = 0; i < count; i++) {
    const cx = x1 + (i + 0.5) * ddx;
    const cy = y1 + (i + 0.5) * ddy;
    const delay = dir === 'fwd' ? ((count - 1 - i) / count).toFixed(3) : (i / count).toFixed(3);
    html += '<g transform="translate('+cx+','+cy+')"><polygon points="'+pts+'" class="'+animCls+'" style="animation-delay:-'+delay+'s"/></g>';
  }
  html += '</g>';
  return html;
}

function arrowFlowLineAngled(x1, y1, x2, y2, id, flowCls){
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const count = Math.max(1, Math.floor(len / 30));
  const spacing = len / count;
  const ddx = (dx / len) * spacing;
  const ddy = (dy / len) * spacing;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const pts = '-7,-4 7,0 -7,4';
  
  let html = '<g id="'+id+'" class="'+flowCls+'">';
  for (let i = 0; i < count; i++) {
    const cx = x1 + (i + 0.5) * ddx;
    const cy = y1 + (i + 0.5) * ddy;
    const delay = ((count - 1 - i) / count).toFixed(3);
    html += '<g transform="translate('+cx+','+cy+') rotate('+angle+')"><polygon points="'+pts+'" class="flow-arrow" style="animation-delay:-'+delay+'s"/></g>';
  }
  html += '</g>';
  return html;
}

function buildSchematicCore(){
  const svg = document.getElementById('schematicSvg');
  const independent = config.ductType==='dual' && config.dualDuctIndependent;
  const sharedDual = config.ductType==='dual' && !independent;
  const showSecondRow = independent || sharedDual;
  const hasReturn = config.airSystem==='return';
  const hasReturnFan = hasReturn && config.returnFanCount > 0;
  const ductH = 60;
  const laneGap = 24;
  const laneOffset = ductH/2 + laneGap/2;
  const coldY = sharedDual? 310 : (showSecondRow? 190 : 225);

  let ry = null, hotY = null, coldLaneY = coldY;
  if(independent){
    if(hasReturn){ ry = coldY + 170; hotY = ry + 190; }
    else { hotY = coldY + 260; }
  } else if(sharedDual){
    coldLaneY = coldY - laneOffset;
    hotY = coldY + laneOffset;
    if(hasReturn) ry = hotY + 190;
  } else { if(hasReturn) ry = coldY + 280; }

  let x = (!config.includeOa && config.includeEa) ? 189 : 70;
  const items = [];
  let currentAddY = coldY;
  function add(kind, w, id, title){
    items.push({kind, x, w, id, title, cx:x+w/2, y:currentAddY});
    x += w + 64;
  }
  const coldSuffix = showSecondRow? ' (Cold Deck)' : '';
  if(config.includeOa){
    if(hasReturn){
      add('oaIntake', 58, 'oaIntake', pn('Outside Air','OA')+' Intake'+coldSuffix);
      add('mixdampers', 70, 'mixbox', pn('Outside Air','OA')+' / '+pn('Return Air','RA')+' Mixing Dampers'+coldSuffix);
    } else { add('oaIntake100', 70, 'oaIntake', '100% '+pn('Outside Air','OA')+' Intake'+coldSuffix); }
  }
  add('filter', 54, 'filter', 'Filter Bank'+coldSuffix);
  if(config.preheat) add('coil', 80, 'preheat', 'Preheat Coil'+coldSuffix);
  const fanBaseName = showSecondRow ? (sharedDual ? 'Supply Fan' : 'Cold Deck Fan') : (config.supplyFan==='wall' ? 'Supply Fan Wall' : 'Supply Fan');
  add('fan', config.supplyFan==='wall'? (26*config.supplyFanCount+20) : 66, 'supplyfan', showSecondRow ? (config.supplyFan==='wall'?(sharedDual?'Supply Fan Wall':'Cold Deck Fan Wall'):fanBaseName) : fanBaseName);
  const forkX = x;
  const taperW = 50;
  if(sharedDual){ x = forkX + taperW; currentAddY = coldLaneY; }
  const coldLaneStartIdx = items.length;
  if(config.coolingCoils==='dual'){
    add('coil', 80, 'coil1', 'Cooling Coil 1');
    add('coil', 80, 'coil2', 'Cooling Coil 2');
  } else { add('coil', 80, 'cooling', 'Cooling Coil'); }
  if(config.ductType==='dual'){
    if(config.steamHumid) add('humid', 54, 'humid', 'Steam Humidifier');
    add('supplydamper', 50, 'coldDamper', 'Cold Deck Damper');
  } else {
    if(config.driveType==='starter') add('supplydamper', 54, 'supplydamper', 'Supply Duct Damper');
    if(config.reheat) add('coil', 80, 'reheat', 'Reheat Coil');
    if(config.steamHumid) add('humid', 54, 'humid', 'Steam Humidifier');
  }
  add('discharge', 68, 'discharge', 'To Zones');

  const hotItems = [];
  let hx = (!config.includeOa && config.includeEa) ? 189 : 70;
  if(independent){
    function addHot(kind, w, id, title){
      hotItems.push({kind, x:hx, w, id, title, cx:hx+w/2, y:hotY});
      hx += w + 64;
    }
    if(config.includeOa){
      if(hasReturn){
        addHot('oaIntake', 58, 'hotOaIntake', pn('Outside Air','OA')+' Intake (Hot Deck)');
        addHot('mixdampers', 70, 'hotMixbox', pn('Outside Air','OA')+' / '+pn('Return Air','RA')+' Mixing Dampers (Hot Deck)');
      } else { addHot('oaIntake100', 70, 'hotOaIntake', '100% '+pn('Outside Air','OA')+' Intake (Hot Deck)'); }
    }
    addHot('filter', 54, 'hotFilter', 'Filter Bank (Hot Deck)');
    addHot('fan', config.supplyFan==='wall'? (26*config.supplyFanCount+20) : 66, 'hotdeckfan', (config.supplyFan==='wall'?'Hot Deck Fan Wall':'Hot Deck Fan'));
    addHot('coil', 80, 'hotdeck', 'Hot Deck Heating Coil');
    addHot('supplydamper', 50, 'hotDamper', 'Hot Deck Damper');
    addHot('discharge', 68, 'hotdischarge', 'To Zones');
  } else if(sharedDual){
    hx = forkX + taperW;
    function addHotBranch(kind, w, id, title){
      hotItems.push({kind, x:hx, w, id, title, cx:hx+w/2, y:hotY});
      hx += w + 64;
    }
    addHotBranch('coil', 90, 'hotdeck', 'Hot Deck Heating Coil');
    addHotBranch('supplydamper', 56, 'hotDamper', 'Hot Deck Damper');
    addHotBranch('discharge', 78, 'hotdischarge', 'To Zones');
  }

  if(config.ductType==='dual'){
    const alignMap = { 'hotOaIntake':'oaIntake', 'hotMixbox':'mixbox', 'hotFilter':'filter', 'hotdeckfan':'supplyfan', 'hotdeck': config.coolingCoils==='dual' ? 'coil1' : 'cooling', 'hotDamper':'coldDamper', 'hotdischarge':'discharge' };
    hotItems.forEach(h => {
      const targetId = alignMap[h.id];
      if(targetId){ const c = items.find(x => x.id === targetId); if(c){ h.x = c.x; h.w = c.w; h.cx = c.cx; } }
    });
    hx = x;
  }

  let deepestY = coldY;
  if(hotY!==null) deepestY = Math.max(deepestY, hotY);
  if(ry!==null) deepestY = Math.max(deepestY, ry);
  const viewW = (Math.max(x, hx) + 70) / 0.85;
  const canvasH = (deepestY + 180) / 0.85;
  svg.setAttribute('viewBox','0 0 '+viewW+' '+canvasH);

  const usedSymbols = ['damper','fan','fanSupply','fanReturn','coolingCoil','heatingCoil','humidifier','lowLimit','globeValve','vfd','pump'];
  let s = '<defs><style>'+collectGfxCss(usedSymbols)+' .safetext { font-family:Arial;font-size:8px;font-weight:700;text-anchor:middle; } .safetext.tripped { fill:#fff; } @keyframes safetyFlash { 0%,100% { fill:#e74c3c; } 50% { fill:#c0392b; } } .safety-blink { animation:safetyFlash 1s infinite; }</style></defs>';

  const ductStart = (hasReturn && !config.includeOa) ? (items[0].x - 39) : (items[0].x - 22);
  const preforkItems = sharedDual? items.slice(0, coldLaneStartIdx) : items;
  const coldLaneItems = sharedDual? items.slice(coldLaneStartIdx) : [];
  const preforkEnd = sharedDual? forkX : (items[items.length-1].x + items[items.length-1].w + 22);
  const ductEnd = items[items.length-1].x + items[items.length-1].w + 22;

  // Pre-compute riser positions so duct outlines can leave open junctions.
  let _riserX=null, _hRiserX=null;
  if(hasReturn){
    _riserX = config.includeOa ? items[1].cx : (items[0].x - 11);
    if(independent) _hRiserX = config.includeOa ? (hotItems[1] ? hotItems[1].cx : (hotItems[0].x-11)) : (hotItems[0].x - 11);
  }
  const riserW = 56;

  if(sharedDual){
    const splitX = forkX + taperW;
    // Main prefork duct — gap in bottom at riser; right edge open (fork polygon continues there)
    const supBotHoles = (hasReturn && _riserX !== null) ? [{from: _riserX-riserW/2, to: _riserX+riserW/2}] : null;
    s += horizDuctSVG(ductStart, coldY-ductH/2, forkX-ductStart, ductH, supBotHoles, null, true, true);
    // Replace right side line with none (fork polygon continues)
    // Fork fill polys (no stroke) + custom slant-only outline paths
    s += `<polygon points="${forkX},${coldY-ductH/2} ${forkX},${coldY} ${splitX},${coldLaneY+ductH/2} ${splitX},${coldLaneY-ductH/2}" fill="${BAS.duct}" stroke="none"/>`;
    s += `<polygon points="${forkX},${coldY} ${forkX},${coldY+ductH/2} ${splitX},${hotY+ductH/2} ${splitX},${hotY-ductH/2}" fill="${BAS.duct}" stroke="none"/>`;
    // Upper fork outer edges only (slants, no left/right vertical seams)
    s += `<path d="M ${forkX} ${coldY-ductH/2} L ${splitX} ${coldLaneY-ductH/2} M ${forkX} ${coldY} L ${splitX} ${coldLaneY+ductH/2}" fill="none" stroke="${BAS.line}" stroke-width="2" stroke-linecap="square"/>`;
    // Lower fork outer edges only
    s += `<path d="M ${forkX} ${coldY} L ${splitX} ${hotY-ductH/2} M ${forkX} ${coldY+ductH/2} L ${splitX} ${hotY+ductH/2}" fill="none" stroke="${BAS.line}" stroke-width="2" stroke-linecap="square"/>`;
    // Cold lane — left edge open (fork polygon arrives there)
    s += horizDuctSVG(splitX, coldLaneY-ductH/2, ductEnd-splitX, ductH, null, null, true, true);
    s += arrowFlowLine(ductStart, coldY, forkX - 36, coldY, 'fwd', 'flow_preForkSupply', 'flow-fwd');
    s += arrowFlowLineAngled(forkX, coldY - ductH/4, splitX, coldLaneY, 'flow_coldSplitter', 'flow-fwd');
    s += arrowFlowLine(splitX, coldLaneY, ductEnd, coldLaneY, 'fwd', 'flow_coldSupply', 'flow-fwd');
    s += '<text x="'+ductStart+'" y="'+(coldY-ductH/2-10)+'" font-family="Arial" font-size="10" font-weight="700" fill="'+BAS.textDim+'">SUPPLY SPLITS TO COLD / HOT DECK</text>';
    preforkItems.forEach(it=>{ s += drawStation(it, coldY, ductH); });
    coldLaneItems.forEach(it=>{ s += drawStation(it, coldLaneY, ductH, 'up'); });
    s += '<g id="highStaticTripIcon" transform="translate('+(ductEnd-70)+','+(coldLaneY-ductH/2-6)+')"></g>';
    // Static pressure sensor on a short stub after the main duct (represents 2/3 down unknown duct length)
    const cStubStart = ductEnd + 12;
    const cStubW = 120;
    s += horizDuctSVG(cStubStart, coldLaneY-ductH/2, cStubW, ductH, null, null, true, true);
    s += arrowFlowLine(ductEnd, coldLaneY, cStubStart + cStubW, coldLaneY, 'fwd', 'flow_coldSupplyStub', 'flow-fwd');
    s += '<line x1="'+(ductEnd+2)+'" y1="'+(coldLaneY-ductH/2+4)+'" x2="'+(ductEnd+8)+'" y2="'+(coldLaneY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    s += '<line x1="'+(ductEnd+6)+'" y1="'+(coldLaneY-ductH/2+4)+'" x2="'+(ductEnd+12)+'" y2="'+(coldLaneY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    const cStubCx = cStubStart + cStubW/2;
    s += '<g id="readout_spStubCold"></g>';
    window._schemSpStubColdCx = cStubCx;
    window._schemSpStubColdY = coldLaneY;
  } else {
    // For non-sharedDual: if there's a return riser, leave a gap in the supply duct bottom.
    const supBotHoles = (hasReturn && _riserX !== null) ? [{from: _riserX-riserW/2, to: _riserX+riserW/2}] : null;
    s += horizDuctSVG(ductStart, coldY-ductH/2, ductEnd-ductStart, ductH, supBotHoles, null, true, true);
    s += arrowFlowLine(ductStart, coldY, ductEnd, coldY, 'fwd', 'flow_coldSupply', 'flow-fwd');
    if(independent){ s += '<text x="'+ductStart+'" y="'+(coldY-ductH/2-10)+'" font-family="Arial" font-size="10" font-weight="700" fill="'+BAS.textDim+'">COLD DECK AIR PATH</text>'; }
    // Static pressure sensor on a short stub after the main duct
    const stubStart = ductEnd + 12;
    const stubW = 120;
    s += horizDuctSVG(stubStart, coldY-ductH/2, stubW, ductH, null, null, true, true);
    s += arrowFlowLine(ductEnd, coldY, stubStart + stubW, coldY, 'fwd', 'flow_coldSupplyStub', 'flow-fwd');
    s += '<line x1="'+(ductEnd+2)+'" y1="'+(coldY-ductH/2+4)+'" x2="'+(ductEnd+8)+'" y2="'+(coldY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    s += '<line x1="'+(ductEnd+6)+'" y1="'+(coldY-ductH/2+4)+'" x2="'+(ductEnd+12)+'" y2="'+(coldY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    const stubCx = stubStart + stubW/2;
    s += '<g id="readout_spStubMain"></g>';
    window._schemSpStubMainCx = stubCx;
    window._schemSpStubMainY = coldY;
    items.forEach(it=>{ s += drawStation(it, coldY, ductH); });
    s += '<g id="highStaticTripIcon" transform="translate('+(ductEnd-70)+','+(coldY-ductH/2-6)+')"></g>';
  }

  if(showSecondRow && hotItems.length){
    const hDuctStart = sharedDual? (forkX+taperW) : ((independent && !config.includeOa) ? (hotItems[0].x - 39) : (hotItems[0].x - 22));
    const hDuctEnd = hotItems[hotItems.length-1].x + hotItems[hotItems.length-1].w + 22;
    if(sharedDual){
      // Hot lane — left edge open (fork polygon arrives there)
      s += horizDuctSVG(hDuctStart, hotY-ductH/2, hDuctEnd-hDuctStart, ductH, null, null, true, true);
      s += arrowFlowLineAngled(forkX, coldY + ductH/4, hDuctStart, hotY, 'flow_hotSplitter', 'flow-fwd');
    } else if(independent && hasReturn && _hRiserX !== null){
      // Independent hot deck — gap in top where hot riser connects
      const hotTopHoles = [{from: _hRiserX-riserW/2, to: _hRiserX+riserW/2}];
      s += horizDuctSVG(hDuctStart, hotY-ductH/2, hDuctEnd-hDuctStart, ductH, null, hotTopHoles, true, true);
    } else {
      s += horizDuctSVG(hDuctStart, hotY-ductH/2, hDuctEnd-hDuctStart, ductH, null, null, true, true);
    }
    s += arrowFlowLine(hDuctStart, hotY, hDuctEnd, hotY, 'fwd', 'flow_hotSupply', 'flow-fwd');
    if(independent){ s += '<text x="'+hDuctStart+'" y="'+(hotY-ductH/2-10)+'" font-family="Arial" font-size="10" font-weight="700" fill="'+BAS.textDim+'">HOT DECK AIR PATH</text>'; }
    // Static pressure sensor on a short stub after the main hot deck duct
    const hStubStart = hDuctEnd + 12;
    const hStubW = 120;
    s += horizDuctSVG(hStubStart, hotY-ductH/2, hStubW, ductH, null, null, true, true);
    s += arrowFlowLine(hDuctEnd, hotY, hStubStart + hStubW, hotY, 'fwd', 'flow_hotSupplyStub', 'flow-fwd');
    s += '<line x1="'+(hDuctEnd+2)+'" y1="'+(hotY-ductH/2+4)+'" x2="'+(hDuctEnd+8)+'" y2="'+(hotY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    s += '<line x1="'+(hDuctEnd+6)+'" y1="'+(hotY-ductH/2+4)+'" x2="'+(hDuctEnd+12)+'" y2="'+(hotY+ductH/2-4)+'" stroke="'+BAS.line+'" stroke-width="1.2"/>';
    const hStubCx = hStubStart + hStubW/2;
    s += '<g id="readout_spStubHot"></g>';
    window._schemSpStubHotCx = hStubCx;
    window._schemSpStubHotY = hotY;
    hotItems.forEach(it=>{ s += drawStation(it, hotY, ductH, sharedDual?'down':undefined); });
    s += '<g id="highStaticTripIconHot" transform="translate('+(hDuctEnd-70)+','+(hotY-ductH/2-6)+')"></g>';
  }
  window._schemHotFlip = showSecondRow;
  let returnFanCx=null, returnY=null;
  if(hasReturn){
    const riserX = _riserX; // pre-computed above

    if(independent){
      const hRiserX = _hRiserX;
      const coldRiserTopY = coldY+ductH/2, coldRiserBotY = ry-22;
      const hotRiserTopY = ry+22, hotRiserBotY = hotY-ductH/2;
      // Cold riser: open top (connects to supply duct) + open bottom (connects to return main)
      s += vertDuctSVG(riserX-riserW/2, coldRiserTopY, riserW, coldRiserBotY-coldRiserTopY, true, true);
      s += arrowFlowLine(riserX, coldRiserTopY, riserX, coldRiserBotY, 'rev', 'flow_coldRiser', 'flow-rev');
      if(config.includeOa) s += '<g id="raDamperIcon_mixbox" transform="translate('+riserX+','+((coldRiserTopY+coldRiserBotY)/2)+') rotate(90)">'+damperGfx(0,false)+'</g>';
      // Hot riser: open top (connects to return main) + open bottom (connects to hot deck)
      s += vertDuctSVG(hRiserX-riserW/2, hotRiserTopY, riserW, hotRiserBotY-hotRiserTopY, true, true);
      s += arrowFlowLine(hRiserX, hotRiserTopY, hRiserX, hotRiserBotY, 'fwd', 'flow_hotRiser', 'flow-fwd');
      if(config.includeOa) s += '<g id="raDamperIcon_hotMixbox" transform="translate('+hRiserX+','+((hotRiserTopY+hotRiserBotY)/2)+') rotate(90)">'+damperGfx(0,false)+'</g>';
      const exhaustX = Math.min(riserX,hRiserX) - 90;
      const rx0 = config.includeEa ? (exhaustX - 40) : (Math.min(riserX,hRiserX) - 28);
      const returnFanCount = config.returnFan==='wall'? config.returnFanCount:1;
      const fanCenter = Math.max(riserX,hRiserX)+110;
      const fanBankHalfWidth = config.returnFan==='wall'? (((returnFanCount-1)*28)/2 + 35) : 35;
      const raSensorX = fanCenter + fanBankHalfWidth + 85;
      const rx1 = raSensorX + 55;
      // Return main: gaps in top (cold riser) and bottom (hot riser)
      const retTopHoles  = [{from: riserX-riserW/2,  to: riserX+riserW/2}];
      const retBotHoles  = [{from: hRiserX-riserW/2, to: hRiserX+riserW/2}];
      s += horizDuctSVG(rx0, ry-22, rx1-rx0, 44, retBotHoles, retTopHoles, config.includeEa, true);
      // Return main arrows: split at the riser junction.
      // Left of junction = exhaust section (only flows when EA damper open).
      // Right of junction = main return (flows whenever return fan runs).
      const retJctL = Math.min(riserX, hRiserX);       // centre of riser — exhaust arrows reach into the middle of the junction
      const retJctR = Math.max(riserX, hRiserX) + riserW/2;
      if(rx0 < retJctL - 1) s += arrowFlowLine(rx0, ry, retJctL, ry, 'rev', 'flow_returnExhaust', 'flow-rev');
      s += arrowFlowLine(retJctR, ry, rx1, ry, 'rev', 'flow_returnMain', 'flow-rev');
      s += '<text x="'+((rx0+rx1)/2)+'" y="'+(ry+54)+'" font-family="Arial" font-size="9.5" text-anchor="middle" fill="'+BAS.textDim+'">'+pn('Return Air','RA').toUpperCase()+' — SERVES BOTH DECKS</text>';
      if(hasReturnFan){
        for(let i=0;i<returnFanCount;i++){ const fx = returnFanCount===1? fanCenter : (Math.max(riserX,hRiserX)+90+i*28); s += '<g id="fanicon_return_'+i+'" transform="translate('+fx+','+ry+')">'+fanReturnGfx('off', null, true)+'</g>'; }
        if(config.driveType==='vfd'){
          if(config.singleDrive || returnFanCount===1){ s += '<g id="vfdIcon_return" transform="translate('+(fanCenter+34)+','+(ry-20)+') scale(0.8)">'+gfxWrap('vfd','','1','return')+'</g>'; }
          else { for(let i=0;i<returnFanCount;i++){ const fx = Math.max(riserX,hRiserX)+90+i*28; s += '<g id="vfdIcon_return_'+i+'" transform="translate('+(fx-10)+','+(ry-45)+') scale(0.6)">'+gfxWrap('vfd','','1','return_'+i)+'</g>'; } }
        }
        s += '<g id="readout_returnfan"></g>';
      }
      returnFanCx = fanCenter; returnY = ry;
      if(hasReturnFan) s += stationLabel(fanCenter, ry+24, config.returnFan==='wall'?'RETURN FAN WALL':'RETURN FAN');
      else s += stationLabel(fanCenter, ry+24, 'RETURN DUCT (PASSIVE)');
      s += '<g id="readout_raSensor"></g>';
      if(config.includeEa){
        s += '<g id="eaDamperIcon" transform="translate('+exhaustX+','+ry+')">'+damperGfx(0,false,1.3)+'</g>';
        s += '<g id="readout_exhaust"></g>';
        s += stationLabel(rx0+ (exhaustX-rx0)/2 + 10, ry+24, 'EXHAUST AIR (EA)');
      }
      window._schemRaSensorX = raSensorX; window._schemRaSensorY = ry; window._schemExhaustBubbleX = exhaustX; window._schemExhaustY = ry;
    } else {
      const exhaustX = riserX - 90;
      const rx0 = config.includeEa ? (exhaustX - 40) : (riserX - 28);
      const returnFanCount = config.returnFan==='wall'? config.returnFanCount:1;
      const fanCenter = riserX+110;
      const fanBankHalfWidth = config.returnFan==='wall'? (((returnFanCount-1)*28)/2 + 35) : 35;
      const raSensorX = fanCenter + fanBankHalfWidth + 85;
      const rx1 = raSensorX + 55;
      // Return main: gap in top where cold riser connects
      const retTopHoles = [{from: riserX-riserW/2, to: riserX+riserW/2}];
      s += horizDuctSVG(rx0, ry-22, rx1-rx0, 44, null, retTopHoles, config.includeEa, true);
      // Return main arrows: split at the riser junction.
      // Left section (toward exhaust) only flows when EA damper is open.
      const retJctL = riserX;                          // centre of riser — exhaust arrows reach into the middle of the junction
      const retJctR = riserX + riserW/2;
      if(rx0 < retJctL - 1) s += arrowFlowLine(rx0, ry, retJctL, ry, 'rev', 'flow_returnExhaust', 'flow-rev');
      s += arrowFlowLine(retJctR, ry, rx1, ry, 'rev', 'flow_returnMain', 'flow-rev');
      s += '<path d="M '+(rx1+2)+' '+(ry-16)+' L '+(rx1+22)+' '+ry+' L '+(rx1+2)+' '+(ry+16)+'" fill="none" stroke="'+BAS.line+'" stroke-width="2"/>';
      s += '<text x="'+((rx0+rx1)/2)+'" y="'+(ry+54)+'" font-family="Arial" font-size="9.5" text-anchor="middle" fill="'+BAS.textDim+'">'+pn('Return Air','RA').toUpperCase()+' FROM SPACE</text>';
      // Cold riser: open top (supply duct) + open bottom (return main)
      const riserTopY = coldY+ductH/2, riserBotY = ry-22;
      s += vertDuctSVG(riserX-riserW/2, riserTopY, riserW, riserBotY-riserTopY, true, true);
      s += arrowFlowLine(riserX, riserTopY, riserX, riserBotY, 'rev', 'flow_coldRiser', 'flow-rev');
      const riserMidY = (riserTopY+riserBotY)/2;
      if(config.includeOa) s += '<g id="raDamperIcon_mixbox" transform="translate('+riserX+','+riserMidY+') rotate(90)">'+damperGfx(0,false)+'</g>';
      if(hasReturnFan){
        for(let i=0;i<returnFanCount;i++){ const fx = returnFanCount===1? fanCenter : (riserX+90+i*28); s += '<g id="fanicon_return_'+i+'" transform="translate('+fx+','+ry+')">'+fanReturnGfx('off', null, true)+'</g>'; }
        if(config.driveType==='vfd'){
          if(config.singleDrive || returnFanCount===1){ s += '<g id="vfdIcon_return" transform="translate('+(fanCenter+34)+','+(ry-20)+') scale(0.8)">'+gfxWrap('vfd','','1','return')+'</g>'; }
          else { for(let i=0;i<returnFanCount;i++){ const fx = riserX+90+i*28; s += '<g id="vfdIcon_return_'+i+'" transform="translate('+(fx-10)+','+(ry-45)+') scale(0.6)">'+gfxWrap('vfd','','1','return_'+i)+'</g>'; } }
        }
        s += '<g id="readout_returnfan"></g>';
      }
      returnFanCx = fanCenter; returnY = ry;
      if(hasReturnFan) s += stationLabel(fanCenter, ry+24, config.returnFan==='wall'?'RETURN FAN WALL':'RETURN FAN');
      else s += stationLabel(fanCenter, ry+24, 'RETURN DUCT (PASSIVE)');
      s += '<g id="readout_raSensor"></g>';
      if(config.includeEa){
        s += '<g id="eaDamperIcon" transform="translate('+exhaustX+','+ry+')">'+damperGfx(0,false,1.3)+'</g>';
        s += '<g id="readout_exhaust"></g>';
        s += stationLabel(rx0+ (exhaustX-rx0)/2 + 10, ry+24, 'EXHAUST AIR (EA)');
      }
      window._schemRaSensorX = raSensorX; window._schemRaSensorY = ry; window._schemExhaustBubbleX = exhaustX; window._schemExhaustY = ry;
    }
  }

  svg.innerHTML = s;
  window._schemItems = items;
  window._schemHotItems = hotItems;
  window._schemDuctY = coldY;
  window._schemDuctH = ductH;
  window._schemHotDuctY = hotY;
  window._schemIndependent = independent;
  window._schemShowSecondRow = showSecondRow;
  window._schemReturnFanCx = returnFanCx;
  window._schemReturnY = returnY;
}

function updateSchematicReadouts(){
  if(!window._schemItems) return;
  const ductY = window._schemDuctY, ductH = window._schemDuctH;
  const independent = window._schemIndependent;

  function bubbleFor(it, i, count, flip){
    const g = document.getElementById('readout_'+it.id);
    if(!g) return;
    const rowY = (it.y!==undefined)? it.y : window._schemDuctY;
    const hasValve = ['preheat', 'cooling', 'reheat', 'hotdeck'].includes(it.id);
    let itemValveBelow = false;
    if(window._schemShowSecondRow && !independent){
      const isHotItem = ['hotOaIntake', 'hotMixbox', 'hotFilter', 'hotdeckfan', 'hotdeck', 'hotdischarge', 'hotDamper'].includes(it.id);
      if(isHotItem) itemValveBelow = true;
    }
    const actualFlip = hasValve ? itemValveBelow : flip;
    const edgeY = actualFlip? (rowY + ductH/2) : (rowY - ductH/2);
    const isEdge = (i===0 || i===count-1);

    if(hasValve){
      const originX = it.cx;
      const originY = actualFlip ? (rowY + ductH/2 + 50) : (rowY - ductH/2 - 50);
      const tier = 46;
      let lines = null, accent = null;
      if(it.id==='preheat'){ lines=['PHC VALVE', fmt(sim.preheatValve,0)+'%']; accent = sim.preheatValve>2? '#d78a2b':null; }
      else if(it.id==='cooling' || it.id==='coil1' || it.id==='coil2'){
        lines = ['CLG VALVE', fmt(it.id==='coil2'?sim.coil2Valve:sim.coil1Valve,0)+'%'];
        accent='#2b6cb0';
      }
      else if(it.id==='reheat'){ lines=['RHT VALVE', fmt(sim.reheatValve,0)+'%']; accent = sim.reheatValve>2? '#d78a2b':null; }
      else if(it.id==='hotdeck'){ lines=['HD VALVE', fmt(sim.hotDeckValve,0)+'%']; accent='#c0392b'; }
      if(lines) g.innerHTML = actualFlip? bubbleDown(originX, originY, tier, it.title, lines, accent, 0) : bubble(originX, originY, tier, it.title, lines, accent, 0);

      const latG = document.getElementById('readout_'+it.id+'_lat');
      if(latG){
        let sensorOffset = 72;
        if(it.id === 'cooling' || it.id === 'coil1' || it.id === 'coil2') { sensorOffset = (config.ductType === 'dual' && config.dualDuctIndependent) ? 36 : 88; }
        else if(it.id === 'preheat') { sensorOffset = 36; }
        else if(it.id === 'hotdeck') { sensorOffset = 36; }
        const latX = it.cx + sensorOffset;
        const latTier = 44;
        const latFlip = true;
        const latEdgeY = rowY + ductH/2;
        let latLines = null, latAccent = null;
        if(it.id==='preheat') latLines=['PHC-LAT', fmt(sim.preheatLvg,1)+'\u00b0F'];
        else if(it.id==='cooling' || it.id==='coil1' || it.id==='coil2'){
          const clgLvg = it.id==='coil2' ? sim.coil2Lvg : sim.coil1Lvg;
          if(config.ductType==='dual' && config.dualDuctIndependent){ latLines=['CLG-LAT', fmt(clgLvg,1)+'\u00b0F']; latAccent='#2b6cb0'; }
        }
        else if(it.id==='reheat') { latLines=['RHT-LAT', fmt(sim.satDisplayTemp,1)+'\u00b0F']; latAccent = sim.reheatValve>2? '#d78a2b':null; }
        else if(it.id==='hotdeck') { if(config.dualDuctIndependent){ latLines=['HD-LAT', fmt(sim.hotDeckTemp,1)+'\u00b0F']; latAccent='#c0392b'; } }
        if(latLines) latG.innerHTML = latFlip? bubbleDown(latX, latEdgeY, latTier, it.title + ' LAT', latLines, latAccent, 0) : bubble(latX, latEdgeY, latTier, it.title + ' LAT', latLines, latAccent, 0);
      }
    } else {
      const originX = it.cx;
      const tier = isEdge? 44 : ((i%2===0)? 44:82);
      let lines=null, accent=null;
      if(it.id==='oaIntake') lines=['OAT '+fmt(sim.oat,1)+'\u00b0F','OAH '+fmt(sim.oaRH*100,0)+'%','OA '+fmt(sim.oaCfm,0)+' CFM'];
      else if(it.id==='supplydamper') lines=['SPLY DPR', fmt(sim.supplyDamperPos,0)+'%'];
      else if(it.id==='coldDamper') lines=['CD DPR', fmt(sim.coldDeckDamperPos,0)+'%'];
      else if(it.id==='hotDamper') lines=['HD DPR', fmt(sim.hotDeckDamperPos,0)+'%'];
      else if(it.id==='mixbox') {
        const ry = window._schemReturnY;
        const riserTopY = it.y + 30;
        const riserBotY = ry - 22;
        const riserMidY = (riserTopY + riserBotY) / 2;
        const raLines = ['RA DPR', fmt(sim.raDamperPos, 0) + '%'];
        const raHtml = bubbleLeft(originX, riserMidY, -120, 'Return Air Damper', raLines, accent);
        const matLines = ['MAT', fmt(sim.maTemp, 1) + '\u00b0F'];
        const matHtml = actualFlip ? bubbleDown(originX, edgeY, tier, it.title, matLines, accent, 0) : bubble(originX, edgeY, tier, it.title, matLines, accent, 0);
        g.innerHTML = raHtml + matHtml;
        lines = null;
      }
      else if(it.id==='filter') lines=['FILTER', activeFaults.dirtyFilter? 'DIRTY':'CLEAN'];
      else if(it.id==='supplyfan') lines=[(config.dualDuctIndependent?'CD FAN ':'SF ')+fmt(sim.supplyFanPct,0)+'%', fmt(sim.supplyCfm,0)+' CFM'];
      else if(it.id==='humid'){ const effRh = sim.W_supply ? rhFromW(sim.raTemp || 72, sim.W_supply) * 100 : sim.saRH * 100; lines=['SA-RH '+fmt(effRh,0)+'%','VLV '+fmt(sim.humidValve,0)+'%']; }
      else if(it.id==='discharge'){ const effRh = sim.W_supply ? rhFromW(sim.raTemp || 72, sim.W_supply) * 100 : sim.saRH * 100; const spFluct = 1 + 0.1 * Math.sin((sim.age||0) * 0.07) * Math.sin((sim.age||0) * 0.13); const driveFrac = config.driveType==='vfd' ? (sim.supplyFanPct/100) : (sim.supplyDamperPos/100); lines=[(config.ductType==='dual'?'CD-SAT ':'SAT ')+fmt(config.ductType==='dual'?sim.coldDeckTemp:sim.satDisplayTemp,1)+'\u00b0F', 'SA-RH '+fmt(effRh,0)+'%', fmt(sim.supplyCfm,0)+' CFM', 'SP '+fmt(driveFrac * sp.highStaticSP * 0.9 * spFluct, 2)+'"']; accent='#2b6cb0'; }
      else if(it.id==='hotOaIntake') lines=['OAT '+fmt(sim.oat,1)+'\u00b0F','OAH '+fmt(sim.oaRH*100,0)+'%','OA '+fmt(sim.hotOaCfm,0)+' CFM'];
      else if(it.id==='hotMixbox') {
        const ry = window._schemReturnY;
        const riserTopY = ry + 22;
        const riserBotY = it.y - 30;
        const riserMidY = (riserTopY + riserBotY) / 2;
        const raLines = ['RA DPR', fmt(sim.hotRaDamperPos, 0) + '%'];
        const raHtml = bubbleLeft(originX, riserMidY, -120, 'Hot Deck Return Air Damper', raLines, accent);
        const matLines = ['MAT', fmt(sim.hotMaTemp, 1) + '\u00b0F'];
        const matHtml = actualFlip ? bubbleDown(originX, edgeY, tier, it.title, matLines, accent, 0) : bubble(originX, edgeY, tier, it.title, matLines, accent, 0);
        g.innerHTML = raHtml + matHtml;
        lines = null;
      }
      else if(it.id==='hotFilter') lines=['FILTER', activeFaults.hotDeckDirtyFilter? 'DIRTY':'CLEAN'];
      else if(it.id==='hotdeckfan') lines=['HDF '+fmt(sim.hotDeckFanPct,0)+'%', fmt(sim.hotDeckCfm,0)+' CFM'];
      else if(it.id==='hotdischarge'){ const spFluct = 1 + 0.1 * Math.sin((sim.age||0) * 0.07) * Math.sin((sim.age||0) * 0.13); const driveFrac = config.driveType==='vfd' ? (sim.supplyFanPct/100) : (sim.supplyDamperPos/100); lines=['HD-SAT '+fmt(sim.hotDeckTemp,1)+'\u00b0F', 'HD-RH '+fmt(rhFromW(sim.hotDeckTemp, sim.W_supply)*100,0)+'%', fmt(sim.hotDeckCfm,0)+' CFM', 'SP '+fmt(driveFrac * sp.highStaticSP * 0.9 * spFluct, 2)+'"']; }
      if(lines) g.innerHTML = actualFlip? bubbleDown(originX, edgeY, tier, it.title, lines, accent, 0) : bubble(originX, edgeY, tier, it.title, lines, accent, 0);

      if(it.id === 'mixbox' || it.id === 'hotMixbox') {
        const oadEl = document.getElementById('readout_oaDamper_' + it.id);
        if(oadEl) {
          const oaX = it.x + 16;
          const oadTier = 44;
          const oadPos = it.id === 'mixbox' ? sim.oaDamperPos : sim.hotOaDamperPos;
          if(oadPos !== undefined) oadEl.innerHTML = actualFlip ? bubbleDown(oaX, edgeY, oadTier, 'Outside Air Damper', ['OA DPR', fmt(oadPos, 0) + '%'], null, 0) : bubble(oaX, edgeY, oadTier, 'Outside Air Damper', ['OA DPR', fmt(oadPos, 0) + '%'], null, 0);
        }
      }
    }
  }

  window._schemItems.forEach((it,i)=>bubbleFor(it, i, window._schemItems.length, false));
  if(window._schemShowSecondRow && window._schemHotItems && window._schemHotItems.length){
    const hotFlip = !!window._schemHotFlip;
    window._schemHotItems.forEach((it,i)=>bubbleFor(it, i, window._schemHotItems.length, hotFlip));
  }

  const fltrEl = document.getElementById('filterIcon_filter'); if(fltrEl) fltrEl.innerHTML = filterGfx(!!activeFaults.dirtyFilter);
  const oaEl = document.getElementById('oaDamperIcon_mixbox'); if(oaEl) oaEl.innerHTML = damperGfx(config.airSystem==='return'? sim.oaDamperPos:0, activeFaults.oaDamperStuck!==undefined);
  const raEl = document.getElementById('raDamperIcon_mixbox'); if(raEl) raEl.innerHTML = damperGfx(config.airSystem==='return'? sim.raDamperPos:0, false);
  const sde = document.getElementById('supplyDamperIcon_supplydamper'); if(sde) sde.innerHTML = damperGfx(sim.supplyDamperPos, activeFaults.supplyDamperStuck!==undefined);
  const cde = document.getElementById('supplyDamperIcon_coldDamper'); if(cde) cde.innerHTML = damperGfx(sim.coldDeckDamperPos, activeFaults.coldDeckDamperStuck!==undefined);
  const hde = document.getElementById('supplyDamperIcon_hotDamper'); if(hde) hde.innerHTML = damperGfx(sim.hotDeckDamperPos, activeFaults.hotDeckDamperStuck!==undefined);
  const llim = document.getElementById('lowLimitIcon_preheat'); if(llim) llim.innerHTML = '<rect x="-14" y="-8" width="28" height="16" rx="3" fill="'+(latched.freezestat?'#e74c3c':'var(--panel-inset)')+'" stroke="var(--line)" stroke-width="1" class="'+(latched.freezestat?'safety-blink':'')+'"/><text x="0" y="3" class="safetext'+(latched.freezestat?' tripped':'')+'" fill="'+(latched.freezestat?'#fff':'var(--text-dim)')+'">FRZ</text>';
  const bp = document.getElementById('boosterPumpIcon'); if(bp) bp.innerHTML = pumpGfx(activeFaults.boosterPumpFail? 'fail' : (sim.boosterPumpRun?'run':'off'));
  const aq = document.getElementById('aquastatIcon'); if(aq) aq.innerHTML = lowLimitGfx(latched.aquastat);

  if(config.preheat){ const el = document.getElementById('coilIcon_preheat'); if(el) el.innerHTML = heatingCoilGfx(sim.preheatValve, activeFaults.preheatValveStuck!==undefined || activeFaults.preheatNoFlow, 'preheat'); }
  const coolEl = document.getElementById('coilIcon_cooling');
  if(coolEl) coolEl.innerHTML = coolingCoilGfx(sim.coil1Valve, activeFaults.coil1ValveStuck!==undefined || activeFaults.coil1NoFlow);
  const coil1El = document.getElementById('coilIcon_coil1');
  if(coil1El) coil1El.innerHTML = coolingCoilGfx(sim.coil1Valve, activeFaults.coil1ValveStuck!==undefined || activeFaults.coil1NoFlow);
  const coil2El = document.getElementById('coilIcon_coil2');
  if(coil2El) coil2El.innerHTML = coolingCoilGfx(sim.coil2Valve, activeFaults.coil2ValveStuck!==undefined || activeFaults.coil2NoFlow);
  if(config.ductType==='dual'){ const hdEl = document.getElementById('coilIcon_hotdeck'); if(hdEl) hdEl.innerHTML = heatingCoilGfx(sim.hotDeckValve, activeFaults.hotDeckValveStuck!==undefined, 'hotdeck'); }
  else if(config.reheat){ const rhEl = document.getElementById('coilIcon_reheat'); if(rhEl) rhEl.innerHTML = heatingCoilGfx(sim.reheatValve, activeFaults.reheatValveStuck!==undefined || activeFaults.reheatNoFlow, 'reheat'); }
  if(config.ductType!=='dual' && config.steamHumid){ const humEl = document.getElementById('humidIcon'); if(humEl) humEl.innerHTML = humidifierGfx(sim.humidValve>2, activeFaults.humidValveStuck!==undefined || activeFaults.humidNoSteam); }

  if(config.driveType==='vfd'){
    const isSingle = config.singleDrive || sim.supplyFans.length <= 1;
    if(isSingle){ const vfdS = document.getElementById('vfdIcon_supply'); if(vfdS){ const failed = sim.supplyFans.some(f=>f.fail); const running = sim.supplyFanPct > 0; vfdS.innerHTML = gfxWrap('vfd', (running?'active':'')+(failed?' in-alarm':'')+' value-'+roundTo10(sim.supplyFanPct), 1, 'supply'); } }
    else { sim.supplyFans.forEach((f,i)=>{ const vfdEl = document.getElementById('vfdIcon_supply_'+i); if(vfdEl){ const running = f.run && sim.supplyFanPct > 0; vfdEl.innerHTML = gfxWrap('vfd', (running?'active':'')+(f.fail?' in-alarm':'')+' value-'+roundTo10(sim.supplyFanPct), 1, 'supply_'+i); } }); }
  }
  if(config.driveType==='vfd' && config.airSystem==='return'){
    const isSingle = config.singleDrive || sim.returnFans.length <= 1;
    if(isSingle){ const vfdR = document.getElementById('vfdIcon_return'); if(vfdR){ const failed = sim.returnFans.some(f=>f.fail); const running = sim.returnFanPct > 0; vfdR.innerHTML = gfxWrap('vfd', (running?'active':'')+(failed?' in-alarm':'')+' value-'+roundTo10(sim.returnFanPct), 1, 'return'); } }
    else { sim.returnFans.forEach((f,i)=>{ const vfdEl = document.getElementById('vfdIcon_return_'+i); if(vfdEl){ const running = f.run && sim.returnFanPct > 0; vfdEl.innerHTML = gfxWrap('vfd', (running?'active':'')+(f.fail?' in-alarm':'')+' value-'+roundTo10(sim.returnFanPct), 1, 'return_'+i); } }); }
  }

  if(sim.supplyFans.length){ sim.supplyFans.forEach((f,i)=>{ const el=document.getElementById('fanicon_supply_'+i); if(el) el.innerHTML=fanSupplyGfx(f.fail?'fail':(f.run?'run':'off')); }); }
  else { const el=document.getElementById('fanicon_supply_0'); if(el) el.innerHTML=fanSupplyGfx(sim.supplyFanPct>0?'run':'off'); }

  if(independent){
    const oaHotEl = document.getElementById('oaDamperIcon_hotMixbox'); if(oaHotEl) oaHotEl.innerHTML = damperGfx(config.airSystem==='return'? sim.hotOaDamperPos:0, activeFaults.hotOaDamperStuck!==undefined);
    const raHotEl = document.getElementById('raDamperIcon_hotMixbox'); if(raHotEl) raHotEl.innerHTML = damperGfx(config.airSystem==='return'? sim.hotRaDamperPos:0, false);
    const hotFilterEl = document.getElementById('filterIcon_hotFilter'); if(hotFilterEl) hotFilterEl.innerHTML = filterGfx(!!activeFaults.hotDeckDirtyFilter);
    const hotLowLimitEl = document.getElementById('lowLimitIcon_hotFilter'); if(hotLowLimitEl) hotLowLimitEl.innerHTML = '<rect x="-14" y="-8" width="28" height="16" rx="3" fill="'+(latched.hotFreezestat?'#e74c3c':'var(--panel-inset)')+'" stroke="var(--line)" stroke-width="1" class="'+(latched.hotFreezestat?'safety-blink':'')+'"/><text x="0" y="3" class="safetext'+(latched.hotFreezestat?' tripped':'')+'" fill="'+(latched.hotFreezestat?'#fff':'var(--text-dim)')+'">FRZ</text>';
    if(config.driveType==='vfd'){
      const isSingle = config.singleDrive || sim.hotDeckFans.length <= 1;
      if(isSingle){ const vfdHotEl = document.getElementById('vfdIcon_hotdeck'); if(vfdHotEl){ const failed = sim.hotDeckFans.some(f=>f.fail); const running = sim.hotDeckFanPct > 0; vfdHotEl.innerHTML = gfxWrap('vfd', (running?'active':'')+(failed?' in-alarm':'')+' value-'+roundTo10(sim.hotDeckFanPct), 1, 'hotdeckfan'); } }
      else { sim.hotDeckFans.forEach((f,i)=>{ const vfdEl = document.getElementById('vfdIcon_hotdeck_'+i); if(vfdEl){ const running = f.run && sim.hotDeckFanPct > 0; vfdEl.innerHTML = gfxWrap('vfd', (running?'active':'')+(f.fail?' in-alarm':'')+' value-'+roundTo10(sim.hotDeckFanPct), 1, 'hotdeck_'+i); } }); }
    }
    if(sim.hotDeckFans.length){ sim.hotDeckFans.forEach((f,i)=>{ const el=document.getElementById('fanicon_hotdeck_'+i); if(el) el.innerHTML=fanSupplyGfx(f.fail?'fail':(f.run?'run':'off')); }); }
    else { const el=document.getElementById('fanicon_hotdeck_0'); if(el) el.innerHTML=fanSupplyGfx(sim.hotDeckFanPct>0?'run':'off'); }
  }

  if(config.airSystem==='return'){
    if(config.returnFanCount > 0){
      if(sim.returnFans.length){ sim.returnFans.forEach((f,i)=>{ const el=document.getElementById('fanicon_return_'+i); if(el) el.innerHTML=fanReturnGfx(f.fail?'fail':(f.run?'run':'off'), null, true); }); }
      else { const el=document.getElementById('fanicon_return_0'); if(el) el.innerHTML=fanReturnGfx(sim.returnFanPct>0?'run':'off', null, true); }
      const rg = document.getElementById('readout_returnfan');
      if(rg && window._schemReturnFanCx!==null){ rg.innerHTML = bubble(window._schemReturnFanCx, window._schemReturnY-22, 30, pn('Return Air','RA')+' Fan', ['RF '+fmt(sim.returnFanPct,0)+'%', fmt(sim.returnCfm,0)+' CFM'], null); }
    }
    const raSensorEl = document.getElementById('readout_raSensor');
    if(raSensorEl && window._schemRaSensorX!==undefined){
      const isDualInd = config.ductType==='dual' && config.dualDuctIndependent;
      if(isDualInd){ raSensorEl.innerHTML = bubbleDown(window._schemRaSensorX, window._schemRaSensorY+22, 30, pn('Return Air','RA')+' Temperature Sensor', ['RA-T '+fmt(sim.raDisplayTemp,1)+'\u00b0F', 'RA-RH '+fmt(sim.raRH*100,0)+'%'], null); }
      else { raSensorEl.innerHTML = bubble(window._schemRaSensorX, window._schemRaSensorY-22, 30, pn('Return Air','RA')+' Temperature Sensor', ['RA-T '+fmt(sim.raDisplayTemp,1)+'\u00b0F', 'RA-RH '+fmt(sim.raRH*100,0)+'%'], null); }
    }
    const eaDmpEl = document.getElementById('eaDamperIcon');
    if(eaDmpEl) eaDmpEl.innerHTML = damperGfx(sim.eaDamperPos, activeFaults.eaDamperStuck!==undefined, 1.3);
    const exhaustEl = document.getElementById('readout_exhaust');
    if(exhaustEl && window._schemExhaustBubbleX!==undefined){ exhaustEl.innerHTML = bubble(window._schemExhaustBubbleX, window._schemExhaustY-20, 26, 'Exhaust Air ('+pn('Exhaust Air','EA')+') Damper', ['EA DPR '+fmt(sim.eaDamperPos,0)+'%', fmt(sim.exhaustCfm,0)+' CFM'], null); }
  }

  // Static pressure: main duct shows actual supply static, 2/3 stub shows simulated 2/3 value
  const sp23 = sim.sp23 !== undefined ? sim.sp23 : sp.highStaticSP * 0.9;
  const sp23Str = fmt(sp23, 2);
  const spStubMainEl = document.getElementById('readout_spStubMain');
  if(spStubMainEl && window._schemSpStubMainCx !== undefined){
    spStubMainEl.innerHTML = bubble(window._schemSpStubMainCx, window._schemSpStubMainY-30, 45, 'SP (2/3 Duct)', 
      [sp23Str+'" w.c.'], null, 0);
  }
  const spStubColdEl = document.getElementById('readout_spStubCold');
  if(spStubColdEl && window._schemSpStubColdCx !== undefined){
    spStubColdEl.innerHTML = bubble(window._schemSpStubColdCx, window._schemSpStubColdY-30, 45, 'SP (2/3 Duct)', 
      [sp23Str+'" w.c.'], null, 0);
  }
  const spStubHotEl = document.getElementById('readout_spStubHot');
  if(spStubHotEl && window._schemSpStubHotCx !== undefined){
    spStubHotEl.innerHTML = bubbleDown(window._schemSpStubHotCx, window._schemSpStubHotY + 30, 45, 'SP (2/3 Duct)', 
      [sp23Str+'" w.c.'], null, 0);
  }

  // High static trip indicators
  const hsTripEl = document.getElementById('highStaticTripIcon');
  if(hsTripEl) hsTripEl.innerHTML = '<rect x="-20" y="-8" width="40" height="16" rx="3" fill="'+(latched.highStatic?'#e74c3c':'var(--panel-inset)')+'" stroke="var(--line)" stroke-width="1" class="'+(latched.highStatic?'safety-blink':'')+'"/><text x="0" y="3" class="safetext'+(latched.highStatic?' tripped':'')+'" fill="'+(latched.highStatic?'#fff':'var(--text-dim)')+'">HI-PRS</text>';
  const hsTripHotEl = document.getElementById('highStaticTripIconHot');
  if(hsTripHotEl) hsTripHotEl.innerHTML = '<rect x="-20" y="-8" width="40" height="16" rx="3" fill="'+(latched.highStatic?'#e74c3c':'var(--panel-inset)')+'" stroke="var(--line)" stroke-width="1" class="'+(latched.highStatic?'safety-blink':'')+'"/><text x="0" y="3" class="safetext'+(latched.highStatic?' tripped':'')+'" fill="'+(latched.highStatic?'#fff':'var(--text-dim)')+'">HI-PRS</text>';
}

function buildSchematic(){
  buildSchematicCore();
  applyAllLayoutOverrides();
  renderCustomElements();
  attachLayoutDragging();
  enablePanZoom();
}

function enablePanZoom(){
  const svg = document.getElementById('schematicSvg');
  if(!svg) return;
  const origVb = svg.getAttribute('viewBox');
  svg.setAttribute('data-orig-viewbox', origVb);
  let vb = origVb.split(' ').map(Number);
  let isPanning = false, startX, startY, startVb;
  let lastDist = 0;

  function setViewBox(vbArr){
    vb = vbArr;
    svg.setAttribute('viewBox', vb.join(' '));
  }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const fx = mx / rect.width;
    const fy = my / rect.height;
    const scale = e.deltaY > 0 ? 1.12 : 1/1.12;
    const nw = Math.max(100, vb[2] * scale);
    const nh = Math.max(100, vb[3] * scale);
    const nx = vb[0] + (vb[2] - nw) * fx;
    const ny = vb[1] + (vb[3] - nh) * fy;
    setViewBox([nx, ny, nw, nh]);
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    if(e.button !== 0) return;
    isPanning = true;
    startX = e.clientX; startY = e.clientY;
    startVb = [...vb];
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if(!isPanning) return;
    const rect = svg.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width * vb[2];
    const dy = (e.clientY - startY) / rect.height * vb[3];
    setViewBox([startVb[0] - dx, startVb[1] - dy, vb[2], vb[3]]);
  });

  window.addEventListener('mouseup', () => {
    if(isPanning){ isPanning = false; svg.style.cursor = ''; }
  });

  svg.addEventListener('dblclick', () => {
    const orig = svg.getAttribute('data-orig-viewbox');
    if(orig) setViewBox(orig.split(' ').map(Number));
  });

  svg.addEventListener('touchstart', e => {
    if(e.touches.length === 1){
      isPanning = true;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      startVb = [...vb];
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
        const fx = mx / rect.width;
        const fy = my / rect.height;
        const nw = Math.max(100, vb[2] * scale);
        const nh = Math.max(100, vb[3] * scale);
        const nx = vb[0] + (vb[2] - nw) * fx;
        const ny = vb[1] + (vb[3] - nh) * fy;
        setViewBox([nx, ny, nw, nh]);
      }
      lastDist = dist;
    }
  }, { passive: true });

  svg.addEventListener('touchend', () => { isPanning = false; lastDist = 0; }, { passive: true });
}
