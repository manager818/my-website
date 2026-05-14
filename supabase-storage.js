/**
 * ════════════════════════════════════════════════════════
 *  AIL OPERATIONS MANAGEMENT — Supabase Cloud Storage Layer
 *  supabase-storage.js  v2 — Fixed Wiring Planner sync
 * ════════════════════════════════════════════════════════
 */

const SB_CFG_KEY = 'ail_supabase_cfg_v1';
let _sb = null;
let _clSyncedCount = 0;

// ── CONFIG ───────────────────────────────────────────────
function getSBConfig() {
  try { return JSON.parse(localStorage.getItem(SB_CFG_KEY)) || {}; }
  catch { return {}; }
}
function setSBConfig(url, key) {
  localStorage.setItem(SB_CFG_KEY, JSON.stringify({ url, key }));
}
function initSupabase() {
  const cfg = getSBConfig();
  if (!cfg.url || !cfg.key) { _updateCloudBadge(false); return false; }
  try {
    _sb = window.supabase.createClient(cfg.url, cfg.key);
    _updateCloudBadge(true);
    return true;
  } catch (e) { _updateCloudBadge(false); return false; }
}

// ── INJECT UI ────────────────────────────────────────────
(function _injectUI() {
  const modal = document.createElement('div');
  modal.id = 'sb-modal-overlay';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="width:500px;max-width:95vw;">
      <div class="modal-head">
        <h3>☁ Supabase Cloud Setup</h3>
        <button class="modal-close" id="sb-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:12px;color:#7A7A8A;margin-bottom:14px;line-height:1.6;">
          Paste your credentials from
          <strong>supabase.com → Project → Settings → API Keys</strong>
        </p>
        <div style="margin-bottom:11px;">
          <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;
            letter-spacing:.05em;margin-bottom:4px;">Project URL</label>
          <input id="sb-url" type="text" placeholder="https://xxxxxxxxxxxx.supabase.co"
            style="width:100%;font-size:13px;padding:9px 12px;border-radius:7px;
            border:1.5px solid #E0C8D8;outline:none;font-family:Inter,sans-serif;">
        </div>
        <div style="margin-bottom:11px;">
          <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;
            letter-spacing:.05em;margin-bottom:4px;">Publishable / Anon Key</label>
          <input id="sb-key" type="text" placeholder="sb_publishable_... or eyJhbGci..."
            style="width:100%;font-size:13px;padding:9px 12px;border-radius:7px;
            border:1.5px solid #E0C8D8;outline:none;font-family:Inter,sans-serif;">
        </div>
        <div style="background:#FFF5FC;border:1px solid #F0C0E0;border-radius:6px;
          padding:9px 12px;font-size:11px;color:#7A7A8A;line-height:1.6;">
          ⚠ Make sure you ran the SQL from SUPABASE_SETUP.md in Supabase SQL Editor first.
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button id="sb-cancel" style="background:transparent;border:1.5px solid #EADDF0;
            color:#7A7A8A;border-radius:7px;padding:8px 16px;font-size:13px;cursor:pointer;">
            Cancel</button>
          <button id="sb-save" style="background:linear-gradient(135deg,#E020A0,#C8189A);
            color:#fff;border:none;border-radius:7px;padding:8px 20px;font-size:14px;
            font-weight:700;cursor:pointer;font-family:'Rajdhani',sans-serif;">
            ☁ Save &amp; Connect</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Cloud Config button in header bar
  const subtitle = document.querySelector('.header-subtitle');
  if (subtitle) {
    const btn = document.createElement('button');
    btn.innerHTML = '☁ Cloud Config';
    btn.style.cssText = `margin-left:auto;background:transparent;
      border:1.5px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.75);
      border-radius:5px;padding:3px 11px;font-size:11px;font-weight:600;cursor:pointer;`;
    btn.onclick = openSBConfig;
    subtitle.appendChild(btn);
  }

  // Status label
  const storageBar = document.querySelector('.storage-bar');
  if (storageBar) {
    const lbl = document.createElement('span');
    lbl.id = 'sb-status-label';
    lbl.textContent = 'Saved Locally';
    storageBar.appendChild(lbl);
  }

  document.getElementById('sb-modal-close').onclick = closeSBConfig;
  document.getElementById('sb-cancel').onclick      = closeSBConfig;
  modal.addEventListener('click', e => { if (e.target === modal) closeSBConfig(); });

  document.getElementById('sb-save').onclick = async () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (!url || !key) { showToast('⚠ Enter both URL and Key'); return; }
    setSBConfig(url, key);
    closeSBConfig();
    if (initSupabase()) {
      showToast('☁ Connected — syncing cloud data…');
      await loadFromSupabase();
      refreshAll(true);
    } else {
      showToast('⚠ Could not connect — check credentials');
    }
  };
})();

function openSBConfig() {
  const cfg = getSBConfig();
  document.getElementById('sb-url').value = cfg.url || '';
  document.getElementById('sb-key').value = cfg.key || '';
  document.getElementById('sb-modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('sb-url').focus(), 80);
}
function closeSBConfig() {
  document.getElementById('sb-modal-overlay').classList.remove('open');
}
function _updateCloudBadge(ok) {
  const dot = document.querySelector('.storage-dot');
  const lbl = document.getElementById('sb-status-label');
  if (dot) dot.style.background = ok ? '#1E9B6B' : '#E020A0';
  if (lbl) lbl.textContent = ok ? 'Cloud Synced ✓' : 'Saved Locally';
}

// ════════════════════════════════════════════════════════
//  OVERRIDE saveData — localStorage + Supabase
// ════════════════════════════════════════════════════════
function saveData() {
  // localStorage — instant save
  try {
    localStorage.setItem('ail_projects_v1',     JSON.stringify(projects));
    localStorage.setItem('ail_changelog_v1',    JSON.stringify(changelog));
    localStorage.setItem('ail_salespersons_v1', JSON.stringify(salespersons));
    localStorage.setItem('ail_customers_v1',    JSON.stringify(customers));
    localStorage.setItem('ail_wiring_persons',  JSON.stringify(wiringPersons));
    localStorage.setItem('ail_wiring_assign',   JSON.stringify(wiringAssign));
  } catch (e) { console.warn('[localStorage] save failed:', e); }

  // Supabase — background sync
  if (_sb) _syncAll().catch(e => console.warn('[Supabase] sync error:', e));
}

// ════════════════════════════════════════════════════════
//  SYNC ALL DATA TO SUPABASE
// ════════════════════════════════════════════════════════
async function _syncAll() {
  if (!_sb) return;
  await Promise.all([
    _syncLists(),
    _syncProjects(),
    _syncWiringAssign(),
    _syncChangelog(),
  ]);
  _updateCloudBadge(true);
}

// ── Lists (salespersons, customers, wiring team) ─────────
async function _syncLists() {
  const now = new Date().toISOString();
  const { error } = await _sb.from('ail_lists').upsert([
    { key: 'salespersons',   value: salespersons,  updated_at: now },
    { key: 'customers',      value: customers,     updated_at: now },
    { key: 'wiring_persons', value: wiringPersons, updated_at: now },
  ], { onConflict: 'key' });
  if (error) console.warn('[Supabase] lists sync error:', error.message);
}

// ── Projects ─────────────────────────────────────────────
async function _syncProjects() {
  if (!projects.length) return;
  const rows = projects.map(p => ({
    no: p.no, customer: p.customer || '', type: p.type || '',
    priority: p.priority || 'Medium', salesperson: p.salesperson || '',
    engineering: p.engineering, purchase: p.purchase, fabrication: p.fabrication,
    wiring: p.wiring, testing: p.testing, dispatch: p.dispatch,
  }));
  const { error } = await _sb.from('ail_projects').upsert(rows, { onConflict: 'no' });
  if (error) console.warn('[Supabase] projects sync error:', error.message);
}

// ── Wiring Assign — upsert row by row for reliability ────
async function _syncWiringAssign() {
  const entries = Object.entries(wiringAssign);
  if (!entries.length) return;
  const now = new Date().toISOString();
  for (const [projNo, a] of entries) {
    const row = {
      project_no: projNo,
      person:     a.person    || '',
      start_date: a.startDate || '',
      end_date:   a.endDate   || '',
      note:       a.note      || '',
      updated_at: now,
    };
    const { error } = await _sb
      .from('ail_wiring_assign')
      .upsert(row, { onConflict: 'project_no' });
    if (error) console.warn('[Supabase] wiring_assign error:', error.message, 'row:', row);
  }
}

// ── Changelog — insert only NEW entries ──────────────────
async function _syncChangelog() {
  const newCount = changelog.length - _clSyncedCount;
  if (newCount <= 0) return;
  const rows = changelog.slice(0, newCount).map(c => ({
    time: c.time || '', project: c.project || '', customer: c.customer || '',
    salesperson: c.salesperson || '', stage: c.stage || '', resp: c.resp || '',
    change: c.change || '', date: c.date || '', remark: c.remark || '',
  }));
  const { error } = await _sb.from('ail_changelog').insert(rows);
  if (!error) _clSyncedCount = changelog.length;
  else console.warn('[Supabase] changelog error:', error.message);
}

// ════════════════════════════════════════════════════════
//  LOAD FROM SUPABASE
// ════════════════════════════════════════════════════════
async function loadFromSupabase() {
  if (!_sb) return;
  const _blank = () => ({ status: 'Pending', date: '', resp: '', remark: '' });

  try {
    // Lists
    const { data: lists } = await _sb.from('ail_lists').select('*');
    if (lists) {
      const sp = lists.find(l => l.key === 'salespersons');
      const cu = lists.find(l => l.key === 'customers');
      const wp = lists.find(l => l.key === 'wiring_persons');
      if (sp && Array.isArray(sp.value)) salespersons  = sp.value;
      if (cu && Array.isArray(cu.value)) customers     = cu.value;
      if (wp && Array.isArray(wp.value)) wiringPersons = wp.value;
    }

    // Projects
    const { data: projs } = await _sb.from('ail_projects').select('*')
      .order('created_at', { ascending: true });
    if (projs && projs.length) {
      projects = projs.map(p => ({
        no: p.no, customer: p.customer || '', type: p.type || '',
        priority: p.priority || 'Medium', salesperson: p.salesperson || '',
        engineering: p.engineering || _blank(),
        purchase:    p.purchase    || _blank(),
        fabrication: p.fabrication || _blank(),
        wiring:      p.wiring      || _blank(),
        testing:     p.testing     || _blank(),
        dispatch:    p.dispatch    || _blank(),
      }));
    }

    // ── Wiring Assignments ──
    const { data: wa, error: we } = await _sb.from('ail_wiring_assign').select('*');
    if (we) console.warn('[Supabase] wiring_assign load error:', we.message);
    if (wa && wa.length) {
      wiringAssign = {};
      wa.forEach(a => {
        wiringAssign[a.project_no] = {
          person:    a.person     || '',
          startDate: a.start_date || '',
          endDate:   a.end_date   || '',
          note:      a.note       || '',
        };
      });
    }

    // Changelog
    const { data: cl } = await _sb.from('ail_changelog').select('*')
      .order('created_at', { ascending: false });
    if (cl && cl.length) {
      changelog = cl.map(c => ({
        time: c.time, project: c.project, customer: c.customer,
        salesperson: c.salesperson, stage: c.stage, resp: c.resp,
        change: c.change, date: c.date, remark: c.remark,
      }));
      _clSyncedCount = changelog.length;
    }

    // Cache to localStorage
    try {
      localStorage.setItem('ail_projects_v1',     JSON.stringify(projects));
      localStorage.setItem('ail_changelog_v1',    JSON.stringify(changelog));
      localStorage.setItem('ail_salespersons_v1', JSON.stringify(salespersons));
      localStorage.setItem('ail_customers_v1',    JSON.stringify(customers));
      localStorage.setItem('ail_wiring_persons',  JSON.stringify(wiringPersons));
      localStorage.setItem('ail_wiring_assign',   JSON.stringify(wiringAssign));
    } catch(e) {}

    _updateCloudBadge(true);

  } catch (e) {
    console.warn('[Supabase] loadFromSupabase error:', e);
    _updateCloudBadge(false);
  }
}

// ════════════════════════════════════════════════════════
//  PATCH deleteProject — remove from Supabase too
// ════════════════════════════════════════════════════════
window.deleteProject = async function(pi) {
  const p = projects[pi];
  if (!confirm(`Delete project ${p.no} — ${p.customer}?\n\nThis cannot be undone.`)) return;
  projects.splice(pi, 1);
  // Remove wiring assign for this project
  delete wiringAssign[p.no];
  try {
    localStorage.setItem('ail_projects_v1',   JSON.stringify(projects));
    localStorage.setItem('ail_wiring_assign', JSON.stringify(wiringAssign));
  } catch(e) {}
  if (_sb) {
    await _sb.from('ail_projects').delete().eq('no', p.no);
    await _sb.from('ail_wiring_assign').delete().eq('project_no', p.no);
  }
  showToast(`🗑 ${p.no} deleted`);
  renderProjects();
  refreshAll(false);
};

// ════════════════════════════════════════════════════════
//  AUTO-INIT on page load
// ════════════════════════════════════════════════════════
(async function _autoInit() {
  if (initSupabase()) {
    try {
      await loadFromSupabase();
      refreshAll(true);
    } catch(e) { console.warn('[Supabase] auto-init error:', e); }
  }
})();
