// Namespace adapter: map existing globals into structured MSA namespace
(function(){
  const MSA = window.MSA || (window.MSA = {});
  function attach(nsPath, fnName){
    const parts = nsPath.split('.');
    let cursor = MSA;
    while(parts.length){ const seg=parts.shift(); cursor[seg] = cursor[seg] || {}; cursor = cursor[seg]; }
    if (typeof window[fnName] === 'function') {
      cursor[fnName] = window[fnName];
    }
  }
  const mappings = [
    ['modules.events','loadEvents'],['modules.events','displayEvents'],['modules.events','updateEventsSummary'],
    ['modules.calendar','loadMainCalendar'],
    ['modules.cycle','loadCycleView'],
    ['modules.spreadsheet','loadSpreadsheetView'],['modules.spreadsheet','applySpreadsheetFilters'],['modules.spreadsheet','resetSpreadsheetFilters'],['modules.spreadsheet','exportSpreadsheetCsv'],
    ['modules.recent','loadRecentActivity'],
    ['modules.miniCalendar','loadMiniCalendar'],
  ['util','showToast'],['util','updateApiStatus'],['util','downloadCSV'],['util','debounce'],['util','escapeHtml'],['ui','showEventModal'],
  ['data','computeEventStats'],
    ['modules.analytics','loadAnalytics'],['modules.analytics','initializeCharts'],['modules.analytics','updateChartsForNightMode'],['modules.analytics','updateChartsForDayMode'],
    ['modules.kanban','loadKanbanBoard'],['modules.kanban','refreshKanban'],
    ['auth','checkAuthentication'],['auth','showLoginScreen'],['auth','hideLoginScreen'],['auth','initiateLogin'],['auth','updateUserGreeting'],['auth','showUserMenu']
  ];
  mappings.forEach(([ns, fn]) => attach(ns, fn));
})();
