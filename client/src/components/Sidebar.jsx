import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  ShieldAlert,
  Archive,
  Folder,
  PenSquare,
  LogOut,
  Mail,
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

export default function Sidebar({
  folders,
  current,
  onSelect,
  onCompose,
  email,
  onLogout,
}) {
  const sorted = [...folders].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 px-4 h-16 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <span className="font-semibold text-slate-800 dark:text-slate-100">Webmail</span>
      </div>

      <div className="px-3">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] transition"
        >
          <PenSquare className="h-4 w-4" />
          Nouveau message
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {sorted.map((f) => {
          const Icon = ICONS[f.kind] || Folder;
          const label = FOLDER_LABELS[f.kind] || f.name;
          const active = f.path === current;
          return (
            <button
              key={f.path}
              onClick={() => onSelect(f.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{label}</span>
              {f.unseen > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {f.unseen}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 dark:text-slate-500">Connecté</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{email}</p>
          </div>
          <button
            onClick={onLogout}
            title="Se déconnecter"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
