import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  KeyRound,
  Search,
  Database,
  Loader2,
  Power,
  CalendarDays,
} from 'lucide-react';
import {
  AdminUser,
  AnnouncementCategory,
  AnnouncementItem,
  AttendanceRecord,
  AuditLog,
  CalendarEvent,
  Division,
  DUTY_DAY_OPTIONS,
  DutyDay,
  DutySchedule,
  MemberRecord,
  Position,
  ProgramStatus,
  ProgramWork,
} from '../types';
import {
  deleteFirestoreDoc,
  saveFirestoreDoc,
  seedInitialPadmawijayaData,
  writeClientAuditLog,
} from '../lib/firebase';
import { apiRequest } from '../lib/apiClient';
import { ImageUploadField } from './ImageUploadField';

// 1. DASHBOARD OVERVIEW TAB
export const OverviewTab: React.FC<{
  members: MemberRecord[];
  divisions: Division[];
  attendance: AttendanceRecord[];
  programs: ProgramWork[];
  events: CalendarEvent[];
  auditLogs: AuditLog[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ members, divisions, attendance, programs, events, auditLogs, onNotify }) => {
  const [seeding, setSeeding] = useState(false);

  const todayWib = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.isActive).length;
  const todaysAttendance = attendance.filter((a) => a.dutyDate === todayWib);
  const presentToday = todaysAttendance.filter((a) => a.status === 'HADIR' || a.status === 'TERLAMBAT').length;
  const attendancePct =
    activeMembers > 0 ? Math.round((presentToday / activeMembers) * 100) : 0;

  const completedPrograms = programs.filter((p) => p.status === 'SELESAI').length;
  const ongoingPrograms = programs.filter((p) => p.status === 'SEDANG BERJALAN').length;
  const upcomingCount = events.filter((e) => e.date >= todayWib).length;

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedInitialPadmawijayaData();
      onNotify('success', 'Data default PADMAWIJAYA 2026/2027 berhasil disinkronkan ke Firestore.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal inisialisasi data.');
    } finally {
      setSeeding(false);
    }
  };

  const kpis = [
    { label: 'Total Anggota', value: totalMembers },
    { label: 'Anggota Aktif', value: activeMembers },
    { label: 'Total Divisi', value: divisions.length },
    { label: 'Absensi Hari Ini', value: todaysAttendance.length },
    { label: 'Persentase Hadir', value: `${attendancePct}%` },
    { label: 'Total Program Kerja', value: programs.length },
    { label: 'Proker Selesai', value: completedPrograms },
    { label: 'Proker Berjalan', value: ongoingPrograms },
    { label: 'Agenda Mendatang', value: upcomingCount },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
            Ikhtisar Organisasi PADMAWIJAYA 2026/2027
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Statistik langsung dari database Cloud Firestore · Tanggal WIB: {todayWib}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
          <span>Inisialisasi Data Bawaan Firestore</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]"
          >
            <div className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white tabular-nums">
              {k.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-display font-bold text-sm">
          Log Audit Aktivitas Terbaru
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-5 text-slate-500">Belum ada catatan audit.</div>
          ) : (
            auditLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-mono font-semibold text-[#1D4ED8] dark:text-[#38BDF8] mr-2">
                    {log.action}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                </div>
                <span className="text-slate-400 shrink-0">{log.actorEmail}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// 2. MEMBER MANAGEMENT TAB
export const MembersTab: React.FC<{
  members: MemberRecord[];
  divisions: Division[];
  positions: Position[];
  dutySchedules: DutySchedule[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ members, divisions, positions, dutySchedules, onNotify }) => {
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MemberRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [memberNumber, setMemberNumber] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || 'bph');
  const [positionId, setPositionId] = useState(positions[0]?.id || 'pos-anggota');
  const [classGrade, setClassGrade] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [dutyScheduleId, setDutyScheduleId] = useState(dutySchedules[0]?.id || 'piket-gerbang-pagi');
  const [dutyDays, setDutyDays] = useState<DutyDay[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isPublished, setIsPublished] = useState(true);

  // Reset Password, Delete & Quick Duty Days Modals
  const [resetTarget, setResetTarget] = useState<MemberRecord | null>(null);
  const [newResetPw, setNewResetPw] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MemberRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dutyEditTarget, setDutyEditTarget] = useState<MemberRecord | null>(null);
  const [quickDutyDays, setQuickDutyDays] = useState<DutyDay[]>([]);

  const toggleDayInList = (list: DutyDay[], day: DutyDay): DutyDay[] => {
    const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
    return DUTY_DAY_OPTIONS.filter((opt) => next.includes(opt));
  };

  const openCreate = () => {
    setEditing(null);
    setMemberNumber('');
    setInitialPassword('');
    setFullName('');
    setDivisionId(divisions[0]?.id || 'bph');
    setPositionId(positions[0]?.id || 'pos-anggota');
    setClassGrade('');
    setBio('');
    setPhotoUrl('');
    setDutyScheduleId(dutySchedules[0]?.id || 'piket-gerbang-pagi');
    setDutyDays([]);
    setIsActive(true);
    setIsPublished(true);
    setShowForm(true);
  };

  const openEdit = (m: MemberRecord) => {
    setEditing(m);
    setMemberNumber(m.memberNumber ?? '');
    setInitialPassword('');
    setFullName(m.fullName ?? '');
    setDivisionId(m.divisionId ?? 'bph');
    setPositionId(m.positionId ?? 'pos-anggota');
    setClassGrade(m.classGrade ?? '');
    setBio(m.bio ?? '');
    setPhotoUrl(m.photoUrl ?? '');
    setDutyScheduleId(m.dutyScheduleId ?? 'piket-gerbang-pagi');
    setDutyDays(Array.isArray(m.dutyDays) ? m.dutyDays : []);
    setIsActive(m.isActive ?? true);
    setIsPublished(m.isPublished ?? true);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const divObj = divisions.find((d) => d.id === divisionId);
    const posObj = positions.find((p) => p.id === positionId);

    try {
      if (editing) {
        const updated: Record<string, unknown> = {
          fullName: fullName.trim(),
          divisionId,
          divisionName: divObj?.name || divisionId,
          positionId,
          positionTitle: posObj?.title || editing.positionTitle,
          hierarchyRank: posObj?.order || 6,
          classGrade: classGrade.trim(),
          bio: bio.trim(),
          photoUrl: photoUrl.trim(),
          dutyScheduleId,
          dutyDays,
          isActive,
          isPublished,
        };
        await saveFirestoreDoc('members', editing.id, updated, true);
        await saveFirestoreDoc(
          'publicMembers',
          editing.id,
          {
            fullName: fullName.trim(),
            divisionId,
            divisionName: divObj?.name || divisionId,
            positionTitle: posObj?.title || editing.positionTitle,
            hierarchyRank: posObj?.order || 6,
            bio: bio.trim(),
            photoUrl: photoUrl.trim(),
            isPublished: isPublished && isActive,
          },
          true
        );
        const cleanMapId = editing.memberNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        if (cleanMapId) {
          await saveFirestoreDoc('memberAuthMap', cleanMapId, { isActive }, true);
        }
        await writeClientAuditLog('UPDATE_MEMBER', 'members', editing.id, `Memperbarui data ${fullName}`);
        onNotify('success', 'Data anggota & hari piket gerbang berhasil diperbarui.');
      } else {
        await apiRequest('/api/admin/members/create', {
          method: 'POST',
          body: {
            memberNumber: memberNumber.trim(),
            initialPassword,
            fullName: fullName.trim(),
            divisionId,
            divisionName: divObj?.name || divisionId,
            positionId,
            positionTitle: posObj?.title || 'Anggota',
            hierarchyRank: posObj?.order || 6,
            classGrade: classGrade.trim(),
            bio: bio.trim(),
            photoUrl: photoUrl.trim(),
            dutyScheduleId,
            dutyDays,
            isActive,
            isPublished,
          },
        });
        onNotify('success', `Akun anggota ${memberNumber} berhasil dibuat di Firebase Auth & Firestore.`);
      }
      setShowForm(false);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan anggota.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: MemberRecord) => {
    try {
      const nextActive = !m.isActive;
      await saveFirestoreDoc('members', m.id, { isActive: nextActive }, true);
      await saveFirestoreDoc('publicMembers', m.id, { isPublished: m.isPublished && nextActive }, true);
      const mapId = m.memberNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      await saveFirestoreDoc('memberAuthMap', mapId, { isActive: nextActive }, true);
      await writeClientAuditLog('TOGGLE_MEMBER_ACTIVE', 'members', m.id, `${m.memberNumber} -> ${nextActive}`);
      onNotify('success', `Status anggota ${m.fullName} diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengubah status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/members/reset-password', {
        method: 'POST',
        body: {
          memberId: resetTarget.id,
          authUid: resetTarget.authUid,
          newPassword: newResetPw,
        },
      });
      onNotify('success', `Kata sandi ${resetTarget.fullName} berhasil direset.`);
      setResetTarget(null);
      setNewResetPw('');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal reset kata sandi.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest('/api/admin/members/delete', {
        method: 'POST',
        body: {
          memberId: deleteTarget.id,
          memberNumber: deleteTarget.memberNumber,
          authUid: deleteTarget.authUid,
        },
      });
      onNotify('success', `Anggota ${deleteTarget.fullName} berhasil dihapus permanen.`);
      setDeleteTarget(null);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus anggota.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveQuickDutyDays = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyEditTarget) return;
    setSaving(true);
    try {
      await saveFirestoreDoc('members', dutyEditTarget.id, { dutyDays: quickDutyDays }, true);
      await writeClientAuditLog(
        'UPDATE_MEMBER_DUTY_DAYS',
        'members',
        dutyEditTarget.id,
        `${dutyEditTarget.fullName}: ${quickDutyDays.length > 0 ? quickDutyDays.join(', ') : 'Fleksibel (Semua Hari)'}`
      );
      onNotify(
        'success',
        `Hari piket jaga gerbang ${dutyEditTarget.fullName} diperbarui: ${
          quickDutyDays.length > 0 ? quickDutyDays.join(', ') : 'Semua Hari (Fleksibel)'
        }.`
      );
      setDutyEditTarget(null);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan hari piket anggota.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const dOk = divFilter === 'ALL' || m.divisionId === divFilter;
      const qOk =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        (m.positionTitle || '').toLowerCase().includes(q);
      return dOk && qOk;
    });
  }, [members, search, divFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
            Manajemen Anggota &amp; Akun Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola nomor anggota unik, akun Firebase Auth anggota, dan publikasi ke Struktur Organisasi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Anggota + Akun</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor anggota, nama, jabatan..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm"
          />
        </div>
        <select
          value={divFilter}
          onChange={(e) => setDivFilter(e.target.value)}
          className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm"
        >
          <option value="ALL">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1D36] space-y-4"
        >
          <h3 className="text-base font-display font-bold">
            {editing ? `Edit Anggota: ${editing.fullName}` : 'Tambah Anggota & Buat Akun Login'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Nomor Anggota (Unik)</label>
              <input
                type="text"
                required
                disabled={Boolean(editing)}
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                placeholder="PW-2026-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm font-mono disabled:opacity-60"
              />
            </div>
            {!editing && (
              <div>
                <label className="text-xs font-semibold block mb-1">Kata Sandi Awal (Min. 6 Karakter)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Kelas</label>
              <input
                type="text"
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                placeholder="XI-A"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Divisi / Sekbid</label>
              <select
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Jabatan</label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Jadwal Piket Absensi</label>
              <select
                value={dutyScheduleId}
                onChange={(e) => setDutyScheduleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
              >
                {dutySchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dutyTimeWib} WIB)
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold">
                  Hari Piket Jaga Gerbang (kosongkan jika fleksibel / setiap hari kerja)
                </label>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDutyDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])}
                    className="text-[#1D4ED8] dark:text-[#38BDF8] hover:underline font-semibold"
                  >
                    Pilih Senin–Jumat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDutyDays([])}
                    className="text-slate-500 hover:underline"
                  >
                    Reset (Fleksibel)
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {DUTY_DAY_OPTIONS.map((day) => {
                  const active = dutyDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDutyDays((prev) => toggleDayInList(prev, day))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white border-[#0B1F3A] dark:border-[#1D4ED8]'
                          : 'bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-[#1D4ED8]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <ImageUploadField
                label="Foto Profil Anggota (Upload Gambar / URL)"
                value={photoUrl}
                onChange={setPhotoUrl}
                onNotify={onNotify}
                driveFolder="DOKUMENTASI"
                maxWidth={640}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Biografi Singkat (Opsional)</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-6 text-xs">
            <label className="inline-flex items-center gap-2 font-medium">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Akun Anggota Aktif</span>
            </label>
            <label className="inline-flex items-center gap-2 font-medium">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              <span>Tampilkan di Halaman Struktur Organisasi Publik</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Anggota'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#152544] text-xs">
            <tr>
              <th className="py-3 px-4">No. Anggota</th>
              <th className="py-3 px-4">Nama</th>
              <th className="py-3 px-4">Divisi &amp; Jabatan</th>
              <th className="py-3 px-4">Piket Jaga Gerbang</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Belum ada data anggota terdaftar. Klik &ldquo;Tambah Anggota + Akun&rdquo; untuk membuat akun anggota.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 px-4 font-mono font-semibold">{m.memberNumber}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#0B1F3A] dark:text-white">{m.fullName}</div>
                    <div className="text-slate-400">{m.classGrade || '-'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div>{m.positionTitle}</div>
                    <div className="text-slate-400">{m.divisionName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDutyEditTarget(m);
                        setQuickDutyDays(Array.isArray(m.dutyDays) ? m.dutyDays : []);
                      }}
                      title="Klik untuk atur hari piket gerbang anggota ini"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:border-[#1D4ED8] text-left"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {Array.isArray(m.dutyDays) && m.dutyDays.length > 0
                          ? m.dutyDays.join(', ')
                          : 'Fleksibel (Atur Hari)'}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className={m.isActive ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                      {m.isActive ? 'Aktif' : 'Nonaktif'}
                    </div>
                    <div className="text-slate-400">{m.isPublished ? 'Publik' : 'Privat'}</div>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      title="Edit Anggota"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1D4ED8] dark:text-[#38BDF8]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDutyEditTarget(m);
                        setQuickDutyDays(Array.isArray(m.dutyDays) ? m.dutyDays : []);
                      }}
                      title="Atur Hari Piket Gerbang"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                    >
                      <CalendarDays className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      title={m.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {m.authUid && (
                      <button
                        type="button"
                        onClick={() => setResetTarget(m)}
                        title="Reset Kata Sandi"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      title="Hapus Anggota"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Gate-Duty Days Modal */}
      {dutyEditTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuickDutyDays}
            className="bg-white dark:bg-[#0F1D36] rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full space-y-4"
          >
            <div>
              <h3 className="font-display font-bold text-base text-[#0B1F3A] dark:text-white">
                Atur Hari Piket Jaga Gerbang
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dutyEditTarget.fullName} ({dutyEditTarget.memberNumber})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DUTY_DAY_OPTIONS.map((day) => {
                const active = quickDutyDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setQuickDutyDays((prev) => toggleDayInList(prev, day))}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white border-[#0B1F3A] dark:border-[#1D4ED8]'
                        : 'bg-slate-50 dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setQuickDutyDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])}
                className="text-[#1D4ED8] dark:text-[#38BDF8] font-semibold hover:underline"
              >
                Pilih Senin–Jumat
              </button>
              <button
                type="button"
                onClick={() => setQuickDutyDays([])}
                className="text-slate-500 hover:underline"
              >
                Kosongkan (Fleksibel semua hari)
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
              >
                {saving ? 'Menyimpan...' : 'Simpan Jadwal Hari Piket'}
              </button>
              <button
                type="button"
                onClick={() => setDutyEditTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Member Confirmation Modal (Iframe-safe) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1D36] rounded-xl border border-red-200 dark:border-red-900/60 p-6 max-w-md w-full space-y-4">
            <h3 className="font-display font-bold text-base text-red-600 dark:text-red-400">
              Konfirmasi Hapus Anggota
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda yakin ingin menghapus permanen data anggota{' '}
              <strong className="text-[#0B1F3A] dark:text-white">{deleteTarget.fullName}</strong> (No.{' '}
              <span className="font-mono">{deleteTarget.memberNumber}</span>)? Data profil di struktur organisasi publik juga akan ikut dihapus.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPassword}
            className="bg-white dark:bg-[#0F1D36] rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full space-y-4"
          >
            <h3 className="font-display font-bold text-base">
              Reset Sandi: {resetTarget.fullName}
            </h3>
            <input
              type="password"
              required
              minLength={6}
              value={newResetPw}
              onChange={(e) => setNewResetPw(e.target.value)}
              placeholder="Kata sandi baru (min. 6 karakter)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
              >
                {saving ? 'Mereset...' : 'Reset Sandi'}
              </button>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 3. ORGANIZATIONAL STRUCTURE TAB (Divisions & Positions)
export const StructureTab: React.FC<{
  divisions: Division[];
  positions: Position[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ divisions, positions, onNotify }) => {
  const [divName, setDivName] = useState('');
  const [divCode, setDivCode] = useState('');
  const [divDesc, setDivDesc] = useState('');
  const [posTitle, setPosTitle] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const handleAddDiv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divName.trim() || !divCode.trim()) return;
    const id = divCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    try {
      await saveFirestoreDoc('divisions', id, {
        name: divName.trim(),
        code: divCode.trim().toUpperCase(),
        description: divDesc.trim(),
        order: divisions.length + 1,
      });
      setDivName('');
      setDivCode('');
      setDivDesc('');
      onNotify('success', 'Divisi berhasil ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah divisi.');
    }
  };

  const handleAddPos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posTitle.trim()) return;
    const id = `pos-${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('positions', id, {
        title: posTitle.trim(),
        order: positions.length + 1,
      });
      setPosTitle('');
      onNotify('success', 'Jabatan berhasil ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah jabatan.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold">Divisi &amp; Seksi Bidang</h2>
        <form onSubmit={handleAddDiv} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={divCode}
              onChange={(e) => setDivCode(e.target.value)}
              placeholder="Kode (SB-09)"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            />
            <input
              type="text"
              required
              value={divName}
              onChange={(e) => setDivName(e.target.value)}
              placeholder="Nama Divisi"
              className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            />
          </div>
          <input
            type="text"
            value={divDesc}
            onChange={(e) => setDivDesc(e.target.value)}
            placeholder="Deskripsi singkat tugas divisi"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
            Tambah Divisi
          </button>
        </form>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {divisions.map((d) => (
            <div key={d.id} className="p-3.5 flex items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-bold">{d.name} ({d.code})</div>
                <div className="text-slate-500">{d.description}</div>
              </div>
              {confirmDeleteKey === `div_${d.id}` ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('divisions', d.id);
                      setConfirmDeleteKey(null);
                      onNotify('success', 'Divisi dihapus.');
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteKey(null)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteKey(`div_${d.id}`)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold">Daftar Jabatan</h2>
        <form onSubmit={handleAddPos} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] flex gap-2">
          <input
            type="text"
            required
            value={posTitle}
            onChange={(e) => setPosTitle(e.target.value)}
            placeholder="Nama Jabatan Baru"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
            Tambah
          </button>
        </form>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {positions.map((p) => (
            <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold">{p.title}</span>
              {confirmDeleteKey === `pos_${p.id}` ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('positions', p.id);
                      setConfirmDeleteKey(null);
                      onNotify('success', 'Jabatan dihapus.');
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteKey(null)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteKey(`pos_${p.id}`)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 4. ANNOUNCEMENTS TAB
export const AnnouncementsTab: React.FC<{
  announcements: AnnouncementItem[];
  adminEmail: string;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ announcements, adminEmail, onNotify }) => {
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('General');
  const [author, setAuthor] = useState('BPH PADMAWIJAYA');
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10));
  const [imageUrl, setImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [published, setPublished] = useState(true);
  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCategory('General');
    setAuthor(adminEmail || 'BPH PADMAWIJAYA');
    setPublishedAt(new Date().toISOString().slice(0, 10));
    setImageUrl('');
    setIsPinned(false);
    setPublished(true);
    setShowForm(true);
  };

  const openEdit = (a: AnnouncementItem) => {
    setEditing(a);
    setTitle(a.title ?? '');
    setDescription(a.description ?? '');
    setCategory(a.category ?? 'General');
    setAuthor(a.author ?? '');
    setPublishedAt(a.publishedAt ?? new Date().toISOString().slice(0, 10));
    setImageUrl(a.imageUrl ?? '');
    setIsPinned(Boolean(a.isPinned));
    setPublished(a.published ?? true);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editing?.id || `ann_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('announcements', id, {
        title: title.trim(),
        description: description.trim(),
        category,
        author: author.trim(),
        publishedAt,
        imageUrl: imageUrl.trim(),
        isPinned,
        published,
      });
      await writeClientAuditLog(editing ? 'UPDATE_ANNOUNCEMENT' : 'CREATE_ANNOUNCEMENT', 'announcements', id, title);
      setShowForm(false);
      onNotify('success', 'Pengumuman berhasil disimpan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan pengumuman.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Manajemen Pengumuman</h2>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1D36] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul Pengumuman"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            >
              {['General', 'Important', 'Meeting', 'Activities', 'Division Information'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Penulis / Divisi"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <input
              type="date"
              required
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>
          <ImageUploadField
            label="Gambar Pengumuman (Opsional — Upload dari Perangkat / Drive)"
            value={imageUrl}
            onChange={setImageUrl}
            onNotify={onNotify}
            driveFolder="DOKUMENTASI"
            aspectClass="w-28 h-20"
          />
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Isi pengumuman lengkap..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
          <div className="flex gap-6 text-xs">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
              <span>Sematkan (Penting)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Publikasikan ke Website</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
              Simpan
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {announcements.map((a) => (
          <div key={a.id} className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="text-slate-400 tabular-nums">
                {a.category} · {a.publishedAt} · {a.published ? 'Terbit' : 'Draft'} {a.isPinned ? '· Disematkan' : ''}
              </div>
              <div className="text-sm font-bold text-[#0B1F3A] dark:text-white">{a.title}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => openEdit(a)} className="p-1.5 text-[#1D4ED8] dark:text-[#38BDF8]">
                <Edit3 className="w-4 h-4" />
              </button>
              {confirmDeleteAnnId === a.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('announcements', a.id);
                      setConfirmDeleteAnnId(null);
                      onNotify('success', 'Pengumuman dihapus.');
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAnnId(null)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAnnId(a.id)}
                  className="p-1.5 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. PROGRAM WORK TAB (Division Admin Scoped)
export const ProgramsTab: React.FC<{
  programs: ProgramWork[];
  divisions: Division[];
  admin: AdminUser;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ programs, divisions, admin, onNotify }) => {
  const isDivisionAdmin = admin.role === 'DIVISION_ADMIN';
  const scopedPrograms = isDivisionAdmin
    ? programs.filter((p) => p.divisionId === admin.assignedDivisionId)
    : programs;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProgramWork | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [divisionId, setDivisionId] = useState(
    isDivisionAdmin && admin.assignedDivisionId ? admin.assignedDivisionId : divisions[0]?.id || 'bph'
  );
  const [personInCharge, setPersonInCharge] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('BELUM DIMULAI');
  const [progressNotes, setProgressNotes] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [confirmDeleteProgId, setConfirmDeleteProgId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDivisionId(
      isDivisionAdmin && admin.assignedDivisionId ? admin.assignedDivisionId : divisions[0]?.id || 'bph'
    );
    setPersonInCharge('');
    setTargetDate('');
    setStatus('BELUM DIMULAI');
    setProgressNotes('');
    setDocumentationUrl('');
    setShowForm(true);
  };

  const openEdit = (p: ProgramWork) => {
    setEditing(p);
    setName(p.name ?? '');
    setDescription(p.description ?? '');
    setDivisionId(p.divisionId ?? 'bph');
    setPersonInCharge(p.personInCharge ?? '');
    setTargetDate(p.targetDate ?? '');
    setStatus(p.status ?? 'BELUM DIMULAI');
    setProgressNotes(p.progressNotes ?? '');
    setDocumentationUrl(p.documentationUrl ?? '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDivId =
      isDivisionAdmin && admin.assignedDivisionId ? admin.assignedDivisionId : divisionId;
    const divName = divisions.find((d) => d.id === effectiveDivId)?.name || effectiveDivId;
    const id = editing?.id || `prog_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('programs', id, {
        name: name.trim(),
        description: description.trim(),
        divisionId: effectiveDivId,
        divisionName: divName,
        personInCharge: personInCharge.trim(),
        targetDate,
        status,
        progressNotes: progressNotes.trim(),
        documentationUrl: documentationUrl.trim(),
      });
      await writeClientAuditLog(editing ? 'UPDATE_PROGRAM' : 'CREATE_PROGRAM', 'programs', id, `${name} (${status})`);
      setShowForm(false);
      onNotify('success', 'Program kerja berhasil disimpan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan program kerja.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Manajemen Program Kerja</h2>
          {isDivisionAdmin && (
            <p className="text-xs text-[#1D4ED8] dark:text-[#38BDF8]">
              Mode Admin Divisi: Anda mengelola program milik divisi {admin.assignedDivisionId}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Program Kerja</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1D36] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Program Kerja"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <select
              disabled={isDivisionAdmin}
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm disabled:opacity-60"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={personInCharge}
              onChange={(e) => setPersonInCharge(e.target.value)}
              placeholder="Penanggung Jawab"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProgramStatus)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            >
              <option value="BELUM DIMULAI">BELUM DIMULAI</option>
              <option value="SEDANG BERJALAN">SEDANG BERJALAN</option>
              <option value="SELESAI">SELESAI</option>
            </select>
            <div className="md:col-span-2">
              <ImageUploadField
                label="Foto Dokumentasi Kegiatan / Program Kerja (Opsional)"
                value={documentationUrl}
                onChange={setDocumentationUrl}
                onNotify={onNotify}
                driveFolder="DOKUMENTASI"
                aspectClass="w-28 h-20"
              />
            </div>
          </div>
          <textarea
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi program kerja..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
          <textarea
            rows={2}
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            placeholder="Catatan progres pelaksanaan..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
              Simpan Program Kerja
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {scopedPrograms.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="text-slate-400">
                {p.divisionName} · {p.status} · Target {p.targetDate}
              </div>
              <div className="text-sm font-bold text-[#0B1F3A] dark:text-white">{p.name}</div>
              <div className="text-slate-500">PJ: {p.personInCharge}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-[#1D4ED8] dark:text-[#38BDF8]">
                <Edit3 className="w-4 h-4" />
              </button>
              {!isDivisionAdmin && (
                confirmDeleteProgId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteFirestoreDoc('programs', p.id);
                        setConfirmDeleteProgId(null);
                        onNotify('success', 'Program kerja dihapus.');
                      }}
                      className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                    >
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProgId(null)}
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProgId(p.id)}
                    className="p-1.5 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
