import { useEffect, useRef, useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { presetTimes, toLocalInputValue } from '../utils.js';

/**
 * Petit menu pour choisir un moment : créneaux prédéfinis + date personnalisée.
 * Appelle onPick(Date) une fois un choix validé.
 */
export default function SchedulePopover({
  title,
  onPick,
  onClose,
  align = 'left',
  direction = 'up',
  modal = false,
}) {
  const ref = useRef(null);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const presets = presetTimes();

  function confirmCustom() {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime()) && d > new Date()) onPick(d);
  }

  const positionCls = modal
    ? 'w-72'
    : `absolute z-50 w-64 ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} ${
        align === 'right' ? 'right-0' : 'left-0'
      }`;

  const card = (
    <div
      ref={ref}
      className={`${positionCls} rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 p-2 animate-fade-in`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        <Clock className="h-3.5 w-3.5" />
        {title}
      </div>

      {!custom ? (
        <>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => onPick(p.date)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <span>{p.label}</span>
              <span className="text-xs text-slate-400">
                {p.date.toLocaleString('fr-FR', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </button>
          ))}
          <button
            onClick={() => setCustom(true)}
            className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
          >
            Date & heure précises
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="p-2 space-y-2">
          <input
            type="datetime-local"
            value={value}
            min={toLocalInputValue(new Date())}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCustom(false)}
              className="flex-1 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Retour
            </button>
            <button
              onClick={confirmCustom}
              className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        {card}
      </div>
    );
  }
  return card;
}
