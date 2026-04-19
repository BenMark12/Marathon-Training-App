/**
 * app.js — Main application bootstrap (Forclaz v2)
 * Wizard navigation, race loading, email retrieval, routing
 */

import store from './store.js';
import { generateTrainingPlan } from '../engine/planGenerator.js';
import { renderCreateScreen, renderDashboard, renderWeeklyView, renderDayDetail, renderSettings } from './ui/renderers.js';
import { findCurrentWeek, icon } from './ui/components.js';
import { handleStravaCallback, stravaConnect as _stravaConnect, saveStravaCredentials, disconnectStrava, syncActivitiesToPlan } from './strava.js';

const $app = document.getElementById('app');
const $nav = document.getElementById('bottom-nav');

let dataStore = null;

// ===== DATA LOADING =====
async function loadData() {
  try {
    const [sessResp, paceResp, confResp] = await Promise.all([
      fetch('./data/sessionTemplates.json'),
      fetch('./data/paceTables.json'),
      fetch('./data/config.json')
    ]);
    const sessionTemplates = await sessResp.json();
    const paceTables = await paceResp.json();
    const config = await confResp.json();
    dataStore = { sessionTemplates, paceTables, config };
    store.dataStore = dataStore;
    return true;
  } catch (e) {
    console.error('Failed to load data:', e);
    return false;
  }
}

async function loadRaces() {
  try {
    const resp = await fetch('./data/races.json');
    store.races = await resp.json();
  } catch (e) {
    console.warn('Failed to load races:', e);
    store.races = [];
  }
}

// ===== RENDERING =====
function render() {
  let html = '';
  switch (store.currentView) {
    case 'create': html = renderCreateScreen(); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'weekly': html = renderWeeklyView(); break;
    case 'day': html = renderDayDetail(); break;
    case 'settings': html = renderSettings(); break;
    default: html = renderCreateScreen();
  }
  $app.innerHTML = html;
  updateNav();
}

function updateNav() {
  if (!store.plan) {
    $nav.style.display = 'none';
    return;
  }
  $nav.style.display = 'flex';
  const tabs = ['dashboard', 'weekly', 'settings'];
  const labels = ['Home', 'Weeks', 'Settings'];
  const icons = ['home', 'calendar', 'settings'];
  $nav.innerHTML = tabs.map((tab, i) => `
    <button class="${store.currentView === tab ? 'active' : ''}" onclick="window.navigate('${tab}')">
      ${icon(icons[i])}
      <span>${labels[i]}</span>
    </button>
  `).join('');
}

// ===== NAVIGATION =====
window.navigate = function(view) {
  store.currentView = view;
  if (view === 'weekly' && store.plan) {
    store.selectedWeek = findCurrentWeek(store.plan.weeks);
  }
  render();
};

window.goBack = function() {
  if (store.currentView === 'day') {
    store.currentView = 'weekly';
    store.selectedDay = null;
  } else {
    store.currentView = 'dashboard';
  }
  render();
};

// ===== WIZARD — SYNC DRAFT FROM DOM =====
function syncDraftFromDOM() {
  const s = store.wizardStep;
  const d = store.draft;
  switch (s) {
    case 0: {
      const dateEl = document.getElementById('inp-raceDate');
      if (dateEl) d.raceDate = dateEl.value;
      break;
    }
    case 1: {
      const distEl = document.getElementById('inp-raceDistance');
      const timeEl = document.getElementById('inp-targetTime');
      if (distEl) d.raceDistance = distEl.value;
      if (timeEl) d.targetTime = timeEl.value;
      break;
    }
    case 2: {
      const sessEl = document.getElementById('inp-sessions');
      const targEl = document.getElementById('inp-targetMileage');
      if (sessEl) d.sessionsPerWeek = parseInt(sessEl.value);
      if (targEl) d.targetMileage = parseFloat(targEl.value);
      break;
    }
    case 3: {
      const curEl = document.getElementById('inp-currentMileage');
      const pbDistEl = document.getElementById('inp-currentPBDistance');
      const paceEl = document.getElementById('inp-currentPace');
      const styleEl = document.querySelector('.toggle-option.active');
      if (curEl) d.currentMileage = parseFloat(curEl.value);
      if (pbDistEl) d.currentPBDistance = pbDistEl.value;
      if (paceEl) d.currentPace = paceEl.value;
      if (styleEl) d.style = styleEl.dataset.value;
      break;
    }
    case 4: {
      const emailEl = document.getElementById('inp-email');
      if (emailEl) d.email = emailEl.value.trim();
      break;
    }
  }
}

window.wizardNext = function() {
  syncDraftFromDOM();
  // Validate current step
  const d = store.draft;
  const errEl = document.getElementById('generate-error');
  if (errEl) errEl.style.display = 'none';

  if (store.wizardStep === 0 && !d.raceDate) {
    showError('Please select or enter a race date');
    return;
  }
  if (store.wizardStep === 2) {
    if (d.targetMileage < 20) { showError('Target mileage too low'); return; }
  }
  if (store.wizardStep === 3) {
    if (d.currentMileage < 5) { showError('Current mileage too low'); return; }
    if (d.targetMileage < d.currentMileage) { showError('Target mileage must be >= current'); return; }
  }

  store.wizardStep = Math.min(store.wizardStep + 1, 4);
  render();
};

window.wizardBack = function() {
  syncDraftFromDOM();
  store.wizardStep = Math.max(store.wizardStep - 1, 0);
  render();
};

function showError(msg) {
  const errEl = document.getElementById('generate-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

// ===== RACE SELECTION =====
window.onRaceSelect = function(encodedVal) {
  if (!encodedVal) return;
  try {
    const race = JSON.parse(decodeURIComponent(encodedVal));
    store.draft.raceName = race.name || '';
    if (race.date) {
      store.draft.raceDate = race.date;
      const dateEl = document.getElementById('inp-raceDate');
      if (dateEl) dateEl.value = race.date;
    } else {
      // TBC — show modal
      showTBCModal();
    }
  } catch (e) {
    console.warn('Race parse error:', e);
  }
};

function showTBCModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <p style="font-weight:var(--fw-semibold);color:var(--c-text);margin-bottom:var(--sp-2)">No date available</p>
      <p>Please input the race date manually</p>
      <button class="btn btn-primary btn-full" onclick="this.closest('.modal-overlay').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

window.toggleStyle = function(el) {
  document.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  store.draft.style = el.dataset.value;
};

// ===== PLAN RETRIEVAL BY EMAIL =====
window.findMyPlans = function() {
  syncDraftFromDOM();
  const email = store.draft.email;
  const container = document.getElementById('found-plans');
  if (!container) return;

  if (!email || !email.includes('@')) {
    container.innerHTML = '<p style="color:var(--c-danger);font-size:var(--fs-sm)">Please enter a valid email address</p>';
    return;
  }

  const plans = store.getPlansForEmail(email);
  if (plans.length === 0) {
    container.innerHTML = '<p style="color:var(--c-text-muted);font-size:var(--fs-sm)">No plans found for this email</p>';
    return;
  }

  container.innerHTML = plans.map(p => `
    <div class="plan-list-item" onclick="window.loadSavedPlan('${p.planId}')">
      <div>
        <div class="plan-info">${p.raceName || p.distance || 'Training Plan'}</div>
        <div class="plan-date">${p.raceDate || ''} — created ${new Date(p.createdAt).toLocaleDateString()}</div>
      </div>
      ${icon('chevronRight')}
    </div>
  `).join('');
};

window.loadSavedPlan = function(planId) {
  if (store.loadPlanById(planId)) {
    store.currentView = 'dashboard';
    render();
  }
};

// ===== GENERATE PLAN =====
window.generatePlan = async function() {
  syncDraftFromDOM();
  const btn = document.getElementById('btn-generate');
  const errEl = document.getElementById('generate-error');

  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  if (errEl) errEl.style.display = 'none';

  try {
    if (!dataStore) {
      const loaded = await loadData();
      if (!loaded) throw new Error('Failed to load training data');
    }

    const d = store.draft;
    if (!d.raceDate) throw new Error('Please select a race date');
    if (d.targetMileage < d.currentMileage) throw new Error('Target mileage must be >= current');

    // Map draft → engine input
    // Convert target time to pace if provided
    let targetPace = d.currentPace;
    if (d.targetTime) {
      // Use target time as-is for pace if it looks like a pace (under 10 mins)
      // Otherwise treat as finish time and derive pace
      const parts = d.targetTime.split(':').map(Number);
      if (parts.length >= 2) {
        const totalSecs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        // Derive per-km pace from finish time
        let distKm = 42.195;
        if (d.raceDistance === '1/2 Marathon') distKm = 21.0975;
        else if (d.raceDistance === '10km') distKm = 10;
        else if (d.raceDistance === '5km') distKm = 5;
        const pacePerKmSecs = totalSecs / distKm;
        const paceMins = Math.floor(pacePerKmSecs / 60);
        // Round to nearest 10-min marathon bracket
        const marathonSecs = pacePerKmSecs * 42.195;
        const marathonHrs = marathonSecs / 3600;
        const roundedMins = Math.round(marathonHrs * 6) * 10; // nearest 10 min
        const h = Math.floor(roundedMins / 60);
        const m = roundedMins % 60;
        targetPace = `0${h}:${String(m).padStart(2,'0')}:00`;
        // Clamp to valid range
        const validPaces = ['02:30:00','02:40:00','02:50:00','03:00:00','03:10:00','03:20:00',
          '03:30:00','03:40:00','03:50:00','04:00:00','04:10:00','04:20:00','04:30:00'];
        if (!validPaces.includes(targetPace)) {
          if (marathonHrs < 2.5) targetPace = '02:30:00';
          else if (marathonHrs > 4.5) targetPace = '04:30:00';
          else targetPace = d.currentPace;
        }
      }
    }

    const input = {
      raceDate: d.raceDate,
      sessionsPerWeek: d.sessionsPerWeek,
      currentMileage: d.currentMileage,
      targetMileage: d.targetMileage,
      raceDistance: d.raceDistance === '5km' ? '5km' : d.raceDistance === '10km' ? '10km' : d.raceDistance,
      currentPace: d.currentPace,
      targetPace: targetPace,
      style: d.style
    };

    const plan = generateTrainingPlan(input, dataStore);
    store.savePlan(plan, d.email, d.raceName);
    store.currentView = 'dashboard';
    store.resetDraft();
    render();

  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Plan'; }
  }
};

// ===== WEEK NAVIGATION =====
window.prevWeek = function() {
  if (store.selectedWeek > 0) { store.selectedWeek--; render(); }
};

window.nextWeek = function() {
  if (store.plan && store.selectedWeek < store.plan.weeks.length - 1) {
    store.selectedWeek++; render();
  }
};

window.jumpToWeek = function(weekIdx) {
  store.selectedWeek = weekIdx;
  store.currentView = 'weekly';
  render();
  window.scrollTo(0, 0);
};

window.toggleWeekExpand = function(weekIdx) {
  store.expandedWeek = store.expandedWeek === weekIdx ? null : weekIdx;
  render();
};

window.toggleGroupExpand = function(groupKey) {
  if (store.collapsedGroups.has(groupKey)) {
    store.collapsedGroups.delete(groupKey);
  } else {
    store.collapsedGroups.add(groupKey);
  }
  render();
};

// ===== DAY DETAIL =====
window.openDay = function(dayIdx) {
  store.selectedDay = dayIdx;
  store.currentView = 'day';
  render();
  window.scrollTo(0, 0);
};

window.toggleComplete = function(dayIdx) {
  store.toggleCompletion(dayIdx);
  render();
};

// ===== SETTINGS ACTIONS =====
window.exportPlan = function() {
  const json = store.exportPlan();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'runna-training-plan.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.importPlan = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const success = store.importPlan(e.target.result);
    if (success) { store.currentView = 'dashboard'; render(); }
    else { alert('Import failed. Please check the file format.'); }
  };
  reader.readAsText(file);
};

window.resetPlan = function() {
  if (confirm('Are you sure? This will delete your current plan and completion data.')) {
    store.clearPlan();
    store.resetDraft();
    store.currentView = 'create';
    render();
  }
};

// ===== STRAVA =====
window.stravaConnect = function() {
  const clientId = document.getElementById('strava-client-id')?.value.trim();
  const clientSecret = document.getElementById('strava-client-secret')?.value.trim();
  if (clientId && clientSecret) saveStravaCredentials(clientId, clientSecret);
  _stravaConnect();
};

window.stravaDisconnect = function() {
  if (confirm('Disconnect Strava? Your completed sessions will remain.')) {
    disconnectStrava();
    render();
  }
};

window.stravaSync = async function() {
  const statusEl = document.getElementById('strava-sync-status');
  if (statusEl) statusEl.textContent = 'Syncing...';
  try {
    const newMatches = await syncActivitiesToPlan(store.plan, store.completions, store.toggleCompletion.bind(store));
    render();
    const el = document.getElementById('strava-sync-status');
    if (el) el.textContent = newMatches > 0 ? `${newMatches} session${newMatches > 1 ? 's' : ''} marked complete.` : 'All up to date.';
  } catch(e) {
    const el = document.getElementById('strava-sync-status');
    if (el) el.textContent = `Sync failed: ${e.message}`;
  }
};

// ===== INIT =====
async function init() {
  store.init();

  // Handle Strava OAuth redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code') && urlParams.get('scope')?.includes('activity')) {
    try {
      await handleStravaCallback(urlParams.get('code'));
      window.history.replaceState({}, '', window.location.pathname);
      store.currentView = 'settings';
    } catch(e) {
      console.error('Strava auth failed:', e);
    }
  }

  await Promise.all([loadData(), loadRaces()]);
  render();
}

init();
