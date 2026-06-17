import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Loader2,
  Paperclip,
  Download,
  Mail,
} from 'lucide-react';
import { api } from '../api.js';
import { formatDate, displayName, initials, avatarColor, formatSize } from '../utils.js';

function HtmlFrame({ html }) {
  const ref = useRef(null);
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
    <base target="_blank">
    <style>
      body{margin:0;padding:16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:15px;line-height:1.6;word-wrap:break-word;overflow-wrap:break-word;}
      img{max-width:100%;height:auto;}
      a{color:#4f46e5;}
      table{max-width:100%;}
      blockquote{margin:0 0 0 8px;padding-left:12px;border-left:3px solid #e2e8f0;color:#475569;}
      @media (prefers-color-scheme: dark){body{color:#e2e8f0;background:#0f172a;}blockquote{border-color:#334155;color:#94a3b8;}}
    </style></head><body>${clean}</body></html>`;

  function onLoad() {
    const frame = ref.current;
    if (!frame) return;
    try {
      const h = frame.contentWindow.document.body.scrollHeight;
      frame.style.height = h + 24 + 'px';
    } catch {
      /* ignore */
    }
  }

  return (
    <iframe
      ref={ref}
      title="Contenu du message"
      sandbox="allow-same-origin allow-popups"
      srcDoc={srcDoc}
      onLoad={onLoad}
      className="w-full border-0"
      style={{ minHeight: 120 }}
    />
  );
}

export default function MessageView({ folder, uid, onBack, onReply, onDeleted }) {
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .message(folder, uid)
      .then((data) => {
        if (!active) return;
        setMsg(data);
        setFlagged(Boolean(data.flagged));
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [folder, uid]);

  async function toggleStar() {
    const next = !flagged;
    setFlagged(next);
    try {
      await api.setFlags(folder, uid, { flagged: next });
    } catch {
      setFlagged(!next);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce message ?')) return;
    setBusy(true);
    try {
      await api.remove(folder, uid);
      onDeleted?.();
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-sm text-rose-500">{error}</div>;
  }

  if (!msg) return null;

  const sender = msg.from?.[0];

  const ActionBtn = ({ icon: Icon, label, onClick, danger }) => (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50 ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-fade-in">
      {/* Barre d'actions */}
      <div className="shrink-0 flex items-center gap-1 px-2 sm:px-4 h-14 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ActionBtn icon={Reply} label="Répondre" onClick={() => onReply('reply', msg)} />
        <ActionBtn
          icon={ReplyAll}
          label="Répondre à tous"
          onClick={() => onReply('replyAll', msg)}
        />
        <ActionBtn icon={Forward} label="Transférer" onClick={() => onReply('forward', msg)} />
        <div className="flex-1" />
        <button
          onClick={toggleStar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Favori"
        >
          <Star
            className={`h-4 w-4 ${flagged ? 'text-amber-400 fill-amber-400' : ''}`}
          />
        </button>
        <ActionBtn icon={Trash2} label="Supprimer" onClick={handleDelete} danger />
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 break-words">
            {msg.subject}
          </h1>

          <div className="flex items-start gap-3 mb-5">
            <div
              className={`h-10 w-10 shrink-0 rounded-full ${avatarColor(
                sender?.address
              )} text-white text-sm font-semibold flex items-center justify-center`}
            >
              {initials(sender)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {sender?.name || sender?.address}
                </span>
                {sender?.name && (
                  <span className="text-xs text-slate-400">&lt;{sender.address}&gt;</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                À&nbsp;: {displayName(msg.to) || '—'}
                {msg.cc?.length ? ` · Cc : ${displayName(msg.cc)}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{formatDate(msg.date)}</span>
          </div>

          {/* Pièces jointes */}
          {msg.attachments?.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {msg.attachments.map((att) => (
                <a
                  key={att.index}
                  href={api.attachmentUrl(folder, uid, att.index)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 transition group"
                >
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                      {att.filename}
                    </p>
                    <p className="text-xs text-slate-400">{formatSize(att.size)}</p>
                  </div>
                  <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                </a>
              ))}
            </div>
          )}

          {/* Corps */}
          <div className="rounded-xl overflow-hidden">
            {msg.html ? (
              <HtmlFrame html={msg.html} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                {msg.text || (
                  <span className="text-slate-400 flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Message vide
                  </span>
                )}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
