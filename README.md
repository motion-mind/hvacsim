# AHU Training Simulator

**Commercial HVAC Simulation for Training** — a fully client-side air-handling-unit
(AHU-1) training simulator. Sequence-of-operation, PID control loops, and
psychrometrics all run **in your browser** — no server, no build step, no
dependencies. Load `index.html` and it runs.

> Simplified training model — not a substitute for manufacturer sequences of operation.

## Features

- Configurable AHU: single/dual duct, shared or independent hot/cold decks,
  100% OA or return air, preheat / reheat / dual cooling coils, steam humidifier,
  VFD or starter drives, fan walls (1–12 motors), VAV / exhaust-VAV / FCU /
  operating-room / procedure-room terminals.
- Live system schematic (SVG) with animated airflow, temps, valve/damper
  positions; pan/zoom, fullscreen modal, and pop-out window.
- Field-control-panel tab: virtual multimeter across configurable terminal
  strips (24 VAC, 0–10 VDC, 4–20 mA, 0–60 Hz, 3–8 / 3–15 PSI pneumatic
  signals). Wrong meter ranges damage the meter, like real life.
- Setpoint editor, safety latches (freezestat, high static, aquastat),
  economizer / dehumid / humid toggles, AHU casing & component **age** model
  that degrades efficiency over 0–50 years.
- Fault-injection catalog (equipment faults, extreme weather, emergencies) and
  guided **troubleshooting scenarios** with an instructor "reveal solution".
- Save/load named setups in browser storage; export/import as JSON.
- Dark/light themes.

## Quick start

```sh
git clone https://github.com/motion-mind/hvacsim.git
cd hvacsim
# open index.html in a browser (any static server works: python3 -m http.server, nginx, ...)
```

There is no toolchain. JS files are classic `<script>` tags loaded in dependency
order from `index.html` (see **ARCHITECTURE.md**). All persistence is per-browser
(`localStorage` unless a `window.storage` cloud shim is present).

## Project layout

```
index.html                 App shell: layout, tabs, all DOM scaffolding
css/style.css              Theme (dark/light via CSS vars), layout, components
js/core.js                 Persistence shim, math, PID class, psychrometrics,
                           global config/setpoint/sim/fault state
js/setup.js                Setup tab: config schema + grid UI + field coercion
js/simulation.js           Physics engine: buildSimState(), tick(), tickVav(),
                           tickExhaustFan()
js/faults.js               Fault catalog + troubleshooting scenarios (AHU & VAV)
js/components.js           Reusable inline-SVG equipment graphics (BAS palette)
js/schematic.js            System schematic builder + live readout updater
js/layout-editor.js        Drag/reposition/add SVG elements; layout templates
js/ahu.js                  AHU tab readouts, setpoints table, SOO, status chips,
                           rAF render loop
js/vav.js                  VAV/FCU/OR/PR zone boxes + diagrams + VAV faults
js/control-panel.js        Field control panel: terminals, probes, multimeter
js/ef.js                   Exhaust fan (EF-1) lead/lag tab renderer
js/main.js                 Tab switching, apply-configuration, save/load,
                           scenario wiring, schematic modal/pop-out, event wiring
```

Version marker lives in `index.html` (`<span id="versionTag">`). Bump it and
commit with message convention `chore: bump version to Vx.xx`.

## Live deployments

- **GitHub Pages**: `https://motion-mind.github.io/hvacsim/`
- **Self-hosted (homelab)**: LXC CT `hvacsim` on the r740 Proxmox node,
  `http://192.168.10.72` and public `https://hvacsim.mywork.locker`
  (nginx serves `/var/www/hvacsim`, a clone of this repo — update with
  `git -C /var/www/hvacsim pull`).

## Documentation

- **ARCHITECTURE.md** — internals and editing guide: state model, config
  schema, simulation loops, fault/scenario format, where to add things.

No license is declared in this repository.
