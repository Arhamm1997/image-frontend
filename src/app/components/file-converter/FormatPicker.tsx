import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Close on outside click — also handles scrollbar clicks (target may be document)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (panelRef.current) {
        if (panelRef.current.contains(e.target as Node)) return;
        // Scrollbar click: target is outside DOM but coords are inside panel rect
        const r = panelRef.current.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top  && e.clientY <= r.bottom) return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close on page scroll (but NOT when scrolling inside the panel) or resize
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return; // scrolling inside panel — keep open
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (currentFormat) setCategory(getCategoryForExt(currentFormat));
  }, [currentFormat]);

  // Compute fixed position from trigger rect
  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r   = triggerRef.current.getBoundingClientRect();
    const PW  = 340;
    const GAP = 6;
    const vw  = window.innerWidth;

    let left: number;
    if (align === 'right')  left = r.right  - PW;
    else if (align === 'center') left = r.left + r.width / 2 - PW / 2;
    else                    left = r.left;

    // Keep inside viewport
    left = Math.max(8, Math.min(left, vw - PW - 8));

    setPanelStyle({ position: 'fixed', top: r.bottom + GAP, left, width: PW, zIndex: 99999 });
  }, [align]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open) computePos();
    setOpen(o => !o);
  };

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

  const activeCat = CAT_COLORS[category] ?? CAT_COLORS.Document;
  const activeVal = value ? CAT_COLORS[getCategoryForExt(value)] ?? activeCat : activeCat;

  // ── Panel (rendered via portal to escape overflow:hidden parents) ──────────
  const panel = open ? createPortal(
    <div
      ref={panelRef}
      style={{
        ...panelStyle,
        background: '#111827',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
      }}
    >
      {/* Gradient accent line */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${activeCat.from}, ${activeCat.to}, #ec4899)`,
      }} />

      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Search style={{ width: 14, height: 14, flexShrink: 0, color: activeCat.from }} />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Format"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: '#e5e7eb',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
                     color: '#6b7280', fontSize: 12, padding: 0 }}
          >✕</button>
        )}
      </div>

      {/* Body: category list + format grid */}
      <div style={{ display: 'flex', maxHeight: 300 }}>

        {/* Category column */}
        {!lsearch && (
          <div style={{
            width: 122, flexShrink: 0, overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.06)', paddingBlock: 6,
          }}>
            {Object.keys(FORMAT_CATEGORIES).map(cat => {
              const isActive = cat === category;
              const cc = CAT_COLORS[cat] ?? CAT_COLORS.Document;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '7px 12px',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                    background: isActive ? cc.light : 'transparent',
                    color: isActive ? cc.from : '#9ca3af',
                    border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat}
                  </span>
                  {isActive && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: cc.from,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Format grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {displayFormats.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                          justifyContent: 'center', height: '100%', gap: 8, padding: '24px 0' }}>
              <Search style={{ width: 22, height: 22, color: '#374151' }} />
              <span style={{ fontSize: 12, color: '#4b5563' }}>No formats found</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {displayFormats.map(fmt => {
                const isSelected = value === fmt;
                const fc = CAT_COLORS[getCategoryForExt(fmt)] ?? activeCat;
                return (
                  <button
                    key={fmt}
                    title={`.${fmt}`}
                    onClick={() => { onChange(fmt); setOpen(false); setSearch(''); }}
                    style={isSelected ? {
                      padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      background: `linear-gradient(135deg,${fc.from},${fc.to})`,
                      color: '#fff', boxShadow: `0 4px 12px ${fc.light}`,
                      transition: 'all 0.12s',
                    } : {
                      padding: '9px 4px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      background: 'rgba(255,255,255,0.04)', color: '#d1d5db',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = fc.light;
                        el.style.color = fc.from;
                        el.style.border = `1px solid ${fc.from}55`;
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

      {/* Footer */}
      <div style={{
        padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, color: '#4b5563' }}>
          {lsearch
            ? `${displayFormats.length} result${displayFormats.length !== 1 ? 's' : ''}`
            : `${displayFormats.length} formats`}
        </span>
        <span style={{ fontSize: 10, color: activeCat.from }}>
          {lsearch ? 'All categories' : category}
        </span>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="relative">
      {/* ── Trigger button ──────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
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

      {panel}
    </div>
  );
}
