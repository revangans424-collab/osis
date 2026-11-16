import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, LogIn, MailCheck, ExternalLink, KeyRound } from 'lucide-react';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAILS,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  fetchCurrentAdminProfile,
} from '../lib/firebase';
import { AdminUser, PageRoute } from '../types';

export const AdminLoginPage: React.FC<{
  onAdminAuthenticated: (admin: AdminUser) => void;
  onNavigate: (p: PageRoute) => void;
}> = ({ onAdminAuthenticated, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [providerDisabled, setProviderDisabled] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{
    uid: string;
    email: string;
    isBootstrapEmail: boolean;
  } | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const verifyAndEnter = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('Autentikasi gagal.');
      return;
    }
    const profile = await fetchCurrentAdminProfile(user);
    if (!profile) {
      const emailLower = (user.email || '').trim().toLowerCase();
      const isBootstrapEmail = (BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(emailLower);
      if (!user.emailVerified && isBootstrapEmail) {
        setPendingVerification({
          uid: user.uid,
          email: emailLower,
          isBootstrapEmail: true,
        });
        setError(
          `Akun ${emailLower} berhasil login, namun email belum terverifikasi sehingga aturan Firestore masih menolak akses admin.`
        );
        return;
      }
      await signOut(auth);
      setError(
        `Akun ini (UID: ${user.uid}) belum terdaftar di koleksi "admins" Firestore atau statusnya nonaktif. Pendaftaran admin publik tidak diperbolehkan.`
      );
      return;
    }
    setPendingVerification(null);
    onAdminAuthenticated(profile);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setProviderDisabled(false);
    setPendingVerification(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await verifyAndEnter();
    } catch (err) {
      const code = (err as { code?: string; message?: string }).code || '';
      const msg = err instanceof Error ? err.message : '';
      if (
        code.includes('operation-not-allowed') ||
        msg.includes('PASSWORD_LOGIN_DISABLED') ||
        msg.includes('OPERATION_NOT_ALLOWED')
      ) {
        setProviderDisabled(true);
        setError(
          'Provider login Email/Password masih NONAKTIF di Firebase Console proyek ini (PASSWORD_LOGIN_DISABLED).'
        );
      } else if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found')
      ) {
        setError('Email atau kata sandi admin salah, atau akun belum dibuat di Firebase Authentication → Users.');
      } else {
        setError(msg || 'Email atau kata sandi admin salah.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Isi kolom Email Admin terlebih dahulu lalu klik Atur / Lupa Sandi.');
      return;
    }
    setError(null);
    setInfoMsg(null);
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMsg(
        `Link atur/reset kata sandi dikirim ke ${cleanEmail}. Buka email Anda, buat kata sandi baru, lalu login di form ini.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim email reset kata sandi.'
      );
    } finally {
      setSendingReset(false);
    }
  };

  const handleSendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSendingVerify(true);
    setInfoMsg(null);
    try {
      await sendEmailVerification(user);
      setInfoMsg(
        `Link verifikasi telah dikirim ke ${user.email}. Buka inbox email Anda, klik link verifikasi, lalu masuk ulang.`
      );
      await signOut(auth);
      setPendingVerification(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim email verifikasi. Pastikan alamat email aktif.'
      );
    } finally {
      setSendingVerify(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
            Akses Terbatas Pengelola
          </div>
          <h1 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1D4ED8] dark:text-[#38BDF8]" />
            <span>Login Admin PADMAWIJAYA</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Masuk menggunakan Email dan Kata Sandi Admin yang terdaftar pada Firebase Authentication.
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Email Admin
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eventt479@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={sendingReset}
                className="text-[11px] font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>{sendingReset ? 'Mengirim...' : 'Atur / Lupa Sandi'}</span>
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
              {infoMsg}
            </div>
          )}

          {providerDisabled && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2 leading-relaxed">
              <div className="font-bold">Langkah Aktifkan Email &amp; Kata Sandi di Firebase Console:</div>
              <ol className="list-decimal pl-4 space-y-1">
                <li>
                  Buka <strong>Firebase Console → Authentication → Sign-in method</strong> pada proyek{' '}
                  <span className="font-mono">ethereal-processor-l9brs</span>.
                </li>
                <li>
                  Aktifkan penyedia <strong>Email/Password</strong> lalu klik <strong>Save</strong>.
                </li>
                <li>
                  Buka tab <strong>Users → Add user</strong>, masukkan email admin &amp; kata sandi yang Anda inginkan.
                </li>
              </ol>
              <a
                href="https://console.firebase.google.com/project/ethereal-processor-l9brs/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline pt-1"
              >
                <span>Buka Firebase Authentication Providers</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {pendingVerification && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2 leading-relaxed">
              <div className="font-bold">Verifikasi Email / Aktivasi Dokumen Admin</div>
              <p>
                UID Akun: <span className="font-mono font-semibold">{pendingVerification.uid}</span>
              </p>
              <p>
                Jika menggunakan email aktif (misal <span className="font-mono">eventt479@gmail.com</span>), klik tombol di bawah untuk mengirim link verifikasi. Jika menggunakan email dummy tanpa kotak masuk, tambahkan dokumen pada Firestore koleksi{' '}
                <span className="font-mono">admins/{pendingVerification.uid}</span> dengan{' '}
                <span className="font-mono">role: &quot;SUPER_ADMIN&quot;</span> dan{' '}
                <span className="font-mono">isActive: true</span>.
              </p>
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={sendingVerify}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white font-semibold"
              >
                {sendingVerify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MailCheck className="w-3.5 h-3.5" />}
                <span>Kirim Link Verifikasi Email</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <button type="button" onClick={() => onNavigate('home')} className="hover:underline">
            ← Kembali ke Beranda
          </button>
          <button type="button" onClick={() => onNavigate('member-login')} className="hover:underline">
            Login Anggota
          </button>
        </div>
      </div>
    </div>
  );
};
