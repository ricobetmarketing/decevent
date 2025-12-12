<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Turnover Management System</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">

  <style>
    :root { --primary-color:#198754; --sidebar-width:250px; }
    body { background-color:#f8f9fa; font-size:14px; }
    #sidebar{
      width:var(--sidebar-width); min-height:100vh; background-color:#111827;
      position:fixed; top:0; left:0; padding-top:20px; color:white; z-index:1000;
      box-shadow:4px 0 15px rgba(0,0,0,0.35);
    }
    #sidebar h4{ font-size:1.1rem; letter-spacing:.04em; }
    #sidebar .nav-link{
      color:#9ca3af; padding:12px 20px; display:flex; align-items:center;
      transition:background-color .2s,color .2s; font-size:.96rem; border-radius:0;
    }
    #sidebar .nav-link i{ margin-right:8px; }
    #sidebar .nav-link:hover,#sidebar .nav-link.active{
      background:linear-gradient(135deg,#22c55e,#16a34a); color:#022c22;
    }
    #content{ margin-left:var(--sidebar-width); padding:20px; }
    .card-header{ background-color:var(--primary-color)!important; color:#fff!important; font-weight:600; }
    .tab-content .tab-pane{ display:none; } .tab-content .tab-pane.active{ display:block; }
    .text-small{ font-size:12px; }
    .status-text{ font-size:12px; margin-top:6px; min-height:18px; }
    .status-ok{ color:#16a34a; } .status-error{ color:#dc2626; }
    .pill-note{
      display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:3px 8px;
      background:rgba(148,163,184,0.15); font-size:11px;
    }
    .pill-note.green{ background:rgba(34,197,94,0.15); color:#15803d; }
    .pill-note.blue{ background:rgba(59,130,246,0.15); color:#1d4ed8; }
    textarea{
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      font-size:13px;
    }
  </style>
</head>
<body>

<div id="sidebar">
  <h4 class="text-center mb-4 text-warning">Turnover System</h4>
  <nav class="nav flex-column">
    <a class="nav-link active" id="global-tab" href="#global" onclick="showTab('global')">
      <i class="fas fa-globe"></i> GLOBAL Leaderboard
    </a>
    <a class="nav-link" id="brazil-tab" href="#brazil" onclick="showTab('brazil')">🇧🇷 Brazil</a>
    <a class="nav-link" id="mexico-tab" href="#mexico" onclick="showTab('mexico')">🇲🇽 Mexico</a>
    <a class="nav-link" id="data-tab" href="#data" onclick="showTab('data')">
      <i class="fas fa-chart-line"></i> DATA / Analytics
    </a>
  </nav>
</div>

<div id="content">
  <h1 class="h4 mb-2">Daily Turnover Management</h1>
  <p class="text-muted text-small mb-3">
    Your team updates Brazil &amp; Mexico every 2 hours. This tool saves raw data into D1, converts to USD, and builds the GLOBAL leaderboard used on the public page.
  </p>
  <hr>

  <div class="tab-content">

    <!-- DATA TAB -->
    <div class="tab-pane" id="data">
      <div class="card shadow-sm mb-4">
        <div class="card-header bg-white text-dark d-flex justify-content-between align-items-center">
          <span><i class="fas fa-chart-bar me-2"></i>Turnover Analytics (USD)</span>
          <div class="d-flex gap-2">
            <button id="btnExportCsv" class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-file-csv"></i> CSV
            </button>
            <button id="btnExportPdf" class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
        <div class="card-body">

          <div class="row g-3 mb-3">
            <div class="col-md-3">
              <label class="form-label">Range</label>
              <select id="dataMode" class="form-select">
                <option value="daily">Today (Daily)</option>
                <option value="weekly" selected>This Week (7 days)</option>
                <option value="monthly">Last 30 Days</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Country</label>
              <select id="dataCountry" class="form-select">
                <option value="ALL" selected>Combined (BR + MX)</option>
                <option value="BR">Brazil Only</option>
                <option value="MX">Mexico Only</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Base Date (UTC-6)</label>
              <input type="date" id="dataBaseDate" class="form-control">
            </div>
            <div class="col-md-3 d-flex align-items-end">
              <button id="btnReloadStats" class="btn btn-primary w-100">
                <i class="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          <div class="row g-3 mb-2">
            <div class="col-md-12">
              <div id="dataStatus" class="status-text"></div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <div class="text-muted small">Total Turnover (USD)</div>
                  <div id="summaryTotalUsd" class="h4 mb-0">-</div>
                  <div class="text-muted small" id="summaryRangeLabel"></div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <div class="text-muted small">Top Player (by USD)</div>
                  <div id="summaryTopPlayer" class="h5 mb-0">-</div>
                  <div class="text-muted small" id="summaryTopPlayerUsd"></div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <div class="text-muted small">Most Consistent (Days in Top 20)</div>
                  <div id="summaryConsistentPlayer" class="h5 mb-0">-</div>
                  <div class="text-muted small" id="summaryConsistentDays"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h6 class="mb-2">Daily Turnover Trend (USD)</h6>
              <div id="chartTurnover" style="height:300px;"></div>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="mb-2">Top Players (Selected Range)</h6>
              <div class="table-responsive">
                <table class="table table-sm table-hover align-middle" id="tblTopPlayers">
                  <thead class="table-light">
                    <tr>
                      <th>Rank</th>
                      <th>Username</th>
                      <th>Country</th>
                      <th>Total USD (Range)</th>
                      <th>Days in Top 20</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- GLOBAL TAB -->
    <div class="tab-pane active" id="global">
      <div class="card shadow-sm mb-4">
        <div class="card-header bg-success">
          <i class="fas fa-trophy"></i> GLOBAL Leaderboard &amp; Summary (USD)
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">Combined <strong>Brazil + Mexico</strong>, converted to USD and ranked by Score (USD).</p>

          <div class="row g-3 mb-3">
            <div class="col-md-3">
              <label for="globalDate" class="form-label text-small">
                Leaderboard Date <span class="pill-note blue">Mexico time (UTC-6)</span>
              </label>
              <input type="date" class="form-control form-control-sm" id="globalDate">
            </div>
            <div class="col-md-3">
              <label for="globalPlayer" class="form-label text-small">Filter by Username</label>
              <input type="text" class="form-control form-control-sm" id="globalPlayer" placeholder="e.g. fabiano199">
            </div>
            <div class="col-md-3 d-flex align-items-end">
              <button class="btn btn-secondary btn-sm w-100" id="globalSearchBtn">
                <i class="fas fa-search"></i> Load Leaderboard
              </button>
            </div>
            <div class="col-md-3 d-flex align-items-end">
              <div id="globalStatus" class="status-text"></div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-striped table-hover table-sm align-middle">
              <thead class="table-dark">
                <tr>
                  <th style="width:60px;">Rank</th>
                  <th>Username</th>
                  <th style="width:90px;">Country</th>
                  <th style="width:150px;">Score (USD)</th>
                </tr>
              </thead>
              <tbody id="globalTableBody"></tbody>
            </table>
          </div>

          <p class="text-small text-muted mt-2 mb-0">
            To correct data: re-upload <strong>Brazil</strong> or <strong>Mexico</strong> with the same <strong>date</strong> and <strong>time slot</strong>.
            The backend overwrites rows for that key automatically.
          </p>
        </div>
      </div>
    </div>

    <!-- BRAZIL TAB -->
    <div class="tab-pane" id="brazil">
      <div class="card shadow-sm mb-4">
        <div class="card-header">🇧🇷 Brazil Turnover Data Entry (BRL)</div>
        <div class="card-body">
          <p class="text-small text-danger mb-2">
            ⚠️ Select the <strong>Mexico day (UTC-6)</strong> and the latest cumulative slot.  
            Use <strong>BR 00:00–03:00</strong> only for “deduct” upload.
          </p>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label for="brDate" class="form-label text-small">
                Leaderboard Date <span class="pill-note blue">Mexico (UTC-6)</span>
              </label>
              <input type="date" class="form-control form-control-sm" id="brDate">
            </div>
            <div class="col-md-4">
              <label for="brTime" class="form-label text-small">
                Time Slot / Type <span class="pill-note green">Cumulative</span>
              </label>
              <select id="brTime" class="form-select form-select-sm">
                <option value="00_02">00:00 – 02:00</option>
                <option value="00_04">00:00 – 04:00</option>
                <option value="00_06">00:00 – 06:00</option>
                <option value="00_08">00:00 – 08:00</option>
                <option value="00_10">00:00 – 10:00</option>
                <option value="00_12">00:00 – 12:00</option>
                <option value="00_14">00:00 – 14:00</option>
                <option value="00_16">00:00 – 16:00</option>
                <option value="00_18">00:00 – 18:00</option>
                <option value="00_20">00:00 – 20:00</option>
                <option value="00_22">00:00 – 22:00</option>
                <option value="00_24">00:00 – 24:00</option>
                <option value="BR_00_03">BR 00:00 – 03:00 (deduct)</option>
              </select>
            </div>
          </div>

          <div class="d-flex mb-2">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="toggleMode('brazil','manual')">Manual Entry</button>
            <button class="btn btn-sm btn-outline-primary" onclick="toggleMode('brazil','csv')">CSV Upload</button>
          </div>

          <div id="brazil-manual" class="data-mode">
            <label for="brDataArea" class="form-label text-small">
              Paste data <span class="pill-note">username, turnover</span>
            </label>
            <textarea class="form-control" id="brDataArea" rows="7" placeholder="fabiano199, 2500.50"></textarea>
          </div>

          <div id="brazil-csv" class="data-mode" style="display:none;">
            <label for="brCsvFile" class="form-label text-small">Upload CSV (.csv)</label>
            <input type="file" class="form-control form-control-sm" id="brCsvFile" accept=".csv">
            <a href="#" id="brTemplateLink" class="d-inline-block mt-1 text-small">
              <i class="fas fa-download"></i> Download CSV template
            </a>
          </div>

          <div class="mt-3">
            <button type="button" class="btn btn-outline-secondary btn-sm me-2" onclick="previewCountry('BR')">
              <i class="fas fa-eye"></i> Preview parsed rows
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="saveCountry('BR')">
              <i class="fas fa-upload"></i> Save Brazil data
            </button>
            <div id="brStatus" class="status-text"></div>
          </div>

          <div class="table-responsive mt-2" id="brPreviewBlock" style="display:none; max-height:260px; overflow:auto;">
            <table class="table table-sm table-striped table-hover align-middle mb-0">
              <thead class="table-light">
                <tr><th style="width:50px;">#</th><th>Username</th><th>Turnover (BRL)</th></tr>
              </thead>
              <tbody id="brPreviewBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- MEXICO TAB -->
    <div class="tab-pane" id="mexico">
      <div class="card shadow-sm mb-4">
        <div class="card-header">🇲🇽 Mexico Turnover Data Entry (MXN)</div>
        <div class="card-body">
          <p class="text-small text-info mb-2">
            ℹ️ Mexico day cycle: <strong>00:00 – 23:59 (UTC-6)</strong>. Use cumulative turnover.
          </p>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label for="mxDate" class="form-label text-small">
                Leaderboard Date <span class="pill-note blue">Mexico (UTC-6)</span>
              </label>
              <input type="date" class="form-control form-control-sm" id="mxDate">
            </div>
            <div class="col-md-4">
              <label for="mxTime" class="form-label text-small">
                Time Slot / Type <span class="pill-note green">Cumulative</span>
              </label>
              <select id="mxTime" class="form-select form-select-sm">
                <option value="00_02">00:00 – 02:00</option>
                <option value="00_04">00:00 – 04:00</option>
                <option value="00_06">00:00 – 06:00</option>
                <option value="00_08">00:00 – 08:00</option>
                <option value="00_10">00:00 – 10:00</option>
                <option value="00_12">00:00 – 12:00</option>
                <option value="00_14">00:00 – 14:00</option>
                <option value="00_16">00:00 – 16:00</option>
                <option value="00_18">00:00 – 18:00</option>
                <option value="00_20">00:00 – 20:00</option>
                <option value="00_22">00:00 – 22:00</option>
                <option value="00_24">00:00 – 24:00</option>
              </select>
            </div>
          </div>

          <div class="d-flex mb-2">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="toggleMode('mexico','manual')">Manual Entry</button>
            <button class="btn btn-sm btn-outline-primary" onclick="toggleMode('mexico','csv')">CSV Upload</button>
          </div>

          <div id="mexico-manual" class="data-mode">
            <label for="mxDataArea" class="form-label text-small">
              Paste data <span class="pill-note">username, turnover</span>
            </label>
            <textarea class="form-control" id="mxDataArea" rows="7" placeholder="mxplayer01, 20000.00"></textarea>
          </div>

          <div id="mexico-csv" class="data-mode" style="display:none;">
            <label for="mxCsvFile" class="form-label text-small">Upload CSV (.csv)</label>
            <input type="file" class="form-control form-control-sm" id="mxCsvFile" accept=".csv">
            <a href="#" id="mxTemplateLink" class="d-inline-block mt-1 text-small">
              <i class="fas fa-download"></i> Download CSV template
            </a>
          </div>

          <div class="mt-3">
            <button type="button" class="btn btn-outline-secondary btn-sm me-2" onclick="previewCountry('MX')">
              <i class="fas fa-eye"></i> Preview parsed rows
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="saveCountry('MX')">
              <i class="fas fa-upload"></i> Save Mexico data
            </button>
            <div id="mxStatus" class="status-text"></div>
          </div>

          <div class="table-responsive mt-2" id="mxPreviewBlock" style="display:none; max-height:260px; overflow:auto;">
            <table class="table table-sm table-striped table-hover align-middle mb-0">
              <thead class="table-light">
                <tr><th style="width:50px;">#</th><th>Username</th><th>Turnover (MXN)</th></tr>
              </thead>
              <tbody id="mxPreviewBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>

<script>
  // Tabs
  function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById(tabId + '-tab').classList.add('active');
  }

  // Mode switch
  function toggleMode(country, mode) {
    const manualDiv = document.getElementById(country + '-manual');
    const csvDiv = document.getElementById(country + '-csv');
    if (mode === 'manual') { manualDiv.style.display = 'block'; csvDiv.style.display = 'none'; }
    else { manualDiv.style.display = 'none'; csvDiv.style.display = 'block'; }
  }

  // Status helpers
  function setStatus(code, message, type) {
    const el = document.getElementById(code.toLowerCase() + 'Status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('status-ok','status-error');
    if (type === 'ok') el.classList.add('status-ok');
    if (type === 'error') el.classList.add('status-error');
  }
  function setGlobalStatus(msg, type) {
    const el = document.getElementById('globalStatus');
    el.textContent = msg || '';
    el.classList.remove('status-ok','status-error');
    if (type === 'ok') el.classList.add('status-ok');
    if (type === 'error') el.classList.add('status-error');
  }
  function setDataStatus(msg, type) {
    const el = document.getElementById('dataStatus');
    el.textContent = msg || '';
    el.classList.remove('status-ok','status-error');
    if (type === 'ok') el.classList.add('status-ok');
    if (type === 'error') el.classList.add('status-error');
  }

  function parseLines(text) {
    const lines = (text || '').split(/\r?\n/);
    const rows = [];
    const errors = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/[,;\t]/).map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) { errors.push('Line '+(idx+1)+': not enough values'); return; }
      const username = parts[0];
      const numStr = parts[1].replace(/,/g,'');
      const turnover = Number(numStr);
      if (!username) { errors.push('Line '+(idx+1)+': missing username'); return; }
      if (!Number.isFinite(turnover)) { errors.push('Line '+(idx+1)+': invalid turnover'); return; }
      rows.push({ username, turnover });
    });
    return { rows, errors };
  }

  function setupCsvUpload(fileInputId, textareaId) {
    const fileInput = document.getElementById(fileInputId);
    const textarea = document.getElementById(textareaId);
    if (!fileInput || !textarea) return;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => { textarea.value = e.target.result || ''; };
      reader.readAsText(file);
    });
  }
  setupCsvUpload('brCsvFile','brDataArea');
  setupCsvUpload('mxCsvFile','mxDataArea');

  function setupTemplateLink(linkId, examplePrefix) {
    const link = document.getElementById(linkId);
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const csv = "username,turnover\n" + examplePrefix + "player01,1500.00\n" + examplePrefix + "player02,900.00\n";
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = examplePrefix + "_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  setupTemplateLink('brTemplateLink','br');
  setupTemplateLink('mxTemplateLink','mx');

  function previewCountry(countryCode) {
    const upper = countryCode.toUpperCase();
    const textareaId = upper === 'BR' ? 'brDataArea' : 'mxDataArea';
    const previewBlockId = upper === 'BR' ? 'brPreviewBlock' : 'mxPreviewBlock';
    const previewBodyId = upper === 'BR' ? 'brPreviewBody' : 'mxPreviewBody';
    const parsed = parseLines(document.getElementById(textareaId).value);

    if (parsed.errors.length) {
      setStatus(upper, parsed.errors[0], 'error');
      document.getElementById(previewBlockId).style.display = 'none';
      return;
    }
    setStatus(upper, 'Parsed ' + parsed.rows.length + ' rows.', parsed.rows.length ? 'ok' : '');

    const tbody = document.getElementById(previewBodyId);
    tbody.innerHTML = '';
    parsed.rows.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>'+(idx+1)+'</td><td>'+r.username+'</td><td>'+r.turnover+'</td>';
      tbody.appendChild(tr);
    });

    document.getElementById(previewBlockId).style.display = parsed.rows.length ? 'block' : 'none';
  }

  async function saveCountry(countryCode) {
    const upper = countryCode.toUpperCase();
    const dateEl = document.getElementById(upper === 'BR' ? 'brDate' : 'mxDate');
    const slotEl = document.getElementById(upper === 'BR' ? 'brTime' : 'mxTime');
    const textareaEl = document.getElementById(upper === 'BR' ? 'brDataArea' : 'mxDataArea');

    const date = dateEl.value;
    const slotKey = slotEl.value;
    if (!date) { setStatus(upper,'Please choose a leaderboard date.','error'); return; }

    const parsed = parseLines(textareaEl.value);
    if (parsed.errors.length) { setStatus(upper, parsed.errors[0], 'error'); return; }
    if (!parsed.rows.length) { setStatus(upper,'No rows to save.','error'); return; }

    setStatus(upper, 'Saving ' + parsed.rows.length + ' rows…', '');

    try {
      const res = await fetch('/api-admin-save', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ country: upper, date, slotKey, rows: parsed.rows })
      });
      const json = await res.json().catch(()=> ({}));
      if (!res.ok || !json.ok) {
        setStatus(upper, (json.error || ('Save failed ' + res.status)), 'error');
      } else {
        setStatus(upper, 'Saved ' + (json.inserted || 0) + ' rows for ' + upper + ' [' + date + ', ' + slotKey + '].', 'ok');
        previewCountry(upper);
        // auto refresh global/data
        loadGlobalLeaderboard();
        loadStats();
      }
    } catch(e) {
      setStatus(upper,'Network error while saving.','error');
    }
  }

  async function loadGlobalLeaderboard() {
    const date = document.getElementById('globalDate').value;
    const filter = (document.getElementById('globalPlayer').value || '').trim().toLowerCase();
    const tbody = document.getElementById('globalTableBody');
    if (!date) { setGlobalStatus('Please choose a date first.','error'); return; }
    setGlobalStatus('Loading leaderboard…','');

    try {
      const res = await fetch('/api-leaderboard?date=' + encodeURIComponent(date));
      const json = await res.json().catch(()=> ({}));
      if (!res.ok || !json.ok) { setGlobalStatus(json.error || ('Error ' + res.status),'error'); return; }

      const rows = (json.rows || []).filter(r => !filter || String(r.username||'').toLowerCase().includes(filter));
      tbody.innerHTML = '';
      if (!rows.length) { setGlobalStatus('No entries for ' + json.date + ' yet.',''); return; }

      rows.forEach(p => {
        const tr = document.createElement('tr');
        const flag = p.country === 'BR' ? '🇧🇷' : (p.country === 'MX' ? '🇲🇽' : '🌐');
        tr.innerHTML =
          '<td>' + (p.rank ?? '-') + '</td>' +
          '<td>' + (p.username || '') + '</td>' +
          '<td>' + flag + ' ' + (p.country || '') + '</td>' +
          '<td>$' + Number(p.usd_turnover || 0).toFixed(2) + '</td>';
        tbody.appendChild(tr);
      });

      setGlobalStatus('Showing ' + rows.length + ' players for ' + json.date + '.', 'ok');
    } catch(e) {
      setGlobalStatus('Network error loading leaderboard.','error');
    }
  }

  document.getElementById('globalSearchBtn').addEventListener('click', loadGlobalLeaderboard);

  // Mexico today
  function todayMexicoISO() {
    const nowUtcMs = Date.now();
    const offsetMs = -6 * 60 * 60 * 1000;
    const mexNow = new Date(nowUtcMs + offsetMs);
    const y = mexNow.getFullYear();
    const m = String(mexNow.getMonth() + 1).padStart(2, "0");
    const d = String(mexNow.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ---- DATA / ANALYTICS ----
  let chart = null;
  let lastStats = null;

  function renderChart(series) {
    const labels = (series || []).map(x => x.date);
    const values = (series || []).map(x => Number(x.totalUsd || 0));

    const options = {
      chart: { type:'line', height:300, toolbar:{ show:false } },
      series: [{ name:'Total USD', data: values }],
      xaxis: { categories: labels },
      yaxis: { labels: { formatter: (v) => Number(v).toFixed(2) } },
      stroke: { curve:'smooth', width:3 },
      dataLabels: { enabled:false }
    };

    if (!chart) {
      chart = new ApexCharts(document.querySelector("#chartTurnover"), options);
      chart.render();
    } else {
      chart.updateOptions(options, true, true);
    }
  }

  function fillTopPlayersTable(rows) {
    const tbody = document.querySelector('#tblTopPlayers tbody');
    tbody.innerHTML = '';
    (rows || []).slice(0, 20).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (r.rank ?? '-') + '</td>' +
        '<td>' + (r.username || '') + '</td>' +
        '<td>' + (r.country || '') + '</td>' +
        '<td>$' + Number(r.totalUsd || 0).toFixed(2) + '</td>' +
        '<td>' + (r.daysInTop20 ?? 0) + '</td>';
      tbody.appendChild(tr);
    });
  }

  async function loadStats() {
    const mode = document.getElementById('dataMode').value;
    const country = document.getElementById('dataCountry').value;
    const date = document.getElementById('dataBaseDate').value;

    setDataStatus('Loading stats…','');

    try {
      const res = await fetch('/api-stats?mode=' + encodeURIComponent(mode) +
        '&country=' + encodeURIComponent(country) +
        '&date=' + encodeURIComponent(date)
      );
      const json = await res.json().catch(()=> ({}));
      if (!res.ok || !json.ok) {
        setDataStatus(json.error || ('Stats error ' + res.status), 'error');
        lastStats = null;
        renderChart([{date: date, totalUsd:0}]);
        fillTopPlayersTable([]);
        return;
      }

      lastStats = json;

      document.getElementById('summaryTotalUsd').textContent = '$' + Number(json.rangeTotalUsd || 0).toFixed(2);
      document.getElementById('summaryRangeLabel').textContent = json.fromDate + ' → ' + json.toDate + ' (' + json.mode + ', ' + json.country + ')';

      if (json.topPlayer) {
        document.getElementById('summaryTopPlayer').textContent = json.topPlayer.username + ' (' + json.topPlayer.country + ')';
        document.getElementById('summaryTopPlayerUsd').textContent = '$' + Number(json.topPlayer.totalUsd || 0).toFixed(2) + ' (range)';
      } else {
        document.getElementById('summaryTopPlayer').textContent = '-';
        document.getElementById('summaryTopPlayerUsd').textContent = '';
      }

      if (json.mostConsistent) {
        document.getElementById('summaryConsistentPlayer').textContent = json.mostConsistent.username + ' (' + json.mostConsistent.country + ')';
        document.getElementById('summaryConsistentDays').textContent = (json.mostConsistent.daysInTop20 || 0) + ' day(s) in Top 20';
      } else {
        document.getElementById('summaryConsistentPlayer').textContent = '-';
        document.getElementById('summaryConsistentDays').textContent = '';
      }

      renderChart(json.chartSeries || []);
      fillTopPlayersTable(json.topPlayersOverall || []);

      setDataStatus('Loaded stats for ' + json.fromDate + ' → ' + json.toDate + '.', 'ok');
    } catch (e) {
      setDataStatus('Network error loading stats.','error');
    }
  }

  document.getElementById('btnReloadStats').addEventListener('click', loadStats);

  // CSV export
  document.getElementById('btnExportCsv').addEventListener('click', () => {
    if (!lastStats) { alert('No stats loaded yet.'); return; }
    const rows = lastStats.topPlayersOverall || [];
    let csv = "rank,username,country,totalUsd,daysInTop20\n";
    rows.forEach(r => {
      csv += [r.rank, r.username, r.country, r.totalUsd, r.daysInTop20].join(",") + "\n";
    });
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turnover_stats_${lastStats.mode}_${lastStats.country}_${lastStats.fromDate}_to_${lastStats.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // PDF export (simple)
  document.getElementById('btnExportPdf').addEventListener('click', () => {
    if (!lastStats) { alert('No stats loaded yet.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Turnover Analytics (USD)", 14, 16);

    doc.setFontSize(10);
    doc.text(`Mode: ${lastStats.mode}   Country: ${lastStats.country}`, 14, 24);
    doc.text(`Range: ${lastStats.fromDate} -> ${lastStats.toDate}`, 14, 30);
    doc.text(`Total USD: $${Number(lastStats.rangeTotalUsd || 0).toFixed(2)}`, 14, 36);

    doc.text("Top Players:", 14, 46);

    const rows = (lastStats.topPlayersOverall || []).slice(0, 20);
    let y = 54;
    doc.setFontSize(9);
    doc.text("Rank  Username               Country  TotalUSD  DaysTop20", 14, y);
    y += 6;

    rows.forEach(r => {
      const line = `${String(r.rank).padEnd(4)} ${String(r.username).padEnd(20)} ${String(r.country).padEnd(7)} $${Number(r.totalUsd||0).toFixed(2).padEnd(8)} ${r.daysInTop20}`;
      doc.text(line, 14, y);
      y += 5;
      if (y > 280) { doc.addPage(); y = 20; }
    });

    doc.save(`turnover_stats_${lastStats.mode}_${lastStats.country}_${lastStats.fromDate}_to_${lastStats.toDate}.pdf`);
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    showTab('global');
    const today = todayMexicoISO();
    document.getElementById('globalDate').value = today;
    document.getElementById('brDate').value = today;
    document.getElementById('mxDate').value = today;

    document.getElementById('dataBaseDate').value = today;

    loadGlobalLeaderboard();
    loadStats();
  });
</script>

</body>
</html>
