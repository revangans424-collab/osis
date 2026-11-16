import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  fetchCurrentAdminProfile,
  onAuthStateChanged,
  subscribePublicPortalData,
} from './lib/firebase';
import {
  AdminUser,
  AnnouncementItem,
  ArchiveDocument,
  CalendarEvent,
  Division,
  DutySchedule,
  GalleryAlbum,
  GalleryItem,
  JourneyItem,
  MemberRecord,
  MusicOperatingConfig,
  MusicRequest,
  MusicTrack,
  PageRoute,
  Position,
  ProgramWork,
  PublicMemberRecord,
  WebsiteSettings,
} from './types';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_DIVISIONS,
  INITIAL_DOCUMENTS,
  INITIAL_DUTY_SCHEDULES,
  INITIAL_GALLERY_ALBUMS,
  INITIAL_GALLERY_ITEMS,
  INITIAL_JOURNEY,
  INITIAL_MUSIC_CONFIG,
  INITIAL_MUSIC_TRACKS,
  INITIAL_POSITIONS,
  INITIAL_PROGRAMS,
  INITIAL_PUBLIC_MEMBERS,
  INITIAL_WEBSITE_SETTINGS,
} from './data/defaultData';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MusicPlayerDock } from './components/MusicPlayerDock';
import {
  AboutPage,
  AnnouncementsPage,
  HomePage,
  ProgramsPage,
  StructurePage,
} from './components/PublicPagesPrimary';
import {
  AttendanceInfoPage,
  CalendarPage,
  DocumentsPage,
  GalleryPage,
  JourneyPage,
  MusicRequestPage,
} from './components/PublicPagesSecondary';
import { MemberDashboardPage, MemberLoginPage } from './components/MemberPortal';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminDashboardPage } from './components/AdminDashboardPage';

const VALID_ROUTES: PageRoute[] = [
  'home',
  'about',
  'structure',
  'announcements',
  'programs',
  'gallery',
  'journey',
  'calendar',
  'documents',
  'attendance-info',
  'music-request',
  'member-login',
  'member-dashboard',
  'admin-login',
  'admin-dashboard',
];

function getInitialRoute(): PageRoute {
  const hash = window.location.hash.replace(/^#/, '') as PageRoute;
  if (VALID_ROUTES.includes(hash)) return hash;
  return 'home';
}

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('padmawijaya-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return 'light';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(getInitialRoute);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  // Public portal data
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(INITIAL_WEBSITE_SETTINGS);
  const [musicConfig, setMusicConfig] = useState<MusicOperatingConfig>(INITIAL_MUSIC_CONFIG);
  const [divisions, setDivisions] = useState<Division[]>(INITIAL_DIVISIONS);
  const [positions, setPositions] = useState<Position[]>(INITIAL_POSITIONS);
  const [publicMembers, setPublicMembers] = useState<PublicMemberRecord[]>(INITIAL_PUBLIC_MEMBERS);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
  const [programs, setPrograms] = useState<ProgramWork[]>(INITIAL_PROGRAMS);
  const [dutySchedules, setDutySchedules] = useState<DutySchedule[]>(INITIAL_DUTY_SCHEDULES);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>(INITIAL_GALLERY_ALBUMS);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(INITIAL_GALLERY_ITEMS);
  const [journey, setJourney] = useState<JourneyItem[]>(INITIAL_JOURNEY);
  const [publicDocuments, setPublicDocuments] = useState<ArchiveDocument[]>(INITIAL_DOCUMENTS);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(INITIAL_MUSIC_TRACKS);
  const [publicMusicRequests, setPublicMusicRequests] = useState<MusicRequest[]>([]);

  // Auth & Role contexts
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberRecord | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Theme application & persistence
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('padmawijaya-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync hash navigation
  const navigateTo = (page: PageRoute) => {
    setCurrentPage(page);
    if (window.location.hash !== `#${page}`) {
      window.location.hash = `#${page}`;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '') as PageRoute;
      if (VALID_ROUTES.includes(hash)) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Public Firestore realtime listeners
  useEffect(() => {
    const unsub = subscribePublicPortalData({
      onSettings: (s) => {
        setWebsiteSettings(s);
        try {
          if (!localStorage.getItem('padmawijaya-theme') && (s.defaultTheme === 'dark' || s.defaultTheme === 'light')) {
            setTheme(s.defaultTheme);
          }
        } catch {
          // ignore
        }
      },
      onMusicConfig: setMusicConfig,
      onDivisions: setDivisions,
      onPositions: setPositions,
      onPublicMembers: setPublicMembers,
      onAnnouncements: setAnnouncements,
      onPrograms: setPrograms,
      onDutySchedules: setDutySchedules,
      onCalendarEvents: setCalendarEvents,
      onGalleryAlbums: setGalleryAlbums,
      onGalleryItems: setGalleryItems,
      onJourney: setJourney,
      onPublicDocuments: setPublicDocuments,
      onMusicTracks: setMusicTracks,
      onPublicMusicRequests: setPublicMusicRequests,
    });
    return () => unsub();
  }, []);

  // Auth listener resolving Admin vs Member automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminUser(null);
        setMemberProfile(null);
        setAuthReady(true);
        return;
      }

      const admin = await fetchCurrentAdminProfile(user);
      if (admin) {
        setAdminUser(admin);
        setMemberProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const snap = await getDocs(
          query(collection(db, 'members'), where('authUid', '==', user.uid))
        );
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data() as Omit<MemberRecord, 'id'>;
          if (data.isActive) {
            setMemberProfile({ id: docSnap.id, ...data });
          } else {
            setMemberProfile(null);
          }
        } else {
          setMemberProfile(null);
        }
      } catch (err) {
        console.warn('Member lookup:', err);
        setMemberProfile(null);
      }

      setAdminUser(null);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  const nowPlayingRequest =
    publicMusicRequests.find((r) => r.status === 'NOW_PLAYING') || null;

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            settings={websiteSettings}
            divisions={divisions}
            members={publicMembers}
            announcements={announcements}
            programs={programs}
            events={calendarEvents}
            galleryItems={galleryItems}
            nowPlayingRequest={nowPlayingRequest}
            onNavigate={navigateTo}
          />
        );
      case 'about':
        return <AboutPage settings={websiteSettings} />;
      case 'structure':
        return <StructurePage divisions={divisions} members={publicMembers} />;
      case 'announcements':
        return <AnnouncementsPage announcements={announcements} />;
      case 'programs':
        return <ProgramsPage programs={programs} divisions={divisions} />;
      case 'gallery':
        return <GalleryPage albums={galleryAlbums} items={galleryItems} />;
      case 'journey':
        return <JourneyPage journey={journey} />;
      case 'calendar':
        return <CalendarPage events={calendarEvents} />;
      case 'documents':
        return <DocumentsPage documents={publicDocuments} />;
      case 'attendance-info':
        return (
          <AttendanceInfoPage
            schedules={dutySchedules}
            isMemberLoggedIn={Boolean(memberProfile)}
            onNavigate={navigateTo}
          />
        );
      case 'music-request':
        return (
          <MusicRequestPage
            musicConfig={musicConfig}
            publicRequests={publicMusicRequests}
          />
        );
      case 'member-login':
        if (memberProfile) {
          return (
            <MemberDashboardPage
              member={memberProfile}
              dutySchedules={dutySchedules}
              announcements={announcements}
              onLoggedOut={() => {
                setMemberProfile(null);
                navigateTo('member-login');
              }}
            />
          );
        }
        return (
          <MemberLoginPage
            onSuccess={() => navigateTo('member-dashboard')}
            onNavigate={navigateTo}
          />
        );
      case 'member-dashboard':
        if (!authReady) {
          return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
              Memeriksa sesi anggota...
            </div>
          );
        }
        if (!memberProfile) {
          return (
            <MemberLoginPage
              onSuccess={() => navigateTo('member-dashboard')}
              onNavigate={navigateTo}
            />
          );
        }
        return (
          <MemberDashboardPage
            member={memberProfile}
            dutySchedules={dutySchedules}
            announcements={announcements}
            onLoggedOut={() => {
              setMemberProfile(null);
              navigateTo('member-login');
            }}
          />
        );
      case 'admin-login':
        if (adminUser) {
          return (
            <AdminDashboardPage
              admin={adminUser}
              websiteSettings={websiteSettings}
              musicConfig={musicConfig}
              divisions={divisions}
              positions={positions}
              programs={programs}
              dutySchedules={dutySchedules}
              journey={journey}
              musicTracks={musicTracks}
              onLoggedOut={() => {
                setAdminUser(null);
                navigateTo('admin-login');
              }}
            />
          );
        }
        return (
          <AdminLoginPage
            onAdminAuthenticated={(adm) => {
              setAdminUser(adm);
              navigateTo('admin-dashboard');
            }}
            onNavigate={navigateTo}
          />
        );
      case 'admin-dashboard':
        if (!authReady) {
          return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
              Memeriksa otorisasi admin...
            </div>
          );
        }
        if (!adminUser) {
          return (
            <AdminLoginPage
              onAdminAuthenticated={(adm) => {
                setAdminUser(adm);
                navigateTo('admin-dashboard');
              }}
              onNavigate={navigateTo}
            />
          );
        }
        return (
          <AdminDashboardPage
            admin={adminUser}
            websiteSettings={websiteSettings}
            musicConfig={musicConfig}
            divisions={divisions}
            positions={positions}
            programs={programs}
            dutySchedules={dutySchedules}
            journey={journey}
            musicTracks={musicTracks}
            onLoggedOut={() => {
              setAdminUser(null);
              navigateTo('admin-login');
            }}
          />
        );
      default:
        return (
          <HomePage
            settings={websiteSettings}
            divisions={divisions}
            members={publicMembers}
            announcements={announcements}
            programs={programs}
            events={calendarEvents}
            galleryItems={galleryItems}
            nowPlayingRequest={nowPlayingRequest}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060D1A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        settings={websiteSettings}
        currentPage={currentPage}
        onNavigate={navigateTo}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMemberLoggedIn={Boolean(memberProfile)}
        isAdminLoggedIn={Boolean(adminUser)}
      />

      <main className="flex-1">{renderPage()}</main>

      <Footer
        settings={websiteSettings}
        onNavigate={navigateTo}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMemberLoggedIn={Boolean(memberProfile)}
        isAdminLoggedIn={Boolean(adminUser)}
      />

      <MusicPlayerDock
        musicEnabled={websiteSettings.musicEnabled}
        tracks={musicTracks}
        nowPlayingRequest={nowPlayingRequest}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
