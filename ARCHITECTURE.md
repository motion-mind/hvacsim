# ARCHITECTURE — AHU Training Simulator

How the simulator works on the inside, and a guide to making changes safely.
Read this before editing. It is accurate to `V1.85` (commit `baf8e8c`).

There is no framework and no build. Everything is plain ES5-ish JavaScript in
classic `<script>` tags sharing a **global namespace**, coordinated by objects
declared in `core.js`. The whole app is one big client-side state machine:

```
HTML (index.html)  ──  UI layers (ahu.js, vav.js, ef.js, control-panel.js, schematic.js)
        ▲  reads sim/config/sp & writes DOM
        │
   ┌────┴───────────────┐
   │  GLOBAL STATE      │   core.js: config, sp, sim, activeFaults, latched,
   │                    │           manualSafety, terminals, probes…
   └────┬───────────────┘
        │  mutates state only
   ┌────┴───────────────┐
   │  SIMULATION ENGINE │   simulation.js tick() → tickVav() / tickExhaustFan()
   └────────────────────┘
```

## 1. Load order & namespacing

`index.html` loads scripts in this order — this **is** the dependency order:

1. `core.js` — helpers + state **must load first**
2. `setup.js`, `simulation.js`, `faults.js`, `components.js`, `schematic.js`
3. `layout-editor.js`, `ahu.js`, `vav.js`, `control-panel.js`, `ef.js`
4. `main.js` — wires buttons, starts loops, runs initial `applyConfiguration()`

Everything is a top-level `function`/`const`/`let` on `window`. Cross-module
communication is by shared mutable globals (from `core.js`):

| Global | Meaning |
|---|---|
| `config` | Unit configuration (what hardware the AHU has) |
| `sp` | Setpoints object (editable in the Setpoints table) |
| `sim` | Runtime simulated state (values that move every tick) |
| `faultsCatalog`, `activeFaults` | Fault definitions / active-fault map |
| `activeScenario` | Active AHU troubleshooting scenario (or null) |
| `activeVavScenario`, `currentVavFaultDesc` | Same for the VAV tab |
| `manualSafety` | `{fireAlarm, smokeDamperFail, doorOpen}` |
| `latched` | `{freezestat, highStatic, aquastat, hotFreezestat}` |
| `freezestatRecovering` | 2°F-recovery hysteresis flag |
| `terminals`, `probeRed/probeBlack`, `disconnectedTerminals` | AHU field panel |
| `vavTerminals`, `vavProbeRed/Black`, `disconnectedVavTerminals` | VAV field panel |
| `meterDamaged`, `vavMeterDamaged`, `meterMode`, `vavMeterMode` | Meters |
| `currentFaultDesc` | Rendered label/desc list for active AHU faults |

### Persistence

`core.js` provides an async shim `storageSet/Get/List/Delete(key)` that uses a
cloud `window.storage` if present, else `localStorage`. Key namespaces:

- `ahu-setup:<name>` — saved configurations `{config, sp}` (main.js)
- `ahu-layout:<name>` — saved schematic layout templates (layout-editor.js)

### Shared helpers (core.js)

`clamp`, `round`, `fmt`, `pick`, `rnd` · `class PID{kp,ki,kd,min,max}` (anti-windup
via integral limit `span/ki`; `update(sp,pv,dt,reverse)`; `reset()`).
Psychrometrics (sea level): `satPressurePsia`, `humidityRatio`, `enthalpy`,
`rhFromW`, `dewPointF` (bisection). `pn(full,acr)` = "full (ACR)". Constants:
`WATER={chw:43,phw:160,rhw:160}`, `VAV_MIN_PCT=10`.

## 2. Config (`config`) and Setpoints (`sp`)

### `config` — what hardware the unit has

Defaults in `core.js:110`. Edited in the Setup tab (`setup.js`), which owns the
**field schema** `setupFields` (sections: supply/return/coils/signals/other/terminals).

Field types: `select` (opts `[value,label]`), `bool` (label `on`/`off`),
`number` (min/max), `info` (static help box). Every field may define
`hideIf(config)` and/or `onChange(config)` (cross-field coercion runs on
`change` then re-renders the grid).

Key keys & interactions an editor must know:

| Key | Options / meaning | Derived / interactions |
|---|---|---|
| `ductType` | `single` \| `dual` | dual ⇒ coolingCoils=`single`, reheat=false, steamHumid=false |
| `dualDuctIndependent` | bool (dual only) | independent decks get own fans/OA |
| `supplyFanCount` | 1–12 | `supplyFan` = `wall` if >1 else `single` |
| `driveType` | `vfd` \| `starter` | starter ⇒ modulating Supply Duct Damper added |
| `singleDrive` | bool (VFD) | shared vs per-motor VFD |
| `controlType` | `cfm` \| `static` | flow vs static-pressure control |
| `driveSignal`/`damperSignal`/`valveSignal` | `pct` \| `vdc` \| `ma` \| `hz` (drive) + `psi38` \| `psi315` (dampers/valves) | only signals drive outputs; field panel uses these |
| `airSystem` | `return` \| `oa100` | oa100 ⇒ returnFanCount forced 1 |
| `returnFanCount` | 0–12 | 0 ⇒ includeEa=false; >1 ⇒ `wall` |
| `coolingCoils` | `single` \| `dual` | dual adds 2nd coil + 85% staging |
| `preheat` | bool | gates preheat coil, booster pump, aquastat |
| `reheat` | bool (single duct) | AHU-level reheat; clears VAVs |
| `steamHumid` | bool | humidifier; forced on by OR/PR rooms |
| `preheatBoosterPump`/`preheatAquastat` | bool | only if preheat |
| `vavCount`/`vavsExhaustCount`/`fcuCount`/`orCount`/`prCount` | 0–10 | what terminal boxes exist |
| `vavReheatType` | `hotwater` \| `electric` | terminal reheat medium |

Derived fields (`supplyFan`, `returnFan`) are set in `buildSimState()` — do not
add them to the setup schema.

### `sp` — setpoints

Defaults `core.js:141`. All keys are wired to `<input data-sp="key">` rows in
`renderSetpoints()` (`ahu.js`), which only renders rows relevant to the config
(e.g. `staticSP` only when `controlType==='static'`). Humidity limits are kept
10 points apart. Also carries the **override** commands (`sim.override*` toggles
for fan start/speed, dampers) rendered by `overrideRow(...)`.

## 3. Simulation state (`sim`)

Built fresh by `buildSimState()` (`simulation.js:63`) whenever you hit **Apply
Configuration** (`main.js applyConfiguration()`).

Top-level scalar fields (temps °F, CFM, valve/damper positions 0–100 %, RH as a
0–1 fraction): `oat`/`oatTarget`, `oaRH`/`oaRHTarget`, `age`/`ageTarget`,
`raTemp`, `raRH`, `spaceTemp`, `maTemp`, `preheatLvg`, `coil1Lvg`, `coil2Lvg`,
`saTemp`, `coldDeckTemp`/`hotDeckTemp` (dual), `satDisplayTemp`,
`oaCfm/returnCfm/supplyCfm/exhaustCfm`, `staticPressure`,
`oaDamperPos/raDamperPos/fireDamperPos/eaDamperPos`,
`coldDeckDamperPos/hotDeckDamperPos` (dual), `supplyDamperPos` (starter),
`preheatValve/coil1Valve/coil2Valve/reheatValve/humidValve/hotDeckValve`,
`boosterPumpRun/preheatWaterTemp`, fan arrays, plus *display* twins that sensors
drift (see §7).

- `sim.supplyFans`/`returnFans`/`hotDeckFans`: arrays of `{id,fail,run}`.
  Single motor ⇒ length 1; `supplyFan==='wall'` ⇒ length = count.
- `sim.pid`: one `PID` instance per control loop (`supplyFlow`/`staticP`,
  `supplyDamper`, `oaDamper`, `hotOaDamper`, `returnFlow`, `hotDeckFlow`,
  `preheat`, `coil1`, `coil2`, `hotDeck`, `reheat`, `humid`).
- `sim.vav`: array of zone boxes, each with `{id, type, zoneIndex, zoneTemp,
  zoneSP, zoneDisplayTemp, airflowCfm/DisplayCfm, dischargeTemp,
  pid:{cool,heat}}`. Types: `vav` (id `VAV-n`), `vav-exhaust` (`ExVAV-n`),
  `fcu` (`FCU-n`), `or` (`OR-n`), `pr` (`PR-n`). Extra fields per type:
  `pressurize` (exhaust/OR/PR), `exhaustDamperPos`, `reheatValve`,
  `electricStage`, `zoneHumid/DisplayHumid` (OR/PR), `fanSpeed`,
  `coolingValve/heatingValve` (FCU). Initial zone temps/SPs are randomized; each
  box gets a `designCfm` proportional share of `sp.maxCfmSP` (rounded to 50).
- `sim.override*` (start/speed/damper booleans + `*Val`) exist for every
  hardware-dependent override the Setpoints table can expose.
- `sim.ef`: `{fanA:{run,fail,damperPos,endSwitch}, fanB:…, activeFan:'A'|'B',
  switching, faultTimer, cfm}` — created only when exhaust VAVs / ORs / PRs exist.

`activeFaults`, `manualSafety`, `latched`, `freezestatRecovering` are all reset
inside `buildSimState()`.

## 4. Simulation loops

### Physics tick — `tick()` (simulation.js), `tickVav()`, `tickExhaustFan()`

Started in `main.js`: `setInterval(tick, 1000/simSpeed)`; default `simSpeed=1`,
time-speed buttons (1/2/5/10×) restart the interval. `DT=1` second per call.

Order of work inside `tick()` (read the source for exact math):
1. Age-derived effects: `getAgeLoss(age)` (% penalty piecewise 0→50 yrs), coil
   efficiency `0.85*(1-ageLoss/100*0.35)`, sensor drift `sin(tick*0.05)*4` after 10 yrs.
2. Slew sliders toward targets (OAT/OA-RH/age ramp over ~120 s).
3. Compute **safety chain**: `fireAlarm`, `smokeDamperProven`, `doorClosed`,
   controller 24 VAC power present (i.e. `isWireDisconnected('Power (Hot)')` is
   false — **unplugging the panel power physically stops the unit**), latched
   freezestat/high-static/aquastat/hot-freezestat. Produces `wantRunCold` /
   `wantRunHot` (dual independent decks split the chain).
4. Space/return air dynamics: with VAVs, `raTemp/raRH` = average of zone boxes;
   else a simple `spaceTemp` thermal model + latent/humidity drift toward load,
   plus OA dry-air infiltration (amplified by preheat when no steam humid).
5. Demand & staging: dehumid/humid enable calls, cooling stage-2 (coil1 >85%),
   dual-deck split of OA minimums, room-load bias on supply CFM setpoint, etc.
6. **Control loops** (PID + `slew` for actuator slew rates, `DAMPER_SLEW`):
   supply fan (CFM or static), return fan, hot-deck fans, OA/RA/EA dampers
   (economizer), preheat coil + booster/aquastat, cooling coils 1/2, hot deck,
   reheat, humidifier, modulating supply duct damper (starter units).
7. Psychrometric mixing: mixed-air W/RH, coil leaving conditions (age &
   efficiency-aware), discharge conditions, sat display temp.
8. Safety trip detection: freezestat (latch + 2°F recovery), high static latch,
   aquastat latch, dirty-filter static rise, etc.
9. `tickVav(wantRun)` then `tickExhaustFan(...)`.

Static-pressure model notes (edit with care — see the fan/static block in `tick()`):
- `sim.spBefore` / `sim.spBeforeDisplay` — **main-duct static measured upstream
  of the supply output dampers** (supply duct damper, cold/hot deck dampers, or
  VAV primaries). Rises only while the fan runs *and* the output dampers are
  commanded shut; that is what trips the HI-PRS safety (both deck dampers shut,
  starter supply damper shut, or all VAV primaries faulted closed). = 0 for
  independent-dual (per-deck fans/sensors instead).
- `sim.sp23Cold` / `sim.sp23Hot` — downstream deck static (after the deck
  dampers, ~2/3 duct), proportional to how much flow each deck is actually
  moving. Shared-dual (single-source) decks redistribute: if one deck damper
  closes while the fan runs, its share is pushed to the other deck (its CFM and
  downstream static rise); CFM control for a shared fan uses **total delivered
  flow** (`supplyCfm + hotDeckCfm`) against the full `supplyCfmSP` setpoint.

`tickVav` steps each `sim.vav` box: zone temp/humidity dynamics from supply
discharge, per-box cool/heat PID → damper, reheat valve or electric stage (staging
order depends on `config.vavReheatType`), pressurization & exhaust damper logic
for `vav-exhaust`/`or`/`pr`.

`tickExhaustFan` runs the EF-1 lead/lag model (`sim.ef`): sequencing, damper
proof (`endSwitch`), failure → changeover with `faultTimer`, total `cfm`.

### Render loop — `renderAhuFrame()` (ahu.js) via `requestAnimationFrame`

Throttled to one pass every **250 ms** (`loopThrottle`). Each pass re-reads
`sim`/`config` and updates: OAT/RH/age readouts, schematic live readouts +
flow-arrow CSS classes (`flow-running`), efficiency & fan-status grids, safeties
area, status chips (enable dot / "RUNNING" / "SAFETY TRIP" / mobile bar), and —
only while their tab is active — VAV box grid numbers and the EF tab.

The fullscreen modal and pop-out window re-sync the schematic SVG from the main
one every 250 ms via `syncSvgNodes(src,tgt)` (attribute + node diff/merge).

## 5. UI tabs & DOM contract

`index.html` defines every tab panel and most element IDs; renderers fill inner
containers. Tabs: `setup`, `ahu`, `panel`, `vav` (hidden unless terminals),
`ef` (hidden unless exhaust). Switching happens in `main.js switchTab()` which
calls the tab's lazy renderer.

Notable anchors (id) you will touch when editing UI:
- Setup: `setupGrid`, saved-list block (`saveName`,`btnSaveSetup`,…).
- AHU-1: `oatSlider`/`oatReadout`, `oaRhSlider`/`oaRhReadout`,
  `ageSlider`/`ageReadout`, `sooContent` (built by `renderSoo`),
  `schematicSvg` (+ `schemContainer`), `efficiencyReadings`, `fanStatusArea`,
  `setpointTable`, `safetyArea`, fault/scenario block (`scenarioSelect`,
  `faultPicker`, `activeFaultList`, `revealBody`, …).
- Control panel: `terminalBoard`, `meterScreen/Reading/Unit/Msg`,
  `meterModes`, probe name spans, VAV analogues under `vavTerminalBoard`.
- EF tab: `efTotalCfm`, `efSystemStatus`, `efDprA/B`, `efSwA/B`, `efRunA/B`,
  `efFltA/B`, `efGraphicContainer`, `efLeadSelect`.

## 6. Config-driven schematic (`schematic.js` + `components.js`)

`buildSchematicCore()` computes a station list from `config` and emits one big
SVG string into `#schematicSvg`. It branches on duct topology:
`single` | `dual + dualDuctIndependent` (two full rows, own fans/OA/filter/coil)
| `dual shared` (cold/hot lanes forking off one supply fan), × air system
`return` (adds mixing dampers + return riser) vs `oa100`.

Each station is `{kind,x,w,id,title,cx,y}` (x/w/cx computed by the linear
`add(...)` walker; `drawStation` places it on a duct lane). Station `id`s are
the contract between builder and the live updater / layout editor, e.g.
`oaIntake`, `mixbox`, `filter`, `preheat`, `supplyfan`, `cooling`/`coil1`/
`coil2`, `reheat`, `supplydamper`, `coldDamper`/`hotDamper` (dual), `humid`,
`discharge`, plus hot-deck prefixed variants and return `riser`. Flow arrows are
separate `<g>`s with ids like `flow_coldSupply` whose CSS class toggles airflow.

- **Live values**: `updateSchematicReadouts()` writes text into per-element
  readout groups (ids `readout_*`) and re-renders equipment state classes.
- **Equipment art**: `components.js` `GFX` holds inline SVG symbols
  (`damper`, `fan`, `fanSupply`, `fanReturn`, `coolingCoil`, `heatingCoil`,
  `humidifier`, `lowLimit`, `globeValve`, `vfd`, `pump`, `filter`, …). Wrappers
  (`damperGfx(pct,…)`, `fanGfx`, `coolingCoilGfx`, …) call `gfxWrap(name,
  stateClasses, scale, uid, flip)`. State classes are **value-NN** (position
  quantized to 10s via `roundTo10`) plus `active`/`inactive`/`in-alarm`; CSS for
  those lives in `collectGfxCss()` (auto-collected into a `<style>` in `<defs>`).
- **Theme**: symbol colors come from `components.js` `BAS`/`BAS_LIGHT`/
  `BAS_DARK` palettes; `syncBasTheme()` picks one based on `body.theme-light`.
  Light/dark toggle rebuilds the schematic + BAS.

### Layout editor (layout-editor.js)

Lets a user drag stations (`attachLayoutDragging`), add custom labeled elements
(`addCustomElement` — from `elementTypeLabels`), delete custom ones, and save
templates. State: `layoutOverrides` (start = `factoryLayoutAdjustments` map of
factory deviations), `customElements`, `layoutEditMode`. Templates stored under
`ahu-layout:<name>`; export/import via JSON (`buildLayoutExport`/
`importLayoutFromJSON`). Editor mode is entered from the schematic toolbar.

## 7. Sensors, display twins & faults

Real sim values move the physics; **display** values are what the UI shows and
what sensor faults corrupt (so the DDC looks "fine" while behavior is wrong):

- `sim.satDisplayTemp` (drifting DAT sensor: `satSensorDrift` reads warm)
- `sim.oatDisplayTemp` (`oatSensorDriftHigh/Low`, ±15°F)
- `sim.raDisplayTemp` (`ratSensorDriftHigh`, +10°F)
- `sim.staticPressureDisplay` / `sim.spBeforeDisplay` (`staticPressureSensorDrift`, −0.6" w.c.)

Each active sensor/valve fault is a key on `activeFaults` read by `tick()` /
`tickVav()` / the schematic renderer — **never branch UI off `currentFaultDesc`**
(that is just the human-readable label list).

## 8. Faults & scenarios (faults.js)

### Fault catalog

`buildFaultCatalog()` (faults.js:4) rebuilds `faultsCatalog`. Entry shape:

```js
{ id: 'freezestatNuisance',
  label: 'Freezestat Sensing Element Fault (Nuisance Trip)',   // picker + active list
  cat: 'Equipment Fault',        // picker optgroup: Equipment Fault | Extreme Weather | Emergency
  applies: c => c.includeOa,     // filter on config → applicableFaults()
  apply: () => { latched.freezestat = true; },   // mutate state; faults.js has no knowledge of layout
  desc: '…' }                    // diagnosis shown in reveal / active-fault list
```

Applying (`applyFaultById(id)`) runs `apply()` then pushes `{label,desc}` onto
`currentFaultDesc`. Quick toggles (freezestat/drift buttons in the tab, EF fault
buttons in main.js) mutate `activeFaults` / `latched` / `sim.*Fans[*].fail`
directly. Numeric stuck values are stored as the stuck **position** (0 or 100)
on `activeFaults.<x>Stuck` so the schematic renders the actuator "stuck".

### Scenarios (AHU)

`scenarioCatalog` (faults.js:178) — scenario shape:

```js
{ id:'summerSwelter', title:'Scenario 1: …',
  narrative:'…',                      // trainee brief
  setup:{ damperSignal:'vdc', valveSignal:'vdc' },   // config overrides
  setpoints:{ },                       // sp overrides
  faults:['coil1NoFlow'],              // injected via applyFaultById
  solution:'…' }                       // instructor reveal
```

`applyScenario(id)` merges `setup`→config, calls `applyConfiguration()`, merges
`setpoints`→sp, sets `activeScenario`, applies each fault, enables the unit and
shows briefing. `endScenario()` clears all and hides. While a scenario is
active, `renderActiveFaults()` suppresses the manual list.

### VAV faults & scenarios

Per-box fault pickers are **generated**, not catalogued: `vavFaultTypesFor(box)`
(faults.js:255) returns common faults + type-specific ones (FCU blower/valves,
electric vs hot-water reheat for exhaust/OR/PR, etc.). Faults are keyed onto
`activeFaults['<typeId>'+boxNum]` (box num appended) — e.g.
`activeFaults.vavZoneSensorDrift3`. `vavScenarioCatalog` is a second catalog for
the VAV tab with the same `applyScenario` flow but VAV-box faults.

### Adding a fault (checklist)

1. Pick an `id`; add an entry to `buildFaultCatalog()` (mind `applies` and that
   `apply()` only touches state, never DOM).
2. If the fault should corrupt a sensor, give `sim` a matching `*Display*`
   value in `buildSimState()` and read the raw value in the physics but the
   display value in renderers.
3. Make `tick()` (or `tickVav`) honor the `activeFaults` key.
4. Optional: quick-toggle button in the AHU faults panel + `main.js` handler
   (pattern: `btnToggleFreezestat`).

### Adding a scenario (checklist)

Add an object to `scenarioCatalog` (`faults.js`) with the shape above; it
auto-appears in the picker. Compose `setup`/`setpoints`/`faults` from existing
catalog entries unless you add new faults first.

## 9. Field control panel (control-panel.js)

`buildTerminals()` (rebuilt per config) declares every **terminal** with:

```js
{ id:'TB-n', name:'…', kind, valueFn:()=>live value (0–100 % or bool),
  group, sigType, section }
```

`kind` drives probe behavior: `power_24vac`/`common_24vac` (24 VAC supply),
`signal_elec` (0–10 VDC / 4–20 mA), `signal_pneumatic` (PSI), `loop_test`
(electronic loop-test point), `dry_contact` (binary status), `common`
(signal commons). Terminals are grouped: Power, then per-section AO / AI
(commons appended per non-pneumatic section), loop tests, digitals. Label
abbreviations come from `TERM_ABBREV_RULES` regex table (`abbrevTermName`).

Meter model: `METER_MODES = VDC/VAC/Resistance/mA`. `convertSignal(pct,sigType)`
scales the 0–100 % internal value to the configured field signal
(`SIG_LABELS`). `refreshMeter()` computes the displayed reading from
`valueFn()` for whatever the red/black probes touch, translating to the active
meter mode — **wrong meter function across a live terminal damages the meter**
(`meterDamaged`, "Replace Damaged Meter" button), teaching safe field testing.
`isLive(kind)`/`sameCircuit(a,b)` implement circuit semantics. Disconnecting the
24 VAC Hot/Common pair adds to `disconnectedTerminals`, which `tick()` reads to
kill `controllerPowerOK` (whole unit safes off). VAV field panel is the same
system, namespaced `vav*`, one `boxNum` at a time (`buildVavTerminals(boxNum)`).

## 10. VAV / FCU / OR / PR zone UI (vav.js) and EF-1 (ef.js)

- `renderVavTab()` hides/shows per `updateTabVisibilities()`; `renderVavBoxGrid()`
  draws a diagram per box (`vavBoxDiagramSvg`) and `updateVavBoxGridValues()`
  refreshes numbers on the render loop. Per-box fault picker + VAV scenario
  wiring mirrors the AHU fault panel.
- `renderExhaustFanTab()` draws the EF-1 two-fan graphic and status table and is
  re-rendered each frame while the EF tab is active. Lead selection swaps
  `sim.ef.activeFan` (with `switching`/`faultTimer`). Manual fault buttons set
  `activeFaults.efAFail/efBFail/efDprAFail/efDprBFail` and `sim.ef.fan*.fail`.

## 11. Efficiency & age model (ahu.js + simulation.js)

`getAhuBaseEfficiency(oat, oaRH, hasVfd)` (simulation.js:33) returns
`{eff, driver, state}` for the "AHU Performance & Efficiency" panel and explains
free-cooling / economizer / low-ΔT effects. `getAgeLoss(age)` is the piecewise
equipment aging curve (0 % new → 35 %+ at 50 yrs); age also scales coil
efficiency and adds sinusoidal sensor drift past 10 yrs. `renderEfficiencyReadings()`
surfaces it on the AHU tab.

## 12. Editing recipes

- **Change existing behavior** (physics, setpoint logic, sensor response):
  edit `simulation.js` `tick()`/`tickVav()`/`tickExhaustFan()`; the codebase
  expects PID + `slew()` for all modulation, `clamp` for bounds.
- **Add a config option**: add key+default to `core.js` `config`; add a
  `setupFields` entry (`setup.js`) with correct section/type/hideIf/onChange;
  consume it in `buildSimState()` + schematic + `renderSetpoints()` row +
  `renderSoo()` line; consider a fault/terminal.
- **Add a hardware point to the field panel**: add a `pushAo/Ai` (analog) or
  `digital.push` / `loopTests.push` call in `buildTerminals()` with a
  `valueFn` returning the live sim value (0–100 % / bool) — do **not** store
  actual voltages; conversions happen at meter-read time.
- **Add a schematic station**: in `buildSchematicCore()` insert an `add(kind,w,
  id,title)` (or `addHot`) at the correct duct position, ensure the kind has a
  `GFX` symbol in `components.js`, give it `readout_*` handling in
  `updateSchematicReadouts()` if it shows live numbers, and add a flow arrow if
  air passes through it.
- **Add a VAV fault type**: extend `vavFaultTypesFor(box)` (faults.js) and honor
  the resulting `activeFaults['<id>'+boxNum]` key in `tickVav()`.
- **Bump version**: update `V1.85` in `index.html`, commit
  `chore: bump version to V1.86` (repo convention).

## 13. Testing changes

No test harness or lint config exists. Verify by hand in a browser against
`index.html`:

1. Fresh apply of a default + a random config; check no console errors (a red
   fatal-error banner is injected by `core.js` `window.onerror`).
2. Enable the unit; watch temperature/CFM move and settle toward setpoints.
3. Smoke-test each config branch once: single/dual shared/dual independent ×
   return/oa100 × VFD/starter, plus one VAV, one exhaust-VAV, one FCU, one OR.
4. Field panel: meter across a signal vs. dry contact; disconnect 24 VAC power
   and confirm the unit safes off.
5. After HTML/UI edits, confirm mobile (<768 px) layout — CSS uses custom props
   (`--panel`, `--text`, `--green`, `--amber`, `--red`, `--blue`, `--cyan`,
   `--mono`, …) defined in `style.css :root` and toggled by `body.theme-light`.
