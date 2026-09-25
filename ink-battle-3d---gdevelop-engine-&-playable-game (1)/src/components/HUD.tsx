import React from 'react';
import { Zap, Sparkles, AlertTriangle, Crosshair, MapPin, BookOpen } from 'lucide-react';
import { CraftedItem, KillFeedItem, MapData, TeamId } from '../types';

interface HUDProps {
  playerHp: number;
  maxPlayerHp: number;
  coreA_Hp: number;
  coreB_Hp: number;
  canRespawnA: boolean;
  canRespawnB: boolean;
  equippedItem: CraftedItem | null;
  killFeed: KillFeedItem[];
  currentMap: MapData;
  isHazardActive: boolean;
  respawnTimer: number;
  isPaused: boolean;
  showBrushPrompt: boolean;
  coreAWorldRef: React.RefObject<HTMLDivElement | null>;
  coreBWorldRef: React.RefObject<HTMLDivElement | null>;
  winner: TeamId | null;
  endMessage: string;
  onOpenBrush: () => void;
  onOpenGuide: () => void;
  onTogglePause: () => void;
  onRestartMatch: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerHp,
  maxPlayerHp,
  coreA_Hp,
  coreB_Hp,
  canRespawnA,
  canRespawnB,
  equippedItem,
  killFeed,
  currentMap,
  isHazardActive,
  respawnTimer,
  isPaused,
  showBrushPrompt,
  coreAWorldRef,
  coreBWorldRef,
  winner,
  endMessage,
  onOpenBrush,
  onOpenGuide,
  onTogglePause,
  onRestartMatch
}) => {
  const hpPercent = Math.max(0, Math.min(100, (playerHp / maxPlayerHp) * 100));
  const coreAPercent = Math.max(0, Math.min(100, (coreA_Hp / 1000) * 100));
  const coreBPercent = Math.max(0, Math.min(100, (coreB_Hp / 1000) * 100));

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden flex flex-col justify-between p-4 md:p-6">
      {/* HAZARD RED VIGNETTE OVERLAY */}
      {isHazardActive && (
        <div className="absolute inset-0 border-8 border-rose-600/80 bg-rose-950/25 pointer-events-none animate-pulse transition-all duration-200" />
      )}

      <div className="absolute left-1/2 top-4 -translate-x-1/2 text-center pointer-events-none">
        <span className="font-display text-xs font-bold tracking-widest text-slate-300">INK BATTLE 3D</span>
        <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <MapPin className="h-3 w-3 text-sky-400" />
          <span>{currentMap.name.split(':')[1] || currentMap.name}</span>
        </div>
      </div>

      <div ref={coreAWorldRef} className="absolute z-10 w-[min(220px,42vw)] -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-none" style={{ left: 0, top: 0, visibility: 'hidden' }}>
        <div className="rounded border border-cyan-400/60 bg-slate-950/90 px-2.5 py-2 shadow-lg shadow-cyan-950/40">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold text-cyan-200"><span>NÚCLEO ALIADO</span><span>{Math.round(coreA_Hp)} / 1000 PV</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400 transition-[width] duration-200" style={{ width: `${coreAPercent}%` }} /></div>
          <div className={`mt-1 text-[9px] ${canRespawnA ? 'text-emerald-300' : 'text-rose-300'}`}>{canRespawnA ? 'REAPARICIÓN ACTIVA' : 'REAPARICIÓN DESACTIVADA'}</div>
        </div>
      </div>
      <div ref={coreBWorldRef} className="absolute z-10 w-[min(220px,42vw)] -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-none" style={{ left: 0, top: 0, visibility: 'hidden' }}>
        <div className="rounded border border-pink-400/60 bg-slate-950/90 px-2.5 py-2 shadow-lg shadow-pink-950/40">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold text-pink-200"><span>NÚCLEO RIVAL</span><span>{Math.round(coreB_Hp)} / 1000 PV</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-pink-400 transition-[width] duration-200" style={{ width: `${coreBPercent}%` }} /></div>
          <div className={`mt-1 text-[9px] ${canRespawnB ? 'text-emerald-300' : 'text-rose-300'}`}>{canRespawnB ? 'REAPARICIÓN ACTIVA' : 'REAPARICIÓN DESACTIVADA'}</div>
        </div>
      </div>

      {/* CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <Crosshair className="w-6 h-6 text-cyan-400/70" />
        <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full absolute" />
      </div>

      {/* KILL FEED (TOP RIGHT) */}
      <div className="absolute top-24 right-4 flex flex-col gap-1 max-w-xs pointer-events-none">
        {killFeed.slice(-4).map((k) => (
          <div key={k.id} className="bg-slate-950/80 border border-slate-800 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 text-slate-200 animate-fade-in shadow">
            <span className="text-cyan-400 font-semibold">{k.killer}</span>
            <span className="text-slate-500">[{k.weapon}]</span>
            <span className="text-pink-400 font-semibold">{k.victim}</span>
          </div>
        ))}
      </div>

      {/* BOTTOM BAR: PLAYER HP, WEAPON, PINSEL BUTTON & DEVELOPER GUIDE TOGGLE */}
      <div className="w-full flex items-end justify-between gap-4 pointer-events-auto">
        {/* PLAYER STATUS (LEFT) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 min-w-[280px] shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-display text-sm font-bold text-slate-100">SALUD DEL JUGADOR</span>
            </div>
              <span className="font-mono font-bold text-sm text-cyan-300">{Math.round(playerHp)} / {maxPlayerHp} PV</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-200 ${
                hpPercent > 50 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : hpPercent > 20 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          {/* EQUIPPED WEAPON / CRAFT STATUS */}
          <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800 pt-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Arma 3D:
            </span>
            <span className="font-semibold text-cyan-200">
              {equippedItem ? `${equippedItem.name} (${equippedItem.perk})` : 'Blaster Básico de Tinta'}
            </span>
          </div>
        </div>

        {showBrushPrompt && <div className="flex flex-col items-center gap-2">
          <button
            id="btn-open-magic-brush"
            onClick={onOpenBrush}
            className="group relative px-6 py-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-base rounded-xl shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2.5 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-slate-950 animate-spin" style={{ animationDuration: '6s' }} />
            <span>PINCEL MÁGICO: DIBUJAR 2D A 3D</span>
            <span className="bg-slate-950/20 text-slate-950 font-mono text-xs px-1.5 py-0.5 rounded ml-1">Tecla E</span>
          </button>
        </div>}
      </div>

      {isPaused && !winner && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-30">
          <div className="text-center">
            <h2 className="font-display font-bold text-3xl text-slate-100 mb-4">PARTIDA EN PAUSA</h2>
            <button
              onClick={onTogglePause}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold rounded-lg cursor-pointer"
            >
              REANUDAR
            </button>
          </div>
        </div>
      )}

      {/* RESPAWN COUNTDOWN MODAL */}
      {respawnTimer > 0 && playerHp <= 0 && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-40">
          <div className="bg-slate-900 border border-cyan-500/50 p-6 rounded-2xl text-center max-w-sm shadow-2xl">
            <h2 className="font-display font-bold text-2xl text-rose-400 mb-2">¡HAS SIDO DERRIBADO!</h2>
            <p className="text-slate-300 text-sm mb-4">El Núcleo Aliado tiene soporte vital activo. Reensamblando cuerpo de tinta...</p>
            <div className="text-4xl font-mono font-bold text-cyan-300 animate-bounce mb-2">
              {Math.ceil(respawnTimer)}s
            </div>
            <div className="text-xs text-slate-400">Reaparecerás en el punto de spawn de la Base Sur</div>
          </div>
        </div>
      )}

      {/* MATCH END SCREEN (VICTORY / DEFEAT) */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center pointer-events-auto z-50 p-6">
          <div className="bg-slate-900 border-2 border-cyan-400/60 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-cyan-500/20 border border-cyan-400">
              {winner === 'cyan' ? <Sparkles className="w-8 h-8 text-cyan-400" /> : <AlertTriangle className="w-8 h-8 text-rose-400" />}
            </div>
            <h2 className={`font-display font-bold text-3xl mb-2 ${winner === 'cyan' ? 'text-cyan-300' : 'text-rose-400'}`}>
              {winner === 'cyan' ? '¡VICTORIA ÉPICA!' : 'DERROTA TOTAL'}
            </h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{endMessage}</p>

            <div className="flex flex-col gap-3">
              <button
                id="btn-restart-match"
                onClick={onRestartMatch}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold rounded-xl shadow-lg transition cursor-pointer"
              >
                JUGAR DE NUEVO / REINICIAR PARTIDA
              </button>
              <button
                id="btn-end-guide"
                onClick={onOpenGuide}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-display text-sm font-semibold rounded-xl border border-indigo-500/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                VER CÓMO PROGRAMARLO EN GDEVELOP 5
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
