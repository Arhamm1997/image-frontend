import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

// ── All categories and their formats ─────────────────────────────────────────
export const FORMAT_CATEGORIES: Record<string, string[]> = {
  Archive: [
    '7z','ace','alz','arc','arj','bz','bz2','cab','cpio','deb','dmg','gz',
    'img','iso','jar','lha','lz','lzma','lzo','rar','rpm','rz',
    'tar','tar.bz2','tar.gz','tar.lz','tar.lzma','tar.xz','tar.z',
    'tbz','tgz','txz','xz','z','zip','zipx','zst',
  ],
  Audio: [
    'aac','aiff','amr','caf','flac','m4a','mp3','ogg','opus','wav','wma',
  ],
  CAD: [
    '3ds','dgn','dwg','dxf','iges','igs','obj','step','stp','stl',
  ],
  Document: [
    'csv','doc','docx','html','htm','md','odt','ott','pages',
    'pdf','rtf','tex','txt','xml',
  ],
  Ebook: [
    'azw','azw3','epub','fb2','lit','lrf','mobi','pdb','pdf',
  ],
  Font: [
    'eot','otf','ttf','woff','woff2',
  ],
  Image: [
    'avif','bmp','eps','gif','heic','heif','ico','icns',
    'jpg','jpeg','png','psd','svg','tif','tiff','webp','xcf',
  ],
  Other: [
    'bin','dat','ics','swf','vcf',
  ],
  Presentation: [
    'key','odp','ppt','pptm','pptx',
  ],
  Spreadsheet: [
    'csv','et','numbers','ods','tsv','xls','xlsm','xlsx',
  ],
  Vector: [
    'ai','eps','pdf','ps','svg',
  ],
  Video: [
    '3g2','3gp','avi','flv','m4v','mkv','mov','mp4','mpg','mpeg',
    'mts','m2ts','ogv','ts','vob','webm','wmv',
  ],
};

/** Returns which category best matches a file extension. */
export function getCategoryForExt(ext: string): string {
  const lx = ext.toLowerCase().replace(/^\./, '');
  for (const [cat, fmts] of Object.entries(FORMAT_CATEGORIES)) {
    if (fmts.includes(lx)) return cat;
  }
  return 'Document';
}

interface FormatPickerProps {
  value: string;
  onChange: (fmt: string) => void;
  /** Current format of the file (excluded from options) */
  currentFormat?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Panel alignment relative to the trigger button */
  align?: 'left' | 'right' | 'center';
}

export function FormatPicker({
  value,
  onChange,
  currentFormat,
  disabled,
  placeholder = 'Choose format',
  align = 'left',
}: FormatPickerProps) {
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState(() => getCategoryForExt(currentFormat ?? ''));
  const [search, setSearch]     = useState('');
  const ref                     = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Reset category when input file changes
  useEffect(() => {
    if (currentFormat) setCategory(getCategoryForExt(currentFormat));
  }, [currentFormat]);

  const lsearch = search.toLowerCase().trim();

  const searchResults = useMemo(() => {
    if (!lsearch) return null;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const fmts of Object.values(FORMAT_CATEGORIES)) {
      for (const f of fmts) {
        if (f.includes(lsearch) && !seen.has(f)) { seen.add(f); out.push(f); }
      }
    }
    return out;
  }, [lsearch]);

  const displayFormats = searchResults ?? FORMAT_CATEGORIES[category] ?? [];
  const filteredFormats = displayFormats.filter(
    f => f.toLowerCase() !== currentFormat?.toLowerCase()
  );

  const panelClass =
    align === 'right'  ? 'right-0' :
    align === 'center' ? 'left-1/2 -translate-x-1/2' :
    'left-0';

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ─────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium w-full transition-all',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          value
            ? 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400',
        ].join(' ')}
      >
        <span className="flex-1 text-left truncate">
          {value ? `.${value}` : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────── */}
      {open && (
        <div
          className={`absolute z-[9999] mt-1 ${panelClass} w-[360px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#2e2e2e] overflow-hidden`}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2e2e2e]">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Format"
              className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none"
            />
          </div>

          <div className="flex" style={{ maxHeight: 300 }}>
            {/* Category list — hidden while searching */}
            {!lsearch && (
              <div className="w-[130px] border-r border-[#2e2e2e] overflow-y-auto flex-shrink-0 py-1">
                {Object.keys(FORMAT_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={[
                      'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-1 transition-colors',
                      cat === category
                        ? 'bg-[#252525] text-white font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]',
                    ].join(' ')}
                  >
                    <span className="truncate">{cat}</span>
                    {cat === category && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Format grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredFormats.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-8">No formats found</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {filteredFormats.map(fmt => (
                    <button
                      key={fmt}
                      title={`.${fmt}`}
                      onClick={() => {
                        onChange(fmt);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={[
                        'px-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide truncate transition-all',
                        value === fmt
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#262626] text-gray-200 hover:bg-[#333] hover:text-white',
                      ].join(' ')}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
