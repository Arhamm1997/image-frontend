import { UploadZone } from './components/file-converter/UploadZone';
import { FileCard } from './components/file-converter/FileCard';
import { ProgressBar } from './components/file-converter/ProgressBar';
import { Toolbar } from './components/file-converter/Toolbar';
import { PreviewModal } from './components/file-converter/PreviewModal';
import { GlobalFormatSelector } from './components/file-converter/GlobalFormatSelector';
import { UploadedFile } from './components/file-converter/types';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, ImageIcon, Film, Music, FileText,
  Zap, Shield, Package, Star, Upload, Settings2,
  Download, CheckCircle2, ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { toast, Toaster } from 'sonner';
import {
  getFileType,
  getCurrentFileFormat,
  createFilePreview,
  generateUniqueId,
  convertFile,
  downloadFile,
} from './components/file-converter/utils';

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
    if (!globalToFormat) return;

    let matchingFiles;
    let updatedCount;

    // If "all" is selected, apply to all idle files
    if (globalFromFormat === 'all') {
      matchingFiles = files.filter((f) => f.status === 'idle');
      updatedCount = matchingFiles.length;

      if (updatedCount === 0) {
        toast.error('No idle files to convert');
        return;
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'idle'
            ? { ...f, targetFormat: globalToFormat }
            : f
        )
      );

      toast.success(`Applied .${globalToFormat} format to ${updatedCount} file${updatedCount > 1 ? 's' : ''}`);
    } else if (globalFromFormat) {
      // Apply to files matching the specific format
      matchingFiles = files.filter(
        (f) => f.currentFormat?.toLowerCase() === globalFromFormat.toLowerCase() && f.status === 'idle'
      );
      updatedCount = matchingFiles.length;

      if (updatedCount === 0) {
        toast.error(`No idle files with .${globalFromFormat} format found`);
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
    }
  }, [globalFromFormat, globalToFormat, files]);

  // Calculate stats
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const canConvertAll = files.some((f) => f.status === 'idle' && f.targetFormat);
  const canDownloadAll = completedCount > 0;

  // Get unique file formats from uploaded files for the global selector
  const availableFormats = Array.from(
    new Set(
      files
        .map(f => f.currentFormat)
        .filter((format): format is string => format !== undefined)
    )
  ).sort();

  // Get file types for intelligent format selection
  const fileTypes = Array.from(new Set(files.map(f => f.type)));

  // Auto-detect source format when all uploaded files share the same format
  useEffect(() => {
    if (availableFormats.length === 1) {
      setGlobalFromFormat(availableFormats[0]);
    } else if (availableFormats.length === 0) {
      setGlobalFromFormat('');
      setGlobalToFormat('');
    }
  }, [availableFormats]);

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

      {/* Author badge — top right */}
      <div className="fixed top-4 right-4 z-40">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white/60">
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">A</span>
          <span className="text-xs font-semibold text-gray-700">by Arham</span>
        </div>
      </div>

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
              availableFormats={availableFormats}
              fileTypes={fileTypes}
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
                <label className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                  + Add More Files
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      if (newFiles.length > 0) {
                        handleFilesSelected(newFiles);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt"
                  />
                </label>
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

        {/* ── How to Use ─────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-24 mb-16"
        >
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full mb-3">
              Simple as 1-2-3
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              Convert any file in four easy steps — no account, no limits, no fuss.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01', icon: Upload, color: 'text-blue-600',
                bg: 'bg-blue-50', border: 'border-blue-100',
                title: 'Upload Your File',
                desc: 'Drag & drop files onto the upload zone or click to browse. Supports up to 500 MB per file.',
              },
              {
                num: '02', icon: Settings2, color: 'text-purple-600',
                bg: 'bg-purple-50', border: 'border-purple-100',
                title: 'Choose Target Format',
                desc: 'Pick the format you want from the dropdown. Use Batch Convert to apply one format to many files at once.',
              },
              {
                num: '03', icon: Zap, color: 'text-orange-600',
                bg: 'bg-orange-50', border: 'border-orange-100',
                title: 'Convert',
                desc: 'Hit Convert. Your file is processed securely on the server using professional-grade libraries.',
              },
              {
                num: '04', icon: Download, color: 'text-green-600',
                bg: 'bg-green-50', border: 'border-green-100',
                title: 'Download',
                desc: 'Download your converted file instantly, or grab all files together as a ZIP archive.',
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line between steps */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%-12px)] w-6 z-10">
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className={`h-full rounded-2xl border ${step.border} ${step.bg} p-6 flex flex-col gap-3`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${step.color} opacity-50`}>{step.num}</span>
                    <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center`}>
                      <step.icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-32"
        >
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-3">
              Capabilities
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything You Need</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              One tool for every file type — images, video, audio, and documents all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: ImageIcon,
                gradient: 'from-sky-500 to-blue-600',
                title: 'Image Conversion',
                desc: 'JPG, PNG, WebP, GIF, BMP, ICO, TIFF, AVIF, SVG — any combination.',
                tags: ['JPG', 'PNG', 'WebP', 'GIF', 'AVIF'],
              },
              {
                icon: Film,
                gradient: 'from-red-500 to-rose-600',
                title: 'Video Conversion',
                desc: 'Re-encode videos or extract audio tracks with FFmpeg quality.',
                tags: ['MP4', 'WebM', 'AVI', 'MOV', 'MKV'],
              },
              {
                icon: Music,
                gradient: 'from-green-500 to-emerald-600',
                title: 'Audio Conversion',
                desc: 'Convert between all major audio formats with tuned codec settings.',
                tags: ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'],
              },
              {
                icon: FileText,
                gradient: 'from-amber-500 to-orange-600',
                title: 'Document Conversion',
                desc: 'Spreadsheets, Word docs, PDFs, presentations and more.',
                tags: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT'],
              },
              {
                icon: Zap,
                gradient: 'from-violet-500 to-purple-600',
                title: 'Batch Convert',
                desc: 'Apply the same conversion to dozens of files in one click with auto-detection.',
                tags: ['Multi-file', 'Auto-detect', 'One click'],
              },
              {
                icon: Shield,
                gradient: 'from-teal-500 to-cyan-600',
                title: 'Private & Secure',
                desc: 'Files are processed in memory and never stored on disk or shared.',
                tags: ['No storage', 'Encrypted', 'Private'],
              },
              {
                icon: Package,
                gradient: 'from-pink-500 to-fuchsia-600',
                title: 'ZIP Download',
                desc: 'Converted files can be downloaded individually or bundled as a single ZIP.',
                tags: ['ZIP bundle', 'Bulk download'],
              },
              {
                icon: Star,
                gradient: 'from-yellow-400 to-amber-500',
                title: 'Free & No Sign-up',
                desc: 'No account needed, no watermarks, no file size tricks — completely free.',
                tags: ['100% Free', 'No account', 'Unlimited'],
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-sm`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {feature.tags.map(tag => (
                    <span key={tag} className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom reassurance row */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            {[
              { icon: CheckCircle2, text: 'No watermarks' },
              { icon: CheckCircle2, text: 'No file size tricks' },
              { icon: CheckCircle2, text: 'No account required' },
              { icon: CheckCircle2, text: 'Files never stored' },
              { icon: CheckCircle2, text: '500 MB per file' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-green-500" />
                {text}
              </span>
            ))}
          </div>
        </motion.section>

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