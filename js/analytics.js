// Analytics module using Chart.js
// Exposes window.initializeCharts and window.loadAnalytics

(function(){
  const charts = (window.charts = window.charts || {});

  function initializeCharts(){
    console.log('📊 Charts initialized');
  }

  async function loadAnalytics(){
    if (!window.currentEvents.length) {
      await window.loadEvents();
    }
    updateStatusChart();
    updateTimelineChart();
    updateTypeChart();
    updateDepartmentChart();
    updateMetrics();
  }

  function updateStatusChart(){
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    if (charts.status) charts.status.destroy();
    const ctx = canvas.getContext('2d');
    const statusCounts = {};
    window.currentEvents.forEach(event => { const s = event.status || 'No Status'; statusCounts[s] = (statusCounts[s]||0)+1; });
    charts.status = new Chart(ctx, { type:'doughnut', data:{ labels:Object.keys(statusCounts), datasets:[{ data:Object.values(statusCounts), backgroundColor:['#007bff','#ffc107','#28a745','#dc3545','#6c757d'] }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }

  function updateTimelineChart(){
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    if (charts.timeline) charts.timeline.destroy();
    const ctx = canvas.getContext('2d');
    const monthCounts = {};
    window.currentEvents.forEach(event => { const m = new Date(event.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}); monthCounts[m]=(monthCounts[m]||0)+1; });
    charts.timeline = new Chart(ctx, { type:'line', data:{ labels:Object.keys(monthCounts), datasets:[{ label:'Requests Created', data:Object.values(monthCounts), borderColor:'#007bff', backgroundColor:'rgba(0,123,255,0.1)', tension:0.1 }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }

  function updateTypeChart(){
    const canvas = document.getElementById('typeChart');
    if (!canvas) return;
    if (charts.type) charts.type.destroy();
    const ctx = canvas.getContext('2d');
    const typeCounts = {};
    window.currentEvents.forEach(event => { const t = event.request_type || 'Unknown'; typeCounts[t]=(typeCounts[t]||0)+1; });
    charts.type = new Chart(ctx, { type:'bar', data:{ labels:Object.keys(typeCounts), datasets:[{ label:'Count', data:Object.values(typeCounts), backgroundColor:'#007bff' }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }

  async function updateDepartmentChart(){
    const canvas = document.getElementById('departmentChart');
    if (!canvas) {
      console.warn('Department chart canvas not found');
      return;
    }
    if (charts.department) charts.department.destroy();
    const ctx = canvas.getContext('2d');
    
    try {
      console.log('📊 Fetching department data...');
      // Fetch department counts from the API
      const departmentData = await window.apiService.getRequestCountByDepartment();
      console.log('Department data received:', departmentData);
      
      if (!departmentData || departmentData.length === 0) {
        console.warn('No department data available');
        // Show empty chart with message
        charts.department = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['No Data'],
            datasets: [{
              label: 'Total Requests',
              data: [0],
              backgroundColor: '#28a745'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
        return;
      }
      
      // Map department IDs to readable names
      const departmentNames = await Promise.all(
        departmentData.map(async (dept) => {
          const deptId = dept.requesterDepartmentid || dept.requesterDepartmentId;
          if (!deptId) return 'Unknown';
          try {
            const roleName = await window.apiService.getRoleName(deptId);
            return roleName || `Dept ${deptId}`;
          } catch (error) {
            return `Dept ${deptId}`;
          }
        })
      );
      
      const requestCounts = departmentData.map(dept => dept.totalRequests);
      
      console.log('Creating department chart with:', { departmentNames, requestCounts });
      
      charts.department = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: departmentNames,
          datasets: [{
            label: 'Total Requests',
            data: requestCounts,
            backgroundColor: '#28a745',
            borderColor: '#1e7e34',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Failed to load department chart:', error);
      // Show error chart
      charts.department = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Error'],
          datasets: [{
            label: 'Total Requests',
            data: [0],
            backgroundColor: '#dc3545'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  }

  function updateMetrics(){
    const completed = window.currentEvents.filter(e => e.status && e.status.includes('Done'));
    const total = window.currentEvents.length;
    const successRate = total>0 ? Math.round((completed.length/total)*100) : 0;
    const el = (id,val)=>{ const e=document.getElementById(id); if (e) e.textContent = val; };
    el('avg-completion','5 days');
    el('success-rate', `${successRate}%`);
    el('peak-day','Monday');
  }

  function updateChartsForNightMode(){
    Object.values(charts).forEach(chart => { if (chart && chart.options){ chart.options.plugins = chart.options.plugins || {}; chart.options.plugins.legend = chart.options.plugins.legend || {}; chart.options.plugins.legend.labels = { color: '#e9ecef' }; chart.update(); } });
  }

  function updateChartsForDayMode(){
    Object.values(charts).forEach(chart => { if (chart && chart.options){ chart.options.plugins = chart.options.plugins || {}; chart.options.plugins.legend = chart.options.plugins.legend || {}; chart.options.plugins.legend.labels = { color: '#495057' }; chart.update(); } });
  }

  // Expose
  window.initializeCharts = initializeCharts;
  window.loadAnalytics = loadAnalytics;
  window.updateChartsForNightMode = updateChartsForNightMode;
  window.updateChartsForDayMode = updateChartsForDayMode;
})();
