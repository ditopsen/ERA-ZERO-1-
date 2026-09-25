import React, { useState } from 'react';
import { X, Check, Lock, User, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { PlayerCustomization, TeamId } from '../types';

interface CustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: PlayerCustomization;
  onSave: (newCust: PlayerCustomization) => void;
  takenColors: Record<TeamId, boolean>;
}

const AVAILABLE_HAIR_COLORS = [
  { name: 'Cian Neón', hex: '#06b6d4' },
  { name: 'Magenta Punk', hex: '#ec4899' },
  { name: 'Volt Amarillo', hex: '#eab308' },
  { name: 'Verde Ácido', hex: '#22c55e' },
  { name: 'Plata Croma', hex: '#cbd5e1' },
  { name: 'Obsidiana', hex: '#1e293b' }
];

const TEAMS: { id: TeamId; name: string; hex: string; desc: string }[] = [
  { id: 'cyan', name: 'Equipo Cian (NEXUS)', hex: '#06b6d4', desc: 'Vanguardia Cibernética' },
  { id: 'magenta', name: 'Equipo Magenta (CROMA)', hex: '#ec4899', desc: 'Sindicato de Pigmentos' },
  { id: 'yellow', name: 'Equipo Volt (VACÍO)', hex: '#eab308', desc: 'Guardianes del Éter' },
  { id: 'green', name: 'Equipo Ácido (BIO)', hex: '#22c55e', desc: 'Bioluminiscentes' }
];

export const CustomizerModal: React.FC<CustomizerModalProps> = ({
  isOpen,
  onClose,
  customization,
  onSave,
  takenColors
}) => {
  const [name, setName] = useState(customization.name);
  const [gender, setGender] = useState<'male' | 'female'>(customization.gender);
  const [outfit, setOutfit] = useState(customization.outfit);
  const [hairColor, setHairColor] = useState(customization.hairColor);
  const [teamColor, setTeamColor] = useState<TeamId>(customization.teamColor);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTeamColor = (tId: TeamId, hex: string) => {
    // Check if color is taken by rival team or other player
    if (takenColors[tId] && tId !== customization.teamColor) {
      setErrorMessage(`¡El color ${tId.toUpperCase()} ya ha sido reclamado por otro jugador o equipo!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setTeamColor(tId);
    setErrorMessage(null);
  };

  const handleSave = () => {
    const selectedTeam = TEAMS.find(t => t.id === teamColor);
    onSave({
      name: name || 'Agente Tinta',
      gender,
      outfit,
      hairColor,
      teamColor,
      teamHex: selectedTeam ? selectedTeam.hex : '#06b6d4'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in fade-in zoom-in-95">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">PERSONALIZACIÓN 3D & BLOQUEO DE COLORES</h2>
              <p className="text-xs text-slate-400">Configura la apariencia de tu avatar y valida colores disponibles de equipo.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR NOTIFICATION FOR COLOR LOCK */}
        {errorMessage && (
          <div className="mt-3 bg-rose-950/80 border border-rose-500/60 p-2.5 rounded-xl flex items-center gap-2 text-rose-200 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* NAME INPUT */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Agente:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-200 focus:outline-none focus:border-cyan-400"
              placeholder="Ingresa tu nombre..."
              maxLength={16}
            />
          </div>

          {/* GENDER / 3D BODY RIG SELECTION */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Silueta del Modelo 3D:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  gender === 'female' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-display font-bold text-sm">Avatar Femenino</div>
                  <div className="text-[11px] opacity-75">Silueta ágil con peinado recogido</div>
                </div>
                {gender === 'female' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => setGender('male')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  gender === 'male' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-display font-bold text-sm">Avatar Masculino</div>
                  <div className="text-[11px] opacity-75">Silueta robusta con corte undercut</div>
                </div>
                {gender === 'male' && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* TEAM COLOR LOCKING SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Color de Equipo (Sistema de Bloqueo Exclusivo):</label>
              <span className="text-[10px] text-slate-400">Solo 1 equipo por color</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {TEAMS.map((t) => {
                const isTaken = takenColors[t.id] && t.id !== customization.teamColor;
                const isSelected = teamColor === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isTaken}
                    onClick={() => handleSelectTeamColor(t.id, t.hex)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      isTaken
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-50 cursor-not-allowed text-slate-500'
                        : isSelected
                        ? 'bg-slate-850 border-cyan-400 ring-1 ring-cyan-400 cursor-pointer text-slate-100'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: t.hex }} />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {t.name}
                          {isTaken && <Lock className="w-3 h-3 text-rose-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400">{isTaken ? 'Reclamado por Rival' : t.desc}</div>
                      </div>
                    </div>
                    {isSelected && !isTaken && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HAIR COLOR */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tinte de Cabello / Tinta:</label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVAILABLE_HAIR_COLORS.map((h) => (
                <button
                  key={h.hex}
                  type="button"
                  onClick={() => setHairColor(h.hex)}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    hairColor === h.hex ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.hex }} />
                  <span>{h.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            GDevelop 5: Valida con <code className="text-cyan-400 font-mono">GlobalVariable(ColorTaken)</code>
          </div>
          <button
            id="btn-save-customizer"
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-sm rounded-xl shadow transition cursor-pointer"
          >
            GUARDAR Y APLICAR
          </button>
        </div>
      </div>
    </div>
  );
};
