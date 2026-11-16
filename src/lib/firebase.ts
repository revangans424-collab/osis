import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  WebsiteSettings,
  MusicOperatingConfig,
  IntegrationSettings,
  AdminInvite,
  AdminUser,
  Division,
  Position,
  MemberRecord,
  PublicMemberRecord,
  AnnouncementItem,
  ProgramWork,
  DutySchedule,
  AttendanceRecord,
  CalendarEvent,
  GalleryAlbum,
  GalleryItem,
  JourneyItem,
  ArchiveDocument,
  MusicTrack,
  MusicRequest,
  AuditLog,
  IntegrationJob,
} from '../types';
import {
  INITIAL_WEBSITE_SETTINGS,
  INITIAL_MUSIC_CONFIG,
  INITIAL_INTEGRATION_SETTINGS,
  INITIAL_DIVISIONS,
  INITIAL_POSITIONS,
  INITIAL_PUBLIC_MEMBERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_PROGRAMS,
  INITIAL_DUTY_SCHEDULES,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_GALLERY_ALBUMS,
  INITIAL_GALLERY_ITEMS,
  INITIAL_JOURNEY,
  INITIAL_DOCUMENTS,
  INITIAL_MUSIC_TRACKS,
} from '../data/defaultData';

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Secondary Firebase Auth client strictly for Google Workspace OAuth (Drive & Sheets)
const WORKSPACE_OAUTH_CONFIG = {
  projectId: 'gen-lang-client-0197432787',
  appId: '1:370789174005:web:ca25053aa5b98bae0593bc',
  apiKey: 'AIzaSyAKxI_JP2dpAVpBF2pI2Pdpqh4Uo7Om-GU',
  authDomain: 'gen-lang-client-0197432787.firebaseapp.com',
};

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

const workspaceApp =
  getApps().find((a) => a.name === 'workspace-oauth') ||
  initializeApp(WORKSPACE_OAUTH_CONFIG, 'workspace-oauth');
const workspaceAuth = getAuth(workspaceApp);
const workspaceGoogleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceGoogleProvider.addScope(scope));

// In-memory cache only (never store OAuth access tokens in localStorage or sessionStorage)
let cachedWorkspaceAccessToken: string | null = null;

export function setWorkspaceAccessToken(token: string | null): void {
  cachedWorkspaceAccessToken = token;
}

export function getWorkspaceAccessToken(): string | null {
  return cachedWorkspaceAccessToken;
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  const result = await signInWithPopup(workspaceAuth, workspaceGoogleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || null;
  cachedWorkspaceAccessToken = accessToken;
  return { user: result.user, accessToken };
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedWorkspaceAccessToken = null;
    void signOut(workspaceAuth).catch(() => undefined);
  }
});

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'eventt479@gmail.com';
export const BOOTSTRAP_ADMIN_EMAILS = [
  'eventt479@gmail.com',
  'osisexample@gmail.com',
] as const;

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'websiteSettings', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
};
export type { User };

function mergeDefined<T extends object>(defaults: T, raw: Record<string, unknown> | undefined): T {
  if (!raw) return defaults;
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out as T;
}

// Public subscriptions
export function subscribePublicPortalData(callbacks: {
  onSettings: (s: WebsiteSettings) => void;
  onMusicConfig: (c: MusicOperatingConfig) => void;
  onDivisions: (d: Division[]) => void;
  onPositions: (p: Position[]) => void;
  onPublicMembers: (m: PublicMemberRecord[]) => void;
  onAnnouncements: (a: AnnouncementItem[]) => void;
  onPrograms: (p: ProgramWork[]) => void;
  onDutySchedules: (d: DutySchedule[]) => void;
  onCalendarEvents: (e: CalendarEvent[]) => void;
  onGalleryAlbums: (a: GalleryAlbum[]) => void;
  onGalleryItems: (i: GalleryItem[]) => void;
  onJourney: (j: JourneyItem[]) => void;
  onPublicDocuments: (d: ArchiveDocument[]) => void;
  onMusicTracks: (t: MusicTrack[]) => void;
  onPublicMusicRequests: (r: MusicRequest[]) => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      doc(db, 'websiteSettings', 'main'),
      (snap) => {
        if (snap.exists()) {
          callbacks.onSettings(mergeDefined(INITIAL_WEBSITE_SETTINGS, snap.data() as Record<string, unknown>));
        } else {
          callbacks.onSettings(INITIAL_WEBSITE_SETTINGS);
        }
      },
      (err) => console.warn('Settings listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'websiteSettings', 'musicConfig'),
      (snap) => {
        if (snap.exists()) {
          callbacks.onMusicConfig(mergeDefined(INITIAL_MUSIC_CONFIG, snap.data() as Record<string, unknown>));
        } else {
          callbacks.onMusicConfig(INITIAL_MUSIC_CONFIG);
        }
      },
      (err) => console.warn('MusicConfig listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'divisions'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Division, 'id'>) }));
          list.sort((a, b) => (a.order || 99) - (b.order || 99));
          callbacks.onDivisions(list);
        } else {
          callbacks.onDivisions(INITIAL_DIVISIONS);
        }
      },
      (err) => console.warn('Divisions listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'positions'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Position, 'id'>) }));
          list.sort((a, b) => (a.order || 99) - (b.order || 99));
          callbacks.onPositions(list);
        } else {
          callbacks.onPositions(INITIAL_POSITIONS);
        }
      },
      (err) => console.warn('Positions listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'publicMembers'), where('isPublished', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PublicMemberRecord, 'id'>) }));
          list.sort((a, b) => (a.hierarchyRank || 99) - (b.hierarchyRank || 99));
          callbacks.onPublicMembers(list);
        } else {
          callbacks.onPublicMembers(INITIAL_PUBLIC_MEMBERS);
        }
      },
      (err) => console.warn('PublicMembers listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'announcements'), where('published', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AnnouncementItem, 'id'>) }));
          list.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return (b.publishedAt || '').localeCompare(a.publishedAt || '');
          });
          callbacks.onAnnouncements(list);
        } else {
          callbacks.onAnnouncements(INITIAL_ANNOUNCEMENTS);
        }
      },
      (err) => console.warn('Announcements listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'programs'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProgramWork, 'id'>) }));
          callbacks.onPrograms(list);
        } else {
          callbacks.onPrograms(INITIAL_PROGRAMS);
        }
      },
      (err) => console.warn('Programs listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'dutySchedules'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DutySchedule, 'id'>) }));
          callbacks.onDutySchedules(list);
        } else {
          callbacks.onDutySchedules(INITIAL_DUTY_SCHEDULES);
        }
      },
      (err) => console.warn('DutySchedules listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'calendarEvents'), where('published', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalendarEvent, 'id'>) }));
          list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          callbacks.onCalendarEvents(list);
        } else {
          callbacks.onCalendarEvents(INITIAL_CALENDAR_EVENTS);
        }
      },
      (err) => console.warn('CalendarEvents listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'galleryAlbums'), where('isPublished', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryAlbum, 'id'>) }));
          list.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
          callbacks.onGalleryAlbums(list);
        } else {
          callbacks.onGalleryAlbums(INITIAL_GALLERY_ALBUMS);
        }
      },
      (err) => console.warn('GalleryAlbums listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'galleryItems'), where('isPublished', '==', true)),
      (snap) => {
        if (!snap.empty) {
          callbacks.onGalleryItems(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryItem, 'id'>) }))
          );
        } else {
          callbacks.onGalleryItems(INITIAL_GALLERY_ITEMS);
        }
      },
      (err) => console.warn('GalleryItems listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'journeyTimeline'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JourneyItem, 'id'>) }));
          list.sort((a, b) => (a.order || 99) - (b.order || 99));
          callbacks.onJourney(list);
        } else {
          callbacks.onJourney(INITIAL_JOURNEY);
        }
      },
      (err) => console.warn('Journey listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'documents'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          callbacks.onPublicDocuments(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArchiveDocument, 'id'>) }))
          );
        } else {
          callbacks.onPublicDocuments(INITIAL_DOCUMENTS);
        }
      },
      (err) => console.warn('PublicDocuments listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'musicTracks'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onMusicTracks(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicTrack, 'id'>) }))
          );
        } else {
          callbacks.onMusicTracks(INITIAL_MUSIC_TRACKS);
        }
      },
      (err) => console.warn('MusicTracks listener:', err.message)
    )
  );

  // Public Music Requests: combine queue/playing/completed AND approved public display requests
  let queueRequests: MusicRequest[] = [];
  let selectedRequests: MusicRequest[] = [];
  const mergeAndEmit = () => {
    const map = new Map<string, MusicRequest>();
    for (const r of [...queueRequests, ...selectedRequests]) {
      map.set(r.id, r);
    }
    callbacks.onPublicMusicRequests(Array.from(map.values()));
  };

  unsubs.push(
    onSnapshot(
      query(collection(db, 'musicRequests'), where('status', 'in', ['QUEUED', 'NOW_PLAYING', 'COMPLETED'])),
      (snap) => {
        queueRequests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicRequest, 'id'>) }));
        mergeAndEmit();
      },
      (err) => console.warn('Queue musicRequests listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'musicRequests'),
        where('status', '==', 'APPROVED'),
        where('isPublicDisplay', '==', true)
      ),
      (snap) => {
        selectedRequests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicRequest, 'id'>) }));
        mergeAndEmit();
      },
      (err) => console.warn('Selected musicRequests listener:', err.message)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

// Resolve Admin context for current signed-in user (bootstrap emails, existing admins/{uid}, or Google adminInvites)
export async function fetchCurrentAdminProfile(user: User): Promise<AdminUser | null> {
  try {
    const emailLower = (user.email || '').trim().toLowerCase();

    const snap = await getDoc(doc(db, 'admins', user.uid)).catch(() => null);
    if (snap && snap.exists()) {
      const data = snap.data() as Omit<AdminUser, 'id'>;
      if (!data.isActive) return null;
      return { id: snap.id, ...data };
    }

    if (emailLower && user.emailVerified && (BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(emailLower)) {
      return {
        id: user.uid,
        uid: user.uid,
        email: emailLower,
        displayName: user.displayName || (emailLower === BOOTSTRAP_SUPER_ADMIN_EMAIL ? 'Super Admin Utama' : 'Admin OSIS'),
        role: 'SUPER_ADMIN',
        permissions: [
          'manageMembers',
          'manageContent',
          'manageAnnouncements',
          'managePrograms',
          'manageAttendance',
          'manageGallery',
          'manageMusic',
          'manageDocuments',
        ],
        isActive: true,
      };
    }

    // Auto-claim Google Admin invite when signed in with a pre-approved verified Google email
    if (emailLower && user.emailVerified) {
      const inviteQuery = query(
        collection(db, 'adminInvites'),
        where('email', '==', emailLower),
        where('isActive', '==', true)
      );
      const inviteSnaps = await getDocs(inviteQuery).catch(() => null);
      if (inviteSnaps && !inviteSnaps.empty) {
        const invDoc = inviteSnaps.docs[0];
        const inv = invDoc.data() as Omit<AdminInvite, 'id'>;
        const newAdminProfile: Omit<AdminUser, 'id'> = {
          uid: user.uid,
          email: emailLower,
          displayName: user.displayName || inv.displayName,
          role: inv.role,
          permissions: Array.isArray(inv.permissions) ? inv.permissions : [],
          assignedDivisionId: inv.assignedDivisionId || '',
          inviteId: invDoc.id,
          isActive: true,
        };
        await setDoc(doc(db, 'admins', user.uid), {
          ...newAdminProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { id: user.uid, ...newAdminProfile };
      }
    }

    return null;
  } catch (err) {
    console.warn('Admin profile check:', err);
    return null;
  }
}

export function subscribeAdminInvites(onInvites: (invites: AdminInvite[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'adminInvites'),
    (snap) => {
      onInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminInvite, 'id'>) })));
    },
    (err) => console.warn('Admin invites listener:', err.message)
  );
}

// Seed initial defaults into Firestore when Super Admin initializes
export async function seedInitialPadmawijayaData(): Promise<void> {
  try {
    const mainRef = doc(db, 'websiteSettings', 'main');
    const mainSnap = await getDoc(mainRef);
    if (!mainSnap.exists()) {
      await setDoc(mainRef, INITIAL_WEBSITE_SETTINGS);
    }

    const musicCfgRef = doc(db, 'websiteSettings', 'musicConfig');
    if (!(await getDoc(musicCfgRef)).exists()) {
      await setDoc(musicCfgRef, INITIAL_MUSIC_CONFIG);
    }

    const intCfgRef = doc(db, 'websiteSettings', 'integrations');
    if (!(await getDoc(intCfgRef)).exists()) {
      await setDoc(intCfgRef, INITIAL_INTEGRATION_SETTINGS);
    }

    for (const div of INITIAL_DIVISIONS) {
      await setDoc(doc(db, 'divisions', div.id), div, { merge: true });
    }
    for (const pos of INITIAL_POSITIONS) {
      await setDoc(doc(db, 'positions', pos.id), pos, { merge: true });
    }
    for (const pubMem of INITIAL_PUBLIC_MEMBERS) {
      const memDoc = await getDoc(doc(db, 'publicMembers', pubMem.id));
      if (!memDoc.exists()) {
        await setDoc(doc(db, 'publicMembers', pubMem.id), { ...pubMem, updatedAt: serverTimestamp() });
      }
    }
    for (const sch of INITIAL_DUTY_SCHEDULES) {
      await setDoc(doc(db, 'dutySchedules', sch.id), sch, { merge: true });
    }
    for (const ann of INITIAL_ANNOUNCEMENTS) {
      if (!(await getDoc(doc(db, 'announcements', ann.id))).exists()) {
        await setDoc(doc(db, 'announcements', ann.id), { ...ann, createdAt: serverTimestamp() });
      }
    }
    for (const prog of INITIAL_PROGRAMS) {
      if (!(await getDoc(doc(db, 'programs', prog.id))).exists()) {
        await setDoc(doc(db, 'programs', prog.id), { ...prog, updatedAt: serverTimestamp() });
      }
    }
    for (const evt of INITIAL_CALENDAR_EVENTS) {
      if (!(await getDoc(doc(db, 'calendarEvents', evt.id))).exists()) {
        await setDoc(doc(db, 'calendarEvents', evt.id), evt);
      }
    }
    for (const alb of INITIAL_GALLERY_ALBUMS) {
      if (!(await getDoc(doc(db, 'galleryAlbums', alb.id))).exists()) {
        await setDoc(doc(db, 'galleryAlbums', alb.id), alb);
      }
    }
    for (const item of INITIAL_GALLERY_ITEMS) {
      if (!(await getDoc(doc(db, 'galleryItems', item.id))).exists()) {
        await setDoc(doc(db, 'galleryItems', item.id), item);
      }
    }
    for (const j of INITIAL_JOURNEY) {
      if (!(await getDoc(doc(db, 'journeyTimeline', j.id))).exists()) {
        await setDoc(doc(db, 'journeyTimeline', j.id), j);
      }
    }
    for (const d of INITIAL_DOCUMENTS) {
      if (!(await getDoc(doc(db, 'documents', d.id))).exists()) {
        await setDoc(doc(db, 'documents', d.id), d);
      }
    }
    for (const t of INITIAL_MUSIC_TRACKS) {
      if (!(await getDoc(doc(db, 'musicTracks', t.id))).exists()) {
        await setDoc(doc(db, 'musicTracks', t.id), t);
      }
    }
  } catch (err) {
    handleFirestoreError(err, 'write', 'seedInitialPadmawijayaData');
  }
}

// Generic Admin CRUD helpers with mandatory handleFirestoreError
export async function saveFirestoreDoc(
  col: string,
  id: string,
  data: Record<string, unknown>,
  merge = true
): Promise<void> {
  try {
    await setDoc(doc(db, col, id), data, { merge });
  } catch (err) {
    handleFirestoreError(err, 'write', `${col}/${id}`);
  }
}

export async function deleteFirestoreDoc(col: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, col, id));
  } catch (err) {
    handleFirestoreError(err, 'delete', `${col}/${id}`);
  }
}

export async function writeClientAuditLog(
  action: string,
  targetCollection: string,
  targetId: string,
  details: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      action,
      actorUid: user.uid,
      actorEmail: user.email || user.uid,
      targetCollection,
      targetId,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Client audit log warning:', err);
  }
}

export function subscribeAdminWorkspaceData(
  admin: AdminUser,
  callbacks: {
    onMembers: (m: MemberRecord[]) => void;
    onAllAnnouncements: (a: AnnouncementItem[]) => void;
    onAllAlbums: (a: GalleryAlbum[]) => void;
    onAllGalleryItems: (i: GalleryItem[]) => void;
    onAllDocuments: (d: ArchiveDocument[]) => void;
    onAllCalendar: (e: CalendarEvent[]) => void;
    onAllAttendance: (att: AttendanceRecord[]) => void;
    onAllMusicRequests: (req: MusicRequest[]) => void;
    onAdmins: (admins: AdminUser[]) => void;
    onIntegrationSettings: (cfg: IntegrationSettings) => void;
    onAuditLogs: (logs: AuditLog[]) => void;
    onIntegrationJobs: (jobs: IntegrationJob[]) => void;
  }
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'members'),
      (snap) => {
        callbacks.onMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MemberRecord, 'id'>) })));
      },
      (err) => console.warn('Admin members listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        callbacks.onAllAnnouncements(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AnnouncementItem, 'id'>) }))
        );
      },
      (err) => console.warn('Admin announcements listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'galleryAlbums'),
      (snap) => {
        callbacks.onAllAlbums(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryAlbum, 'id'>) })));
      },
      (err) => console.warn('Admin albums listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'galleryItems'),
      (snap) => {
        callbacks.onAllGalleryItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryItem, 'id'>) }))
        );
      },
      (err) => console.warn('Admin galleryItems listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'documents'),
      (snap) => {
        callbacks.onAllDocuments(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArchiveDocument, 'id'>) }))
        );
      },
      (err) => console.warn('Admin docs listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'calendarEvents'),
      (snap) => {
        callbacks.onAllCalendar(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalendarEvent, 'id'>) }))
        );
      },
      (err) => console.warn('Admin calendar listener:', err.message)
    )
  );

  if (admin.role === 'SUPER_ADMIN' || admin.permissions.includes('manageAttendance')) {
    unsubs.push(
      onSnapshot(
        collection(db, 'attendance'),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }));
          list.sort((a, b) => (b.dutyDate || '').localeCompare(a.dutyDate || ''));
          callbacks.onAllAttendance(list);
        },
        (err) => console.warn('Admin attendance listener:', err.message)
      )
    );
  }

  unsubs.push(
    onSnapshot(
      collection(db, 'musicRequests'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicRequest, 'id'>) }));
        callbacks.onAllMusicRequests(list);
      },
      (err) => console.warn('Admin musicRequests listener:', err.message)
    )
  );

  if (admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN') {
    unsubs.push(
      onSnapshot(
        collection(db, 'admins'),
        (snap) => {
          callbacks.onAdmins(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminUser, 'id'>) })));
        },
        (err) => console.warn('Admin accounts listener:', err.message)
      )
    );
  }

  unsubs.push(
    onSnapshot(
      doc(db, 'websiteSettings', 'integrations'),
      (snap) => {
        if (snap.exists()) {
          callbacks.onIntegrationSettings(
            mergeDefined(INITIAL_INTEGRATION_SETTINGS, snap.data() as Record<string, unknown>)
          );
        } else {
          callbacks.onIntegrationSettings(INITIAL_INTEGRATION_SETTINGS);
        }
      },
      (err) => console.warn('Integration settings listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
        callbacks.onAuditLogs(list.slice(-100).reverse());
      },
      (err) => console.warn('Audit logs listener:', err.message)
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'integrationJobs'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IntegrationJob, 'id'>) }));
        callbacks.onIntegrationJobs(list.slice(-50).reverse());
      },
      (err) => console.warn('Integration jobs listener:', err.message)
    )
  );

  return () => unsubs.forEach((u) => u());
}
