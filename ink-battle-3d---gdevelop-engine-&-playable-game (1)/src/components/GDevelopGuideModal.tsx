import React, { useState } from 'react';
import { X, BookOpen, Layers, Box, Cpu, Sparkles, Check, Copy, ChevronRight, Terminal, ArrowRight, Shield } from 'lucide-react';
import { GDEVELOP_GUIDES } from '../data/gdevelopGuideData';
import { GDevelopEventBlock, GDevelopModuleGuide } from '../types';

interface GDevelopGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModuleId?: number;
}

export const GDevelopGuideModal: React.FC<GDevelopGuideModalProps> = ({
  isOpen,
  onClose,
  initialModuleId = 1
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentModule = GDEVELOP_GUIDES.find(m => m.moduleId === selectedModuleId) || GDEVELOP_GUIDES[0];

  const handleCopyJson = (data: unknown, idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderEventBlock = (block: GDevelopEventBlock, depth = 0) => {
    return (
      <div
        key={block.id}
        className={`bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow mb-3 ${
          depth > 0 ? 'ml-6 border-l-4 border-l-cyan-500' : ''
        }`}
      >
        {/* EVENT TITLE / COMMENT */}
        <div className="bg-slate-900/90 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-display font-bold text-xs text-slate-200">{block.title}</span>
          </div>
          {block.comment && (
            <span className="text-[11px] text-slate-400 italic hidden md:inline">
              // {block.comment}
            </span>
          )}
        </div>

        {/* GDEVELOP SPLIT LAYOUT: CONDITIONS (LEFT) & ACTIONS (RIGHT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* CONDITIONS SIDE */}
          <div className="p-3 bg-slate-950/70">
            <div className="text-[10px] font-bold text-emerald-400 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Condiciones ({block.conditions.length})
            </div>
            {block.conditions.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Sin condiciones adicionales (Siempre activo)</span>
            ) : (
              <div className="space-y-1.5">
                {block.conditions.map((cond, i) => (
                  <div
                    key={i}
                    className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800/90 rounded-lg px-2.5 py-1.5 flex items-start gap-2"
                  >
                    <span className="text-emerald-400 font-bold font-mono">?</span>
                    <span className="leading-snug">{cond.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS SIDE */}
          <div className="p-3 bg-slate-950/40">
            <div className="text-[10px] font-bold text-cyan-400 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Acciones ({block.actions.length})
            </div>
            {block.actions.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Sin acciones directas (Ver sub-eventos)</span>
            ) : (
              <div className="space-y-1.5">
                {block.actions.map((act, i) => (
                  <div
                    key={i}
                    className="text-xs text-slate-200 bg-slate-900/80 border border-cyan-900/30 rounded-lg px-2.5 py-1.5 flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{act.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SUB-EVENTS */}
        {block.subEvents && block.subEvents.length > 0 && (
          <div className="p-3 bg-slate-900/40 border-t border-slate-800">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
              ↳ Sub-Eventos Jerárquicos:
            </div>
            {block.subEvents.map(sub => renderEventBlock(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-6 select-none">
      <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 md:p-7 max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-500/40 text-indigo-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl text-slate-100">
                  GUÍA TÉCNICA MAESTRA: GDEVELOP 5 EVENT ENGINE
                </h2>
                <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  v5.4+ 3D PBR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lógica paso a paso con condiciones, acciones, variables y extensiones para reproducir INK BATTLE 3D.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* MODULE SELECTOR TABS (1 TO 5) */}
        <div className="flex items-center gap-2 my-3 overflow-x-auto pb-1 flex-shrink-0">
          {GDEVELOP_GUIDES.map((mod) => {
            const isSelected = mod.moduleId === selectedModuleId;
            return (
              <button
                key={mod.moduleId}
                onClick={() => setSelectedModuleId(mod.moduleId)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-display font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-900/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>MÓDULO {mod.moduleId}</span>
                <span className="opacity-70 text-[10px] hidden sm:inline">({mod.category})</span>
              </button>
            );
          })}
        </div>

        {/* MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          {/* MODULE SUMMARY BANNER */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-display font-bold text-base text-cyan-300 mb-1">
              {currentModule.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {currentModule.description}
            </p>

            {/* EXTENSIONS & BEHAVIORS SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              {/* EXTENSIONS */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] font-bold text-indigo-300 uppercase flex items-center gap-1.5 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Extensiones Requeridas de GDevelop:
                </div>
                <div className="space-y-1.5">
                  {currentModule.requiredExtensions.map((ext, idx) => (
                    <div key={idx} className="text-xs">
                      <strong className="text-slate-200">{ext.name}</strong>{' '}
                      <span className="text-slate-500">({ext.author})</span>:
                      <p className="text-slate-400 text-[11px]">{ext.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BEHAVIORS & VARIABLES */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] font-bold text-cyan-300 uppercase flex items-center gap-1.5 mb-2">
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  Comportamientos (Behaviors):
                </div>
                <div className="space-y-1.5">
                  {currentModule.requiredBehaviors.map((beh, idx) => (
                    <div key={idx} className="text-xs">
                      <code className="text-cyan-300 font-mono text-[11px]">{beh.objectName}</code> ➔{' '}
                      <span className="text-slate-200 font-medium">{beh.behaviorName}</span>
                      <p className="text-slate-400 text-[11px]">{beh.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* VARIABLES SCHEMA TABLE */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Variables Clave a Configurar en el Gestor de Variables:</span>
              <button
                onClick={() => handleCopyJson(currentModule.variables, 999)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-normal"
              >
                {copiedIndex === 999 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Esquema JSON</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-1.5 px-2">Ámbito</th>
                    <th className="py-1.5 px-2">Nombre Variable</th>
                    <th className="py-1.5 px-2">Tipo</th>
                    <th className="py-1.5 px-2">Valor Inicial</th>
                    <th className="py-1.5 px-2">Función en el Juego</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {currentModule.variables.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-2 text-indigo-400">{v.scope}</td>
                      <td className="py-2 px-2 text-cyan-300 font-bold">{v.name}</td>
                      <td className="py-2 px-2 text-amber-300">{v.type}</td>
                      <td className="py-2 px-2 text-slate-400">{v.initialValue}</td>
                      <td className="py-2 px-2 font-sans text-slate-300 text-[11px]">{v.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VISUAL EVENT SHEET BLOCKS (GDEVELOP STYLE) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Lógica por Eventos (Arrastrar al Editor de GDevelop 5):
              </span>
              <button
                onClick={() => handleCopyJson(currentModule.eventBlocks, currentModule.moduleId)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 transition cursor-pointer"
              >
                {copiedIndex === currentModule.moduleId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Eventos del Módulo</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentModule.eventBlocks.map(block => renderEventBlock(block))}
            </div>
          </div>

          {/* EXPERT TIPS & BEST PRACTICES */}
          <div className="bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Consejos de Optimización y Rendimiento para GDevelop 5:
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside leading-relaxed">
              {currentModule.expertTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* BOTTOM FOOTER WITH EXPORT ALL INFO */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0 text-xs text-slate-400">
          <span>Consejo: Puedes arrastrar estas condiciones directamente en la pestaña "Eventos de Escena" en GDevelop.</span>
          <button
            onClick={() => handleCopyJson(GDEVELOP_GUIDES, 1000)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            {copiedIndex === 1000 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>COPIAR MANUAL COMPLETO EN JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
