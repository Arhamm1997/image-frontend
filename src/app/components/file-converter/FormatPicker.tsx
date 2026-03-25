import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

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

// Category accent colours (gradient pairs)
const CAT_COLORS: Record<string, { from: string; to: string; light: string }> = {
  Archive:      { from: '#f97316', to: '#ef4444', light: 'rgba(249,115,22,0.15)' },
  Audio:        { from: '#22c55e', to: '#10b981', light: 'rgba(34,197,94,0.15)'  },
  CAD:          { from: '#6366f1', to: '#8b5cf6', light: 'rgba(99,102,241,0.15)' },
  Document:     { from: '#3b82f6', to: '#6366f1', light: 'rgba(59,130,246,0.15)' },
  Ebook:        { from: '#f59e0b', to: '#f97316', light: 'rgba(245,158,11,0.15)' },
  Font:         { from: '#ec4899', to: '#a855f7', light: 'rgba(236,72,153,0.15)' },
  Image:        { from: '#06b6d4', to: '#3b82f6', light: 'rgba(6,182,212,0.15)'  },
  Other:        { from: '#94a3b8', to: '#64748b', light: 'rgba(148,163,184,0.15)'},
  Presentation: { from: '#f97316', to: '#ec4899', light: 'rgba(249,115,22,0.15)' },
  Spreadsheet:  { from: '#10b981', to: '#06b6d4', light: 'rgba(16,185,129,0.15)' },
  Vector:       { from: '#8b5cf6', to: '#ec4899', light: 'rgba(139,92,246,0.15)' },
  Video:        { from: '#ef4444', to: '#f97316', light: 'rgba(239,68,68,0.15)'  },
};

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
  currentFormat?: string;
  disabled?: boolean;
  placeholder?: string;
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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

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

  const displayFormats = (searchResults ?? FORMAT_CATEGORIES[category] ?? [])
    .filter(f => f.toLowerCase() !== currentFormat?.toLowerCase());

  const panelClass =
    align === 'right'  ? 'right-0' :
    align === 'center' ? 'left-1/2 -translate-x-1/2' :
    'left-0';

  const activeCat = CAT_COLORS[category] ?? CAT_COLORS.Document;
  const activeVal = value ? CAT_COLORS[getCategoryForExt(value)] ?? activeCat : activeCat;

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger button ──────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[
          'group relative inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold w-full',
          'border-2 transition-all duration-200 overflow-hidden',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          open || value
            ? 'border-transparent text-white shadow-lg'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50',
        ].join(' ')}
        style={
          open || value
            ? { background: `linear-gradient(135deg, ${activeVal.from}, ${activeVal.to})` }
            : {}
        }
      >
        {/* Shimmer overlay on hover */}
        {!open && !value && (
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(168,85,247,0.06))' }} />
        )}
        <span className="flex-1 text-left truncate z-10">
          {value ? `.${value.toUpperCase()}` : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 z-10 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────── */}
      {open && (
        <div
          className={`absolute z-[9999] mt-2 ${panelClass} rounded-2xl overflow-hidden`}
          style={{
            width: 340,
            background: '#111827',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Gradient top accent */}
          <div className="h-[2px]"
               style={{ background: `linear-gradient(90deg, ${activeCat.from}, ${activeCat.to}, #ec4899)` }} />

          {/* Search bar */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/[0.06]">
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: activeCat.from }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Format"
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex" style={{ maxHeight: 292 }}>

            {/* ── Category list ──────────────────────────────────── */}
            {!lsearch && (
              <div
                className="flex-shrink-0 overflow-y-auto py-1.5"
                style={{ width: 118, borderRight: '1px solid rgba(255,255,255,0.06)' }}
              >
                {Object.keys(FORMAT_CATEGORIES).map(cat => {
                  const isActive = cat === category;
                  const cc = CAT_COLORS[cat] ?? CAT_COLORS.Document;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1"
                      style={
                        isActive
                          ? {
                              background: cc.light,
                              color: cc.from,
                            }
                          : { color: '#9ca3af' }
                      }
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                      }}
                    >
                      <span className="truncate">{cat}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: cc.from }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Format grid ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-2">
              {displayFormats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
                  <Search className="w-6 h-6 text-gray-700" />
                  <p className="text-gray-600 text-xs">No formats found</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {displayFormats.map(fmt => {
                    const isSelected = value === fmt;
                    const fc = CAT_COLORS[getCategoryForExt(fmt)] ?? activeCat;
                    return (
                      <button
                        key={fmt}
                        title={`.${fmt}`}
                        onClick={() => { onChange(fmt); setOpen(false); setSearch(''); }}
                        className="relative px-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide truncate transition-all duration-150 overflow-hidden"
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(135deg, ${fc.from}, ${fc.to})`,
                                color: '#fff',
                                boxShadow: `0 4px 12px ${fc.light}`,
                              }
                            : {
                                background: 'rgba(255,255,255,0.04)',
                                color: '#d1d5db',
                                border: '1px solid rgba(255,255,255,0.06)',
                              }
                        }
                        onMouseEnter={e => {
                          if (!isSelected) {
                            const el = e.currentTarget as HTMLButtonElement;
                            el.style.background = fc.light;
                            el.style.color = fc.from;
                            el.style.border = `1px solid ${fc.from}40`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            const el = e.currentTarget as HTMLButtonElement;
                            el.style.background = 'rgba(255,255,255,0.04)';
                            el.style.color = '#d1d5db';
                            el.style.border = '1px solid rgba(255,255,255,0.06)';
                          }
                        }}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-3.5 py-2 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-gray-600">
              {lsearch
                ? `${displayFormats.length} result${displayFormats.length !== 1 ? 's' : ''}`
                : `${displayFormats.length} formats`}
            </span>
            <span className="text-[10px]"
                  style={{ color: activeCat.from }}>
              {lsearch ? 'All categories' : category}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
