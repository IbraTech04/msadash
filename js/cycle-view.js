// Cycle View module: builds the Current/Next cycle panels
// Depends on window.apiService/window.api

(function(){
  const parseLocalDate = window.MSA?.date?.parseLocalDate || (s => new Date(s + 'T00:00:00'));

  // Cycle configuration - matches main-calendar.js
  const CYCLE_START_DATE = new Date('2025-11-02T00:00:00'); // November 2nd, 2025
  const CYCLE_LENGTH_DAYS = 14; // 2 weeks

  // Generate cycle data for guest mode (calculates current cycle based on date)
  function generateGuestCycleData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(CYCLE_START_DATE);
    startDate.setHours(0, 0, 0, 0);
    
    // Calculate which cycle we're in
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const cycleNumber = Math.floor(daysSinceStart / CYCLE_LENGTH_DAYS);
    
    // Calculate current development cycle
    const currentCycleStart = new Date(startDate);
    currentCycleStart.setDate(currentCycleStart.getDate() + (cycleNumber * CYCLE_LENGTH_DAYS));
    
    const currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setDate(currentCycleEnd.getDate() + CYCLE_LENGTH_DAYS - 1);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      currentDevelopmentCycle: {
        cycleNumber: cycleNumber + 1, // Display as 1-indexed
        developmentStart: formatDate(currentCycleStart),
        developmentEnd: formatDate(currentCycleEnd)
      }
    };
  }

  async function loadCycleView(){
    const container = document.getElementById('cycle-view-content');
    if (!container) return;
    const api = window.apiService || window.api;
    
    try {
      let cycleData;
      
      // Try to fetch from API first (works for both guest and authenticated users)
      try {
        cycleData = await api.request('/api/workload/cycle-info','GET');
      } catch (error) {
        console.warn('⚠️ Failed to fetch cycle info from API, using local calculation:', error);
        // Fallback to local calculation if API fails
        cycleData = generateGuestCycleData();
      }
      
      const today = new Date(); today.setHours(0,0,0,0);
      let content = '';
      if (cycleData.currentDevelopmentCycle){
        const dev = cycleData.currentDevelopmentCycle;
        const startDate = parseLocalDate(dev.developmentStart);
        const endDate = parseLocalDate(dev.developmentEnd);
        const totalDays = Math.ceil((endDate - startDate)/(1000*60*60*24)) + 1;
        const daysElapsed = Math.max(0, Math.ceil((today - startDate)/(1000*60*60*24)));
        const daysRemaining = Math.max(0, Math.ceil((endDate - today)/(1000*60*60*24)));
        const progress = Math.min(100, Math.round((daysElapsed/totalDays)*100));
        content += `
          <div class="cycle-section cycle-dev-section">
            <div class="cycle-header">
              <span class="cycle-badge dev">🎨 Development</span>
              <span class="cycle-number">Cycle ${dev.cycleNumber}</span>
            </div>
            <div class="cycle-dates"><span>📅 ${startDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${endDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
            <div class="cycle-progress">
              <div class="progress-bar"><div class="progress-fill dev" style="width: ${progress}%"></div></div>
              <div class="progress-text">${daysElapsed} of ${totalDays} days (${progress}%)</div>
            </div>
            <div class="cycle-stats">
              <div class="cycle-stat"><span class="cycle-stat-label">Days Remaining</span><span class="cycle-stat-value">${daysRemaining}</span></div>
              <div class="cycle-stat"><span class="cycle-stat-label">Task Day</span><span class="cycle-stat-value">${endDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
            </div>
          </div>`;
      }
      // Build next cycle section - use API data if available, otherwise calculate
      if (cycleData.nextDevelopmentCycle) {
        // Use API-provided next cycle data
        const next = cycleData.nextDevelopmentCycle;
        const nextDevStart = parseLocalDate(next.developmentStart);
        const nextDevEnd = parseLocalDate(next.developmentEnd);
        const nextCycleNumber = next.cycleNumber;
        const daysUntilNext = Math.ceil((nextDevStart - today)/(1000*60*60*24));
        // Posting window for next cycle starts after the next development cycle ends
        const nextPostStart = new Date(nextDevEnd); nextPostStart.setDate(nextPostStart.getDate() + 1);
        const nextPostEnd = new Date(nextPostStart); nextPostEnd.setDate(nextPostEnd.getDate() + 13);
        const daysUntilPosting = Math.ceil((nextPostStart - today)/(1000*60*60*24));
        content += `
          <div class="cycle-section cycle-next-section">
            <div class="cycle-header"><span class="cycle-badge next">⏭️ Next Cycle</span><span class="cycle-number">Cycle ${nextCycleNumber}</span></div>
            <div class="cycle-dates"><span>📅 ${nextDevStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${nextDevEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
            <div class="cycle-stats">
              <div class="cycle-stat"><span class="cycle-stat-label">Starts In</span><span class="cycle-stat-value">${daysUntilNext} days</span></div>
              <div class="cycle-stat"><span class="cycle-stat-label">Duration</span><span class="cycle-stat-value">14 days</span></div>
            </div>
            <div class="cycle-note">ℹ️ Next development phase starts after current cycle ends</div>
            <div class="cycle-posting-info">
              <div class="posting-header">📅 Posting Window</div>
              <div class="posting-dates"><span>${nextPostStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${nextPostEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
              <div class="posting-note">Content produced in this cycle will be posted during this window (${daysUntilPosting} days from now)</div>
            </div>
          </div>`;
      } else if (cycleData.currentDevelopmentCycle){
        // Calculate next cycle from current cycle
        const dev = cycleData.currentDevelopmentCycle;
        const currentDevEnd = parseLocalDate(dev.developmentEnd);
        // Next development cycle starts immediately after current one ends
        const nextDevStart = new Date(currentDevEnd); nextDevStart.setDate(nextDevStart.getDate() + 1);
        const nextDevEnd = new Date(nextDevStart); nextDevEnd.setDate(nextDevStart.getDate() + 13);
        const nextCycleNumber = dev.cycleNumber + 1;
        const daysUntilNext = Math.ceil((nextDevStart - today)/(1000*60*60*24));
        // Posting window for next cycle starts after the next development cycle ends
        const nextPostStart = new Date(nextDevEnd); nextPostStart.setDate(nextPostStart.getDate() + 1);
        const nextPostEnd = new Date(nextPostStart); nextPostEnd.setDate(nextPostEnd.getDate() + 13);
        const daysUntilPosting = Math.ceil((nextPostStart - today)/(1000*60*60*24));
        content += `
          <div class="cycle-section cycle-next-section">
            <div class="cycle-header"><span class="cycle-badge next">⏭️ Next Cycle</span><span class="cycle-number">Cycle ${nextCycleNumber}</span></div>
            <div class="cycle-dates"><span>📅 ${nextDevStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${nextDevEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
            <div class="cycle-stats">
              <div class="cycle-stat"><span class="cycle-stat-label">Starts In</span><span class="cycle-stat-value">${daysUntilNext} days</span></div>
              <div class="cycle-stat"><span class="cycle-stat-label">Duration</span><span class="cycle-stat-value">14 days</span></div>
            </div>
            <div class="cycle-note">ℹ️ Next development phase starts after current cycle ends</div>
            <div class="cycle-posting-info">
              <div class="posting-header">📅 Posting Window</div>
              <div class="posting-dates"><span>${nextPostStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${nextPostEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
              <div class="posting-note">Content produced in this cycle will be posted during this window (${daysUntilPosting} days from now)</div>
            </div>
          </div>`;
      }
      if (!content) content = '<div class="cycle-empty">No active cycle information available</div>';
      container.innerHTML = content;
    } catch (error) {
      console.error('❌ Failed to load cycle info:', error);
      container.innerHTML = '<div class="cycle-error">Unable to load cycle information</div>';
    }
  }

  window.loadCycleView = loadCycleView;
})();
