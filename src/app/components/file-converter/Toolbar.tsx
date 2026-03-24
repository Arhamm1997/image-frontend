import { motion } from 'motion/react';
import { Play, Download, Trash2 } from 'lucide-react';

interface ToolbarProps {
  fileCount: number;
  completedCount: number;
  isConverting: boolean;
  canConvertAll: boolean;
  canDownloadAll: boolean;
  onConvertAll: () => void;
  onDownloadAll: () => void;
  onClearAll: () => void;
}

export function Toolbar({
  fileCount,
  completedCount,
  isConverting,
  canConvertAll,
  canDownloadAll,
  onConvertAll,
  onDownloadAll,
  onClearAll,
}: ToolbarProps) {
  if (fileCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Convert All */}
          <button
            onClick={onConvertAll}
            disabled={!canConvertAll || isConverting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Play className="w-5 h-5" />
            {isConverting ? 'Converting...' : 'Convert All'}
          </button>

          {/* Download All */}
          <button
            onClick={onDownloadAll}
            disabled={!canDownloadAll || isConverting}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Download className="w-5 h-5" />
            Download All ({completedCount})
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Clear All */}
          <button
            onClick={onClearAll}
            disabled={isConverting}
            className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Trash2 className="w-5 h-5" />
            Clear All
          </button>
        </div>
      </div>
    </motion.div>
  );
}
