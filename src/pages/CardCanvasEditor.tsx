import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBranding } from '@/hooks/useBranding';
import { useBranches } from '@/hooks/useBranches';
import AppHeader from '../components/AppHeader';
import { toast } from 'sonner';
import { Loader2, Save, Eye, EyeOff, Move, X, Layers, Grid, RefreshCw, ZoomIn, ZoomOut, MousePointer2, Grid3X3, Crosshair } from 'lucide-react';

export interface CardElementPosition {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    fontSize: number;
    fontWeight: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
    borderStyle?: 'none' | 'solid' | 'dashed' | 'double';
    borderColor?: string;
    borderWidth?: number;
    color?: string;
    opacity?: number;
}

export interface CardLayoutElement {
    id: string;
    element_key: string;
    display_name: string;
    front_position: CardElementPosition;
    back_position: CardElementPosition | null;
    card_side: string;
}

const CardCanvasEditor: React.FC = () => {
    const { branding } = useBranding();
    const { branches } = useBranches();
    
    const [elements, setElements] = useState<CardLayoutElement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spacePressed, setSpacePressed] = useState(false);
    
    // Grid state
    const [showGrid, setShowGrid] = useState(true);
    const [gridSize, setGridSize] = useState(10);
    const [showCrosshair, setShowCrosshair] = useState(true);
    const [showHidden, setShowHidden] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    
    // Undo/Redo state
    const [history, setHistory] = useState<CardLayoutElement[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Copy/Paste state
    const [copiedElement, setCopiedElement] = useState<CardLayoutElement | null>(null);
    
    // Style presets
    const [savedStyles, setSavedStyles] = useState<{id: string; style_name: string; is_default: boolean}[]>([]);
    const [currentStyleId, setCurrentStyleId] = useState<string | null>(null);
    const [showSaveStyleModal, setShowSaveStyleModal] = useState(false);
    const [newStyleName, setNewStyleName] = useState('');
    const [showStylesTable, setShowStylesTable] = useState(false);
    
    
    
    const cardRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const branchInfo = branches[0];

    // Sample employee data for preview mode
    const sampleEmployee = {
        fullName: 'V Yuva Subharam',
        employeeId: 'CLOVE-2980',
        bloodGroup: 'O+',
        emergencyContact: '+91 9493475556',
        photoUrl: 'https://res.cloudinary.com/dmoha80me/image/upload/v1778233161/pbrhz6fqut2t7k1q94tg.png'
    };

    useEffect(() => {
        fetchLayoutSettings();
    }, []);

    // Save to history function - must be before keyboard handler
    const saveToHistory = useCallback((newElements: CardLayoutElement[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(newElements)));
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    // Use refs for keyboard handler to avoid stale closures
    const selectedElementRef = useRef<string | null>(null);
    const elementsRef = useRef<CardLayoutElement[]>([]);
    const activeSideRef = useRef<'front' | 'back'>('front');
    const showGridRef = useRef(true);
    const gridSizeRef = useRef(10);
    const previewModeRef = useRef(false);
    const copiedElementRef = useRef<CardLayoutElement | null>(null);
    
    // Keep refs in sync with state
    useEffect(() => { selectedElementRef.current = selectedElement; }, [selectedElement]);
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { activeSideRef.current = activeSide; }, [activeSide]);
    useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);
    useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);
    useEffect(() => { previewModeRef.current = previewMode; }, [previewMode]);
    
    // Handle space key for panning and arrow keys for element movement
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.code === 'Space' && !e.repeat) {
                setSpacePressed(true);
            }
            
            // Escape to exit preview mode
            if (e.code === 'Escape' && previewModeRef.current) {
                setPreviewMode(false);
                setSelectedElement(null);
            }
            
            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
                e.preventDefault();
                if (historyIndex > 0) {
                    setHistoryIndex(prev => prev - 1);
                    setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
                }
                return;
            }
            
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
                e.preventDefault();
                if (historyIndex < history.length - 1) {
                    setHistoryIndex(prev => prev + 1);
                    setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
                }
                return;
            }
            
            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedElementRef.current) {
                const el = elementsRef.current.find(item => item.element_key === selectedElementRef.current);
                if (el) {
                    copiedElementRef.current = JSON.parse(JSON.stringify(el));
                    setCopiedElement(JSON.parse(JSON.stringify(el)));
                    toast.success(`${el.display_name} copied`);
                }
                return;
            }
            
            // Paste: Ctrl+V - Duplicate element
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && copiedElementRef.current) {
                e.preventDefault();
                const el = copiedElementRef.current;
                const side = activeSideRef.current;
                
                // Create a new duplicated element
                const newElement: CardLayoutElement = {
                    ...JSON.parse(JSON.stringify(el)),
                    id: crypto.randomUUID(),
                    element_key: `${el.element_key}_copy_${Date.now()}`
                };
                
                // Offset the position
                if (side === 'front' && newElement.front_position) {
                    newElement.front_position = { 
                        ...newElement.front_position, 
                        x: newElement.front_position.x + 25, 
                        y: newElement.front_position.y + 25 
                    };
                }
                if (side === 'back' && newElement.back_position) {
                    newElement.back_position = { 
                        ...newElement.back_position, 
                        x: newElement.back_position.x + 25, 
                        y: newElement.back_position.y + 25 
                    };
                }
                
                setElements(prev => [...prev, newElement]);
                saveToHistory([...elementsRef.current, newElement]);
                copiedElementRef.current = newElement;
                setCopiedElement(newElement);
                toast.success(`${el.display_name} duplicated`);
                return;
            }
            
            // Arrow keys to move selected element
            const sel = selectedElementRef.current;
            if (sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                // Don't prevent default if user is typing in an input
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                
                e.preventDefault();
                const element = elementsRef.current.find(el => el.element_key === sel);
                if (!element) return;
                
                const currentPos = activeSideRef.current === 'front' ? element.front_position : element.back_position;
                if (!currentPos) return;
                
                const moveAmount = e.shiftKey ? 10 : 1;
                let newX = currentPos.x;
                let newY = currentPos.y;
                
                switch (e.code) {
                    case 'ArrowUp': newY = Math.max(0, currentPos.y - moveAmount); break;
                    case 'ArrowDown': newY = Math.min(365 - currentPos.height, currentPos.y + moveAmount); break;
                    case 'ArrowLeft': newX = Math.max(0, currentPos.x - moveAmount); break;
                    case 'ArrowRight': newX = Math.min(230 - currentPos.width, currentPos.x + moveAmount); break;
                }
                
                // Apply grid snapping only when shift is NOT pressed (fine control), or always when grid is enabled
                // For 1px movement, don't snap to grid to allow smooth positioning
                if (showGridRef.current && moveAmount > 1) {
                    newX = Math.round(newX / gridSizeRef.current) * gridSizeRef.current;
                    newY = Math.round(newY / gridSizeRef.current) * gridSizeRef.current;
                }
                
                setElements(prev => prev.map(el => {
                    if (el.element_key !== sel) return el;
                    if (activeSideRef.current === 'front') {
                        return { ...el, front_position: { ...el.front_position, x: newX, y: newY } };
                    } else {
                        return el.back_position 
                            ? { ...el, back_position: { ...el.back_position, x: newX, y: newY } }
                            : el;
                    }
                }));
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setSpacePressed(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [history, historyIndex, saveToHistory]);

    const fetchLayoutSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('card_layout_settings')
                .select('*')
                .order('id');

            if (error) throw error;
            
            if (data && data.length > 0) {
                setElements(data.map((item: any) => ({
                    id: item.id,
                    element_key: item.element_key,
                    display_name: item.display_name,
                    front_position: typeof item.front_position === 'string' 
                        ? JSON.parse(item.front_position) 
                        : item.front_position,
                    back_position: item.back_position ? (typeof item.back_position === 'string' 
                        ? JSON.parse(item.back_position) 
                        : item.back_position) : null,
                    card_side: item.card_side
                })));
            }
        } catch (error) {
            console.error('Error fetching layout settings:', error);
        } finally {
            setLoading(false);
            // Initialize history with loaded elements
            setHistory([[]]);
            setHistoryIndex(0);
            
            // Load saved styles
            fetchSavedStyles();
        }
    };

    const fetchSavedStyles = async () => {
        try {
            const { data, error } = await supabase
                .from('card_layout_styles')
                .select('id, style_name, is_default')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            if (data) {
                setSavedStyles(data);
                const defaultStyle = data.find((s: any) => s.is_default);
                if (defaultStyle) setCurrentStyleId(defaultStyle.id);
            }
        } catch (error) {
            console.error('Error fetching styles:', error);
        }
    };

    const saveAsNewStyle = async () => {
        if (!newStyleName.trim()) {
            toast.error('Please enter a style name');
            return;
        }
        try {
            const layoutData = elements.map(el => ({
                element_key: el.element_key,
                display_name: el.display_name,
                front_position: el.front_position,
                back_position: el.back_position,
                card_side: el.card_side
            }));
            
            const { data, error } = await supabase
                .from('card_layout_styles')
                .insert({
                    style_name: newStyleName,
                    is_default: false,
                    layout_data: layoutData
                })
                .select();
            
            if (error) throw error;
            
            toast.success(`Style "${newStyleName}" saved successfully`);
            setShowSaveStyleModal(false);
            setNewStyleName('');
            fetchSavedStyles();
            
            if (data && data[0]) {
                setCurrentStyleId(data[0].id);
            }
        } catch (error) {
            console.error('Error saving style:', error);
            toast.error('Failed to save style');
        }
    };

    const loadStyle = async (styleId: string) => {
        try {
            const { data, error } = await supabase
                .from('card_layout_styles')
                .select('layout_data')
                .eq('id', styleId)
                .single();
            
            if (error) throw error;
            if (data && data.layout_data) {
                const loadedElements = data.layout_data.map((item: any) => ({
                    ...item,
                    front_position: typeof item.front_position === 'string' 
                        ? JSON.parse(item.front_position) 
                        : item.front_position,
                    back_position: item.back_position ? (typeof item.back_position === 'string' 
                        ? JSON.parse(item.back_position) 
                        : item.back_position) : null
                }));
                
                setElements(loadedElements);
                setCurrentStyleId(styleId);
                saveToHistory(loadedElements);
                toast.success('Style loaded successfully');
            }
        } catch (error) {
            console.error('Error loading style:', error);
            toast.error('Failed to load style');
        }
    };

    const deleteStyle = async (styleId: string) => {
        if (!window.confirm('Are you sure you want to delete this style?')) return;
        
        try {
            const { error } = await supabase
                .from('card_layout_styles')
                .delete()
                .eq('id', styleId);
            
            if (error) throw error;
            
            toast.success('Style deleted');
            fetchSavedStyles();
            
            if (currentStyleId === styleId) {
                const defaultStyle = savedStyles.find(s => s.id !== styleId && s.is_default);
                if (defaultStyle) loadStyle(defaultStyle.id);
            }
        } catch (error) {
            console.error('Error deleting style:', error);
            toast.error('Failed to delete style');
        }
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const copyElement = (element: CardLayoutElement) => {
        setCopiedElement(JSON.parse(JSON.stringify(element)));
        toast.success(`${element.display_name} copied - press Ctrl+V to duplicate`);
    };

    const pasteElement = () => {
        if (!copiedElement) {
            toast.error('No element copied');
            return;
        }
        
        const side = activeSide;
        // Create a new element by duplicating the copied one with offset position
        const newElement: CardLayoutElement = {
            ...JSON.parse(JSON.stringify(copiedElement)),
            id: crypto.randomUUID(),
            element_key: `${copiedElement.element_key}_copy_${Date.now()}`
        };
        
        // Offset the position
        if (side === 'front' && newElement.front_position) {
            newElement.front_position = { 
                ...newElement.front_position, 
                x: newElement.front_position.x + 25, 
                y: newElement.front_position.y + 25 
            };
        }
        if (side === 'back' && newElement.back_position) {
            newElement.back_position = { 
                ...newElement.back_position, 
                x: newElement.back_position.x + 25, 
                y: newElement.back_position.y + 25 
            };
        }
        
        setElements(prev => [...prev, newElement]);
        saveToHistory([...elements, newElement]);
        setCopiedElement(newElement); // Update copied to the new element for continuous pasting
        toast.success(`${copiedElement.display_name} duplicated`);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Separate original and duplicate elements (handle both _copy_ and _extra_)
            const originalElements = elements.filter(el => !el.element_key.includes('_copy_') && !el.element_key.includes('_extra_'));
            const duplicateElements = elements.filter(el => el.element_key.includes('_copy_') || el.element_key.includes('_extra_'));
            
            // Update original elements
            for (const element of originalElements) {
                const { error } = await supabase
                    .from('card_layout_settings')
                    .update({
                        front_position: JSON.stringify(element.front_position),
                        back_position: element.back_position ? JSON.stringify(element.back_position) : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', element.id);

                if (error) throw error;
            }
            
            // Insert duplicate elements as new rows
            for (const element of duplicateElements) {
                // Extract base key and create a unique name
                const baseKey = element.element_key.split('_copy_')[0];
                const timestamp = Date.now().toString(36);
                const newKey = `${baseKey}_extra_${timestamp}`;
                
                const { error } = await supabase
                    .from('card_layout_settings')
                    .insert({
                        element_key: newKey,
                        display_name: element.display_name,
                        front_position: JSON.stringify(element.front_position),
                        back_position: element.back_position ? JSON.stringify(element.back_position) : null,
                        card_side: element.card_side
                    });

                if (error) throw error;
            }
            
            toast.success(`Card layout saved (${originalElements.length} elements + ${duplicateElements.length} duplicates)`);
        } catch (error) {
            console.error('Error saving layout:', error);
            toast.error('Failed to save layout');
        } finally {
            setSaving(false);
        }
    };

    const updateElementPosition = (elementKey: string, position: Partial<CardElementPosition>) => {
        const side = activeSide;
        setElements(prev => prev.map(el => {
            if (el.element_key !== elementKey) return el;
            
            if (side === 'front') {
                return {
                    ...el,
                    front_position: { ...el.front_position, ...position }
                };
            } else {
                return {
                    ...el,
                    back_position: el.back_position 
                        ? { ...el.back_position, ...position } 
                        : null
                };
            }
        }));
    };

    const handleMouseDown = (e: React.MouseEvent, elementKey: string) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setDragging(elementKey);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const cardRect = cardRef.current?.getBoundingClientRect();
        if (!cardRect) return;

        // Update mouse position for crosshair
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
            const x = Math.round((e.clientX - rect.left - pan.x) / zoom);
            const y = Math.round((e.clientY - rect.top - pan.y) / zoom);
            setMousePosition({ 
                x: Math.max(0, Math.min(230, x)), 
                y: Math.max(0, Math.min(365, y)) 
            });
        }

        if (isPanning) {
            setPan(prev => ({
                x: prev.x + (e.clientX - panStart.x),
                y: prev.y + (e.clientY - panStart.y)
            }));
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (!dragging || !cardRef.current) return;
        
        const element = elements.find(el => el.element_key === dragging);
        if (!element) return;
        
        const currentPos = activeSide === 'front' 
            ? element.front_position 
            : element.back_position;
        
        if (!currentPos) return;
        
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        
        // Snap to grid if enabled
        let newX = Math.max(0, Math.min(230 - currentPos.width, currentPos.x + dx));
        let newY = Math.max(0, Math.min(365 - currentPos.height, currentPos.y + dy));

        if (showGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }
        
        updateElementPosition(dragging, { x: newX, y: newY });
        
        setDragStart({ x: e.clientX, y: e.clientY });
    }, [dragging, elements, activeSide, dragStart, showGrid, gridSize, zoom, isPanning, panStart, pan]);

    const handleMouseUp = useCallback(() => {
        if (dragging) {
            saveToHistory(elements);
        }
        setDragging(null);
        setIsPanning(false);
    }, [dragging, elements, saveToHistory]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
        setZoom(newZoom);
    }, [zoom]);

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // Pan with left click: when space is held OR clicking on empty canvas
        if (e.button === 0 && (spacePressed || e.target === e.currentTarget)) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    useEffect(() => {
        if (dragging || isPanning) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp, isPanning]);

    const renderGrid = () => {
        if (!showGrid) return null;
        
        const lines = [];
        const cardWidth = 230;
        const cardHeight = 365;

        // Vertical lines
        for (let x = gridSize; x < cardWidth; x += gridSize) {
            lines.push(
                <div
                    key={`v-${x}`}
                    className="absolute top-0 bottom-0 border-l border-gray-200/50"
                    style={{ left: x }}
                />
            );
        }

        // Horizontal lines
        for (let y = gridSize; y < cardHeight; y += gridSize) {
            lines.push(
                <div
                    key={`h-${y}`}
                    className="absolute left-0 right-0 border-t border-gray-200/50"
                    style={{ top: y }}
                />
            );
        }

        return (
            <div className="absolute inset-0 pointer-events-none">
                {lines}
            </div>
        );
    };

    const renderCrosshair = () => {
        if (!showCrosshair || !cardRef.current) return null;
        
        return (
            <>
                <div
                    className="absolute top-0 bottom-0 border-l border-dashed border-orange-400/60 pointer-events-none"
                    style={{ left: mousePosition.x, transform: 'translateX(-50%)' }}
                />
                <div
                    className="absolute left-0 right-0 border-t border-dashed border-orange-400/60 pointer-events-none"
                    style={{ top: mousePosition.y, transform: 'translateY(-50%)' }}
                />
                <div
                    className="absolute bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow pointer-events-none z-50"
                    style={{ 
                        left: mousePosition.x, 
                        top: mousePosition.y,
                        transform: 'translate(5px, 5px)'
                    }}
                >
                    {mousePosition.x}, {mousePosition.y}
                </div>
            </>
        );
    };

    const renderCardElement = (element: CardLayoutElement, side: 'front' | 'back') => {
        const position = side === 'front' ? element.front_position : element.back_position;
        if (!position) return null;
        
        const isHidden = !position.visible;
        
        // Don't render if hidden (unless showHidden is enabled)
        if (isHidden && !showHidden) return null;
        
        const isDraggable = selectedElement === element.element_key;
        
        const getElementContent = () => {
            const isPreview = previewMode;
            
            // Get base element type (handle duplicates with _copy_ or _extra_ suffix)
            const baseKey = element.element_key.replace('_copy_', '_extra_').split('_extra_')[0];
            
            switch (baseKey) {
                case 'logo':
                    if (isPreview) {
                        return side === 'front' 
                            ? (branding.logo_id_front 
                                ? <img src={branding.logo_id_front} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                : <div className="text-center font-bold text-orange-600" style={{ fontSize: position.fontSize }}>CLOVE</div>)
                            : (branding.logo_id_back 
                                ? <img src={branding.logo_id_back} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                : <div className="text-center font-bold text-orange-600" style={{ fontSize: position.fontSize }}>CLOVE</div>);
                    }
                    return side === 'front' 
                        ? (branding.logo_id_front 
                            ? <img src={branding.logo_id_front} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                            : <div className="text-center font-bold" style={{ fontSize: position.fontSize }}>LOGO</div>)
                        : (branding.logo_id_back 
                            ? <img src={branding.logo_id_back} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                            : <div className="text-center font-bold" style={{ fontSize: position.fontSize }}>LOGO</div>);
                case 'fullName':
                    return (
                        <span 
                            className="uppercase block w-full"
                            style={{ 
                                fontSize: position.fontSize, 
                                fontWeight: position.fontWeight,
                                fontFamily: 'system-ui, sans-serif',
                                textAlign: position.textAlign || 'center'
                            }}
                        >
                            {isPreview ? sampleEmployee.fullName : 'FULL NAME'}
                        </span>
                    );
                case 'photo':
                    if (isPreview) {
                        return (
                            <img 
                                src={sampleEmployee.photoUrl} 
                                alt="Employee" 
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        );
                    }
                    return <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Photo Area</div>;
                case 'employeeId':
                    if (isPreview) {
                        return (
                            <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                                <span className="font-bold shrink-0">Emp ID</span>
                                <span className="mx-1">:</span>
                                <span className="truncate">{sampleEmployee.employeeId}</span>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                            <span className="font-bold shrink-0">Emp ID</span>
                            <span className="mx-1">:</span>
                            <span className="truncate">—</span>
                        </div>
                    );
                case 'bloodGroup':
                    if (isPreview) {
                        return (
                            <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                                <span className="font-bold shrink-0">Blood Group</span>
                                <span className="mx-1">:</span>
                                <span className="truncate">{sampleEmployee.bloodGroup}</span>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                            <span className="font-bold shrink-0">Blood Group</span>
                            <span className="mx-1">:</span>
                            <span className="truncate">—</span>
                        </div>
                    );
                case 'emergencyContact':
                    if (isPreview) {
                        return (
                            <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                                <span className="font-bold shrink-0">Emergency No</span>
                                <span className="mx-1">:</span>
                                <span className="truncate">{sampleEmployee.emergencyContact}</span>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center" style={{ fontSize: position.fontSize }}>
                            <span className="font-bold shrink-0">Emergency No</span>
                            <span className="mx-1">:</span>
                            <span className="truncate">—</span>
                        </div>
                    );
                case 'companyName':
                    return (
                        <span 
                            style={{ 
                                fontSize: position.fontSize, 
                                fontWeight: position.fontWeight,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            {isPreview ? 'Clove Technologies Pvt. Ltd.' : 'Clove Technologies Pvt. Ltd.'}
                        </span>
                    );
                case 'companyAddress':
                    const address = isPreview 
                        ? (branchInfo?.address || branding.contact_address || 'Plot No, Street, City, State - PIN')
                        : (branchInfo?.address || branding.contact_address || 'Address not configured');
                    return (
                        <span 
                            className="whitespace-pre-line" 
                            style={{ 
                                fontSize: position.fontSize,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            {address}
                        </span>
                    );
                case 'companyPhone':
                    const phone = isPreview 
                        ? (branchInfo?.phone || branding.contact_phone || '+91 40 1234 5678')
                        : (branchInfo?.phone || branding.contact_phone || '—');
                    return (
                        <span 
                            style={{ 
                                fontSize: position.fontSize,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            Tel : {phone}
                        </span>
                    );
                case 'companyEmail':
                    const email = isPreview 
                        ? (branchInfo?.email || branding.contact_email || 'hr@clovetechnologies.com')
                        : (branchInfo?.email || branding.contact_email || '—');
                    return (
                        <span 
                            style={{ 
                                fontSize: position.fontSize,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            {email}
                        </span>
                    );
                case 'companyWebsite':
                    const website = isPreview 
                        ? (branchInfo?.website || branding.contact_website || 'www.clovetechnologies.com')
                        : (branchInfo?.website || branding.contact_website || '—');
                    return (
                        <span 
                            style={{ 
                                fontSize: position.fontSize,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            {website}
                        </span>
                    );
                case 'designLine':
                    return (
                        <div 
                            className="w-full h-full"
                            style={{
                                borderTop: position.borderStyle !== 'none' 
                                    ? `${position.borderWidth || 1}px ${position.borderStyle || 'solid'} ${position.borderColor || '#FF6B35'}`
                                    : 'none',
                                opacity: position.opacity || 1,
                            }}
                        />
                    );
                case 'ifFoundText':
                    const ifFoundAddress = isPreview 
                        ? (branchInfo?.address || branding.contact_address || 'Plot No, Street, City, State - PIN')
                        : (branchInfo?.address || 'Address');
                    return (
                        <div 
                            className="space-y-0.5" 
                            style={{ 
                                fontSize: position.fontSize,
                                fontFamily: 'system-ui, sans-serif'
                            }}
                        >
                            <div>IF FOUND PLEASE RETURN TO :</div>
                            <div className="font-bold">Clove Technologies Pvt. Ltd.</div>
                            <div className="whitespace-pre-line leading-tight">{ifFoundAddress}</div>
                        </div>
                    );
                default:
                    return <span style={{ fontSize: position.fontSize }}>{element.display_name}</span>;
            }
        };

        // For hidden elements with showHidden enabled, show a placeholder
        if (isHidden && showHidden) {
            return (
                <div
                    key={element.element_key}
                    className="absolute border-2 border-dashed border-red-300 bg-red-50/50 flex items-center justify-center cursor-pointer group"
                    style={{
                        left: position.x,
                        top: position.y,
                        width: position.width,
                        height: position.height,
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement(element.element_key);
                    }}
                >
                    <div className="text-center">
                        <EyeOff size={16} className="mx-auto text-red-400 mb-1" />
                        <span className="text-[10px] text-red-400">{element.display_name}</span>
                    </div>
                    {/* Show button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const side = activeSide;
                            setElements(prev => prev.map(el => {
                                if (el.element_key !== element.element_key) return el;
                                if (side === 'front') {
                                    return { ...el, front_position: { ...el.front_position, visible: true } };
                                } else {
                                    return el.back_position 
                                        ? { ...el, back_position: { ...el.back_position, visible: true } }
                                        : el;
                                }
                            }));
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-md z-20"
                        title="Show element"
                    >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            );
        }
        
        return (
            <div
                key={element.element_key}
                className={`absolute transition-all group ${isDraggable ? 'cursor-move ring-2 ring-orange-500 ring-offset-1 z-10 shadow-lg' : 'cursor-default'}`}
                style={{
                    left: position.x,
                    top: position.y,
                    width: position.width,
                    height: position.height,
                    color: position.color,
                    opacity: position.opacity || 1,
                }}
                onMouseDown={(e) => handleMouseDown(e, element.element_key)}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(element.element_key);
                }}
            >
                {getElementContent()}
                {/* Visibility Toggle Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const side = activeSide;
                        setElements(prev => prev.map(el => {
                            if (el.element_key !== element.element_key) return el;
                            if (side === 'front') {
                                return { ...el, front_position: { ...el.front_position, visible: !el.front_position.visible } };
                            } else {
                                return el.back_position 
                                    ? { ...el, back_position: { ...el.back_position, visible: !el.back_position.visible } }
                                    : el;
                            }
                        }));
                    }}
                    className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-20 ${
                        position.visible 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-red-500 hover:bg-red-600'
                    }`}
                    title={position.visible ? 'Hide element' : 'Show element'}
                >
                    {position.visible ? (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const currentElement = elements.find(el => el.element_key === selectedElement);
    const currentPosition = currentElement 
        ? (activeSide === 'front' ? currentElement.front_position : currentElement.back_position)
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Card Canvas Editor</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Drag elements to position - Scroll to zoom - Click empty area to pan - Preview shows sample employee
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* Undo/Redo */}
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
                                title="Undo (Ctrl+Z)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
                                title="Redo (Ctrl+Y)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* Copy/Paste */}
                        <button
                            onClick={() => {
                                const el = elements.find(item => item.element_key === selectedElement);
                                if (el) {
                                    copyElement(el);
                                } else {
                                    toast.error('Select an element to copy');
                                }
                            }}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                            title="Copy (Ctrl+C)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={pasteElement}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                            title="Paste (Ctrl+V)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </button>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                            <button
                                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[40px] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <button
                                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Reset View"
                            >
                                <MousePointer2 size={16} />
                            </button>
                        </div>

                        {/* Grid Toggle */}
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                showGrid 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <Grid3X3 size={16} />
                            Grid
                        </button>

                        {/* Crosshair Toggle */}
                        <button
                            onClick={() => setShowCrosshair(!showCrosshair)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                showCrosshair 
                                    ? 'bg-orange-500 text-white' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <Crosshair size={16} />
                            Crosshair
                        </button>

                        {/* Show Hidden Toggle */}
                        <button
                            onClick={() => setShowHidden(!showHidden)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                showHidden 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <EyeOff size={16} />
                            Hidden
                        </button>

                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                previewMode 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {previewMode ? <><Eye size={16} /> Preview On</> : <><EyeOff size={16} /> Preview Off</>}
                        </button>
                        
                        {/* Saved Styles Toggle */}
                        <button
                            onClick={() => setShowStylesTable(!showStylesTable)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                showStylesTable 
                                    ? 'bg-orange-500 text-white' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Saved Styles ({savedStyles.length})
                        </button>
                        
                        <button
                            onClick={() => setShowSaveStyleModal(true)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50"
                            title="Save current layout as new style"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Save Style Modal */}
                {showSaveStyleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Save Style</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Style Name</label>
                                    <input
                                        type="text"
                                        value={newStyleName}
                                        onChange={(e) => setNewStyleName(e.target.value)}
                                        placeholder="e.g., Corporate Blue, Modern Minimal"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-gray-500">This will save the current layout as a new style preset that you can apply anytime.</p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setShowSaveStyleModal(false); setNewStyleName(''); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveAsNewStyle}
                                    className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
                                >
                                    Save Style
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    {/* Canvas Editor */}
                    <div 
                        ref={canvasContainerRef}
                        className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 overflow-hidden"
                    >
                        {/* Side Tabs */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            <button
                                onClick={() => { setActiveSide('front'); setSelectedElement(null); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    activeSide === 'front'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                <Layers size={16} />
                                Front
                            </button>
                            <button
                                onClick={() => { setActiveSide('back'); setSelectedElement(null); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    activeSide === 'back'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                <Layers size={16} />
                                Back
                            </button>
                            
                            <div className="flex-1"></div>
                            
                            {/* Grid Size Selector */}
                            {showGrid && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Grid:</span>
                                    <select
                                        value={gridSize}
                                        onChange={(e) => setGridSize(parseInt(e.target.value))}
                                        className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                    >
                                        <option value={5}>5px</option>
                                        <option value={10}>10px</option>
                                        <option value={20}>20px</option>
                                        <option value={25}>25px</option>
                                    </select>
                                </div>
                            )}
                            
                            <button
                                onClick={() => {
                                    // Reset all positions to default
                                    const defaults: Record<string, Partial<CardElementPosition>> = {
                                        logo: { x: 65, y: 10, width: 100, height: 30 },
                                        fullName: { x: 15, y: 55, width: 200, height: 20 },
                                        photo: { x: 0, y: 89, width: 230, height: 200 },
                                        employeeId: { x: 10, y: 90, width: 80, height: 10 },
                                        bloodGroup: { x: 120, y: 90, width: 100, height: 10 },
                                        emergencyContact: { x: 10, y: 105, width: 150, height: 10 },
                                        companyName: { x: 10, y: 320, width: 210, height: 10 },
                                        companyAddress: { x: 10, y: 332, width: 210, height: 20 },
                                        companyPhone: { x: 10, y: 350, width: 210, height: 8 },
                                        companyEmail: { x: 10, y: 358, width: 210, height: 8 },
                                        companyWebsite: { x: 10, y: 365, width: 210, height: 8 },
                                        designLine: { x: 0, y: 45, width: 230, height: 3 },
                                    };
                                    setElements(prev => prev.map(el => ({
                                        ...el,
                                        front_position: el.front_position 
                                            ? { ...el.front_position, ...(defaults[el.element_key] || {}) }
                                            : null,
                                        back_position: el.back_position 
                                            ? { ...el.back_position }
                                            : null
                                    })));
                                    toast.success('Layout reset to defaults');
                                }}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Reset All"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Card Canvas Container */}
                        <div 
                            className="relative overflow-auto flex justify-center items-center bg-gray-100/50 dark:bg-gray-900/50 rounded-xl"
                            style={{ minHeight: '550px', height: 'calc(100vh - 320px)' }}
                            onWheel={handleWheel}
                            onMouseDown={handleCanvasMouseDown}
                        >
                            <div 
                                ref={cardRef}
                                className={`relative bg-white border-2 ${previewMode ? 'border-gray-300' : 'border-dashed border-gray-400'} rounded-lg overflow-hidden shadow-xl`}
                                style={{ 
                                    width: 230, 
                                    height: 365,
                                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                    transformOrigin: 'center center',
                                    cursor: isPanning ? 'grabbing' : (spacePressed ? 'grab' : (previewMode ? 'default' : 'default'))
                                }}
                                onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSelectedElement(null);
                        }
                    }}
                            >
                                {renderGrid()}
                                {renderCrosshair()}
                                
                                {previewMode && (
                                    <div className="absolute inset-0 bg-white z-20">
                                        {elements.filter(el => activeSide === 'front' || el.back_position).map(el => renderCardElement(el, activeSide))}
                                    </div>
                                )}
                                {!previewMode && elements
                                    .filter(el => activeSide === 'front' || el.back_position)
                                    .map(el => renderCardElement(el, activeSide))}
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
<span>
                                {!previewMode 
                                    ? 'Drag/Arrow keys - Ctrl+Z/Y undo/redo - Ctrl+C/V copy/paste - Hold click pan - Scroll zoom'
                                    : 'Preview mode: Drag elements to reposition - Arrow keys nudge - Press Esc exit - Grid works here'}
                            </span>
                            <div className="flex items-center gap-3">
                                <span>Card: 230 × 365px</span>
                                <span>Zoom: {Math.round(zoom * 100)}%</span>
                                {showGrid && <span>Grid: {gridSize}px</span>}
</div>
                        </div>

                        {/* Saved Styles Table - Full Width Below Canvas */}
                        {showStylesTable && (
                            <div className="mt-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saved Card Layouts</h3>
                                    <button
                                        onClick={() => setShowStylesTable(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {savedStyles.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No saved styles yet. Click the + button to save current layout.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Style Name</th>
                                                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Default</th>
                                                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {savedStyles.map(style => (
                                                    <tr key={style.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 ${currentStyleId === style.id ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <span className="font-medium text-gray-900 dark:text-white">{style.style_name}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {style.is_default ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                    Default
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await supabase.from('card_layout_styles').update({ is_default: true }).eq('id', style.id);
                                                                            fetchSavedStyles();
                                                                            toast.success('Default style updated');
                                                                        } catch (err) {
                                                                            toast.error('Failed to set default');
                                                                        }
                                                                    }}
                                                                    className="text-xs text-gray-400 hover:text-gray-600"
                                                                >
                                                                    Set as default
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => loadStyle(style.id)}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                                    title="Apply style"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await supabase.from('card_layout_styles').update({ is_default: !style.is_default }).eq('id', style.id);
                                                                            fetchSavedStyles();
                                                                        } catch (err) {
                                                                            toast.error('Failed to toggle');
                                                                        }
                                                                    }}
                                                                    className={`p-1.5 rounded ${style.is_default ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100'}`}
                                                                    title={style.is_default ? 'Disable default' : 'Enable default'}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteStyle(style.id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                    title="Delete style"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Element Properties Panel */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Grid size={18} />
                            Properties
                        </h2>

                        {selectedElement && currentPosition ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-orange-700 dark:text-orange-300">{currentElement?.display_name}</span>
                                        <button
                                            onClick={() => setSelectedElement(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Position Controls */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Position (px)</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">X</label>
                                            <input
                                                type="number"
                                                value={Math.round(currentPosition.x)}
                                                onChange={(e) => updateElementPosition(selectedElement, { x: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Y</label>
                                            <input
                                                type="number"
                                                value={Math.round(currentPosition.y)}
                                                onChange={(e) => updateElementPosition(selectedElement, { y: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Width</label>
                                            <input
                                                type="number"
                                                value={Math.round(currentPosition.width)}
                                                onChange={(e) => updateElementPosition(selectedElement, { width: parseInt(e.target.value) || 10 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Height</label>
                                            <input
                                                type="number"
                                                value={Math.round(currentPosition.height)}
                                                onChange={(e) => updateElementPosition(selectedElement, { height: parseInt(e.target.value) || 10 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Style Controls */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Style</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Font Size</label>
                                            <input
                                                type="number"
                                                value={currentPosition.fontSize}
                                                onChange={(e) => updateElementPosition(selectedElement, { fontSize: parseInt(e.target.value) || 12 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                                min={6}
                                                max={32}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Font Weight</label>
                                            <select
                                                value={currentPosition.fontWeight}
                                                onChange={(e) => updateElementPosition(selectedElement, { fontWeight: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                                <option value="lighter">Light</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Text Align</label>
                                            <div className="flex gap-1 mt-1">
                                                <button
                                                    onClick={() => updateElementPosition(selectedElement, { textAlign: 'left' })}
                                                    className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                                                        currentPosition.textAlign === 'left' || !currentPosition.textAlign
                                                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700'
                                                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    Left
                                                </button>
                                                <button
                                                    onClick={() => updateElementPosition(selectedElement, { textAlign: 'center' })}
                                                    className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                                                        currentPosition.textAlign === 'center'
                                                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700'
                                                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    Center
                                                </button>
                                                <button
                                                    onClick={() => updateElementPosition(selectedElement, { textAlign: 'right' })}
                                                    className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                                                        currentPosition.textAlign === 'right'
                                                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700'
                                                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    Right
                                                </button>
                                            </div>
                                        </div>

                                        {/* Line Height */}
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Line Height</label>
                                            <input
                                                type="number"
                                                value={currentPosition.lineHeight || 1}
                                                onChange={(e) => updateElementPosition(selectedElement, { lineHeight: parseFloat(e.target.value) || 1 })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                                step={0.1}
                                                min={0.5}
                                                max={3}
                                            />
                                        </div>

                                        {/* Border Style */}
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Line Style</label>
                                            <select
                                                value={currentPosition.borderStyle || 'none'}
                                                onChange={(e) => updateElementPosition(selectedElement, { borderStyle: e.target.value as any })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="none">None</option>
                                                <option value="solid">Solid ─</option>
                                                <option value="dashed">Dashed ┅</option>
                                                <option value="double">Double ═</option>
                                            </select>
                                        </div>

                                        {/* Border Color */}
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Line Color</label>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {['#000000', '#FF6B35', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#FFFFFF', '#F59E0B'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateElementPosition(selectedElement, { borderColor: color })}
                                                        className={`w-6 h-6 rounded-full border-2 ${currentPosition.borderColor === color ? 'border-orange-500' : 'border-gray-300'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            {/* Custom Color Picker */}
                                            <div className="flex gap-2 mt-2 items-center">
                                                <input
                                                    type="color"
                                                    value={currentPosition.borderColor || '#000000'}
                                                    onChange={(e) => updateElementPosition(selectedElement, { borderColor: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                                    title="Pick custom color"
                                                />
                                                <input
                                                    type="text"
                                                    value={currentPosition.borderColor || '#000000'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                                            updateElementPosition(selectedElement, { borderColor: val });
                                                        }
                                                    }}
                                                    placeholder="#000000"
                                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                />
                                            </div>
                                        </div>

                                        {/* Text Color */}
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Text Color</label>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {['#000000', '#FFFFFF', '#FF6B35', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateElementPosition(selectedElement, { color: color })}
                                                        className={`w-6 h-6 rounded-full border-2 ${currentPosition.color === color ? 'border-orange-500' : 'border-gray-300'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex gap-2 mt-2 items-center">
                                                <input
                                                    type="color"
                                                    value={currentPosition.color || '#000000'}
                                                    onChange={(e) => updateElementPosition(selectedElement, { color: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                                    title="Pick text color"
                                                />
                                                <input
                                                    type="text"
                                                    value={currentPosition.color || '#000000'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                                            updateElementPosition(selectedElement, { color: val });
                                                        }
                                                    }}
                                                    placeholder="#000000"
                                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                />
                                            </div>
                                        </div>

                                        {/* Opacity */}
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Opacity: {Math.round((currentPosition.opacity || 1) * 100)}%</label>
                                            <input
                                                type="range"
                                                value={currentPosition.opacity || 1}
                                                onChange={(e) => updateElementPosition(selectedElement, { opacity: parseFloat(e.target.value) })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                step={0.1}
                                                min={0}
                                                max={1}
                                            />
                                        </div>

                                        {/* Border Width */}
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Thickness</label>
                                            <input
                                                type="range"
                                                value={currentPosition.borderWidth || 1}
                                                onChange={(e) => updateElementPosition(selectedElement, { borderWidth: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                min={1}
                                                max={5}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Visibility Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible</span>
                                    <button
                                        onClick={() => updateElementPosition(selectedElement, { visible: !currentPosition.visible })}
                                        className={`w-12 h-6 rounded-full transition-colors ${currentPosition.visible ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${currentPosition.visible ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Move size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Select an element on the canvas</p>
                            </div>
                        )}

                        {/* Element List */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">All Elements ({activeSide})</h3>
                            <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                {elements
                                    .filter(el => activeSide === 'front' || el.back_position)
                                    .map(el => {
                                        const pos = activeSide === 'front' ? el.front_position : el.back_position;
                                        return (
                                            <button
                                                key={el.element_key}
                                                onClick={() => {
                                                    setSelectedElement(el.element_key);
                                                    setPreviewMode(false);
                                                }}
                                                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm transition-colors ${
                                                    selectedElement === el.element_key
                                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{el.display_name}</span>
                                                    {pos && (
                                                        <span className="text-[10px] text-gray-400">
                                                            ({Math.round(pos.x)},{Math.round(pos.y)})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const side = activeSide;
                                                            setElements(prev => prev.map(elem => {
                                                                if (elem.element_key !== el.element_key) return elem;
                                                                if (side === 'front') {
                                                                    return { ...elem, front_position: { ...elem.front_position, visible: !elem.front_position.visible } };
                                                                } else {
                                                                    return elem.back_position 
                                                                        ? { ...elem, back_position: { ...elem.back_position, visible: !elem.back_position.visible } }
                                                                        : elem;
                                                                }
                                                            }));
                                                        }}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                                        title={pos?.visible ? 'Click to hide' : 'Click to show'}
                                                    >
                                                        {pos?.visible ? (
                                                            <Eye size={14} className="text-green-500" />
                                                        ) : (
                                                            <EyeOff size={14} className="text-red-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CardCanvasEditor;