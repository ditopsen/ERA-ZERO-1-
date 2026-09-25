import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeGameEngine } from './game/threeEngine';
import { HUD } from './components/HUD';
import { InkBrushCanvas } from './components/InkBrushCanvas';
import { CustomizerModal } from './components/CustomizerModal';
import { LobbyModal } from './components/LobbyModal';
import { GDevelopGuideModal } from './components/GDevelopGuideModal';
import { MAPS_CATALOG } from './data/gdevelopGuideData';
import { BotConfig, BotDifficulty, CraftedItem, KillFeedItem, MapData, MapId, PlayerCustomization, TeamId } from './types';
import confetti from 'canvas-confetti';
import { User, MapPin, BookOpen, Play } from 'lucide-react';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeGameEngine | null>(null);
  const respawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const coreAWorldRef = useRef<HTMLDivElement | null>(null);
  const coreBWorldRef = useRef<HTMLDivElement | null>(null);
  const hasPlayerActedRef = useRef(false);

  // Player State
  const [playerHp, setPlayerHp] = useState(200);
  const maxPlayerHp = 200;
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
  const [isPaused, setIsPaused] = useState(false);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);

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

    setPlayerHp(200);
    setCoreA_Hp(1000);
    setCoreB_Hp(1000);
    setCanRespawnA(true);
    setCanRespawnB(true);
    setWinner(null);
    setEndMessage('');
    setIsPaused(false);
    isPausedRef.current = false;
    hasPlayerActedRef.current = false;
    setHasPlayerActed(false);
    setRespawnTimer(0);
    setIsHazardActive(false);
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
                if (isPausedRef.current) return prev;
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
        onCoreScreenPositionsChange: (coreA, coreB) => {
          const placeBar = (element: HTMLDivElement | null, position: { x: number; y: number; visible: boolean }) => {
            if (!element) return;
            element.style.left = `${position.x}px`;
            element.style.top = `${position.y}px`;
            element.style.visibility = position.visible ? 'visible' : 'hidden';
          };
          placeBar(coreAWorldRef.current, coreA);
          placeBar(coreBWorldRef.current, coreB);
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
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (respawnIntervalRef.current) {
        clearInterval(respawnIntervalRef.current);
      }
    };
  }, []);

  const markPlayerActed = useCallback(() => {
    if (hasPlayerActedRef.current) return;
    hasPlayerActedRef.current = true;
    setHasPlayerActed(true);
  }, []);

  const handleStartGame = useCallback(() => {
    startMatch();
    setIsMatchActive(true);
  }, [startMatch]);

  // Global key listener for 'E' (Open Magic Brush)
  useEffect(() => {
    if (!isMatchActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && !isBrushOpen && !isCustomizerOpen && !isLobbyOpen && !isGuideOpen) {
        markPlayerActed();
        setIsBrushOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMatchActive, isBrushOpen, isCustomizerOpen, isLobbyOpen, isGuideOpen, markPlayerActed]);

  useEffect(() => {
    if (!isMatchActive) return;
    const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    const handleFirstAction = (event: KeyboardEvent) => {
      if (movementKeys.has(event.code)) markPlayerActed();
      if (event.code === 'Escape' && !winner && !isBrushOpen && !isCustomizerOpen && !isLobbyOpen && !isGuideOpen) {
        const nextPaused = !isPausedRef.current;
        isPausedRef.current = nextPaused;
        engineRef.current?.setPaused(nextPaused);
        setIsPaused(nextPaused);
      }
    };
    const handleCanvasAction = (event: PointerEvent) => {
      if (event.target instanceof Node && canvasContainerRef.current?.contains(event.target)) markPlayerActed();
    };
    window.addEventListener('keydown', handleFirstAction);
    canvasContainerRef.current?.addEventListener('pointerdown', handleCanvasAction);
    return () => {
      window.removeEventListener('keydown', handleFirstAction);
      canvasContainerRef.current?.removeEventListener('pointerdown', handleCanvasAction);
    };
  }, [isMatchActive, isBrushOpen, isCustomizerOpen, isLobbyOpen, isGuideOpen, markPlayerActed, winner]);

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
  };

  const handleTogglePause = () => {
    if (winner) return;
    const nextPaused = !isPaused;
    isPausedRef.current = nextPaused;
    engineRef.current?.setPaused(nextPaused);
    setIsPaused(nextPaused);
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

      {!isMatchActive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-5 pointer-events-auto">
          <section className="w-full max-w-lg border border-cyan-400/40 bg-slate-950/95 p-7 shadow-2xl shadow-cyan-950/40">
            <p className="font-mono text-xs text-cyan-300">INK BATTLE / ARENA 3D</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-slate-100">INK BATTLE 3D</h1>
            <p className="mt-2 text-sm text-slate-400">Prepara tu personaje y el mapa antes de comenzar.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                id="btn-menu-customizer"
                onClick={() => setIsCustomizerOpen(true)}
                className="flex min-h-12 items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 hover:border-cyan-400"
              >
                <User className="h-4 w-4 text-cyan-300" /> Personaje
              </button>
              <button
                id="btn-menu-lobby"
                onClick={() => setIsLobbyOpen(true)}
                className="flex min-h-12 items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 hover:border-cyan-400"
              >
                <MapPin className="h-4 w-4 text-cyan-300" /> Mapa y bots
              </button>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="col-span-2 flex min-h-10 items-center justify-center gap-2 text-xs text-slate-400 hover:text-cyan-200"
              >
                <BookOpen className="h-4 w-4" /> Guía del juego
              </button>
            </div>
            <button
              id="btn-start-match"
              onClick={handleStartGame}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-cyan-400 px-4 font-display font-bold text-slate-950 hover:bg-cyan-300"
            >
              <Play className="h-4 w-4" /> INICIAR PARTIDA
            </button>
          </section>
        </div>
      )}

      {/* HEADS UP DISPLAY */}
      {isMatchActive && <HUD
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
        isPaused={isPaused}
        showBrushPrompt={!hasPlayerActed}
        coreAWorldRef={coreAWorldRef}
        coreBWorldRef={coreBWorldRef}
        winner={winner}
        endMessage={endMessage}
        onOpenBrush={() => {
          markPlayerActed();
          setIsBrushOpen(true);
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
        onTogglePause={handleTogglePause}
        onRestartMatch={startMatch}
      />}

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
        onStartMatch={handleStartGame}
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
