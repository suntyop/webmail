import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  ShieldAlert,
  Archive,
  Folder,
  Pencil,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { FOLDER_LABELS } from '../utils.js';

export const SCHEDULED_VIEW = '__scheduled__';

const ICONS = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  junk: ShieldAlert,
  archive: Archive,
  snoozed: Clock,
  other: Folder,
};

const ORDER = ['inbox', 'snoozed', 'sent', 'drafts', 'archive', 'junk', 'trash', 'other'];

export default function Sidebar({ folders, current, onSelect, onCompose }) {
  const sorted = [...folders].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 py-3">
      <div className="px-3 mb-3">
        <button
          onClick={onCompose}
          className="group w-full flex items-center justify-center gap-2.5 h-12 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Pencil className="h-[18px] w-[18px] transition-transform group-hover:-rotate-12" />
          Nouveau message
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sorted.map((f) => {
          const Icon = ICONS[f.kind] || Folder;
          const label = FOLDER_LABELS[f.kind] || f.name;
          const active = f.path === current;
          return (
            <button
              key={f.path}
              onClick={() => onSelect(f.path)}
              className={`group w-full flex items-center gap-4 pl-4 pr-3 h-9 rounded-r-full text-sm transition ${
                active
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left truncate">{label}</span>
              {f.unseen > 0 && (
                <span
                  className={`text-xs font-medium ${
                    active ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-500'
                  }`}
                >
                  {f.unseen}
                </span>
              )}
            </button>
          );
        })}

        {/* Vue virtuelle : envois différés & reports */}
        <button
          onClick={() => onSelect(SCHEDULED_VIEW)}
          className={`group w-full flex items-center gap-4 pl-4 pr-3 h-9 rounded-r-full text-sm transition ${
            current === SCHEDULED_VIEW
              ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarClock className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left truncate">Programmés</span>
        </button>
      </nav>
    </div>
  );
}
