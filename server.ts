import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase-applet-config.json
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8')) as {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
};

const PROJECT_ID = firebaseConfig.projectId;
const API_KEY = firebaseConfig.apiKey;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'eventt479@gmail.com';
const BOOTSTRAP_ADMIN_EMAILS = ['eventt479@gmail.com', 'osisexample@gmail.com'];
const DEFAULT_DRIVE_FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID || '1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ';

// Optional Firebase Admin initialization (when service account secret is configured)
let adminAuthInstance: ReturnType<typeof getAdminAuth> | null = null;
let adminDbInstance: ReturnType<typeof getAdminFirestore> | null = null;
let serviceAccountCredentials: Record<string, string> | null = null;

function initCredentials() {
  const rawJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!rawJson.trim()) return;
  try {
    const parsed = JSON.parse(rawJson) as Record<string, string>;
    if (parsed.client_email && parsed.private_key) {
      serviceAccountCredentials = parsed;
      if (getAdminApps().length === 0) {
        const app = initializeAdminApp({
          credential: cert(parsed as Parameters<typeof cert>[0]),
          projectId: parsed.project_id || PROJECT_ID,
        });
        adminAuthInstance = getAdminAuth(app);
        adminDbInstance =
          DATABASE_ID && DATABASE_ID !== '(default)'
            ? getAdminFirestore(app, DATABASE_ID)
            : getAdminFirestore(app);
      }
    }
  } catch (err) {
    console.warn('Invalid GOOGLE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_JSON format:', err);
  }
}

initCredentials();

// Google Drive & Sheets client factory
function getGoogleAuthClient(scopes: string[]) {
  if (!serviceAccountCredentials) return null;
  return new google.auth.JWT({
    email: serviceAccountCredentials.client_email,
    key: serviceAccountCredentials.private_key,
    scopes,
  });
}

function getGoogleClientFromRequest(req: Request, scopes: string[]) {
  const saClient = getGoogleAuthClient(scopes);
  if (saClient) return saClient;

  const headerToken = String(req.headers['x-google-access-token'] || '').trim();
  if (headerToken) {
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: headerToken });
    return oauth2;
  }
  return null;
}

// WIB (Asia/Jakarta) server time helpers
function getWibTimeParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = map.hour === '24' ? '00' : map.hour;
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${hour}:${map.minute}`;
  const totalMinutes = parseInt(hour, 10) * 60 + parseInt(map.minute, 10);
  const monthNames = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const monthIdx = Math.max(0, Math.min(11, parseInt(map.month, 10) - 1));
  const monthFolder = `${map.month}-${monthNames[monthIdx]}`;
  const rawDayName = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  }).format(now);
  const dayNameId = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1).toLowerCase();
  return {
    dateStr,
    timeStr,
    totalMinutes,
    year: map.year,
    monthFolder,
    dayNameId,
    isoWib: `${dateStr}T${hour}:${map.minute}:${map.second}+07:00`,
  };
}

const VALID_DUTY_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function normalizeDutyDays(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  for (const item of input) {
    const clean = String(item || '').trim();
    if (VALID_DUTY_DAYS.includes(clean)) unique.add(clean);
  }
  return VALID_DUTY_DAYS.filter((d) => unique.has(d));
}

function parseHhMmToMinutes(hhmm: string, fallbackMinutes: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return fallbackMinutes;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return fallbackMinutes;
  return h * 60 + min;
}

function sanitizeId(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extractGoogleResourceId(raw: string, kind: 'sheet' | 'folder'): string {
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

function memberNumberToAuthEmail(memberNumber: string): string {
  const cleaned = String(memberNumber || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `m.${cleaned}@padmawijaya.osis`;
}

// Firestore REST value converters (for fallback when Admin SDK service account is not configured)
type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

function jsToFsValue(val: unknown): FsValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => jsToFsValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FsValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) fields[k] = jsToFsValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fsValueToJs(val: FsValue | undefined): unknown {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map((v) => fsValueToJs(v));
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = fsValueToJs(v);
    }
    return out;
  }
  return undefined;
}

function fsDocToJs(docObj: { name?: string; fields?: Record<string, FsValue> }): Record<string, unknown> {
  const id = docObj.name ? docObj.name.split('/').pop() || '' : '';
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(docObj.fields || {})) {
    out[k] = fsValueToJs(v);
  }
  return out;
}

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

async function fsGetDoc(collection: string, docId: string, idToken?: string): Promise<Record<string, unknown> | null> {
  if (adminDbInstance) {
    const snap = await adminDbInstance.collection(collection).doc(docId).get();
    return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
  }
  const headers: Record<string, string> = {};
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  const res = await fetch(`${FIRESTORE_BASE}/${collection}/${docId}?key=${API_KEY}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore GET ${collection}/${docId} failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as { name?: string; fields?: Record<string, FsValue> };
  return fsDocToJs(json);
}

async function fsListCollection(collection: string, idToken?: string, pageSize = 200): Promise<Record<string, unknown>[]> {
  if (adminDbInstance) {
    const snap = await adminDbInstance.collection(collection).limit(pageSize).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  }
  const headers: Record<string, string> = {};
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  const res = await fetch(`${FIRESTORE_BASE}/${collection}?pageSize=${pageSize}&key=${API_KEY}`, { headers });
  if (res.status === 404) return [];
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore LIST ${collection} failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as { documents?: Array<{ name?: string; fields?: Record<string, FsValue> }> };
  return (json.documents || []).map(fsDocToJs);
}

async function fsSetDoc(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  options: { idToken?: string; serverTimestampFields?: string[]; merge?: boolean } = {}
): Promise<void> {
  if (adminDbInstance) {
    const payload: Record<string, unknown> = { ...data };
    for (const f of options.serverTimestampFields || []) {
      payload[f] = AdminFieldValue.serverTimestamp();
    }
    await adminDbInstance.collection(collection).doc(docId).set(payload, { merge: Boolean(options.merge) });
    return;
  }

  const docPath = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${docId}`;
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && !(options.serverTimestampFields || []).includes(k)) {
      fields[k] = jsToFsValue(v);
    }
  }

  const writes: Array<Record<string, unknown>> = [];
  if (options.merge) {
    const fieldPaths = Object.keys(fields);
    writes.push({
      update: { name: docPath, fields },
      updateMask: { fieldPaths },
    });
  } else {
    writes.push({
      update: { name: docPath, fields },
    });
  }

  if ((options.serverTimestampFields || []).length > 0) {
    writes.push({
      transform: {
        document: docPath,
        fieldTransforms: (options.serverTimestampFields || []).map((fieldPath) => ({
          fieldPath,
          setToServerValue: 'REQUEST_TIME',
        })),
      },
    });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.idToken) headers['Authorization'] = `Bearer ${options.idToken}`;

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ writes }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore COMMIT ${collection}/${docId} failed (${res.status}): ${errText}`);
  }
}

async function fsDeleteDoc(collection: string, docId: string, idToken?: string): Promise<void> {
  if (!docId) return;
  if (adminDbInstance) {
    await adminDbInstance.collection(collection).doc(docId).delete();
    return;
  }
  const headers: Record<string, string> = {};
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  const res = await fetch(`${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore DELETE ${collection}/${docId} failed (${res.status}): ${errText}`);
  }
}

// Verify Firebase ID token via Admin SDK or official Firebase Auth lookup
interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
}

async function verifyIdToken(idToken: string): Promise<VerifiedUser> {
  if (adminAuthInstance) {
    const decoded = await adminAuthInstance.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
      idToken,
    };
  }
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const json = (await res.json()) as {
    users?: Array<{ localId: string; email?: string; emailVerified?: boolean; disabled?: boolean }>;
    error?: { message: string };
  };
  if (!res.ok || !json.users || json.users.length === 0) {
    throw new Error(json.error?.message || 'INVALID_ID_TOKEN');
  }
  const u = json.users[0];
  if (u.disabled) throw new Error('USER_DISABLED');
  return {
    uid: u.localId,
    email: u.email || '',
    emailVerified: Boolean(u.emailVerified),
    idToken,
  };
}

interface AdminContext {
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DIVISION_ADMIN';
  permissions: string[];
  assignedDivisionId?: string;
  isActive: boolean;
}

async function resolveAdminContext(user: VerifiedUser): Promise<AdminContext | null> {
  const emailLower = user.email.trim().toLowerCase();
  const doc = await fsGetDoc('admins', user.uid, user.idToken).catch(() => null);
  if (doc) {
    if (doc.isActive !== true) return null;
    return {
      role: doc.role as AdminContext['role'],
      permissions: Array.isArray(doc.permissions) ? (doc.permissions as string[]) : [],
      assignedDivisionId: typeof doc.assignedDivisionId === 'string' ? doc.assignedDivisionId : undefined,
      isActive: true,
    };
  }

  if (BOOTSTRAP_ADMIN_EMAILS.includes(emailLower) && user.emailVerified) {
    return {
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

  if (emailLower && user.emailVerified) {
    const inviteKey = sanitizeId(emailLower.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const inviteDoc = await fsGetDoc('adminInvites', inviteKey, user.idToken).catch(() => null);
    if (inviteDoc && inviteDoc.isActive === true && String(inviteDoc.email || '').toLowerCase() === emailLower) {
      return {
        role: inviteDoc.role as AdminContext['role'],
        permissions: Array.isArray(inviteDoc.permissions) ? (inviteDoc.permissions as string[]) : [],
        assignedDivisionId:
          typeof inviteDoc.assignedDivisionId === 'string' ? inviteDoc.assignedDivisionId : undefined,
        isActive: true,
      };
    }
  }

  return null;
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ ok: false, message: 'Autentikasi diperlukan.' });
    return;
  }
  try {
    const user = await verifyIdToken(token);
    (req as Request & { authUser?: VerifiedUser }).authUser = user;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, message: err instanceof Error ? err.message : 'Token tidak valid.' });
  }
}

async function logAudit(
  user: VerifiedUser,
  action: string,
  targetCollection: string,
  targetId: string,
  details: string
) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fsSetDoc(
      'auditLogs',
      logId,
      {
        action,
        actorUid: user.uid,
        actorEmail: user.email || user.uid,
        targetCollection,
        targetId,
        details: details.slice(0, 950),
      },
      { idToken: user.idToken, serverTimestampFields: ['createdAt'] }
    );
  } catch (err) {
    console.warn('Audit log write warning:', err);
  }
}

async function logIntegrationJob(
  service: 'GOOGLE_DRIVE' | 'GOOGLE_SHEETS',
  operation: string,
  status: 'SUCCESS' | 'FAILED' | 'SETUP_REQUIRED',
  message: string,
  idToken?: string
) {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fsSetDoc(
      'integrationJobs',
      jobId,
      {
        service,
        operation,
        status,
        message: message.slice(0, 950),
      },
      { idToken, serverTimestampFields: ['createdAt'] }
    );
  } catch (err) {
    console.warn('Integration job log warning:', err);
  }
}

// Google Drive folder traversal / auto-create helper
async function ensureDriveSubfolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  const escaped = folderName.replace(/'/g, "\\'");
  const listRes = await drive.files.list({
    q: `name = '${escaped}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existing = listRes.data.files?.[0];
  if (existing?.id) return existing.id;

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!createRes.data.id) throw new Error(`Gagal membuat folder Drive: ${folderName}`);
  return createRes.data.id;
}

async function getDriveFolderPath(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  segments: string[]
): Promise<string> {
  let currentId = rootFolderId;
  for (const seg of segments) {
    currentId = await ensureDriveSubfolder(drive, currentId, seg);
  }
  return currentId;
}

// In-memory rate limiting for public music requests
const musicRateLimitMap = new Map<string, { timestamps: number[] }>();
const recentSongFingerprintMap = new Map<string, number>();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Health endpoint
  app.get('/api/health', (_req, res) => {
    const wib = getWibTimeParts();
    res.json({
      ok: true,
      serverTimeWib: wib.isoWib,
      dutyDateWib: wib.dateStr,
      hasServiceAccount: Boolean(serviceAccountCredentials),
      driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    });
  });

  // 2. Member Login via Member Number + Password (mapped to Firebase Auth, never plaintext in Firestore)
  app.post('/api/auth/member-login', async (req, res) => {
    try {
      const memberNumber = String(req.body?.memberNumber || '').trim();
      const password = String(req.body?.password || '');
      if (!memberNumber || !password) {
        res.status(400).json({ ok: false, message: 'Nomor anggota dan kata sandi wajib diisi.' });
        return;
      }

      const authEmail = memberNumberToAuthEmail(memberNumber);
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const signInJson = (await signInRes.json()) as {
        idToken?: string;
        localId?: string;
        error?: { message: string };
      };

      if (!signInRes.ok || !signInJson.idToken || !signInJson.localId) {
        const errMsg = signInJson.error?.message || 'LOGIN_FAILED';
        if (errMsg.includes('PASSWORD_LOGIN_DISABLED') || errMsg.includes('OPERATION_NOT_ALLOWED')) {
          res.status(503).json({
            ok: false,
            code: 'EMAIL_PASSWORD_DISABLED',
            message:
              'Metode login Email/Password belum diaktifkan di Firebase Console proyek ini. Silakan aktifkan Email/Password pada menu Authentication > Sign-in method.',
          });
          return;
        }
        res.status(401).json({
          ok: false,
          code: errMsg,
          message: 'Nomor anggota atau kata sandi salah.',
        });
        return;
      }

      // Verify active member status in Firestore using the authenticated member's token
      const cleanMapId = sanitizeId(memberNumber);
      const mapDoc = await fsGetDoc('memberAuthMap', cleanMapId, signInJson.idToken);
      if (mapDoc && mapDoc.isActive === false) {
        res.status(403).json({
          ok: false,
          code: 'ACCOUNT_DISABLED',
          message: 'Akun anggota Anda sedang dinonaktifkan oleh pengelola.',
        });
        return;
      }

      res.json({
        ok: true,
        authEmail,
        uid: signInJson.localId,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal memproses login anggota.',
      });
    }
  });

  // 3. Admin Create Member Account (with Firebase Auth creation & duplicate memberNumber guard)
  app.post('/api/admin/members/create', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageMembers'))) {
        res.status(403).json({ ok: false, message: 'Anda tidak memiliki izin mengelola data anggota.' });
        return;
      }

      const {
        memberNumber,
        initialPassword,
        fullName,
        divisionId,
        divisionName,
        positionId,
        positionTitle,
        hierarchyRank,
        classGrade,
        bio,
        photoUrl,
        dutyScheduleId,
        dutyDays,
        isActive = true,
        isPublished = true,
      } = req.body || {};

      const normalizedDutyDays = normalizeDutyDays(dutyDays);

      const cleanNum = String(memberNumber || '').trim();
      const mapId = sanitizeId(cleanNum);
      if (!cleanNum || !fullName || !divisionId || !initialPassword || String(initialPassword).length < 6) {
        res.status(400).json({
          ok: false,
          message: 'Nomor anggota, nama lengkap, divisi, dan kata sandi awal (min. 6 karakter) wajib diisi.',
        });
        return;
      }

      // Check duplicate memberNumber
      const existingMap = await fsGetDoc('memberAuthMap', mapId, authUser.idToken);
      if (existingMap) {
        res.status(409).json({
          ok: false,
          message: `Nomor anggota "${cleanNum}" sudah terdaftar. Gunakan nomor anggota unik.`,
        });
        return;
      }

      const authEmail = memberNumberToAuthEmail(cleanNum);
      let newUid = '';

      if (adminAuthInstance) {
        try {
          const created = await adminAuthInstance.createUser({
            email: authEmail,
            password: String(initialPassword),
            displayName: String(fullName),
            emailVerified: true,
            disabled: !Boolean(isActive),
          });
          newUid = created.uid;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res.status(400).json({ ok: false, message: `Gagal membuat akun Firebase Auth: ${msg}` });
          return;
        }
      } else {
        // Server-side Firebase Auth REST signup (does not sign out admin in browser)
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: authEmail,
              password: String(initialPassword),
              returnSecureToken: false,
            }),
          }
        );
        const signUpJson = (await signUpRes.json()) as {
          localId?: string;
          error?: { message: string };
        };
        if (!signUpRes.ok || !signUpJson.localId) {
          const errMsg = signUpJson.error?.message || 'SIGNUP_FAILED';
          if (errMsg.includes('OPERATION_NOT_ALLOWED') || errMsg.includes('PASSWORD_LOGIN_DISABLED')) {
            res.status(503).json({
              ok: false,
              code: 'EMAIL_PASSWORD_DISABLED',
              message:
                'Aktifkan provider Email/Password di Firebase Console > Authentication > Sign-in method terlebih dahulu agar akun anggota dapat dibuat.',
            });
            return;
          }
          if (errMsg.includes('EMAIL_EXISTS')) {
            res.status(409).json({
              ok: false,
              message: `Akun autentikasi untuk nomor anggota ${cleanNum} sudah ada.`,
            });
            return;
          }
          res.status(400).json({ ok: false, message: `Gagal membuat akun Auth: ${errMsg}` });
          return;
        }
        newUid = signUpJson.localId;
      }

      const memberId = `mem_${mapId}_${Date.now().toString(36)}`;
      await fsSetDoc(
        'members',
        memberId,
        {
          memberNumber: cleanNum,
          fullName: String(fullName).trim(),
          divisionId: String(divisionId),
          divisionName: String(divisionName || divisionId),
          positionId: String(positionId || 'pos-anggota'),
          positionTitle: String(positionTitle || 'Anggota'),
          hierarchyRank: Number(hierarchyRank || 6),
          classGrade: String(classGrade || '').trim(),
          bio: String(bio || '').trim(),
          photoUrl: String(photoUrl || '').trim(),
          dutyScheduleId: String(dutyScheduleId || 'piket-gerbang-pagi'),
          dutyDays: normalizedDutyDays,
          authUid: newUid,
          isActive: Boolean(isActive),
          isPublished: Boolean(isPublished),
        },
        { idToken: authUser.idToken, serverTimestampFields: ['createdAt', 'updatedAt'] }
      );

      await fsSetDoc(
        'memberAuthMap',
        mapId,
        {
          memberId,
          memberNumber: cleanNum,
          authUid: newUid,
          authEmail,
          isActive: Boolean(isActive),
        },
        { idToken: authUser.idToken, serverTimestampFields: ['updatedAt'] }
      );

      await fsSetDoc(
        'publicMembers',
        memberId,
        {
          fullName: String(fullName).trim(),
          divisionId: String(divisionId),
          divisionName: String(divisionName || divisionId),
          positionTitle: String(positionTitle || 'Anggota'),
          hierarchyRank: Number(hierarchyRank || 6),
          bio: String(bio || '').trim(),
          photoUrl: String(photoUrl || '').trim(),
          isPublished: Boolean(isPublished) && Boolean(isActive),
        },
        { idToken: authUser.idToken, serverTimestampFields: ['updatedAt'] }
      );

      await logAudit(
        authUser,
        'CREATE_MEMBER_ACCOUNT',
        'members',
        memberId,
        `Membuat akun anggota ${cleanNum} (${fullName})`
      );

      res.json({ ok: true, memberId, authUid: newUid });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal membuat akun anggota.',
      });
    }
  });

  // 3b. Admin Delete Member Account (Deletes Firestore docs + optional Auth user + Audit Log)
  app.post('/api/admin/members/delete', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageMembers'))) {
        res.status(403).json({ ok: false, message: 'Anda tidak memiliki izin menghapus data anggota.' });
        return;
      }

      const memberId = String(req.body?.memberId || '').trim();
      if (!memberId) {
        res.status(400).json({ ok: false, message: 'memberId wajib diisi.' });
        return;
      }

      const existingMember = await fsGetDoc('members', memberId, authUser.idToken).catch(() => null);
      const cleanNumber = String(existingMember?.memberNumber || req.body?.memberNumber || '').trim();
      const authUid = String(existingMember?.authUid || req.body?.authUid || '').trim();
      const mapId = cleanNumber ? sanitizeId(cleanNumber) : '';

      await fsDeleteDoc('members', memberId, authUser.idToken);
      await fsDeleteDoc('publicMembers', memberId, authUser.idToken).catch(() => undefined);
      if (mapId) {
        await fsDeleteDoc('memberAuthMap', mapId, authUser.idToken).catch(() => undefined);
      }

      if (adminAuthInstance && authUid) {
        await adminAuthInstance.deleteUser(authUid).catch((err) => {
          console.warn('Delete Auth user warning:', err instanceof Error ? err.message : err);
        });
      }

      await logAudit(
        authUser,
        'DELETE_MEMBER',
        'members',
        memberId,
        `Menghapus anggota ${existingMember?.fullName || memberId} (${cleanNumber || '-'})`
      );

      res.json({ ok: true, memberId });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal menghapus data anggota.',
      });
    }
  });

  // 4. Admin Reset Member Password (Server-side Firebase Admin SDK)
  app.post('/api/admin/members/reset-password', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageMembers'))) {
        res.status(403).json({ ok: false, message: 'Izin ditolak.' });
        return;
      }

      const { memberId, authUid, newPassword } = req.body || {};
      if (!authUid || !newPassword || String(newPassword).length < 6) {
        res.status(400).json({ ok: false, message: 'authUid dan kata sandi baru (min. 6 karakter) wajib diisi.' });
        return;
      }

      if (!adminAuthInstance) {
        res.status(503).json({
          ok: false,
          code: 'SERVICE_ACCOUNT_REQUIRED',
          message:
            'Reset kata sandi anggota oleh Admin memerlukan FIREBASE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_JSON pada Secrets server.',
        });
        return;
      }

      await adminAuthInstance.updateUser(String(authUid), { password: String(newPassword) });
      await logAudit(
        authUser,
        'RESET_MEMBER_PASSWORD',
        'members',
        String(memberId || authUid),
        `Reset kata sandi akun anggota UID ${authUid}`
      );
      res.json({ ok: true, message: 'Kata sandi anggota berhasil direset secara aman.' });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal mereset kata sandi.',
      });
    }
  });

  // 5. Super Admin Create Other Admin Accounts
  app.post('/api/admin/accounts/create', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || adminCtx.role !== 'SUPER_ADMIN') {
        res.status(403).json({ ok: false, message: 'Hanya Super Admin yang dapat membuat akun Admin.' });
        return;
      }

      const {
        email,
        password,
        displayName,
        role,
        permissions = [],
        assignedDivisionId = '',
        loginMethod = 'password',
      } = req.body || {};
      if (!email || !displayName || !role) {
        res.status(400).json({ ok: false, message: 'Email, nama tampilan, dan peran wajib diisi.' });
        return;
      }
      if (!['SUPER_ADMIN', 'ADMIN', 'DIVISION_ADMIN'].includes(role)) {
        res.status(400).json({ ok: false, message: 'Peran admin tidak valid.' });
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // Mode 1: Google Sign-In Admin Allowlist (no app-specific password needed; logs in via Google)
      if (loginMethod === 'google') {
        const inviteKey = sanitizeId(cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_'));
        await fsSetDoc(
          'adminInvites',
          inviteKey,
          {
            email: cleanEmail,
            displayName: String(displayName).trim(),
            role,
            permissions: Array.isArray(permissions) ? permissions : [],
            assignedDivisionId: String(assignedDivisionId || ''),
            isActive: true,
          },
          { idToken: authUser.idToken, serverTimestampFields: ['createdAt'] }
        );

        await logAudit(
          authUser,
          'INVITE_GOOGLE_ADMIN',
          'adminInvites',
          inviteKey,
          `Mendaftarkan akun Google Admin ${role} untuk ${cleanEmail}`
        );

        res.json({
          ok: true,
          mode: 'google',
          inviteKey,
          message: `Email Google ${cleanEmail} berhasil didaftarkan sebagai ${role}. Pengelola dapat langsung login memakai tombol Masuk dengan Akun Google.`,
        });
        return;
      }

      // Mode 2: Email & Password account via Firebase Auth
      let targetUid = '';
      if (adminAuthInstance) {
        try {
          const existing = await adminAuthInstance.getUserByEmail(cleanEmail);
          targetUid = existing.uid;
        } catch {
          if (!password || String(password).length < 6) {
            res.status(400).json({ ok: false, message: 'Kata sandi minimal 6 karakter untuk akun baru.' });
            return;
          }
          const created = await adminAuthInstance.createUser({
            email: cleanEmail,
            password: String(password),
            displayName: String(displayName).trim(),
            emailVerified: true,
          });
          targetUid = created.uid;
        }
      } else {
        if (!password || String(password).length < 6) {
          res.status(400).json({ ok: false, message: 'Kata sandi minimal 6 karakter.' });
          return;
        }
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: String(password),
              returnSecureToken: false,
            }),
          }
        );
        const signUpJson = (await signUpRes.json()) as { localId?: string; error?: { message: string } };
        if (!signUpRes.ok || !signUpJson.localId) {
          const rawErr = signUpJson.error?.message || 'Gagal membuat akun admin di Firebase Auth.';
          const friendly = rawErr.includes('OPERATION_NOT_ALLOWED')
            ? 'Penyedia Email/Password belum diaktifkan di Firebase Console. Gunakan metode "Akun Google" atau aktifkan Email/Password di Firebase Authentication.'
            : rawErr;
          res.status(400).json({ ok: false, message: friendly });
          return;
        }
        targetUid = signUpJson.localId;
      }

      await fsSetDoc(
        'admins',
        targetUid,
        {
          uid: targetUid,
          email: cleanEmail,
          displayName: String(displayName).trim(),
          role,
          permissions: Array.isArray(permissions) ? permissions : [],
          assignedDivisionId: String(assignedDivisionId || ''),
          isActive: true,
        },
        { idToken: authUser.idToken, serverTimestampFields: ['createdAt', 'updatedAt'] }
      );

      await logAudit(
        authUser,
        'CREATE_ADMIN_ACCOUNT',
        'admins',
        targetUid,
        `Menambahkan akun ${role} untuk ${cleanEmail}`
      );
      res.json({ ok: true, uid: targetUid });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal membuat akun admin.',
      });
    }
  });

  // 6. Selfie Attendance Submission (Server Timestamp, Window Validation, Duplicate Guard, Drive Upload, Sheets Append)
  app.post('/api/attendance/submit', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const { memberId, photoBase64, mimeType, fileName } = req.body || {};

      if (!memberId || !photoBase64 || !mimeType) {
        res.status(400).json({ ok: false, message: 'Foto bukti absensi wajib dipilih sebelum mengirim.' });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(String(mimeType).toLowerCase())) {
        res.status(400).json({ ok: false, message: 'Format foto harus JPG, JPEG, atau PNG.' });
        return;
      }

      const rawBase64 = String(photoBase64).replace(/^data:image\/\w+;base64,/, '');
      const imgBuffer = Buffer.from(rawBase64, 'base64');
      if (imgBuffer.length === 0 || imgBuffer.length > 4 * 1024 * 1024) {
        res.status(400).json({ ok: false, message: 'Ukuran foto tidak valid atau melebihi 4 MB setelah kompresi.' });
        return;
      }

      // Verify member record & ownership
      const member = await fsGetDoc('members', String(memberId), authUser.idToken);
      if (!member || member.authUid !== authUser.uid) {
        res.status(403).json({ ok: false, message: 'Data anggota tidak cocok dengan akun yang login.' });
        return;
      }
      if (member.isActive !== true) {
        res.status(403).json({ ok: false, message: 'Status keanggotaan Anda nonaktif.' });
        return;
      }

      // Load duty schedule (fallback 06:30 WIB)
      const scheduleId = String(member.dutyScheduleId || 'piket-gerbang-pagi');
      const scheduleDoc = await fsGetDoc('dutySchedules', scheduleId, authUser.idToken);
      const dutyTimeWib = String(scheduleDoc?.dutyTimeWib || '06:30');
      const windowOpenWib = String(scheduleDoc?.windowOpenWib || '05:30');
      const windowCloseWib = String(scheduleDoc?.windowCloseWib || '08:00');
      const graceMinutes = Number(scheduleDoc?.graceMinutes ?? 5);
      const scheduleName = String(scheduleDoc?.name || `Piket Gerbang (${dutyTimeWib} WIB)`);

      const wib = getWibTimeParts();
      const memberDutyDays = normalizeDutyDays(member.dutyDays);
      if (memberDutyDays.length > 0 && !memberDutyDays.includes(wib.dayNameId)) {
        res.status(400).json({
          ok: false,
          code: 'NOT_SCHEDULED_DUTY_DAY',
          message: `Absensi ditolak: hari ini (${wib.dayNameId}) bukan jadwal piket jaga gerbang Anda. Jadwal piket Anda: ${memberDutyDays.join(', ')}.`,
        });
        return;
      }

      const openMin = parseHhMmToMinutes(windowOpenWib, 5 * 60 + 30);
      const closeMin = parseHhMmToMinutes(windowCloseWib, 8 * 60);
      const dutyMin = parseHhMmToMinutes(dutyTimeWib, 6 * 60 + 30);

      if (wib.totalMinutes < openMin || wib.totalMinutes > closeMin) {
        res.status(400).json({
          ok: false,
          code: 'OUTSIDE_ATTENDANCE_WINDOW',
          message: `Absensi ditolak: waktu server saat ini ${wib.timeStr} WIB berada di luar jendela absensi (${windowOpenWib}–${windowCloseWib} WIB).`,
        });
        return;
      }

      const attendanceId = sanitizeId(`${wib.dateStr}_${member.memberNumber}_${scheduleId}`);
      const existingAtt = await fsGetDoc('attendance', attendanceId, authUser.idToken);
      if (existingAtt) {
        res.status(409).json({
          ok: false,
          code: 'DUPLICATE_ATTENDANCE',
          message: `Anda sudah melakukan absensi pada ${wib.dateStr} untuk jadwal ${scheduleName}.`,
        });
        return;
      }

      const status = wib.totalMinutes <= dutyMin + graceMinutes ? 'HADIR' : 'TERLAMBAT';

      // Google Drive upload (Service Account or active OAuth access token)
      // If neither is configured on a member-only session, record attendance in Firestore honestly as SETUP_REQUIRED so check-in is never blocked
      const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive']);
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const rootFolderId = extractGoogleResourceId(
        String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );
      const spreadsheetId = extractGoogleResourceId(
        String(intSettings?.googleSheetsSpreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''),
        'sheet'
      );

      let drivePhotoFileId = '';
      let driveUploadStatus: 'UPLOADED' | 'SETUP_REQUIRED' | 'FAILED' = 'SETUP_REQUIRED';
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const driveFileName = `ABSENSI_${sanitizeId(String(member.memberNumber))}_${wib.dateStr}_${Date.now()}.${ext}`;

      if (!driveAuth) {
        await logIntegrationJob(
          'GOOGLE_DRIVE',
          'ATTENDANCE_PHOTO_UPLOAD',
          'SETUP_REQUIRED',
          'GOOGLE_SERVICE_ACCOUNT_JSON belum dikonfigurasi di server; absensi disimpan ke Firestore menunggu sinkronisasi Admin.',
          authUser.idToken
        );
      } else {
        try {
          const drive = google.drive({ version: 'v3', auth: driveAuth });
          const targetFolderId = await getDriveFolderPath(drive, rootFolderId, [
            'PADMAWIJAYA 2026-2027',
            'ABSENSI',
            wib.year,
            wib.monthFolder,
          ]);

          // Prevent duplicate file upload on retry by checking existing filename prefix for today
          const prefix = `ABSENSI_${sanitizeId(String(member.memberNumber))}_${wib.dateStr}`;
          const existingFiles = await drive.files.list({
            q: `name contains '${prefix}' and '${targetFolderId}' in parents and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });

          if (existingFiles.data.files && existingFiles.data.files.length > 0 && existingFiles.data.files[0].id) {
            drivePhotoFileId = existingFiles.data.files[0].id;
          } else {
            const { Readable } = await import('stream');
            const uploadRes = await drive.files.create({
              requestBody: {
                name: driveFileName,
                parents: [targetFolderId],
                description: `Bukti absensi piket OSIS PADMAWIJAYA - ${member.memberNumber} - ${wib.dateStr} (fileName asal: ${String(fileName || 'gallery')})`,
              },
              media: {
                mimeType,
                body: Readable.from(imgBuffer),
              },
              fields: 'id, name',
              supportsAllDrives: true,
            });
            drivePhotoFileId = uploadRes.data.id || '';
          }

          driveUploadStatus = 'UPLOADED';
          await logIntegrationJob(
            'GOOGLE_DRIVE',
            'ATTENDANCE_PHOTO_UPLOAD',
            'SUCCESS',
            `Uploaded ${driveFileName} (${drivePhotoFileId})`,
            authUser.idToken
          );
        } catch (driveErr) {
          const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
          driveUploadStatus = 'FAILED';
          await logIntegrationJob('GOOGLE_DRIVE', 'ATTENDANCE_PHOTO_UPLOAD', 'FAILED', msg, authUser.idToken);
        }
      }

      // Google Sheets append if configured and authorized
      let sheetsSyncStatus: 'SYNCED' | 'SETUP_REQUIRED' | 'FAILED' = 'SETUP_REQUIRED';

      if (spreadsheetId) {
        try {
          const sheetsAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/spreadsheets']);
          if (sheetsAuth) {
            const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
            const range = String(intSettings?.googleSheetsRange || 'Absensi!A:I');
            const sheetTab = range.split('!')[0] || 'Absensi';
            const existingRows = await sheets.spreadsheets.values
              .get({ spreadsheetId, range: `${sheetTab}!A:A` })
              .catch(() => null);
            const alreadyInSheet = (existingRows?.data.values || []).some((row) => row[0] === attendanceId);

            if (!alreadyInSheet) {
              await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                  values: [
                    [
                      attendanceId,
                      String(member.memberNumber),
                      String(member.fullName),
                      String(member.divisionName || member.divisionId),
                      wib.dateStr,
                      wib.isoWib,
                      status,
                      drivePhotoFileId,
                      scheduleName,
                    ],
                  ],
                },
              });
            }
            sheetsSyncStatus = 'SYNCED';
            await logIntegrationJob(
              'GOOGLE_SHEETS',
              'APPEND_ATTENDANCE',
              'SUCCESS',
              `Baris absensi ${attendanceId} tersinkron ke Google Sheets.`,
              authUser.idToken
            );
          }
        } catch (sheetErr) {
          sheetsSyncStatus = 'FAILED';
          await logIntegrationJob(
            'GOOGLE_SHEETS',
            'APPEND_ATTENDANCE',
            'FAILED',
            sheetErr instanceof Error ? sheetErr.message : String(sheetErr),
            authUser.idToken
          );
        }
      }

      const attendanceNotes =
        driveUploadStatus === 'UPLOADED'
          ? `Absensi diterima server pada ${wib.timeStr} WIB`
          : `Absensi diterima server pada ${wib.timeStr} WIB (Menunggu sinkronisasi Google Drive/Sheets via Admin atau Service Account)`;

      await fsSetDoc(
        'attendance',
        attendanceId,
        {
          memberId: String(memberId),
          memberAuthUid: authUser.uid,
          memberNumber: String(member.memberNumber),
          memberName: String(member.fullName),
          divisionId: String(member.divisionId),
          divisionName: String(member.divisionName || member.divisionId),
          dutyDate: wib.dateStr,
          dutySchedule: scheduleName,
          status,
          drivePhotoFileId,
          driveFileName,
          driveUploadStatus,
          sheetsSyncStatus,
          notes: attendanceNotes,
        },
        { idToken: authUser.idToken, serverTimestampFields: ['serverTimestamp', 'createdAt'] }
      );

      res.json({
        ok: true,
        attendanceId,
        status,
        dutyDate: wib.dateStr,
        serverTimeWib: wib.timeStr,
        drivePhotoFileId,
        driveUploadStatus,
        sheetsSyncStatus,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal mengirim absensi.',
      });
    }
  });

  // 7. Admin Attendance Correction + Audit Log + Google Sheets Update
  app.post('/api/admin/attendance/correct', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageAttendance'))) {
        res.status(403).json({ ok: false, message: 'Izin kelola absensi ditolak.' });
        return;
      }

      const { attendanceId, newStatus, notes } = req.body || {};
      if (!attendanceId || !['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'].includes(newStatus)) {
        res.status(400).json({ ok: false, message: 'ID absensi dan status baru yang valid wajib diisi.' });
        return;
      }

      const existing = await fsGetDoc('attendance', String(attendanceId), authUser.idToken);
      if (!existing) {
        res.status(404).json({ ok: false, message: 'Data absensi tidak ditemukan.' });
        return;
      }

      await fsSetDoc(
        'attendance',
        String(attendanceId),
        {
          status: newStatus,
          notes: String(notes || `Dikoreksi oleh ${authUser.email}`).slice(0, 500),
        },
        { idToken: authUser.idToken, merge: true }
      );

      await logAudit(
        authUser,
        'CORRECT_ATTENDANCE',
        'attendance',
        String(attendanceId),
        `Status diubah dari ${existing.status} menjadi ${newStatus}. Alasan: ${notes || '-'}`
      );

      // Update Google Sheet row if configured
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const spreadsheetId = String(
        intSettings?.googleSheetsSpreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
      ).trim();
      if (spreadsheetId) {
        try {
          const sheetsAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/spreadsheets']);
          if (sheetsAuth) {
            const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
            const range = String(intSettings?.googleSheetsRange || 'Absensi!A:I');
            const tab = range.split('!')[0] || 'Absensi';
            const colA = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:A` });
            const rowIndex = (colA.data.values || []).findIndex((r) => r[0] === attendanceId);
            if (rowIndex >= 0) {
              await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${tab}!G${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[newStatus]] },
              });
            }
          }
        } catch (err) {
          console.warn('Sheets correction update warning:', err);
        }
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Gagal mengoreksi absensi.' });
    }
  });

  // 8. Private Drive File Proxy (for attendance evidence photos & private documents)
  app.get('/api/drive/file/:fileId', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      const fileId = String(req.params.fileId || '').trim();
      if (!fileId) {
        res.status(400).json({ ok: false, message: 'fileId wajib diisi.' });
        return;
      }

      // If not admin, verify member owns an attendance record referencing this fileId
      if (!adminCtx) {
        const records = await fsListCollection('attendance', authUser.idToken, 100);
        const owns = records.some((r) => r.drivePhotoFileId === fileId && r.memberAuthUid === authUser.uid);
        if (!owns) {
          res.status(403).json({ ok: false, message: 'Akses file privat ditolak.' });
          return;
        }
      }

      const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive.readonly']);
      if (!driveAuth) {
        res.status(503).json({ ok: false, message: 'Koneksi Google Drive (OAuth atau Service Account) belum aktif.' });
        return;
      }

      const drive = google.drive({ version: 'v3', auth: driveAuth });
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name', supportsAllDrives: true });
      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=300');
      (streamRes.data as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Gagal memuat file Drive.' });
    }
  });

  // 9. Admin Drive Upload (Gallery, Documentation, Proposal/LPJ, Archive)
  app.post('/api/drive/upload', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx) {
        res.status(403).json({ ok: false, message: 'Hanya Admin yang dapat mengunggah file ke Drive organisasi.' });
        return;
      }

      const { categoryFolder, fileName, mimeType, fileBase64, isPublic = false } = req.body || {};
      if (!fileName || !mimeType || !fileBase64) {
        res.status(400).json({ ok: false, message: 'Nama file, tipe MIME, dan data file wajib diisi.' });
        return;
      }

      const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive']);
      if (!driveAuth) {
        res.status(503).json({
          ok: false,
          code: 'DRIVE_SETUP_REQUIRED',
          message: 'Silakan hubungkan akun Google Drive Admin (OAuth) atau konfigurasikan GOOGLE_SERVICE_ACCOUNT_JSON.',
        });
        return;
      }

      const rawBase64 = String(fileBase64).replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(rawBase64, 'base64');
      if (buf.length === 0 || buf.length > 8 * 1024 * 1024) {
        res.status(400).json({ ok: false, message: 'Ukuran file maksimal 8 MB.' });
        return;
      }

      const drive = google.drive({ version: 'v3', auth: driveAuth });
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const rootFolderId = extractGoogleResourceId(
        String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );
      const allowedFolders = [
        'DOKUMENTASI',
        'GALERI KEGIATAN',
        'PROPOSAL DAN LPJ',
        'ARSIP ORGANISASI',
        'ASET WEBSITE',
      ];
      const targetSub = allowedFolders.includes(categoryFolder) ? categoryFolder : 'ARSIP ORGANISASI';

      const targetFolderId = await getDriveFolderPath(drive, rootFolderId, ['PADMAWIJAYA 2026-2027', targetSub]);
      const { Readable } = await import('stream');
      const created = await drive.files.create({
        requestBody: {
          name: `${Date.now()}_${String(fileName)}`,
          parents: [targetFolderId],
        },
        media: {
          mimeType: String(mimeType),
          body: Readable.from(buf),
        },
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const fileId = created.data.id || '';
      if (isPublic && fileId) {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
        });
      }

      await logIntegrationJob(
        'GOOGLE_DRIVE',
        `UPLOAD_${targetSub}`,
        'SUCCESS',
        `Uploaded ${fileName} (${fileId})`,
        authUser.idToken
      );

      res.json({
        ok: true,
        fileId,
        imageUrl: isPublic && fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : '',
        webViewLink: isPublic ? created.data.webViewLink : `/api/drive/file/${fileId}`,
      });
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Gagal upload ke Google Drive.' });
    }
  });

  // 10. Integration Diagnostics & Manual Sync Endpoints
  app.get('/api/integrations/status', requireAuth, async (req, res) => {
    const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
    const adminCtx = await resolveAdminContext(authUser);
    if (!adminCtx) {
      res.status(403).json({ ok: false, message: 'Khusus Admin.' });
      return;
    }

    const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
    const folderId = extractGoogleResourceId(
      String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
      'folder'
    );
    const spreadsheetId = extractGoogleResourceId(
      String(intSettings?.googleSheetsSpreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''),
      'sheet'
    );

    const result: {
      serviceAccountConfigured: boolean;
      serviceAccountEmail: string | null;
      oauthConnected: boolean;
      firebaseAdminReady: boolean;
      driveAuthorized: boolean;
      driveFolderName: string | null;
      driveError: string | null;
      sheetsConfigured: boolean;
      sheetsAuthorized: boolean;
      sheetsTitle: string | null;
      sheetsTabs: string[];
      sheetsError: string | null;
    } = {
      serviceAccountConfigured: Boolean(serviceAccountCredentials),
      serviceAccountEmail: serviceAccountCredentials?.client_email || null,
      oauthConnected: Boolean(String(req.headers['x-google-access-token'] || '').trim()),
      firebaseAdminReady: Boolean(adminAuthInstance && adminDbInstance),
      driveAuthorized: false,
      driveFolderName: null,
      driveError: null,
      sheetsConfigured: Boolean(spreadsheetId),
      sheetsAuthorized: false,
      sheetsTitle: null,
      sheetsTabs: [],
      sheetsError: null,
    };

    const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive']);
    if (driveAuth) {
      try {
        const drive = google.drive({ version: 'v3', auth: driveAuth });
        const folderRes = await drive.files.get({
          fileId: folderId,
          fields: 'id, name',
          supportsAllDrives: true,
        });
        result.driveAuthorized = true;
        result.driveFolderName = folderRes.data.name || folderId;
      } catch (err) {
        result.driveError = err instanceof Error ? err.message : String(err);
      }
    } else {
      result.driveError =
        'Belum terhubung. Klik "Login Akun Google" dengan akun Google pemilik Drive/Sheet.';
    }

    if (spreadsheetId) {
      const sheetsAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/spreadsheets']);
      if (sheetsAuth) {
        try {
          const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
          const sheetMeta = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'properties.title,sheets.properties.title',
          });
          result.sheetsAuthorized = true;
          result.sheetsTitle = sheetMeta.data.properties?.title || spreadsheetId;
          result.sheetsTabs = (sheetMeta.data.sheets || [])
            .map((s) => s.properties?.title || '')
            .filter(Boolean);
        } catch (err) {
          result.sheetsError = err instanceof Error ? err.message : String(err);
        }
      } else {
        result.sheetsError = 'Klik "Login Akun Google" untuk mengizinkan akses ke Spreadsheet Anda.';
      }
    }

    res.json({ ok: true, ...result });
  });

  async function ensureRequiredSpreadsheetTabs(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    primaryTabName: string
  ) {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    });
    const title = meta.data.properties?.title || spreadsheetId;
    const existingTabs = new Set(
      (meta.data.sheets || []).map((s) => s.properties?.title || '').filter(Boolean)
    );

    const requiredTabs = Array.from(
      new Set([primaryTabName || 'Absensi', 'Data Anggota', 'Program Kerja'])
    );
    const missingTabs = requiredTabs.filter((t) => !existingTabs.has(t));

    if (missingTabs.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingTabs.map((tabTitle) => ({
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          })),
        },
      });
      missingTabs.forEach((t) => existingTabs.add(t));
    }

    return {
      title,
      createdTabs: missingTabs,
      allTabs: Array.from(existingTabs),
    };
  }

  async function syncAllTabsToSpreadsheet(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    range: string,
    idToken: string
  ) {
    const primaryTab = (range.split('!')[0] || 'Absensi').replace(/^'|'$/g, '');
    const tabInfo = await ensureRequiredSpreadsheetTabs(sheets, spreadsheetId, primaryTab);

    const existingRes = await sheets.spreadsheets.values
      .get({ spreadsheetId, range: `'${primaryTab}'!A:A` })
      .catch(() => ({ data: { values: [] as string[][] } }));

    const existingIds = new Set((existingRes.data.values || []).map((r) => r[0]));
    const [allAttendance, allMembers, allPrograms] = await Promise.all([
      fsListCollection('attendance', idToken, 500),
      fsListCollection('members', idToken, 500).catch(() => []),
      fsListCollection('programs', idToken, 500).catch(() => []),
    ]);

    const rowsToAppend: string[][] = [];
    if (existingIds.size === 0) {
      rowsToAppend.push([
        'Attendance ID',
        'Member Number',
        'Member Name',
        'Division',
        'Duty Date',
        'Server Timestamp',
        'Attendance Status',
        'Drive Photo File ID',
        'Duty Schedule',
      ]);
    }

    for (const rec of allAttendance) {
      const id = String(rec.id || '');
      if (id && !existingIds.has(id)) {
        rowsToAppend.push([
          id,
          String(rec.memberNumber || ''),
          String(rec.memberName || ''),
          String(rec.divisionName || ''),
          String(rec.dutyDate || ''),
          String(rec.serverTimestamp || ''),
          String(rec.status || ''),
          String(rec.drivePhotoFileId || ''),
          String(rec.dutySchedule || ''),
        ]);
      }
    }

    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${primaryTab}'!A:I`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToAppend },
      });
    }

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "'Data Anggota'!A:H" });
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "'Program Kerja'!A:G" });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Data Anggota'!A1",
            values: [
              [
                'Member ID',
                'Nomor Anggota',
                'Nama Lengkap',
                'Jabatan',
                'Divisi',
                'Status Aktif',
                'Jadwal Piket',
                'Hari Piket Gerbang',
              ],
              ...allMembers.map((m) => [
                String(m.id || ''),
                String(m.memberNumber || ''),
                String(m.fullName || ''),
                String(m.positionTitle || m.position || ''),
                String(m.divisionName || m.divisionId || ''),
                m.isActive === false ? 'NONAKTIF' : 'AKTIF',
                String(m.dutyScheduleId || 'piket-gerbang-pagi'),
                Array.isArray(m.dutyDays) && m.dutyDays.length > 0
                  ? m.dutyDays.join(', ')
                  : 'Semua Hari (Fleksibel)',
              ]),
            ],
          },
          {
            range: "'Program Kerja'!A1",
            values: [
              [
                'Program ID',
                'Nama Program Kerja',
                'Divisi',
                'Penanggung Jawab',
                'Target Tanggal',
                'Status',
                'Deskripsi',
              ],
              ...allPrograms.map((p) => [
                String(p.id || ''),
                String(p.name || p.title || ''),
                String(p.divisionName || p.divisionId || ''),
                String(p.personInCharge || ''),
                String(p.targetDate || ''),
                String(p.status || 'BELUM DIMULAI'),
                String(p.description || ''),
              ]),
            ],
          },
        ],
      },
    });

    return {
      title: tabInfo.title,
      createdTabs: tabInfo.createdTabs,
      allTabs: tabInfo.allTabs,
      syncedCount: rowsToAppend.length,
      membersSynced: allMembers.length,
      programsSynced: allPrograms.length,
    };
  }

  async function createMultiTabSpreadsheetAndSync(
    authClient: NonNullable<ReturnType<typeof getGoogleClientFromRequest>>,
    rootFolderId: string,
    idToken: string
  ) {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    const baseFolderId = await ensureDriveSubfolder(drive, rootFolderId, 'PADMAWIJAYA 2026-2027');
    const sheetTitle = 'PADMAWIJAYA 2026/2027 — Database Absensi & Organisasi';

    const createdSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: sheetTitle, timeZone: 'Asia/Jakarta', locale: 'id_ID' },
        sheets: [
          { properties: { title: 'Absensi', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Data Anggota', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Program Kerja', gridProperties: { frozenRowCount: 1 } } },
        ],
      },
      fields: 'spreadsheetId,spreadsheetUrl',
    });

    const spreadsheetId = createdSheet.data.spreadsheetId || '';
    const spreadsheetUrl =
      createdSheet.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    if (!spreadsheetId) {
      throw new Error('Gagal mendapatkan ID Spreadsheet baru.');
    }

    const fileMeta = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'parents',
      supportsAllDrives: true,
    });
    const prevParents = (fileMeta.data.parents || []).join(',');
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: baseFolderId,
      removeParents: prevParents || undefined,
      supportsAllDrives: true,
    });

    const [attendanceDocs, memberDocs, programDocs] = await Promise.all([
      fsListCollection('attendance', idToken, 500).catch(() => []),
      fsListCollection('members', idToken, 500).catch(() => []),
      fsListCollection('programs', idToken, 500).catch(() => []),
    ]);

    const attendanceValues: string[][] = [
      [
        'Attendance ID',
        'Member Number',
        'Member Name',
        'Division',
        'Duty Date',
        'Server Timestamp',
        'Attendance Status',
        'Drive Photo File ID',
        'Duty Schedule',
      ],
      ...attendanceDocs.map((rec) => [
        String(rec.id || ''),
        String(rec.memberNumber || ''),
        String(rec.memberName || ''),
        String(rec.divisionName || ''),
        String(rec.dutyDate || ''),
        String(rec.serverTimestamp || ''),
        String(rec.status || ''),
        String(rec.drivePhotoFileId || ''),
        String(rec.dutySchedule || ''),
      ]),
    ];

    const memberValues: string[][] = [
      [
        'Member ID',
        'Nomor Anggota',
        'Nama Lengkap',
        'Jabatan',
        'Divisi',
        'Status Aktif',
        'Jadwal Piket',
        'Hari Piket Gerbang',
      ],
      ...memberDocs.map((m) => [
        String(m.id || ''),
        String(m.memberNumber || ''),
        String(m.fullName || ''),
        String(m.positionTitle || m.position || ''),
        String(m.divisionName || m.divisionId || ''),
        m.isActive === false ? 'NONAKTIF' : 'AKTIF',
        String(m.dutyScheduleId || 'piket-gerbang-pagi'),
        Array.isArray(m.dutyDays) && m.dutyDays.length > 0 ? m.dutyDays.join(', ') : 'Semua Hari (Fleksibel)',
      ]),
    ];

    const programValues: string[][] = [
      ['Program ID', 'Nama Program Kerja', 'Divisi', 'Penanggung Jawab', 'Target Tanggal', 'Status', 'Deskripsi'],
      ...programDocs.map((p) => [
        String(p.id || ''),
        String(p.name || p.title || ''),
        String(p.divisionName || p.divisionId || ''),
        String(p.personInCharge || ''),
        String(p.targetDate || ''),
        String(p.status || 'BELUM DIMULAI'),
        String(p.description || ''),
      ]),
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Absensi!A1', values: attendanceValues },
          { range: "'Data Anggota'!A1", values: memberValues },
          { range: "'Program Kerja'!A1", values: programValues },
        ],
      },
    });

    await fsSetDoc(
      'websiteSettings',
      'integrations',
      {
        googleDriveFolderId: rootFolderId,
        googleDriveFolderUrl: `https://drive.google.com/drive/folders/${rootFolderId}`,
        googleSheetsSpreadsheetId: spreadsheetId,
        googleSheetsRange: 'Absensi!A:I',
        autoSyncAttendanceToSheets: true,
      },
      { idToken, merge: true }
    );

    return {
      spreadsheetId,
      spreadsheetUrl,
      title: sheetTitle,
      syncedCounts: {
        attendance: attendanceDocs.length,
        members: memberDocs.length,
        programs: programDocs.length,
      },
    };
  }

  app.post('/api/integrations/drive/initialize-folders', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || adminCtx.role !== 'SUPER_ADMIN') {
        res.status(403).json({ ok: false, message: 'Khusus Super Admin.' });
        return;
      }
      const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive']);
      if (!driveAuth) {
        res.status(503).json({
          ok: false,
          message: 'Klik "Hubungkan Google Drive & Sheets" terlebih dahulu atau setel GOOGLE_SERVICE_ACCOUNT_JSON.',
        });
        return;
      }
      const drive = google.drive({ version: 'v3', auth: driveAuth });
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const rootFolderId = extractGoogleResourceId(
        String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );
      const baseId = await ensureDriveSubfolder(drive, rootFolderId, 'PADMAWIJAYA 2026-2027');
      const subs = [
        'ABSENSI',
        'DOKUMENTASI',
        'GALERI KEGIATAN',
        'PROPOSAL DAN LPJ',
        'ARSIP ORGANISASI',
        'ASET WEBSITE',
      ];
      for (const s of subs) {
        await ensureDriveSubfolder(drive, baseId, s);
      }
      await logIntegrationJob('GOOGLE_DRIVE', 'INIT_FOLDERS', 'SUCCESS', '6 subfolder PADMAWIJAYA siap.', authUser.idToken);
      res.json({ ok: true, message: 'Struktur 6 folder Google Drive PADMAWIJAYA 2026-2027 berhasil disiapkan.' });
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Gagal inisialisasi folder Drive.' });
    }
  });

  // 1-Click Complete Setup: Create 6 Drive Subfolders + 3-Tab Spreadsheet + Initial Data Sync
  app.post('/api/integrations/bootstrap-all', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || adminCtx.role !== 'SUPER_ADMIN') {
        res.status(403).json({ ok: false, message: 'Khusus Super Admin.' });
        return;
      }

      const authClient = getGoogleClientFromRequest(req, [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
      ]);
      if (!authClient) {
        res.status(503).json({
          ok: false,
          message: 'Klik "Hubungkan Google Drive & Sheets" terlebih dahulu agar aplikasi mendapat izin membuat folder & Spreadsheet di Drive Anda.',
        });
        return;
      }

      const drive = google.drive({ version: 'v3', auth: authClient });
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const rootFolderId = extractGoogleResourceId(
        String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );

      const baseId = await ensureDriveSubfolder(drive, rootFolderId, 'PADMAWIJAYA 2026-2027');
      const subs = [
        'ABSENSI',
        'DOKUMENTASI',
        'GALERI KEGIATAN',
        'PROPOSAL DAN LPJ',
        'ARSIP ORGANISASI',
        'ASET WEBSITE',
      ];
      for (const s of subs) {
        await ensureDriveSubfolder(drive, baseId, s);
      }

      const sheetResult = await createMultiTabSpreadsheetAndSync(authClient, rootFolderId, authUser.idToken);

      await logIntegrationJob(
        'GOOGLE_DRIVE',
        'BOOTSTRAP_ALL',
        'SUCCESS',
        `6 subfolder + Spreadsheet ${sheetResult.spreadsheetId} dibuat & disinkronkan.`,
        authUser.idToken
      );
      await logAudit(
        authUser,
        'BOOTSTRAP_WORKSPACE',
        'websiteSettings',
        'integrations',
        `Created 6 Drive folders and 3-tab spreadsheet ${sheetResult.spreadsheetId}`
      );

      res.json({
        ok: true,
        ...sheetResult,
        range: 'Absensi!A:I',
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal menyiapkan Drive & Spreadsheet secara otomatis.',
      });
    }
  });

  // Create Multi-Tab Organization Google Spreadsheet automatically inside target Drive folder & save ID to Firestore
  app.post('/api/integrations/sheets/create-spreadsheet', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageAttendance'))) {
        res.status(403).json({ ok: false, message: 'Izin ditolak.' });
        return;
      }

      const authClient = getGoogleClientFromRequest(req, [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
      ]);
      if (!authClient) {
        res.status(503).json({
          ok: false,
          message: 'Klik "Hubungkan Google Drive & Sheets" terlebih dahulu agar aplikasi dapat membuat Spreadsheet di Drive Anda.',
        });
        return;
      }

      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const rootFolderId = extractGoogleResourceId(
        String(intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );
      const sheetResult = await createMultiTabSpreadsheetAndSync(authClient, rootFolderId, authUser.idToken);

      await logIntegrationJob(
        'GOOGLE_SHEETS',
        'CREATE_SPREADSHEET',
        'SUCCESS',
        `Spreadsheet "${sheetResult.title}" (${sheetResult.spreadsheetId}) dibuat otomatis di Drive.`,
        authUser.idToken
      );

      res.json({
        ok: true,
        ...sheetResult,
        range: 'Absensi!A:I',
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal membuat Google Spreadsheet secara otomatis.',
      });
    }
  });

  // Connect & Auto-Prepare an EXISTING Google Sheet (handles full URL or raw ID, creates missing tabs, initializes Drive folders if accessible, and syncs data)
  app.post('/api/integrations/sheets/connect-existing', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageAttendance'))) {
        res.status(403).json({ ok: false, message: 'Izin ditolak.' });
        return;
      }

      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const spreadsheetId = extractGoogleResourceId(
        String(req.body?.spreadsheetInput || intSettings?.googleSheetsSpreadsheetId || ''),
        'sheet'
      );
      const rootFolderId = extractGoogleResourceId(
        String(req.body?.folderInput || intSettings?.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID),
        'folder'
      );
      const range = String(req.body?.range || intSettings?.googleSheetsRange || 'Absensi!A:I').trim() || 'Absensi!A:I';

      if (!spreadsheetId) {
        res.status(400).json({
          ok: false,
          message: 'Tempel Link URL atau ID Google Sheet Anda terlebih dahulu.',
        });
        return;
      }

      const sheetsAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/spreadsheets']);
      if (!sheetsAuth) {
        res.status(503).json({
          ok: false,
          code: 'OAUTH_REQUIRED',
          message: 'Klik "Login Akun Google" terlebih dahulu untuk mengizinkan aplikasi mengisi Google Sheet Anda.',
        });
        return;
      }

      const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
      const syncResult = await syncAllTabsToSpreadsheet(sheets, spreadsheetId, range, authUser.idToken);

      // Optional Drive subfolder preparation in background-safe try/catch
      let driveInitialized = false;
      let driveWarning: string | null = null;
      const driveAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/drive']);
      if (driveAuth && rootFolderId) {
        try {
          const drive = google.drive({ version: 'v3', auth: driveAuth });
          const baseId = await ensureDriveSubfolder(drive, rootFolderId, 'PADMAWIJAYA 2026-2027');
          const subs = [
            'ABSENSI',
            'DOKUMENTASI',
            'GALERI KEGIATAN',
            'PROPOSAL DAN LPJ',
            'ARSIP ORGANISASI',
            'ASET WEBSITE',
          ];
          for (const s of subs) {
            await ensureDriveSubfolder(drive, baseId, s);
          }
          driveInitialized = true;
        } catch (driveErr) {
          driveWarning = driveErr instanceof Error ? driveErr.message : String(driveErr);
        }
      }

      await fsSetDoc(
        'websiteSettings',
        'integrations',
        {
          googleDriveFolderId: rootFolderId,
          googleDriveFolderUrl: `https://drive.google.com/drive/folders/${rootFolderId}`,
          googleSheetsSpreadsheetId: spreadsheetId,
          googleSheetsRange: range,
          autoSyncAttendanceToSheets: true,
        },
        { idToken: authUser.idToken, merge: true }
      );

      await logIntegrationJob(
        'GOOGLE_SHEETS',
        'CONNECT_EXISTING_SHEET',
        'SUCCESS',
        `Sheet "${syncResult.title}" (${spreadsheetId}) terhubung & disinkronkan (${syncResult.membersSynced} anggota, ${syncResult.programsSynced} proker).`,
        authUser.idToken
      );

      res.json({
        ok: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        folderId: rootFolderId,
        driveInitialized,
        driveWarning,
        ...syncResult,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal menghubungkan Google Sheet Anda.',
      });
    }
  });

  app.post('/api/integrations/sheets/sync', requireAuth, async (req, res) => {
    try {
      const authUser = (req as Request & { authUser: VerifiedUser }).authUser;
      const adminCtx = await resolveAdminContext(authUser);
      if (!adminCtx || (adminCtx.role !== 'SUPER_ADMIN' && !adminCtx.permissions.includes('manageAttendance'))) {
        res.status(403).json({ ok: false, message: 'Izin ditolak.' });
        return;
      }
      const sheetsAuth = getGoogleClientFromRequest(req, ['https://www.googleapis.com/auth/spreadsheets']);
      const intSettings = await fsGetDoc('websiteSettings', 'integrations', authUser.idToken).catch(() => null);
      const spreadsheetId = extractGoogleResourceId(
        String(intSettings?.googleSheetsSpreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''),
        'sheet'
      );

      if (!sheetsAuth || !spreadsheetId) {
        res.status(503).json({
          ok: false,
          message: 'Spreadsheet ID belum diatur atau akun Google Drive/Sheets belum terhubung.',
        });
        return;
      }

      const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
      const range = String(intSettings?.googleSheetsRange || 'Absensi!A:I');
      const syncResult = await syncAllTabsToSpreadsheet(sheets, spreadsheetId, range, authUser.idToken);

      await logIntegrationJob(
        'GOOGLE_SHEETS',
        'MANUAL_SYNC',
        'SUCCESS',
        `Sinkronisasi selesai (${syncResult.syncedCount} absensi baru, ${syncResult.membersSynced} anggota, ${syncResult.programsSynced} program kerja).`,
        authUser.idToken
      );

      res.json({ ok: true, ...syncResult });
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Gagal sinkronisasi Sheets.' });
    }
  });

  // 11. Public Music Request Submission (Rate-Limited, Schedule-Checked, Anti-Spam)
  app.post('/api/music-requests', async (req, res) => {
    try {
      const songTitle = String(req.body?.songTitle || '').trim();
      const artist = String(req.body?.artist || '').trim();
      const dedication = String(req.body?.dedication || '').trim();
      const senderName = String(req.body?.senderName || '').trim();

      if (!songTitle || songTitle.length > 120) {
        res.status(400).json({ ok: false, message: 'Judul lagu wajib diisi (maks. 120 karakter).' });
        return;
      }
      if (!artist || artist.length > 100) {
        res.status(400).json({ ok: false, message: 'Nama artis/penyanyi wajib diisi (maks. 100 karakter).' });
        return;
      }
      if (dedication.length > 280) {
        res.status(400).json({ ok: false, message: 'Pesan dedikasi maksimal 280 karakter.' });
        return;
      }
      if (senderName.length > 80) {
        res.status(400).json({ ok: false, message: 'Nama pengirim maksimal 80 karakter.' });
        return;
      }

      // Check operating schedule from Firestore websiteSettings/musicConfig
      const musicConfig = await fsGetDoc('websiteSettings', 'musicConfig').catch(() => null);
      const requestsEnabled = musicConfig?.requestsEnabled !== false;
      const manualOverride = String(musicConfig?.manualOverride || 'AUTO');
      const maxPerHour = Number(musicConfig?.maxRequestsPerHourPerClient ?? 3);

      if (!requestsEnabled || manualOverride === 'FORCE_CLOSED') {
        res.status(403).json({
          ok: false,
          message: 'Layanan Music Request sedang ditutup sementara oleh Admin OSIS.',
        });
        return;
      }

      if (manualOverride === 'AUTO') {
        const wib = getWibTimeParts();
        const w1Open = parseHhMmToMinutes(String(musicConfig?.openTimeWib || '09:30'), 9 * 60 + 30);
        const w1Close = parseHhMmToMinutes(String(musicConfig?.closeTimeWib || '10:00'), 10 * 60);
        const w2Open = parseHhMmToMinutes(String(musicConfig?.secondWindowOpenWib || '12:00'), 12 * 60);
        const w2Close = parseHhMmToMinutes(String(musicConfig?.secondWindowCloseWib || '12:45'), 12 * 60 + 45);
        const inW1 = wib.totalMinutes >= w1Open && wib.totalMinutes <= w1Close;
        const inW2 = wib.totalMinutes >= w2Open && wib.totalMinutes <= w2Close;

        if (!inW1 && !inW2) {
          res.status(403).json({
            ok: false,
            code: 'OUTSIDE_MUSIC_SCHEDULE',
            message: `Music Request dibuka pada jam istirahat (${musicConfig?.openTimeWib || '09:30'}–${musicConfig?.closeTimeWib || '10:00'} & ${musicConfig?.secondWindowOpenWib || '12:00'}–${musicConfig?.secondWindowCloseWib || '12:45'} WIB). Waktu saat ini: ${wib.timeStr} WIB.`,
          });
          return;
        }
      }

      // Rate limiting by client IP
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const nowMs = Date.now();
      const hourAgo = nowMs - 60 * 60 * 1000;
      const entry = musicRateLimitMap.get(ip) || { timestamps: [] };
      entry.timestamps = entry.timestamps.filter((t) => t > hourAgo);
      if (entry.timestamps.length >= maxPerHour) {
        res.status(429).json({
          ok: false,
          message: `Batas pengiriman tercapai (${maxPerHour} request per jam). Silakan coba lagi nanti.`,
        });
        return;
      }

      // Duplicate song cooldown (30 min)
      const fp = `${songTitle.toLowerCase()}::${artist.toLowerCase()}`;
      const lastSub = recentSongFingerprintMap.get(fp);
      if (lastSub && nowMs - lastSub < 30 * 60 * 1000) {
        res.status(409).json({
          ok: false,
          message: 'Lagu yang sama baru saja direquest dalam 30 menit terakhir.',
        });
        return;
      }

      const requestId = `mreq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload: Record<string, unknown> = {
        songTitle,
        artist,
        status: 'PENDING',
        isPublicDisplay: false,
      };
      if (dedication) payload.dedication = dedication;
      if (senderName) payload.senderName = senderName;

      await fsSetDoc('musicRequests', requestId, payload, {
        serverTimestampFields: ['createdAt', 'updatedAt'],
      });

      entry.timestamps.push(nowMs);
      musicRateLimitMap.set(ip, entry);
      recentSongFingerprintMap.set(fp, nowMs);

      res.json({
        ok: true,
        requestId,
        status: 'PENDING',
        message: 'Request lagu berhasil dikirim dan menunggu moderasi Admin Sekbid Media.',
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal mengirim music request.',
      });
    }
  });

  // Vite Dev Middleware or Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  const PORT =
    process.env.NODE_ENV !== 'production'
      ? Number(process.env.DEFAULT_APP_PORT || 3000)
      : Number(
          process.env.PORT && process.env.PORT !== process.env.NGINX_PORT
            ? process.env.PORT
            : process.env.DEFAULT_APP_PORT || 3000
        );
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PADMAWIJAYA 2026/2027 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
