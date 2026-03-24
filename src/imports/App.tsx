import { UploadZone } from './components/file-converter/UploadZone';
import { FileCard } from './components/file-converter/FileCard';
import { ProgressBar } from './components/file-converter/ProgressBar';
import { Toolbar } from './components/file-converter/Toolbar';
import { PreviewModal } from './components/file-converter/PreviewModal';
import { GlobalFormatSelector } from './components/file-converter/GlobalFormatSelector';
import { UploadedFile } from './components/file-converter/types';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { toast, Toaster } from 'sonner';

export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [globalFromFormat, setGlobalFromFormat] = useState<string>('');
  const [globalToFormat, setGlobalToFormat] = useState<string>('');

  // Handle file selection
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const newFiles: UploadedFile[] = await Promise.all(
      selectedFiles.map(async (file) => {
        const type = getFileType(file);
        const currentFormat = getCurrentFileFormat(file);
        const preview = await createFilePreview(file, type);

        return {
          id: generateUniqueId(),
          file,
          name: file.name,
          size: file.size,
          type,
          currentFormat: currentFormat || undefined,
          preview,
          status: 'idle' as const,
          progress: 0,
        };
      })
    );

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} added`);
  }, []);

  // Handle format change for a file
  const handleFormatChange = useCallback((fileId: string, format: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, targetFormat: format } : f
      )
    );
  }, []);

  // Convert a single file
  const handleConvertFile = useCallback(async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file || !file.targetFormat) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'converting', progress: 0 } : f
      )
    );

    const result = await convertFile(file, (progress) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress } : f
        )
      );
    });

    if (result.success) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                convertedBlob: result.blob,
              }
            : f
        )
      );
      toast.success(`${file.name} converted successfully!`);
      
      // Trigger confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: result.error,
              }
            : f
        )
      );
      toast.error(`Failed to convert ${file.name}`);
    }
  }, [files]);

  // Convert all files
  const handleConvertAll = useCallback(async () => {
    const filesToConvert = files.filter(
      (f) => f.status === 'idle' && f.targetFormat
    );

    if (filesToConvert.length === 0) {
      toast.error('Please select formats for all files first');
      return;
    }

    setIsConverting(true);
    setGlobalProgress(0);

    for (let i = 0; i < filesToConvert.length; i++) {
      await handleConvertFile(filesToConvert[i].id);
      setGlobalProgress(((i + 1) / filesToConvert.length) * 100);
    }

    setIsConverting(false);
    setGlobalProgress(100);
    
    toast.success('All files converted!');
    
    // Big confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    
    setTimeout(() => setGlobalProgress(0), 2000);
  }, [files, handleConvertFile]);

  // View a file in preview modal
  const handleViewFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file || !file.convertedBlob) return;

      setPreviewFile(file);
      setIsPreviewOpen(true);
    },
    [files]
  );

  // Download a single file
  const handleDownloadFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file || !file.convertedBlob || !file.targetFormat) return;

      downloadFile(file.convertedBlob, file.name, file.targetFormat);
      toast.success(`Downloaded ${file.name}`);
    },
    [files]
  );

  // Download all completed files as ZIP
  const handleDownloadAll = useCallback(async () => {
    const completedFiles = files.filter(
      (f) => f.status === 'completed' && f.convertedBlob && f.targetFormat
    );

    if (completedFiles.length === 0) return;

    const zip = new JSZip();

    completedFiles.forEach((file) => {
      if (file.convertedBlob && file.targetFormat) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const newFileName = `${nameWithoutExt}.${file.targetFormat}`;
        zip.file(newFileName, file.convertedBlob);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-files-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('All files downloaded as ZIP!');
  }, [files]);

  // Remove a single file
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.info('File removed');
  }, []);

  // Clear all files
  const handleClearAll = useCallback(() => {
    setFiles([]);
    setGlobalProgress(0);
    toast.info('All files cleared');
  }, []);

  // Retry conversion
  const handleRetry = useCallback(
    (fileId: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'idle', progress: 0, error: undefined }
            : f
        )
      );
      handleConvertFile(fileId);
    },
    [handleConvertFile]
  );

  // Apply global format to all matching files
  const handleApplyGlobalFormat = useCallback(() => {
    if (!globalFromFormat || !globalToFormat) return;

    const updatedCount = files.filter(
      (f) => f.currentFormat?.toLowerCase() === globalFromFormat.toLowerCase() && f.status === 'idle'
    ).length;

    if (updatedCount === 0) {
      toast.error(`No files with .${globalFromFormat} format found`);
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.currentFormat?.toLowerCase() === globalFromFormat.toLowerCase() && f.status === 'idle'
          ? { ...f, targetFormat: globalToFormat }
          : f
      )
    );

    toast.success(`Applied .${globalToFormat} format to ${updatedCount} file${updatedCount > 1 ? 's' : ''}`);
  }, [globalFromFormat, globalToFormat, files]);

  // Calculate stats
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const canConvertAll = files.some((f) => f.status === 'idle' && f.targetFormat);
  const canDownloadAll = completedCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Toaster position="top-right" />
      
      {/* Global Progress Bar */}
      <AnimatePresence>
        {globalProgress > 0 && globalProgress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <ProgressBar progress={globalProgress} status="converting" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">
              Fast & Secure File Conversion
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Convert Files Instantly
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload, convert, and download in seconds. Support for images, videos, audio, and documents.
          </p>
        </motion.div>

        {/* Global Format Selector - shown when files are uploaded */}
        {files.length > 0 && (
          <div className="mb-8">
            <GlobalFormatSelector
              fromFormat={globalFromFormat}
              toFormat={globalToFormat}
              onFromFormatChange={setGlobalFromFormat}
              onToFormatChange={setGlobalToFormat}
              onApply={handleApplyGlobalFormat}
              fileCount={files.length}
              disabled={isConverting}
            />
          </div>
        )}

        {/* Upload Zone */}
        {files.length === 0 && (
          <div className="max-w-3xl mx-auto mb-12">
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isConverting}
            />
          </div>
        )}

        {/* Files Grid */}
        {files.length > 0 && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Files ({files.length})
                </h2>
                <button
                  onClick={() => handleFilesSelected([])}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  + Add More Files
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                <div className="grid gap-4">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onFormatChange={handleFormatChange}
                      onConvert={handleConvertFile}
                      onDownload={handleDownloadFile}
                      onRemove={handleRemoveFile}
                      onRetry={handleRetry}
                      onView={handleViewFile}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>

            {/* Additional Upload Zone */}
            <div className="max-w-3xl mx-auto mb-24">
              <UploadZone
                onFilesSelected={handleFilesSelected}
                disabled={isConverting}
              />
            </div>
          </>
        )}

        {/* Toolbar */}
        <Toolbar
          fileCount={files.length}
          completedCount={completedCount}
          isConverting={isConverting}
          canConvertAll={canConvertAll}
          canDownloadAll={canDownloadAll}
          onConvertAll={handleConvertAll}
          onDownloadAll={handleDownloadAll}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewFile && (
        <PreviewModal
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onDownload={() => handleDownloadFile(previewFile.id)}
        />
      )}
    </div>
  );
}