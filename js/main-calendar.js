// Main Calendar module: renders FullCalendar with interactive cycle highlighting
// Depends on window.apiService/window.api, window.currentEvents, and global showEventModal

(function(){
  // Cycle configuration
  const CYCLE_START_DATE = new Date('2025-11-02T00:00:00'); // November 2nd, 2025
  const CYCLE_LENGTH_DAYS = 14; // 2 weeks
  
  let cycleViewMode = false;
  let isShiftPressed = false;
  
  // Use shared date helpers
  const parseLocalDate = window.MSA?.date?.parseLocalDate || (s => new Date(s + 'T00:00:00'));
  
  // Calculate which cycle a date belongs to
  function getCycleNumber(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const startDate = new Date(CYCLE_START_DATE);
    startDate.setHours(0, 0, 0, 0);
    
    const daysSinceStart = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / CYCLE_LENGTH_DAYS);
  }
  
  // Get cycle start and end dates
  function getCycleDates(cycleNumber) {
    const startDate = new Date(CYCLE_START_DATE);
    startDate.setDate(startDate.getDate() + (cycleNumber * CYCLE_LENGTH_DAYS));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + CYCLE_LENGTH_DAYS - 1);
    
    return { start: startDate, end: endDate };
  }
  
  // Format date as YYYY-MM-DD
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // Clear all cycle highlights
  function clearCycleHighlights() {
    document.querySelectorAll('.fc-daygrid-day').forEach(cell => {
      cell.classList.remove('cycle-request', 'cycle-production', 'cycle-posting');
      const label = cell.querySelector('.cycle-label');
      if (label) label.remove();
    });
  }
  
  // Highlight cycles based on hovered date
  function highlightCycles(hoveredDate, shiftPressed) {
    clearCycleHighlights();
    
    const hoveredCycle = getCycleNumber(hoveredDate);
    
    let requestCycle, productionCycle, postingCycle;
    
    if (shiftPressed) {
      // SHIFT pressed: hovered = posting, previous cycles for production/request
      postingCycle = hoveredCycle;
      productionCycle = hoveredCycle - 1;
      requestCycle = hoveredCycle - 2;
    } else {
      // Normal: hovered = request, next cycles for production/posting
      requestCycle = hoveredCycle;
      productionCycle = hoveredCycle + 1;
      postingCycle = hoveredCycle + 2;
    }
    
    const cycles = [
      { number: requestCycle, label: 'Request Window', className: 'cycle-request' },
      { number: productionCycle, label: 'Production Window', className: 'cycle-production' },
      { number: postingCycle, label: 'Posting Window', className: 'cycle-posting' }
    ];
    
    cycles.forEach(cycle => {
      if (cycle.number < 0) return; // Don't highlight cycles before start date
      
      const { start, end } = getCycleDates(cycle.number);
      
      document.querySelectorAll('.fc-daygrid-day').forEach(cell => {
        const dateAttr = cell.getAttribute('data-date');
        if (!dateAttr) return;
        
        const cellDate = new Date(dateAttr + 'T00:00:00');
        cellDate.setHours(0, 0, 0, 0);
        
        if (cellDate >= start && cellDate <= end) {
          cell.classList.add(cycle.className);
          
          // Add label to first day of cycle
          if (cellDate.getTime() === start.getTime()) {
            const existing = cell.querySelector('.cycle-label');
            if (!existing) {
              const label = document.createElement('div');
              label.className = 'cycle-label';
              label.textContent = cycle.label;
              cell.querySelector('.fc-daygrid-day-top')?.appendChild(label);
            }
          }
        }
      });
    });
  }
  
  // Toggle cycle view mode
  function toggleCycleView() {
    cycleViewMode = !cycleViewMode;
    const toggleBtn = document.getElementById('cycle-view-toggle');
    
    if (cycleViewMode) {
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        const textEl = toggleBtn.querySelector('.toggle-text');
        if (textEl) textEl.textContent = 'Cycle View: ON';
      }
      enableCycleView();
    } else {
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        const textEl = toggleBtn.querySelector('.toggle-text');
        if (textEl) textEl.textContent = 'Cycle View: OFF';
      }
      disableCycleView();
    }
  }
  
  // Enable cycle view mode
  function enableCycleView() {
    // Replace FullCalendar with scrollable multi-week cycle view
    if (window.currentCalendar) {
      try { window.currentCalendar.destroy(); } catch(e) {}
      window.currentCalendar = null;
    }
    // Fade out any existing content
    const cal = document.getElementById('main-calendar');
    if (cal) {
      cal.classList.remove('calendar-fade-enter-active');
      cal.classList.add('calendar-fade-leave');
      cal.offsetHeight; // reflow
      cal.classList.add('calendar-fade-leave-active');
      setTimeout(() => {
        cal.classList.remove('calendar-fade-leave','calendar-fade-leave-active');
        renderScrollableMonthsCycleCalendar();
        cal.classList.add('calendar-fade-enter');
        cal.offsetHeight;
        cal.classList.add('calendar-fade-enter-active');
        setTimeout(()=> cal.classList.remove('calendar-fade-enter','calendar-fade-enter-active'), 450);
      }, 260);
    } else {
      renderScrollableMonthsCycleCalendar();
    }
  }
  
  // Disable cycle view mode
  function disableCycleView() {
    clearCycleHighlights();
    const weekWrapper = document.getElementById('cycle-scroll-wrapper');
    if (weekWrapper) weekWrapper.remove();
    const monthsWrapper = document.getElementById('cycle-months-wrapper');
    const cal = document.getElementById('main-calendar');
    if (cal) {
      cal.classList.remove('calendar-fade-enter-active');
      cal.classList.add('calendar-fade-leave');
      cal.offsetHeight;
      cal.classList.add('calendar-fade-leave-active');
      setTimeout(()=>{
        if (monthsWrapper) monthsWrapper.remove();
        cal.classList.remove('calendar-fade-leave','calendar-fade-leave-active');
        loadMainCalendar();
        cal.classList.add('calendar-fade-enter');
        cal.offsetHeight;
        cal.classList.add('calendar-fade-enter-active');
        setTimeout(()=> cal.classList.remove('calendar-fade-enter','calendar-fade-enter-active'), 450);
      }, 260);
    } else {
      if (monthsWrapper) monthsWrapper.remove();
      loadMainCalendar();
    }
  }
  
  // Handle day hover
  function handleDayHover(e) {
    const dateAttr = e.currentTarget.getAttribute('data-date');
    if (!dateAttr) return;
    
    const date = new Date(dateAttr + 'T00:00:00');
    highlightCycles(date, isShiftPressed);
  }
  
  // Handle day leave
  function handleDayLeave() {
    // Keep highlights visible until hovering another day
  }
  
  // Track SHIFT key state
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      isShiftPressed = true;
      // Re-highlight if in cycle view and hovering
      const hovered = document.querySelector('.fc-daygrid-day:hover');
      if (cycleViewMode && hovered) {
        const dateAttr = hovered.getAttribute('data-date');
        if (dateAttr) {
          const date = new Date(dateAttr + 'T00:00:00');
          highlightCycles(date, true);
        }
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      isShiftPressed = false;
      // Re-highlight if in cycle view and hovering
      const hovered = document.querySelector('.fc-daygrid-day:hover');
      if (cycleViewMode && hovered) {
        const dateAttr = hovered.getAttribute('data-date');
        if (dateAttr) {
          const date = new Date(dateAttr + 'T00:00:00');
          highlightCycles(date, false);
        }
      }
    }
  });

  async function loadMainCalendar() {
    const calendarEl = document.getElementById('main-calendar');
    if (!calendarEl) return;
    if (window.calendarLoading) return;
    window.calendarLoading = true;
    
    try {
      // Ensure FullCalendar global is available
      if (typeof FullCalendar === 'undefined' || !FullCalendar.Calendar) {
        calendarEl.innerHTML = '<div class="loading error">⚠️ Calendar library not loaded.</div>';
        return;
      }
      if (window.currentCalendar) {
        try { window.currentCalendar.destroy(); window.currentCalendar = null; } catch(e){ console.warn('Error destroying calendar:', e); }
      }
      calendarEl.innerHTML = '';
      
      const api = window.apiService || window.api;
      let events = [];
      try {
        if (window.currentEvents && window.currentEvents.length) {
          events = window.currentEvents;
        } else if (typeof window.loadEvents === 'function') {
          events = await window.loadEvents();
        }
      } catch (e) {
        console.warn('Calendar: failed to fetch events, rendering empty calendar.', e);
        events = [];
      }
      
      const calendarEvents = cycleViewMode ? [] : events.map(event => {
        const dueDate = new Date(event.posting_date);
        const today = new Date(); today.setHours(0,0,0,0);
        const isDone = !!(event.status && event.status.includes('Done'));
        const isBlocked = !!(event.status && event.status.includes('Blocked'));
        const isOverdue = dueDate < today && !isDone && !isBlocked;
        const daysUntil = Math.ceil((dueDate - today) / (1000*60*60*24));
        const isUrgent = daysUntil <= 2 && daysUntil >= 0 && !isDone && !isBlocked;
        const color = api.getStatusColor(event.status);
        return { 
          id:`event-${event.channelID}`, 
          title: event.title, 
          start: event.posting_date, 
          extendedProps:{ 
            description:event.description, 
            assignedTo:event.assigned_to_name, 
            status:event.status, 
            requestType:event.request_type, 
            room:event.room, 
            signupUrl:event.signup_url, 
            originalEvent: event 
          }, 
          backgroundColor: color, 
          borderColor: color, 
          classNames:[ isOverdue ? 'event-overdue' : '', isUrgent ? 'event-urgent' : '' ].filter(Boolean) 
        };
      });

      window.currentCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        events: calendarEvents,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
        eventClick: function(info){ 
          if (info.event.extendedProps.originalEvent) { 
            showEventModal(info.event.extendedProps.originalEvent); 
          } 
        }
      });
      
      window.currentCalendar.render();
      // Force a size recalculation in case container had zero height during initial render
      try { window.currentCalendar.updateSize(); } catch(e) {}
      
      // Enable cycle view if it was active
      if (cycleViewMode) {
        setTimeout(() => enableCycleView(), 50);
      }
    } finally {
      window.calendarLoading = false;
    }
  }

  // Render custom scrollable cycle calendar (stacked month grids)
  function renderScrollableMonthsCycleCalendar() {
    const calendarEl = document.getElementById('main-calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';

    // Range based on cycles: from 4 cycles before current to 6 cycles ahead
    const today = new Date(); today.setHours(0,0,0,0);
    const currentCycle = getCycleNumber(today);
    const startCycle = Math.max(0, currentCycle - 4);
    const endCycle = currentCycle + 6;
    const firstCycleDates = getCycleDates(startCycle);
    const lastCycleDates = getCycleDates(endCycle);

    // Start from the 1st of the first month and end at the last day of the last month
    const startMonth = new Date(firstCycleDates.start.getFullYear(), firstCycleDates.start.getMonth(), 1);
    const endMonth = new Date(lastCycleDates.end.getFullYear(), lastCycleDates.end.getMonth(), 1);

    const wrapper = document.createElement('div');
    wrapper.id = 'cycle-months-wrapper';
    wrapper.className = 'cycle-months-wrapper';

    const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // Iterate month by month
    let iter = new Date(startMonth);
    while (iter <= endMonth) {
      const monthStart = new Date(iter.getFullYear(), iter.getMonth(), 1);
      const monthEnd = new Date(iter.getFullYear(), iter.getMonth()+1, 0);

      const monthSection = document.createElement('section');
      monthSection.className = 'cycle-month';

      const monthHeader = document.createElement('div');
      monthHeader.className = 'cycle-month-header';
      monthHeader.textContent = monthStart.toLocaleString(undefined, { month:'long', year:'numeric' });
      monthSection.appendChild(monthHeader);

      // Weekday header
      const weekdayHeader = document.createElement('div');
      weekdayHeader.className = 'cycle-weekday-header';
      weekdayNames.forEach(wd => {
        const el = document.createElement('div');
        el.className = 'cycle-weekday';
        el.textContent = wd;
        weekdayHeader.appendChild(el);
      });
      monthSection.appendChild(weekdayHeader);

      const grid = document.createElement('div');
      grid.className = 'cycle-month-grid';

      // Determine grid range: start on Sunday before first day, end on Saturday after last day
      const gridStart = new Date(monthStart);
      while (gridStart.getDay() !== 0) gridStart.setDate(gridStart.getDate()-1); // Sunday
      const gridEnd = new Date(monthEnd);
      while (gridEnd.getDay() !== 6) gridEnd.setDate(gridEnd.getDate()+1); // Saturday

      for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate()+1)) {
        const inMonth = d.getMonth() === monthStart.getMonth();
        const cell = document.createElement('div');
        cell.className = 'cycle-day-cell cycle-month-day fc-daygrid-day' + (inMonth ? '' : ' blank');
        cell.setAttribute('data-date', formatDate(d));

        const top = document.createElement('div');
        top.className = 'cycle-day-top fc-daygrid-day-top';
        top.innerHTML = '<span class="cycle-day-number">' + d.getDate() + '</span>';
        cell.appendChild(top);

        cell.addEventListener('mouseenter', handleDayHover);
        cell.addEventListener('mouseleave', handleDayLeave);
        grid.appendChild(cell);
      }

      monthSection.appendChild(grid);
      wrapper.appendChild(monthSection);
      // Move to next month
      iter.setMonth(iter.getMonth()+1);
    }

    calendarEl.appendChild(wrapper);
  }

  // Expose functions
  window.loadMainCalendar = loadMainCalendar;
  window.toggleCycleView = toggleCycleView;
})();
