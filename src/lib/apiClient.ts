import { auth, getWorkspaceAccessToken } from './firebase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  const googleToken = getWorkspaceAccessToken();
  if (googleToken) {
    headers['X-Google-Access-Token'] = googleToken;
  }
  return headers;
}

export async function apiRequest<T = Record<string, unknown>>(
  url: string,
  options: { method?: string; body?: unknown; requireAuth?: boolean } = {}
): Promise<T> {
  const headers = options.requireAuth !== false ? await getAuthHeaders() : { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method: options.method || 'POST',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; message?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.message || `Permintaan gagal (${res.status})`) as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchPrivateDriveFileUrl(fileId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Login diperlukan untuk melihat file privat.');
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const googleToken = getWorkspaceAccessToken();
  if (googleToken) {
    headers['X-Google-Access-Token'] = googleToken;
  }
  const res = await fetch(`/api/drive/file/${encodeURIComponent(fileId)}`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Gagal memuat file dari Google Drive.');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Client-side image validation & compression (strips EXIF and resizes oversized phone gallery photos)
export async function compressImageFileToBase64(
  file: File,
  maxWidth = 1280,
  quality = 0.8,
  allowWebp = true
): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png'; sizeBytes: number }> {
  const validTypes = allowWebp
    ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    : ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error(
      allowWebp
        ? 'Format file tidak didukung. Pilih gambar berformat JPG, JPEG, PNG, atau WEBP.'
        : 'Format file tidak didukung. Pilih foto berformat JPG, JPEG, atau PNG.'
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Ukuran file asli terlalu besar (maksimal 15 MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        let targetWidth = img.width;
        let targetHeight = img.height;
        if (targetWidth > maxWidth) {
          targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
          targetWidth = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses gambar di browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const outMime = file.type.toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outMime, outMime === 'image/jpeg' ? quality : undefined);
        const base64Length = dataUrl.split(',')[1]?.length || 0;
        const estimatedBytes = Math.round((base64Length * 3) / 4);
        resolve({
          base64: dataUrl,
          mimeType: outMime,
          sizeBytes: estimatedBytes,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
