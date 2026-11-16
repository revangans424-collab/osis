import React, { useState } from 'react';
import { Menu, X, ChevronDown, ShieldCheck, UserCheck, Sun, Moon } from 'lucide-react';
import { PageRoute, WebsiteSettings } from '../types';

interface NavbarProps {
  settings: WebsiteSettings;
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isMemberLoggedIn: boolean;
  isAdminLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentPage,
  onNavigate,
  theme,
  onToggleTheme,
  isMemberLoggedIn,
  isAdminLoggedIn,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryLinks: Array<{ id: PageRoute; label: string }> = [
    { id: 'home', label: 'Beranda' },
    { id: 'about', label: 'Tentang' },
    { id: 'structure', label: 'Struktur' },
    { id: 'programs', label: 'Program Kerja' },
    { id: 'music-request', label: 'Music Request' },
  ];

  const secondaryLinks: Array<{ id: PageRoute; label: string }> = [
    { id: 'announcements', label: 'Pengumuman' },
    { id: 'gallery', label: 'Galeri' },
    { id: 'journey', label: 'Perjalanan' },
    { id: 'calendar', label: 'Kalender' },
    { id: 'documents', label: 'Arsip Dokumen' },
    { id: 'attendance-info', label: 'Info Absensi' },
  ];

  const go = (page: PageRoute) => {
    setMobileOpen(false);
    setMoreOpen(false);
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSecondaryActive = secondaryLinks.some((l) => l.id === currentPage);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#060D1A]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => go('home')}
          className="text-lg font-display font-bold tracking-tight text-[#0B1F3A] dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded"
        >
          {settings.organizationName} {settings.period}
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Navigasi Utama">
          {primaryLinks.map((link) => {
            const active = currentPage === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => go(link.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                  active
                    ? 'border-[#1D4ED8] dark:border-[#38BDF8] text-[#0B1F3A] dark:text-white'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((p) => !p)}
              className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                isSecondaryActive
                  ? 'border-[#1D4ED8] dark:border-[#38BDF8] text-[#0B1F3A] dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              <span>Arsip &amp; Agenda</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {moreOpen && (
              <div
                onMouseLeave={() => setMoreOpen(false)}
                className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1D36] shadow-lg py-1.5 z-50"
              >
                {secondaryLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentPage === item.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-[#0B1F3A] dark:text-[#38BDF8] font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => go(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
                  <span>{isAdminLoggedIn ? 'Dashboard Admin' : 'Portal Admin'}</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Action CTAs + Mobile Hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              go(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')
            }
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
              currentPage === 'admin-login' || currentPage === 'admin-dashboard'
                ? 'border-[#1D4ED8] bg-sky-50 dark:bg-[#152544] text-[#0B1F3A] dark:text-[#38BDF8]'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
            <span>{isAdminLoggedIn ? 'Dashboard Admin' : 'Login Admin'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              go(isMemberLoggedIn ? 'member-dashboard' : 'member-login')
            }
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isMemberLoggedIn ? 'Dashboard Anggota' : 'Portal Anggota'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Buka Menu Navigasi"
            className="lg:hidden p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] px-4 py-4 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {[...primaryLinks, ...secondaryLinks].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                  currentPage === item.id
                    ? 'bg-[#0B1F3A] text-white dark:bg-[#1D4ED8]'
                    : 'bg-slate-50 dark:bg-[#0F1D36] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => go(isMemberLoggedIn ? 'member-dashboard' : 'member-login')}
              className="w-full py-3 px-4 rounded-lg bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isMemberLoggedIn ? 'Dashboard Anggota' : 'Login Anggota (Absensi)'}</span>
            </button>

            <button
              type="button"
              onClick={() => go(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')}
              className="w-full py-3 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
              <span>{isAdminLoggedIn ? 'Dashboard Admin' : 'Login Pengelola / Admin'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-sky-400" /> : <Moon className="w-4 h-4 text-[#0B1F3A]" />}
              <span>{theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
