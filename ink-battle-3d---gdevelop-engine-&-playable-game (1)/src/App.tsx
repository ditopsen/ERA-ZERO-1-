import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeGameEngine } from './game/threeEngine';
import { HUD } from './components/HUD';
import { InkBrushCanvas } from './components/InkBrushCanvas';
import { CustomizerModal } from './components/CustomizerModal';
import { LobbyModal } from './components/LobbyModal';
import { GDevelopGuideModal } from './components/GDevelopGuideModal';
import { sounds } from './game/audio';
import { MAPS_CATALOG } from './data/gdevelopGuideData';
import { BotConfig, BotDifficulty, CraftedItem, KillFeedItem, MapData, MapId, PlayerCustomization, TeamId } from './types';
import confetti from 'canvas-confetti';
import { Sparkles, User, MapPin, BookOpen, Volume2, VolumeX, Shield, Play } from 'lucide-react';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeGameEngine | null>(null);
  const respawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Player State
  const [playerHp, setPlayerHp] = useState(100);
  const [maxPlayerHp] = useState(100);
  const [respawnTimer, setRespawnTimer] = useState(0);
  const [isHazardActive, setIsHazardActive] = useState(false);

  // Core States
  const [coreA_Hp, setCoreA_Hp] = useState(1000);
  const [coreB_Hp, setCoreB_Hp] = useState(1000);
  const [canRespawnA, setCanRespawnA] = useState(true);
  const [canRespawnB, setCanRespawnB] = useState(true);

  // Customization & Team Colors
  const [customization, setCustomization] = useState<PlayerCustomization>({
    name: 'Agente Neón',
    gender: 'female',
    outfit: 'tactical',
    hairColor: '#06b6d4',
    teamColor: 'cyan',
    teamHex: '#06b6d4'
  });
  const [takenColors, setTakenColors] = useState<Record<TeamId, boolean>>({
    cyan: true, // Selected by player
    magenta: true, // Claimed by enemy bots
    yellow: false,
    green: false
  });

  // Map & Lobby
  const [selectedMapId, setSelectedMapId] = useState<MapId>('nexus_citadel');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [botCount, setBotCount] = useState(2);
  const [roomCode, setRoomCode] = useState('INK-7492');

  // Equipped Weapon / Craft
  const [equippedItem, setEquippedItem] = useState<CraftedItem | null>(null);

  // Match Status
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [winner, setWinner] = useState<TeamId | null>(null);
  const [endMessage, setEndMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Modals
  const [isBrushOpen, setIsBrushOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideInitialModule, setGuideInitialModule] = useState(1);

  const currentMapData: MapData = MAPS_CATALOG.find(m => m.id === selectedMapId) || MAPS_CATALOG[0];

  // Spawn Bots helper based on difficulty and count
  const createBotConfigs = useCallback((difficulty: BotDifficulty, count: number): BotConfig[] => {
    const diffSettings = {
      easy: { speed: 140, reactionTime: 1.2, accuracy: 0.5 },
      medium: { speed: 220, reactionTime: 0.6, accuracy: 0.75 },
      hard: { speed: 300, reactionTime: 0.25, accuracy: 0.95 }
    };
    const s = diffSettings[difficulty];
    const botNames = ['Bot Croma-01', 'Bot Toxi-02', 'Bot Vórtice-03'];

    return Array.from({ length: count }, (_, i) => ({
      id: `bot_${i}`,
      name: botNames[i] || `Bot Alfa-${i + 1}`,
      team: 'magenta',
      difficulty,
      speed: s.speed,
      reactionTime: s.reactionTime,
      accuracy: s.accuracy,
      hp: 100,
      maxHp: 100,
      isAlive: true,
      respawnTime: 0,
      targetCore: difficulty === 'hard'
    }));
  }, []);

  // Initialize Three.js Game Engine
  const startMatch = useCallback(() => {
    if (!canvasContainerRef.current) return;

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    
    if (respawnIntervalRef.current) {
      clearInterval(respawnIntervalRef.current);
      respawnIntervalRef.current = null;
    }

    setPlayerHp(100);
    setCoreA_Hp(1000);
    setCoreB_Hp(1000);
    setCanRespawnA(true);
    setCanRespawnB(true);
    setWinner(null);
    setEndMessage('');
    setRespawnTimer(0);
    setKillFeed([]);

    const engine = new ThreeGameEngine(
      canvasContainerRef.current,
      customization,
      selectedMapId,
      {
        onPlayerHpChange: (hp) => {
          setPlayerHp(hp);
        },
        onPlayerDied: (canRespawn, respawnSecs) => {
          setRespawnTimer(respawnSecs);
          if (canRespawn) {
            respawnIntervalRef.current = setInterval(() => {
              setRespawnTimer((prev) => {
                if (prev <= 1) {
                  if (respawnIntervalRef.current) clearInterval(respawnIntervalRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        },
        onCoreHpChange: (hpA, hpB, respawnA, respawnB) => {
          setCoreA_Hp(hpA);
          setCoreB_Hp(hpB);
          setCanRespawnA(respawnA);
          setCanRespawnB(respawnB);
        },
        onKillFeed: (killer, victim, weapon) => {
          setKillFeed((prev) => [
            ...prev,
            { id: String(Date.now() + Math.random()), killer, victim, weapon, timestamp: Date.now() }
          ]);
        },
        onMatchEnd: (winTeam, msg) => {
          setWinner(winTeam);
          setEndMessage(msg);
          if (winTeam === 'cyan') {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
          }
        },
        onHazardTrigger: (active) => {
          setIsHazardActive(active);
        }
      }
    );

    // Equip previous item if any
    if (equippedItem) {
      engine.equipCraftedItem(equippedItem);
    }

    // Spawn Bots
    const bots = createBotConfigs(botDifficulty, botCount);
    engine.setupBots(bots);

    engineRef.current = engine;
  }, [customization, selectedMapId, botDifficulty, botCount, equippedItem, createBotConfigs]);

  // Initial mount
  useEffect(() => {
    startMatch();
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (respawnIntervalRef.current) {
        clearInterval(respawnIntervalRef.current);
      }
    };
  }, [startMatch]);

  // Global key listener for 'E' (Open Magic Brush)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && !isBrushOpen && !isCustomizerOpen && !isLobbyOpen && !isGuideOpen) {
        setIsBrushOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBrushOpen, isCustomizerOpen, isLobbyOpen, isGuideOpen]);

  // Crafting Callback
  const handleCraftSuccess = (item: CraftedItem) => {
    setEquippedItem(item);
    if (engineRef.current) {
      engineRef.current.equipCraftedItem(item);
    }
  };

  // Customization Save Callback
  const handleSaveCustomization = (newCust: PlayerCustomization) => {
    setCustomization(newCust);
    // Update color locks
    setTakenColors({
      cyan: newCust.teamColor === 'cyan',
      magenta: true, // Rival bots
      yellow: newCust.teamColor === 'yellow',
      green: newCust.teamColor === 'green'
    });
    // Restart match with updated mesh
    setTimeout(startMatch, 50);
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleGenerateRoomCode = () => {
    const code = 'INK-' + Math.floor(1000 + Math.random() * 9000);
    setRoomCode(code);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WEBGL ENGINE CANVAS CONTAINER */}
      <div
        ref={canvasContainerRef}
        className="w-full h-full cursor-crosshair focus:outline-none"
        tabIndex={0}
      />

      {/* TOP FLOATING UTILITY BAR */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          id="btn-quick-customizer"
          onClick={() => setIsCustomizerOpen(true)}
          className="bg-slate-900/85 hover:bg-slate-850 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl shadow backdrop-blur transition flex items-center gap-1.5 cursor-pointer"
        >
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>Personaje ({customization.gender === 'female' ? 'Mujer' : 'Hombre'})</span>
        </button>

        <button
          id="btn-quick-lobby"
          onClick={() => setIsLobbyOpen(true)}
          className="bg-slate-900/85 hover:bg-slate-850 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl shadow backdrop-blur transition flex items-center gap-1.5 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mapas & IA ({botDifficulty})</span>
        </button>
      </div>

      {/* HEADS UP DISPLAY */}
      <HUD
        playerHp={playerHp}
        maxPlayerHp={maxPlayerHp}
        coreA_Hp={coreA_Hp}
        coreB_Hp={coreB_Hp}
        canRespawnA={canRespawnA}
        canRespawnB={canRespawnB}
        equippedItem={equippedItem}
        killFeed={killFeed}
        currentMap={currentMapData}
        isHazardActive={isHazardActive}
        respawnTimer={respawnTimer}
        isMuted={isMuted}
        winner={winner}
        endMessage={endMessage}
        onOpenBrush={() => setIsBrushOpen(true)}
        onOpenGuide={() => {
          setGuideInitialModule(1);
          setIsGuideOpen(true);
        }}
        onOpenLobby={() => setIsLobbyOpen(true)}
        onToggleMute={handleToggleMute}
        onRestartMatch={startMatch}
      />

      {/* MODAL 1: MAGIC INK BRUSH (2D TO 3D WEAPON/SHIELD) */}
      <InkBrushCanvas
        isOpen={isBrushOpen}
        onClose={() => setIsBrushOpen(false)}
        onCraftSuccess={handleCraftSuccess}
        playerColorHex={customization.teamHex}
      />

      {/* MODAL 2: 3D CHARACTER CUSTOMIZER & COLOR LOCKING */}
      <CustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        customization={customization}
        onSave={handleSaveCustomization}
        takenColors={takenColors}
      />

      {/* MODAL 3: MULTIPLAYER LOBBY, MAPS & BOT AI */}
      <LobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        selectedMap={selectedMapId}
        onSelectMap={(mapId) => setSelectedMapId(mapId)}
        botDifficulty={botDifficulty}
        onChangeBotDifficulty={(diff) => setBotDifficulty(diff)}
        botCount={botCount}
        onChangeBotCount={(count) => setBotCount(count)}
        onStartMatch={startMatch}
        roomCode={roomCode}
        onGenerateRoomCode={handleGenerateRoomCode}
      />

      {/* MODAL 4: GDEVELOP 5 EVENT SHEET MASTER MANUAL */}
      <GDevelopGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        initialModuleId={guideInitialModule}
      />
    </div>
  );
}
