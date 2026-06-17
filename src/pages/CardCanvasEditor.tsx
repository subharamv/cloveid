import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useBranding } from '@/hooks/useBranding';
import { useBranches } from '@/hooks/useBranches';
import { toast } from 'sonner';
import {
  Loader2, Save, Eye, EyeOff, X, Layers, RefreshCw,
  ZoomIn, ZoomOut, MousePointer2, ArrowLeft, Type, Square,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Bold, Italic, Underline, Trash2, Copy, ChevronDown, ChevronRight,
  Grid3X3, RotateCcw, RotateCw, Minus, Circle, Triangle, Star,
  Move, Crosshair, Link, Palette, Layers as LayersIcon, Settings,
  Upload, Code2, Shapes
} from 'lucide-react';
import { supabase as _sb } from '@/lib/supabaseClient';

const SUPABASE_URL = 'https://tmygylckkbocgunlubik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteWd5bGNra2JvY2d1bmx1YmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTEyODAsImV4cCI6MjA4MTYyNzI4MH0.SYo3IcVUBGfHs1PZGgP8wtPhvmtQQ6ytW9_H7NW20SE';

async function uploadTemplateBgToDrive(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const fileName = `template_bg_${Date.now()}.${ext}`;
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('fileName', fileName);
  formData.append('type', 'template');
  formData.append('folderName', 'template');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-drive`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || 'Drive upload failed');
  return json.fileUrl as string;
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CardElementPosition {
  x: number; y: number; width: number; height: number; visible: boolean;
  fontSize: number; fontWeight: string; fontFamily: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number; lineHeight?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'double';
  borderColor?: string; borderWidth?: number; borderRadius?: number;
  color?: string; fillColor?: string; opacity?: number; rotation?: number;
  shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number;
  shapeType?: 'rect' | 'circle' | 'triangle' | 'line' | 'diamond' | 'star' | 'arrow' | 'heart';
  imageUrl?: string; imageSize?: 'cover' | 'contain' | 'fill';
  textContent?: string;
}

export interface CardLayoutElement {
  id: string; element_key: string; display_name: string;
  element_type?: 'original' | 'shape' | 'image' | 'text';
  front_position: CardElementPosition;
  back_position: CardElementPosition | null;
  card_side: string;
}

interface CardLayoutTemplate {
  id: string;
  template_name: string;
  is_active: boolean;
  layout_elements: CardLayoutElement[];
  front_bg: CardBackground;
  back_bg: CardBackground;
  label_overrides: Record<string, string>;
  created_at: string;
}

interface CardBackground {
  type: 'solid' | 'gradient' | 'image' | 'pattern' | 'svg';
  color: string; gradientFrom: string; gradientTo: string;
  gradientAngle: number; imageUrl: string;
  imageSize: 'cover' | 'contain' | 'fill';
  patternId?: string;
  patternColor?: string;
  patternOpacity?: number;
  svgCode?: string;
  svgUrl?: string;
}

const BG_PATTERNS: { id: string; label: string; svg: (c: string, o: number) => string }[] = [
  { id: 'diagonal', label: 'Diagonal', svg: (c, o) => `<svg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'><g fill='${c}' fill-opacity='${o}' fill-rule='evenodd'><path d='M5 0h1L0 6V5zM6 5v1H5z'/></g></svg>` },
  { id: 'diagonal-rev', label: 'Anti-diag', svg: (c, o) => `<svg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'><g fill='${c}' fill-opacity='${o}' fill-rule='evenodd'><path d='M0 0h1l6 6H5zM0 5v1h1z'/></g></svg>` },
  { id: 'crosshatch', label: 'Crosshatch', svg: (c, o) => `<svg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='0.5'><path d='M0 8L8 0M-2 2L2-2M6 10L10 6'/><path d='M0 0L8 8M-2 6L2 10M6-2L10 2'/></g></svg>` },
  { id: 'dots', label: 'Dots', svg: (c, o) => `<svg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><circle cx='4' cy='4' r='1.5' fill='${c}' fill-opacity='${o}'/></svg>` },
  { id: 'dots-sm', label: 'Fine dots', svg: (c, o) => `<svg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'><circle cx='5' cy='5' r='1' fill='${c}' fill-opacity='${o}'/></svg>` },
  { id: 'grid', label: 'Grid', svg: (c, o) => `<svg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='0.5'/></svg>` },
  { id: 'grid-sm', label: 'Fine grid', svg: (c, o) => `<svg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'><path d='M 10 0 L 0 0 0 10' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='0.4'/></svg>` },
  { id: 'waves', label: 'Waves', svg: (c, o) => `<svg width='20' height='12' viewBox='0 0 20 12' xmlns='http://www.w3.org/2000/svg'><path d='M0 6 Q5 0 10 6 T20 6' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1'/></svg>` },
  { id: 'hexagon', label: 'Hexagon', svg: (c, o) => `<svg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='0.5'><polygon points='14,1 27,7.5 27,21.5 14,28 1,21.5 1,7.5'/><polygon points='14,28 27,34.5 27,48.5 14,49 1,48.5 1,34.5'/></g></svg>` },
  { id: 'triangles', label: 'Triangles', svg: (c, o) => `<svg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'><polygon points='5,1 9,9 1,9' fill='${c}' fill-opacity='${o}'/></svg>` },
  { id: 'zigzag', label: 'Zigzag', svg: (c, o) => `<svg width='20' height='10' viewBox='0 0 20 10' xmlns='http://www.w3.org/2000/svg'><polyline points='0,5 5,0 10,5 15,0 20,5' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1'/></svg>` },
  { id: 'plus', label: 'Plus', svg: (c, o) => `<svg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><path d='M9 0v20M0 9h20' stroke='${c}' stroke-opacity='${o}' stroke-width='0.8' fill='none'/></svg>` },
];

type ToolMode = 'select' | 'text' | 'rect' | 'circle' | 'triangle' | 'line' | 'diamond' | 'star' | 'arrow' | 'heart' | 'image';

interface Guide { id: string; type: 'v' | 'h'; pos: number; }

// ── Constants ─────────────────────────────────────────────────────────────────

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Nunito', 'Playfair Display', 'Merriweather', 'Oswald',
  'Ubuntu', 'PT Sans', 'Fira Sans', 'Mulish', 'Quicksand', 'Josefin Sans',
  'DM Sans', 'Manrope', 'Work Sans', 'Barlow', 'Rubik', 'Karla',
  'Plus Jakarta Sans', 'Lexend', 'Bricolage Grotesque', 'Space Grotesk',
];

const DEFAULT_BG: CardBackground = {
  type: 'solid', color: '#ffffff', gradientFrom: '#ffffff',
  gradientTo: '#f0f4ff', gradientAngle: 135, imageUrl: '', imageSize: 'cover',
  patternId: 'diagonal', patternColor: '#f48120', patternOpacity: 0.4,
  svgCode: '', svgUrl: '',
};

const DEFAULT_POS: CardElementPosition = {
  x: 40, y: 140, width: 80, height: 60, visible: true,
  fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter',
  color: '#000000', fillColor: '#3B82F6', opacity: 1,
  borderRadius: 0, borderWidth: 0, borderColor: '#000000',
  borderStyle: 'none', textAlign: 'left', letterSpacing: 0, lineHeight: 1.2,
  rotation: 0, shadowBlur: 0, shadowColor: 'rgba(0,0,0,0.2)', shadowOffsetX: 0, shadowOffsetY: 0,
};

const loadGoogleFont = (name: string) => {
  if (!name || ['system-ui', 'sans-serif', 'serif', 'monospace'].includes(name)) return;
  const id = `gfont-${name.replace(/ /g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
  document.head.appendChild(link);
};

const SHAPE_COLORS = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316','#000000','#ffffff'];
const TEXT_COLORS  = ['#000000','#ffffff','#374151','#1D4ED8','#DC2626','#059669','#D97706','#7C3AED','#DB2777','#0891B2'];

// Default display text for original elements — used by the inline label editor
const DEFAULT_LABELS: Record<string, string> = {
  fullName: 'FULL NAME', employeeId: 'Emp ID', bloodGroup: 'Blood Group',
  emergencyContact: 'Emergency No', companyName: 'Clove Technologies Pvt. Ltd.',
  companyAddress: 'Address', companyPhone: 'Phone', companyEmail: 'Email',
  companyWebsite: 'Website', ifFoundText: 'IF FOUND PLEASE RETURN TO',
  designation: 'Designation', photo: 'Photo',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
  <div className="border-b border-[#3a3a3a]">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-300 uppercase tracking-widest hover:bg-[#333] transition-colors">
      {title}
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
    {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] text-gray-500 mb-0.5 font-medium uppercase tracking-wide">{children}</label>
);

const NumInput: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }> =
  ({ label, value, onChange, min, max, step = 1, suffix }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <input type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none" />
        {suffix && <span className="text-[10px] text-gray-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );

// ── Main Component ─────────────────────────────────────────────────────────────

const CardCanvasEditor: React.FC = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { branches } = useBranches();

  const [elements, setElements] = useState<CardLayoutElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');

  const [dragging, setDragging] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [resizing, setResizing] = useState<{ key: string; handle: string } | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, elX: 0, elY: 0 });

  const [zoom, setZoom] = useState(1.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [smartGuides, setSmartGuides] = useState<{ type: 'v' | 'h'; pos: number; label?: string }[]>([]);

  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Guides (ruler drag-lines)
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showGuides, setShowGuides] = useState(true);
  const [draggingGuide, setDraggingGuide] = useState<string | null>(null);
  const [creatingGuide, setCreatingGuide] = useState<'v' | 'h' | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [frontBg, setFrontBg] = useState<CardBackground>({ ...DEFAULT_BG });
  const [backBg, setBackBg]   = useState<CardBackground>({ ...DEFAULT_BG, color: '#f8f9fa' });

  const [history, setHistory] = useState<CardLayoutElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copiedElement, setCopiedElement] = useState<CardLayoutElement | null>(null);

  const [savedStyles, setSavedStyles] = useState<{id: string; style_name: string; is_default: boolean}[]>([]);
  const [showSaveStyleModal, setShowSaveStyleModal] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');

  // Template system
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [templates, setTemplates] = useState<CardLayoutTemplate[]>([]);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  const [showImageImport, setShowImageImport] = useState(false);
  const [imageImportUrl, setImageImportUrl] = useState('');
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [fontSearch, setFontSearch] = useState('');

  const [rightTab, setRightTab] = useState<'props' | 'bg' | 'layers'>('props');
  const [sections, setSections] = useState({ position: true, typography: true, style: true, fill: true, shadow: false });
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [bgUploadLoading, setBgUploadLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const panelResizingRef = useRef(false);
  const panelResizeStartX = useRef(0);
  const panelResizeStartW = useRef(300);
  const rafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragTargetRef = useRef<{ key: string; x: number; y: number } | null>(null);
  const copiedRef  = useRef<CardLayoutElement | null>(null);
  const selectedRef = useRef<string | null>(null);
  const elementsRef = useRef<CardLayoutElement[]>([]);
  const activeSideRef = useRef<'front' | 'back'>('front');
  const toolRef = useRef<ToolMode>('select');
  const previewRef = useRef(false);
  const smartGuidesRef = useRef<{ type: 'v' | 'h'; pos: number; label?: string }[]>([]);

  useEffect(() => { selectedRef.current = selectedElement; }, [selectedElement]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { activeSideRef.current = activeSide; }, [activeSide]);
  useEffect(() => { toolRef.current = toolMode; }, [toolMode]);
  useEffect(() => { previewRef.current = previewMode; }, [previewMode]);
  useEffect(() => { copiedRef.current = copiedElement; }, [copiedElement]);

  useEffect(() => {
    elements.forEach(el => {
      const p = activeSide === 'front' ? el.front_position : el.back_position;
      if (p?.fontFamily) loadGoogleFont(p.fontFamily);
    });
  }, [elements, activeSide]);

  useEffect(() => { GOOGLE_FONTS.slice(0, 8).forEach(loadGoogleFont); }, []);

  const saveToHistory = useCallback((els: CardLayoutElement[]) => {
    setHistory(prev => {
      const h = prev.slice(0, historyIndex + 1);
      h.push(JSON.parse(JSON.stringify(els)));
      if (h.length > 50) h.shift();
      return h;
    });
    setHistoryIndex(i => Math.min(i + 1, 49));
  }, [historyIndex]);

  useEffect(() => { fetchLayoutSettings(); }, []);

  // Panel resize via drag handle
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizingRef.current) return;
      const delta = panelResizeStartX.current - e.clientX;
      setRightPanelWidth(Math.max(240, Math.min(560, panelResizeStartW.current + delta)));
    };
    const onUp = () => { panelResizingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const fetchLayoutSettings = async () => {
    try {
      const { data, error } = await supabase.from('card_layout_settings').select('*').order('id');
      if (error) throw error;
      if (data?.length) {
        const mapped: CardLayoutElement[] = data.map((item: any) => ({
          id: item.id, element_key: item.element_key,
          display_name: item.display_name, element_type: item.element_type || 'original',
          front_position: typeof item.front_position === 'string' ? JSON.parse(item.front_position) : item.front_position,
          back_position: item.back_position ? (typeof item.back_position === 'string' ? JSON.parse(item.back_position) : item.back_position) : null,
          card_side: item.card_side,
        }));
        setElements(mapped);
        setHistory([mapped]);
        setHistoryIndex(0);
      }
    } catch { toast.error('Failed to load layout'); }
    finally {
      setLoading(false);
      fetchSavedStyles();
      fetchTemplates();
      // Load active template overrides (label text + backgrounds)
      try {
        const { data: activeT } = await supabase.from('card_layout_templates').select('label_overrides, front_bg, back_bg').eq('is_active', true).maybeSingle();
        if (activeT?.label_overrides && Object.keys(activeT.label_overrides).length) setLabelOverrides(activeT.label_overrides as Record<string, string>);
        if (activeT?.front_bg && Object.keys(activeT.front_bg as object).length) setFrontBg(activeT.front_bg as CardBackground);
        if (activeT?.back_bg && Object.keys(activeT.back_bg as object).length) setBackBg(activeT.back_bg as CardBackground);
      } catch {}
      try {
        const saved = localStorage.getItem('card_canvas_bgs');
        if (saved) { const p = JSON.parse(saved); if (p.front) setFrontBg(p.front); if (p.back) setBackBg(p.back); }
      } catch {}
    }
  };

  const fetchSavedStyles = async () => {
    try {
      const { data } = await supabase.from('card_layout_styles').select('id, style_name, is_default').order('created_at', { ascending: true });
      if (data) setSavedStyles(data);
    } catch {}
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from('card_layout_templates').select('*').order('created_at', { ascending: false });
      if (data) setTemplates(data as CardLayoutTemplate[]);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const original = elements.filter(el => el.element_type === 'original' && !el.element_key.includes('_copy_') && !el.element_key.includes('_extra_'));
      const custom   = elements.filter(el => el.element_type !== 'original' || el.element_key.includes('_copy_') || el.element_key.includes('_extra_'));

      for (const el of original) {
        await supabase.from('card_layout_settings').update({
          front_position: JSON.stringify(el.front_position),
          back_position: el.back_position ? JSON.stringify(el.back_position) : null,
          updated_at: new Date().toISOString(),
        }).eq('id', el.id);
      }
      for (const el of custom) {
        const { data: existing } = await supabase.from('card_layout_settings').select('id').eq('element_key', el.element_key).maybeSingle();
        if (existing) {
          await supabase.from('card_layout_settings').update({ front_position: JSON.stringify(el.front_position), back_position: el.back_position ? JSON.stringify(el.back_position) : null, updated_at: new Date().toISOString() }).eq('element_key', el.element_key);
        } else {
          const ts = Date.now().toString(36);
          const key = el.element_key.includes('_copy_') ? `${el.element_key.split('_copy_')[0]}_extra_${ts}` : el.element_key;
          await supabase.from('card_layout_settings').insert({ element_key: key, display_name: el.display_name, element_type: el.element_type || 'original', front_position: JSON.stringify(el.front_position), back_position: el.back_position ? JSON.stringify(el.back_position) : null, card_side: el.card_side });
        }
      }
      localStorage.setItem('card_canvas_bgs', JSON.stringify({ front: frontBg, back: backBg }));
      toast.success('Layout saved — name this template below');
      setTemplateName('');
      setShowTemplateSave(true);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  // ── Template Operations ─────────────────────────────────────────────────────

  const getLabel = useCallback((elementKey: string, baseKey: string, fallback: string): string =>
    labelOverrides[elementKey] ?? labelOverrides[baseKey] ?? fallback,
  [labelOverrides]);

  const commitLabelEdit = (key: string, isText: boolean) => {
    if (editingLabelValue.trim()) {
      if (isText) {
        setElements(prev => prev.map(el => {
          if (el.element_key !== key) return el;
          return { ...el, front_position: { ...el.front_position, textContent: editingLabelValue }, back_position: el.back_position ? { ...el.back_position, textContent: editingLabelValue } : null };
        }));
      } else {
        setLabelOverrides(prev => ({ ...prev, [key]: editingLabelValue }));
      }
    }
    setEditingLabel(null);
  };

  const saveTemplate = async (name: string, setActive: boolean) => {
    if (!name.trim()) { toast.error('Enter a template name'); return; }
    setTemplateSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('card_layout_templates').insert({
        template_name: name.trim(), is_active: setActive,
        layout_elements: elements, front_bg: frontBg, back_bg: backBg,
        label_overrides: labelOverrides, created_by: session?.user?.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      if (setActive) {
        for (const el of elements.filter(e => e.element_type === 'original')) {
          await supabase.from('card_layout_settings').update({
            front_position: JSON.stringify(el.front_position),
            back_position: el.back_position ? JSON.stringify(el.back_position) : null,
            updated_at: new Date().toISOString(),
          }).eq('id', el.id);
        }
      }
      toast.success(`Template "${name.trim()}" saved${setActive ? ' & set active' : ''}`);
      setShowTemplateSave(false); setTemplateName('');
      fetchTemplates();
    } catch (err: any) { toast.error(err.message || 'Failed to save template'); }
    finally { setTemplateSaving(false); }
  };

  const loadTemplateIntoEditor = (tmpl: CardLayoutTemplate) => {
    if (!tmpl.layout_elements?.length) { toast.error('Template has no elements'); return; }
    setElements(tmpl.layout_elements);
    saveToHistory(tmpl.layout_elements);
    if (tmpl.front_bg && Object.keys(tmpl.front_bg).length) setFrontBg(tmpl.front_bg);
    if (tmpl.back_bg && Object.keys(tmpl.back_bg).length) setBackBg(tmpl.back_bg);
    setLabelOverrides(tmpl.label_overrides || {});
    setShowTemplateGallery(false);
    toast.success(`"${tmpl.template_name}" loaded into editor`);
  };

  const activateTemplate = async (tmpl: CardLayoutTemplate) => {
    try {
      await supabase.from('card_layout_templates').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', tmpl.id);
      for (const el of (tmpl.layout_elements || []).filter((e: CardLayoutElement) => e.element_type === 'original')) {
        await supabase.from('card_layout_settings').update({
          front_position: JSON.stringify(el.front_position),
          back_position: el.back_position ? JSON.stringify(el.back_position) : null,
          updated_at: new Date().toISOString(),
        }).eq('id', el.id);
      }
      if (tmpl.front_bg && Object.keys(tmpl.front_bg).length) setFrontBg(tmpl.front_bg);
      if (tmpl.back_bg && Object.keys(tmpl.back_bg).length) setBackBg(tmpl.back_bg);
      setLabelOverrides(tmpl.label_overrides || {});
      localStorage.setItem('card_canvas_bgs', JSON.stringify({ front: tmpl.front_bg, back: tmpl.back_bg }));
      toast.success(`"${tmpl.template_name}" is now the active template`);
      fetchTemplates();
    } catch { toast.error('Failed to activate template'); }
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await supabase.from('card_layout_templates').delete().eq('id', id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Element Operations ──────────────────────────────────────────────────────

  const updatePos = (key: string, updates: Partial<CardElementPosition>) => {
    setElements(prev => prev.map(el => {
      if (el.element_key !== key) return el;
      if (activeSide === 'front') return { ...el, front_position: { ...el.front_position, ...updates } };
      return el.back_position ? { ...el, back_position: { ...el.back_position, ...updates } } : el;
    }));
  };

  const addShape = (shapeType: CardElementPosition['shapeType']) => {
    const key = `shape_${shapeType}_${Date.now()}`;
    const pos: CardElementPosition = { ...DEFAULT_POS, x: 65, y: 140, width: shapeType === 'line' ? 100 : 60, height: shapeType === 'line' ? 4 : 60, shapeType, fillColor: '#3B82F6', borderColor: 'transparent', borderWidth: 0, borderRadius: shapeType === 'rect' ? 4 : 0 };
    const el: CardLayoutElement = { id: crypto.randomUUID(), element_key: key, display_name: shapeType ? (shapeType.charAt(0).toUpperCase() + shapeType.slice(1)) : 'Shape', element_type: 'shape', front_position: pos, back_position: activeSide === 'back' ? { ...pos } : null, card_side: 'both' };
    const updated = [...elements, el];
    setElements(updated); saveToHistory(updated); setSelectedElement(key); setToolMode('select');
  };

  const addImage = () => {
    if (!imageImportUrl.trim()) { toast.error('Enter a valid URL'); return; }
    const key = `img_${Date.now()}`;
    const pos: CardElementPosition = { ...DEFAULT_POS, x: 40, y: 80, width: 150, height: 100, imageUrl: imageImportUrl, imageSize: 'cover', borderRadius: 4 };
    const el: CardLayoutElement = { id: crypto.randomUUID(), element_key: key, display_name: 'Image', element_type: 'image', front_position: pos, back_position: null, card_side: activeSide };
    const updated = [...elements, el];
    setElements(updated); saveToHistory(updated); setSelectedElement(key);
    setShowImageImport(false); setImageImportUrl(''); setToolMode('select');
    toast.success('Image added');
  };

  const addText = () => {
    const key = `txt_${Date.now()}`;
    const pos: CardElementPosition = { ...DEFAULT_POS, x: 30, y: 150, width: 170, height: 28, textContent: 'Add your text', color: '#000000', fontSize: 14, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', fillColor: 'transparent' };
    const el: CardLayoutElement = { id: crypto.randomUUID(), element_key: key, display_name: 'Text', element_type: 'text', front_position: pos, back_position: null, card_side: activeSide };
    const updated = [...elements, el];
    setElements(updated); saveToHistory(updated); setSelectedElement(key); setToolMode('select');
  };

  const deleteElement = (key: string) => {
    const updated = elements.filter(el => el.element_key !== key);
    setElements(updated); saveToHistory(updated); setSelectedElement(null); toast.success('Deleted');
  };

  const align = (dir: string) => {
    const el = elements.find(e => e.element_key === selectedElement);
    if (!el) return;
    const pos = activeSide === 'front' ? el.front_position : el.back_position;
    if (!pos) return;
    const W = 230, H = 365;
    const m: Record<string, Partial<CardElementPosition>> = {
      'left': { x: 0 }, 'center-h': { x: (W - pos.width) / 2 }, 'right': { x: W - pos.width },
      'top': { y: 0 }, 'center-v': { y: (H - pos.height) / 2 }, 'bottom': { y: H - pos.height },
    };
    if (m[dir]) { updatePos(selectedElement!, m[dir]); saveToHistory(elements); }
  };

  // ── Drag / Resize handlers ─────────────────────────────────────────────────

  const handleElemMouseDown = (e: React.MouseEvent, key: string) => {
    if (e.button !== 0 || toolMode !== 'select') return;
    e.preventDefault(); e.stopPropagation();
    setSelectedElement(key); setDragging(key); setDragActive(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setRightTab('props');
  };

  const handleResizeMouseDown = (e: React.MouseEvent, key: string, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    const el = elements.find(el => el.element_key === key); if (!el) return;
    const pos = activeSide === 'front' ? el.front_position : el.back_position; if (!pos) return;
    setResizing({ key, handle });
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: pos.width, h: pos.height, elX: pos.x, elY: pos.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();

    // Throttle crosshair position update to one setState per animation frame
    if (rect && !rafRef.current) {
      const cx = e.clientX, cy = e.clientY;
      rafRef.current = requestAnimationFrame(() => {
        const r = cardRef.current?.getBoundingClientRect();
        if (r) setMousePosition({ x: Math.max(0, Math.min(230, Math.round((cx - r.left) / zoom))), y: Math.max(0, Math.min(365, Math.round((cy - r.top) / zoom))) });
        rafRef.current = null;
      });
    }

    // Dragging an existing guide
    if (draggingGuide && rect) {
      const cardX = Math.round((e.clientX - rect.left) / zoom);
      const cardY = Math.round((e.clientY - rect.top) / zoom);
      setGuides(gs => gs.map(g => {
        if (g.id !== draggingGuide) return g;
        const pos = g.type === 'v'
          ? Math.max(0, Math.min(230, cardX))
          : Math.max(0, Math.min(365, cardY));
        return { ...g, pos };
      }));
      return;
    }

    // Creating a new guide by dragging from ruler
    if (creatingGuide && rect) {
      const cardX = Math.round((e.clientX - rect.left) / zoom);
      const cardY = Math.round((e.clientY - rect.top) / zoom);
      setGuides(gs => {
        const pending = gs.find(g => g.id === '__pending__');
        const pos = creatingGuide === 'v'
          ? Math.max(0, Math.min(230, cardX))
          : Math.max(0, Math.min(365, cardY));
        if (pending) return gs.map(g => g.id === '__pending__' ? { ...g, pos } : g);
        return [...gs, { id: '__pending__', type: creatingGuide, pos }];
      });
      return;
    }

    if (isPanning) {
      setPan(p => ({ x: p.x + (e.clientX - panStart.x), y: p.y + (e.clientY - panStart.y) }));
      setPanStart({ x: e.clientX, y: e.clientY }); return;
    }
    if (resizing) {
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      const h = resizing.handle;
      const u: Partial<CardElementPosition> = {};
      if (h.includes('e')) u.width = Math.max(10, resizeStartRef.current.w + dx);
      if (h.includes('s')) u.height = Math.max(10, resizeStartRef.current.h + dy);
      if (h.includes('w')) { u.x = resizeStartRef.current.elX + dx; u.width = Math.max(10, resizeStartRef.current.w - dx); }
      if (h.includes('n')) { u.y = resizeStartRef.current.elY + dy; u.height = Math.max(10, resizeStartRef.current.h - dy); }
      updatePos(resizing.key, u); return;
    }
    if (!dragging || !cardRef.current) return;
    const el = elementsRef.current.find(el => el.element_key === dragging); if (!el) return;
    const cur = activeSideRef.current === 'front' ? el.front_position : el.back_position; if (!cur) return;

    // Deadzone: ignore small mouse movements to prevent accidental drags
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!dragActive) {
      if (dist < 3) return;
      setDragActive(true);
    }

    let nx = Math.max(0, Math.min(230 - cur.width, cur.x + dx));
    let ny = Math.max(0, Math.min(365 - cur.height, cur.y + dy));
    if (snapToGrid) { nx = Math.round(nx / gridSize) * gridSize; ny = Math.round(ny / gridSize) * gridSize; }
    // Smart guides: compute alignment guides against other elements
    const alignThreshold = 5;
    const draggedL = nx, draggedR = nx + cur.width, draggedCx = nx + cur.width / 2;
    const draggedT = ny, draggedB = ny + cur.height, draggedCy = ny + cur.height / 2;
    const allEdges: { l: number; r: number; cx: number; t: number; b: number; cy: number }[] = [];
    const draggableElements = elementsRef.current.filter(el => el.element_key !== dragging);
    draggableElements.forEach(el => {
      const p = activeSideRef.current === 'front' ? el.front_position : el.back_position;
      if (!p || !p.visible) return;
      allEdges.push({ l: p.x, r: p.x + p.width, cx: p.x + p.width / 2, t: p.y, b: p.y + p.height, cy: p.y + p.height / 2 });
    });
    const foundGuides: { type: 'v' | 'h'; pos: number; label?: string }[] = [];
    for (const e of allEdges) {
      // Vertical alignment — same-edge + cross-edge
      if (Math.abs(draggedL - e.l) < alignThreshold) foundGuides.push({ type: 'v', pos: e.l });
      else if (Math.abs(draggedL - e.r) < alignThreshold) foundGuides.push({ type: 'v', pos: e.r });
      else if (Math.abs(draggedR - e.r) < alignThreshold) foundGuides.push({ type: 'v', pos: e.r });
      else if (Math.abs(draggedR - e.l) < alignThreshold) foundGuides.push({ type: 'v', pos: e.l });
      else if (Math.abs(draggedCx - e.cx) < alignThreshold) foundGuides.push({ type: 'v', pos: e.cx });
      // Horizontal alignment — same-edge + cross-edge
      if (Math.abs(draggedT - e.t) < alignThreshold) foundGuides.push({ type: 'h', pos: e.t });
      else if (Math.abs(draggedT - e.b) < alignThreshold) foundGuides.push({ type: 'h', pos: e.b });
      else if (Math.abs(draggedB - e.b) < alignThreshold) foundGuides.push({ type: 'h', pos: e.b });
      else if (Math.abs(draggedB - e.t) < alignThreshold) foundGuides.push({ type: 'h', pos: e.t });
      else if (Math.abs(draggedCy - e.cy) < alignThreshold) foundGuides.push({ type: 'h', pos: e.cy });
    }
    smartGuidesRef.current = foundGuides;
    if (foundGuides.length !== smartGuides.length) {
      setSmartGuides(foundGuides);
    }

    // rAF-batched position update for smooth drag
    dragTargetRef.current = { key: dragging, x: nx, y: ny };
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(() => {
        const t = dragTargetRef.current;
        if (t) {
          setElements(prev => prev.map(el => {
            if (el.element_key !== t.key) return el;
            const side = activeSideRef.current;
            if (side === 'front') return { ...el, front_position: { ...el.front_position, x: t.x, y: t.y } };
            return el.back_position ? { ...el, back_position: { ...el.back_position, x: t.x, y: t.y } } : el;
          }));
        }
        dragRafRef.current = null;
      });
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, [dragging, resizing, isPanning, panStart, zoom, snapToGrid, gridSize, activeSide]);

  const handleMouseUp = useCallback(() => {
    if (dragging || resizing) saveToHistory(elementsRef.current);
    setDragging(null); setDragActive(false); setResizing(null); setIsPanning(false);
    setSmartGuides([]);
    smartGuidesRef.current = [];
    // Finalise guide creation — rename __pending__ to a real id
    if (creatingGuide) {
      setGuides(gs => gs.map(g => g.id === '__pending__' ? { ...g, id: crypto.randomUUID() } : g));
      setCreatingGuide(null);
    }
    setDraggingGuide(null);
  }, [dragging, resizing, saveToHistory, creatingGuide]);

  useEffect(() => {
    if (dragging || isPanning || resizing || draggingGuide || creatingGuide) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp, isPanning, resizing, draggingGuide, creatingGuide]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.25, Math.min(5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (spacePressed || e.target === e.currentTarget)) {
      e.preventDefault(); setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY });
    }
    if (e.target === e.currentTarget) setSelectedElement(null);
  };

  // ── Keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpacePressed(true); }
      if (e.code === 'Escape') { setToolMode('select'); setPreviewMode(false); setSelectedElement(null); }
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) setToolMode('select');
      if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) { addText(); }
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) setToolMode('rect');
      if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) setToolMode('circle');
      if (e.code === 'Delete' || (e.code === 'Backspace')) {
        const sel = selectedRef.current;
        if (sel) { const el = elementsRef.current.find(e => e.element_key === sel); if (el && el.element_type !== 'original') deleteElement(sel); }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        setHistory(h => { if (historyIndex > 0) { setHistoryIndex(i => i - 1); setElements(JSON.parse(JSON.stringify(h[historyIndex - 1]))); } return h; });
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        setHistory(h => { if (historyIndex < h.length - 1) { setHistoryIndex(i => i + 1); setElements(JSON.parse(JSON.stringify(h[historyIndex + 1]))); } return h; });
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedRef.current) {
        const el = elementsRef.current.find(i => i.element_key === selectedRef.current);
        if (el) { copiedRef.current = JSON.parse(JSON.stringify(el)); setCopiedElement(JSON.parse(JSON.stringify(el))); }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && copiedRef.current) {
        e.preventDefault();
        const src = copiedRef.current;
        const nel: CardLayoutElement = { ...JSON.parse(JSON.stringify(src)), id: crypto.randomUUID(), element_key: `${src.element_key}_copy_${Date.now()}` };
        if (nel.front_position) nel.front_position = { ...nel.front_position, x: nel.front_position.x + 10, y: nel.front_position.y + 10 };
        if (nel.back_position) nel.back_position = { ...nel.back_position, x: nel.back_position.x + 10, y: nel.back_position.y + 10 };
        const u = [...elementsRef.current, nel];
        setElements(u); saveToHistory(u); setSelectedElement(nel.element_key);
      }
      const sel = selectedRef.current;
      if (sel && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
        const el = elementsRef.current.find(el => el.element_key === sel); if (!el) return;
        const p = activeSideRef.current === 'front' ? el.front_position : el.back_position; if (!p) return;
        const mv = e.shiftKey ? 10 : 1;
        let nx = p.x, ny = p.y;
        if (e.code === 'ArrowUp') ny = Math.max(0, p.y - mv);
        if (e.code === 'ArrowDown') ny = Math.min(365 - p.height, p.y + mv);
        if (e.code === 'ArrowLeft') nx = Math.max(0, p.x - mv);
        if (e.code === 'ArrowRight') nx = Math.min(230 - p.width, p.x + mv);
        setElements(prev => prev.map(el => {
          if (el.element_key !== sel) return el;
          if (activeSideRef.current === 'front') return { ...el, front_position: { ...el.front_position, x: nx, y: ny } };
          return el.back_position ? { ...el, back_position: { ...el.back_position, x: nx, y: ny } } : el;
        }));
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpacePressed(false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [history, historyIndex, saveToHistory]);

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const getBgStyle = (bg: CardBackground): React.CSSProperties => {
    if (bg.type === 'gradient') return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
    if (bg.type === 'image') return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: bg.imageSize, backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
    if (bg.type === 'pattern') {
      const pat = BG_PATTERNS.find(p => p.id === (bg.patternId || 'diagonal'));
      if (pat) {
        const encoded = encodeURIComponent(pat.svg(bg.patternColor || '#000000', bg.patternOpacity ?? 0.4));
        return { backgroundColor: bg.color, backgroundImage: `url("data:image/svg+xml,${encoded}")` };
      }
    }
    if (bg.type === 'svg') {
      const src = bg.svgCode?.trim() || bg.svgUrl?.trim() || '';
      if (src) {
        const uri = src.startsWith('<') ? `url("data:image/svg+xml,${encodeURIComponent(src)}")` : `url(${src})`;
        return { backgroundColor: bg.color, backgroundImage: uri, backgroundSize: bg.imageSize || 'cover', backgroundPosition: 'center', backgroundRepeat: bg.imageSize === 'contain' ? 'no-repeat' : 'repeat' };
      }
    }
    return { backgroundColor: bg.color };
  };

  const renderShape = (shapeType: string | undefined, pos: CardElementPosition) => {
    const fill = pos.fillColor || '#3B82F6';
    const stroke = pos.borderColor || 'transparent';
    const sw = pos.borderWidth || 0;
    switch (shapeType) {
      case 'rect': return <div className="w-full h-full" style={{ backgroundColor: fill, border: sw > 0 ? `${sw}px ${pos.borderStyle || 'solid'} ${stroke}` : 'none', borderRadius: pos.borderRadius || 0 }} />;
      case 'circle': return <div className="w-full h-full rounded-full" style={{ backgroundColor: fill, border: sw > 0 ? `${sw}px ${pos.borderStyle || 'solid'} ${stroke}` : 'none' }} />;
      case 'triangle': return <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none"><polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
      case 'diamond': return <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none"><polygon points="50,5 95,50 50,95 5,50" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
      case 'star': return <svg viewBox="0 0 100 100" className="w-full h-full"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
      case 'line': return <svg viewBox="0 0 100 10" className="w-full h-full" preserveAspectRatio="none"><line x1="0" y1="5" x2="100" y2="5" stroke={fill} strokeWidth="10" /></svg>;
      case 'arrow': return <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none"><path d="M0,20 L80,20 M65,7 L80,20 L65,33" fill="none" stroke={fill} strokeWidth={sw || 3} strokeLinecap="round" /></svg>;
      case 'heart': return <svg viewBox="0 0 100 90" className="w-full h-full" preserveAspectRatio="none"><path d="M50,80 C50,80 5,50 5,25 C5,12 16,4 28,8 C36,11 50,24 50,24 C50,24 64,11 72,8 C84,4 95,12 95,25 C95,50 50,80 50,80Z" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
      default: return <div className="w-full h-full bg-gray-300 rounded" />;
    }
  };

  const branchInfo = branches[0];
  const sampleEmployee = { fullName: 'Yuva Subharam V', employeeId: 'CLOVE-2980', bloodGroup: 'O+', emergencyContact: '+91 94934 75556', photoUrl: 'https://res.cloudinary.com/dmoha80me/image/upload/v1778233161/pbrhz6fqut2t7k1q94tg.png' };

  const renderCardElement = (element: CardLayoutElement, side: 'front' | 'back') => {
    const position = side === 'front' ? element.front_position : element.back_position;
    if (!position) return null;
    if (!position.visible && !showHidden) return null;

    const isSelected = selectedElement === element.element_key && !previewMode;
    const isDraggable = isSelected;

    const getContent = () => {
      const isPreview = previewMode;
      if (element.element_type === 'text') {
        return (
          <span style={{ fontSize: position.fontSize, fontWeight: position.fontWeight, fontFamily: position.fontFamily || 'Inter', fontStyle: position.fontStyle || 'normal', textDecoration: position.textDecoration || 'none', textAlign: position.textAlign || 'left', letterSpacing: position.letterSpacing ? `${position.letterSpacing}px` : 'normal', lineHeight: position.lineHeight || 1.2, color: position.color || '#000', display: 'block', width: '100%' }}>
            {position.textContent || 'Text'}
          </span>
        );
      }
      if (element.element_type === 'image') {
        return position.imageUrl
          ? <img src={position.imageUrl} alt="" className="w-full h-full" style={{ objectFit: position.imageSize || 'cover', borderRadius: position.borderRadius || 0 }} crossOrigin="anonymous" />
          : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Image</div>;
      }
      if (element.element_type === 'shape') return renderShape(position.shapeType, position);

      // Original elements
      const baseKey = element.element_key.replace(/_copy_.*|_extra_.*/g, '');
      switch (baseKey) {
        case 'logo':
          return side === 'front'
            ? (branding.logo_id_front ? <img src={branding.logo_id_front} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" /> : <div className="text-center font-bold text-orange-600" style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui' }}>CLOVE</div>)
            : (branding.logo_id_back ? <img src={branding.logo_id_back} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" /> : <div className="text-center font-bold text-orange-600" style={{ fontSize: position.fontSize }}>CLOVE</div>);
        case 'fullName':
          return <span className="uppercase block w-full" style={{ fontSize: position.fontSize, fontWeight: position.fontWeight, fontFamily: position.fontFamily || 'system-ui', textAlign: position.textAlign || 'center', color: position.color }}>{isPreview ? sampleEmployee.fullName : getLabel(element.element_key, 'fullName', 'FULL NAME')}</span>;
        case 'photo':
          return isPreview
            ? <img src={sampleEmployee.photoUrl} alt="Employee" className="w-full h-full object-cover" crossOrigin="anonymous" />
            : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">{getLabel(element.element_key, 'photo', 'Photo Area')}</div>;
        case 'employeeId':
          return <div className="flex items-center" style={{ fontSize: position.fontSize, color: position.color }}><span className="font-bold shrink-0">{getLabel(element.element_key, 'employeeId', 'Emp ID')}</span><span className="mx-1">:</span><span className="truncate">{isPreview ? sampleEmployee.employeeId : '—'}</span></div>;
        case 'bloodGroup':
          return <div className="flex items-center" style={{ fontSize: position.fontSize, color: position.color }}><span className="font-bold shrink-0">{getLabel(element.element_key, 'bloodGroup', 'Blood Group')}</span><span className="mx-1">:</span><span>{isPreview ? sampleEmployee.bloodGroup : '—'}</span></div>;
        case 'emergencyContact':
          return <div className="flex items-center" style={{ fontSize: position.fontSize, color: position.color }}><span className="font-bold shrink-0">{getLabel(element.element_key, 'emergencyContact', 'Emergency No')}</span><span className="mx-1">:</span><span>{isPreview ? sampleEmployee.emergencyContact : '—'}</span></div>;
        case 'companyName':
          return <span style={{ fontSize: position.fontSize, fontWeight: position.fontWeight, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>{getLabel(element.element_key, 'companyName', 'Clove Technologies Pvt. Ltd.')}</span>;
        case 'companyAddress':
          return <span className="whitespace-pre-line" style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>{getLabel(element.element_key, 'companyAddress', '') || branchInfo?.address || branding.contact_address || 'Address'}</span>;
        case 'companyPhone':
          return <span style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>{getLabel(element.element_key, 'companyPhone', '') || `Tel: ${branchInfo?.phone || branding.contact_phone || '—'}`}</span>;
        case 'companyEmail':
          return <span style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>{getLabel(element.element_key, 'companyEmail', '') || branchInfo?.email || branding.contact_email || '—'}</span>;
        case 'companyWebsite':
          return <span style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>{getLabel(element.element_key, 'companyWebsite', '') || branchInfo?.website || branding.contact_website || '—'}</span>;
        case 'designLine':
          return <div className="w-full h-full" style={{ borderTop: position.borderStyle !== 'none' ? `${position.borderWidth || 1}px ${position.borderStyle || 'solid'} ${position.borderColor || '#FF6B35'}` : 'none', opacity: position.opacity || 1 }} />;
        case 'ifFoundText':
          return (
            <div className="space-y-0.5" style={{ fontSize: position.fontSize, fontFamily: position.fontFamily || 'system-ui', color: position.color }}>
              <div>{getLabel(element.element_key, 'ifFoundText', 'IF FOUND PLEASE RETURN TO')} :</div>
              <div className="font-bold">{getLabel(element.element_key + '_company', 'companyName', 'Clove Technologies Pvt. Ltd.')}</div>
              <div className="whitespace-pre-line leading-tight">{getLabel(element.element_key + '_addr', 'companyAddress', '') || branchInfo?.address || branding.contact_address || 'Address'}</div>
            </div>
          );
        default:
          return <span style={{ fontSize: position.fontSize, color: position.color }}>{element.display_name}</span>;
      }
    };

    if (!position.visible && showHidden) {
      return (
        <div key={element.element_key} className="absolute border-2 border-dashed border-red-400/60 bg-red-50/30 flex items-center justify-center cursor-pointer" style={{ left: position.x, top: position.y, width: position.width, height: position.height }} onClick={e => { e.stopPropagation(); setSelectedElement(element.element_key); }}>
          <div className="text-center"><EyeOff size={12} className="mx-auto text-red-400 mb-0.5" /><span className="text-[9px] text-red-400">{element.display_name}</span></div>
        </div>
      );
    }

    const shadow = position.shadowBlur ? `${position.shadowOffsetX || 0}px ${position.shadowOffsetY || 0}px ${position.shadowBlur}px ${position.shadowColor || 'rgba(0,0,0,0.2)'}` : undefined;
    const hasOverride = !!labelOverrides[element.element_key];
    const isEditableOriginal = element.element_type === 'original' && DEFAULT_LABELS[baseKey] !== undefined;

    return (
      <div
        key={element.element_key}
        className={`absolute group select-none ${isSelected ? 'z-10' : 'z-0'}`}
        style={{ left: position.x, top: position.y, width: position.width, height: position.height, opacity: position.opacity ?? 1, transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined, boxShadow: shadow, cursor: toolMode === 'select' ? (isDraggable ? 'move' : 'pointer') : 'default', outline: isSelected ? '2px solid #5b8dee' : 'none', outlineOffset: '1px' }}
        onMouseDown={e => handleElemMouseDown(e, element.element_key)}
        onClick={e => { e.stopPropagation(); if (toolMode === 'select') setSelectedElement(element.element_key); }}
        onDoubleClick={e => {
          e.stopPropagation();
          if (previewMode) return;
          if (element.element_type === 'text') {
            setEditingLabel(element.element_key);
            setEditingLabelValue(position.textContent || '');
          } else if (isEditableOriginal) {
            setEditingLabel(element.element_key);
            setEditingLabelValue(labelOverrides[element.element_key] ?? DEFAULT_LABELS[baseKey] ?? element.display_name);
          }
        }}
      >
        {/* Custom label indicator */}
        {!previewMode && hasOverride && (
          <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 z-10 border border-[#1a1a1a]" title={`Label override: "${labelOverrides[element.element_key]}"`} />
        )}
        {/* Double-click hint on hover for editable elements */}
        {!previewMode && (isEditableOriginal || element.element_type === 'text') && isSelected && (
          <div className="absolute -bottom-5 left-0 text-[8px] text-cyan-400 whitespace-nowrap pointer-events-none">⌥ dbl-click to edit label</div>
        )}
        {getContent()}
        {/* Inline label editor overlay */}
        {editingLabel === element.element_key && !previewMode && (
          <textarea
            autoFocus
            value={editingLabelValue}
            onChange={e => setEditingLabelValue(e.target.value)}
            onBlur={() => commitLabelEdit(element.element_key, element.element_type === 'text')}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitLabelEdit(element.element_key, element.element_type === 'text'); }
              if (e.key === 'Escape') setEditingLabel(null);
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            className="absolute inset-0 z-30 w-full h-full resize-none border-2 border-[#5b8dee] rounded focus:outline-none text-[10px] p-1 font-mono"
            style={{ backgroundColor: 'rgba(15,15,25,0.93)', color: '#93c5fd' }}
            placeholder="Type label…  Enter=save  Esc=cancel"
          />
        )}

        {/* Resize handles */}
        {isSelected && !previewMode && (['nw','n','ne','e','se','s','sw','w'] as const).map(h => {
          const styles: Record<string, React.CSSProperties> = {
            nw: { top: -4, left: -4, cursor: 'nw-resize' }, n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }, ne: { top: -4, right: -4, cursor: 'ne-resize' },
            e: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'e-resize' }, se: { bottom: -4, right: -4, cursor: 'se-resize' },
            s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }, sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
            w: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'w-resize' },
          };
          return (
            <div key={h} className="absolute w-2.5 h-2.5 bg-white border-2 border-[#5b8dee] rounded-sm z-20"
              style={styles[h]} onMouseDown={e => handleResizeMouseDown(e, element.element_key, h)} />
          );
        })}

        {/* Hover visibility badge */}
        {!previewMode && (
          <button
            onClick={e => { e.stopPropagation(); updatePos(element.element_key, { visible: !position.visible }); }}
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full flex items-center justify-center shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ backgroundColor: position.visible ? '#10B981' : '#EF4444' }}
            title={position.visible ? 'Hide' : 'Show'}
          >
            {position.visible ? <Eye size={10} className="text-white" /> : <EyeOff size={10} className="text-white" />}
          </button>
        )}
      </div>
    );
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    for (let x = gridSize; x < 230; x += gridSize) lines.push(<div key={`v${x}`} className="absolute top-0 bottom-0 border-l border-gray-200/30" style={{ left: x }} />);
    for (let y = gridSize; y < 365; y += gridSize) lines.push(<div key={`h${y}`} className="absolute left-0 right-0 border-t border-gray-200/30" style={{ top: y }} />);
    return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
  };

  const renderCrosshair = () => !showCrosshair ? null : (
    <>
      {/* Full-width horizontal line */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: mousePosition.y, height: 1, background: 'rgba(251,146,60,0.55)', transform: 'translateY(-0.5px)', zIndex: 45 }} />
      {/* Full-height vertical line */}
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: mousePosition.x, width: 1, background: 'rgba(251,146,60,0.55)', transform: 'translateX(-0.5px)', zIndex: 45 }} />
      {/* Corner dot */}
      <div className="absolute pointer-events-none" style={{ left: mousePosition.x - 3, top: mousePosition.y - 3, width: 7, height: 7, borderRadius: '50%', background: '#f97316', zIndex: 46 }} />
      {/* Coordinate label — flips left/above when near card edges */}
      <div className="absolute pointer-events-none z-50 select-none" style={{
        left: mousePosition.x > 175 ? mousePosition.x - 68 : mousePosition.x + 8,
        top:  mousePosition.y > 345 ? mousePosition.y - 22 : mousePosition.y + 8,
      }}>
        <span className="bg-[#1a1a1a]/90 border border-orange-500/40 text-orange-300 text-[9px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
          {mousePosition.x}, {mousePosition.y}
        </span>
      </div>
    </>
  );

  const renderSmartGuides = () => {
    if (previewMode || smartGuides.length === 0) return null;
    return smartGuides.map((sg, i) => (
      <div key={`sg-${i}`} className="absolute pointer-events-none" style={{ zIndex: 42 }}>
        <div
          className="absolute"
          style={sg.type === 'v'
            ? { left: sg.pos - 0.5, top: 0, bottom: 0, width: 1, background: '#f472b6', boxShadow: '0 0 4px rgba(244,114,182,0.6)' }
            : { top: sg.pos - 0.5, left: 0, right: 0, height: 1, background: '#f472b6', boxShadow: '0 0 4px rgba(244,114,182,0.6)' }
          }
        />
        {sg.label && (
          <div
            className="absolute"
            style={sg.type === 'v'
              ? { left: sg.pos + 3, top: 2, zIndex: 50 }
              : { top: sg.pos + 3, left: 2, zIndex: 50 }
            }
          >
            <span className="bg-pink-500/90 text-white text-[8px] px-1 py-0.5 rounded font-mono whitespace-nowrap shadow">
              {sg.label}
            </span>
          </div>
        )}
      </div>
    ));
  };

  const renderGuides = () => {
    if (!showGuides || previewMode) return null;
    return (
      <>
        {guides.map(g => {
          const isPending = g.id === '__pending__';
          const isDragging = draggingGuide === g.id;
          return (
            <React.Fragment key={g.id}>
              {/* Hit area (wider, invisible) */}
              <div
                className="absolute"
                style={g.type === 'v'
                  ? { left: g.pos - 4, top: 0, bottom: 0, width: 9, cursor: 'ew-resize', zIndex: 40 }
                  : { top: g.pos - 4, left: 0, right: 0, height: 9, cursor: 'ns-resize', zIndex: 40 }
                }
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDraggingGuide(g.id); }}
                onDoubleClick={e => { e.stopPropagation(); setGuides(gs => gs.filter(gg => gg.id !== g.id)); }}
              />
              {/* Visible guide line */}
              <div
                className="absolute pointer-events-none"
                style={g.type === 'v'
                  ? { left: g.pos - 0.5, top: 0, bottom: 0, width: 1.5, background: isDragging ? '#22d3ee' : (isPending ? '#67e8f9' : '#06b6d4'), opacity: isPending ? 0.8 : 1, zIndex: 40, boxShadow: '0 0 3px rgba(6,182,212,0.7)' }
                  : { top: g.pos - 0.5, left: 0, right: 0, height: 1.5, background: isDragging ? '#22d3ee' : (isPending ? '#67e8f9' : '#06b6d4'), opacity: isPending ? 0.8 : 1, zIndex: 40, boxShadow: '0 0 3px rgba(6,182,212,0.7)' }
                }
              />
              {/* Position badge */}
              {(isDragging || isPending) && (
                <div
                  className="absolute pointer-events-none select-none"
                  style={g.type === 'v'
                    ? { left: g.pos + 3, top: 4, zIndex: 50 }
                    : { top: g.pos + 3, left: 4, zIndex: 50 }
                  }
                >
                  <span className="bg-cyan-500 text-white text-[9px] px-1 py-0.5 rounded font-mono shadow">
                    {Math.round(g.pos)}px
                  </span>
                </div>
              )}
              {/* Static badge on non-dragging guides */}
              {!isDragging && !isPending && (
                <div
                  className="absolute pointer-events-none select-none opacity-0 group-hover:opacity-100"
                  style={g.type === 'v'
                    ? { left: g.pos + 2, top: 2, zIndex: 50 }
                    : { top: g.pos + 2, left: 2, zIndex: 50 }
                  }
                >
                  <span className="bg-cyan-600/80 text-white text-[8px] px-1 rounded font-mono">
                    {Math.round(g.pos)}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  // ── Current element & position ─────────────────────────────────────────────
  const currentEl  = elements.find(el => el.element_key === selectedElement);
  const currentPos = currentEl ? (activeSide === 'front' ? currentEl.front_position : currentEl.back_position) : null;
  const bg = activeSide === 'front' ? frontBg : backBg;
  const setBg = activeSide === 'front' ? setFrontBg : setBackBg;

  const toggleSection = (k: string) => setSections(s => ({ ...s, [k]: !s[k as keyof typeof s] }));

  const filteredFonts = GOOGLE_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#5b8dee]" />
    </div>
  );

  // ── Tool palette config ────────────────────────────────────────────────────
  const tools = [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select (V)', action: () => setToolMode('select') },
    null,
    { id: 'text', icon: <Type size={18} />, label: 'Text (T)', action: () => addText() },
    null,
    { id: 'rect', icon: <Square size={16} />, label: 'Rectangle (R)', action: () => { addShape('rect'); } },
    { id: 'circle', icon: <Circle size={16} />, label: 'Circle (C)', action: () => { addShape('circle'); } },
    { id: 'triangle', icon: <Triangle size={16} />, label: 'Triangle', action: () => { addShape('triangle'); } },
    { id: 'line', icon: <Minus size={16} />, label: 'Line', action: () => { addShape('line'); } },
    { id: 'diamond', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,12 12,22 2,12" /></svg>, label: 'Diamond', action: () => { addShape('diamond'); } },
    { id: 'star', icon: <Star size={16} />, label: 'Star', action: () => { addShape('star'); } },
    { id: 'arrow', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="16,6 22,12 16,18"/></svg>, label: 'Arrow', action: () => { addShape('arrow'); } },
    { id: 'heart', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21C12 21 3 14 3 8.5C3 6.01 5.01 4 7.5 4C9.09 4 10.5 4.82 11.37 6.06C11.69 6.52 12.31 6.52 12.63 6.06C13.5 4.82 14.91 4 16.5 4C18.99 4 21 6.01 21 8.5C21 14 12 21 12 21Z"/></svg>, label: 'Heart', action: () => { addShape('heart'); } },
    null,
    { id: 'image', icon: <ImageIcon size={16} />, label: 'Image (URL)', action: () => setShowImageImport(true) },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-white overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top Bar ── */}
      <div className="h-11 bg-[#252525] border-b border-[#363636] flex items-center px-3 gap-2 shrink-0 select-none">
        <button onClick={() => navigate('/settings/branding')} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#333] text-sm shrink-0">
          <ArrowLeft size={15} /> <span className="hidden lg:inline">Back</span>
        </button>
        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />
        <span className="text-sm font-semibold text-white mr-2 hidden sm:block">Card Editor</span>
        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />

        {/* Undo/Redo */}
        <button onClick={() => { if (historyIndex > 0) { setHistoryIndex(i => i - 1); setElements(JSON.parse(JSON.stringify(history[historyIndex - 1]))); } }} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)" className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333] disabled:opacity-30 transition-colors"><RotateCcw size={15} /></button>
        <button onClick={() => { if (historyIndex < history.length - 1) { setHistoryIndex(i => i + 1); setElements(JSON.parse(JSON.stringify(history[historyIndex + 1]))); } }} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)" className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333] disabled:opacity-30 transition-colors"><RotateCw size={15} /></button>
        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333] transition-colors"><ZoomOut size={15} /></button>
        <span className="text-xs text-gray-300 min-w-[40px] text-center font-mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333] transition-colors"><ZoomIn size={15} /></button>
        <button onClick={() => { setZoom(1.6); setPan({ x: 0, y: 0 }); }} title="Reset View" className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333] transition-colors text-xs px-2">Fit</button>
        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />

        {/* Grid / Snap */}
        <button onClick={() => setShowGrid(g => !g)} title="Toggle Grid" className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-[#5b8dee]/20 text-[#5b8dee]' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}><Grid3X3 size={15} /></button>
        <button onClick={() => setSnapToGrid(s => !s)} title="Snap to Grid" className={`p-1.5 rounded transition-colors text-xs px-2 ${snapToGrid ? 'bg-[#5b8dee]/20 text-[#5b8dee]' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}>Snap</button>
        <button onClick={() => setShowCrosshair(c => !c)} title="Cursor Crosshair" className={`p-1.5 rounded transition-colors ${showCrosshair ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}><Crosshair size={15} /></button>
        <button onClick={() => setShowGuides(g => !g)} title="Show/Hide Guides" className={`p-1.5 rounded transition-colors text-xs px-2 ${showGuides ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
        </button>
        {guides.length > 0 && (
          <button onClick={() => setGuides([])} title="Clear all guides" className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-[#333] transition-colors text-[10px] px-1.5">✕ guides</button>
        )}
        <button onClick={() => setShowHidden(h => !h)} title="Show Hidden" className={`p-1.5 rounded transition-colors ${showHidden ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}><EyeOff size={15} /></button>
        <div className="w-px h-5 bg-[#3a3a3a] mx-1" />

        <div className="flex-1" />

        {/* Preview + Save */}
        <button onClick={() => setPreviewMode(p => !p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${previewMode ? 'bg-emerald-600 text-white' : 'bg-[#333] text-gray-300 hover:bg-[#444]'}`}>
          {previewMode ? <><Eye size={14} /> Preview</> : <><EyeOff size={14} /> Preview</>}
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5b8dee] hover:bg-[#4a7de0] text-white rounded text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setShowTemplateGallery(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors relative">
          <Layers size={14} />Templates
          {templates.some(t => t.is_active) && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#5b8dee]" />}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Tools Panel ── */}
        <div className="w-14 bg-[#252525] border-r border-[#363636] flex flex-col items-center py-2 gap-0.5 shrink-0 overflow-y-auto">
          {tools.map((t, i) => t === null
            ? <div key={i} className="w-8 h-px bg-[#3a3a3a] my-1" />
            : (
              <button key={t.id} onClick={t.action} title={t.label}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${toolMode === t.id ? 'bg-[#5b8dee]/20 text-[#5b8dee]' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}>
                {t.icon}
              </button>
            )
          )}
        </div>

        {/* ── Center Canvas ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
          {/* Side tabs + alignment bar */}
          <div className="h-10 bg-[#222] border-b border-[#363636] flex items-center px-4 gap-2 shrink-0">
            <button onClick={() => { setActiveSide('front'); setSelectedElement(null); }} className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${activeSide === 'front' ? 'bg-[#5b8dee] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}><Layers size={13} /> Front</button>
            <button onClick={() => { setActiveSide('back'); setSelectedElement(null); }} className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${activeSide === 'back' ? 'bg-[#5b8dee] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}><Layers size={13} /> Back</button>
            <div className="w-px h-5 bg-[#3a3a3a] mx-1" />
            {/* Alignment */}
            {selectedElement && (
              <>
                <span className="text-[10px] text-gray-500 uppercase mr-1">Align</span>
                {[['left','Align Left',<AlignLeft size={13}/>],['center-h','Center H',<AlignCenter size={13}/>],['right','Align Right',<AlignRight size={13}/>],['top','Align Top',<AlignStartVertical size={13}/>],['center-v','Center V',<AlignCenterVertical size={13}/>],['bottom','Align Bottom',<AlignEndVertical size={13}/>]].map(([dir, title, icon]) => (
                  <button key={dir as string} onClick={() => align(dir as string)} title={title as string} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors">{icon}</button>
                ))}
                <div className="w-px h-5 bg-[#3a3a3a] mx-1" />
                {currentEl?.element_type !== 'original' && (
                  <button onClick={() => deleteElement(selectedElement!)} title="Delete element" className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={13} /></button>
                )}
                <button onClick={() => { const el = elements.find(e => e.element_key === selectedElement); if (el) { copiedRef.current = JSON.parse(JSON.stringify(el)); setCopiedElement(JSON.parse(JSON.stringify(el))); toast.success('Copied'); } }} title="Copy (Ctrl+C)" className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"><Copy size={13} /></button>
              </>
            )}
            <div className="flex-1" />
            <select value={gridSize} onChange={e => setGridSize(parseInt(e.target.value))} className="bg-[#1e1e1e] border border-[#3a3a3a] text-gray-300 text-xs px-2 py-1 rounded">
              <option value={5}>5px</option><option value={10}>10px</option><option value={20}>20px</option><option value={25}>25px</option>
            </select>
            <button onClick={() => { const defs: Record<string, Partial<CardElementPosition>> = { logo: { x: 65, y: 10, width: 100, height: 30 }, fullName: { x: 15, y: 55, width: 200, height: 20 }, photo: { x: 0, y: 89, width: 230, height: 200 }, employeeId: { x: 10, y: 90, width: 80, height: 10 }, bloodGroup: { x: 120, y: 90, width: 100, height: 10 }, emergencyContact: { x: 10, y: 105, width: 150, height: 10 }, designLine: { x: 0, y: 45, width: 230, height: 3 } }; setElements(prev => prev.map(el => ({ ...el, front_position: el.front_position ? { ...el.front_position, ...(defs[el.element_key] || {}) } : el.front_position }))); toast.success('Reset to defaults'); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors" title="Reset layout"><RefreshCw size={13} /></button>
          </div>

          {/* Ruler + Infinite canvas */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Top ruler */}
            <div className="flex shrink-0 select-none" style={{ height: 20 }}>
              {/* Corner square */}
              <div className="shrink-0 bg-[#1e1e1e] border-r border-b border-[#3a3a3a] flex items-center justify-center" style={{ width: 20 }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
              </div>
              {/* Horizontal ruler strip — drag down to create vertical guide */}
              <div
                className="flex-1 relative bg-[#1e1e1e] border-b border-[#3a3a3a] overflow-hidden"
                style={{ cursor: 'col-resize' }}
                onMouseDown={e => { e.preventDefault(); setCreatingGuide('v'); }}
                title="Drag down to add vertical guide"
              >
                {/* Dynamic tick marks — LOD based on zoom */}
                {(() => {
                  const tickStep = zoom < 0.5 ? 50 : zoom < 1 ? 25 : zoom < 2.5 ? 10 : 5;
                  const labelStep = zoom < 0.5 ? 100 : zoom < 1 ? 50 : 25;
                  const ticks = [];
                  for (let px = 0; px <= 230; px += tickStep) {
                    ticks.push(
                      <div key={px} className="absolute top-0 flex flex-col items-center pointer-events-none" style={{ left: px * zoom + (canvasWrapperRef.current ? (canvasWrapperRef.current.clientWidth / 2 - 115 * zoom) : 0) + pan.x }}>
                        <div className="bg-[#888]" style={{ width: 1, height: px % labelStep === 0 ? 8 : 4 }} />
                        {px % labelStep === 0 && <span className="text-[8px] text-[#aaa] mt-0.5 font-mono" style={{ marginLeft: 2 }}>{px}</span>}
                      </div>
                    );
                  }
                  return ticks;
                })()}
                {/* Pending/creating guide preview on ruler */}
                {creatingGuide === 'v' && guides.find(g => g.id === '__pending__') && (
                  <div className="absolute top-0 bottom-0 w-px bg-cyan-400 pointer-events-none"
                    style={{ left: guides.find(g => g.id === '__pending__')!.pos * zoom + (canvasWrapperRef.current ? (canvasWrapperRef.current.clientWidth / 2 - 115 * zoom) : 0) + pan.x }} />
                )}
              </div>
            </div>

            {/* Body: left ruler + canvas */}
            <div className="flex flex-1 overflow-hidden" ref={canvasWrapperRef}>
              {/* Left ruler strip — drag right to create horizontal guide */}
              <div
                className="shrink-0 relative bg-[#1e1e1e] border-r border-[#3a3a3a] overflow-hidden"
                style={{ width: 20, cursor: 'row-resize' }}
                onMouseDown={e => { e.preventDefault(); setCreatingGuide('h'); }}
                title="Drag right to add horizontal guide"
              >
                {(() => {
                  const tickStep = zoom < 0.5 ? 50 : zoom < 1 ? 25 : zoom < 2.5 ? 10 : 5;
                  const labelStep = zoom < 0.5 ? 100 : zoom < 1 ? 50 : 25;
                  const ticks = [];
                  for (let py = 0; py <= 365; py += tickStep) {
                    ticks.push(
                      <div key={py} className="absolute left-0 flex items-center pointer-events-none" style={{ top: py * zoom + (canvasWrapperRef.current ? (canvasWrapperRef.current.clientHeight / 2 - 182.5 * zoom) : 0) + pan.y }}>
                        <div className="bg-[#888]" style={{ height: 1, width: py % labelStep === 0 ? 8 : 4 }} />
                        {py % labelStep === 0 && (
                          <span className="text-[8px] text-[#aaa] font-mono absolute pointer-events-none" style={{ left: 1, top: 1, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 7 }}>{py}</span>
                        )}
                      </div>
                    );
                  }
                  return ticks;
                })()}
                {/* Pending guide preview on left ruler */}
                {creatingGuide === 'h' && guides.find(g => g.id === '__pending__') && (
                  <div className="absolute left-0 right-0 h-px bg-cyan-400 pointer-events-none"
                    style={{ top: guides.find(g => g.id === '__pending__')!.pos * zoom + (canvasWrapperRef.current ? (canvasWrapperRef.current.clientHeight / 2 - 182.5 * zoom) : 0) + pan.y }} />
                )}
              </div>

              {/* Main canvas viewport */}
              <div
                className="flex-1 overflow-hidden relative"
                style={{ cursor: creatingGuide ? 'crosshair' : isPanning ? 'grabbing' : spacePressed ? 'grab' : (toolMode !== 'select' ? 'crosshair' : 'default') }}
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
              >
                {/* Dot-grid background */}
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #3a3a3a 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {/* Card wrapper */}
                <div className="absolute" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center center' }}>
                  {/* Card shadow glow */}
                  <div className="absolute inset-0" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px rgba(0,0,0,0.6)', borderRadius: 8, transform: 'translate(0, 4px)', filter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }} />
                  <div
                    ref={cardRef}
                    className="relative overflow-hidden group"
                    style={{ width: 230, height: 365, borderRadius: 8, ...getBgStyle(bg) }}
                    onClick={e => { if (e.target === e.currentTarget) setSelectedElement(null); }}
                    onMouseMove={e => {
                      // Passive crosshair tracking — skip if window listener already handles during drags
                      if (dragging || isPanning || resizing || draggingGuide || creatingGuide) return;
                      if (rafRef.current) return;
                      const cx = e.clientX, cy = e.clientY;
                      rafRef.current = requestAnimationFrame(() => {
                        const rect = cardRef.current?.getBoundingClientRect();
                        if (rect) setMousePosition({ x: Math.max(0, Math.min(230, Math.round((cx - rect.left) / zoom))), y: Math.max(0, Math.min(365, Math.round((cy - rect.top) / zoom))) });
                        rafRef.current = null;
                      });
                    }}
                  >
                    {renderGrid()}
                    {renderGuides()}
                    {renderSmartGuides()}
                    {renderCrosshair()}
                    {previewMode && <div className="absolute inset-0 z-20 rounded-lg overflow-hidden" style={{ ...getBgStyle(bg) }}>{elements.filter(el => activeSide === 'front' || el.back_position).map(el => renderCardElement(el, activeSide))}</div>}
                    {!previewMode && elements.filter(el => activeSide === 'front' || el.back_position).map(el => renderCardElement(el, activeSide))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="h-6 bg-[#1e1e1e] border-t border-[#363636] flex items-center px-4 text-[10px] text-gray-500 gap-4 shrink-0">
            <span>230 × 365 px</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>X: {mousePosition.x} Y: {mousePosition.y}</span>
            {selectedElement && currentPos && <span className="text-[#5b8dee]">{currentEl?.display_name} — {Math.round(currentPos.x)}, {Math.round(currentPos.y)} — {Math.round(currentPos.width)} × {Math.round(currentPos.height)}</span>}
            <span className="ml-auto">V · Select &nbsp; T · Text &nbsp; R · Rect &nbsp; C · Circle &nbsp; Del · Delete &nbsp; Ctrl+Z · Undo</span>
          </div>
        </div>

        {/* ── Right Properties Panel ── */}
        <div className="bg-[#252525] border-l border-[#363636] flex flex-col overflow-hidden shrink-0 relative" style={{ width: rightPanelWidth }}>
          {/* VS Code-style resize handle on left edge */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 group hover:bg-[#5b8dee]/40 transition-colors"
            onMouseDown={e => { e.preventDefault(); panelResizingRef.current = true; panelResizeStartX.current = e.clientX; panelResizeStartW.current = rightPanelWidth; }}
            title="Drag to resize panel"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[#444] group-hover:bg-[#5b8dee] transition-colors" />
          </div>
          {/* Tabs */}
          <div className="flex border-b border-[#363636] shrink-0 pl-1">
            {[['props', 'Props', <Settings size={11} />], ['bg', 'Background', <Palette size={11} />], ['layers', 'Layers', <LayersIcon size={11} />]].map(([id, label, icon]) => (
              <button key={id as string} onClick={() => setRightTab(id as any)} className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${rightTab === id ? 'border-[#5b8dee] text-[#5b8dee]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {icon as React.ReactNode}{label as string}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── PROPERTIES TAB ── */}
            {rightTab === 'props' && (
              <>
                {selectedElement && currentPos ? (
                  <>
                    {/* Element header */}
                    <div className="px-4 py-2.5 bg-[#2e2e2e] border-b border-[#363636] flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">{currentEl?.display_name}</span>
                      <button onClick={() => setSelectedElement(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                    </div>

                    {/* Position */}
                    <Section title="Position & Size" open={sections.position} onToggle={() => toggleSection('position')}>
                      <div className="grid grid-cols-2 gap-2">
                        <NumInput label="X" value={currentPos.x} onChange={v => updatePos(selectedElement!, { x: v })} min={-500} max={730} />
                        <NumInput label="Y" value={currentPos.y} onChange={v => updatePos(selectedElement!, { y: v })} min={-500} max={865} />
                        <NumInput label="Width" value={currentPos.width} onChange={v => updatePos(selectedElement!, { width: Math.max(1, v) })} min={1} />
                        <NumInput label="Height" value={currentPos.height} onChange={v => updatePos(selectedElement!, { height: Math.max(1, v) })} min={1} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <NumInput label="Rotation" value={currentPos.rotation || 0} onChange={v => updatePos(selectedElement!, { rotation: v })} min={-360} max={360} suffix="°" />
                        <NumInput label="Opacity" value={(currentPos.opacity || 1) * 100} onChange={v => updatePos(selectedElement!, { opacity: v / 100 })} min={0} max={100} suffix="%" />
                      </div>
                      {/* Alignment shortcuts */}
                      <Label>Align to canvas</Label>
                      <div className="flex gap-1 flex-wrap">
                        {[['left','L',<AlignLeft size={10}/>],['center-h','CH',<AlignCenter size={10}/>],['right','R',<AlignRight size={10}/>],['top','T',<AlignStartVertical size={10}/>],['center-v','CV',<AlignCenterVertical size={10}/>],['bottom','B',<AlignEndVertical size={10}/>]].map(([d,l,ic]) => (
                          <button key={d as string} onClick={() => align(d as string)} title={l as string} className="flex items-center gap-0.5 px-1.5 py-1 bg-[#1e1e1e] border border-[#3a3a3a] rounded text-gray-400 hover:text-white hover:border-[#5b8dee] text-[10px] transition-colors">{ic as React.ReactNode}</button>
                        ))}
                      </div>
                    </Section>

                    {/* Typography — shown for text/original elements */}
                    {(currentEl?.element_type === 'text' || currentEl?.element_type === 'original') && (
                      <Section title="Typography" open={sections.typography} onToggle={() => toggleSection('typography')}>
                        {/* Font family */}
                        <Label>Font Family</Label>
                        <button onClick={() => { setShowFontPicker(true); setFontSearch(''); if (currentPos.fontFamily) loadGoogleFont(currentPos.fontFamily); }}
                          className="w-full flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border border-[#444] rounded text-sm text-gray-200 hover:border-[#5b8dee] transition-colors">
                          <span style={{ fontFamily: currentPos.fontFamily || 'Inter' }}>{currentPos.fontFamily || 'Inter'}</span>
                          <ChevronDown size={12} className="text-gray-500" />
                        </button>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <NumInput label="Size" value={currentPos.fontSize} onChange={v => updatePos(selectedElement!, { fontSize: Math.max(6, v) })} min={6} max={72} suffix="px" />
                          <div>
                            <Label>Weight</Label>
                            <select value={currentPos.fontWeight} onChange={e => updatePos(selectedElement!, { fontWeight: e.target.value })} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none">
                              <option value="300">Light</option><option value="normal">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="bold">Bold</option><option value="800">ExtraBold</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <NumInput label="Letter Spacing" value={currentPos.letterSpacing || 0} onChange={v => updatePos(selectedElement!, { letterSpacing: v })} step={0.5} suffix="px" />
                          <NumInput label="Line Height" value={currentPos.lineHeight || 1.2} onChange={v => updatePos(selectedElement!, { lineHeight: v })} step={0.1} min={0.5} max={4} />
                        </div>

                        {/* Style toggles */}
                        <Label>Style</Label>
                        <div className="flex gap-1">
                          {[['fontStyle','italic',<Italic size={12}/>,'I'],['textDecoration','underline',<Underline size={12}/>,'U'],['textDecoration','line-through',<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><path d="M17.5 6.5C17.5 4.5 16 3 14 3h-4C7.5 3 6 4.5 6 6.5C6 8.5 7.5 10 10 10h4c2.5 0 4 1.5 4 3.5C18 15.5 16.5 17 14 17h-4c-2 0-3.5-1.5-3.5-3.5"/></svg>,'S']].map(([prop, val, icon, lbl]) => {
                            const isActive = currentPos[prop as keyof CardElementPosition] === val;
                            return (
                              <button key={`${prop}-${val}`} onClick={() => updatePos(selectedElement!, { [prop as string]: isActive ? 'none' : val } as any)}
                                className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center transition-colors ${isActive ? 'bg-[#5b8dee]/20 text-[#5b8dee] border border-[#5b8dee]/40' : 'bg-[#1e1e1e] border border-[#444] text-gray-400 hover:text-white'}`}>
                                {icon}
                              </button>
                            );
                          })}
                        </div>

                        <Label>Align</Label>
                        <div className="flex gap-1">
                          {(['left','center','right'] as const).map(a => (
                            <button key={a} onClick={() => updatePos(selectedElement!, { textAlign: a })} className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${currentPos.textAlign === a ? 'bg-[#5b8dee]/20 text-[#5b8dee] border border-[#5b8dee]/40' : 'bg-[#1e1e1e] border border-[#444] text-gray-400 hover:text-white'}`}>
                              {a === 'left' ? <AlignLeft size={12}/> : a === 'center' ? <AlignCenter size={12}/> : <AlignRight size={12}/>}
                            </button>
                          ))}
                        </div>

                        {/* Text color */}
                        <Label>Text Color</Label>
                        <div className="flex gap-1 flex-wrap mb-1">
                          {TEXT_COLORS.map(c => (
                            <button key={c} onClick={() => updatePos(selectedElement!, { color: c })} className={`w-5 h-5 rounded-full border-2 transition-all ${currentPos.color === c ? 'border-[#5b8dee] scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c, outline: c === '#ffffff' ? '1px solid #555' : 'none' }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="color" value={currentPos.color || '#000000'} onChange={e => updatePos(selectedElement!, { color: e.target.value })} className="w-8 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
                          <input type="text" value={currentPos.color || '#000000'} onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && updatePos(selectedElement!, { color: e.target.value })} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none font-mono" placeholder="#000000" />
                        </div>

                        {/* Text content for custom text */}
                        {currentEl?.element_type === 'text' && (
                          <>
                            <Label>Content</Label>
                            <textarea value={currentPos.textContent || ''} onChange={e => updatePos(selectedElement!, { textContent: e.target.value })} rows={3} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none resize-none" placeholder="Enter text…" />
                          </>
                        )}
                      </Section>
                    )}

                    {/* Fill / Shape style */}
                    {(currentEl?.element_type === 'shape' || currentEl?.element_type === 'image') && (
                      <Section title="Fill & Stroke" open={sections.fill} onToggle={() => toggleSection('fill')}>
                        <Label>Fill Color</Label>
                        <div className="flex gap-1 flex-wrap mb-1">
                          {SHAPE_COLORS.map(c => (
                            <button key={c} onClick={() => updatePos(selectedElement!, { fillColor: c })} className={`w-5 h-5 rounded-full border-2 transition-all ${currentPos.fillColor === c ? 'border-[#5b8dee] scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c, outline: c === '#ffffff' ? '1px solid #555' : 'none' }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="color" value={currentPos.fillColor || '#3B82F6'} onChange={e => updatePos(selectedElement!, { fillColor: e.target.value })} className="w-8 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
                          <input type="text" value={currentPos.fillColor || '#3B82F6'} onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && updatePos(selectedElement!, { fillColor: e.target.value })} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded font-mono focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Stroke</Label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={currentPos.borderColor || '#000000'} onChange={e => updatePos(selectedElement!, { borderColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
                              <input type="text" value={currentPos.borderColor || '#000000'} onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && updatePos(selectedElement!, { borderColor: e.target.value })} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-1 py-1.5 rounded font-mono focus:outline-none" />
                            </div>
                          </div>
                          <NumInput label="Stroke Width" value={currentPos.borderWidth || 0} onChange={v => updatePos(selectedElement!, { borderWidth: v })} min={0} max={20} suffix="px" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <NumInput label="Corner Radius" value={currentPos.borderRadius || 0} onChange={v => updatePos(selectedElement!, { borderRadius: v })} min={0} suffix="px" />
                          <div>
                            <Label>Stroke Style</Label>
                            <select value={currentPos.borderStyle || 'solid'} onChange={e => updatePos(selectedElement!, { borderStyle: e.target.value as any })} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:outline-none">
                              <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option>
                            </select>
                          </div>
                        </div>
                        {/* Image URL if image type */}
                        {currentEl?.element_type === 'image' && (
                          <>
                            <Label>Image URL</Label>
                            <input type="text" value={currentPos.imageUrl || ''} onChange={e => updatePos(selectedElement!, { imageUrl: e.target.value })} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none" placeholder="https://…" />
                            <Label>Object Fit</Label>
                            <select value={currentPos.imageSize || 'cover'} onChange={e => updatePos(selectedElement!, { imageSize: e.target.value as any })} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:outline-none">
                              <option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option>
                            </select>
                          </>
                        )}
                      </Section>
                    )}

                    {/* Design line border settings for original elements */}
                    {currentEl?.element_type === 'original' && (
                      <Section title="Border & Line" open={sections.style} onToggle={() => toggleSection('style')}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Style</Label>
                            <select value={currentPos.borderStyle || 'none'} onChange={e => updatePos(selectedElement!, { borderStyle: e.target.value as any })} className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:outline-none">
                              <option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="double">Double</option>
                            </select>
                          </div>
                          <NumInput label="Width" value={currentPos.borderWidth || 1} onChange={v => updatePos(selectedElement!, { borderWidth: v })} min={1} max={10} suffix="px" />
                        </div>
                        <Label>Border Color</Label>
                        <div className="flex gap-1 flex-wrap mb-1">
                          {SHAPE_COLORS.map(c => (
                            <button key={c} onClick={() => updatePos(selectedElement!, { borderColor: c })} className={`w-5 h-5 rounded-full border-2 transition-all ${currentPos.borderColor === c ? 'border-[#5b8dee] scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c, outline: c === '#ffffff' ? '1px solid #555' : 'none' }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="color" value={currentPos.borderColor || '#000000'} onChange={e => updatePos(selectedElement!, { borderColor: e.target.value })} className="w-8 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
                          <input type="text" value={currentPos.borderColor || '#000000'} onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && updatePos(selectedElement!, { borderColor: e.target.value })} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded font-mono focus:outline-none" />
                        </div>
                      </Section>
                    )}

                    {/* Shadow */}
                    <Section title="Shadow" open={sections.shadow} onToggle={() => toggleSection('shadow')}>
                      <div className="grid grid-cols-2 gap-2">
                        <NumInput label="Blur" value={currentPos.shadowBlur || 0} onChange={v => updatePos(selectedElement!, { shadowBlur: v })} min={0} max={50} suffix="px" />
                        <div>
                          <Label>Color</Label>
                          <input type="color" value={currentPos.shadowColor?.replace(/rgba?\([^)]+\)/,'') || '#000000'} onChange={e => updatePos(selectedElement!, { shadowColor: e.target.value + '66' })} className="w-full h-7 rounded cursor-pointer bg-transparent border border-[#444]" />
                        </div>
                        <NumInput label="Offset X" value={currentPos.shadowOffsetX || 0} onChange={v => updatePos(selectedElement!, { shadowOffsetX: v })} suffix="px" />
                        <NumInput label="Offset Y" value={currentPos.shadowOffsetY || 0} onChange={v => updatePos(selectedElement!, { shadowOffsetY: v })} suffix="px" />
                      </div>
                    </Section>

                    {/* Visibility */}
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#363636]">
                      <span className="text-xs text-gray-300 font-medium">Visible</span>
                      <button onClick={() => updatePos(selectedElement!, { visible: !currentPos.visible })} className={`relative w-10 h-5 rounded-full transition-colors ${currentPos.visible ? 'bg-[#5b8dee]' : 'bg-[#444]'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${currentPos.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Move size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Select an element on the canvas</p>
                    <p className="text-[10px] mt-1 text-gray-600">or use the tools on the left to add shapes, text, and images</p>
                  </div>
                )}
              </>
            )}

            {/* ── BACKGROUND TAB ── */}
            {rightTab === 'bg' && (
              <div className="p-3 space-y-3">

                {/* Live preview strip */}
                <div className="h-16 rounded-lg border border-[#444] overflow-hidden relative" style={getBgStyle(bg)}>
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-white/60 bg-black/30 px-1.5 py-0.5 rounded">{activeSide} · {bg.type}</div>
                </div>

                {/* Type selector — 2 rows of chips */}
                <div>
                  <Label>Type</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { id: 'solid',    icon: <Palette size={10} />,   label: 'Solid'    },
                      { id: 'gradient', icon: <RefreshCw size={10} />, label: 'Gradient' },
                      { id: 'image',    icon: <ImageIcon size={10} />, label: 'Image'    },
                      { id: 'pattern',  icon: <Shapes size={10} />,    label: 'Pattern'  },
                      { id: 'svg',      icon: <Code2 size={10} />,     label: 'SVG'      },
                    ] as const).map(({ id, icon, label }) => (
                      <button key={id} onClick={() => setBg(b => ({ ...b, type: id }))}
                        className={`flex flex-col items-center gap-0.5 py-1.5 rounded text-[9px] font-medium transition-colors ${bg.type === id ? 'bg-[#5b8dee] text-white' : 'bg-[#1e1e1e] border border-[#444] text-gray-400 hover:text-white hover:border-[#666]'}`}>
                        {icon}{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── SOLID ── */}
                {bg.type === 'solid' && (
                  <>
                    <Label>Color</Label>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {['#ffffff','#f8f9fa','#fff7ed','#eff6ff','#f0fdf4','#fdf4ff','#fff1f2','#1e293b',
                        '#000000','#374151','#dc2626','#ea580c','#ca8a04','#16a34a','#2563eb','#7c3aed'].map(c => (
                        <button key={c} onClick={() => setBg(b => ({ ...b, color: c }))}
                          className={`w-full aspect-square rounded border-2 transition-all ${bg.color === c ? 'border-[#5b8dee] scale-110' : 'border-[#333] hover:border-gray-400'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <input type="text" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                    </div>
                  </>
                )}

                {/* ── GRADIENT ── */}
                {bg.type === 'gradient' && (
                  <>
                    <div className="h-10 rounded-lg" style={{ background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>From</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={bg.gradientFrom} onChange={e => setBg(b => ({ ...b, gradientFrom: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                          <input type="text" value={bg.gradientFrom} onChange={e => setBg(b => ({ ...b, gradientFrom: e.target.value }))} className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#444] text-white text-[10px] px-1 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                        </div>
                      </div>
                      <div>
                        <Label>To</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={bg.gradientTo} onChange={e => setBg(b => ({ ...b, gradientTo: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                          <input type="text" value={bg.gradientTo} onChange={e => setBg(b => ({ ...b, gradientTo: e.target.value }))} className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#444] text-white text-[10px] px-1 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                        </div>
                      </div>
                    </div>
                    <NumInput label="Angle" value={bg.gradientAngle} onChange={v => setBg(b => ({ ...b, gradientAngle: v }))} min={0} max={360} suffix="°" />
                    <Label>Presets</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { from:'#667eea', to:'#764ba2', angle:135 }, { from:'#f093fb', to:'#f5576c', angle:135 },
                        { from:'#4facfe', to:'#00f2fe', angle:135 }, { from:'#43e97b', to:'#38f9d7', angle:135 },
                        { from:'#fa709a', to:'#fee140', angle:135 }, { from:'#a18cd1', to:'#fbc2eb', angle:135 },
                        { from:'#fccb90', to:'#d57eeb', angle:135 }, { from:'#fff1eb', to:'#ace0f9', angle:135 },
                        { from:'#f48120', to:'#e63946', angle:135 }, { from:'#1e3a5f', to:'#0ea5e9', angle:135 },
                      ].map((g, i) => (
                        <button key={i} onClick={() => setBg(b => ({ ...b, type: 'gradient', gradientFrom: g.from, gradientTo: g.to, gradientAngle: g.angle }))}
                          className="h-8 rounded border-2 border-[#333] hover:border-[#5b8dee] transition-colors"
                          style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }} />
                      ))}
                    </div>
                  </>
                )}

                {/* ── IMAGE ── */}
                {bg.type === 'image' && (
                  <>
                    {/* Upload from device → Drive */}
                    <div className="border border-dashed border-[#444] rounded-lg p-3 text-center hover:border-[#5b8dee] transition-colors relative">
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async e => {
                          const file = e.target.files?.[0]; if (!file) return;
                          setBgUploadLoading(true);
                          try {
                            const url = await uploadTemplateBgToDrive(file);
                            setBg(b => ({ ...b, imageUrl: url, imageSize: 'cover' }));
                            toast.success('Image uploaded to Drive / template folder');
                          } catch (err: any) {
                            // Fallback: local object URL if Drive fails
                            const localUrl = URL.createObjectURL(file);
                            setBg(b => ({ ...b, imageUrl: localUrl, imageSize: 'cover' }));
                            toast.warning('Drive upload failed — using local preview');
                          } finally { setBgUploadLoading(false); }
                        }}
                      />
                      {bgUploadLoading
                        ? <span className="text-xs text-[#5b8dee] flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin" />Uploading to Drive…</span>
                        : <span className="text-xs text-gray-500 flex items-center justify-center gap-1"><Upload size={12} />Upload image · saves to Drive/template</span>}
                    </div>
                    <Label>Or paste URL</Label>
                    <input type="text" value={bg.imageUrl} onChange={e => setBg(b => ({ ...b, imageUrl: e.target.value }))}
                      placeholder="https://..." className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded focus:border-[#5b8dee] focus:outline-none" />
                    {bg.imageUrl && <div className="h-20 rounded-lg border border-[#444] overflow-hidden"><img src={bg.imageUrl} alt="preview" className="w-full h-full object-cover" crossOrigin="anonymous" /></div>}
                    <Label>Fit</Label>
                    <div className="flex gap-1">
                      {(['cover','contain','fill'] as const).map(s => (
                        <button key={s} onClick={() => setBg(b => ({ ...b, imageSize: s }))} className={`flex-1 py-1 rounded text-[10px] capitalize transition-colors ${bg.imageSize === s ? 'bg-[#5b8dee] text-white' : 'bg-[#1e1e1e] border border-[#444] text-gray-400 hover:text-white'}`}>{s}</button>
                      ))}
                    </div>
                    <Label>Unsplash Picks</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
                        'https://images.unsplash.com/photo-1550684376-efcbd0a8c32e?w=400',
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
                        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
                        'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400',
                        'https://images.unsplash.com/photo-1464820453369-31d2c0b651af?w=400',
                      ].map(url => (
                        <button key={url} onClick={() => setBg(b => ({ ...b, imageUrl: url, imageSize: 'cover' }))} className="h-12 rounded overflow-hidden border-2 border-[#333] hover:border-[#5b8dee] transition-colors">
                          <img src={url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* ── PATTERN ── */}
                {bg.type === 'pattern' && (
                  <>
                    {/* Base color + pattern color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Base color</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                          <input type="text" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#444] text-white text-[10px] px-1 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                        </div>
                      </div>
                      <div>
                        <Label>Pattern color</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={bg.patternColor || '#f48120'} onChange={e => setBg(b => ({ ...b, patternColor: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                          <input type="text" value={bg.patternColor || '#f48120'} onChange={e => setBg(b => ({ ...b, patternColor: e.target.value }))} className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#444] text-white text-[10px] px-1 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Opacity</Label>
                      <input type="range" min={0.05} max={1} step={0.05} value={bg.patternOpacity ?? 0.4}
                        onChange={e => setBg(b => ({ ...b, patternOpacity: parseFloat(e.target.value) }))}
                        className="flex-1 accent-[#5b8dee]" />
                      <span className="text-[10px] text-gray-400 w-8 text-right font-mono">{Math.round((bg.patternOpacity ?? 0.4) * 100)}%</span>
                    </div>
                    <Label>Pattern style</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BG_PATTERNS.map(pat => {
                        const encoded = encodeURIComponent(pat.svg(bg.patternColor || '#f48120', bg.patternOpacity ?? 0.4));
                        const isActive = (bg.patternId || 'diagonal') === pat.id;
                        return (
                          <button key={pat.id} onClick={() => setBg(b => ({ ...b, patternId: pat.id }))}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded border-2 transition-all ${isActive ? 'border-[#5b8dee]' : 'border-[#333] hover:border-[#666]'}`}
                            style={{ backgroundColor: bg.color, backgroundImage: `url("data:image/svg+xml,${encoded}")` }}
                          >
                            <span className="text-[8px] font-medium mt-8 bg-black/50 text-white px-1 rounded">{pat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Custom SVG pattern code */}
                    <Label>Custom SVG data URL (optional)</Label>
                    <input type="text" value={bg.svgUrl || ''} onChange={e => setBg(b => ({ ...b, svgUrl: e.target.value }))}
                      placeholder='data:image/svg+xml,...'
                      className="w-full bg-[#1e1e1e] border border-[#444] text-white text-[10px] px-2 py-1.5 rounded font-mono focus:border-[#5b8dee] focus:outline-none" />
                    {bg.svgUrl && (
                      <button onClick={() => setBg(b => ({ ...b, type: 'svg', svgUrl: b.svgUrl }))}
                        className="w-full py-1 text-xs bg-[#1e1e1e] border border-[#5b8dee] text-[#5b8dee] rounded hover:bg-[#5b8dee]/10">
                        Apply as SVG background
                      </button>
                    )}
                  </>
                )}

                {/* ── SVG ── */}
                {bg.type === 'svg' && (
                  <>
                    <Label>Base color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <input type="text" value={bg.color} onChange={e => setBg(b => ({ ...b, color: e.target.value }))} className="flex-1 bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#5b8dee]" />
                    </div>
                    <Label>SVG URL</Label>
                    <input type="text" value={bg.svgUrl || ''} onChange={e => setBg(b => ({ ...b, svgUrl: e.target.value, svgCode: '' }))}
                      placeholder="https://example.com/pattern.svg"
                      className="w-full bg-[#1e1e1e] border border-[#444] text-white text-xs px-2 py-1.5 rounded font-mono focus:border-[#5b8dee] focus:outline-none" />
                    <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                      <div className="flex-1 h-px bg-[#333]" /><span>or paste SVG code</span><div className="flex-1 h-px bg-[#333]" />
                    </div>
                    <textarea value={bg.svgCode || ''} onChange={e => setBg(b => ({ ...b, svgCode: e.target.value, svgUrl: '' }))}
                      placeholder={'<svg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'>\n  <g fill=\'%23f48120\' fill-opacity=\'0.4\'>\n    <path d=\'M5 0h1L0 6V5zM6 5v1H5z\'/>\n  </g>\n</svg>'}
                      rows={6}
                      className="w-full bg-[#111] border border-[#444] text-[#a8ff78] text-[10px] px-2 py-2 rounded font-mono focus:border-[#5b8dee] focus:outline-none resize-y min-h-[80px]"
                    />
                    <Label>Fit</Label>
                    <div className="flex gap-1">
                      {(['cover','contain','fill'] as const).map(s => (
                        <button key={s} onClick={() => setBg(b => ({ ...b, imageSize: s }))} className={`flex-1 py-1 rounded text-[10px] capitalize transition-colors ${bg.imageSize === s ? 'bg-[#5b8dee] text-white' : 'bg-[#1e1e1e] border border-[#444] text-gray-400 hover:text-white'}`}>{s}</button>
                      ))}
                    </div>
                    {/* Quick SVG pattern examples */}
                    <Label>Quick patterns (click to apply)</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BG_PATTERNS.slice(0, 6).map(pat => {
                        const code = pat.svg('#f48120', 0.4);
                        const encoded = encodeURIComponent(code);
                        return (
                          <button key={pat.id}
                            onClick={() => setBg(b => ({ ...b, svgCode: pat.svg(b.patternColor || '#f48120', b.patternOpacity ?? 0.4), svgUrl: '' }))}
                            className="flex flex-col items-center gap-1 h-14 rounded border-2 border-[#333] hover:border-[#5b8dee] transition-all overflow-hidden"
                            style={{ backgroundColor: bg.color, backgroundImage: `url("data:image/svg+xml,${encoded}")` }}>
                            <span className="mt-auto text-[8px] font-medium bg-black/50 text-white px-1 rounded mb-1">{pat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Reset button */}
                <button onClick={() => setBg({ ...DEFAULT_BG })}
                  className="w-full py-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors border border-[#333] rounded hover:border-[#555]">
                  Reset to default
                </button>
              </div>
            )}

            {/* ── LAYERS TAB ── */}
            {rightTab === 'layers' && (() => {
              const allReversed = [...elements].reverse();

              // Partition into groups
              const activeVisible:   CardLayoutElement[] = [];
              const activeHidden:    CardLayoutElement[] = [];
              const frontOnlyElems:  CardLayoutElement[] = []; // back side — no back_position

              allReversed.forEach(el => {
                if (activeSide === 'back' && !el.back_position) {
                  frontOnlyElems.push(el); return;
                }
                const pos = activeSide === 'front' ? el.front_position : el.back_position;
                if (!pos) return;
                (pos.visible ? activeVisible : activeHidden).push(el);
              });

              // Count duplicates by display_name so we can badge them
              const nameCount: Record<string, number> = {};
              allReversed.forEach(el => { nameCount[el.display_name] = (nameCount[el.display_name] || 0) + 1; });
              const nameIndex: Record<string, number> = {};

              const typeIcon = (el: CardLayoutElement) => {
                const t = el.element_type || 'original';
                const colors: Record<string, string> = { shape:'#5b8dee', image:'#10B981', text:'#F59E0B', original:'#8B5CF6' };
                const icons: Record<string, React.ReactNode> = {
                  shape: <svg viewBox="0 0 10 10" width="9" height="9" fill={colors.shape}><rect x="1" y="1" width="8" height="8" rx="1"/></svg>,
                  image: <svg viewBox="0 0 10 10" width="9" height="9" fill={colors.image}><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke={colors.image} strokeWidth="1"/><circle cx="3" cy="3.5" r="1" fill={colors.image}/><path d="M0.5 7l3-3 2 2 1.5-1.5L9.5 7z" fill={colors.image}/></svg>,
                  text: <svg viewBox="0 0 10 10" width="9" height="9"><text x="1" y="8.5" fontSize="8" fontWeight="bold" fill={colors.text}>T</text></svg>,
                  original: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.original }} />,
                };
                return icons[t] || icons.original;
              };

              const LayerRow = ({ el, dim }: { el: CardLayoutElement; dim?: boolean }) => {
                const pos = activeSide === 'front' ? el.front_position : el.back_position;
                const isSelected = selectedElement === el.element_key;
                const isDuplicate = nameCount[el.display_name] > 1;
                nameIndex[el.display_name] = (nameIndex[el.display_name] || 0) + 1;
                const dupIdx = nameIndex[el.display_name];
                const isCustom = el.element_type !== 'original';

                return (
                  <div
                    onClick={() => { if (!dim) { setSelectedElement(el.element_key); setRightTab('props'); } }}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 transition-colors border-l-2 ${
                      dim ? 'opacity-40 cursor-default border-transparent' :
                      isSelected ? 'bg-[#5b8dee]/10 border-[#5b8dee] cursor-pointer' :
                      'hover:bg-[#2c2c2c] border-transparent cursor-pointer'
                    }`}
                  >
                    {/* Type icon */}
                    <span className="shrink-0 flex items-center justify-center w-4">{typeIcon(el)}</span>

                    {/* Name + duplicate badge */}
                    <span className={`flex-1 text-xs truncate ${isSelected ? 'text-[#7aaaff]' : dim ? 'text-gray-600' : 'text-gray-200'}`}>
                      {el.display_name}
                      {isDuplicate && <span className="ml-1 text-[9px] text-gray-600 font-mono">#{dupIdx}</span>}
                    </span>

                    {/* Position */}
                    {pos && !dim && (
                      <span className="text-[9px] text-gray-600 font-mono shrink-0 hidden group-hover:block">
                        {Math.round(pos.x)},{Math.round(pos.y)}
                      </span>
                    )}

                    {/* Actions */}
                    {!dim && pos && (
                      <button
                        onClick={e => { e.stopPropagation(); updatePos(el.element_key, { visible: !pos.visible }); }}
                        className="p-0.5 shrink-0 transition-colors text-gray-600 hover:text-white"
                        title={pos.visible ? 'Hide' : 'Show'}
                      >
                        {pos.visible ? <Eye size={11} className="text-green-400" /> : <EyeOff size={11} className="text-gray-500" />}
                      </button>
                    )}
                    {isCustom && !dim && (
                      <button onClick={e => { e.stopPropagation(); deleteElement(el.element_key); }} className="p-0.5 shrink-0 text-gray-700 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={11} /></button>
                    )}
                  </div>
                );
              };

              const GroupHeader = ({ label, count, color, icon }: { label: string; count: number; color: string; icon: React.ReactNode }) => (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2e2e2e] sticky top-0 bg-[#252525] z-10 select-none">
                  <span className="shrink-0">{icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>{label}</span>
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '22', color }}>{count}</span>
                </div>
              );

              return (
                <div>
                  {/* Summary bar */}
                  <div className="px-3 py-2 border-b border-[#2e2e2e] flex items-center gap-2 text-[10px] text-gray-500 select-none">
                    <span className="font-semibold text-white uppercase">{activeSide === 'front' ? 'Front' : 'Back'}</span>
                    <span>·</span>
                    <span className="text-green-400">{activeVisible.length} visible</span>
                    {activeHidden.length > 0 && <><span>·</span><span className="text-gray-500">{activeHidden.length} hidden</span></>}
                    {frontOnlyElems.length > 0 && <><span>·</span><span className="text-yellow-600">{frontOnlyElems.length} front only</span></>}
                    <span className="ml-auto text-gray-600">{elements.length} total</span>
                  </div>

                  {/* ── VISIBLE group ── */}
                  {activeVisible.length > 0 && (
                    <>
                      <GroupHeader
                        label="Active — Visible"
                        count={activeVisible.length}
                        color="#10B981"
                        icon={<Eye size={11} className="text-green-400" />}
                      />
                      {activeVisible.map(el => <LayerRow key={el.element_key} el={el} />)}
                    </>
                  )}

                  {/* ── HIDDEN group ── */}
                  {activeHidden.length > 0 && (
                    <>
                      <GroupHeader
                        label="Inactive — Hidden"
                        count={activeHidden.length}
                        color="#6b7280"
                        icon={<EyeOff size={11} className="text-gray-500" />}
                      />
                      {activeHidden.map(el => <LayerRow key={el.element_key} el={el} />)}
                    </>
                  )}

                  {/* ── FRONT-ONLY group (back side only) ── */}
                  {activeSide === 'back' && frontOnlyElems.length > 0 && (
                    <>
                      <GroupHeader
                        label="Front Only — No back layer"
                        count={frontOnlyElems.length}
                        color="#d97706"
                        icon={<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="#d97706" strokeWidth="1.5"><line x1="2" y1="6" x2="10" y2="6"/></svg>}
                      />
                      {frontOnlyElems.map(el => (
                        <div key={el.element_key} className="flex items-center gap-1.5 px-3 py-1.5 opacity-35 select-none">
                          <span className="shrink-0 flex items-center justify-center w-4">{typeIcon(el)}</span>
                          <span className="flex-1 text-xs text-gray-500 truncate">{el.display_name}</span>
                          <span className="text-[9px] text-yellow-700 font-mono">front only</span>
                        </div>
                      ))}
                    </>
                  )}

                  {activeVisible.length === 0 && activeHidden.length === 0 && frontOnlyElems.length === 0 && (
                    <div className="p-6 text-center text-gray-600 text-xs">No layers on {activeSide} side</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Save Style */}
          <div className="p-3 border-t border-[#363636] shrink-0">
            <button onClick={() => setShowSaveStyleModal(true)} className="w-full py-1.5 bg-[#333] hover:bg-[#3a3a3a] text-gray-300 hover:text-white text-xs rounded transition-colors flex items-center justify-center gap-1">
              <Save size={12} /> Save as Style Preset
            </button>
          </div>
        </div>
      </div>

      {/* ── Font Picker Modal ── */}
      {showFontPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#252525] border border-[#3a3a3a] rounded-xl w-80 max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#363636]">
              <span className="font-semibold text-white">Font Family</span>
              <button onClick={() => setShowFontPicker(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="px-4 py-2 border-b border-[#363636]">
              <input autoFocus type="text" value={fontSearch} onChange={e => setFontSearch(e.target.value)} placeholder="Search fonts…" className="w-full bg-[#1e1e1e] border border-[#444] text-white text-sm px-3 py-2 rounded focus:border-[#5b8dee] focus:outline-none" />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredFonts.map(font => {
                loadGoogleFont(font);
                return (
                  <button key={font} onClick={() => { updatePos(selectedElement!, { fontFamily: font }); setShowFontPicker(false); toast.success(`Font set to ${font}`); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-[#333] transition-colors flex items-center justify-between group ${currentPos?.fontFamily === font ? 'bg-[#5b8dee]/10 text-[#5b8dee]' : 'text-gray-300'}`}>
                    <span style={{ fontFamily: font }}>{font}</span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-400" style={{ fontFamily: font }}>Aa</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Import Modal ── */}
      {showImageImport && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#252525] border border-[#3a3a3a] rounded-xl w-96 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#363636]">
              <span className="font-semibold text-white">Import Image</span>
              <button onClick={() => { setShowImageImport(false); setImageImportUrl(''); }} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label>Image URL</Label>
                <input autoFocus type="text" value={imageImportUrl} onChange={e => setImageImportUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()} placeholder="https://example.com/image.jpg" className="w-full bg-[#1e1e1e] border border-[#444] text-white text-sm px-3 py-2 rounded focus:border-[#5b8dee] focus:outline-none" />
              </div>
              {imageImportUrl && (
                <div className="h-32 bg-[#1e1e1e] rounded-lg overflow-hidden flex items-center justify-center border border-[#444]">
                  <img src={imageImportUrl} alt="preview" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <p className="text-[10px] text-gray-500">Paste any public image URL. Supports JPG, PNG, WebP, SVG.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowImageImport(false); setImageImportUrl(''); }} className="flex-1 py-2 bg-[#333] hover:bg-[#3a3a3a] text-gray-300 rounded text-sm transition-colors">Cancel</button>
                <button onClick={addImage} className="flex-1 py-2 bg-[#5b8dee] hover:bg-[#4a7de0] text-white rounded text-sm font-medium transition-colors">Add Image</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Style Modal ── */}
      {showSaveStyleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#252525] border border-[#3a3a3a] rounded-xl w-80 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#363636]">
              <span className="font-semibold text-white">Save as Style</span>
              <button onClick={() => { setShowSaveStyleModal(false); setNewStyleName(''); }} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label>Style Name</Label>
                <input autoFocus type="text" value={newStyleName} onChange={e => setNewStyleName(e.target.value)} onKeyDown={async e => {
                  if (e.key === 'Enter' && newStyleName.trim()) {
                    try {
                      const { data, error } = await supabase.from('card_layout_styles').insert({ style_name: newStyleName, is_default: false, layout_data: elements.map(el => ({ element_key: el.element_key, display_name: el.display_name, front_position: el.front_position, back_position: el.back_position, card_side: el.card_side })) }).select();
                      if (error) throw error;
                      toast.success(`Style "${newStyleName}" saved`);
                      setShowSaveStyleModal(false); setNewStyleName(''); fetchSavedStyles();
                    } catch { toast.error('Failed to save style'); }
                  }
                }} placeholder="e.g., Corporate Blue, Minimal White" className="w-full bg-[#1e1e1e] border border-[#444] text-white text-sm px-3 py-2 rounded focus:border-[#5b8dee] focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowSaveStyleModal(false); setNewStyleName(''); }} className="flex-1 py-2 bg-[#333] hover:bg-[#3a3a3a] text-gray-300 rounded text-sm transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!newStyleName.trim()) { toast.error('Enter a style name'); return; }
                  try {
                    await supabase.from('card_layout_styles').insert({ style_name: newStyleName, is_default: false, layout_data: elements.map(el => ({ element_key: el.element_key, display_name: el.display_name, front_position: el.front_position, back_position: el.back_position, card_side: el.card_side })) });
                    toast.success(`Style saved`); setShowSaveStyleModal(false); setNewStyleName(''); fetchSavedStyles();
                  } catch { toast.error('Failed'); }
                }} className="flex-1 py-2 bg-[#5b8dee] hover:bg-[#4a7de0] text-white rounded text-sm font-medium transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Save Modal ── */}
      {showTemplateSave && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#252525] border border-[#3a3a3a] rounded-xl w-[400px] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#363636]">
              <span className="font-semibold text-white flex items-center gap-2"><Save size={14} className="text-[#5b8dee]" />Save as Template</span>
              <button onClick={() => { setShowTemplateSave(false); setTemplateName(''); }} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-gray-400">Name this layout snapshot — includes element positions, backgrounds, and any label overrides you made.</p>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Template Name</label>
                <input
                  autoFocus type="text" value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTemplate(templateName, false); }}
                  placeholder="e.g. Standard ID Card v2, HYD Office 2025"
                  className="w-full bg-[#1e1e1e] border border-[#444] text-white text-sm px-3 py-2 rounded focus:border-[#5b8dee] focus:outline-none"
                />
              </div>
              {Object.keys(labelOverrides).length > 0 && (
                <div className="bg-cyan-900/20 border border-cyan-800/40 rounded px-3 py-2">
                  <p className="text-[10px] text-cyan-400">{Object.keys(labelOverrides).length} label override{Object.keys(labelOverrides).length > 1 ? 's' : ''} will be saved with this template</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => saveTemplate(templateName, false)} disabled={templateSaving || !templateName.trim()}
                  className="flex-1 py-2 bg-[#3a3a3a] hover:bg-[#444] text-gray-200 text-sm rounded font-medium transition-colors disabled:opacity-40">
                  {templateSaving ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}Save Only
                </button>
                <button onClick={() => saveTemplate(templateName, true)} disabled={templateSaving || !templateName.trim()}
                  className="flex-1 py-2 bg-[#5b8dee] hover:bg-[#4a7de0] text-white text-sm rounded font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {templateSaving ? <Loader2 size={12} className="animate-spin" /> : null}Save & Set Active
                </button>
              </div>
              <button onClick={() => { setShowTemplateSave(false); setTemplateName(''); }}
                className="w-full py-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                Skip — don't save as template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Gallery Modal ── */}
      {showTemplateGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl w-[700px] max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#363636] shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white flex items-center gap-2"><Layers size={15} className="text-[#5b8dee]" />Card Templates</span>
                <span className="text-[10px] text-gray-500 bg-[#252525] px-2 py-0.5 rounded-full">{templates.length} saved</span>
                {templates.some(t => t.is_active) && <span className="text-[10px] text-[#5b8dee] bg-[#5b8dee]/10 px-2 py-0.5 rounded-full">1 active</span>}
              </div>
              <button onClick={() => setShowTemplateGallery(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {/* Info banner */}
            <div className="px-5 py-2 border-b border-[#2a2a2a] bg-[#1e1e1e] shrink-0">
              <p className="text-[11px] text-gray-500">
                <span className="text-[#5b8dee]">Active template</span> auto-applies to new cards via <code className="text-orange-300 text-[9px]">card_layout_settings</code>.
                If no template is active, the editor's last-saved layout is used as fallback.
              </p>
            </div>

            {/* Grid */}
            {templates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 gap-3">
                <Layers size={36} className="opacity-20" />
                <p className="text-sm">No templates yet</p>
                <button onClick={() => { setShowTemplateGallery(false); setShowTemplateSave(true); }}
                  className="mt-1 px-4 py-2 bg-[#5b8dee] text-white text-sm rounded hover:bg-[#4a7de0] transition-colors">
                  Save current layout as first template
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {templates.map(tmpl => (
                  <div key={tmpl.id} className={`rounded-xl border-2 overflow-hidden transition-all ${tmpl.is_active ? 'border-[#5b8dee] shadow-lg shadow-[#5b8dee]/10' : 'border-[#2a2a2a] hover:border-[#444]'}`}>
                    {/* Mini card preview */}
                    <div className="h-28 relative overflow-hidden" style={tmpl.front_bg && Object.keys(tmpl.front_bg).length ? getBgStyle(tmpl.front_bg as CardBackground) : { backgroundColor: '#fff' }}>
                      {/* Fake element placeholder lines */}
                      <div className="absolute inset-3 flex flex-col gap-1 opacity-40">
                        <div className="h-2 bg-current rounded-sm w-2/3" style={{ color: '#888' }} />
                        <div className="h-1.5 bg-current rounded-sm w-1/2" style={{ color: '#888' }} />
                        <div className="h-1.5 bg-current rounded-sm w-3/4" style={{ color: '#888' }} />
                      </div>
                      {tmpl.is_active && (
                        <div className="absolute top-2 left-2 bg-[#5b8dee] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />ACTIVE
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 text-[8px] text-white/50 bg-black/50 px-1.5 py-0.5 rounded font-mono">
                        {(tmpl.layout_elements || []).length}el · {Object.keys(tmpl.label_overrides || {}).length}lb
                      </div>
                    </div>
                    {/* Info */}
                    <div className="bg-[#252525] p-3">
                      <div className="font-medium text-white text-sm truncate mb-0.5">{tmpl.template_name}</div>
                      <div className="text-[10px] text-gray-500 mb-2.5">
                        {new Date(tmpl.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {Object.keys(tmpl.label_overrides || {}).length > 0 && <span className="ml-2 text-cyan-500">{Object.keys(tmpl.label_overrides).length} label overrides</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => loadTemplateIntoEditor(tmpl)}
                          className="flex-1 py-1 text-[10px] bg-[#333] hover:bg-[#3a3a3a] text-gray-200 rounded transition-colors">
                          Load into Editor
                        </button>
                        {!tmpl.is_active ? (
                          <button onClick={() => activateTemplate(tmpl)}
                            className="flex-1 py-1 text-[10px] bg-[#5b8dee]/15 hover:bg-[#5b8dee]/30 text-[#5b8dee] rounded transition-colors font-medium">
                            Set Active
                          </button>
                        ) : (
                          <div className="flex-1 py-1 text-[10px] text-center text-[#5b8dee]/60 rounded border border-[#5b8dee]/20">Active ✓</div>
                        )}
                        <button onClick={() => deleteTemplate(tmpl.id, tmpl.template_name)}
                          title="Delete template"
                          className="px-2 py-1 text-[10px] bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#2a2a2a] shrink-0 flex items-center justify-between">
              <p className="text-[11px] text-gray-600">Changes to the active template reflect on actual issued cards</p>
              <button onClick={() => { setShowTemplateGallery(false); setShowTemplateSave(true); }}
                className="px-3 py-1.5 text-xs bg-[#5b8dee] text-white rounded hover:bg-[#4a7de0] transition-colors flex items-center gap-1.5">
                <Save size={11} />Save Current as Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardCanvasEditor;
