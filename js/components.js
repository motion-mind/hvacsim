/* ============================================================
   SCHEMATIC / GFX COMPONENTS
   ============================================================ */
const BAS_LIGHT = {
  bg:'#dfe4ea', duct:'#c7cfd6', line:'#33414f', lineSoft:'#7a8794',
  heat:'#f3d9bd', heatFin:'#b5651d', cool:'#c3dcef', coolFin:'#2b6cb0',
  humid:'#e4e0f0', humidFin:'#8a6bbf',
  green:'#2f9e44', red:'#c0392b', amber:'#d78a2b',
  bubbleFill:'#fdfaf0', bubbleStroke:'#8a7f5f', text:'#1b232c', textDim:'#5b6672'
};

const BAS_DARK = {
  bg:'#000000', duct:'#141a22', line:'#4a5568', lineSoft:'#2d3748',
  heat:'#3a251a', heatFin:'#a0522d', cool:'#1a2d3c', coolFin:'#2b6cb0',
  humid:'#221c35', humidFin:'#7b68ee',
  green:'#2fa860', red:'#e5484d', amber:'#f0a83c',
  bubbleFill:'#141a22', bubbleStroke:'#2a3542', text:'#d7dee6', textDim:'#8592a1'
};

const BAS = {};
function syncBasTheme(){
  const light = document.body.classList.contains('theme-light');
  Object.assign(BAS, light ? BAS_LIGHT : BAS_DARK);
}
syncBasTheme();

const GFX = {
  damper: { css: `.graphivac-object .in-alarm .damper {animation:damper-alarm 1s infinite;}
   @keyframes damper-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .damper-line {
   transform: rotate(35deg);
   }
   .graphivac-object .value-100 .damper-line { transform: rotate(0deg); }
   .graphivac-object .value-90 .damper-line { transform: rotate(8deg); }
   .graphivac-object .value-80 .damper-line { transform: rotate(16deg); }
   .graphivac-object .value-70 .damper-line { transform: rotate(24deg); }
   .graphivac-object .value-60 .damper-line { transform: rotate(32deg); }
   .graphivac-object .value-50 .damper-line { transform: rotate(40deg); }
   .graphivac-object .value-40 .damper-line { transform: rotate(48deg); }
   .graphivac-object .value-30 .damper-line { transform: rotate(56deg); }
   .graphivac-object .value-20 .damper-line { transform: rotate(64deg); }
   .graphivac-object .value-10 .damper-line { transform: rotate(72deg); }
   .graphivac-object .value-0 .damper-line { transform: rotate(80deg); }`, markup: `<rect id="rect4367" class="damper" height="27.5" width="12" stroke="#000" stroke-miterlimit="4" x="10" y="2.25" stroke-dasharray="none" stroke-width="1" fill="#659dc5"/>
<g stroke="black" stroke-width="1.5px">
  <g transform="translate(16 7)"><line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line"/></g>
  <g transform="translate(16 13)"><line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line"/></g>
  <g transform="translate(16 19)"><line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line"/></g>
  <g transform="translate(16 25)"><line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line"/></g>
</g>
<g id="g4877" stroke-linejoin="miter" transform="matrix(1.2268237,0,0,0.94845469,-3.9945788,0.38726261)" stroke="#000" stroke-linecap="butt" fill="none">
 <path id="path4317" stroke-width="1.06272972px" d="m16.298,2.2402,0,28.442"/>
</g>` },
  fan: { css: `.graphivac-object .in-alarm .fan {animation:fan-alarm 1s infinite;}
   @keyframes fan-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
    .graphivac-object .active .fan .rotating-middle {
    animation:fan-spin 3s linear infinite;
    transform-box:fill-box; transform-origin:center;
    }
   .graphivac-object .active:not(.in-alarm) .fan .fan-background {
   fill: #66c492;
   }
   @keyframes fan-spin { 100% {transform:rotate(360deg);} }
   @keyframes fan-spin-rev { 100% {transform:rotate(-360deg);} }`, markup: `<g fill="#659dc5">
    <g class="fan">
      <g id="g8">
   <path class="fan-background" d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z" fill-rule="evenodd" stroke="#000" stroke-width="1px" fill="inherit"></path>
      </g>
      <g id="g4148" transform="translate(12.464 16.395)">
   <g id="g4162" stroke="#000" stroke-width="1.5" fill="none" class="rotating-middle">
     <path id="use3009" d="m-1.8112-3.9787 3.6227-4.4971"/>
     <path id="use3011" d="m0.87376-4.2835 5.5741-1.5089"/>
     <path id="use3013" d="m3.2243-2.9521 5.3965 2.0557"/>
     <path id="use3015" d="m4.3433-0.4935 3.1575 4.835"/>
     <path id="use3017" d="m3.8043 2.1547-0.28747 5.7676"/>
     <path id="use3019" d="m1.8113 3.9787-3.6227 4.4971"/>
     <path id="use3021" d="m-0.87324 4.2837-5.5741 1.5089"/>
     <path id="use3023" d="m-3.2242 2.9527-5.3965-2.0559"/>
     <path id="use3025" d="m-4.3432 0.4935-3.158-4.8353"/>
     <path id="use3027" d="m-3.8032-2.1541 0.2875-5.7676"/>
   </g>
      </g>
    </g>
  </g>` },
  fanSupply: { css: `.graphivac-object .in-alarm .fan-s {animation:fan-alarm 1s infinite;}
   @keyframes fan-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
    .graphivac-object .active .fan-s .rotating-middle-s {
    animation:fan-supply-spin 3s linear infinite;
    transform-box:fill-box; transform-origin:center;
    }
   .graphivac-object .active:not(.in-alarm) .fan-s .fan-background-s {
   fill: #66c492;
   }
   @keyframes fan-supply-spin { 100% {transform:rotate(-360deg);} }`, markup: `<g fill="#659dc5">
    <g class="fan-s">
      <g id="g8s">
   <path class="fan-background-s" d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z" fill-rule="evenodd" stroke="#000" stroke-width="1px" fill="inherit"></path>
      </g>
      <g transform="translate(12.464 16.395)">
   <g stroke="#000" stroke-width="1.5" fill="none" class="rotating-middle-s">
     <path d="m-1.8112-3.9787 3.6227-4.4971"/>
     <path d="m0.87376-4.2835 5.5741-1.5089"/>
     <path d="m3.2243-2.9521 5.3965 2.0557"/>
     <path d="m4.3433-0.4935 3.1575 4.835"/>
     <path d="m3.8043 2.1547-0.28747 5.7676"/>
     <path d="m1.8113 3.9787-3.6227 4.4971"/>
     <path d="m-0.87324 4.2837-5.5741 1.5089"/>
     <path d="m-3.2242 2.9527-5.3965-2.0559"/>
     <path d="m-4.3432 0.4935-3.158-4.8353"/>
     <path d="m-3.8032-2.1541 0.2875-5.7676"/>
   </g>
      </g>
    </g>
  </g>` },
  fanReturn: { css: `.graphivac-object .in-alarm .fan-r {animation:fan-alarm 1s infinite;}
    .graphivac-object .active .fan-r .rotating-middle-r {
   animation:fan-return-spin 3s linear infinite;
   transform-box:fill-box; transform-origin:center;
   }
   .graphivac-object .active:not(.in-alarm) .fan-r .fan-background-r {
   fill: #66c492;
   }
   @keyframes fan-return-spin { 100% {transform:rotate(-360deg);} }`, markup: `<g fill="#659dc5">
    <g class="fan-r">
      <g id="g8r">
   <path class="fan-background-r" d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z" fill-rule="evenodd" stroke="#000" stroke-width="1px" fill="inherit"></path>
      </g>
      <g transform="translate(12.464 16.395)">
   <g stroke="#000" stroke-width="1.5" fill="none" class="rotating-middle-r">
     <path d="m-1.8112-3.9787 3.6227-4.4971"/>
     <path d="m0.87376-4.2835 5.5741-1.5089"/>
     <path d="m3.2243-2.9521 5.3965 2.0557"/>
     <path d="m4.3433-0.4935 3.1575 4.835"/>
     <path d="m3.8043 2.1547-0.28747 5.7676"/>
     <path d="m1.8113 3.9787-3.6227 4.4971"/>
     <path d="m-0.87324 4.2837-5.5741 1.5089"/>
     <path d="m-3.2242 2.9527-5.3965-2.0559"/>
     <path d="m-4.3432 0.4935-3.158-4.8353"/>
     <path d="m-3.8032-2.1541 0.2875-5.7676"/>
   </g>
      </g>
    </g>
  </g>` },
  coolingCoil: { css: `.graphivac-object .in-alarm .cooling-coil {animation:cooling-coil-alarm 1s infinite;}
   @keyframes cooling-coil-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .active:not(.in-alarm) .cooling-coil {animation:cooling-coil-active 1.5s infinite;}
   @keyframes cooling-coil-active {
   0% { fill: #98EEFF; }
   50% { fill: #4bb7d8;}
   100% { fill: #98EEFF; }}
   .graphivac-object .value-100 .cooling-coil { transform: scale(1, 1); }
   .graphivac-object .value-90 .cooling-coil { transform: scale(1, 0.9); }
   .graphivac-object .value-80 .cooling-coil { transform: scale(1, 0.8); }
   .graphivac-object .value-70 .cooling-coil { transform: scale(1, 0.7); }
   .graphivac-object .value-60 .cooling-coil { transform: scale(1, 0.6); }
   .graphivac-object .value-50 .cooling-coil { transform: scale(1, 0.5); }
   .graphivac-object .value-40 .cooling-coil { transform: scale(1, 0.4); }
   .graphivac-object .value-30 .cooling-coil { transform: scale(1, 0.3); }
   .graphivac-object .value-20 .cooling-coil { transform: scale(1, 0.2); }
   .graphivac-object .value-10 .cooling-coil { transform: scale(1, 0.1); }
   .graphivac-object .value-0 .cooling-coil { transform: scale(1, 0); }`, markup: `<g stroke="#000">
   <rect id="rect4367" height="27.246" width="17.868" x="7.066" y="2.3772" fill="#659dc5"/>
   <g transform="translate(24.9334,29.6232) rotate(180)">
     <rect id="rect4367" class="cooling-coil" height="27.246" width="17.875" x="0" y="0" fill="#659dc5" stroke="none"/>
   </g>
   <rect id="rect4367" height="27.246" width="17.868" x="7.066" y="2.3772" fill="none"/>
   <path id="path3001" d="m7.322 2.3729 17.424 27.254" stroke-width="1px" fill="none"/>
   <path id="path3003" d="m24.929 2.3734-17.642 27.182" stroke-width="1px" fill="none"/>
 </g>` },
  heatingCoil: { css: `.graphivac-object .in-alarm .heating-coil {animation:heating-coil-alarm 1s infinite;}
   @keyframes heating-coil-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .active:not(.in-alarm) .heating-coil {animation:heating-coil-active 1.5s infinite;}
   @keyframes heating-coil-active {
   0% { fill: #fff600; }
   50% { fill: #ffae00;}
   100% { fill: #fff600; }}
   .graphivac-object .value-100 .heating-coil { transform: scale(1, 1); }
   .graphivac-object .value-90 .heating-coil { transform: scale(1, 0.9); }
   .graphivac-object .value-80 .heating-coil { transform: scale(1, 0.8); }
   .graphivac-object .value-70 .heating-coil { transform: scale(1, 0.7); }
   .graphivac-object .value-60 .heating-coil { transform: scale(1, 0.6); }
   .graphivac-object .value-50 .heating-coil { transform: scale(1, 0.5); }
   .graphivac-object .value-40 .heating-coil { transform: scale(1, 0.4); }
   .graphivac-object .value-30 .heating-coil { transform: scale(1, 0.3); }
   .graphivac-object .value-20 .heating-coil { transform: scale(1, 0.2); }
   .graphivac-object .value-10 .heating-coil { transform: scale(1, 0.1); }
   .graphivac-object .value-0 .heating-coil { transform: scale(1, 0); }`, markup: `<defs><rect id="heating-coil-rect" height="27.246" width="17.868" x="0" y="0"/></defs>
 <g stroke="#000">
   <use xlink:href="#heating-coil-rect" fill="#659dc5" stroke="none" x="7.066" y="2.3772"></use>
   <g transform="translate(24.9334,29.6232) rotate(180)">
     <use xlink:href="#heating-coil-rect" class="heating-coil" x="0" y="0" fill="#659dc5" stroke="none"></use>
   </g>
   <use xlink:href="#heating-coil-rect" stroke-width="1" fill="none" x="7.066" y="2.3772"></use>
   <path id="path3003" stroke-linejoin="miter" d="M24.929,2.3734,7.2868,29.555" stroke="#000" stroke-linecap="butt" stroke-width="1px" fill="none"/>
 </g>` },
  humidifier: { css: `.graphivac-object .in-alarm .duct-humidifier .humidifier-body {animation:duct_humidifier_color_change 1s infinite;}
   @keyframes duct_humidifier_color_change {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .active .duct-humidifier .water-drops {
   transform:translate(-10px);
   animation:duct-humidifier-drop-move 1s linear infinite;
   }
   .graphivac-object .inactive .duct-humidifier .water-drops { opacity: 0; }
   .graphivac-object .active .duct-humidifier .water-drops-2 { animation-delay: 0.3s; }
   @keyframes duct-humidifier-drop-move 
   { 100% {transform:translate(10px);opacity:0.1;} }`, markup: `<g class="duct-humidifier">
<g id="g11" transform="translate(0 5.1505)">
 <g id="g13" stroke="#000" stroke-width=".5" class="water-drops" fill="#00f0ff">
  <path id="path4150" d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"/>
  <g id="g4236" transform="translate(0 .17167)">
   <path id="path4150-7" d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"/>
   <path id="path4150-7-1" d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"/>
  </g>
 </g>
</g>
<path id="rect4136-6" class="humidifier-body" d="m4.3242 8.877v22.586h4.0059v-9.883h4.3789v-2.617h-4.3789v-5.721h4.3789v-2.617h-4.3789v-1.748h-4.0059z" stroke="#000" fill="#659dc5"/>
</g>` },
  filter: { css: ``, markup: `<g stroke="#000" stroke-width="1">
   <rect id="rect4367" height="27.35" width="11.26" y="2.3252" x="10.37" fill="#659dc5"/>
   <path id="path3756" stroke-linejoin="miter" d="m11.892,2.6997,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334" stroke-linecap="round" stroke-miterlimit="4" stroke-dasharray="none" stroke-width="1.2694304" fill="none"/>
 </g>` },
  lowLimit: { css: `.graphivac-object .active .low-limit .low-limit-background {animation:low-limit-alarm 1s infinite;}
   @keyframes low-limit-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}`, markup: `<g class="low-limit">
   <rect x="14.557" y="9.913" width="2.901" height="14.505" fill="#ff0" stroke="#000" stroke-width="1px" />
   <path class="low-limit-background" d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z" fill="#659dc5" stroke="#000" stroke-width="0.89px" />
   <g transform="translate(9.6012,1.1026)"><circle r="0.773" cy="28.130" cx="6.406" fill="none" stroke="#000" stroke-width="0.5" /><path d="m 6.406,27.157 0,-3.504" fill="none" stroke="#000" stroke-width="0.5" /></g>
   <line x1="11" y1="17" x2="21" y2="17" stroke="#c0392b" stroke-width="1.5" />
   <path d="M 16,20.5 L 13.5,17.5 L 18.5,17.5 Z" fill="#c0392b" />
 </g>` },
  staticP: { css: ``, markup: `<path d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z" fill="#659dc5" stroke="#000" stroke-width="0.89px" />
<g transform="matrix(0.83920236,0,0,0.83920236,2.5837137,4.2139363)">
  <path d="m 14.917,30.514 0,-5.217" fill="none" stroke="#000" stroke-width="0.82px" />
  <path d="m 14.917,25.297 2.0,0 c 0.9,0 1.5,0.65 1.5,1.35 0,0.7 -0.6,1.35 -1.5,1.35 l -2.0,0" fill="none" stroke="#000" stroke-width="0.82px" />
</g>
<path d="M 14.624,23.515 V 11.05 H 10.022" fill="none" stroke="#000" stroke-width="1px" />
<path d="M 26.793,31.372 H 22.887 V 20.767 H 17.106 V 23.212" fill="none" stroke="#000" stroke-width="1px" />` },
  vfd: { css: `.graphivac-object .in-alarm .vfd .vfd-fill {animation:vfd-alarm 1s infinite;}
   @keyframes vfd-alarm {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .active:not(.in-alarm) .vfd .vfd-fill { fill: #66c492; }
   .graphivac-object .active .vfd .vfd-wave { animation: vfd-wave-flow 1s linear infinite; }
   @keyframes vfd-wave-flow {
   0% { transform: translateX(0); }
   100% { transform: translateX(-12px); } }
   .graphivac-object .vfd .vfd-fill { transform: scale(1, 0); }
   .graphivac-object .value-100 .vfd .vfd-fill { transform: scale(1, 1); }
   .graphivac-object .value-90 .vfd .vfd-fill { transform: scale(1, 0.9); }
   .graphivac-object .value-80 .vfd .vfd-fill { transform: scale(1, 0.8); }
   .graphivac-object .value-70 .vfd .vfd-fill { transform: scale(1, 0.7); }
   .graphivac-object .value-60 .vfd .vfd-fill { transform: scale(1, 0.6); }
   .graphivac-object .value-50 .vfd .vfd-fill { transform: scale(1, 0.5); }
   .graphivac-object .value-40 .vfd .vfd-fill { transform: scale(1, 0.4); }
   .graphivac-object .value-30 .vfd .vfd-fill { transform: scale(1, 0.3); }
   .graphivac-object .value-20 .vfd .vfd-fill { transform: scale(1, 0.2); }
   .graphivac-object .value-10 .vfd .vfd-fill { transform: scale(1, 0.1); }
   .graphivac-object .value-0 .vfd .vfd-fill { transform: scale(1, 0); }`, markup: `<defs><clipPath id="vfd-clip"><rect x="4" y="6" width="24" height="20" rx="2" ry="2"/></clipPath></defs>
 <g fill="#659dc5">
   <g class="vfd"><rect x="4" y="6" width="24" height="20" rx="2" ry="2" fill="inherit" stroke="none" />
     <g clip-path="url(#vfd-clip)"><g transform="translate(28, 26) rotate(180)"><rect class="vfd-fill" x="0" y="0" width="24" height="20" fill="#659dc5" /></g>
       <path class="vfd-wave" d="M -5,16 C -3,11 -1,11 1,16 C 3,21 5,21 7,16 C 9,11 11,11 13,16 C 15,21 17,21 19,16 C 21,11 23,11 25,16 C 27,21 29,21 31,16 C 33,11 35,11 37,16 C 39,21 41,21 43,16 C 45,11 47,11 49,16" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" />
     </g>
     <rect x="4" y="6" width="24" height="20" rx="2" ry="2" fill="none" stroke="#000" stroke-width="1" />
   </g>
 </g>` },
  globeValve: { css: ``, markup: `<g id="g4041" stroke-linejoin="round" fill-rule="nonzero" transform="translate(0.62959365,1.6516864)" stroke="#000" stroke-linecap="round" stroke-dasharray="none" stroke-miterlimit="4" stroke-width="1" fill="#659dc5">
  <path id="path4019" transform="translate(5.3992957,6.473236)" d="m10.068,7.9344-11.075,6.3941,0-12.788z"/>
  <path id="path4019-7" transform="matrix(-1,0,0,1,25.341517,6.354592)" d="m10.068,7.9344-11.075,6.3941,0-12.788z"/>
 </g><path id="path4096" stroke-linejoin="round" d="m21.22,16c0,2.8831-2.3368,5.2203-5.2203,5.2203s-5.2203-2.3372-5.2203-5.2203,2.3368-5.2203,5.2203-5.2203,5.2203,2.3372,5.2203,5.2203z" fill-rule="nonzero" stroke="#000" stroke-linecap="round" stroke-miterlimit="4" stroke-dasharray="none" stroke-width="0.94915253" fill="#659dc5"/>` },
  pump: { css: `.graphivac-object .in-alarm .pump {animation:pump-color-change 1s infinite;}
   @keyframes pump-color-change {
   0% { fill: red; }
   50% { fill: #659dc5;}
   100% { fill: red; }}
   .graphivac-object .active .pump .rotating-middle { fill: black; animation:pump-spin 3s linear infinite; }
   .graphivac-object .active:not(.in-alarm) .pump .pump-background { fill: #27AE60; }
   @keyframes pump-spin { 100% {transform:rotate(360deg);} }`, markup: `<g fill="#659dc5">
 <g class="pump">
  <circle stroke="#000" cy="16" cx="15.955" r="9.9609" class="pump-background"/>
  <g transform="translate(16,16)">
   <path d="m-5 8.1369v-16.256l14.078 8.1282z" class="rotating-middle" stroke="#000" stroke-width=".96719"/>
  </g>
 </g>
</g>` },
  sensorTemp: { css: ``, markup: `<g stroke="#000" stroke-width="1px"><rect height="14.505" width="2.901" y="9.9128" x="14.557" fill="#ff0" /><path stroke-width="1.2px" transform="matrix(.74098 0 0 .74098 7.3047 15.679)" fill="#659dc5" d="m17.949 15.898-3.1021 5.373h-6.2042l-3.1021-5.373 3.1021-5.373h6.2042z" /></g>
<g transform="translate(9.6012392,1.1026072)"><circle r="0.77312505" cy="28.129852" cx="6.4061227" fill="none" /><path d="m 6.4061205,27.157211 0,-3.503721" /></g>` },
  sensorHumidity: { css: ``, markup: `<rect style="fill:#00d1ff;stroke:#000000;stroke-width:1px" x="14.557" y="9.9127998" width="2.901" height="14.505" /><path style="fill:#659dc5;stroke:#000000;stroke-width:0.88917601px" d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z" /><g transform="translate(-0.0659765,0.09707744)"><path d="m 17.43357,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z" /></g>` },
  sensorPressure: { css: ``, markup: `<path style="fill:#659dc5;stroke:#000000;stroke-width:1.29098415px" d="m 22.674603,20.781134 -3.337301,5.780382 -6.674603,0 -3.3373016,-5.780382 3.3373016,-5.780382 6.674603,0 z" /><g transform="matrix(0.39332133,0,0,0.5366036,9.9048822,37.44313)"><path d="m 16.929663,-31.088307 4.3966,-1.150699 0,2.301399 z" /><path d="m 27.541431,-31.088307 -8.628768,0" /><path d="m 15.532379,-39.152447 0,16.2032" /></g><path d="m 2.0131572,0.15657804 0,6.80726356 12.5601338,0 0,8.3199894" /><path d="m 29.865974,0.15657812 0,6.80726348 -12.560133,0 0,8.3199894" />` },
  sensorStaticPressure: { css: ``, markup: `<path d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z" fill="#659dc5" stroke="#000" stroke-width="0.89px" /><g transform="matrix(0.83920236,0,0,0.83920236,2.5837137,4.2139363)"><path d="m 14.917,30.514 0,-5.217" /><path d="m 14.917,25.297 2.0,0 c 0.9,0 1.5,0.65 1.5,1.35 0,0.7 -0.6,1.35 -1.5,1.35 l -2.0,0" /></g><path d="M 14.624,23.515 V 11.05 H 10.022" /><path d="M 26.793,31.372 H 22.887 V 20.767 H 17.106 V 23.212" />` },
  sensorFlow: { css: ``, markup: `<path d="m 20.60455,27.4591 -2.298594,3.981286 -4.597188,0 -2.298594,-3.981286 2.298594,-3.981286 4.597188,0 z" fill="#659dc5" stroke="#000" stroke-width="0.89px" /><g transform="matrix(0.83920236,0,0,0.83920236,2.5837137,4.2139363)"><path d="m 14.917284,30.513877 0,-5.217284 2.569115,0" /><path d="m 14.956808,27.549512 2.529591,0" /></g><path d="m 16.059713,23.514719 0,-12.464256 -4.602186,0" /><path d="m 15.915895,19.439866 2.205215,0 0,4.122792" />` },
  gateValve: { css: ``, markup: `<g stroke-linejoin="round" fill-rule="nonzero" transform="translate(0.62959365,1.6516864)" stroke="#000" stroke-linecap="round" stroke-width="1" fill="#659dc5"><path d="m10.068,7.9344-11.075,6.3941,0-12.788z" transform="translate(5.3992957,6.473236)"/><path d="m10.068,7.9344-11.075,6.3941,0-12.788z" transform="matrix(-1,0,0,1,25.341517,6.354592)"/></g>` },
  ballValve: { css: ``, markup: `<g stroke="#000" transform="translate(1.246,0)"><path d="M22,0.5c0,3.0376-2.462,5.5-5.5,5.5s-5.5-2.4624-5.5-5.5,2.462-5.5,5.5-5.5,5.5,2.4624,5.5,5.5z" transform="matrix(0.94915254,0,0,0.94915254,-0.95762704,15.525424)" stroke-linecap="round" fill="#659dc5"/><path d="m9,10.5,0,11" stroke-linejoin="miter" stroke-width="1px" fill="none"/><path d="m20.508,10.5,0,11" fill="none"/><path d="m14.729,25.5,0-19,4,0" fill="none"/></g>` },
  butterflyValve: { css: ``, markup: `<g stroke-linejoin="miter" transform="translate(0.7455,0)" stroke="#000" stroke-linecap="butt" stroke-width="1px" fill="none"><path d="m11.78,10.5,0,11"/><path d="m17.593,10.5,0,11"/><path d="m14.729,25.5,0-19,4,0"/></g>` },
  thermalWheel: { css: `.graphivac-object .in-alarm .thermal-wheel-background {animation:thermal_wheel_alarm 1s infinite;}
   @keyframes thermal_wheel_alarm {
   0% { fill: red; } 50% { fill: #659dc5;} 100% { fill: red; }}
   .graphivac-object .active .thermal-wheel { animation:thermal-wheel-spin 1.6s linear infinite; }
   .graphivac-object .active .thermal-wheel-background { fill: #66c492; }
   @keyframes thermal-wheel-spin {from {transform:translate(0px,4px);} to {transform:translate(0px,-4px);}}`, markup: `<g stroke="#000" fill="#659dc5"><rect class="thermal-wheel-background" height="40" width="25.5" y="-4" x="3" fill="inherit" stroke-width="1"/><g class="thermal-wheel" stroke-width="1"><line x1="3" x2="28.5" y1="-4" y2="-4"/><line x1="3" x2="28.5" y1="0" y2="0"/><line x1="3" x2="28.5" y1="4" y2="4"/><line x1="3" x2="28.5" y1="8" y2="8"/><line x1="3" x2="28.5" y1="12" y2="12"/><line x1="3" x2="28.5" y1="16" y2="16"/><line x1="3" x2="28.5" y1="20" y2="20"/><line x1="3" x2="28.5" y1="24" y2="24"/><line x1="3" x2="28.5" y1="28" y2="28"/><line x1="3" x2="28.5" y1="32" y2="32"/><line x1="3" x2="28.5" y1="36" y2="36"/></g></g>` },
  ductSection: { css: ``, markup: `<rect x="0" y="7" width="32" height="18" fill="#c7cfd6" stroke="#33414f" stroke-width="1.5"/><line x1="0" y1="16" x2="32" y2="16" stroke="#7a8794" stroke-width="0.8" stroke-dasharray="4 5"/>` }
};

function gfxWrap(name, stateClasses, scale, uid, flip){
  let markup = GFX[name].markup;
  if(uid){
    markup = markup.split('heating-coil-rect').join('heating-coil-rect-'+uid);
    markup = markup.split('vfd-clip').join('vfd-clip-'+uid);
  }
  markup = markup.replace(/\s+id="(?!heating-coil-rect-|vfd-clip-)[^"]*"/g, '');
  const sx = flip? -scale : scale;
  return '<g transform="scale('+sx+','+scale+')"><g transform="translate(-16,-16)"><g class="graphivac-object"><g class="'+stateClasses+'">'+markup+'</g></g></g></g>';
}

function roundTo10(pct){ return clamp(Math.round(clamp(pct,0,100)/10)*10,0,100); }
function damperGfx(pct, inAlarm, scale){ return gfxWrap('damper', 'value-'+roundTo10(pct)+(inAlarm?' in-alarm':''), scale||2.1); }
function fanGfx(status, dir, flip){
  const cls = status==='run'? 'active' : status==='fail'? 'in-alarm' : '';
  let arrow = '';
  if(dir==='left'){ arrow = '<path d="M -30,-7 L -42,0 L -30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  else if(dir==='right'){ arrow = '<path d="M 30,-7 L 42,0 L 30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  return gfxWrap('fan', cls, 1.5, null, flip) + arrow;
}
function fanSupplyGfx(status, dir, flip){
  const cls = status==='run'? 'active' : status==='fail'? 'in-alarm' : '';
  let arrow = '';
  if(dir==='left'){ arrow = '<path d="M -30,-7 L -42,0 L -30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  else if(dir==='right'){ arrow = '<path d="M 30,-7 L 42,0 L 30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  return gfxWrap('fanSupply', cls, 1.5, null, flip) + arrow;
}
function fanReturnGfx(status, dir, flip){
  const cls = status==='run'? 'active' : status==='fail'? 'in-alarm' : '';
  let arrow = '';
  if(dir==='left'){ arrow = '<path d="M -30,-7 L -42,0 L -30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  else if(dir==='right'){ arrow = '<path d="M 30,-7 L 42,0 L 30,7 Z" fill="'+BAS.textDim+'" stroke="'+BAS.line+'" stroke-width="0.6"/>'; }
  return gfxWrap('fanReturn', cls, 1.5, null, flip) + arrow;
}
function coolingCoilGfx(pct, inAlarm){ const active = pct>2 && !inAlarm; return gfxWrap('coolingCoil', 'value-'+roundTo10(pct)+(inAlarm?' in-alarm':(active?' active':'')), 2.1); }
function heatingCoilGfx(pct, inAlarm, uid){ const active = pct>2 && !inAlarm; return gfxWrap('heatingCoil', 'value-'+roundTo10(pct)+(inAlarm?' in-alarm':(active?' active':'')), 2.1, uid); }
function humidifierGfx(active, inAlarm){ return gfxWrap('humidifier', (active?'active':'inactive')+(inAlarm?' in-alarm':''), 1.4); }
function filterGfx(dirty){
  let markup = GFX.filter.markup;
  if(dirty) markup = markup.split('fill="#659dc5"').join('fill="#8a6d3b"');
  markup = markup.replace(/\s+id="[^"]*"/g, '');
  return '<g transform="scale(2.1)"><g transform="translate(-16,-16)">'+markup+'</g></g>';
}
function lowLimitGfx(tripped){ return gfxWrap('lowLimit', tripped?'active':'', 1.3); }
function pumpGfx(status){ const cls = status==='run'? 'active' : status==='fail'? 'in-alarm' : ''; return gfxWrap('pump', cls, 1.5); }

function stationLabel(cx,y,text){
  return '<text x="'+cx+'" y="'+(y+16)+'" font-family="Arial" font-size="9.5" text-anchor="middle" fill="'+BAS.textDim+'" letter-spacing=".02em">'+text+'</text>';
}

function bubble(cx, topY, tier, title, lines, accent, dx = 0){
  let maxTextW = 0;
  lines.forEach((l, idx) => {
    let w = 0;
    for (let c of l) {
      if (/[A-Z0-9\u00b0%#]/.test(c)) { w += (idx === 0) ? 5.85 : 5.25; }
      else { w += (idx === 0) ? 4.65 : 4.1; }
    }
    if (w > maxTextW) maxTextW = w;
  });
  const bw = Math.max(51, Math.round(maxTextW + 14));
  const bh=12+(lines.length-1)*10+5;
  const by = topY - tier - bh;
  const bx = cx + dx;
  let html = '<line x1="'+cx+'" y1="'+topY+'" x2="'+bx+'" y2="'+(by+bh)+'" stroke="'+BAS.lineSoft+'" stroke-width="0.75"/>'+
    '<rect x="'+(bx-bw/2)+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="2" fill="'+BAS.bubbleFill+'" stroke="'+(accent||BAS.bubbleStroke)+'" stroke-width="1"/>';
  lines.forEach((l,i)=>{ html += '<text x="'+bx+'" y="'+(by+10.5+i*10)+'" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="'+BAS.text+'" font-weight="'+(i===0?700:400)+'">'+l+'</text>';
  });
  html += '<title>'+title+'</title>';
  return html;
}

function bubbleDown(cx, botY, tier, title, lines, accent, dx = 0){
  let maxTextW = 0;
  lines.forEach((l, idx) => {
    let w = 0;
    for (let c of l) {
      if (/[A-Z0-9\u00b0%#]/.test(c)) { w += (idx === 0) ? 5.85 : 5.25; }
      else { w += (idx === 0) ? 4.65 : 4.1; }
    }
    if (w > maxTextW) maxTextW = w;
  });
  const bw = Math.max(51, Math.round(maxTextW + 14));
  const bh=12+(lines.length-1)*10+5;
  const by = botY + tier;
  const bx = cx + dx;
  let html = '<line x1="'+cx+'" y1="'+botY+'" x2="'+bx+'" y2="'+by+'" stroke="'+BAS.lineSoft+'" stroke-width="0.75"/>'+
    '<rect x="'+(bx-bw/2)+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="2" fill="'+BAS.bubbleFill+'" stroke="'+(accent||BAS.bubbleStroke)+'" stroke-width="1"/>';
  lines.forEach((l,i)=>{ html += '<text x="'+bx+'" y="'+(by+10.5+i*10)+'" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="'+BAS.text+'" font-weight="'+(i===0?700:400)+'">'+l+'</text>';
  });
  html += '<title>'+title+'</title>';
  return html;
}

function bubbleLeft(cx, cy, dx, title, lines, accent){
  let maxTextW = 0;
  lines.forEach((l, idx) => {
    let w = 0;
    for (let c of l) {
      if (/[A-Z0-9\u00b0%#]/.test(c)) { w += (idx === 0) ? 5.85 : 5.25; }
      else { w += (idx === 0) ? 4.65 : 4.1; }
    }
    if (w > maxTextW) maxTextW = w;
  });
  const bw = Math.max(51, Math.round(maxTextW + 14));
  const bh=12+(lines.length-1)*10+5;
  const by = cy - bh/2;
  const bx = cx + dx;
  let html = '<line x1="'+cx+'" y1="'+cy+'" x2="'+(bx+bw/2)+'" y2="'+cy+'" stroke="'+BAS.lineSoft+'" stroke-width="0.75"/>'+
    '<rect x="'+(bx-bw/2)+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="2" fill="'+BAS.bubbleFill+'" stroke="'+(accent||BAS.bubbleStroke)+'" stroke-width="1"/>';
  lines.forEach((l,i)=>{ html += '<text x="'+bx+'" y="'+(by+10.5+i*10)+'" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="'+BAS.text+'" font-weight="'+(i===0?700:400)+'">'+l+'</text>'; });
  html += '<title>'+title+'</title>';
  return html;
}
