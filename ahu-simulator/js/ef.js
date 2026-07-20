/* ============================================================
   EXHAUST FAN TAB — rendering
   ============================================================ */
function renderExhaustFanTab(){
  const el = document.getElementById('efGraphicContainer');
  if(!el || !sim.ef) return;
  const ef = sim.ef;

  const leadSelect = document.getElementById('efLeadSelect');
  if(leadSelect) leadSelect.value = ef.activeFan;

  const totalCfmVal = document.getElementById('efTotalCfm');
  if(totalCfmVal) totalCfmVal.textContent = fmt(ef.cfm, 0) + ' CFM';

  const systemStatusVal = document.getElementById('efSystemStatus');
  if(systemStatusVal){
    if(ef.fanA.fail && ef.fanB.fail){ systemStatusVal.textContent = 'FAULT'; systemStatusVal.style.color = 'var(--red)'; }
    else if(ef.fanA.run || ef.fanB.run){ systemStatusVal.textContent = 'RUNNING'; systemStatusVal.style.color = 'var(--green)'; }
    else if(ef.switching){ systemStatusVal.textContent = 'SWITCHING'; systemStatusVal.style.color = 'var(--amber)'; }
    else { systemStatusVal.textContent = 'OFF'; systemStatusVal.style.color = 'var(--text-faint)'; }
  }

  document.getElementById('efDprA').textContent = fmt(ef.fanA.damperPos, 0) + '%';
  document.getElementById('efDprB').textContent = fmt(ef.fanB.damperPos, 0) + '%';
  document.getElementById('efSwA').textContent = ef.fanA.endSwitch ? 'YES' : 'NO';
  document.getElementById('efSwB').textContent = ef.fanB.endSwitch ? 'YES' : 'NO';
  document.getElementById('efRunA').textContent = ef.fanA.run ? 'RUN' : 'OFF';
  document.getElementById('efRunB').textContent = ef.fanB.run ? 'RUN' : 'OFF';
  document.getElementById('efFltA').textContent = ef.fanA.fail ? 'FAULT' : 'OK';
  document.getElementById('efFltB').textContent = ef.fanB.fail ? 'FAULT' : 'OK';

  document.getElementById('btnToggleFltMotorA').classList.toggle('danger', ef.fanA.fail);
  document.getElementById('btnToggleFltMotorB').classList.toggle('danger', ef.fanB.fail);
  document.getElementById('btnToggleFltDprA').classList.toggle('danger', !!activeFaults.efDprAFail);
  document.getElementById('btnToggleFltDprB').classList.toggle('danger', !!activeFaults.efDprBFail);

  const activeColor = 'var(--green)';
  const flowColor = 'var(--cyan)';
  const angleA = 90 - (ef.fanA.damperPos / 100) * 90;
  const angleB = 90 - (ef.fanB.damperPos / 100) * 90;

  function fanSvgHtml(running){ return running ?
    '<g class="graphivac-object"><g class="active"><g class="fan"><g class="rotating-middle">'+
    '<line x1="-12" y1="0" x2="12" y2="0" stroke="var(--text)" stroke-width="1.8"/>'+
    '<line x1="0" y1="-12" x2="0" y2="12" stroke="var(--text)" stroke-width="1.8"/>'+
    '<line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="var(--text)" stroke-width="1.8"/>'+
    '<line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5" stroke="var(--text)" stroke-width="1.8"/>'+
    '</g></g></g></g>' :
    '<line x1="-12" y1="0" x2="12" y2="0" stroke="var(--text-faint)" stroke-width="1.5"/>'+
    '<line x1="0" y1="-12" x2="0" y2="12" stroke="var(--text-faint)" stroke-width="1.5"/>'+
    '<line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="var(--text-faint)" stroke-width="1.5"/>'+
    '<line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5" stroke="var(--text-faint)" stroke-width="1.5"/>'; }

  const fanASpinsHtml = fanSvgHtml(ef.fanA.run);
  const fanBSpinsHtml = fanSvgHtml(ef.fanB.run);

  const svg = `<svg viewBox="0 0 360 220" width="100%">
    <defs>
      <style>${collectGfxCss(['fan'])}</style>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${flowColor}"/>
      </marker>
    </defs>
    <text x="10" y="100" font-family="Arial" font-size="8" fill="var(--text-dim)" font-weight="bold">FROM EXHAUST VAVs</text>
    <rect x="10" y="110" width="70" height="20" fill="var(--duct)" stroke="var(--line)" stroke-width="1.3"/>
    <path d="M 80,110 L 110,70 L 140,70" fill="none" stroke="var(--line)" stroke-width="1.3"/>
    <path d="M 80,130 L 110,170 L 140,170" fill="none" stroke="var(--line)" stroke-width="1.3"/>
    <text x="110" y="44" font-family="Arial" font-size="8" fill="var(--text-dim)" font-weight="bold">FAN A PATH</text>
    <rect x="110" y="50" width="130" height="20" fill="var(--duct)" stroke="var(--line)" stroke-width="1.3"/>
    <g transform="translate(135, 60)">
      <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="var(--line)" stroke-dasharray="2 2" stroke-width="1"/>
      <line x1="-9" y1="0" x2="9" y2="0" stroke="${ef.fanA.damperPos > 5 ? activeColor : 'var(--text)'}" stroke-width="1.5" transform="rotate(${angleA})"/>
    </g>
    <text x="120" y="82" font-family="Arial" font-size="7.5" fill="var(--text-faint)">DMP A: ${fmt(ef.fanA.damperPos,0)}%</text>
    <g transform="translate(170, 48)">
      <circle cx="0" cy="5" r="2" fill="var(--text)"/><circle cx="15" cy="5" r="2" fill="var(--text)"/>
      <line x1="0" y1="5" x2="13" y2="${ef.fanA.endSwitch ? 5 : -2}" stroke="${ef.fanA.endSwitch ? activeColor : 'var(--text)'}" stroke-width="1.5"/>
      <text x="-5" y="-3" font-family="Arial" font-size="6.5" fill="var(--text-faint)">SW A</text>
    </g>
    <circle cx="215" cy="60" r="14" fill="var(--panel-inset)" stroke="var(--line)" stroke-width="1.3"/>
    <g transform="translate(215, 60)">${fanASpinsHtml}</g>
    <text x="206" y="82" font-family="Arial" font-size="7.5" fill="var(--text-faint)" font-weight="bold">EF-A</text>
    ${ef.fanA.fail ? '<circle cx="215" cy="60" r="16" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="3 3"/>' : ''}
    <text x="110" y="196" font-family="Arial" font-size="8" fill="var(--text-dim)" font-weight="bold">FAN B PATH</text>
    <rect x="110" y="150" width="130" height="20" fill="var(--duct)" stroke="var(--line)" stroke-width="1.3"/>
    <g transform="translate(135, 160)">
      <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="var(--line)" stroke-dasharray="2 2" stroke-width="1"/>
      <line x1="-9" y1="0" x2="9" y2="0" stroke="${ef.fanB.damperPos > 5 ? activeColor : 'var(--text)'}" stroke-width="1.5" transform="rotate(${angleB})"/>
    </g>
    <text x="120" y="145" font-family="Arial" font-size="7.5" fill="var(--text-faint)">DMP B: ${fmt(ef.fanB.damperPos,0)}%</text>
    <g transform="translate(170, 148)">
      <circle cx="0" cy="5" r="2" fill="var(--text)"/><circle cx="15" cy="5" r="2" fill="var(--text)"/>
      <line x1="0" y1="5" x2="13" y2="${ef.fanB.endSwitch ? 5 : -2}" stroke="${ef.fanB.endSwitch ? activeColor : 'var(--text)'}" stroke-width="1.5"/>
      <text x="-5" y="-3" font-family="Arial" font-size="6.5" fill="var(--text-faint)">SW B</text>
    </g>
    <circle cx="215" cy="160" r="14" fill="var(--panel-inset)" stroke="var(--line)" stroke-width="1.3"/>
    <g transform="translate(215, 160)">${fanBSpinsHtml}</g>
    <text x="206" y="182" font-family="Arial" font-size="7.5" fill="var(--text-faint)" font-weight="bold">EF-B</text>
    ${ef.fanB.fail ? '<circle cx="215" cy="160" r="16" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="3 3"/>' : ''}
    <path d="M 240,60 L 270,60 L 290,40 L 320,40" fill="none" stroke="var(--line)" stroke-width="1.3"/>
    <path d="M 240,160 L 270,160 L 290,180 L 320,180" fill="none" stroke="var(--line)" stroke-width="1.3"/>
    <rect x="320" y="25" width="20" height="30" fill="var(--duct)" stroke="var(--line)" stroke-width="1.3"/>
    <rect x="320" y="165" width="20" height="30" fill="var(--duct)" stroke="var(--line)" stroke-width="1.3"/>
    <text x="312" y="20" font-family="Arial" font-size="7.5" fill="var(--text-faint)">EXHAUST A</text>
    <text x="312" y="205" font-family="Arial" font-size="7.5" fill="var(--text-faint)">EXHAUST B</text>
    ${ef.fanA.run ? '<path d="M 260,60 L 270,60 L 285,45" fill="none" stroke="'+flowColor+'" stroke-width="2" stroke-linecap="round"/><path d="M 330,40 L 330,28" fill="none" stroke="'+flowColor+'" stroke-width="2" marker-end="url(#arrow)" stroke-linecap="round"/>' : ''}
    ${ef.fanB.run ? '<path d="M 260,160 L 270,160 L 285,175" fill="none" stroke="'+flowColor+'" stroke-width="2" stroke-linecap="round"/><path d="M 330,180 L 330,168" fill="none" stroke="'+flowColor+'" stroke-width="2" marker-end="url(#arrow)" stroke-linecap="round"/>' : ''}
  </svg>`;
  el.innerHTML = svg;
}
