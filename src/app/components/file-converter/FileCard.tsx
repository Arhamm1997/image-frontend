import { motion } from 'motion/react';
import {
  FileIcon,
  Image,
  Video,
  Music,
  FileText,
  Download,
  Trash2,
  Play,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { UploadedFile } from './types';
import { formatBytes } from './utils';
import { FormatPicker } from './FormatPicker';

interface FileCardProps {
  file: UploadedFile;
  onFormatChange: (fileId: string, format: string) => void;
  onConvert: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
  onView: (fileId: string) => void;
}

export function FileCard({
  file,
  onFormatChange,
  onConvert,
  onDownload,
  onRemove,
  onRetry,
  onView,
}: FileCardProps) {
  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-pink-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-orange-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const canConvert = file.status === 'idle' && file.targetFormat;
  const isConverting = file.status === 'converting';
  const isCompleted = file.status === 'completed';
  const isError = file.status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="flex-shrink-0">
          {file.preview ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={file.preview}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              {getFileIcon()}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
            {isCompleted && (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
            {isError && (
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500">
            {formatBytes(file.size)}
            {file.currentFormat && (
              <span className="ml-2">• .{file.currentFormat}</span>
            )}
          </p>

          {/* Progress Bar */}
          {isConverting && (
            <div className="mt-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Converting... {Math.round(file.progress)}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {isError && file.error && (
            <p className="text-sm text-red-500 mt-1">{file.error}</p>
          )}
        </div>

        {/* Format Selector */}
        {!isCompleted && !isConverting && (
          <div className="flex-shrink-0 w-44">
            <FormatPicker
              value={file.targetFormat || ''}
              onChange={(fmt) => onFormatChange(file.id, fmt)}
              currentFormat={file.currentFormat}
              disabled={isError}
              align="right"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canConvert && !isError && (
            <button
              onClick={() => onConvert(file.id)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all text-sm font-medium flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Convert
            </button>
          )}

          {isCompleted && (
            <>
              <button
                onClick={() => onView(file.id)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDownload(file.id)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          )}

          {isError && (
            <button
              onClick={() => onRetry(file.id)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => onRemove(file.id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove"
            disabled={isConverting}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}