// Spreadsheet View module: filters, table rendering, and export
// Depends on window.currentEvents, window.apiService/window.api, global helpers: escapeHtml, debounce, downloadCSV, showEventModal

(function(){
  const api = window.apiService || window.api;

  function normalizeStatusKey(status){
    if (!status) return 'unknown';
    const s = status.toLowerCase();
    if (s.includes('queue')) return 'queue';
    if (s.includes('progress')) return 'inprogress';
    if (s.includes('awaiting')) return 'awaiting';
    if (s.includes('done')) return 'done';
    if (s.includes('blocked')) return 'blocked';
    return s.replace(/\s+/g,'-');
  }

  function setupSpreadsheetFilters(){
    const statusFilter = document.getElementById('spreadsheet-status-filter');
    const typeFilter = document.getElementById('spreadsheet-type-filter');
    const deptFilter = document.getElementById('spreadsheet-dept-filter');
    const searchInput = document.getElementById('spreadsheet-search');
    if (statusFilter && !statusFilter.dataset.bound) { statusFilter.addEventListener('change', applySpreadsheetFilters); statusFilter.dataset.bound = 'true'; }
    if (typeFilter && !typeFilter.dataset.bound) { typeFilter.addEventListener('change', applySpreadsheetFilters); typeFilter.dataset.bound = 'true'; }
    if (deptFilter && !deptFilter.dataset.bound) { deptFilter.addEventListener('change', applySpreadsheetFilters); deptFilter.dataset.bound = 'true'; }
    if (searchInput && !searchInput.dataset.bound) { searchInput.addEventListener('input', debounce(applySpreadsheetFilters, 250)); searchInput.dataset.bound = 'true'; }
  }

  function updateSpreadsheetSummary(filteredEvents){
    const summaryEl = document.getElementById('spreadsheet-summary-inline');
    if (!summaryEl) return;
    const statuses = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','🚫 Blocked','✅ Done'];
    const counts = {}; statuses.forEach(s => counts[s]=0);
    filteredEvents.forEach(e => { const st = e.status || 'Unknown'; if (counts[st]!==undefined) counts[st]++; });
    const today = new Date(); today.setHours(0,0,0,0);
    let overdueCount = 0;
    filteredEvents.forEach(e => { const due = new Date(e.posting_date+'T00:00:00'); const done = e.status && e.status.includes('Done'); const blocked = e.status && e.status.includes('Blocked'); if (due < today && !done && !blocked) overdueCount++; });
    const parts = [];
    if (counts['📥 In Queue']>0) parts.push(`${counts['📥 In Queue']} in queue`);
    if (counts['🔄 In Progress']>0) parts.push(`${counts['🔄 In Progress']} in progress`);
    if (counts['⏳ Awaiting Posting']>0) parts.push(`${counts['⏳ Awaiting Posting']} awaiting`);
    if (counts['🚫 Blocked']>0) parts.push(`${counts['🚫 Blocked']} blocked`);
    if (counts['✅ Done']>0) parts.push(`${counts['✅ Done']} done`);
    if (overdueCount>0) parts.push(`⚠️ ${overdueCount} overdue`);
    summaryEl.textContent = parts.length ? parts.join(' • ') : 'No items';
  }

  function renderSpreadsheetTable(){
    const wrapper = document.getElementById('spreadsheet-table-wrapper');
    if (!wrapper) return;
    const statusVal = document.getElementById('spreadsheet-status-filter')?.value || '';
    const typeFilterVal = document.getElementById('spreadsheet-type-filter')?.value || '';
    const deptVal = document.getElementById('spreadsheet-dept-filter')?.value || '';
    const searchVal = (document.getElementById('spreadsheet-search')?.value || '').toLowerCase().trim();
    let data = (window.currentEvents || []).slice();
    if (statusVal) data = data.filter(e => e.status === statusVal);
    if (typeFilterVal) data = data.filter(e => (e.request_type || '').toLowerCase().includes(typeFilterVal.toLowerCase()));
    if (deptVal) data = data.filter(e => ((e.department || e.requester_department_name || '').toLowerCase()).includes(deptVal.toLowerCase()));
    if (searchVal) { data = data.filter(e => [e.title,e.description,e.requester_name,e.assigned_to_name,e.status,e.request_type].filter(Boolean).some(v => v.toLowerCase().includes(searchVal))); }

    const chipsContainer = document.getElementById('spreadsheet-active-filters');
    if (chipsContainer){
      chipsContainer.innerHTML = '';
      const pushChip = (label,value,clearFn)=>{ const chip=document.createElement('div'); chip.className='chip'; chip.innerHTML=`<span>${label}: ${escapeHtml(value)}</span><button aria-label="Remove filter">✕</button>`; chip.querySelector('button').onclick = clearFn; chipsContainer.appendChild(chip); };
      if (statusVal) pushChip('Status', statusVal, () => { document.getElementById('spreadsheet-status-filter').selectedIndex = 0; applySpreadsheetFilters(); });
      if (typeFilterVal) pushChip('Type', typeFilterVal, () => { document.getElementById('spreadsheet-type-filter').selectedIndex = 0; applySpreadsheetFilters(); });
      if (deptVal) pushChip('Dept', deptVal, () => { document.getElementById('spreadsheet-dept-filter').selectedIndex = 0; applySpreadsheetFilters(); });
      if (searchVal) pushChip('Search', searchVal, () => { document.getElementById('spreadsheet-search').value=''; applySpreadsheetFilters(); });
    }

    const countEl = document.getElementById('spreadsheet-filtered-count');
    if (countEl) countEl.textContent = `${data.length} shown`;
    updateSpreadsheetSummary(data);

    data.sort((a,b) => new Date(a.posting_date) - new Date(b.posting_date));
    const groupsOrder = ['📥 In Queue','🔄 In Progress','⏳ Awaiting Posting','🚫 Blocked','✅ Done'];
    const groups = {}; data.forEach(ev => { const st = ev.status || 'Unknown'; (groups[st] = groups[st] || []).push(ev); });
    const orderedStatuses = groupsOrder.filter(s => groups[s])
      .concat(Object.keys(groups).filter(s => !groupsOrder.includes(s) && !s.includes('Done')))
      .concat(groups['✅ Done'] ? ['✅ Done'] : []);
    const header = `
      <table class="table">
        <thead>
          <tr>
            <th>Due Date</th>
            <th>Status</th>
            <th>Title</th>
            <th>Type</th>
            <th>Requester</th>
            <th>Assigned To</th>
            <th>Department</th>
            <th>Channel ID</th>
          </tr>
        </thead>
        <tbody>`;
    let body = '';
    orderedStatuses.forEach(statusLabel => {
      const rows = groups[statusLabel]; if (!rows) return;
      body += `<tr class="status-group-row"><td colspan="8">${escapeHtml(statusLabel)} (${rows.length})</td></tr>`;
      rows.forEach(ev => {
        const dueDate = new Date(ev.posting_date + 'T00:00:00');
        const statusKey = normalizeStatusKey(ev.status);
        const discordLink = `https://discord.com/channels/1201569925481820220/${ev.channelID}`;
        body += `<tr>
          <td>${dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
          <td><span class="pill status ${statusKey}">${escapeHtml(ev.status || 'Unknown')}</span></td>
          <td>${escapeHtml(ev.title)}</td>
          <td><span class="pill type">${escapeHtml(api.formatRequestType(ev.request_type) || 'N/A')}</span></td>
          <td>${escapeHtml(ev.requester_name || '—')}</td>
          <td>${escapeHtml(ev.assigned_to_name || (statusKey==='done'?'Completed':'Unassigned'))}</td>
          <td>${escapeHtml(ev.department || ev.requester_department_name || '—')}</td>
          <td class="text-muted"><a href="${discordLink}" target="_blank" rel="noopener noreferrer" class="discord-link" title="Open in Discord">💬 ${ev.channelID}</a></td>
        </tr>`;
      });
    });
    const footer = '</tbody></table>';
    wrapper.innerHTML = header + body + footer;
    wrapper.querySelectorAll('.table tbody tr:not(.status-group-row)').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        if (e.target.closest('.discord-link')) return;
        const channelIdCell = row.querySelector('td:last-child .discord-link');
        if (channelIdCell) {
          const channelId = channelIdCell.textContent.replace('💬 ', '').trim();
          const event = data.find(ev => String(ev.channelID) === channelId);
          if (event) showEventModal(event);
        }
      });
      row.addEventListener('mouseenter', () => { if (!row.classList.contains('status-group-row')) row.style.backgroundColor = 'rgba(211, 175, 90, 0.08)'; });
      row.addEventListener('mouseleave', () => { row.style.backgroundColor = ''; });
    });
  }

  function exportSpreadsheetCsv(){
    const statusVal = document.getElementById('spreadsheet-status-filter')?.value || '';
    const typeFilterVal = document.getElementById('spreadsheet-type-filter')?.value || '';
    const deptVal = document.getElementById('spreadsheet-dept-filter')?.value || '';
    const searchVal = (document.getElementById('spreadsheet-search')?.value || '').toLowerCase().trim();
    let data = (window.currentEvents || []).slice();
    if (statusVal) data = data.filter(e => e.status === statusVal);
    if (typeFilterVal) data = data.filter(e => (e.request_type || '').toLowerCase().includes(typeFilterVal.toLowerCase()));
    if (deptVal) data = data.filter(e => ((e.department || e.requester_department_name || '').toLowerCase()).includes(deptVal.toLowerCase()));
    if (searchVal) data = data.filter(e => [e.title,e.description,e.requester_name,e.assigned_to_name,e.status,e.request_type].filter(Boolean).some(v => v.toLowerCase().includes(searchVal)));
    data.sort((a,b) => new Date(a.posting_date) - new Date(b.posting_date));
    const rows = data.map(ev => [ev.posting_date, ev.status, ev.title, ev.request_type, ev.requester_name, ev.assigned_to_name, ev.department || ev.requester_department_name || '', ev.channelID]);
    const header = ['Due Date','Status','Title','Type','Requester','Assigned To','Department','Channel ID'];
    const csv = [header,...rows].map(r=>r.map(f=>`"${String(f||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadCSV(csv,'msa-spreadsheet-view.csv');
  }

  function applySpreadsheetFilters(){ renderSpreadsheetTable(); }
  function resetSpreadsheetFilters(){ ['spreadsheet-status-filter','spreadsheet-type-filter','spreadsheet-dept-filter','spreadsheet-search'].forEach(id => { const el=document.getElementById(id); if (!el) return; if (el.tagName==='SELECT') el.selectedIndex=0; else el.value=''; }); applySpreadsheetFilters(); }

  function loadSpreadsheetView(){
    if (!window.currentEvents || !window.currentEvents.length){ window.loadEvents().then(renderSpreadsheetTable); } else { renderSpreadsheetTable(); }
    setupSpreadsheetFilters();
  }

  // Expose
  window.loadSpreadsheetView = loadSpreadsheetView;
  window.applySpreadsheetFilters = applySpreadsheetFilters;
  window.resetSpreadsheetFilters = resetSpreadsheetFilters;
  window.exportSpreadsheetCsv = exportSpreadsheetCsv;
})();
