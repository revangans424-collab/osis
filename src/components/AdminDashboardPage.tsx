import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Network,
  Megaphone,
  ClipboardList,
  UserCheck,
  Image as ImageIcon,
  Milestone,
  Calendar,
  FileText,
  Music,
  Settings,
  Shield,
  Plug,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { auth, signOut, subscribeAdminWorkspaceData } from '../lib/firebase';
import {
  AdminUser,
  AnnouncementItem,
  ArchiveDocument,
  AttendanceRecord,
  AuditLog,
  CalendarEvent,
  Division,
  DutySchedule,
  GalleryAlbum,
  GalleryItem,
  IntegrationJob,
  IntegrationSettings,
  JourneyItem,
  MemberRecord,
  MusicOperatingConfig,
  MusicRequest,
  MusicTrack,
  Position,
  ProgramWork,
  WebsiteSettings,
} from '../types';
import { INITIAL_INTEGRATION_SETTINGS } from '../data/defaultData';
import {
  AnnouncementsTab,
  MembersTab,
  OverviewTab,
  ProgramsTab,
  StructureTab,
} from './AdminDashboardTabsA';
import {
  AttendanceTab,
  CalendarTab,
  DocumentsTab,
  GalleryTab,
  JourneyTab,
} from './AdminDashboardTabsB';
import {
  AdminAccountsTab,
  IntegrationsTab,
  MusicTab,
  WebsiteSettingsTab,
} from './AdminDashboardTabsC';

type AdminTabId =
  | 'overview'
  | 'members'
  | 'structure'
  | 'announcements'
  | 'programs'
  | 'attendance'
  | 'gallery'
  | 'journey'
  | 'calendar'
  | 'documents'
  | 'music'
  | 'settings'
  | 'admins'
  | 'integrations';

export const AdminDashboardPage: React.FC<{
  admin: AdminUser;
  websiteSettings: WebsiteSettings;
  musicConfig: MusicOperatingConfig;
  divisions: Division[];
  positions: Position[];
  programs: ProgramWork[];
  dutySchedules: DutySchedule[];
  journey: JourneyItem[];
  musicTracks: MusicTrack[];
  onLoggedOut: () => void;
}> = ({
  admin,
  websiteSettings,
  musicConfig,
  divisions,
  positions,
  programs,
  dutySchedules,
  journey,
  musicTracks,
  onLoggedOut,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>(
    admin.role === 'DIVISION_ADMIN' ? 'programs' : 'overview'
  );
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<AnnouncementItem[]>([]);
  const [allAlbums, setAllAlbums] = useState<GalleryAlbum[]>([]);
  const [allGalleryItems, setAllGalleryItems] = useState<GalleryItem[]>([]);
  const [allDocuments, setAllDocuments] = useState<ArchiveDocument[]>([]);
  const [allCalendar, setAllCalendar] = useState<CalendarEvent[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allMusicRequests, setAllMusicRequests] = useState<MusicRequest[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>(
    INITIAL_INTEGRATION_SETTINGS
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [integrationJobs, setIntegrationJobs] = useState<IntegrationJob[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5500);
  };

  useEffect(() => {
    const unsub = subscribeAdminWorkspaceData(admin, {
      onMembers: setMembers,
      onAllAnnouncements: setAllAnnouncements,
      onAllAlbums: setAllAlbums,
      onAllGalleryItems: setAllGalleryItems,
      onAllDocuments: setAllDocuments,
      onAllCalendar: setAllCalendar,
      onAllAttendance: setAllAttendance,
      onAllMusicRequests: setAllMusicRequests,
      onAdmins: setAdmins,
      onIntegrationSettings: setIntegrationSettings,
      onAuditLogs: setAuditLogs,
      onIntegrationJobs: setIntegrationJobs,
    });
    return () => unsub();
  }, [admin]);

  const can = (perm: string) => {
    if (admin.role === 'SUPER_ADMIN') return true;
    if (admin.role === 'DIVISION_ADMIN') {
      return ['programs', 'gallery', 'calendar'].includes(perm);
    }
    return admin.permissions.includes(perm as AdminUser['permissions'][number]);
  };

  const navItems: Array<{ id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }>; allowed: boolean }> = [
    { id: 'overview', label: '1. Dashboard Overview', icon: LayoutDashboard, allowed: admin.role !== 'DIVISION_ADMIN' },
    { id: 'members', label: '2. Member Management', icon: Users, allowed: admin.role === 'SUPER_ADMIN' || can('manageMembers') },
    { id: 'structure', label: '3. Organizational Structure', icon: Network, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' },
    { id: 'announcements', label: '4. Announcements', icon: Megaphone, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || can('manageAnnouncements') },
    { id: 'programs', label: '5. Program Work', icon: ClipboardList, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || admin.role === 'DIVISION_ADMIN' || can('managePrograms') },
    { id: 'attendance', label: '6. Attendance Management', icon: UserCheck, allowed: admin.role === 'SUPER_ADMIN' || can('manageAttendance') },
    { id: 'gallery', label: '7. Gallery Management', icon: ImageIcon, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || admin.role === 'DIVISION_ADMIN' || can('manageGallery') },
    { id: 'journey', label: '8. Our Journey', icon: Milestone, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || can('manageContent') },
    { id: 'calendar', label: '9. Calendar', icon: Calendar, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || admin.role === 'DIVISION_ADMIN' || can('manageContent') },
    { id: 'documents', label: '10. Document Archive', icon: FileText, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || can('manageDocuments') },
    { id: 'music', label: '11. Music & Requests', icon: Music, allowed: admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN' || can('manageMusic') },
    { id: 'settings', label: '12. Website Settings', icon: Settings, allowed: admin.role === 'SUPER_ADMIN' || can('manageContent') },
    { id: 'admins', label: '13. Admin Accounts', icon: Shield, allowed: admin.role === 'SUPER_ADMIN' },
    { id: 'integrations', label: '14. Integration Settings', icon: Plug, allowed: admin.role === 'SUPER_ADMIN' },
  ];

  const allowedNav = navItems.filter((n) => n.allowed);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36] p-4 space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] dark:text-[#38BDF8] font-semibold">
              {admin.role}
            </div>
            <div className="font-display font-bold text-base text-[#0B1F3A] dark:text-white truncate">
              {admin.displayName}
            </div>
            <div className="text-xs text-slate-500 truncate">{admin.email}</div>
          </div>

          <nav className="space-y-1 max-h-[62vh] overflow-y-auto pr-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    active
                      ? 'bg-[#0B1F3A] dark:bg-[#1D4ED8] text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={async () => {
                await signOut(auth);
                onLoggedOut();
              }}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Admin</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="lg:col-span-9 space-y-6">
          {toast && (
            <div
              role="status"
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toast.msg}</span>
            </div>
          )}

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1D36]">
            {activeTab === 'overview' && (
              <OverviewTab
                members={members}
                divisions={divisions}
                attendance={allAttendance}
                programs={programs}
                events={allCalendar}
                auditLogs={auditLogs}
                onNotify={notify}
              />
            )}
            {activeTab === 'members' && (
              <MembersTab
                members={members}
                divisions={divisions}
                positions={positions}
                dutySchedules={dutySchedules}
                onNotify={notify}
              />
            )}
            {activeTab === 'structure' && (
              <StructureTab divisions={divisions} positions={positions} onNotify={notify} />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsTab
                announcements={allAnnouncements}
                adminEmail={admin.email}
                onNotify={notify}
              />
            )}
            {activeTab === 'programs' && (
              <ProgramsTab
                programs={programs}
                divisions={divisions}
                admin={admin}
                onNotify={notify}
              />
            )}
            {activeTab === 'attendance' && (
              <AttendanceTab
                attendance={allAttendance}
                members={members}
                divisions={divisions}
                dutySchedules={dutySchedules}
                onNotify={notify}
              />
            )}
            {activeTab === 'gallery' && (
              <GalleryTab albums={allAlbums} items={allGalleryItems} onNotify={notify} />
            )}
            {activeTab === 'journey' && <JourneyTab journey={journey} onNotify={notify} />}
            {activeTab === 'calendar' && <CalendarTab events={allCalendar} onNotify={notify} />}
            {activeTab === 'documents' && (
              <DocumentsTab documents={allDocuments} onNotify={notify} />
            )}
            {activeTab === 'music' && (
              <MusicTab
                tracks={musicTracks}
                requests={allMusicRequests}
                musicConfig={musicConfig}
                settings={websiteSettings}
                onNotify={notify}
              />
            )}
            {activeTab === 'settings' && (
              <WebsiteSettingsTab settings={websiteSettings} onNotify={notify} />
            )}
            {activeTab === 'admins' && admin.role === 'SUPER_ADMIN' && (
              <AdminAccountsTab admins={admins} divisions={divisions} onNotify={notify} />
            )}
            {activeTab === 'integrations' && admin.role === 'SUPER_ADMIN' && (
              <IntegrationsTab
                integrationSettings={integrationSettings}
                integrationJobs={integrationJobs}
                onNotify={notify}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
