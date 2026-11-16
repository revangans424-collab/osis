import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  CircleDot,
  Pin,
  X,
  ExternalLink,
  Music,
  Shield,
  Users,
} from 'lucide-react';
import {
  WebsiteSettings,
  Division,
  PublicMemberRecord,
  AnnouncementItem,
  ProgramWork,
  CalendarEvent,
  GalleryItem,
  MusicRequest,
  PageRoute,
  AnnouncementCategory,
  ProgramStatus,
} from '../types';

interface SafeImgProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImgProps> = ({ src, alt, className = '', fallbackLabel }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-[#152544] text-slate-400 dark:text-slate-500 p-4 text-center ${className}`}
      >
        <Shield className="w-7 h-7 mb-1.5 opacity-60" />
        {fallbackLabel && <span className="text-xs font-medium">{fallbackLabel}</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

// A. HOME PAGE
export const HomePage: React.FC<{
  settings: WebsiteSettings;
  divisions: Division[];
  members: PublicMemberRecord[];
  announcements: AnnouncementItem[];
  programs: ProgramWork[];
  events: CalendarEvent[];
  galleryItems: GalleryItem[];
  nowPlayingRequest?: MusicRequest | null;
  onNavigate: (page: PageRoute) => void;
}> = ({
  settings,
  divisions,
  members,
  announcements,
  programs,
  events,
  galleryItems,
  nowPlayingRequest,
  onNavigate,
}) => {
  const completedCount = programs.filter((p) => p.status === 'SELESAI').length;
  const ongoingCount = programs.filter((p) => p.status === 'SEDANG BERJALAN').length;
  const latestAnnouncements = announcements.slice(0, 3);
  const upcomingEvents = events.slice(0, 3);
  const recentGallery = galleryItems.filter((g) => g.mediaType === 'photo').slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0B1528]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shrink-0">
                  <SafeImage
                    src={settings.logoUrl}
                    alt={`Logo ${settings.organizationName}`}
                    className="w-full h-full object-contain p-1"
                    fallbackLabel="OSIS"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-[#1D4ED8] dark:text-[#38BDF8]">
                    {settings.organizationType} · Periode {settings.period}
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#0B1F3A] dark:text-white text-balance">
                    {settings.organizationName} {settings.period}
                  </h1>
                </div>
              </div>

              <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed max-w-xl">
                {settings.tagline}
              </p>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {settings.introduction}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('programs')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-sm font-semibold transition-colors"
                >
                  <span>Jelajahi Program Kerja</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('music-request')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-[#0B1F3A] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  <Music className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
                  <span>Music Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance-info')}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
                >
                  <span>Info Absensi Piket</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] h-72 sm:h-96 lg:h-full min-h-[320px] relative">
                <SafeImage
                  src={settings.heroImageUrl}
                  alt={`Foto Pengurus ${settings.organizationName} ${settings.period}`}
                  className="w-full h-full object-cover"
                  fallbackLabel="Foto Organisasi PADMAWIJAYA"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5">
                  <p className="text-xs font-medium text-sky-300">
                    Kepengurusan Aktif {settings.period}
                  </p>
                  <p className="text-sm font-medium text-white">
                    Portal Resmi Informasi &amp; Manajemen Organisasi Siswa
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Organization Statistics Strip */}
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                {divisions.length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Divisi &amp; Seksi Bidang
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                {members.length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Pengurus Terpublikasi
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#1D4ED8] dark:text-[#38BDF8] tabular-nums">
                {ongoingCount} / {programs.length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Program Berjalan ({completedCount} Selesai)
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                {events.length}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Agenda Kegiatan Terjadwal
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Now Playing Public Music Banner (if active) */}
      {nowPlayingRequest && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1D36] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0" />
              <div>
                <div className="text-xs font-medium text-[#1D4ED8] dark:text-[#38BDF8]">
                  Sedang Diputar di Music Request Sekolah
                </div>
                <div className="text-sm sm:text-base font-semibold text-[#0B1F3A] dark:text-white">
                  {nowPlayingRequest.songTitle} — {nowPlayingRequest.artist}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('music-request')}
              className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
            >
              Lihat Antrean &amp; Request Lagu →
            </button>
          </div>
        </section>
      )}

      {/* Latest Announcements + Featured Upcoming Activities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Latest Announcements */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
                  Pengumuman Terbaru
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Informasi resmi dan edaran kegiatan organisasi
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
              >
                Semua Pengumuman
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {latestAnnouncements.map((item) => (
                <article key={item.id} className="py-5 first:pt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
                        <Pin className="w-3.5 h-3.5" />
                        Disematkan
                      </span>
                    )}
                    {item.isPinned && <span aria-hidden="true">·</span>}
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.publishedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.author}</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#0B1F3A] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Upcoming Activities */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
                  Agenda Mendatang
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Jadwal rapat &amp; pelaksanaan program
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
              >
                Buka Kalender
              </button>
            </div>

            <div className="space-y-4">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] space-y-1.5"
                >
                  <div className="text-xs text-[#1D4ED8] dark:text-[#38BDF8] font-medium tabular-nums">
                    {evt.date} · {evt.time} · {evt.category}
                  </div>
                  <h3 className="text-base font-display font-semibold text-[#0B1F3A] dark:text-white">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {evt.location} — Penyelenggara: {evt.organizer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Program Kerja Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
              Ikhtisar Program Kerja
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Transparansi pelaksanaan rencana kerja OSIS periode {settings.period}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('programs')}
            className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
          >
            Lihat Semua Proker
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {programs.slice(0, 4).map((prog) => (
            <div
              key={prog.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">{prog.divisionName}</span>
                  <ProgramStatusLabel status={prog.status} />
                </div>
                <h3 className="text-lg font-display font-semibold text-[#0B1F3A] dark:text-white">
                  {prog.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {prog.description}
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between tabular-nums">
                <span>PJ: {prog.personInCharge}</span>
                <span>Target: {prog.targetDate}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
              Galeri Dokumentasi Terbaru
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Rekam jejak visual kegiatan siswa dan kepengurusan
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('gallery')}
            className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
          >
            Buka Galeri Lengkap
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentGallery.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate('gallery')}
              className="group text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <SafeImage
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  fallbackLabel="Dokumentasi"
                />
              </div>
              <p className="p-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                {item.caption}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const ProgramStatusLabel: React.FC<{ status: ProgramStatus }> = ({ status }) => {
  if (status === 'SELESAI') {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>SELESAI</span>
      </span>
    );
  }
  if (status === 'SEDANG BERJALAN') {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] dark:text-[#38BDF8] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5" />
        <span>SEDANG BERJALAN</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
      <CircleDot className="w-3.5 h-3.5" />
      <span>BELUM DIMULAI</span>
    </span>
  );
};

// B. ABOUT US PAGE
export const AboutPage: React.FC<{ settings: WebsiteSettings }> = ({ settings }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <header className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Profil Organisasi · Periode {settings.period}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white text-balance">
          Tentang {settings.organizationName} {settings.period}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          {settings.introduction}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0F1D36] space-y-3">
          <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">Visi Organisasi</h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {settings.vision}
          </p>
        </section>

        <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0F1D36] space-y-3">
          <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">Misi Organisasi</h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {settings.mission}
          </p>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Sejarah &amp; Filosofi Kepengurusan
        </h2>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl whitespace-pre-line">
          {settings.history}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Tujuan &amp; Sasaran Periode {settings.period}
        </h2>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl whitespace-pre-line">
          {settings.goals}
        </p>
      </section>

      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white mb-2">
            Informasi Sekretariat
          </h3>
          <dl className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <div>Alamat: {settings.address}</div>
            <div>Email Resmi: {settings.email}</div>
            <div>Kontak: {settings.phone}</div>
          </dl>
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white mb-2">
            Kanal Resmi Media Sosial
          </h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
              >
                <span>Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {settings.tiktokUrl && (
              <a
                href={settings.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
              >
                <span>TikTok</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {settings.youtubeUrl && (
              <a
                href={settings.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

// C. ORGANIZATIONAL STRUCTURE PAGE
export const StructurePage: React.FC<{
  divisions: Division[];
  members: PublicMemberRecord[];
}> = ({ divisions, members }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchDiv = selectedDivision === 'ALL' || m.divisionId === selectedDivision;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.positionTitle.toLowerCase().includes(q) ||
        m.divisionName.toLowerCase().includes(q);
      return matchDiv && matchSearch;
    });
  }, [members, selectedDivision, searchTerm]);

  const bphMembers = filtered.filter((m) => m.divisionId === 'bph');
  const otherDivisions = divisions.filter((d) => d.id !== 'bph');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Struktur Organisasi
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Susunan Pengurus PADMAWIJAYA 2026/2027
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Daftar Badan Pengurus Harian (Ketua, Wakil Ketua, Sekretaris, Bendahara) serta seluruh Seksi Bidang. Data pengurus diperbarui secara dinamis oleh Admin terotorisasi.
        </p>
      </header>

      {/* Search & Division Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama pengurus atau jabatan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
          />
        </div>

        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
          aria-label="Filter Divisi"
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
        >
          <option value="ALL">Semua Divisi &amp; BPH</option>
          {divisions.map((div) => (
            <option key={div.id} value={div.id}>
              {div.name}
            </option>
          ))}
        </select>
      </div>

      {/* BPH Section */}
      {bphMembers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
            Badan Pengurus Harian (BPH)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bphMembers.map((m) => (
              <MemberStructureCard key={m.id} member={m} />
            ))}
          </div>
        </section>
      )}

      {/* Other Divisions */}
      <div className="space-y-10">
        {otherDivisions
          .filter((d) => selectedDivision === 'ALL' || selectedDivision === d.id)
          .map((div) => {
            const divMembers = filtered.filter((m) => m.divisionId === div.id);
            return (
              <section key={div.id} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
                    {div.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{div.description}</p>
                </div>

                {divMembers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {divMembers.map((m) => (
                      <MemberStructureCard key={m.id} member={m} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-3">
                    Belum ada data pengurus yang dipublikasikan pada divisi ini.
                  </p>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};

const MemberStructureCard: React.FC<{ member: PublicMemberRecord }> = ({ member }) => {
  const initials = member.fullName
    .replace(/[\[\]]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-[#152544] relative overflow-hidden">
        {member.photoUrl ? (
          <SafeImage
            src={member.photoUrl}
            alt={member.fullName}
            className="w-full h-full object-cover"
            fallbackLabel={initials || 'OSIS'}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#0B1F3A] dark:text-[#38BDF8]">
            <Users className="w-8 h-8 mb-1 opacity-50" />
            <span className="text-lg font-display font-bold tracking-wider">{initials || 'PW'}</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5 flex-1">
        <div className="text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
          {member.positionTitle}
        </div>
        <h3 className="text-base font-display font-bold text-[#0B1F3A] dark:text-white leading-snug">
          {member.fullName}
        </h3>
        <div className="text-xs text-slate-500 dark:text-slate-400">{member.divisionName}</div>
        {member.bio && (
          <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
            {member.bio}
          </p>
        )}
      </div>
    </div>
  );
};

// D. ANNOUNCEMENTS PAGE
export const AnnouncementsPage: React.FC<{ announcements: AnnouncementItem[] }> = ({
  announcements,
}) => {
  const [category, setCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDetail, setActiveDetail] = useState<AnnouncementItem | null>(null);

  const categories: Array<'ALL' | AnnouncementCategory> = [
    'ALL',
    'General',
    'Important',
    'Meeting',
    'Activities',
    'Division Information',
  ];

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const catOk = category === 'ALL' || a.category === category;
      const q = searchTerm.trim().toLowerCase();
      const qOk =
        !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [announcements, category, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Pusat Informasi
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Pengumuman Resmi PADMAWIJAYA
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0F1D36]">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pengumuman..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
          Tidak ada pengumuman yang sesuai dengan filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] overflow-hidden flex flex-col"
            >
              {item.imageUrl && (
                <div className="aspect-[16/9] overflow-hidden">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    fallbackLabel="Pengumuman"
                  />
                </div>
              )}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
                        <Pin className="w-3.5 h-3.5" />
                        Penting
                      </span>
                    )}
                    {item.isPinned && <span aria-hidden="true">·</span>}
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.publishedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.author}</span>
                  </div>
                  <h2 className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
                    {item.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDetail(item)}
                  className="text-sm font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline self-start pt-2"
                >
                  Baca Selengkapnya →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1D36] border border-slate-200 dark:border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[#1D4ED8] dark:text-[#38BDF8] font-medium tabular-nums">
                  {activeDetail.category} · {activeDetail.publishedAt} · {activeDetail.author}
                </div>
                <h2 className="text-2xl font-display font-bold text-[#0B1F3A] dark:text-white">
                  {activeDetail.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                aria-label="Tutup Detail"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {activeDetail.imageUrl && (
              <div className="rounded-lg overflow-hidden aspect-[16/9]">
                <SafeImage
                  src={activeDetail.imageUrl}
                  alt={activeDetail.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {activeDetail.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// E. PROGRAM KERJA PAGE
export const ProgramsPage: React.FC<{
  programs: ProgramWork[];
  divisions: Division[];
}> = ({ programs, divisions }) => {
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProgramStatus>('ALL');

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const dOk = divisionFilter === 'ALL' || p.divisionId === divisionFilter;
      const sOk = statusFilter === 'ALL' || p.status === statusFilter;
      return dOk && sOk;
    });
  }, [programs, divisionFilter, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8]">
          Transparansi Kinerja Organisasi
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#0B1F3A] dark:text-white">
          Program Kerja PADMAWIJAYA 2026/2027
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Seluruh program kerja yang direncanakan, sedang berjalan, maupun yang telah selesai terlaksana tercatat secara terbuka sebagai rekam jejak publik organisasi.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0F1D36]">
          {(['ALL', 'BELUM DIMULAI', 'SEDANG BERJALAN', 'SELESAI'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B1F3A] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>

        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          aria-label="Filter Divisi Program Kerja"
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] text-sm"
        >
          <option value="ALL">Semua Seksi Bidang</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((prog) => (
          <div
            key={prog.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400 truncate">
                  {prog.divisionName}
                </span>
                <ProgramStatusLabel status={prog.status} />
              </div>

              <h2 className="text-xl font-display font-bold text-[#0B1F3A] dark:text-white">
                {prog.name}
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {prog.description}
              </p>

              {prog.progressNotes && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#152544] text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Catatan Progres: </span>
                  {prog.progressNotes}
                </div>
              )}

              {prog.documentationUrl && (
                <div className="rounded-lg overflow-hidden aspect-[16/9] border border-slate-200 dark:border-slate-800">
                  <SafeImage
                    src={prog.documentationUrl}
                    alt={`Dokumentasi ${prog.name}`}
                    className="w-full h-full object-cover"
                    fallbackLabel="Dokumentasi Proker"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Penanggung Jawab: {prog.personInCharge}</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Target: {prog.targetDate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
