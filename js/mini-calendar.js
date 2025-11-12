// Mini Calendar module extracted from script.js
// Exposes window.loadMiniCalendar; relies on global currentEvents and escapeHtml
window.loadMiniCalendar = function loadMiniCalendar() {
  const container = document.getElementById('mini-calendar');
  if (!container) return;

  const events = window.currentEvents || currentEvents;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthEvents = (events || []).filter(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const eventsByDay = {};
  monthEvents.forEach(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    const day = dueDate.getDate();
    (eventsByDay[day] ||= []).push(e);
  });

  let calendarHTML = `
    <div class="mini-cal-header">
      <div class="mini-cal-month">${monthName}</div>
    </div>
    <div class="mini-cal-grid">
      <div class="mini-cal-weekday">Su</div>
      <div class="mini-cal-weekday">Mo</div>
      <div class="mini-cal-weekday">Tu</div>
      <div class="mini-cal-weekday">We</div>
      <div class="mini-cal-weekday">Th</div>
      <div class="mini-cal-weekday">Fr</div>
      <div class="mini-cal-weekday">Sa</div>`;

  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="mini-cal-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const dayEvents = eventsByDay[day] || [];
    const hasEvents = dayEvents.length > 0;

    let statusClass = '';
    let eventIndicator = '';
    let tooltipContent = '';

    if (hasEvents) {
      const hasPending = dayEvents.some(e => e.status && (e.status.includes('Queue') || e.status.includes('Progress') || e.status.includes('Awaiting')));
      const hasDone = dayEvents.some(e => e.status && e.status.includes('Done'));
      const hasBlocked = dayEvents.some(e => e.status && e.status.includes('Blocked'));
      if (hasBlocked) statusClass = 'has-blocked';
      else if (hasPending) statusClass = 'has-pending';
      else if (hasDone) statusClass = 'has-done';
      eventIndicator = `<div class="mini-cal-dots">${'•'.repeat(Math.min(dayEvents.length, 3))}</div>`;
      tooltipContent = dayEvents.map(e => {
        const statusEmoji = e.status?.includes('Done') ? '✅' : e.status?.includes('Blocked') ? '🚫' : e.status?.includes('Progress') ? '🔄' : e.status?.includes('Awaiting') ? '⏳' : '📥';
        return `${statusEmoji} ${escapeHtml(e.title)}`;
      }).join('&#10;');
    }

    calendarHTML += `
      <div class="mini-cal-day ${isToday ? 'today' : ''} ${statusClass}" data-day="${day}" data-has-events="${hasEvents}" title="${tooltipContent || 'No events'}">
        <span class="mini-cal-day-number">${day}</span>
        ${eventIndicator}
      </div>`;
  }
  calendarHTML += '</div>';

  const upcomingCount = (events || []).filter(e => {
    const dueDate = new Date(e.posting_date + 'T00:00:00');
    const isDone = !!(e.status && e.status.includes('Done'));
    const isBlocked = !!(e.status && e.status.includes('Blocked'));
    return dueDate >= today && !isDone && !isBlocked;
  }).length;

  calendarHTML += `<div class="mini-cal-footer"><span class="mini-cal-stat">📌 ${upcomingCount} upcoming</span><span class="mini-cal-stat">📋 ${monthEvents.length} this month</span></div>`;
  container.innerHTML = calendarHTML;

  container.querySelectorAll('.mini-cal-day[data-has-events="true"]').forEach(dayEl => {
    const day = parseInt(dayEl.dataset.day);
    const dayEvents = eventsByDay[day] || [];
    if (dayEvents.length === 0) return;
    dayEl.addEventListener('mouseenter', () => {
      document.querySelectorAll('.mini-cal-tooltip').forEach(t => t.remove());
      const tooltip = document.createElement('div');
      tooltip.className = 'mini-cal-tooltip';
      const eventList = dayEvents.map(ev => {
        const statusEmoji = ev.status?.includes('Done') ? '✅' : ev.status?.includes('Blocked') ? '🚫' : ev.status?.includes('Progress') ? '🔄' : ev.status?.includes('Awaiting') ? '⏳' : '📥';
        return `<div class=\"mini-cal-tooltip-item\">${statusEmoji} ${escapeHtml(ev.title)}</div>`;
      }).join('');
      tooltip.innerHTML = `<div class=\"mini-cal-tooltip-header\">${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''} on ${monthName} ${day}</div><div class=\"mini-cal-tooltip-list\">${eventList}</div>`;
      document.body.appendChild(tooltip);
      const rect = dayEl.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.bottom + 8;
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
      if (top + tooltipRect.height > window.innerHeight - 10) top = rect.top - tooltipRect.height - 8;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    dayEl.addEventListener('mouseleave', () => {
      setTimeout(() => document.querySelectorAll('.mini-cal-tooltip').forEach(t => t.remove()), 100);
    });
  });
};