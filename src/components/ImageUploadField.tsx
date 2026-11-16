import React, { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, CloudUpload, Image as ImageIcon } from 'lucide-react';
import { apiRequest, compressImageFileToBase64 } from '../lib/apiClient';
import { getWorkspaceAccessToken } from '../lib/firebase';

export type DriveImageFolder =
  | 'ASET WEBSITE'
  | 'DOKUMENTASI'
  | 'GALERI KEGIATAN'
  | 'ARSIP ORGANISASI';

export const ImageUploadField: React.FC<{
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  onNotify?: (type: 'success' | 'error', msg: string) => void;
  driveFolder?: DriveImageFolder;
  maxWidth?: number;
  quality?: number;
  aspectClass?: string;
  placeholder?: string;
  required?: boolean;
}> = ({
  label,
  value,
  onChange,
  onNotify,
  driveFolder = 'DOKUMENTASI',
  maxWidth = 960,
  quality = 0.78,
  aspectClass = 'w-20 h-20',
  placeholder = 'Upload gambar dari perangkat atau tempel URL...',
  required = false,
}) => {
  const [processing, setProcessing] = useState(false);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);
  const driveInputRef = useRef<HTMLInputElement | null>(null);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProcessing(true);
    try {
      const comp = await compressImageFileToBase64(file, maxWidth, quality, true);
      if (comp.sizeBytes > 450 * 1024) {
        const tighter = await compressImageFileToBase64(file, Math.min(720, maxWidth), 0.65, true);
        onChange(tighter.base64);
      } else {
        onChange(comp.base64);
      }
      onNotify?.('success', `Gambar "${file.name}" berhasil dimuat & siap disimpan.`);
    } catch (err) {
      onNotify?.('error', err instanceof Error ? err.message : 'Gagal memproses gambar.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDriveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDrive(true);
    try {
      const comp = await compressImageFileToBase64(file, 1400, 0.85, true);
      const res = await apiRequest<{
        ok: boolean;
        fileId: string;
        imageUrl?: string;
        webViewLink: string;
      }>('/api/drive/upload', {
        method: 'POST',
        body: {
          categoryFolder: driveFolder,
          fileName: file.name,
          mimeType: comp.mimeType,
          fileBase64: comp.base64,
          isPublic: true,
        },
      });
      onChange(res.imageUrl || `https://lh3.googleusercontent.com/d/${res.fileId}`);
      onNotify?.('success', `Gambar diunggah ke Google Drive (${driveFolder}).`);
    } catch (err) {
      // Fall back cleanly if Drive is not connected yet? No — tell user clearly or keep local option prominent
      onNotify?.(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal unggah ke Drive. Gunakan tombol "Upload Gambar" langsung atau hubungkan Google Drive di Tab 14.'
      );
    } finally {
      setUploadingDrive(false);
    }
  };

  const safeValue = typeof value === 'string' ? value : '';
  const driveReady = Boolean(getWorkspaceAccessToken());

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold block">{label}</label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528]">
        {/* Preview Thumbnail */}
        <div
          className={`${aspectClass} rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#152544] overflow-hidden shrink-0 flex items-center justify-center`}
        >
          {safeValue ? (
            <img
              src={safeValue}
              alt={label}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* Upload Actions + URL Fallback */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={deviceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleLocalUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => deviceInputRef.current?.click()}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#16345E] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] text-white text-xs font-semibold disabled:opacity-60"
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{processing ? 'Memproses...' : 'Upload Gambar'}</span>
            </button>

            <input
              ref={driveInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleDriveUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => driveInputRef.current?.click()}
              disabled={uploadingDrive}
              title={
                driveReady
                  ? `Unggah ke Google Drive (${driveFolder})`
                  : 'Membutuhkan koneksi Google Drive di Tab 14 atau Service Account'
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              {uploadingDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
              )}
              <span>{uploadingDrive ? 'Mengunggah...' : 'Upload ke Drive'}</span>
            </button>

            {safeValue && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          <input
            type="text"
            required={required && !safeValue}
            value={safeValue.startsWith('data:image/') ? '' : safeValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              safeValue.startsWith('data:image/')
                ? 'Gambar terupload siap disimpan (atau tempel URL untuk mengganti)'
                : placeholder
            }
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1D36] text-xs"
          />
        </div>
      </div>
    </div>
  );
};
