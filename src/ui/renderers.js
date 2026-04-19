/**
 * renderers.js — Screen rendering functions (Runna v3)
 * 
 * CHANGES from v2:
 * - Bar chart: bars scale to maxMileage using percentage of TOTAL weekly km (not split hard/easy)
 * - Stats: added "Days to Race" and "Sessions Remaining"
 * - Weekly summaries: expanded wording, session count, delta arrows
 * - Branding: references removed (handled in index.html / CSS)
 */

import {
  focusBadgeClass, formatDate, formatDateFull, daysUntil,
  findTodayIndex, findCurrentWeek, icon,
  getWeekFocus, getWeekFocusLabel, getWeekHardEasy, getWeekSessionCount,
  focusMarkerClass, getDaysToRace, getRemainingSessions, getTotalSessions
} from './components.js';
import store from '../store.js';
import { isStravaConnected, getStravaAthlete, loadStravaSettings } from '../strava.js';

// ===== PACE OPTIONS HELPER =====
function generatePaceOptions(selected) {
  const paces = ['02:30:00','02:40:00','02:50:00','03:00:00','03:10:00','03:20:00',
    '03:30:00','03:40:00','03:50:00','04:00:00','04:10:00','04:20:00','04:30:00'];
  return paces.map(p => `<option value="${p}" ${p===selected?'selected':''}>${p.substring(1)}</option>`).join('');
}

function distanceOptions(selected) {
  const opts = [{v:'5km',l:'5k'},{v:'10km',l:'10k'},{v:'1/2 Marathon',l:'Half Marathon'},{v:'Marathon',l:'Marathon'}];
  return opts.map(o => `<option value="${o.v}" ${o.v===selected?'selected':''}>${o.l}</option>`).join('');
}

// ===== CREATE PLAN — 5-STEP WIZARD =====
export function renderCreateScreen() {
  const s = store.wizardStep;
  const d = store.draft;
  const steps = ['Race','Your Goals','What\'s Possible','Where Are You Now','Retrieve'];
  const races = store.races || [];

  const pips = steps.map((_,i) =>
    `<div class="wizard-pip ${i < s ? 'done' : ''} ${i === s ? 'active' : ''}"></div>`
  ).join('');

  let body = '';
  switch(s) {
    case 0:
      body = `
        <div class="wizard-step-title">Race</div>
        <div class="wizard-step-sub">Which race are you targeting?</div>
        <div class="form-group">
          <label class="form-label">Select a race</label>
          <select class="form-select" id="inp-raceName" onchange="window.onRaceSelect(this.value)">
            <option value="">— Choose a race —</option>
            ${races.map(r => `<option value="${encodeURIComponent(JSON.stringify(r))}" ${r.name===d.raceName?'selected':''}>${r.name} (${r.monthYear||''})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Race date</label>
          <input type="date" class="form-input" id="inp-raceDate" value="${d.raceDate}" min="${new Date().toISOString().split('T')[0]}">
          <p class="form-hint">Auto-filled from race selection, or enter manually</p>
        </div>`;
      break;
    case 1:
      body = `
        <div class="wizard-step-title">Your goals</div>
        <div class="wizard-step-sub">What are you aiming for?</div>
        <div class="form-group">
          <label class="form-label">Race distance</label>
          <select class="form-select" id="inp-raceDistance">${distanceOptions(d.raceDistance)}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Target finish time</label>
          <input type="text" class="form-input" id="inp-targetTime" value="${d.targetTime}" placeholder="hh:mm:ss">
          <p class="form-hint">e.g. 3:30:00 for a marathon</p>
        </div>`;
      break;
    case 2:
      body = `
        <div class="wizard-step-title">What's possible</div>
        <div class="wizard-step-sub">Your weekly training capacity</div>
        <div class="form-group">
          <label class="form-label">Max sessions per week</label>
          <select class="form-select" id="inp-sessions">
            <option value="3" ${d.sessionsPerWeek==3?'selected':''}>3 sessions</option>
            <option value="4" ${d.sessionsPerWeek==4?'selected':''}>4 sessions</option>
            <option value="5" ${d.sessionsPerWeek==5?'selected':''}>5 sessions</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Max weekly km</label>
          <input type="number" class="form-input" id="inp-targetMileage" value="${d.targetMileage}" min="30" max="250">
        </div>`;
      break;
    case 3:
      body = `
        <div class="wizard-step-title">Where are you now</div>
        <div class="wizard-step-sub">Your current fitness level</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Current weekly km</label>
            <input type="number" class="form-input" id="inp-currentMileage" value="${d.currentMileage}" min="5" max="200">
          </div>
          <div class="form-group">
            <label class="form-label">Current PB distance</label>
            <select class="form-select" id="inp-currentPBDistance">${distanceOptions(d.currentPBDistance)}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Current PB pace (per km)</label>
          <select class="form-select" id="inp-currentPace">${generatePaceOptions(d.currentPace)}</select>
          <p class="form-hint">10-minute increments</p>
        </div>
        <div class="form-group">
          <label class="form-label">Training style</label>
          <div class="toggle-group">
            <button class="toggle-option ${d.style==='Endurance'?'active':''}" data-value="Endurance" onclick="window.toggleStyle(this)">Endurance</button>
            <button class="toggle-option ${d.style==='Speed'?'active':''}" data-value="Speed" onclick="window.toggleStyle(this)">Speed</button>
          </div>
        </div>`;
      break;
    case 4:
      body = `
        <div class="wizard-step-title">Retrieve</div>
        <div class="wizard-step-sub">Save or find your plans by email</div>
        <div class="form-group">
          <label class="form-label">Email address</label>
          <input type="email" class="form-input" id="inp-email" value="${d.email}" placeholder="you@example.com">
          <p class="form-hint">Used to save and retrieve your training plans</p>
        </div>
        <button class="btn btn-secondary btn-full" style="margin-bottom:var(--sp-4)" onclick="window.findMyPlans()">
          Find my plans
        </button>
        <div id="found-plans"></div>`;
      break;
  }

  const isLast = s === steps.length - 1;

  return `
    <div class="screen wizard" id="screen-create">
      <div class="wizard-progress">${pips}</div>
      <div class="card">${body}</div>
      <div class="wizard-nav">
        ${s > 0 ? '<button class="btn btn-secondary" onclick="window.wizardBack()">Back</button>' : '<div></div>'}
        ${isLast
          ? '<button class="btn btn-primary" id="btn-generate" onclick="window.generatePlan()">Generate Plan</button>'
          : '<button class="btn btn-primary" onclick="window.wizardNext()">Next</button>'
        }
      </div>
      <div id="generate-error" style="color: var(--c-danger); font-size: var(--fs-sm); margin-top: var(--sp-2); text-align: center; display: none;"></div>
    </div>
  `;
}

// ===== DASHBOARD =====
export function renderDashboard() {
  const plan = store.plan;
  if (!plan) return '<div class="empty-state"><h3>No plan yet</h3></div>';

  const { planMeta, days, weeks } = plan;
  const maxMileage = Math.max(...weeks.map(w => w.totalMileage), 1);

  // Compute stats
  let totalPlanKm = 0, totalHard = 0, totalEasy = 0;
  const weeklyTotals = [];
  weeks.forEach((w, i) => {
    const he = getWeekHardEasy(w);
    totalPlanKm += w.totalMileage;
    totalHard += he.hard;
    totalEasy += he.easy;
    weeklyTotals.push({
      ...he,
      total: w.totalMileage,
      focus: getWeekFocus(w),
      focusLabel: getWeekFocusLabel(getWeekFocus(w)),
      isTaper: w.isTaper,
      sessions: getWeekSessionCount(w)
    });
  });

  const avgIncrease = weeks.length > 1
    ? ((weeks[weeks.length-2].totalMileage - weeks[0].totalMileage) / Math.max(weeks.length-2,1)).toFixed(1)
    : '0';
  const hardPct = totalPlanKm > 0 ? Math.round((totalHard / totalPlanKm) * 100) : 0;
  const daysToRace = getDaysToRace(planMeta);
  const remainingSessions = getRemainingSessions(weeks);
  const totalSessions = getTotalSessions(weeks);

  // ===== STACKED BAR CHART WITH AXES =====
  // Y-axis: compute nice round gridlines
  const rawStep = maxMileage / 4;
  const yStep = rawStep <= 10 ? 10 : rawStep <= 25 ? 25 : rawStep <= 50 ? 50 : 100;
  const yMax = Math.ceil(maxMileage / yStep) * yStep;
  const gridLines = [];
  for (let v = 0; v <= yMax; v += yStep) gridLines.push(v);

  const yGridHtml = gridLines.map(v => {
    const pct = yMax > 0 ? ((yMax - v) / yMax) * 100 : 0;
    return `<div class="chart-gridline" style="top:${pct}%">
      <span class="chart-y-label">${v}</span>
      <div class="chart-gridline-rule"></div>
    </div>`;
  }).join('');

  // Bars — each bar's height is relative to yMax (the rounded ceiling)
  const bars = weeks.map((w, i) => {
    const he = weeklyTotals[i];
    const totalPct = yMax > 0 ? (w.totalMileage / yMax) * 100 : 0;
    const hardRatio = w.totalMileage > 0 ? (he.hard / w.totalMileage) : 0;
    const easyRatio = 1 - hardRatio;
    const hardPctBar = totalPct * hardRatio;
    const easyPctBar = totalPct * easyRatio;

    const isDeload = i > 0 && w.totalMileage < weeks[i-1].totalMileage && !w.isTaper;
    const cls = w.isTaper ? 'taper' : (isDeload ? 'deload' : '');
    const fm = focusMarkerClass(he.focus);
    return `<div class="stacked-bar ${cls}" title="Week ${i+1}: ${Math.round(w.totalMileage)} km" onclick="window.navigate('weekly');window.jumpToWeek(${i})">
      <div class="focus-marker ${fm}"></div>
      <div class="bar-hard" style="height:${hardPctBar}%"></div>
      <div class="bar-easy" style="height:${easyPctBar}%"></div>
    </div>`;
  }).join('');

  // X-axis: show week numbers (every Nth if many weeks)
  const xStep = weeks.length > 24 ? 4 : weeks.length > 16 ? 2 : 1;
  const xLabels = weeks.map((w, i) => {
    const show = (i % xStep === 0) || i === weeks.length - 1;
    return `<div class="chart-x-label">${show ? (i+1) : ''}</div>`;
  }).join('');

  // ===== WEEKLY SUMMARY LIST — grouped by block then focus =====
  const expanded = store.expandedWeek;

  // Helper: render a single week row
  function renderWeekRow(w, i) {
    const he = weeklyTotals[i];
    const focus = he.focus;
    const focusLabel = he.focusLabel;
    const sessCount = he.sessions;
    const isExp = expanded === i;

    const prevMileage = i > 0 ? weeks[i-1].totalMileage : w.totalMileage;
    const delta = w.totalMileage - prevMileage;
    const absDelta = Math.abs(Math.round(delta));
    let deltaHtml = '';
    if (i === 0) {
      deltaHtml = `<span class="wk-delta wk-delta-flat">—</span>`;
    } else if (delta > 0.5) {
      deltaHtml = `<span class="wk-delta wk-delta-up">↑ +${absDelta} km</span>`;
    } else if (delta < -0.5) {
      deltaHtml = `<span class="wk-delta wk-delta-down">↓ -${absDelta} km</span>`;
    } else {
      deltaHtml = `<span class="wk-delta wk-delta-flat">— same</span>`;
    }

    let typeLabel, typeCls;
    if (w.isTaper) { typeLabel = 'Taper'; typeCls = 'wk-type-taper'; }
    else if (i > 0 && w.totalMileage < weeks[i-1].totalMileage) { typeLabel = 'Deload'; typeCls = 'wk-type-deload'; }
    else { typeLabel = 'Build'; typeCls = 'wk-type-build'; }

    let expandHtml = '';
    if (isExp) {
      expandHtml = `<div class="week-expand">
        ${w.days.map(dd => `<div class="week-expand-day">
          <span class="wed">${dd.dayOfWeek.substring(0,3)}</span>
          <span class="badge ${focusBadgeClass(dd.focusArea)}" style="font-size:0.55rem">${dd.focusArea}</span>
          <span style="flex:1;font-size:var(--fs-xs);margin-left:var(--sp-2)">${dd.sessionSummary||''}</span>
          <span style="font-size:var(--fs-xs);color:var(--c-text-dim)">${dd.totalDistance?dd.totalDistance+' km':''}</span>
        </div>`).join('')}
        <button class="btn btn-sm btn-secondary" style="margin-top:var(--sp-2);width:100%" onclick="window.jumpToWeek(${i})">Open week</button>
      </div>`;
    }

    return `<div class="week-summary-row" onclick="window.toggleWeekExpand(${i})">
      <div class="wk-left">
        <span class="wk-num">Week ${i+1}</span>
        <span class="wk-type ${typeCls}">${typeLabel}</span>
      </div>
      <div class="wk-middle">
        <div class="wk-stats-line">
          <span class="wk-stat wk-stat-hard"><b>${Math.round(he.hard)}</b> hard km</span>
          <span class="wk-stat wk-stat-easy"><b>${Math.round(he.easy)}</b> easy km</span>
        </div>
        <div class="wk-stats-line">
          <span class="wk-stat wk-stat-sessions"><b>${sessCount}</b> sessions</span>
          <span class="badge ${focusBadgeClass(focus==='speed'?'Speed':focus==='se'?'Speed Endurance':'Base')}" style="font-size:0.5rem">${focusLabel}</span>
        </div>
      </div>
      <div class="wk-right">
        <span class="wk-km">${Math.round(w.totalMileage)}<span class="wk-km-unit"> km</span></span>
        ${deltaHtml}
      </div>
    </div>${expandHtml}`;
  }

  // Build groups: consecutive weeks with same blockNumber + focus
  const groups = [];
  weeks.forEach((w, i) => {
    const he = weeklyTotals[i];
    const focus = w.isTaper ? 'taper' : he.focus;
    const key = `b${w.blockNumber}-${focus}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.indices.push(i);
    } else {
      const focusLabel = w.isTaper ? 'Taper' : he.focusLabel;
      const badgeCls = w.isTaper ? 'badge-taper'
        : focus === 'speed' ? 'badge-speed'
        : focus === 'se' ? 'badge-se'
        : 'badge-base';
      groups.push({ key, blockNum: w.blockNumber, focusLabel, badgeCls, isTaper: w.isTaper, indices: [i] });
    }
  });

  // Render groups
  const weekRows = groups.map(grp => {
    const isOpen = !store.collapsedGroups.has(grp.key);

    // Aggregate stats
    let grpKm = 0, grpHard = 0, grpEasy = 0, grpSessions = 0;
    grp.indices.forEach(i => {
      grpKm += weeks[i].totalMileage;
      grpHard += weeklyTotals[i].hard;
      grpEasy += weeklyTotals[i].easy;
      grpSessions += weeklyTotals[i].sessions;
    });
    const wkCount = grp.indices.length;
    const avgKm = Math.round(grpKm / wkCount);
    const avgHard = Math.round(grpHard / wkCount);
    const avgEasy = Math.round(grpEasy / wkCount);

    const innerRows = isOpen ? grp.indices.map(i => renderWeekRow(weeks[i], i)).join('') : '';

    return `<div class="week-group-header ${isOpen ? 'open' : ''}" onclick="window.toggleGroupExpand('${grp.key}')">
      <div class="wgh-left">
        <svg class="wgh-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="${isOpen ? '18,15 12,9 6,15' : '6,9 12,15 18,9'}"/></svg>
        <div>
          <div class="wgh-title">Block ${grp.blockNum} <span class="badge ${grp.badgeCls}" style="font-size:0.5rem;vertical-align:middle">${grp.focusLabel}</span></div>
          <div class="wgh-sub">${wkCount} week${wkCount > 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="wgh-stats">
        <div class="wgh-stat">
          <span class="wgh-stat-val">${Math.round(grpKm)}</span>
          <span class="wgh-stat-lbl">total km</span>
        </div>
        <div class="wgh-stat">
          <span class="wgh-stat-val">${avgKm}</span>
          <span class="wgh-stat-lbl">avg km/wk</span>
        </div>
        <div class="wgh-stat">
          <span class="wgh-stat-val">${avgHard}/${avgEasy}</span>
          <span class="wgh-stat-lbl">hard/easy</span>
        </div>
        <div class="wgh-stat">
          <span class="wgh-stat-val">${grpSessions}</span>
          <span class="wgh-stat-lbl">sessions</span>
        </div>
      </div>
    </div>${innerRows}`;
  }).join('');

  return `
    <div class="screen" id="screen-dashboard">
      <div class="card chart-card">
        <div class="card-subtitle">Weekly mileage <span style="color:var(--c-text-dim);font-size:var(--fs-xs)">(km)</span></div>
        <div class="chart-wrapper">
          <div class="chart-area">
            ${yGridHtml}
            <div class="stacked-chart">${bars}</div>
          </div>
        </div>
        <div class="chart-x-axis">${xLabels}</div>
        <div class="chart-x-title">Week</div>
        <div class="chart-legend">
          <span><span class="chart-legend-dot" style="background:var(--c-accent)"></span>Hard</span>
          <span><span class="chart-legend-dot" style="background:#a8c490"></span>Easy</span>
          <span><span class="chart-legend-dot" style="background:var(--c-taper);opacity:0.7"></span>Taper</span>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">${daysToRace}</div>
          <div class="stat-label">Days to Race</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Math.round(totalPlanKm)}</div>
          <div class="stat-label">Total km</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${hardPct}%</div>
          <div class="stat-label">Hard</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">${totalSessions}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${remainingSessions}</div>
          <div class="stat-label">Sessions Left</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">+${avgIncrease}</div>
          <div class="stat-label">km/wk avg</div>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:var(--sp-4) var(--sp-4) var(--sp-2)">
          <div class="card-subtitle">Weeks by block &amp; focus</div>
        </div>
        ${weekRows}
      </div>
    </div>
  `;
}

// ===== WEEKLY VIEW =====
export function renderWeeklyView() {
  const plan = store.plan;
  if (!plan) return '';
  const { days, weeks } = plan;
  const weekIdx = store.selectedWeek;
  const week = weeks[weekIdx];
  if (!week) return '';
  const maxMileage = Math.max(...weeks.map(w => w.totalMileage), 1);
  const progress = (week.totalMileage / maxMileage) * 100;
  const todayStr = new Date().toISOString().split('T')[0];
  const sessCount = getWeekSessionCount(week);

  return `
    <div class="screen" id="screen-weekly">
      <div class="week-nav">
        <button onclick="window.prevWeek()" ${weekIdx===0?'disabled':''}>${icon('chevronLeft')}</button>
        <span class="week-label">Week ${weekIdx+1} of ${weeks.length}</span>
        <button onclick="window.nextWeek()" ${weekIdx>=weeks.length-1?'disabled':''}>${icon('chevronRight')}</button>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2);font-size:var(--fs-sm);color:var(--c-text-muted)">
        <span>Block ${week.blockNumber}${week.isTaper?' (Taper)':''} — ${sessCount} sessions</span>
        <span>${Math.round(week.totalMileage)} km</span>
      </div>
      <div class="week-mileage-bar"><div class="week-mileage-fill" style="width:${progress}%"></div></div>
      ${week.days.map(d => {
        const globalIdx = days.indexOf(d);
        const isComplete = store.isCompleted(globalIdx);
        const isRest = d.isRest || d.focusArea === 'Rest';
        const isToday = d.dateStr === todayStr;
        return `
          <div class="day-tile ${isComplete?'completed':''} ${isToday?'is-today':''}"
               onclick="window.openDay(${globalIdx})" style="${isRest?'opacity:0.55':''}">
            <div class="day-tile-left">
              <div class="day-name">${d.dayOfWeek.substring(0,3)}</div>
              <div class="day-date">${formatDate(d.dateStr)}</div>
            </div>
            <div class="day-tile-right">
              <span class="badge ${focusBadgeClass(d.focusArea)}" style="font-size:0.6rem">${d.focusArea}</span>
              <div class="session-line">${d.sessionSummary||d.focusArea}${d.totalDistance?' — '+d.totalDistance+' km':''}</div>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Rep visualisation helpers
// ---------------------------------------------------------------------------

/**
 * parseRecoveries — convert recoveries string into a Map<repDistanceMeters, recoverySeconds>
 * Handles patterns like:
 *   "90 seconds for 600s, 60 seconds for 400s, 30 seconds for 200s"
 *   "90 seconds for 600/500s, 60 seconds for 400/300s, 30 seconds for 200s"
 */
function parseRecoveries(recoveryStr) {
  const map = new Map();
  if (!recoveryStr || recoveryStr === 'N/A') return map;
  const parts = recoveryStr.split(',');
  for (const part of parts) {
    const m = part.trim().match(/(\d+)\s*seconds?\s+for\s+([\d/]+)s/i);
    if (!m) continue;
    const secs      = parseInt(m[1], 10);
    const distances = m[2].split('/').map(Number);
    distances.forEach(d => map.set(d, secs));
  }
  return map;
}

/**
 * renderRepVisualization — render a horizontal-bar rep chart
 * Bar length ∝ rep distance; gaps represent recovery time.
 */
function renderRepVisualization(reps, recoveries) {
  if (!reps || reps.length === 0) return '';

  const recovMap = parseRecoveries(recoveries);
  const maxDist  = Math.max(...reps);

  const bars = reps.map((dist, idx) => {
    const pct     = maxDist > 0 ? (dist / maxDist) * 100 : 100;
    const label   = `Rep ${idx + 1} – ${dist}m`;
    const recov   = recovMap.get(dist);
    const recovLabel = recov ? `${recov}s recovery` : null;

    const gap = idx < reps.length - 1 && recovLabel
      ? `<div class="rep-gap" role="presentation" aria-label="${recovLabel}">
           <span class="rep-gap-label">${recovLabel}</span>
         </div>`
      : (idx < reps.length - 1 ? '<div class="rep-gap rep-gap-unlabelled"></div>' : '');

    return `
      <div class="rep-bar-wrap">
        <div class="rep-bar" style="width:${pct}%" role="img" aria-label="${label}">
          <span class="rep-bar-label">${label}</span>
        </div>
      </div>
      ${gap}`;
  }).join('');

  return `
    <div class="detail-section">
      <div class="detail-section-title">Rep Visualisation</div>
      <div class="rep-chart" aria-label="Rep distances chart">
        ${bars}
      </div>
    </div>`;
}

// ===== DAY DETAIL =====
export function renderDayDetail() {
  const plan = store.plan;
  const dayIdx = store.selectedDay;
  if (!plan || dayIdx == null) return '';
  const day = plan.days[dayIdx];
  if (!day) return '';
  const isComplete = store.isCompleted(dayIdx);

  const hasReps = Array.isArray(day.reps) && day.reps.length > 0;

  return `
    <div class="screen day-detail" id="screen-day">
      <button class="back-btn" onclick="window.goBack()">${icon('back')} Back</button>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-1)">${day.dayOfWeek}</h2>
      <p style="color:var(--c-text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-5)">${formatDateFull(day.dateStr)}</p>
      <span class="badge ${focusBadgeClass(day.focusArea)}" style="font-size:var(--fs-sm);margin-bottom:var(--sp-5);display:inline-flex">${day.focusArea}</span>

      ${day.block ? `<div class="detail-section">
        <div class="detail-section-title">Block</div>
        <div class="detail-description">${day.block}</div>
      </div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">Summary</div>
        <div class="session-summary" style="font-size:var(--fs-lg);margin-bottom:var(--sp-2)">${day.sessionSummary||day.focusArea}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Details</div>
        <div class="detail-description">${day.sessionDescription||''}</div>
      </div>

      ${day.totalDistance?`<div class="warmup-grid">
        <div class="warmup-item"><div class="label">Warm Up</div><div class="value">${day.warmUp||0} km</div></div>
        <div class="warmup-item"><div class="label">Main</div><div class="value">${day.totalDistance} km</div></div>
        <div class="warmup-item"><div class="label">Warm Down</div><div class="value">${day.warmDown||0} km</div></div>
      </div>`:''}

      ${hasReps ? renderRepVisualization(day.reps, day.recoveries) : ''}

      ${day.recoveries && day.recoveries !== 'N/A' ? `
        <div class="detail-section">
          <div class="detail-section-title">Recoveries</div>
          <div class="detail-description">${day.recoveries}</div>
        </div>` : ''}

      ${day.stimulus ? `<div class="detail-section">
        <div class="detail-section-title">Stimulus</div>
        <div class="detail-description">${day.stimulus}</div>
      </div>` : ''}

      ${day.paces?`<div class="detail-section"><div class="detail-section-title">Pace Guidance</div><div class="pace-block">${day.paces}</div></div>`:''}

      <button class="complete-toggle ${isComplete?'done':''}" onclick="window.toggleComplete(${dayIdx})">
        <div class="check">${isComplete?icon('check'):''}</div>
        <span>${isComplete?'Completed':'Mark as Complete'}</span>
      </button>
    </div>
  `;
}

// ===== SETTINGS =====
export function renderSettings() {
  const connected = isStravaConnected();
  const athlete = getStravaAthlete();
  const stravaSettings = loadStravaSettings();

  const stravaCard = `
    <div class="card" style="margin-top:var(--sp-6)">
      <div class="card-title">Strava</div>
      ${connected ? `
        <div style="font-size:var(--fs-sm);color:var(--c-text-muted);margin-bottom:var(--sp-4)">
          Connected as <strong style="color:var(--c-text)">${athlete.firstname} ${athlete.lastname}</strong>
        </div>
        <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="window.stravaSync()">Sync Activities</button>
          <button class="btn btn-sm btn-secondary" onclick="window.stravaDisconnect()">Disconnect</button>
        </div>
        <div id="strava-sync-status" style="margin-top:var(--sp-3);font-size:var(--fs-sm);color:var(--c-text-muted)"></div>
      ` : `
        <p style="font-size:var(--fs-sm);color:var(--c-text-muted);margin-bottom:var(--sp-4)">
          Connect Strava to automatically mark sessions complete when you log a run.
        </p>
        <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-4)">
          <div>
            <label style="font-size:var(--fs-sm);font-weight:var(--fw-semibold);display:block;margin-bottom:var(--sp-1)">Client ID</label>
            <input id="strava-client-id" type="text" class="input" placeholder="From strava.com/settings/api"
              value="${stravaSettings.clientId || ''}" style="width:100%">
          </div>
          <div>
            <label style="font-size:var(--fs-sm);font-weight:var(--fw-semibold);display:block;margin-bottom:var(--sp-1)">Client Secret</label>
            <input id="strava-client-secret" type="password" class="input" placeholder="From strava.com/settings/api"
              value="${stravaSettings.clientSecret || ''}" style="width:100%">
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="window.stravaConnect()">Connect with Strava</button>
      `}
    </div>
  `;

  return `
    <div class="screen" id="screen-settings">
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-6)">Settings</h2>
      <div class="settings-item"><span>Export Plan (JSON)</span><button class="btn btn-sm btn-secondary" onclick="window.exportPlan()">Export</button></div>
      <div class="settings-item"><span>Import Plan</span><button class="btn btn-sm btn-secondary" onclick="document.getElementById('import-file').click()">Import</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="window.importPlan(event)"></div>
      <div class="settings-item" style="border-color:var(--c-danger)"><span style="color:var(--c-danger)">Reset Plan</span>
        <button class="btn btn-sm" style="background:var(--c-danger);color:white" onclick="window.resetPlan()">Reset</button></div>
      ${stravaCard}
      ${store.plan?`<div class="card" style="margin-top:var(--sp-6)"><div class="card-title">Plan Info</div>
        <div style="font-size:var(--fs-sm);color:var(--c-text-muted);line-height:2">
          Race: ${store.plan.planMeta.raceDate}<br>
          Blocks: ${store.plan.planMeta.planBlockCount} x ${store.plan.planMeta.planBlockLength} weeks<br>
          Style: ${store.plan.planMeta.style}<br>
          Growth: ${(store.plan.planMeta.growthRate*100).toFixed(1)}% / week<br>
          Generated: ${new Date(store.plan.planMeta.generatedAt).toLocaleDateString()}
        </div></div>${renderDebugPanel()}`:''}
    </div>
  `;
}

function renderDebugPanel() {
  const plan = store.plan;
  if (!plan) return '';
  const debugDays = plan.days.filter(d => d._debug).slice(0, 30);
  return `
    <details class="debug-panel"><summary>Debug Panel</summary>
      <div style="overflow-x:auto;margin-top:var(--sp-3)"><table class="debug-table">
        <tr><th>Day</th><th>Wk</th><th>Blk</th><th>Focus</th><th>Wkly km</th><th>Int.</th><th>Base</th><th>LR</th><th>S#</th><th>G</th><th>Pace</th></tr>
        ${debugDays.map(d=>`<tr><td>${d.dayCount}</td><td>${d._debug.weekCount}</td><td>${d._debug.blockCount}</td><td>${d.focusArea}</td><td>${d._debug.totalWeeklyMileage}</td><td>${d._debug.intensityMileage}</td><td>${d._debug.baseMileage}</td><td>${d._debug.longRunMileage}</td><td>${d._debug.sessionsCount}</td><td>${d._debug.G}</td><td>${d._debug.paceIndex}</td></tr>`).join('')}
      </table></div></details>
  `;
}
