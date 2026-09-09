'use client';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDays(rangeSize = 7) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: rangeSize }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + index);

    let label;
    if (index === 0) label = "Aujourd'hui";
    else if (index === 1) label = 'Demain';
    else label = `${DAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()}`;

    return { iso: toISODate(date), label };
  });
}

export default function DateSelector({ selectedDate, onSelectDate }) {
  const days = buildDays(7);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
      {days.map((day) => {
        const isActive = day.iso === selectedDate;
        return (
          <button
            key={day.iso}
            onClick={() => onSelectDate(day.iso)}
            aria-pressed={isActive}
            className={[
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors border',
              isActive
                ? 'bg-signal-home/15 border-signal-home/40 text-signal-home'
                : 'bg-base-800 border-line text-ink-500 hover:text-ink-100 hover:border-ink-700',
            ].join(' ')}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
