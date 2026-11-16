import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Upload,
} from 'lucide-react';
import {
  ArchiveDocument,
  AttendanceRecord,
  AttendanceStatus,
  CalendarEvent,
  Division,
  DocumentCategory,
  DocumentVisibility,
  DutySchedule,
  GalleryAlbum,
  GalleryItem,
  JourneyItem,
  MemberRecord,
} from '../types';
import { deleteFirestoreDoc, saveFirestoreDoc, writeClientAuditLog } from '../lib/firebase';
import { apiRequest, fetchPrivateDriveFileUrl } from '../lib/apiClient';
import { ImageUploadField } from './ImageUploadField';

// 6. ATTENDANCE MANAGEMENT TAB
export const AttendanceTab: React.FC<{
  attendance: AttendanceRecord[];
  members: MemberRecord[];
  divisions: Division[];
  dutySchedules: DutySchedule[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ attendance, members, divisions, dutySchedules, onNotify }) => {
  const [dateFilter, setDateFilter] = useState('');
  const [divFilter, setDivFilter] = useState('ALL');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('HADIR');
  const [correctReason, setCorrectReason] = useState('');

  // Duty schedule editor
  const defaultSch = dutySchedules[0] || {
    id: 'piket-gerbang-pagi',
    name: 'Piket Gerbang Pagi (Default)',
    dutyTimeWib: '06:30',
    windowOpenWib: '05:30',
    windowCloseWib: '08:00',
    graceMinutes: 5,
    isActive: true,
  };
  const [dutyTimeWib, setDutyTimeWib] = useState(defaultSch.dutyTimeWib ?? '06:30');
  const [windowOpenWib, setWindowOpenWib] = useState(defaultSch.windowOpenWib ?? '05:30');
  const [windowCloseWib, setWindowCloseWib] = useState(defaultSch.windowCloseWib ?? '08:00');
  const [graceMinutes, setGraceMinutes] = useState(
    Number.isFinite(defaultSch.graceMinutes) ? defaultSch.graceMinutes : 5
  );

  const filtered = useMemo(() => {
    return attendance.filter((r) => {
      const dOk = !dateFilter || r.dutyDate === dateFilter;
      const divOk = divFilter === 'ALL' || r.divisionId === divFilter;
      const mOk = memberFilter === 'ALL' || r.memberId === memberFilter;
      return dOk && divOk && mOk;
    });
  }, [attendance, dateFilter, divFilter, memberFilter]);

  const handleViewPhoto = async (fileId: string) => {
    try {
      const url = await fetchPrivateDriveFileUrl(fileId);
      setPhotoPreviewUrl(url);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat foto dari Google Drive.');
    }
  };

  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correcting) return;
    try {
      await apiRequest('/api/admin/attendance/correct', {
        method: 'POST',
        body: {
          attendanceId: correcting.id,
          newStatus,
          notes: correctReason.trim(),
        },
      });
      setCorrecting(null);
      setCorrectReason('');
      onNotify('success', 'Status absensi berhasil dikoreksi & dicatat pada log audit.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengoreksi absensi.');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveFirestoreDoc('dutySchedules', defaultSch.id, {
        ...defaultSch,
        dutyTimeWib,
        windowOpenWib,
        windowCloseWib,
        graceMinutes: Number(graceMinutes),
      });
      await writeClientAuditLog('UPDATE_DUTY_SCHEDULE', 'dutySchedules', defaultSch.id, `${dutyTimeWib} WIB (${windowOpenWib}-${windowCloseWib})`);
      onNotify('success', 'Jadwal & jendela absensi berhasil diperbarui.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan jadwal.');
    }
  };

  const handleExportCsv = () => {
    const header = ['Attendance ID', 'Member Number', 'Name', 'Division', 'Date', 'Status', 'Schedule', 'Drive File ID', 'Notes'];
    const rows = filtered.map((r) => [
      r.id,
      r.memberNumber,
      `"${(r.memberName || '').replace(/"/g, '""')}"`,
      `"${(r.divisionName || '').replace(/"/g, '""')}"`,
      r.dutyDate,
      r.status,
      `"${(r.dutySchedule || '').replace(/"/g, '""')}"`,
      r.drivePhotoFileId || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absensi-padmawijaya-${dateFilter || 'semua'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold">Manajemen Absensi Piket</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pantau kehadiran, tinjau foto bukti privat Drive, koreksi status, dan atur jendela waktu piket.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan CSV</span>
        </button>
      </div>

      {/* Schedule Configuration */}
      <form
        onSubmit={handleSaveSchedule}
        className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] grid grid-cols-2 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="text-[11px] font-semibold block mb-1">Jam Piket Baku (WIB)</label>
          <input
            type="time"
            value={dutyTimeWib}
            onChange={(e) => setDutyTimeWib(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold block mb-1">Buka Absen (WIB)</label>
          <input
            type="time"
            value={windowOpenWib}
            onChange={(e) => setWindowOpenWib(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold block mb-1">Tutup Absen (WIB)</label>
          <input
            type="time"
            value={windowCloseWib}
            onChange={(e) => setWindowCloseWib(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold block mb-1">Toleransi (Menit)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={Number.isFinite(graceMinutes) ? graceMinutes : 0}
            onChange={(e) => setGraceMinutes(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold h-[34px]"
        >
          Simpan Aturan Piket
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-xs"
        />
        <select
          value={divFilter}
          onChange={(e) => setDivFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-xs"
        >
          <option value="ALL">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-xs"
        >
          <option value="ALL">Semua Anggota</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.memberNumber} — {m.fullName}
            </option>
          ))}
        </select>
        {dateFilter && (
          <button type="button" onClick={() => setDateFilter('')} className="text-xs text-[#1D4ED8] hover:underline">
            Reset Tanggal
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#152544]">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Anggota</th>
              <th className="py-3 px-4">Divisi</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Sync Sheets</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Belum ada catatan absensi pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-mono">{r.dutyDate}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{r.memberName}</div>
                    <div className="text-slate-400 font-mono">{r.memberNumber}</div>
                  </td>
                  <td className="py-3 px-4">{r.divisionName}</td>
                  <td className="py-3 px-4 font-bold">{r.status}</td>
                  <td className="py-3 px-4">{r.sheetsSyncStatus || '-'}</td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    {r.drivePhotoFileId && (
                      <button
                        type="button"
                        onClick={() => handleViewPhoto(r.drivePhotoFileId!)}
                        className="inline-flex items-center gap-1 text-[#1D4ED8] dark:text-[#38BDF8] font-semibold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Bukti</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCorrecting(r);
                        setNewStatus(r.status);
                        setCorrectReason('');
                      }}
                      className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Koreksi / Izin</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {correcting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCorrectSubmit}
            className="bg-white dark:bg-[#0F1D36] rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-display font-bold text-base">
              Koreksi / Persetujuan Izin: {correcting.memberName}
            </h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            >
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="IZIN">IZIN (Disetujui)</option>
              <option value="ALPHA">ALPHA</option>
            </select>
            <input
              type="text"
              required
              value={correctReason}
              onChange={(e) => setCorrectReason(e.target.value)}
              placeholder="Alasan koreksi (dicatat ke Audit Log)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
                Simpan Koreksi
              </button>
              <button type="button" onClick={() => setCorrecting(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {photoPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1D36] rounded-xl p-4 max-w-lg w-full space-y-3">
            <img src={photoPreviewUrl} alt="Bukti Absensi Drive" className="w-full max-h-[70vh] object-contain rounded-lg" />
            <button
              type="button"
              onClick={() => setPhotoPreviewUrl(null)}
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

// 7. GALLERY MANAGEMENT TAB
export const GalleryTab: React.FC<{
  albums: GalleryAlbum[];
  items: GalleryItem[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ albums, items, onNotify }) => {
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumCover, setAlbumCover] = useState('');
  const [itemAlbumId, setItemAlbumId] = useState(albums[0]?.id || '');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [itemUrl, setItemUrl] = useState('');
  const [itemCaption, setItemCaption] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `alb_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('galleryAlbums', id, {
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        publishedAt: new Date().toISOString().slice(0, 10),
        coverUrl: albumCover.trim(),
        isPublished: true,
      });
      setAlbumTitle('');
      setAlbumDesc('');
      setAlbumCover('');
      onNotify('success', 'Album galeri dibuat.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal membuat album.');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `gitem_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('galleryItems', id, {
        albumId: itemAlbumId || albums[0]?.id || 'album-1',
        mediaType,
        url: itemUrl.trim(),
        caption: itemCaption.trim(),
        isPublished: true,
      });
      setItemUrl('');
      setItemCaption('');
      onNotify('success', 'Item galeri ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah item galeri.');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-display font-bold">Manajemen Galeri Foto &amp; Video</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreateAlbum} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
          <h3 className="text-sm font-display font-bold">Buat Album Baru</h3>
          <input
            type="text"
            required
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
            placeholder="Judul Album Kegiatan"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="text"
            value={albumDesc}
            onChange={(e) => setAlbumDesc(e.target.value)}
            placeholder="Deskripsi Album"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <ImageUploadField
            label="Foto Sampul Album (Opsional)"
            value={albumCover}
            onChange={setAlbumCover}
            onNotify={onNotify}
            driveFolder="GALERI KEGIATAN"
            aspectClass="w-24 h-16"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
            Simpan Album
          </button>
        </form>

        <form onSubmit={handleAddItem} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
          <h3 className="text-sm font-display font-bold">Tambah Foto / Video ke Album</h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={itemAlbumId}
              onChange={(e) => setItemAlbumId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            >
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'photo' | 'video')}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            >
              <option value="photo">Foto</option>
              <option value="video">Video</option>
            </select>
          </div>
          {mediaType === 'photo' ? (
            <ImageUploadField
              label="Foto Kegiatan (Upload dari Perangkat / Drive)"
              value={itemUrl}
              onChange={setItemUrl}
              onNotify={onNotify}
              driveFolder="GALERI KEGIATAN"
              aspectClass="w-24 h-16"
              required
            />
          ) : (
            <input
              type="text"
              required
              value={itemUrl}
              onChange={(e) => setItemUrl(e.target.value)}
              placeholder="URL Video Kegiatan (YouTube / Google Drive)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            />
          )}
          <input
            type="text"
            required
            value={itemCaption}
            onChange={(e) => setItemCaption(e.target.value)}
            placeholder="Keterangan / Caption"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
            Tambah Media
          </button>
        </form>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {albums.map((a) => (
          <div key={a.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-sm">{a.title}</div>
              <div className="text-slate-400">
                {a.publishedAt} · {a.isPublished ? 'Publik' : 'Tersembunyi'} ·{' '}
                {items.filter((i) => i.albumId === a.id).length} item
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await saveFirestoreDoc('galleryAlbums', a.id, { isPublished: !a.isPublished }, true);
                  onNotify('success', 'Status publikasi album diperbarui.');
                }}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700"
              >
                {a.isPublished ? 'Sembunyikan' : 'Publikasikan'}
              </button>
              {confirmDeleteId === a.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('galleryAlbums', a.id);
                      setConfirmDeleteId(null);
                      onNotify('success', 'Album dihapus.');
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(a.id)}
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

// 8. OUR JOURNEY TAB
export const JourneyTab: React.FC<{
  journey: JourneyItem[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ journey, onNotify }) => {
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('Kegiatan Organisasi');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `j_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('journeyTimeline', id, {
        title: title.trim(),
        phase,
        date: date.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        order: journey.length + 1,
      });
      setTitle('');
      setDate('');
      setDescription('');
      setImageUrl('');
      onNotify('success', 'Momen perjalanan berhasil ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah timeline.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold">Manajemen Linimasa (Our Journey)</h2>
      <form onSubmit={handleAdd} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul Momen"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          >
            <option>Pembentukan Awal</option>
            <option>Pelantikan</option>
            <option>Rapat Kerja</option>
            <option>Kegiatan Organisasi</option>
            <option>Event Besar</option>
            <option>Kenangan Akhir Periode</option>
          </select>
          <input
            type="text"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="Tanggal / Bulan (mis. Nov 2026)"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
        </div>
        <ImageUploadField
          label="Foto Dokumentasi Momen / Kegiatan (Opsional)"
          value={imageUrl}
          onChange={setImageUrl}
          onNotify={onNotify}
          driveFolder="DOKUMENTASI"
          aspectClass="w-24 h-16"
        />
        <textarea
          rows={2}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi momen..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
          Tambah ke Linimasa
        </button>
      </form>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {journey.map((j) => (
          <div key={j.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <div className="text-[#1D4ED8] dark:text-[#38BDF8] font-semibold">
                {j.phase} · {j.date}
              </div>
              <div className="font-bold text-sm">{j.title}</div>
            </div>
            {confirmDeleteId === j.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteFirestoreDoc('journeyTimeline', j.id);
                    setConfirmDeleteId(null);
                    onNotify('success', 'Momen dihapus.');
                  }}
                  className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(j.id)}
                className="p-1.5 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 9. CALENDAR TAB
export const CalendarTab: React.FC<{
  events: CalendarEvent[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ events, onNotify }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('15:00 WIB');
  const [location, setLocation] = useState('Sekretariat OSIS');
  const [organizer, setOrganizer] = useState('BPH PADMAWIJAYA');
  const [category, setCategory] = useState<CalendarEvent['category']>('Kegiatan');
  const [description, setDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `evt_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('calendarEvents', id, {
        title: title.trim(),
        date,
        time: time.trim(),
        location: location.trim(),
        organizer: organizer.trim(),
        category,
        description: description.trim(),
        published: true,
      });
      setTitle('');
      setDescription('');
      onNotify('success', 'Agenda kalender ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah agenda.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold">Manajemen Kalender Kegiatan</h2>
      <form onSubmit={handleAdd} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nama Agenda / Rapat"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="text"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Jam (15:00 WIB)"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Lokasi"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="text"
            required
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="Penyelenggara"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CalendarEvent['category'])}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          >
            <option value="Rapat">Rapat</option>
            <option value="Kegiatan">Kegiatan</option>
            <option value="Event Besar">Event Besar</option>
            <option value="Deadline Proker">Deadline Proker</option>
          </select>
        </div>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi acara..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
          Simpan Agenda
        </button>
      </form>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {events.map((ev) => (
          <div key={ev.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <div className="text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
                {ev.date} · {ev.time} · {ev.category}
              </div>
              <div className="font-bold text-sm">{ev.title}</div>
              <div className="text-slate-500">{ev.location} — {ev.organizer}</div>
            </div>
            {confirmDeleteId === ev.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteFirestoreDoc('calendarEvents', ev.id);
                    setConfirmDeleteId(null);
                    onNotify('success', 'Agenda dihapus.');
                  }}
                  className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(ev.id)}
                className="p-1.5 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 10. DOCUMENT ARCHIVE TAB
export const DocumentsTab: React.FC<{
  documents: ArchiveDocument[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ documents, onNotify }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Proposal');
  const [visibility, setVisibility] = useState<DocumentVisibility>('public');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUploadDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await apiRequest<{ ok: boolean; fileId: string; webViewLink: string }>('/api/drive/upload', {
          method: 'POST',
          body: {
            categoryFolder: category === 'Proposal' || category === 'LPJ' ? 'PROPOSAL DAN LPJ' : 'ARSIP ORGANISASI',
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            fileBase64: String(reader.result),
            isPublic: visibility === 'public',
          },
        });
        setDriveFileId(res.fileId);
        setFileUrl(res.webViewLink);
        onNotify('success', `Berkas tersimpan ke Google Drive (${visibility}).`);
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal unggah dokumen ke Drive.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `doc_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('documents', id, {
        title: title.trim(),
        category,
        visibility,
        description: description.trim(),
        fileUrl: fileUrl.trim(),
        driveFileId: driveFileId.trim(),
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
      setTitle('');
      setDescription('');
      setFileUrl('');
      setDriveFileId('');
      onNotify('success', 'Dokumen arsip tersimpan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan dokumen.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold">Arsip Dokumen (Publik &amp; Privat)</h2>

      <form onSubmit={handleSave} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul Dokumen / Proposal / LPJ"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          >
            <option value="Proposal">Proposal</option>
            <option value="Laporan Kegiatan">Laporan Kegiatan</option>
            <option value="LPJ">LPJ</option>
            <option value="Dokumen Organisasi">Dokumen Organisasi</option>
            <option value="Dokumen Publik">Dokumen Publik</option>
          </select>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          >
            <option value="public">Public (Terlihat di Web)</option>
            <option value="private">Private (Hanya Admin)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            required
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="URL Dokumen atau Upload File ke Drive"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <label className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload ke Drive</span>
            <input type="file" onChange={handleUploadDrive} className="hidden" />
          </label>
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi ringkas dokumen"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />

        <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
          Simpan ke Arsip
        </button>
      </form>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {documents.map((d) => (
          <div key={d.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-400">
                {d.category} · {d.visibility.toUpperCase()} · {d.uploadedAt}
              </div>
              <div className="font-bold text-sm">{d.title}</div>
            </div>
            {confirmDeleteId === d.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteFirestoreDoc('documents', d.id);
                    setConfirmDeleteId(null);
                    onNotify('success', 'Dokumen dihapus.');
                  }}
                  className="px-2 py-1 rounded bg-red-600 text-white font-semibold"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(d.id)}
                className="p-1.5 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
