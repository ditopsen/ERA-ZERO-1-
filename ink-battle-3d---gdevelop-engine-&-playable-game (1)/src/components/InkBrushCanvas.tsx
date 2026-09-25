import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, Shield, Zap, RefreshCw, Layers, Check } from 'lucide-react';
import { CraftedItem, CraftedItemType, DrawingPoint } from '../types';

interface InkBrushCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onCraftSuccess: (item: CraftedItem) => void;
  playerColorHex: string;
}

export const InkBrushCanvas: React.FC<InkBrushCanvasProps> = ({
  isOpen,
  onClose,
  onCraftSuccess,
  playerColorHex
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<DrawingPoint[]>([]);
  const [detectedType, setDetectedType] = useState<CraftedItemType>('sword');
  const [activeTemplate, setActiveTemplate] = useState<'free' | 'sword' | 'shield' | 'cannon'>('free');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    setPoints([]);
    setDetectedType('sword');
  }, [isOpen]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setPoints([pt]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = playerColorHex || '#06b6d4';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 12;
    ctx.shadowColor = playerColorHex || '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    const newPts = [...points, pt];
    setPoints(newPts);
    analyzeStrokeShape(newPts);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    setPoints([]);
    setActiveTemplate('free');
  };

  // Automated shape recognition algorithm
  const analyzeStrokeShape = (pts: DrawingPoint[]) => {
    if (pts.length < 5) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    pts.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / (height || 1);

    const first = pts[0];
    const last = pts[pts.length - 1];
    const closeDist = Math.hypot(last.x - first.x, last.y - first.y);

    if (closeDist < 50 && width > 60 && height > 60 && Math.abs(aspectRatio - 1.0) < 0.6) {
      setDetectedType('shield');
    } else if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      setDetectedType('sword');
    } else if (pts.length > 25) {
      setDetectedType('cannon');
    } else {
      setDetectedType('sword');
    }
  };

  const applyTemplate = (type: 'sword' | 'shield' | 'cannon') => {
    setActiveTemplate(type);
    setDetectedType(type);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas();
    ctx.strokeStyle = playerColorHex || '#06b6d4';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 14;
    ctx.shadowColor = playerColorHex || '#06b6d4';

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (type === 'sword') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 130);
      ctx.lineTo(cx, cy + 90);
      ctx.moveTo(cx - 40, cy + 40);
      ctx.lineTo(cx + 40, cy + 40);
      ctx.stroke();
    } else if (type === 'shield') {
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'cannon') {
      ctx.beginPath();
      ctx.moveTo(cx - 70, cy + 30);
      ctx.lineTo(cx + 70, cy - 30);
      ctx.moveTo(cx - 20, cy + 70);
      ctx.lineTo(cx + 20, cy - 70);
      ctx.stroke();
    }
  };

  const handleForge = () => {
    let item: CraftedItem;

    if (detectedType === 'sword') {
      item = {
        id: 'sword_' + Date.now(),
        type: 'sword',
        name: 'Hoja de Tinta Fulgurante 3D',
        description: 'Forjada a mano. Aumenta la velocidad de movimiento y el daño de corte en combate cerrado.',
        durability: 100,
        maxDurability: 100,
        power: 35,
        color: playerColorHex || '#06b6d4',
        icon: 'sword',
        perk: '+35 Daño Melee & Velocidad +25%',
        createdAt: Date.now()
      };
    } else if (detectedType === 'shield') {
      item = {
        id: 'shield_' + Date.now(),
        type: 'shield',
        name: 'Baluarte de Prisma 3D',
        description: 'Genera una barrera física en el brazo izquierdo que dispersa proyectiles.',
        durability: 120,
        maxDurability: 120,
        power: 60,
        color: playerColorHex || '#06b6d4',
        icon: 'shield',
        perk: 'Absorbe 60% Daño de Impacto',
        createdAt: Date.now()
      };
    } else {
      item = {
        id: 'cannon_' + Date.now(),
        type: 'cannon',
        name: 'Cañón Pesado Croma 3D',
        description: 'Instanciado en la mano derecha. Dispara orbes gigantes de tinta con daño de impacto concentrado.',
        durability: 80,
        maxDurability: 80,
        power: 45,
        color: playerColorHex || '#06b6d4',
        icon: 'cannon',
        perk: 'Proyectiles Pesados Explosivos 45 HP',
        createdAt: Date.now()
      };
    }

    onCraftSuccess(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in fade-in zoom-in-95">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">PINCEL MÁGICO: FORJA 2D A OBJETO 3D</h2>
              <p className="text-xs text-slate-400">Traza la forma libremente con el ratón o usa una plantilla para instanciar en las manos del personaje.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TEMPLATE QUICK SELECTORS */}
        <div className="flex items-center gap-2 my-3">
          <span className="text-xs font-semibold text-slate-400">Plantillas Rápidas:</span>
          <button
            onClick={() => applyTemplate('sword')}
            className={`px-3 py-1 text-xs rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
              detectedType === 'sword' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Espada Táctica
          </button>
          <button
            onClick={() => applyTemplate('shield')}
            className={`px-3 py-1 text-xs rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
              detectedType === 'shield' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Escudo Prisma
          </button>
          <button
            onClick={() => applyTemplate('cannon')}
            className={`px-3 py-1 text-xs rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
              detectedType === 'cannon' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Cañón Pesado
          </button>
          <button
            onClick={clearCanvas}
            className="ml-auto text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            title="Borrar Lienzo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>

        {/* DRAWING CANVAS */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner bg-slate-950 flex justify-center">
          <canvas
            ref={canvasRef}
            width={480}
            height={260}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none w-full max-w-[480px] h-[260px]"
          />

          {/* REALTIME SHAPE RECOGNITION BADGE */}
          <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-display font-semibold text-slate-200">
              Detectado: <strong className="text-cyan-300 uppercase">{detectedType === 'sword' ? 'Espada 3D' : detectedType === 'shield' ? 'Escudo 3D' : 'Cañón 3D'}</strong>
            </span>
          </div>
        </div>

        {/* FORGE STATS & TRIGGER */}
        <div className="mt-4 flex items-center justify-between bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="text-xs">
            <span className="text-slate-400">Efecto al equipar:</span>
            <p className="text-cyan-300 font-semibold font-mono mt-0.5">
              {detectedType === 'sword' && '⚡ +35 Daño Melee & Movilidad incrementada'}
              {detectedType === 'shield' && '🛡️ Absorbe 60% de daño frontal en combate'}
              {detectedType === 'cannon' && '💥 Proyectiles balísticos pesados de 45 de daño'}
            </p>
          </div>

          <button
            id="btn-forge-3d-item"
            onClick={handleForge}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>FORJAR EN 3D</span>
          </button>
        </div>

        {/* MINI GDEVELOP LOGIC EXPLANATION */}
        <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <span>GDevelop 5: ShapePainter 2D captura trazo ➔ Condición AspectRatio ➔ Acción "Create 3D Object" & Attach</span>
          <span className="text-cyan-400">100% Funcional</span>
        </div>
      </div>
    </div>
  );
};
