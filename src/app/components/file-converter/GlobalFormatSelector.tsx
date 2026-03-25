import { motion } from 'motion/react';
import { ArrowRight, Check, ChevronDown, Zap } from 'lucide-react';
import { FileType } from './types';
import { FormatPicker } from './FormatPicker';

interface GlobalFormatSelectorProps {
  fromFormat: string;
  toFormat: string;
  onFromFormatChange: (format: string) => void;
  onToFormatChange: (format: string) => void;
  onApply: () => void;
  fileCount: number;
  disabled?: boolean;
  availableFormats: string[];
  fileTypes: FileType[];
}

// Per-format accent colours
const FORMAT_PALETTE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  jpg:  { bg: 'bg-sky-50',     border: 'border-sky-300',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  jpeg: { bg: 'bg-sky-50',     border: 'border-sky-300',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  png:  { bg: 'bg-violet-50',  border: 'border-violet-300',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  webp: { bg: 'bg-indigo-50',  border: 'border-indigo-300',  text: 'text-indigo-700',  dot: 'bg-indigo-400' },
  gif:  { bg: 'bg-pink-50',    border: 'border-pink-300',    text: 'text-pink-700',    dot: 'bg-pink-400' },
  svg:  { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  bmp:  { bg: 'bg-cyan-50',    border: 'border-cyan-300',    text: 'text-cyan-700',    dot: 'bg-cyan-400' },
  ico:  { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  tiff: { bg: 'bg-teal-50',    border: 'border-teal-300',    text: 'text-teal-700',    dot: 'bg-teal-400' },
  avif: { bg: 'bg-lime-50',    border: 'border-lime-300',    text: 'text-lime-700',    dot: 'bg-lime-400' },
  mp4:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     dot: 'bg-red-400' },
  webm: { bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  avi:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     dot: 'bg-red-400' },
  mov:  { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  mkv:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     dot: 'bg-red-400' },
  mp3:  { bg: 'bg-green-50',   border: 'border-green-300',   text: 'text-green-700',   dot: 'bg-green-400' },
  wav:  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  ogg:  { bg: 'bg-teal-50',    border: 'border-teal-300',    text: 'text-teal-700',    dot: 'bg-teal-400' },
  flac: { bg: 'bg-green-50',   border: 'border-green-300',   text: 'text-green-700',   dot: 'bg-green-400' },
  pdf:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     dot: 'bg-red-400' },
  docx: { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  doc:  { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  xlsx: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  pptx: { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  txt:  { bg: 'bg-gray-50',    border: 'border-gray-300',    text: 'text-gray-700',    dot: 'bg-gray-400' },
  csv:  { bg: 'bg-lime-50',    border: 'border-lime-300',    text: 'text-lime-700',    dot: 'bg-lime-400' },
};

const DEFAULT_PALETTE = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', dot: 'bg-gray-400' };

function palette(fmt: string) {
  return FORMAT_PALETTE[fmt.toLowerCase()] ?? DEFAULT_PALETTE;
}

export function GlobalFormatSelector({
  fromFormat,
  toFormat,
  onFromFormatChange,
  onToFormatChange,
  onApply,
  fileCount,
  disabled,
  availableFormats,
  fileTypes,
}: GlobalFormatSelectorProps) {
  const isAutoDetected   = availableFormats.length === 1;
  const hasMultipleFroms = availableFormats.length > 1;
  const canApply         = !!toFormat && !!fromFormat && !disabled && fileCount > 0;

  const fromPalette = fromFormat ? palette(fromFormat) : DEFAULT_PALETTE;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y:  0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative rounded-2xl bg-white border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
    >
      {/* Gradient top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500" />

      <div className="px-5 pt-5 pb-4">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">Batch Convert</p>
              <p className="text-xs text-gray-400">Apply the same conversion to all files</p>
            </div>
          </div>

          {/* File count pill */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Conversion row ───────────────────────────────────────── */}
        <div className="flex items-end gap-3 flex-wrap">

          {/* FROM */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
              From
            </label>

            {isAutoDetected ? (
              /* Auto-detected badge — no dropdown needed */
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 ${fromPalette.border} ${fromPalette.bg} cursor-default`}
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 shrink-0">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
                <span className={`font-bold text-sm ${fromPalette.text}`}>.{fromFormat}</span>
                <span className="ml-auto text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  Auto-detected
                </span>
              </motion.div>
            ) : (
              /* Multiple formats — show dropdown */
              <div className="relative">
                <select
                  value={fromFormat}
                  onChange={e => onFromFormatChange(e.target.value)}
                  disabled={disabled}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:border-orange-400 focus:bg-white transition-all disabled:opacity-50 cursor-pointer hover:border-gray-300"
                >
                  <option value="">Select source format</option>
                  {hasMultipleFroms && <option value="all">All formats</option>}
                  {availableFormats.map(fmt => (
                    <option key={fmt} value={fmt}>.{fmt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Animated arrow */}
          <div className="pb-2.5 shrink-0">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-0.5 text-gray-300">
                <div className="w-6 h-px bg-gray-200" />
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.div>
          </div>

          {/* TO */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
              To
            </label>
            <FormatPicker
              value={toFormat}
              onChange={onToFormatChange}
              currentFormat={availableFormats.length === 1 ? availableFormats[0] : undefined}
              disabled={disabled}
              placeholder="Choose target format"
              align="center"
            />
          </div>

          {/* Apply button */}
          <div className="shrink-0 pb-0.5">
            <motion.button
              onClick={onApply}
              disabled={!canApply}
              whileHover={canApply ? { scale: 1.02, y: -1 } : {}}
              whileTap={canApply  ? { scale: 0.97 }          : {}}
              className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-orange-500 to-pink-500
                shadow-[0_2px_10px_rgba(249,115,22,0.35)]
                hover:shadow-[0_4px_16px_rgba(249,115,22,0.45)]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                transition-shadow whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4" />
              Apply to {fileCount} file{fileCount !== 1 ? 's' : ''}
            </motion.button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
