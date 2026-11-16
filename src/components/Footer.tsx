import React from 'react';
import { Sun, Moon, ShieldCheck, UserCheck, Mail, MapPin, Phone } from 'lucide-react';
import { PageRoute, WebsiteSettings } from '../types';

interface FooterProps {
  settings: WebsiteSettings;
  onNavigate: (page: PageRoute) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isMemberLoggedIn: boolean;
  isAdminLoggedIn: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigate,
  theme,
  onToggleTheme,
  isMemberLoggedIn,
  isAdminLoggedIn,
}) => {
  const go = (page: PageRoute) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050B16] text-slate-700 dark:text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Identity */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt={`Logo ${settings.organizationName}`}
                className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              />
            )}
            <div>
              <div className="text-lg font-display font-bold text-[#0B1F3A] dark:text-white">
                {settings.organizationName} {settings.period}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Organisasi Siswa Intra Sekolah · Portal Resmi &amp; Manajemen
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            {settings.tagline}
          </p>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {settings.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8] mt-0.5 shrink-0" />
                <span>{settings.address}</span>
              </div>
            )}
            {settings.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0" />
                <span>{settings.email}</span>
              </div>
            )}
            {settings.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0" />
                <span>{settings.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links 1 */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
            Profil &amp; Program
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { id: 'home' as PageRoute, label: 'Beranda' },
              { id: 'about' as PageRoute, label: 'Tentang Kami' },
              { id: 'structure' as PageRoute, label: 'Struktur Organisasi' },
              { id: 'programs' as PageRoute, label: 'Program Kerja' },
              { id: 'journey' as PageRoute, label: 'Perjalanan' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  className="hover:text-[#1D4ED8] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation Links 2 */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
            Informasi &amp; Arsip
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { id: 'announcements' as PageRoute, label: 'Pengumuman' },
              { id: 'calendar' as PageRoute, label: 'Kalender' },
              { id: 'gallery' as PageRoute, label: 'Galeri' },
              { id: 'documents' as PageRoute, label: 'Arsip Dokumen' },
              { id: 'music-request' as PageRoute, label: 'Music Request' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  className="hover:text-[#1D4ED8] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Portals & Theme */}
        <div className="md:col-span-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
            Portal &amp; Tampilan
          </h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => go(isMemberLoggedIn ? 'member-dashboard' : 'member-login')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] text-xs font-semibold flex items-center gap-2 hover:border-[#1D4ED8] transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
              <span>{isMemberLoggedIn ? 'Dashboard Anggota OSIS' : 'Login Anggota (Absensi)'}</span>
            </button>

            <button
              type="button"
              onClick={() => go('attendance-info')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] text-xs font-medium text-left hover:border-[#1D4ED8] transition-colors"
            >
              Informasi Sistem Absensi Piket
            </button>

            <button
              type="button"
              onClick={() => go(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] text-xs font-semibold flex items-center gap-2 hover:border-[#1D4ED8] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
              <span>{isAdminLoggedIn ? 'Dashboard Admin' : 'Portal Admin'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] text-xs font-medium flex items-center justify-between hover:border-[#1D4ED8] transition-colors"
            >
              <span>Tema Tampilan</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            &copy; {new Date().getFullYear()} {settings.organizationName} {settings.period} · {settings.organizationType}
          </span>
          <div className="flex items-center gap-4">
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1D4ED8] dark:hover:text-[#38BDF8]"
              >
                Instagram
              </a>
            )}
            {settings.tiktokUrl && (
              <a
                href={settings.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1D4ED8] dark:hover:text-[#38BDF8]"
              >
                TikTok
              </a>
            )}
            {settings.youtubeUrl && (
              <a
                href={settings.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1D4ED8] dark:hover:text-[#38BDF8]"
              >
                YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
