import React, { useEffect, useRef, useState } from 'react';
import {
  UserCheck,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Bell,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  apiRequest,
  compressImageFileToBase64,
  fetchPrivateDriveFileUrl,
} from '../lib/apiClient';
import {
  AnnouncementItem,
  AttendanceRecord,
  DutyDay,
  DutySchedule,
  MemberRecord,
  PageRoute,
} from '../types';

export const MemberLoginPage: React.FC<{
  onSuccess: () => void;
  onNavigate: (p: PageRoute) => void;
}> = ({ onSuccess, onNavigate }) => {
  const [memberNumber, setMemberNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDisabledNotice, setAuthDisabledNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthDisabledNotice(false);
    if (!memberNumber.trim() || !password) {
      setError('Nomor anggota dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; authEmail: string }>('/api/auth/member-login', {
        method: 'POST',
        requireAuth: false,
        body: {
          memberNumber: memberNumber.trim(),
          password,
        },
      });
      await signInWithEmailAndPassword(auth, res.authEmail, password);
      onSuccess();
    } catch (err) {
      const e2 = err as Error & { code?: string };
      if (e2.code === 'EMAIL_PASSWORD_DISABLED' || e2.message.includes('PASSWORD_LOGIN_DISABLED')) {
        setAuthDisabledNotice(true);
      }
      setError(e2.message || 'Gagal masuk. Periksa nomor anggota dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
            Portal Anggota PADMAWIJAYA
          </div>
          <h1 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
            Login Anggota OSIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Masuk menggunakan Nomor Anggota unik dan kata sandi pribadi yang diberikan oleh Admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Nomor Anggota
            </label>
            <input
              type="text"
              required
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="Contoh: PW-2026-001"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Kata Sandi Pribadi
            </label>
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

          {authDisabledNotice && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold">Konfigurasi Firebase Diperlukan:</div>
              <p>
                Provider Email/Password belum diaktifkan di Firebase Console. Admin perlu mengaktifkannya di Authentication → Sign-in method → Email/Password.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard Anggota'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <button type="button" onClick={() => onNavigate('attendance-info')} className="hover:underline">
            Panduan Absensi
          </button>
          <button type="button" onClick={() => onNavigate('admin-login')} className="hover:underline">
            Login Admin →
          </button>
        </div>
      </div>
    </div>
  );
};

export const MemberDashboardPage: React.FC<{
  member: MemberRecord | null;
  dutySchedules: DutySchedule[];
  announcements: AnnouncementItem[];
  onLoggedOut: () => void;
}> = ({ member, dutySchedules, announcements, onLoggedOut }) => {
  const [tab, setTab] = useState<'attendance' | 'history' | 'announcements' | 'password'>('attendance');
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    previewUrl: string;
    base64: string;
    mimeType: 'image/jpeg' | 'image/png';
    fileName: string;
    sizeKb: number;
  } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submittingAtt, setSubmittingAtt] = useState(false);
  const [attFeedback, setAttFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'attendance'), where('memberAuthUid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }));
        list.sort((a, b) => (b.dutyDate || '').localeCompare(a.dutyDate || ''));
        setMyAttendance(list);
      },
      (err) => console.warn('My attendance listener:', err.message)
    );
    return () => unsub();
  }, []);

  const todayWib = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const shortWeekdayEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(new Date());
  const weekdayMap: Record<string, string> = {
    Sun: 'Minggu',
    Mon: 'Senin',
    Tue: 'Selasa',
    Wed: 'Rabu',
    Thu: 'Kamis',
    Fri: 'Jumat',
    Sat: 'Sabtu',
  };
  const todayDayWib = weekdayMap[shortWeekdayEn] || shortWeekdayEn;
  const assignedDutyDays = Array.isArray(member?.dutyDays) ? member.dutyDays : [];
  const isScheduledToday =
    assignedDutyDays.length === 0 || assignedDutyDays.includes(todayDayWib as DutyDay);

  const todayRecord = myAttendance.find((r) => r.dutyDate === todayWib) || null;
  const activeSchedule =
    dutySchedules.find((s) => s.id === member?.dutyScheduleId) ||
    dutySchedules[0] || {
      id: 'piket-gerbang-pagi',
      name: 'Piket Gerbang Pagi',
      dutyTimeWib: '06:30',
      windowOpenWib: '05:30',
      windowCloseWib: '08:00',
      graceMinutes: 5,
      isActive: true,
    };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setAttFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToBase64(file, 1280, 0.8, false);
      setSelectedFile({
        previewUrl: compressed.base64,
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        fileName: file.name,
        sizeKb: Math.round(compressed.sizeBytes / 1024),
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!member) return;
    if (!selectedFile) {
      setPhotoError('Pilih foto swafoto dari galeri perangkat Anda terlebih dahulu.');
      return;
    }
    setSubmittingAtt(true);
    setAttFeedback(null);
    try {
      const res = await apiRequest<{
        ok: boolean;
        status: string;
        dutyDate: string;
        serverTimeWib: string;
        driveUploadStatus?: string;
        sheetsSyncStatus: string;
      }>('/api/attendance/submit', {
        method: 'POST',
        body: {
          memberId: member.id,
          photoBase64: selectedFile.base64,
          mimeType: selectedFile.mimeType,
          fileName: selectedFile.fileName,
        },
      });
      const syncDetail =
        res.driveUploadStatus === 'UPLOADED' && res.sheetsSyncStatus === 'SYNCED'
          ? 'Foto tersimpan di Google Drive & tercatat di Google Sheets.'
          : res.driveUploadStatus === 'UPLOADED'
          ? 'Foto tersimpan di Google Drive; rekap Sheets menunggu sinkronisasi Admin.'
          : 'Absensi tercatat di database; unggah Drive/Sheets otomatis menunggu Service Account server atau sinkronisasi Admin.';
      setAttFeedback({
        type: 'success',
        message: `Absensi berhasil dicatat dengan status ${res.status} pada ${res.dutyDate} (${res.serverTimeWib} WIB). ${syncDetail}`,
      });
      setSelectedFile(null);
    } catch (err) {
      setAttFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengirim absensi.',
      });
    } finally {
      setSubmittingAtt(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
      setPwMsg({ type: 'error', text: 'Sesi login tidak ditemukan.' });
      return;
    }
    setPwLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setPwMsg({ type: 'success', text: 'Kata sandi pribadi berhasil diperbarui.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengganti kata sandi. Periksa sandi lama.',
      });
    } finally {
      setPwLoading(false);
    }
  };

  const handleViewPrivatePhoto = async (fileId: string) => {
    try {
      const url = await fetchPrivateDriveFileUrl(fileId);
      setViewingPhotoUrl(url);
    } catch (err) {
      setAttFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuka foto privat.',
      });
    }
  };

  if (!member) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Profil anggota belum tertaut dengan akun ini atau masih dimuat.
        </p>
        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            onLoggedOut();
          }}
          className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white text-sm font-semibold"
        >
          Keluar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
            No. Anggota: {member.memberNumber} · {member.isActive ? 'Aktif' : 'Nonaktif'}
          </div>
          <h1 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
            {member.fullName}
          </h1>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {member.positionTitle} · {member.divisionName || member.divisionId}
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            onLoggedOut();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 self-start md:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0F1D36] w-fit">
        {[
          { id: 'attendance', label: 'Absensi Piket Hari Ini', icon: Camera },
          { id: 'history', label: 'Riwayat Absensi', icon: Clock },
          { id: 'announcements', label: 'Pengumuman', icon: Bell },
          { id: 'password', label: 'Ubah Kata Sandi', icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                tab === item.id
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SELFIE ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-4">
            <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
              Informasi Tugas Piket
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Nama</dt>
                <dd className="font-semibold text-right">{member.fullName}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Nomor Anggota</dt>
                <dd className="font-mono font-semibold">{member.memberNumber}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Divisi</dt>
                <dd className="font-medium text-right">{member.divisionName || member.divisionId}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Jadwal Piket</dt>
                <dd className="font-semibold tabular-nums">
                  {activeSchedule.name} ({activeSchedule.dutyTimeWib} WIB)
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Hari Piket Gerbang</dt>
                <dd className="font-semibold text-right">
                  {assignedDutyDays.length > 0 ? assignedDutyDays.join(', ') : 'Semua Hari (Fleksibel)'}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Tanggal (WIB)</dt>
                <dd className="font-mono tabular-nums text-right">
                  {todayDayWib}, {todayWib}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1.5">
                <dt className="text-slate-500 dark:text-slate-400">Status Hari Ini</dt>
                <dd className="font-bold text-[#1D4ED8] dark:text-[#38BDF8]">
                  {todayRecord ? todayRecord.status : 'BELUM ABSEN'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-5">
            <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
              Kirim Bukti Swafoto Kehadiran
            </h2>

            {todayRecord ? (
              <div className="p-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-sm text-emerald-900 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Anda sudah tercatat {todayRecord.status} hari ini ({todayRecord.dutyDate}).</span>
                </div>
                <p className="text-xs opacity-90">{todayRecord.notes}</p>
              </div>
            ) : (
              <>
                {!isScheduledToday && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">Bukan Jadwal Piket Anda Hari Ini ({todayDayWib})</div>
                      <p>
                        Hari piket jaga gerbang Anda terdaftar pada hari:{' '}
                        <span className="font-semibold">{assignedDutyDays.join(', ')}</span>. Absensi piket gerbang hanya dapat dikirim pada hari piket yang telah ditentukan admin.
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-10 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1D4ED8] dark:hover:border-[#38BDF8] flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Camera className="w-8 h-8 text-[#1D4ED8] dark:text-[#38BDF8]" />
                      <span className="text-sm font-semibold">
                        Pilih Swafoto dari Galeri Ponsel (JPG / JPEG / PNG)
                      </span>
                      <span className="text-xs text-slate-400">
                        Foto berukuran besar akan dikompresi otomatis sebelum dikirim.
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-80 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <img
                          src={selectedFile.previewUrl}
                          alt="Pratinjau Swafoto Absensi"
                          className="max-h-80 object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          {selectedFile.fileName} ({selectedFile.sizeKb} KB setelah kompresi)
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Ganti Foto</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {photoError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-200">
                    {photoError}
                  </div>
                )}

                {attFeedback && (
                  <div
                    className={`p-3.5 rounded-lg text-xs flex items-start gap-2 ${
                      attFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {attFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{attFeedback.message}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#152544] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Konfirmasi: Foto yang dipilih akan disimpan secara privat di Google Drive organisasi sebagai bukti dokumentasi pendukung kehadiran. Waktu kehadiran ditentukan oleh server WIB (bukan dari metadata EXIF foto).
                </div>

                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={submittingAtt || !selectedFile || !member.isActive || !isScheduledToday}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-sm font-bold tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingAtt && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {submittingAtt
                      ? 'MENGIRIM ABSENSI...'
                      : !isScheduledToday
                      ? `BUKAN HARI PIKET (${todayDayWib.toUpperCase()})`
                      : 'HADIR SEKARANG'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {tab === 'history' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#152544] text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jadwal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-right">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
              {myAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              ) : (
                myAttendance.map((rec) => (
                  <tr key={rec.id}>
                    <td className="py-3 px-4 font-mono">{rec.dutyDate}</td>
                    <td className="py-3 px-4">{rec.dutySchedule}</td>
                    <td className="py-3 px-4 font-bold">{rec.status}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{rec.notes}</td>
                    <td className="py-3 px-4 text-right">
                      {rec.drivePhotoFileId ? (
                        <button
                          type="button"
                          onClick={() => handleViewPrivatePhoto(rec.drivePhotoFileId!)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Foto</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENTS */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-1.5"
            >
              <div className="text-xs text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
                {a.category} · {a.publishedAt} · {a.author}
              </div>
              <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white">
                {a.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: CHANGE PASSWORD */}
      {tab === 'password' && (
        <form
          onSubmit={handleChangePassword}
          className="max-w-md p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-4"
        >
          <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
            Ubah Kata Sandi Pribadi
          </h2>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">Kata Sandi Saat Ini</label>
            <input
              type="password"
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">Kata Sandi Baru (Min. 6 Karakter)</label>
            <input
              type="password"
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              required
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>
          {pwMsg && (
            <div
              className={`p-3 rounded-lg text-xs ${
                pwMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {pwMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="px-5 py-2.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-sm font-semibold"
          >
            {pwLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      )}

      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1D36] rounded-xl p-4 max-w-lg w-full space-y-3">
            <img src={viewingPhotoUrl} alt="Bukti Swafoto" className="w-full max-h-[70vh] object-contain rounded-lg" />
            <button
              type="button"
              onClick={() => setViewingPhotoUrl(null)}
              className="w-full py-2 rounded-lg bg-[#0B1F3A] text-white text-sm font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
