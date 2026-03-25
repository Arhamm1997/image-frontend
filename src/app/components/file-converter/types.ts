export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'spreadsheet' | 'presentation' | 'other';

export type FileStatus = 'idle' | 'converting' | 'completed' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: FileType;
  currentFormat?: string;
  targetFormat?: string;
  preview?: string;
  status: FileStatus;
  progress: number;
  convertedBlob?: Blob;
  error?: string;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}
