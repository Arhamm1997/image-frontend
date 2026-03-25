import { FileType, UploadedFile, ConversionResult } from './types';

// Generate unique ID
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get file type based on MIME type
export function getFileType(file: File): FileType {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('x-compressed') || mimeType === 'application/octet-stream' && file.name.toLowerCase().endsWith('.zip')) return 'other';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
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
      // Backend is sleeping (Render free tier). Poll /health until it wakes, then retry.
      let awake = false;
      for (let i = 1; i <= 8; i++) {
        onProgress(10 + i * 3); // 13 → 34% while waiting
        await new Promise(res => setTimeout(res, 5000));
        try {
          const h = await fetch(`${API_BASE_URL}/health`);
          if (h.ok) { awake = true; break; }
        } catch { /* still starting */ }
      }
      if (!awake) {
        return { success: false, error: 'Server did not respond after 40 s. Please try again.' };
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

// Get supported formats for file type
export function getSupportedFormats(type: FileType): string[] {
  const formats: Record<FileType, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'tiff', 'avif'],
    video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'],
    document: ['pdf', 'docx', 'txt', 'xlsx', 'xls', 'csv', 'rtf'],
    other: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'docx', 'xlsx', 'txt', 'mp4', 'mp3'],
  };
  
  return formats[type] || [];
}
