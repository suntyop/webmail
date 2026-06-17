import { useState, useMemo } from 'react';
import { X, Send, Paperclip, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api.js';
import { displayName, formatDate, formatSize } from '../utils.js';

function htmlToText(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

function buildState(mode, original, userEmail) {
  if (!original || mode === 'new') {
    return { to: '', cc: '', subject: '', body: '' };
  }

  const origText = original.text || (original.html ? htmlToText(original.html) : '');
  const quoted = origText
    .split('\n')
    .map((l) => '> ' + l)
    .join('\n');
  const header = `\n\nLe ${formatDate(original.date)}, ${displayName(
    original.from
  )} a écrit :\n`;

  const self = (userEmail || '').toLowerCase();
  const sender = original.from?.[0]?.address || '';

  if (mode === 'reply' || mode === 'replyAll') {
    let cc = '';
    if (mode === 'replyAll') {
      const others = [...(original.to || []), ...(original.cc || [])]
        .map((a) => a.address)
        .filter((a) => a && a.toLowerCase() !== self && a.toLowerCase() !== sender.toLowerCase());
      cc = [...new Set(others)].join(', ');
    }
    return {
      to: sender,
      cc,
      subject: /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`,
      body: header + quoted,
    };
  }

  // forward
  const fwdHeader =
    `\n\n---------- Message transféré ----------\n` +
    `De : ${displayName(original.from)}\n` +
    `Date : ${formatDate(original.date)}\n` +
    `Objet : ${original.subject}\n` +
    `À : ${displayName(original.to)}\n\n`;
  return {
    to: '',
    cc: '',
    subject: /^fwd:/i.test(original.subject)
      ? original.subject
      : `Fwd: ${original.subject}`,
    body: fwdHeader + origText,
  };
}

export default function Composer({ mode = 'new', original, userEmail, onClose, onSent }) {
  const initial = useMemo(
    () => buildState(mode, original, userEmail),
    [mode, original, userEmail]
  );
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(Boolean(initial.cc));
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  function addFiles(list) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }
  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    if (!to.trim()) {
      setError('Indiquez au moins un destinataire.');
      return;
    }
    setError('');
    setSending(true);

    const fd = new FormData();
    fd.append('to', to.trim());
    if (cc.trim()) fd.append('cc', cc.trim());
    if (bcc.trim()) fd.append('bcc', bcc.trim());
    fd.append('subject', subject);
    fd.append('text', body);

    if (mode === 'reply' || mode === 'replyAll') {
      if (original?.messageId) {
        fd.append('inReplyTo', original.messageId);
        fd.append('references', original.messageId);
      }
      if (original?.uid) {
        fd.append('replyUid', original.uid);
        fd.append('replyFolder', original.folder);
      }
    }
    if (mode === 'forward' && original?.uid) {
      fd.append('forwardUid', original.uid);
      fd.append('forwardFolder', original.folder);
    }

    files.forEach((f) => fd.append('attachments', f));

    try {
      await api.send(fd);
      onSent?.();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  const title =
    mode === 'forward'
      ? 'Transférer'
      : mode === 'reply' || mode === 'replyAll'
        ? 'Répondre'
        : 'Nouveau message';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh] animate-fade-in">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2 space-y-px border-b border-slate-100 dark:border-slate-800 shrink-0">
            <Field label="À">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinataire@exemple.com"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowCc((v) => !v)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
              >
                Cc/Cci {showCc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </Field>
            {showCc && (
              <>
                <Field label="Cc">
                  <input
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100"
                  />
                </Field>
                <Field label="Cci">
                  <input
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100"
                  />
                </Field>
              </>
            )}
            <Field label="Objet">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="(sans objet)"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100"
              />
            </Field>
          </div>

          {/* Corps */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 min-h-[180px] resize-none px-4 py-3 bg-transparent outline-none text-sm leading-relaxed text-slate-800 dark:text-slate-100"
          />

          {/* Pièces jointes ajoutées */}
          {files.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs"
                >
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-200">
                    {f.name}
                  </span>
                  <span className="text-slate-400">{formatSize(f.size)}</span>
                  <button type="button" onClick={() => removeFile(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="px-4 pb-2 text-sm text-rose-600 dark:text-rose-400 shrink-0">
              {error}
            </p>
          )}

          {/* Barre du bas */}
          <div className="flex items-center gap-2 px-4 h-14 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <label className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
              <Paperclip className="h-5 w-5" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] transition disabled:opacity-60"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <span className="w-12 text-xs text-slate-400 shrink-0">{label}</span>
      {children}
    </div>
  );
}
