import { FileType, UploadedFile, ConversionResult } from './types';
import { toast } from 'sonner';

// Generate unique ID
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const ARCHIVE_EXTS = new Set([
  'zip','7z','rar','tar','gz','bz2','xz','lz','lzma','lzo','zst',
  'tgz','tbz','txz','cab','iso','dmg','img','jar','ace','arj','arc',
]);
const SPREADSHEET_EXTS = new Set(['xlsx','xls','xlsm','ods','csv','tsv','et','numbers']);
const PRESENTATION_EXTS = new Set(['pptx','ppt','pptm','odp','key']);

// Get file type based on extension + MIME type
export function getFileType(file: File): FileType {
  const mime = file.type.toLowerCase();
  const ext  = (file.name.split('.').pop() ?? '').toLowerCase();

  if (mime.startsWith('image/') || mime === 'image/heic') return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';

  if (ARCHIVE_EXTS.has(ext) || mime.includes('zip') || mime.includes('x-tar') ||
      mime.includes('x-rar') || mime.includes('x-7z') || mime.includes('x-compressed')) {
    return 'archive';
  }
  if (SPREADSHEET_EXTS.has(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
    return 'spreadsheet';
  }
  if (PRESENTATION_EXTS.has(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return 'presentation';
  }
  if (
    mime.includes('pdf') || mime.includes('document') || mime.includes('text') ||
    mime.includes('word') || mime.includes('opendocument')
  ) {
    return 'document';
  }

  return 'other';
}

// Get current file format (extension)
export function getCurrentFileFormat(file: File): string | null {
  const parts = file.name.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return null;
}

// Create file preview
export async function createFilePreview(
  file: File,
  type: FileType
): Promise<string | undefined> {
  if (type === 'image') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }
  
  if (type === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL());
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(undefined);
      };
      video.src = URL.createObjectURL(file);
    });
  }
  
  return undefined;
}

const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'https://image-backend-lslc.onrender.com').replace(/\/+$/, '');

/** Fire-and-forget ping to wake the backend up (call on app mount).
 *  Uses no-cors so it doesn't throw CORS errors in the console during cold start. */
export function warmUpBackend(): void {
  fetch(`${API_BASE_URL}/health`, { mode: 'no-cors' }).catch(() => {});
}

export async function convertFile(
  uploadedFile: UploadedFile,
  onProgress: (progress: number) => void
): Promise<ConversionResult> {
  const { file, targetFormat } = uploadedFile;

  if (!targetFormat) {
    return { success: false, error: 'No target format specified' };
  }

  try {
    onProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', targetFormat);

    onProgress(30);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/convert`, { method: 'POST', body: formData });
    } catch {
      // Backend is cold-starting (Render free tier). Poll until alive, then retry.
      // We use no-cors pings to avoid CORS console errors, then confirm with a real request.
      toast.loading('Server is waking up… please wait (~30 s)', { id: 'wakeup' });
      let awake = false;
      for (let i = 1; i <= 18; i++) {
        onProgress(10 + i * 2); // 12 → 46 % while waiting
        await new Promise(r => setTimeout(r, 5000));
        // no-cors ping just to prod Render into waking up (no CORS error spam)
        fetch(`${API_BASE_URL}/health`, { mode: 'no-cors' }).catch(() => {});
        // Real check with CORS — succeeds only once the actual app is running
        try {
          const h = await fetch(`${API_BASE_URL}/health`);
          if (h.ok) { awake = true; break; }
        } catch { /* still starting */ }
      }
      toast.dismiss('wakeup');
      if (!awake) {
        return { success: false, error: 'Server did not respond after 90 s. Please try again in a moment.' };
      }
      // Rebuild formData (consumed by first attempt) and retry
      const fd2 = new FormData();
      fd2.append('file', file);
      fd2.append('target_format', targetFormat);
      response = await fetch(`${API_BASE_URL}/api/convert`, { method: 'POST', body: fd2 });
    }

    onProgress(80);

    if (!response.ok) {
      let errorMsg = `Conversion failed (HTTP ${response.status})`;
      try {
        const errData = await response.json() as { detail?: string };
        if (errData.detail) errorMsg = errData.detail;
      } catch { /* ignore */ }
      return { success: false, error: errorMsg };
    }

    const blob = await response.blob();
    onProgress(100);
    return { success: true, blob };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

// Download file
export function downloadFile(blob: Blob, originalName: string, targetFormat: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Replace the file extension with the target format
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  a.download = `${nameWithoutExt}.${targetFormat}`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get suggested formats for a file type (used as hint, FormatPicker shows all)
export function getSupportedFormats(type: FileType): string[] {
  const formats: Record<FileType, string[]> = {
    image:        ['jpg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'tiff', 'avif'],
    video:        ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'ogv', 'mpg'],
    audio:        ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'aiff'],
    document:     ['pdf', 'docx', 'txt', 'rtf', 'odt', 'html', 'csv'],
    archive:      ['zip', 'tar', 'tar.gz', 'tar.bz2', '7z'],
    spreadsheet:  ['xlsx', 'csv', 'ods', 'pdf', 'txt'],
    presentation: ['pptx', 'pdf', 'txt'],
    other:        ['jpg', 'png', 'pdf', 'docx', 'mp4', 'mp3', 'zip'],
  };
  return formats[type] ?? [];
}
