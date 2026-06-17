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
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
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

      <div className="flex-1 flex min-h-0">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          <Sidebar
            folders={folders}
            current={folder}
            onSelect={selectFolder}
            onCompose={() => setComposer({ mode: 'new' })}
          />
        </aside>

        {/* Drawer mobile */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[82%] bg-white dark:bg-slate-900 shadow-2xl animate-fade-in">
              <div className="flex justify-end p-2">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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

        {/* Zone principale : carte arrondie façon Gmail */}
        <main className="flex-1 min-w-0 lg:py-3 lg:pr-3">
          <div className="h-full bg-white dark:bg-slate-900 lg:rounded-2xl lg:shadow-sm lg:border border-slate-200 dark:border-slate-800 overflow-hidden">
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
