// Shared date utilities attached to MSA.date
// Local date parsing avoids timezone shifts by anchoring at midnight local.
(function(){
  const dateNS = window.MSA.date;
  function parseLocalDate(dateString){ return new Date(dateString + 'T00:00:00'); }
  function formatLocalYMD(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
  function addDaysLocal(dateString, days){ const dt=parseLocalDate(dateString); dt.setDate(dt.getDate()+days); return formatLocalYMD(dt); }

  // New helpers for urgency/overdue calculations (shared across modules)
  function computeDueMeta(postingDate){
    const due = parseLocalDate(postingDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.ceil((due - today)/(1000*60*60*24));
    return {
      dueDate: due,
      daysUntilDue: diffDays,
      isOverdue: diffDays < 0,
      isUrgent: diffDays <= 2 && diffDays >= 0,
      isSoon: diffDays <= 7 && diffDays >= 3
    };
  }

  dateNS.parseLocalDate = parseLocalDate;
  dateNS.formatLocalYMD = formatLocalYMD;
  dateNS.addDaysLocal = addDaysLocal;
  dateNS.computeDueMeta = computeDueMeta;
})();
