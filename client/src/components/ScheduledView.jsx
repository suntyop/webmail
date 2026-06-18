import { useEffect, useState } from 'react';
import { Clock, Send, X, Loader2, CalendarClock } from 'lucide-react';
import { api } from '../api.js';
import { formatDate } from '../utils.js';

export default function ScheduledView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .listScheduled()
      .then((d) => setItems(d.items.sort((a, b) => a.dueAt - b.dueAt)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    api.cancelScheduled(id).catch(load);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 h-12 border-b border-slate-200/40 dark:border-slate-700/30">
        <CalendarClock className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Programmés
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-slate-300 dark:text-slate-600">
            <CalendarClock className="h-12 w-12 mb-3" strokeWidth={1.5} />
            <p className="text-sm">Aucun envoi différé ni report en attente</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                    i.type === 'send'
                      ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'
                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600'
                  }`}
                >
                  {i.type === 'send' ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-100 truncate">
                    {i.subject || '(sans objet)'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {i.type === 'send'
                      ? `Envoi à ${i.to || '—'}`
                      : 'Réapparaît dans la boîte de réception'}
                    {' · '}
                    {formatDate(i.dueAt)}
                  </p>
                </div>
                <button
                  onClick={() => cancel(i.id)}
                  title="Annuler"
                  className="p-2 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
