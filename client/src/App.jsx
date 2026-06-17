import { useEffect, useState, useCallback } from 'react';
import { Menu, Loader2, Mail } from 'lucide-react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import MessageView from './components/MessageView.jsx';
import Composer from './components/Composer.jsx';
import { FOLDER_LABELS } from './utils.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('INBOX');
  const [selected, setSelected] = useState(null); // { uid, folder }
  const [reloadToken, setReloadToken] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composer, setComposer] = useState(null); // { mode, original }

  const currentKind = folders.find((f) => f.path === folder)?.kind || 'inbox';

  // Vérifie une session existante au démarrage.
  useEffect(() => {
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const loadFolders = useCallback(() => {
    api
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
    setDrawerOpen(false);
  }

  function openMessage(m) {
    setSelected({ uid: m.uid, folder });
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    setSelected(null);
    setFolders([]);
  }

  function refresh() {
    setReloadToken((t) => t + 1);
    loadFolders();
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
    <div className="h-full flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0">
        <Sidebar
          folders={folders}
          current={folder}
          onSelect={selectFolder}
          onCompose={() => setComposer({ mode: 'new' })}
          email={user.email}
          onLogout={logout}
        />
      </aside>

      {/* Sidebar — drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[80%] animate-fade-in">
            <Sidebar
              folders={folders}
              current={folder}
              onSelect={selectFolder}
              onCompose={() => {
                setComposer({ mode: 'new' });
                setDrawerOpen(false);
              }}
              email={user.email}
              onLogout={logout}
            />
          </div>
        </div>
      )}

      {/* Liste — masquée sur mobile quand un message est ouvert */}
      <section
        className={`w-full lg:w-96 shrink-0 lg:border-r border-slate-200 dark:border-slate-800 flex-col ${
          selected ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Barre mobile avec menu */}
        <div className="lg:hidden flex items-center gap-2 px-2 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {FOLDER_LABELS[currentKind] || folder}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <MessageList
            folder={folder}
            folderKind={currentKind}
            selectedUid={selected?.uid}
            onOpen={openMessage}
            reloadToken={reloadToken}
          />
        </div>
      </section>

      {/* Vue message */}
      <main className={`flex-1 min-w-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          <MessageView
            key={`${selected.folder}-${selected.uid}`}
            folder={selected.folder}
            uid={selected.uid}
            onBack={() => setSelected(null)}
            onReply={onReply}
            onDeleted={() => {
              setSelected(null);
              refresh();
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <Mail className="h-16 w-16 mb-3" />
            <p className="text-sm">Sélectionnez un message à lire</p>
          </div>
        )}
      </main>

      {/* Fenêtre de composition */}
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
