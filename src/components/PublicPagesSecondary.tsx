import React, { useMemo, useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  ExternalLink,
  Clock,
  ShieldCheck,
  Music,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  GalleryAlbum,
  GalleryItem,
  JourneyItem,
  CalendarEvent,
  ArchiveDocument,
  DutySchedule,
  MusicRequest,
  MusicOperatingConfig,
  PageRoute,
  DocumentCategory,
} from '../types';
import { SafeImage } from './PublicPagesPrimary';
import { apiRequest } from '../lib/apiClient';

// F. GALLERY PAGE (Photo, Video, Albums, Lightbox)
export const GalleryPage: React.FC<{
  albums: GalleryAlbum[];
  items: GalleryItem[];
}> = ({ albums, items }) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('ALL');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const albOk = selectedAlbumId === 'ALL' || item.albumId === selectedAlbumId;
      const typeOk = mediaFilter === 'all' || item.mediaType === mediaFilter;
      return albOk && typeOk;
    });
  }, [items, selectedAlbumId, mediaFilter]);

  const photoItems = visibleItems.filter((i) => i.mediaType === 'photo');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Dokumentasi Visual
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Galeri Kegiatan PADMAWIJAYA 2026/2027
        </h1>
      </header>

      {/* Albums Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {albums.map((alb) => (
          <button
            key={alb.id}
            type="button"
            onClick={() => setSelectedAlbumId((prev) => (prev === alb.id ? 'ALL' : alb.id))}
            className={`text-left rounded-xl overflow-hidden border transition-colors ${
              selectedAlbumId === alb.id
                ? 'border-[#1D4ED8] dark:border-[#38BDF8] bg-slate-50 dark:bg-[#152544]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]'
            }`}
          >
            <div className="aspect-[16/9] overflow-hidden">
              <SafeImage
                src={alb.coverUrl}
                alt={alb.title}
                className="w-full h-full object-cover"
                fallbackLabel="Album Kegiatan"
              />
            </div>
            <div className="p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Album · {alb.publishedAt}
              </div>
              <h2 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white">
                {alb.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                {alb.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0F1D36]">
          <button
            type="button"
            onClick={() => setMediaFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              mediaFilter === 'all'
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Semua Media
          </button>
          <button
            type="button"
            onClick={() => setMediaFilter('photo')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1 ${
              mediaFilter === 'photo'
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Foto
          </button>
          <button
            type="button"
            onClick={() => setMediaFilter('video')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1 ${
              mediaFilter === 'video'
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Video
          </button>
        </div>

        {selectedAlbumId !== 'ALL' && (
          <button
            type="button"
            onClick={() => setSelectedAlbumId('ALL')}
            className="text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
          >
            Tampilkan Semua Album
          </button>
        )}
      </div>

      {/* Grid */}
      {visibleItems.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
          Belum ada item media pada filter ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleItems.map((item) => {
            const pIdx = photoItems.findIndex((p) => p.id === item.id);
            return (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]"
              >
                {item.mediaType === 'photo' ? (
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(pIdx >= 0 ? pIdx : 0)}
                    className="w-full aspect-[4/3] overflow-hidden block"
                  >
                    <SafeImage
                      src={item.url}
                      alt={item.caption}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      fallbackLabel="Foto Galeri"
                    />
                  </button>
                ) : (
                  <div className="aspect-[4/3] bg-black flex items-center justify-center">
                    <video src={item.url} controls className="w-full h-full object-contain" />
                  </div>
                )}
                <p className="p-3.5 text-xs text-slate-600 dark:text-slate-300">{item.caption}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photoItems[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Tutup Lightbox"
            className="absolute top-4 right-4 p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          {photoItems.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((lightboxIndex - 1 + photoItems.length) % photoItems.length)
              }
              aria-label="Foto Sebelumnya"
              className="absolute left-4 p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div className="max-w-4xl w-full space-y-3 text-center">
            <img
              src={photoItems[lightboxIndex].url}
              alt={photoItems[lightboxIndex].caption}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] mx-auto rounded-lg object-contain"
            />
            <p className="text-sm text-slate-200">{photoItems[lightboxIndex].caption}</p>
          </div>

          {photoItems.length > 1 && (
            <button
              type="button"
              onClick={() => setLightboxIndex((lightboxIndex + 1) % photoItems.length)}
              aria-label="Foto Berikutnya"
              className="absolute right-4 p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// G. OUR JOURNEY TIMELINE
export const JourneyPage: React.FC<{ journey: JourneyItem[] }> = ({ journey }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Kronologi Organisasi
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Perjalanan PADMAWIJAYA 2026/2027
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Linimasa resmi mulai dari pembentukan awal, pelantikan, rapat kerja, hingga kegiatan besar periode 2026/2027.
        </p>
      </header>

      <div className="space-y-8">
        {journey.map((step, index) => (
          <div
            key={step.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]"
          >
            <div className="md:col-span-7 space-y-2">
              <div className="text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
                {String(index + 1).padStart(2, '0')} · {step.phase} · {step.date}
              </div>
              <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
                {step.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {step.description}
              </p>
            </div>
            {step.imageUrl && (
              <div className="md:col-span-5 aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                <SafeImage
                  src={step.imageUrl}
                  alt={step.title}
                  className="w-full h-full object-cover"
                  fallbackLabel={step.phase}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// H. CALENDAR PAGE
export const CalendarPage: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const [cursorDate, setCursorDate] = useState(() => new Date(2026, 10, 1)); // Nov 2026 default
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const monthLabel = cursorDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const list = map.get(evt.date) || [];
      list.push(evt);
      map.set(evt.date, list);
    }
    return map;
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
            Jadwal Organisasi
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
            Kalender Kegiatan &amp; Rapat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursorDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-display font-bold min-w-[150px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setCursorDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#152544] text-center text-xs font-semibold py-2.5 text-slate-600 dark:text-slate-300">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[84px] border-b border-r border-slate-100 dark:border-slate-800/70" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate.get(dateKey) || [];
              return (
                <div
                  key={dateKey}
                  className="min-h-[84px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800/70 flex flex-col gap-1"
                >
                  <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {day}
                  </span>
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEvent(ev)}
                      className="text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white truncate hover:opacity-90"
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
            Daftar Agenda Terjadwal
          </h2>
          {events.map((evt) => (
            <button
              key={evt.id}
              type="button"
              onClick={() => setSelectedEvent(evt)}
              className={`w-full text-left p-4 rounded-xl border transition-colors space-y-1 ${
                selectedEvent?.id === evt.id
                  ? 'border-[#1D4ED8] bg-slate-50 dark:bg-[#152544]'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]'
              }`}
            >
              <div className="text-xs text-[#1D4ED8] dark:text-[#38BDF8] font-medium tabular-nums">
                {evt.date} · {evt.time} · {evt.category}
              </div>
              <div className="text-sm font-display font-bold text-[#0B1F3A] dark:text-white">
                {evt.title}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {evt.location} · {evt.organizer}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1D36] flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
              {selectedEvent.date} · {selectedEvent.time} · {selectedEvent.category}
            </div>
            <h3 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
              {selectedEvent.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{selectedEvent.description}</p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Lokasi: {selectedEvent.location} · Penanggung Jawab: {selectedEvent.organizer}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// I. DOCUMENT ARCHIVE PAGE (Public Documents Only)
export const DocumentsPage: React.FC<{ documents: ArchiveDocument[] }> = ({ documents }) => {
  const [cat, setCat] = useState<'ALL' | DocumentCategory>('ALL');

  const filtered = documents.filter((d) => d.visibility === 'public' && (cat === 'ALL' || d.category === cat));
  const categories: Array<'ALL' | DocumentCategory> = [
    'ALL',
    'Proposal',
    'Laporan Kegiatan',
    'LPJ',
    'Dokumen Organisasi',
    'Dokumen Publik',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Arsip &amp; Administrasi
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Arsip Dokumen Publik
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dokumen bersifat publik yang telah disetujui untuk diunduh. Berkas internal berstatus privat terlindungi dan hanya dapat diakses oleh Admin berwenang.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0F1D36] w-fit">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              cat === c
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {c === 'ALL' ? 'Semua Kategori' : c}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada dokumen publik pada kategori ini.
          </div>
        ) : (
          filtered.map((docItem) => (
            <div
              key={docItem.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {docItem.category} · Diunggah {docItem.uploadedAt} · Publik
                </div>
                <h2 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0" />
                  <span>{docItem.title}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {docItem.description}
                </p>
              </div>
              <a
                href={docItem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-xs font-semibold whitespace-nowrap shrink-0 hover:opacity-90"
              >
                <span>Buka Dokumen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// J. ATTENDANCE INFORMATION PAGE
export const AttendanceInfoPage: React.FC<{
  schedules: DutySchedule[];
  isMemberLoggedIn: boolean;
  onNavigate: (p: PageRoute) => void;
}> = ({ schedules, isMemberLoggedIn, onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Informasi Kedisiplinan Piket
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Sistem Absensi Piket Gerbang PADMAWIJAYA
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
          Halaman ini memuat ketentuan umum pelaksanaan piket penyambutan gerbang pagi OSIS. Seluruh data kehadiran anggota serta swafoto dokumentasi disimpan secara privat dan hanya dapat diakses oleh anggota bersangkutan serta Admin berwenang.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-4">
          <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1D4ED8] dark:text-[#38BDF8]" />
            <span>Jadwal Piket Aktif</span>
          </h2>
          <div className="space-y-3">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#152544] text-sm space-y-1 tabular-nums"
              >
                <div className="font-semibold text-[#0B1F3A] dark:text-white">{sch.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Jam Piket Baku: <strong>{sch.dutyTimeWib} WIB</strong> (Toleransi {sch.graceMinutes} menit)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Jendela Pengisian: {sch.windowOpenWib} – {sch.windowCloseWib} WIB
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-4">
          <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1D4ED8] dark:text-[#38BDF8]" />
            <span>Alur &amp; Ketentuan Privasi</span>
          </h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
            <li>Anggota masuk menggunakan Nomor Anggota &amp; kata sandi pribadi.</li>
            <li>Anggota dapat memilih swafoto dari galeri ponsel (JPG, JPEG, atau PNG).</li>
            <li>Waktu kehadiran dihitung oleh server (WIB), bukan dari jam perangkat atau metadata EXIF foto.</li>
            <li>Swafoto bersifat dokumentasi pendukung dan disimpan privat pada Google Drive organisasi.</li>
          </ul>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate(isMemberLoggedIn ? 'member-dashboard' : 'member-login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-sm font-semibold hover:opacity-90"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isMemberLoggedIn ? 'Buka Halaman Absensi Anggota' : 'Login Anggota untuk Absensi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MUSIC REQUEST PUBLIC PAGE
export const MusicRequestPage: React.FC<{
  musicConfig: MusicOperatingConfig;
  publicRequests: MusicRequest[];
}> = ({ musicConfig, publicRequests }) => {
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [dedication, setDedication] = useState('');
  const [senderName, setSenderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const nowPlaying = publicRequests.filter((r) => r.status === 'NOW_PLAYING');
  const nextUp = publicRequests.filter((r) => r.status === 'QUEUED');
  const recentlyPlayed = publicRequests.filter((r) => r.status === 'COMPLETED');
  const selectedPublic = publicRequests.filter(
    (r) => r.status === 'APPROVED' && r.isPublicDisplay
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!songTitle.trim() || !artist.trim()) {
      setFeedback({ type: 'error', message: 'Judul lagu dan nama artis wajib diisi.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>('/api/music-requests', {
        method: 'POST',
        requireAuth: false,
        body: {
          songTitle: songTitle.trim(),
          artist: artist.trim(),
          dedication: dedication.trim(),
          senderName: senderName.trim(),
        },
      });
      setFeedback({
        type: 'success',
        message:
          res.message ||
          'Request berhasil dikirim dengan status PENDING dan menunggu moderasi Admin.',
      });
      setSongTitle('');
      setArtist('');
      setDedication('');
      setSenderName('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengirim request lagu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleSummary =
    musicConfig.manualOverride === 'FORCE_CLOSED' || !musicConfig.requestsEnabled
      ? 'Status: DITUTUP SEMENTARA oleh Admin'
      : musicConfig.manualOverride === 'FORCE_OPEN'
      ? 'Status: DIBUKA MANUAL oleh Admin'
      : `Jadwal Buka Otomatis: ${musicConfig.openTimeWib}–${musicConfig.closeTimeWib} WIB & ${musicConfig.secondWindowOpenWib}–${musicConfig.secondWindowCloseWib} WIB`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Layanan Hiburan Sekolah · Terkurasi Admin
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          PADMAWIJAYA Music Request
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
          {musicConfig.noticeText}
        </p>
        <div className="text-xs font-medium text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
          {scheduleSummary} · Maks. {musicConfig.maxRequestsPerHourPerClient} request/jam
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-4"
        >
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-[#1D4ED8] dark:text-[#38BDF8]" />
              <span>Kirim Request Lagu</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Terbuka untuk seluruh siswa tanpa login. Permintaan akan ditinjau Admin sebelum masuk antrean putar resmi.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Judul Lagu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Contoh: Sepatu"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Artis / Penyanyi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Contoh: Tulus"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Pesan Dedikasi (Opsional)
            </label>
            <textarea
              rows={3}
              maxLength={280}
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              placeholder="Semangat ujian untuk kelas XII..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Nama Pengirim (Opsional)
            </label>
            <input
              type="text"
              maxLength={80}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nama atau kelas Anda"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-sm"
            />
          </div>

          {feedback && (
            <div
              role="alert"
              className={`p-3.5 rounded-lg text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{submitting ? 'Mengirim Request...' : 'Kirim Music Request'}</span>
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Catatan: Pengiriman judul lagu akan masuk ke antrean moderasi Admin. Pemutaran audio hanya menggunakan berkas audio resmi yang telah disediakan oleh Admin organisasi.
          </p>
        </form>

        {/* Public Music Display */}
        {musicConfig.showPublicDisplay ? (
          <div className="lg:col-span-7 space-y-6">
            {/* NOW PLAYING */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
                Now Playing
              </div>
              {nowPlaying.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum ada lagu berstatus sedang diputar saat ini.
                </p>
              ) : (
                nowPlaying.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
                      {r.songTitle}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {r.artist} {r.senderName ? `· Dari: ${r.senderName}` : ''}
                    </div>
                    {r.dedication && (
                      <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-1">
                        &ldquo;{r.dedication}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* NEXT UP */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-3">
              <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white">
                Next Up (Antrean Putar)
              </h3>
              {nextUp.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Antrean lagu berikutnya masih kosong.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {nextUp.map((r, i) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-[#0B1F3A] dark:text-white">
                          {r.songTitle}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400"> — {r.artist}</span>
                      </div>
                      {r.senderName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {r.senderName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SELECTED REQUESTS & RECENTLY PLAYED */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-3">
                <h3 className="text-sm font-display font-bold text-[#0B1F3A] dark:text-white">
                  Selected Requests
                </h3>
                {selectedPublic.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada request pilihan yang ditampilkan.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedPublic.map((r) => (
                      <div key={r.id} className="text-xs space-y-0.5 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="font-semibold text-[#0B1F3A] dark:text-white">
                          {r.songTitle} — {r.artist}
                        </div>
                        {r.dedication && (
                          <div className="text-slate-600 dark:text-slate-300">&ldquo;{r.dedication}&rdquo;</div>
                        )}
                        {r.senderName && <div className="text-slate-400">Oleh {r.senderName}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-3">
                <h3 className="text-sm font-display font-bold text-[#0B1F3A] dark:text-white">
                  Recently Played
                </h3>
                {recentlyPlayed.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada riwayat lagu selesai diputar.</p>
                ) : (
                  <div className="space-y-2">
                    {recentlyPlayed.slice(0, 6).map((r) => (
                      <div key={r.id} className="text-xs flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {r.songTitle} — {r.artist}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 shrink-0">Selesai</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
            Tampilan publik antrean musik saat ini disembunyikan oleh pengelola.
          </div>
        )}
      </div>
    </div>
  );
};
