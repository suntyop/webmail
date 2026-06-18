import { useEffect, useState, useCallback } from 'react';
import { Loader2, Mail, X } from 'lucide-react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Topbar from './components/Topbar.jsx';
import Sidebar, { SCHEDULED_VIEW } from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import MessageView from './components/MessageView.jsx';
import Composer from './components/Composer.jsx';
import ScheduledView from './components/ScheduledView.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('INBOX');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // { uid, folder }
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composer, setComposer] = useState(null);

  const currentKind = folders.find((f) => f.path === folder)?.kind || 'inbox';

  useEffect(() => {
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const loadFolders = useCallback(() => {
    return api
      .folders()
      .then((data) => {
        setFolders(data.folders);
        if (!data.folders.some((f) => f.path === folder)) {
          const inbox = data.folders.find((f) => f.kind === 'inbox');
          if (inbox) setFolder(inbox.path);
        }
      })
      .catch(() => {});
  }, [folder]);

  useEffect(() => {
    if (user) loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function selectFolder(path) {
    setFolder(path);
    setSelected(null);
    setQuery('');
    setDrawerOpen(false);
  }

  function refresh() {
    setRefreshing(true);
    setReloadToken((t) => t + 1);
    loadFolders().finally(() => setTimeout(() => setRefreshing(false), 400));
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    setSelected(null);
    setFolders([]);
  }

  function onReply(mode, msg) {
    setComposer({ mode, original: { ...msg, folder } });
  }

  if (booting) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="h-full relative overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Fond ambiant + halos lumineux */}
      <div className="absolute inset-0 app-bg" />
      <div
        className="blob h-[28rem] w-[28rem] -top-40 -left-32"
        style={{ background: '#a5b4fc' }}
      />
      <div
        className="blob h-[26rem] w-[26rem] top-0 right-0"
        style={{ background: '#e9d5ff', animationDelay: '-6s' }}
      />
      <div
        className="blob h-[24rem] w-[24rem] bottom-[-6rem] left-1/3"
        style={{ background: '#bae6fd', animationDelay: '-12s' }}
      />

      <div className="relative z-10 h-full flex flex-col">
        <Topbar
          email={user.email}
          query={query}
          onSearch={(q) => {
            setQuery(q);
            setSelected(null);
          }}
          onRefresh={refresh}
          refreshing={refreshing}
          onMenu={() => setDrawerOpen(true)}
          onLogout={logout}
        />

        <div className="flex-1 flex min-h-0 gap-3 px-3 pb-3">
          {/* Sidebar desktop */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="h-full glass ring-glow rounded-3xl overflow-hidden">
              <Sidebar
                folders={folders}
                current={folder}
                onSelect={selectFolder}
                onCompose={() => setComposer({ mode: 'new' })}
              />
            </div>
          </aside>

          {/* Drawer mobile */}
          {drawerOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[82%] glass shadow-2xl animate-fade-in">
                <div className="flex justify-end p-2">
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-full text-slate-400 hover:bg-slate-500/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Sidebar
                  folders={folders}
                  current={folder}
                  onSelect={selectFolder}
                  onCompose={() => {
                    setComposer({ mode: 'new' });
                    setDrawerOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Zone principale en verre */}
          <main className="flex-1 min-w-0">
            <div className="h-full glass ring-glow rounded-3xl overflow-hidden">
              {folder === SCHEDULED_VIEW ? (
                <ScheduledView />
              ) : selected ? (
                <MessageView
                  key={`${selected.folder}-${selected.uid}`}
                  folder={selected.folder}
                  folderKind={currentKind}
                  uid={selected.uid}
                  onBack={() => setSelected(null)}
                  onReply={onReply}
                  onChanged={refresh}
                />
              ) : (
                <MessageList
                  folder={folder}
                  folderKind={currentKind}
                  query={query}
                  selectedUid={selected?.uid}
                  onOpen={(m) => setSelected({ uid: m.uid, folder })}
                  reloadToken={reloadToken}
                  onChanged={loadFolders}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {composer && (
        <Composer
          mode={composer.mode}
          original={composer.original}
          userEmail={user.email}
          onClose={() => setComposer(null)}
          onSent={() => {
            setComposer(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
