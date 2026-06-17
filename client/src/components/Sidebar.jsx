import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  ShieldAlert,
  Archive,
  Folder,
  Pencil,
} from 'lucide-react';
import { FOLDER_LABELS } from '../utils.js';

const ICONS = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  junk: ShieldAlert,
  archive: Archive,
  other: Folder,
};

const ORDER = ['inbox', 'sent', 'drafts', 'archive', 'junk', 'trash', 'other'];

export default function Sidebar({ folders, current, onSelect, onCompose }) {
  const sorted = [...folders].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 py-3">
      <div className="px-3 mb-2">
        <button
          onClick={onCompose}
          className="flex items-center gap-3 pl-4 pr-6 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-slate-200/70 dark:shadow-black/30 border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.99] transition text-slate-700 dark:text-slate-100"
        >
          <span className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Pencil className="h-4 w-4 text-white" />
          </span>
          <span className="font-medium">Nouveau message</span>
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
      </nav>
    </div>
  );
}
