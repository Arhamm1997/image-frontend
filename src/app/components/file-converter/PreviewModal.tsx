import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText } from 'lucide-react';
import { UploadedFile } from './types';
import { useEffect, useState } from 'react';

interface PreviewModalProps {
  file: UploadedFile;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

const TEXT_FORMATS = ['txt', 'csv', 'rtf'];
const XML_DOC_FORMATS = ['docx', 'pptx'];

// Extract readable text from a DOCX blob (DOCX = ZIP of XML files)
async function extractDocxText(blob: Blob): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const ab = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) return '[Could not read document content]';

  const xmlStr = await xmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
  const wNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(wNS, 'p'));

  return paragraphs
    .map(para => {
      const runs = Array.from(para.getElementsByTagNameNS(wNS, 't'));
      return runs.map(t => t.textContent ?? '').join('');
    })
    .join('\n');
}

// Extract slide text from a PPTX blob
async function extractPptxText(blob: Blob): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const ab = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);

  const slideNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const n = (s: string) => parseInt(s.match(/\d+/)?.[0] ?? '0');
      return n(a) - n(b);
    });

  const parts: string[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xmlFile = zip.file(slideNames[i]);
    if (!xmlFile) continue;
    const xmlStr = await xmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const aNS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const texts = Array.from(xmlDoc.getElementsByTagNameNS(aNS, 't'))
      .map(t => t.textContent ?? '')
      .filter(t => t.trim());
    if (texts.length) parts.push(`── Slide ${i + 1} ──\n${texts.join(' ')}`);
  }

  return parts.join('\n\n') || '[No text found in presentation]';
}

export function PreviewModal({ file, isOpen, onClose, onDownload }: PreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docText, setDocText] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Load plain text blobs
  useEffect(() => {
    const fmt = file.targetFormat?.toLowerCase() ?? '';
    if (isOpen && file.convertedBlob && TEXT_FORMATS.includes(fmt)) {
      file.convertedBlob.text().then(setTextContent);
    } else {
      setTextContent(null);
    }
  }, [isOpen, file.convertedBlob, file.targetFormat]);

  // Extract text from DOCX / PPTX using JSZip
  useEffect(() => {
    const fmt = file.targetFormat?.toLowerCase() ?? '';
    if (!isOpen || !file.convertedBlob || !XML_DOC_FORMATS.includes(fmt)) {
      setDocText(null);
      return;
    }
    setDocLoading(true);
    setDocText(null);
    const extractor = fmt === 'pptx' ? extractPptxText : extractDocxText;
    extractor(file.convertedBlob)
      .then(setDocText)
      .catch(() => setDocText(null))
      .finally(() => setDocLoading(false));
  }, [isOpen, file.convertedBlob, file.targetFormat]);

  if (!file.convertedBlob) return null;

  const previewUrl = URL.createObjectURL(file.convertedBlob);
  const convertedName = file.targetFormat
    ? file.name.replace(/\.[^/.]+$/, '') + '.' + file.targetFormat
    : file.name;

  const renderPreview = () => {
    const fmt = file.targetFormat?.toLowerCase() ?? '';

    switch (file.type) {
      case 'image':
        return (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        );
      case 'video':
        return (
          <video src={previewUrl} controls className="max-w-full max-h-[70vh] rounded-lg" />
        );
      case 'audio':
        return (
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-12 rounded-lg">
            <audio src={previewUrl} controls className="w-full" />
          </div>
        );
      case 'document': {
        // PDF — render inline
        if (fmt === 'pdf') {
          return (
            <iframe
              src={previewUrl}
              title={convertedName}
              className="w-full rounded-lg border-0"
              style={{ height: '62vh' }}
            />
          );
        }

        // Plain text formats
        if (TEXT_FORMATS.includes(fmt)) {
          return (
            <div className="w-full max-h-[62vh] overflow-auto bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {textContent ?? 'Loading...'}
              </pre>
            </div>
          );
        }

        // DOCX / PPTX — show extracted text
        if (XML_DOC_FORMATS.includes(fmt)) {
          if (docLoading) {
            return (
              <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reading document…
              </div>
            );
          }
          if (docText !== null) {
            return (
              <div className="w-full max-h-[62vh] overflow-auto bg-white rounded-lg border border-gray-200 p-6">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-sans leading-relaxed">
                  {docText.trim() || '[Document appears to be empty]'}
                </pre>
              </div>
            );
          }
        }

        // XLSX and other binary formats — show download prompt
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-12 bg-gray-50 rounded-xl w-full">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">{convertedName}</p>
              <p className="text-sm text-gray-500 mt-1">
                .{fmt.toUpperCase()} files can't be previewed in the browser.
              </p>
              <p className="text-sm text-gray-400 mt-0.5">Click Download to open it.</p>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="bg-gray-100 p-12 rounded-lg text-center">
            <p className="text-gray-600">Preview not available for this file type</p>
          </div>
        );
    }
  };

  const fmt = file.targetFormat?.toLowerCase() ?? '';
  const isPdf = file.type === 'document' && fmt === 'pdf';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 truncate pr-4">{convertedName}</h2>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className={`flex items-center justify-center bg-gray-50 min-h-[400px] max-h-[70vh] ${isPdf ? 'p-0' : 'p-6'}`}>
              {renderPreview()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
