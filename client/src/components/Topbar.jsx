import { useState, useRef, useEffect } from 'react';
import { Menu, Search, RefreshCw, LogOut, X, Mail } from 'lucide-react';
import { initials, avatarColor } from '../utils.js';

export default function Topbar({
  email,
  query,
  onSearch,
  onRefresh,
  refreshing,
  onMenu,
  onLogout,
}) {
  const [value, setValue] = useState(query);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setValue(query), [query]);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submit(e) {
    e.preventDefault();
    onSearch(value.trim());
  }
  function clear() {
    setValue('');
    onSearch('');
  }

  return (
    <header className="h-16 shrink-0 flex items-center gap-2 px-3 sm:px-5">
      <button
        onClick={onMenu}
        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5 w-[200px] shrink-0">
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-gradient hidden sm:block">
          Webmail
        </span>
      </div>

      {/* Recherche */}
      <form onSubmit={submit} className="flex-1 max-w-2xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Rechercher dans les messages"
            className="w-full pl-12 pr-10 py-2.5 rounded-full glass text-[15px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-sm focus:shadow-md transition"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-slate-500/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onRefresh}
          title="Actualiser"
          className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`h-9 w-9 rounded-full ${avatarColor(
              email
            )} text-white text-sm font-semibold flex items-center justify-center ring-2 ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700 transition`}
          >
            {initials({ address: email })}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl glass shadow-2xl p-2 z-50 animate-fade-in">
              <div className="flex items-center gap-3 px-3 py-2">
                <div
                  className={`h-10 w-10 rounded-full ${avatarColor(
                    email
                  )} text-white font-semibold flex items-center justify-center`}
                >
                  {initials({ address: email })}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Connecté en tant que</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {email}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
