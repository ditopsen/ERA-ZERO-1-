import React, { useState } from 'react';
import { X, Users, Bot, Wifi, Copy, Check, Play, MapPin, Zap, Flame, ShieldAlert } from 'lucide-react';
import { BotDifficulty, MapId } from '../types';
import { MAPS_CATALOG } from '../data/gdevelopGuideData';

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMap: MapId;
  onSelectMap: (mapId: MapId) => void;
  botDifficulty: BotDifficulty;
  onChangeBotDifficulty: (diff: BotDifficulty) => void;
  botCount: number;
  onChangeBotCount: (count: number) => void;
  onStartMatch: () => void;
  roomCode: string;
  onGenerateRoomCode: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  onClose,
  selectedMap,
  onSelectMap,
  botDifficulty,
  onChangeBotDifficulty,
  botCount,
  onChangeBotCount,
  onStartMatch,
  roomCode,
  onGenerateRoomCode
}) => {
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');
  const [copied, setCopied] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (!joinCodeInput) return;
    setConnectionStatus(`Conectando mediante Broker WebRTC P2P a sala ${joinCodeInput}...`);
    setTimeout(() => {
      setConnectionStatus(`¡Conectado exitosamente como Cliente a ${joinCodeInput}!`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in-95">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">SISTEMA MULTIJUGADOR, MAPAS & BOTS IA</h2>
              <p className="text-xs text-slate-400">Configura salas por código único o combate offline con IA escalable.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS: OFFLINE BOTS VS ONLINE P2P ROOMS */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <button
            onClick={() => setActiveTab('offline')}
            className={`py-2.5 rounded-xl border text-xs font-display font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>MODO OFFLINE (BOTS CON IA)</span>
          </button>

          <button
            onClick={() => setActiveTab('online')}
            className={`py-2.5 rounded-xl border text-xs font-display font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'online'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>MODO ONLINE (SALAS P2P POR CÓDIGO)</span>
          </button>
        </div>

        {/* TAB CONTENT: OFFLINE BOTS */}
        {activeTab === 'offline' && (
          <div className="space-y-4 my-2">
            {/* BOT DIFFICULTY SELECTOR */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dificultad de la Inteligencia Artificial:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* EASY */}
                <button
                  onClick={() => onChangeBotDifficulty('easy')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    botDifficulty === 'easy'
                      ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                    <Zap className="w-3.5 h-3.5" />
                    FÁCIL
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Reacción lenta (1.2s), puntería dispersa y patrulla básica.
                  </div>
                </button>

                {/* MEDIUM */}
                <button
                  onClick={() => onChangeBotDifficulty('medium')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    botDifficulty === 'medium'
                      ? 'bg-amber-950/40 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    MEDIA
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Reacción regular (0.6s), persecución activa y disparo continuo.
                  </div>
                </button>

                {/* HARD */}
                <button
                  onClick={() => onChangeBotDifficulty('hard')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    botDifficulty === 'hard'
                      ? 'bg-rose-950/40 border-rose-400 text-rose-200 ring-1 ring-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    DIFÍCIL
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Reacción rápida (0.25s), predictiva y ataca el Núcleo Aliado.
                  </div>
                </button>
              </div>
            </div>

            {/* BOT COUNT */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-300">Cantidad de Bots Rivales:</span>
                <p className="text-[11px] text-slate-400">Bots que defenderán la base enemiga</p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => onChangeBotCount(num)}
                    className={`w-9 h-9 rounded-lg font-mono font-bold text-sm border transition cursor-pointer ${
                      botCount === num
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: ONLINE P2P ROOMS */}
        {activeTab === 'online' && (
          <div className="space-y-4 my-2">
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300 block mb-1">Tu Código Único de Sala (Host):</span>
              <div className="flex items-center gap-2">
                <div className="bg-slate-900 border border-cyan-500/40 rounded-xl px-4 py-2 font-mono font-bold text-lg text-cyan-300 tracking-wider flex-1">
                  {roomCode}
                </div>
                <button
                  onClick={copyCode}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  onClick={onGenerateRoomCode}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs cursor-pointer"
                  title="Generar Nuevo Código"
                >
                  Nuevo
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                En GDevelop 5 esto utiliza la acción: <code className="text-cyan-400 font-mono">P2P::Connect(Broker, "INK-" + RandomInRange)</code>.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300 block mb-1">Unirse a una Partida Existente:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ej: INK-4819"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-200 font-mono tracking-wider flex-1 focus:outline-none focus:border-cyan-400 uppercase"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-semibold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  UNIRSE
                </button>
              </div>
              {connectionStatus && (
                <div className="mt-2 text-xs text-cyan-400 font-mono animate-fade-in">
                  {connectionStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAP SELECTOR (FOR BOTH MODES) */}
        <div className="my-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Seleccionar Mapa Oficial de Batalla:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {MAPS_CATALOG.map((m) => {
              const isSelected = selectedMap === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMap(m.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850 border-cyan-400 ring-1 ring-cyan-400'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-display font-bold text-cyan-300 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{m.name.split(':')[1] || m.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                    {m.theme}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            Dificultad seleccionada: <strong className="text-cyan-400 uppercase">{botDifficulty}</strong> | Mapa: <strong className="text-cyan-400">{selectedMap}</strong>
          </div>
          <button
            id="btn-apply-lobby-match"
            onClick={() => {
              onStartMatch();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>APLICAR Y EMPEZAR PARTIDA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
