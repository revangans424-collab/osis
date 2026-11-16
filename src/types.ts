export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DIVISION_ADMIN';

export type AdminPermission =
  | 'manageMembers'
  | 'manageContent'
  | 'manageAnnouncements'
  | 'managePrograms'
  | 'manageAttendance'
  | 'manageGallery'
  | 'manageMusic'
  | 'manageDocuments';

export type ProgramStatus = 'BELUM DIMULAI' | 'SEDANG BERJALAN' | 'SELESAI';

export type AnnouncementCategory =
  | 'General'
  | 'Important'
  | 'Meeting'
  | 'Activities'
  | 'Division Information';

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'ALPHA';

export type DutyDay = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export const DUTY_DAY_OPTIONS: DutyDay[] = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export type DocumentCategory =
  | 'Proposal'
  | 'Laporan Kegiatan'
  | 'LPJ'
  | 'Dokumen Organisasi'
  | 'Dokumen Publik';

export type DocumentVisibility = 'public' | 'private';

export type MusicRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUEUED'
  | 'NOW_PLAYING'
  | 'COMPLETED';

export type PageRoute =
  | 'home'
  | 'about'
  | 'structure'
  | 'announcements'
  | 'programs'
  | 'gallery'
  | 'journey'
  | 'calendar'
  | 'documents'
  | 'attendance-info'
  | 'music-request'
  | 'member-login'
  | 'member-dashboard'
  | 'admin-login'
  | 'admin-dashboard';

export interface WebsiteSettings {
  organizationName: string;
  organizationType: string;
  period: string;
  tagline: string;
  introduction: string;
  vision: string;
  mission: string;
  history: string;
  goals: string;
  logoUrl: string;
  heroImageUrl: string;
  email: string;
  phone: string;
  address: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  defaultTheme: 'light' | 'dark';
  musicEnabled: boolean;
}

export interface MusicOperatingConfig {
  requestsEnabled: boolean;
  manualOverride: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED';
  openTimeWib: string;
  closeTimeWib: string;
  secondWindowOpenWib: string;
  secondWindowCloseWib: string;
  maxRequestsPerHourPerClient: number;
  showPublicDisplay: boolean;
  noticeText: string;
}

export interface IntegrationSettings {
  googleDriveFolderId: string;
  googleDriveFolderUrl: string;
  googleSheetsSpreadsheetId: string;
  googleSheetsRange: string;
  autoSyncAttendanceToSheets: boolean;
}

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: AdminPermission[];
  assignedDivisionId?: string;
  inviteId?: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminInvite {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: AdminPermission[];
  assignedDivisionId?: string;
  isActive: boolean;
  createdAt?: unknown;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  description: string;
  order: number;
}

export interface Position {
  id: string;
  title: string;
  order: number;
}

export interface MemberRecord {
  id: string;
  memberNumber: string;
  fullName: string;
  divisionId: string;
  divisionName?: string;
  positionId: string;
  positionTitle: string;
  hierarchyRank?: number;
  classGrade: string;
  bio: string;
  photoUrl: string;
  dutyScheduleId: string;
  dutyDays?: DutyDay[];
  authUid?: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicMemberRecord {
  id: string;
  fullName: string;
  divisionId: string;
  divisionName: string;
  positionTitle: string;
  hierarchyRank: number;
  bio: string;
  photoUrl: string;
  isPublished: boolean;
  updatedAt?: unknown;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  category: AnnouncementCategory;
  author: string;
  publishedAt: string;
  imageUrl?: string;
  isPinned: boolean;
  published: boolean;
  createdAt?: unknown;
}

export interface ProgramWork {
  id: string;
  name: string;
  description: string;
  divisionId: string;
  divisionName: string;
  personInCharge: string;
  targetDate: string;
  status: ProgramStatus;
  progressNotes: string;
  documentationUrl?: string;
  updatedAt?: unknown;
}

export interface DutySchedule {
  id: string;
  name: string;
  dutyTimeWib: string;
  windowOpenWib: string;
  windowCloseWib: string;
  graceMinutes: number;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberAuthUid: string;
  memberNumber: string;
  memberName: string;
  divisionId: string;
  divisionName: string;
  dutyDate: string;
  dutySchedule: string;
  status: AttendanceStatus;
  drivePhotoFileId?: string;
  driveFileName?: string;
  driveUploadStatus?: 'UPLOADED' | 'NOT_APPLICABLE' | 'FAILED';
  sheetsSyncStatus?: 'SYNCED' | 'PENDING' | 'SETUP_REQUIRED' | 'FAILED';
  notes?: string;
  serverTimestamp?: string;
  createdAt?: unknown;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  divisionId?: string;
  category: 'Rapat' | 'Kegiatan' | 'Event Besar' | 'Deadline Proker';
  description: string;
  published: boolean;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  coverUrl: string;
  isPublished: boolean;
}

export interface GalleryItem {
  id: string;
  albumId: string;
  mediaType: 'photo' | 'video';
  url: string;
  driveFileId?: string;
  caption: string;
  isPublished: boolean;
}

export interface JourneyItem {
  id: string;
  title: string;
  phase: string;
  date: string;
  description: string;
  imageUrl?: string;
  order: number;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string;
  visibility: DocumentVisibility;
  fileUrl: string;
  driveFileId?: string;
  uploadedAt: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  isActive: boolean;
}

export interface MusicRequest {
  id: string;
  songTitle: string;
  artist: string;
  dedication?: string;
  senderName?: string;
  status: MusicRequestStatus;
  adminNotes?: string;
  isPublicDisplay: boolean;
  linkedTrackId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  targetCollection: string;
  targetId: string;
  details: string;
  createdAt?: unknown;
}

export interface IntegrationJob {
  id: string;
  service: 'GOOGLE_DRIVE' | 'GOOGLE_SHEETS';
  operation: string;
  status: 'SUCCESS' | 'FAILED' | 'SETUP_REQUIRED';
  message: string;
  createdAt?: unknown;
}
