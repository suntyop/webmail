import { useState } from 'react';
import { Mail, Loader2, Lock, AtSign } from 'lucide-react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Webmail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connectez-vous à votre messagerie
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white/80 dark:bg-slate-800/60 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-700 p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Adresse email
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Vos identifiants restent sur votre serveur.
        </p>
      </div>
    </div>
  );
}
