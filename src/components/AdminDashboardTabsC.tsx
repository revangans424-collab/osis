import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ListPlus,
  Play,
  Check,
  Trash2,
  SkipForward,
  Search,
  RefreshCw,
  FolderPlus,
  ExternalLink,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import {
  AdminInvite,
  AdminPermission,
  AdminUser,
  Division,
  IntegrationJob,
  IntegrationSettings,
  MusicOperatingConfig,
  MusicRequest,
  MusicRequestStatus,
  MusicTrack,
  UserRole,
  WebsiteSettings,
} from '../types';
import {
  BOOTSTRAP_ADMIN_EMAILS,
  deleteFirestoreDoc,
  getWorkspaceAccessToken,
  saveFirestoreDoc,
  signInWithGoogleWorkspace,
  subscribeAdminInvites,
  writeClientAuditLog,
} from '../lib/firebase';
import { apiRequest } from '../lib/apiClient';
import { ImageUploadField } from './ImageUploadField';

// 11. MUSIC MANAGEMENT & MUSIC REQUEST MODERATION TAB
export const MusicTab: React.FC<{
  tracks: MusicTrack[];
  requests: MusicRequest[];
  musicConfig: MusicOperatingConfig;
  settings: WebsiteSettings;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ tracks, requests, musicConfig, settings, onNotify }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MusicRequestStatus>('ALL');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  // Track creator
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [confirmDeleteReqId, setConfirmDeleteReqId] = useState<string | null>(null);
  const [confirmDeleteTrackId, setConfirmDeleteTrackId] = useState<string | null>(null);

  // Operating schedule state
  const [cfg, setCfg] = useState<MusicOperatingConfig>(musicConfig);
  useEffect(() => setCfg(musicConfig), [musicConfig]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveFirestoreDoc('websiteSettings', 'musicConfig', cfg as unknown as Record<string, unknown>, true);
      await writeClientAuditLog('UPDATE_MUSIC_CONFIG', 'websiteSettings', 'musicConfig', `Override=${cfg.manualOverride}`);
      onNotify('success', 'Jadwal operasional Music Request berhasil disimpan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan jadwal musik.');
    }
  };

  const handleToggleGlobalPlayer = async () => {
    try {
      await saveFirestoreDoc('websiteSettings', 'main', { musicEnabled: !settings.musicEnabled }, true);
      onNotify('success', `Pemutar musik ${!settings.musicEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengubah status pemutar musik.');
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `trk_${Date.now().toString(36)}`;
    try {
      await saveFirestoreDoc('musicTracks', id, {
        title: trackTitle.trim(),
        artist: trackArtist.trim(),
        audioUrl: trackUrl.trim(),
        isActive: true,
      });
      setTrackTitle('');
      setTrackArtist('');
      setTrackUrl('');
      onNotify('success', 'Track audio resmi ditambahkan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menambah track audio.');
    }
  };

  const updateRequest = async (reqItem: MusicRequest, patch: Partial<MusicRequest>) => {
    try {
      // If setting NOW_PLAYING, mark any existing NOW_PLAYING as COMPLETED
      if (patch.status === 'NOW_PLAYING') {
        const currentPlaying = requests.filter((r) => r.status === 'NOW_PLAYING' && r.id !== reqItem.id);
        for (const cur of currentPlaying) {
          await saveFirestoreDoc('musicRequests', cur.id, {
            ...cur,
            status: 'COMPLETED',
            updatedAt: serverTimestamp(),
          });
        }
      }

      const payload: Record<string, unknown> = {
        songTitle: reqItem.songTitle,
        artist: reqItem.artist,
        status: patch.status ?? reqItem.status,
        isPublicDisplay: patch.isPublicDisplay ?? reqItem.isPublicDisplay,
        createdAt: reqItem.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (reqItem.dedication) payload.dedication = reqItem.dedication;
      if (reqItem.senderName) payload.senderName = reqItem.senderName;
      if (reqItem.linkedTrackId) payload.linkedTrackId = reqItem.linkedTrackId;
      const note = notesDraft[reqItem.id] ?? reqItem.adminNotes;
      if (note !== undefined && note !== '') payload.adminNotes = note;

      await saveFirestoreDoc('musicRequests', reqItem.id, payload, false);
      await writeClientAuditLog('MODERATE_MUSIC_REQUEST', 'musicRequests', reqItem.id, `${reqItem.songTitle} -> ${payload.status}`);
      onNotify('success', `Status "${reqItem.songTitle}" diperbarui menjadi ${payload.status}.`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memperbarui status request.');
    }
  };

  const handleSkipToNext = async () => {
    const current = requests.find((r) => r.status === 'NOW_PLAYING');
    const nextQueued = requests.find((r) => r.status === 'QUEUED');
    if (current) {
      await updateRequest(current, { status: 'COMPLETED' });
    }
    if (nextQueued) {
      await updateRequest(nextQueued, { status: 'NOW_PLAYING', isPublicDisplay: true });
    } else if (!current) {
      onNotify('error', 'Antrean lagu kosong.');
    }
  };

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const sOk = statusFilter === 'ALL' || r.status === statusFilter;
      const qOk =
        !q ||
        r.songTitle.toLowerCase().includes(q) ||
        r.artist.toLowerCase().includes(q) ||
        (r.senderName || '').toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [requests, search, statusFilter]);

  return (
    <div className="space-y-10">
      {/* Music Request Management Section */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold">Manajemen Music Request</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Moderasi permintaan lagu masuk, kelola antrean putar, dan atur status Now Playing / Completed.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSkipToNext}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Lanjut ke Lagu Berikutnya</span>
            </button>
            <button
              type="button"
              onClick={handleToggleGlobalPlayer}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Player: {settings.musicEnabled ? 'AKTIF' : 'NONAKTIF'}
            </button>
          </div>
        </div>

        {/* Operating Schedule Config */}
        <form onSubmit={handleSaveConfig} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-4">
          <h3 className="text-sm font-display font-bold">Jadwal Operasional Music Request</h3>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1">Mode Akses</label>
              <select
                value={cfg.manualOverride ?? 'AUTO'}
                onChange={(e) => setCfg({ ...cfg, manualOverride: e.target.value as MusicOperatingConfig['manualOverride'] })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
              >
                <option value="AUTO">Otomatis (Jam Istirahat)</option>
                <option value="FORCE_OPEN">Buka Manual</option>
                <option value="FORCE_CLOSED">Tutup Manual</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Istirahat 1 Buka</label>
              <input
                type="time"
                value={cfg.openTimeWib ?? '09:30'}
                onChange={(e) => setCfg({ ...cfg, openTimeWib: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Istirahat 1 Tutup</label>
              <input
                type="time"
                value={cfg.closeTimeWib ?? '10:00'}
                onChange={(e) => setCfg({ ...cfg, closeTimeWib: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Istirahat 2 Buka</label>
              <input
                type="time"
                value={cfg.secondWindowOpenWib ?? '12:00'}
                onChange={(e) => setCfg({ ...cfg, secondWindowOpenWib: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Istirahat 2 Tutup</label>
              <input
                type="time"
                value={cfg.secondWindowCloseWib ?? '12:45'}
                onChange={(e) => setCfg({ ...cfg, secondWindowCloseWib: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Maks / Jam</label>
              <input
                type="number"
                min={1}
                max={20}
                value={Number.isFinite(cfg.maxRequestsPerHourPerClient) ? cfg.maxRequestsPerHourPerClient : 3}
                onChange={(e) => setCfg({ ...cfg, maxRequestsPerHourPerClient: Number(e.target.value) || 1 })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(cfg.requestsEnabled)}
                  onChange={(e) => setCfg({ ...cfg, requestsEnabled: e.target.checked })}
                />
                <span>Fitur Request Aktif</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(cfg.showPublicDisplay)}
                  onChange={(e) => setCfg({ ...cfg, showPublicDisplay: e.target.checked })}
                />
                <span>Tampilkan Now Playing &amp; Antrean ke Publik</span>
              </label>
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white font-semibold">
              Simpan Jadwal Request
            </button>
          </div>
        </form>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul lagu, artis, atau pengirim..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | MusicRequestStatus)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-xs"
          >
            <option value="ALL">Semua Status ({requests.length})</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="QUEUED">QUEUED</option>
            <option value="NOW_PLAYING">NOW_PLAYING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Requests Moderation List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada music request pada filter ini.
            </div>
          ) : (
            filteredRequests.map((reqItem) => (
              <div key={reqItem.id} className="p-4 space-y-3 text-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-[#1D4ED8] dark:text-[#38BDF8] font-semibold">
                      {reqItem.status} · {reqItem.isPublicDisplay ? 'Tampil Publik' : 'Privat'}
                      {reqItem.senderName ? ` · Pengirim: ${reqItem.senderName}` : ''}
                    </div>
                    <div className="text-sm font-bold text-[#0B1F3A] dark:text-white">
                      {reqItem.songTitle} — {reqItem.artist}
                    </div>
                    {reqItem.dedication && (
                      <div className="text-slate-600 dark:text-slate-300 italic mt-0.5">
                        &ldquo;{reqItem.dedication}&rdquo;
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateRequest(reqItem, { status: 'APPROVED', isPublicDisplay: true })}
                      className="px-2.5 py-1.5 rounded bg-emerald-600 text-white font-semibold inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(reqItem, { status: 'QUEUED', isPublicDisplay: true })}
                      className="px-2.5 py-1.5 rounded bg-[#1D4ED8] text-white font-semibold inline-flex items-center gap-1"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>Queue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(reqItem, { status: 'NOW_PLAYING', isPublicDisplay: true })}
                      className="px-2.5 py-1.5 rounded bg-[#0B1F3A] text-white font-semibold inline-flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Now Playing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(reqItem, { status: 'COMPLETED' })}
                      className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-semibold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Selesai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(reqItem, { status: 'REJECTED', isPublicDisplay: false })}
                      className="px-2.5 py-1.5 rounded bg-amber-600 text-white font-semibold inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    {confirmDeleteReqId === reqItem.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteFirestoreDoc('musicRequests', reqItem.id);
                            setConfirmDeleteReqId(null);
                            onNotify('success', 'Request dihapus.');
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteReqId(null)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteReqId(reqItem.id)}
                        className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Hapus request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="text"
                    value={notesDraft[reqItem.id] ?? reqItem.adminNotes ?? ''}
                    onChange={(e) => setNotesDraft({ ...notesDraft, [reqItem.id]: e.target.value })}
                    placeholder="Catatan moderasi admin (opsional)..."
                    className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => updateRequest(reqItem, { isPublicDisplay: !reqItem.isPublicDisplay })}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs whitespace-nowrap"
                  >
                    {reqItem.isPublicDisplay ? 'Sembunyikan Publik' : 'Tampilkan Publik'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRequest(reqItem, {})}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold whitespace-nowrap"
                  >
                    Simpan Catatan
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Authorized Background Audio Tracks */}
      <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-display font-bold">Daftar Audio Resmi Pemutar Musik</h3>
        <form onSubmit={handleAddTrack} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            placeholder="Judul Track"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="text"
            required
            value={trackArtist}
            onChange={(e) => setTrackArtist(e.target.value)}
            placeholder="Artis / Sumber"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="url"
            required
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            placeholder="URL Audio Resmi (.mp3 / .ogg)"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Audio</span>
          </button>
        </form>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {tracks.map((t) => (
            <div key={t.id} className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold">{t.title} — {t.artist}</div>
                <div className="text-slate-400 truncate max-w-md">{t.audioUrl}</div>
              </div>
              {confirmDeleteTrackId === t.id ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('musicTracks', t.id);
                      setConfirmDeleteTrackId(null);
                      onNotify('success', 'Audio dihapus.');
                    }}
                    className="px-2.5 py-1 rounded bg-red-600 text-white text-[11px] font-semibold"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteTrackId(null)}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px]"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTrackId(t.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                  title="Hapus audio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// 12. WEBSITE SETTINGS TAB
export const WebsiteSettingsTab: React.FC<{
  settings: WebsiteSettings;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ settings, onNotify }) => {
  const [form, setForm] = useState<WebsiteSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveFirestoreDoc('websiteSettings', 'main', form as unknown as Record<string, unknown>, true);
      await writeClientAuditLog('UPDATE_WEBSITE_SETTINGS', 'websiteSettings', 'main', 'Memperbarui profil & pengaturan website');
      onNotify('success', 'Pengaturan website PADMAWIJAYA berhasil diperbarui.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-display font-bold">Pengaturan Website &amp; Identitas Organisasi</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold block mb-1">Nama Organisasi</label>
          <input
            type="text"
            value={form.organizationName ?? ''}
            onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Periode Kepengurusan</label>
          <input
            type="text"
            value={form.period ?? ''}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <ImageUploadField
            label="Logo Organisasi (Upload Gambar / URL)"
            value={form.logoUrl ?? ''}
            onChange={(url) => setForm({ ...form, logoUrl: url })}
            driveFolder="ASET WEBSITE"
            maxWidth={512}
            aspectClass="w-20 h-20"
            placeholder="https://... atau upload file logo"
            onNotify={onNotify}
          />
          <ImageUploadField
            label="Foto Utama Hero / Halaman Depan (Upload Gambar / URL)"
            value={form.heroImageUrl ?? ''}
            onChange={(url) => setForm({ ...form, heroImageUrl: url })}
            driveFolder="ASET WEBSITE"
            maxWidth={1280}
            aspectClass="w-32 h-20"
            placeholder="https://... atau upload foto hero"
            onNotify={onNotify}
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Tagline</label>
          <input
            type="text"
            value={form.tagline ?? ''}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Tema Default Website</label>
          <select
            value={form.defaultTheme ?? 'light'}
            onChange={(e) => setForm({ ...form, defaultTheme: e.target.value as 'light' | 'dark' })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          >
            <option value="light">Light Mode (Putih)</option>
            <option value="dark">Dark Mode (Deep Navy)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold block mb-1">Perkenalan Organisasi</label>
          <textarea
            rows={3}
            value={form.introduction ?? ''}
            onChange={(e) => setForm({ ...form, introduction: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Visi</label>
          <textarea
            rows={2}
            value={form.vision ?? ''}
            onChange={(e) => setForm({ ...form, vision: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Misi</label>
          <textarea
            rows={4}
            value={form.mission ?? ''}
            onChange={(e) => setForm({ ...form, mission: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Sejarah Organisasi</label>
          <textarea
            rows={3}
            value={form.history ?? ''}
            onChange={(e) => setForm({ ...form, history: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Tujuan Organisasi</label>
          <textarea
            rows={2}
            value={form.goals ?? ''}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="email"
          value={form.email ?? ''}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email Resmi"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <input
          type="text"
          value={form.phone ?? ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Telepon"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <input
          type="text"
          value={form.address ?? ''}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Alamat Sekretariat"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <input
          type="url"
          value={form.instagramUrl ?? ''}
          onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
          placeholder="Instagram URL"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <input
          type="url"
          value={form.tiktokUrl ?? ''}
          onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })}
          placeholder="TikTok URL"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
        <input
          type="url"
          value={form.youtubeUrl ?? ''}
          onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
          placeholder="YouTube URL"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-sm font-semibold"
      >
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan Website'}
      </button>
    </form>
  );
};

// 13. ADMIN ACCOUNT MANAGEMENT TAB (Super Admin Only)
export const AdminAccountsTab: React.FC<{
  admins: AdminUser[];
  divisions: Division[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ admins, divisions, onNotify }) => {
  const [loginMethod, setLoginMethod] = useState<'google' | 'password'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [assignedDivisionId, setAssignedDivisionId] = useState(divisions[0]?.id || 'bph');
  const [permissions, setPermissions] = useState<AdminPermission[]>([
    'manageAnnouncements',
    'managePrograms',
    'manageGallery',
  ]);
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<AdminInvite[]>([]);

  useEffect(() => {
    const unsub = subscribeAdminInvites(setInvites);
    return () => unsub();
  }, []);

  const allPerms: Array<{ id: AdminPermission; label: string }> = [
    { id: 'manageMembers', label: 'Kelola Anggota' },
    { id: 'manageContent', label: 'Kelola Konten & Kalender' },
    { id: 'manageAnnouncements', label: 'Kelola Pengumuman' },
    { id: 'managePrograms', label: 'Kelola Program Kerja' },
    { id: 'manageAttendance', label: 'Kelola Absensi' },
    { id: 'manageGallery', label: 'Kelola Galeri' },
    { id: 'manageMusic', label: 'Kelola Musik & Request' },
    { id: 'manageDocuments', label: 'Kelola Dokumen' },
  ];

  const togglePerm = (p: AdminPermission) => {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiRequest<{ ok: boolean; message?: string }>('/api/admin/accounts/create', {
        method: 'POST',
        body: {
          loginMethod,
          email: email.trim(),
          password: loginMethod === 'password' ? password : '',
          displayName: displayName.trim(),
          role,
          permissions: role === 'SUPER_ADMIN' ? allPerms.map((p) => p.id) : permissions,
          assignedDivisionId: role === 'DIVISION_ADMIN' ? assignedDivisionId : '',
        },
      });
      setEmail('');
      setPassword('');
      setDisplayName('');
      onNotify(
        'success',
        res.message || 'Akun Admin berhasil dibuat dan didaftarkan ke sistem RBAC.'
      );
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal membuat akun admin.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-display font-bold">Manajemen Akun Admin (Super Admin Only)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Buat akun pengelola (Super Admin, Admin Umum, atau Admin Divisi) dengan Email dan Kata Sandi melalui Firebase Authentication.
        </p>
      </div>

      {/* Pre-configured Bootstrap Admin Emails */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-2 text-xs">
        <div className="font-bold text-sm">Email Super Admin Terdaftar di Konfigurasi Sistem</div>
        <div className="flex flex-wrap gap-2">
          {BOOTSTRAP_ADMIN_EMAILS.map((em) => (
            <span
              key={em}
              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#152544] font-mono text-slate-700 dark:text-slate-200"
            >
              {em}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Login Admin menggunakan Email &amp; Kata Sandi yang terdaftar pada Firebase Authentication proyek ini.
        </p>
      </div>

      <form onSubmit={handleCreate} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-display font-bold">Tambah Akun Admin / Admin Divisi Baru</h3>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                loginMethod === 'password'
                  ? 'bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Email &amp; Sandi
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('google')}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                loginMethod === 'google'
                  ? 'bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Allowlist Undangan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nama Pengelola (cth: Wakil Ketua OSIS)"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={loginMethod === 'password' ? 'Email Admin (cth: wakil@padmawijaya.sch.id)' : 'Email Undangan Admin'}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          />
          {loginMethod === 'password' && (
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Sandi Awal (min. 6 karakter)"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            />
          )}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
          >
            <option value="ADMIN">ADMIN (Umum dengan Izin Khusus)</option>
            <option value="DIVISION_ADMIN">DIVISION_ADMIN (Admin Divisi)</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Penuh)</option>
          </select>
        </div>

        {role === 'DIVISION_ADMIN' && (
          <div>
            <label className="text-xs font-semibold block mb-1">Divisi yang Ditugaskan</label>
            <select
              value={assignedDivisionId}
              onChange={(e) => setAssignedDivisionId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === 'ADMIN' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Hak Akses Modul:</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {allPerms.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold"
        >
          {creating
            ? 'Menyimpan...'
            : loginMethod === 'password'
            ? 'Buat Akun Email & Sandi'
            : 'Daftarkan Email Undangan'}
        </button>
      </form>

      {/* Google Admin Invites List */}
      <div className="space-y-2">
        <h3 className="text-sm font-display font-bold">Daftar Email Google Admin Terdaftar (Allowlist)</h3>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {invites.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              Belum ada undangan email Google tambahan. Gunakan form di atas untuk menambahkan akun Google admin lain.
            </div>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-sm">
                    {inv.displayName} ({inv.role})
                  </div>
                  <div className="text-slate-500">
                    {inv.email} · {inv.isActive ? 'Aktif (Bisa login Google)' : 'Nonaktif'}
                    {inv.assignedDivisionId ? ` · Divisi: ${inv.assignedDivisionId}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveFirestoreDoc('adminInvites', inv.id, { isActive: !inv.isActive }, true);
                      onNotify('success', `Akses Google ${inv.email} ${!inv.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`);
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    {inv.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteFirestoreDoc('adminInvites', inv.id);
                      onNotify('success', `Undangan ${inv.email} dihapus.`);
                    }}
                    className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Admin Accounts */}
      <div className="space-y-2">
        <h3 className="text-sm font-display font-bold">Akun Admin yang Sudah Masuk / Aktif</h3>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
          {admins.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              Belum ada akun admin tambahan yang masuk.
            </div>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm">
                    {a.displayName} ({a.role})
                  </div>
                  <div className="text-slate-500">
                    {a.email} · {a.isActive ? 'Aktif' : 'Nonaktif'}
                    {a.assignedDivisionId ? ` · Divisi: ${a.assignedDivisionId}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await saveFirestoreDoc('admins', a.id, { isActive: !a.isActive }, true);
                    onNotify('success', `Akun ${a.email} ${!a.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`);
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  {a.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to extract Google Sheet / Drive Folder ID from a pasted URL or bare ID
function extractClientGoogleId(raw: string, kind: 'sheet' | 'folder'): string {
  const input = String(raw || '').trim();
  if (!input) return '';
  if (kind === 'sheet') {
    const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i.exec(input);
    if (m?.[1]) return m[1];
  } else {
    const m = /\/folders\/([a-zA-Z0-9_-]+)/i.exec(input);
    if (m?.[1]) return m[1];
    const idParam = /[?&]id=([a-zA-Z0-9_-]+)/i.exec(input);
    if (idParam?.[1]) return idParam[1];
  }
  return input.split(/[/?#]/)[0].trim();
}

// 14. INTEGRATION SETTINGS TAB (Google Drive, Google Sheets, Firebase Auth Status & Setup Guide)
export const IntegrationsTab: React.FC<{
  integrationSettings: IntegrationSettings;
  integrationJobs: IntegrationJob[];
  onNotify: (type: 'success' | 'error', msg: string) => void;
}> = ({ integrationSettings, integrationJobs, onNotify }) => {
  const [form, setForm] = useState<IntegrationSettings>(integrationSettings);
  const [sheetInput, setSheetInput] = useState(integrationSettings.googleSheetsSpreadsheetId ?? '');
  const [folderInput, setFolderInput] = useState(integrationSettings.googleDriveFolderId ?? '');
  const [diag, setDiag] = useState<{
    serviceAccountConfigured: boolean;
    serviceAccountEmail: string | null;
    oauthConnected?: boolean;
    firebaseAdminReady: boolean;
    driveAuthorized: boolean;
    driveFolderName: string | null;
    driveError: string | null;
    sheetsConfigured: boolean;
    sheetsAuthorized: boolean;
    sheetsTitle: string | null;
    sheetsTabs?: string[];
    sheetsError: string | null;
  } | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [connectingExisting, setConnectingExisting] = useState(false);
  const [bootstrappingAll, setBootstrappingAll] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    null | 'connect-existing' | 'bootstrap-all' | 'init-folders' | 'create-sheet' | 'sync-sheets'
  >(null);

  useEffect(() => {
    setForm(integrationSettings);
    setSheetInput(integrationSettings.googleSheetsSpreadsheetId ?? '');
    setFolderInput(integrationSettings.googleDriveFolderId ?? '');
  }, [integrationSettings]);

  const checkStatus = async () => {
    setLoadingDiag(true);
    try {
      const res = await apiRequest<NonNullable<typeof diag> & { ok: boolean }>('/api/integrations/status', {
        method: 'GET',
      });
      setDiag(res);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memeriksa status integrasi.');
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, []);

  const handleConnectGoogleWorkspace = async () => {
    setConnectingOAuth(true);
    try {
      const res = await signInWithGoogleWorkspace();
      if (!res.accessToken) {
        onNotify('error', 'Izin akses Google Drive & Sheets tidak diperoleh. Pastikan Anda mencentang semua izin di popup Google.');
      } else {
        onNotify('success', 'Akun Google Drive & Sheets berhasil terhubung! Sekarang Anda bisa langsung hubungkan & sinkronkan Sheet.');
      }
      await checkStatus();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.');
    } finally {
      setConnectingOAuth(false);
    }
  };

  const parsedSheetId = extractClientGoogleId(sheetInput, 'sheet');
  const parsedFolderId = extractClientGoogleId(folderInput, 'folder');

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanSheetId = extractClientGoogleId(sheetInput, 'sheet');
      const cleanFolderId = extractClientGoogleId(folderInput, 'folder') || form.googleDriveFolderId;
      const nextPayload: IntegrationSettings = {
        ...form,
        googleSheetsSpreadsheetId: cleanSheetId,
        googleDriveFolderId: cleanFolderId,
        googleDriveFolderUrl: cleanFolderId
          ? `https://drive.google.com/drive/folders/${cleanFolderId}`
          : form.googleDriveFolderUrl,
      };
      await saveFirestoreDoc('websiteSettings', 'integrations', nextPayload as unknown as Record<string, unknown>, true);
      setForm(nextPayload);
      setSheetInput(cleanSheetId);
      setFolderInput(cleanFolderId);
      onNotify('success', 'ID Spreadsheet & Folder Drive disimpan.');
      void checkStatus();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi integrasi.');
    }
  };

  const executeConfirmedAction = async () => {
    const act = confirmAction;
    setConfirmAction(null);
    if (!act) return;

    if (act === 'connect-existing') {
      if (!parsedSheetId) {
        onNotify('error', 'Tempel Link URL atau ID Google Sheet Anda terlebih dahulu.');
        return;
      }
      setConnectingExisting(true);
      try {
        const res = await apiRequest<{
          ok: boolean;
          spreadsheetId: string;
          title: string;
          createdTabs: string[];
          syncedCount: number;
          membersSynced: number;
          programsSynced: number;
          driveInitialized: boolean;
          driveWarning: string | null;
        }>('/api/integrations/sheets/connect-existing', {
          method: 'POST',
          body: {
            spreadsheetInput: parsedSheetId,
            folderInput: parsedFolderId,
            range: form.googleSheetsRange || 'Absensi!A:I',
          },
        });
        setForm((prev) => ({
          ...prev,
          googleSheetsSpreadsheetId: res.spreadsheetId,
          googleDriveFolderId: parsedFolderId || prev.googleDriveFolderId,
          autoSyncAttendanceToSheets: true,
        }));
        setSheetInput(res.spreadsheetId);
        const tabNote =
          res.createdTabs.length > 0 ? ` Tab baru dibuat: ${res.createdTabs.join(', ')}.` : '';
        const driveNote = res.driveInitialized
          ? ' Folder Drive PADMAWIJAYA siap.'
          : res.driveWarning
          ? ` (Catatan Drive: ${res.driveWarning})`
          : '';
        onNotify(
          'success',
          `Sheet "${res.title}" berhasil dihubungkan & jalan! (${res.membersSynced} anggota, ${res.programsSynced} proker, ${res.syncedCount} baris absensi disinkronkan.${tabNote}${driveNote})`
        );
        void checkStatus();
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal menghubungkan Sheet Anda.');
      } finally {
        setConnectingExisting(false);
      }
    } else if (act === 'bootstrap-all') {
      setBootstrappingAll(true);
      try {
        const res = await apiRequest<{
          ok: boolean;
          spreadsheetId: string;
          spreadsheetUrl: string;
          title: string;
          syncedCounts?: { attendance: number; members: number; programs: number };
        }>('/api/integrations/bootstrap-all', {
          method: 'POST',
        });
        setForm((prev) => ({
          ...prev,
          googleSheetsSpreadsheetId: res.spreadsheetId,
          googleSheetsRange: 'Absensi!A:I',
          autoSyncAttendanceToSheets: true,
        }));
        setSheetInput(res.spreadsheetId);
        onNotify(
          'success',
          `Semua selesai dibuat! 6 folder Drive + Spreadsheet "${res.title}" (3 tab: Absensi, Data Anggota, Program Kerja) berhasil disiapkan & disinkronkan.`
        );
        void checkStatus();
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal menyiapkan Drive & Spreadsheet otomatis.');
      } finally {
        setBootstrappingAll(false);
      }
    } else if (act === 'init-folders') {
      try {
        const res = await apiRequest<{ ok: boolean; message: string }>('/api/integrations/drive/initialize-folders', {
          method: 'POST',
        });
        onNotify('success', res.message);
        void checkStatus();
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal membuat folder Drive.');
      }
    } else if (act === 'create-sheet') {
      setCreatingSheet(true);
      try {
        const res = await apiRequest<{
          ok: boolean;
          spreadsheetId: string;
          spreadsheetUrl: string;
          title: string;
        }>('/api/integrations/sheets/create-spreadsheet', {
          method: 'POST',
        });
        setForm((prev) => ({
          ...prev,
          googleSheetsSpreadsheetId: res.spreadsheetId,
          googleSheetsRange: 'Absensi!A:I',
          autoSyncAttendanceToSheets: true,
        }));
        setSheetInput(res.spreadsheetId);
        onNotify('success', `Spreadsheet "${res.title}" (${res.spreadsheetId}) berhasil dibuat dan disimpan.`);
        void checkStatus();
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal membuat Google Spreadsheet.');
      } finally {
        setCreatingSheet(false);
      }
    } else if (act === 'sync-sheets') {
      setSyncingSheets(true);
      try {
        const res = await apiRequest<{
          ok: boolean;
          syncedCount: number;
          membersSynced?: number;
          programsSynced?: number;
        }>('/api/integrations/sheets/sync', {
          method: 'POST',
        });
        onNotify(
          'success',
          `Sinkronisasi selesai (${res.syncedCount} baris absensi baru${
            res.membersSynced !== undefined ? `, ${res.membersSynced} anggota, ${res.programsSynced} program kerja` : ''
          }).`
        );
        void checkStatus();
      } catch (err) {
        onNotify('error', err instanceof Error ? err.message : 'Gagal sinkronisasi Google Sheets.');
      } finally {
        setSyncingSheets(false);
      }
    }
  };

  const hasWorkspaceToken = Boolean(getWorkspaceAccessToken()) || Boolean(diag?.oauthConnected);
  const canExecuteWorkspace = hasWorkspaceToken || Boolean(diag?.serviceAccountConfigured);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold">Integrasi Google Drive, Google Sheets &amp; Firebase</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hubungkan akun Google Anda lalu tempel Link/ID Google Sheet yang sudah Anda miliki untuk langsung mengisi tab Absensi, Data Anggota &amp; Program Kerja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleConnectGoogleWorkspace}
            disabled={connectingOAuth}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F1D36] hover:bg-slate-50 dark:hover:bg-[#152544] text-xs font-semibold"
          >
            {connectingOAuth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />}
            <span>{hasWorkspaceToken ? 'Google Terhubung (Ganti/Refresh)' : 'Langkah 1: Login Akun Google'}</span>
          </button>
          <button
            type="button"
            onClick={checkStatus}
            disabled={loadingDiag}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
          >
            {loadingDiag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Cek Status</span>
          </button>
        </div>
      </div>

      {/* LANGKAH CEPAT: PAKAI GOOGLE SHEET YANG SUDAH ADA */}
      <div className="p-5 rounded-xl border-2 border-[#1D4ED8]/40 bg-white dark:bg-[#0F1D36] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8] font-bold">
              Cara Tercepat — Sudah Punya Google Sheet
            </div>
            <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white">
              Hubungkan Google Sheet Anda &amp; Jalankan Otomatis (3 Tab + Folder Drive)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Cukup 2 klik: (1) Login dengan akun Google pemilik Sheet, (2) Tempel link/ID Google Sheet Anda lalu klik Hubungkan. Sistem otomatis membuat tab <span className="font-mono">Absensi</span>, <span className="font-mono">Data Anggota</span>, dan <span className="font-mono">Program Kerja</span> serta mengisi seluruh data.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 self-start md:self-center ${
              hasWorkspaceToken
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {hasWorkspaceToken ? '✓ Sesi Google Aktif' : '1. Perlu Login Google Dulu'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1">
              Tempel Link URL atau ID Google Sheet Anda
            </label>
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit atau ID Sheet"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1528] text-xs font-mono"
            />
            {parsedSheetId && parsedSheetId !== sheetInput.trim() && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                ID terdeteksi: {parsedSheetId}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">
              Link URL / ID Folder Google Drive (Opsional)
            </label>
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1528] text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!hasWorkspaceToken && !diag?.serviceAccountConfigured && (
            <button
              type="button"
              onClick={handleConnectGoogleWorkspace}
              disabled={connectingOAuth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] text-white text-xs font-bold"
            >
              {connectingOAuth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Langkah 1: Login Akun Google Pemilik Sheet</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmAction('connect-existing')}
            disabled={connectingExisting || !parsedSheetId || !canExecuteWorkspace}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectingExisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{hasWorkspaceToken ? 'Hubungkan, Siapkan 3 Tab & Sinkronkan Sheet Ini' : 'Langkah 2: Hubungkan & Sinkronkan Sheet Ini'}</span>
          </button>
        </div>

        {!diag?.serviceAccountConfigured && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#152544] text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Info Sinkronisasi:</strong> Sesi login Google di atas mengaktifkan penuh seluruh fitur Admin (upload logo/foto ke Drive, penyiapan tab Sheet, dan sinkronisasi data ke Sheet). Khusus agar <strong>Anggota</strong> dapat mengirim foto absensi swafoto langsung ke Drive &amp; Sheet saat Admin tidak login, isi variabel <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> di Secrets server lalu bagikan Sheet &amp; Folder Drive ke email Service Account sebagai Editor. Selama belum diisi, absensi anggota tetap tersimpan aman di database dan otomatis masuk ke Sheet saat Admin klik Sinkronisasi.
          </div>
        )}
      </div>

      {/* Opsi B: 1-Click Complete Setup Banner (Drive Subfolders + 3-Tab Google Spreadsheet) */}
      <div className="p-5 rounded-xl border border-[#1D4ED8]/30 bg-gradient-to-r from-[#0B1F3A] to-[#132F5B] text-white space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
              Alternatif — Buat Spreadsheet Baru Otomatis
            </div>
            <h3 className="text-base font-display font-bold">
              Buat Folder Drive + Google Spreadsheet Baru (3 Tab Otomatis)
            </h3>
            <p className="text-xs text-slate-200 max-w-2xl">
              Gunakan opsi ini jika Anda ingin sistem membuatkan file Spreadsheet baru di dalam folder Drive <span className="font-mono text-sky-200">{parsedFolderId || form.googleDriveFolderId}</span> lengkap dengan 6 subfolder (ABSENSI, DOKUMENTASI, GALERI KEGIATAN, PROPOSAL DAN LPJ, ARSIP ORGANISASI, ASET WEBSITE).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmAction('bootstrap-all')}
              disabled={bootstrappingAll || !canExecuteWorkspace}
              title={!canExecuteWorkspace ? 'Klik Login Akun Google terlebih dahulu' : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0B1F3A] hover:bg-sky-50 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bootstrappingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
              <span>Buat Spreadsheet Baru &amp; 6 Folder Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Confirmation Dialog for Mutating Google Workspace Operations */}
      {confirmAction && (
        <div className="p-4 rounded-xl border border-[#1D4ED8] bg-sky-50/70 dark:bg-[#152544] space-y-3 text-xs">
          <div className="font-bold text-[#0B1F3A] dark:text-white">
            Konfirmasi Aksi Google Drive / Google Sheets
          </div>
          <p className="text-slate-700 dark:text-slate-200">
            {confirmAction === 'connect-existing' &&
              `Hubungkan Spreadsheet ID "${parsedSheetId}", buat otomatis tab yang belum ada (Absensi, Data Anggota, Program Kerja) tanpa menghapus tab lama, siapkan folder Drive PADMAWIJAYA 2026-2027 di "${parsedFolderId}", dan langsung sinkronkan data terkini?`}
            {confirmAction === 'bootstrap-all' &&
              `Buat seluruh struktur 6 subfolder PADMAWIJAYA 2026-2027 DAN buat Google Spreadsheet baru bernama "PADMAWIJAYA 2026/2027 — Database Absensi & Organisasi" dengan 3 tab di dalam folder Drive ID ${parsedFolderId || form.googleDriveFolderId}?`}
            {confirmAction === 'init-folders' &&
              `Buat struktur 6 folder PADMAWIJAYA 2026-2027 di dalam folder Google Drive ID ${parsedFolderId || form.googleDriveFolderId}?`}
            {confirmAction === 'create-sheet' &&
              `Buat file Google Spreadsheet baru dengan 3 tab di dalam folder Google Drive ${parsedFolderId || form.googleDriveFolderId}?`}
            {confirmAction === 'sync-sheets' &&
              `Sinkronkan data Absensi, Data Anggota, dan Program Kerja ke Google Spreadsheet ID ${parsedSheetId || form.googleSheetsSpreadsheetId}?`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={executeConfirmedAction}
              className="px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white font-semibold"
            >
              Ya, Lanjutkan
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Live Server Diagnostics */}
      {diag && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-2">
            <div className="font-display font-bold text-sm flex items-center justify-between">
              <span>Google Drive Storage</span>
              <span className={diag.driveAuthorized ? 'text-emerald-600' : 'text-amber-600'}>
                {diag.driveAuthorized ? 'TERHUBUNG' : 'PERLU KONEKSI'}
              </span>
            </div>
            <div>Folder Target ID: <span className="font-mono">{parsedFolderId || form.googleDriveFolderId}</span></div>
            {diag.serviceAccountEmail && (
              <div>Service Account: <span className="font-mono">{diag.serviceAccountEmail}</span></div>
            )}
            <div>Mode Akses Aktif: {diag.serviceAccountConfigured ? 'Service Account Server' : hasWorkspaceToken ? 'Google OAuth Admin (Aktif di Sesi)' : 'Belum Terhubung'}</div>
            {diag.driveAuthorized ? (
              <div className="text-emerald-600">Folder terbaca: {diag.driveFolderName}</div>
            ) : (
              <div className="text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{diag.driveError}</span>
              </div>
            )}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction('init-folders')}
                disabled={!canExecuteWorkspace}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white font-semibold disabled:opacity-50"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Siapkan 6 Folder Drive</span>
              </button>
              <a
                href={`https://drive.google.com/drive/folders/${parsedFolderId || form.googleDriveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-semibold"
              >
                <span>Buka Folder Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-2">
            <div className="font-display font-bold text-sm flex items-center justify-between">
              <span>Google Sheets Reporting</span>
              <span className={diag.sheetsAuthorized ? 'text-emerald-600' : 'text-amber-600'}>
                {diag.sheetsAuthorized ? 'TERHUBUNG' : 'BELUM TERHUBUNG'}
              </span>
            </div>
            <div>Spreadsheet ID: <span className="font-mono">{parsedSheetId || form.googleSheetsSpreadsheetId || '(Belum diatur)'}</span></div>
            {diag.sheetsAuthorized ? (
              <>
                <div className="text-emerald-600">Judul Sheet: {diag.sheetsTitle}</div>
                {diag.sheetsTabs && diag.sheetsTabs.length > 0 && (
                  <div className="text-slate-500">Tab tersedia: {diag.sheetsTabs.join(', ')}</div>
                )}
              </>
            ) : (
              <div className="text-amber-700 dark:text-amber-300">
                {diag.sheetsError || 'Tempel Link/ID Sheet Anda di kotak atas lalu klik Hubungkan & Sinkronkan.'}
              </div>
            )}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction('create-sheet')}
                disabled={creatingSheet || !canExecuteWorkspace}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50"
              >
                {creatingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Buat Sheet Baru</span>
              </button>
              {(parsedSheetId || form.googleSheetsSpreadsheetId) && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${parsedSheetId || form.googleSheetsSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  <span>Buka Spreadsheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setConfirmAction('sync-sheets')}
                disabled={syncingSheets || !(parsedSheetId || form.googleSheetsSpreadsheetId) || !canExecuteWorkspace}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white font-semibold disabled:opacity-50"
              >
                {syncingSheets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Sinkronisasi Manual ke Sheets</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-4">
        <h3 className="text-sm font-display font-bold">Pengaturan Lanjutan Folder Drive &amp; Range Spreadsheet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Google Drive Folder ID</label>
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Google Sheets Spreadsheet ID</label>
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="ID atau URL Google Spreadsheet..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Range Tab Sheet Absensi</label>
            <input
              type="text"
              value={form.googleSheetsRange ?? 'Absensi!A:I'}
              onChange={(e) => setForm({ ...form, googleSheetsRange: e.target.value })}
              placeholder="Absensi!A:I"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-mono"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={Boolean(form.autoSyncAttendanceToSheets)}
                onChange={(e) => setForm({ ...form, autoSyncAttendanceToSheets: e.target.checked })}
              />
              <span>Sinkronisasi otomatis setiap absensi anggota masuk</span>
            </label>
          </div>
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold">
          Simpan Konfigurasi Lanjutan
        </button>
      </form>

      {/* Setup Instructions */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-3 text-xs leading-relaxed">
        <h3 className="text-sm font-display font-bold">Panduan Koneksi Drive, Sheets &amp; Service Account</h3>
        <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
          <li><strong>Menghubungkan Sheet yang Sudah Ada:</strong> Klik <em>Langkah 1: Login Akun Google</em>, tempel link/ID Google Sheet Anda pada kotak di atas, lalu klik <em>Hubungkan &amp; Sinkronkan Sheet Ini</em>. Tab <em>Absensi</em>, <em>Data Anggota</em>, dan <em>Program Kerja</em> dibuat otomatis tanpa menghapus tab lain yang sudah ada.</li>
          <li><strong>Unggah Swafoto Anggota Mandiri (Tanpa Login Google Admin):</strong> Untuk mengizinkan anggota yang login dengan Nomor Anggota mengunggah swafoto langsung ke Drive di latar belakang, tambahkan kunci JSON Service Account GCP ke panel Secrets server sebagai <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> (dan <span className="font-mono">FIREBASE_SERVICE_ACCOUNT_JSON</span> untuk reset sandi oleh admin), lalu bagikan folder Drive serta Spreadsheet tersebut ke email Service Account sebagai <strong>Editor</strong>.</li>
          <li><strong>Login Nomor Anggota:</strong> Buka Firebase Console → Authentication → Sign-in method → pastikan penyedia <strong>Email/Password</strong> berstatus aktif.</li>
        </ol>
      </div>

      {/* Integration Logs */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
          Riwayat Eksekusi Integrasi Drive &amp; Sheets
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto text-xs">
          {integrationJobs.length === 0 ? (
            <div className="p-4 text-slate-500">Belum ada log integrasi.</div>
          ) : (
            integrationJobs.map((j) => (
              <div key={j.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold mr-2">{j.service}</span>
                  <span className="text-slate-600 dark:text-slate-300">{j.operation}: {j.message}</span>
                </div>
                <span className={j.status === 'SUCCESS' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  {j.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
