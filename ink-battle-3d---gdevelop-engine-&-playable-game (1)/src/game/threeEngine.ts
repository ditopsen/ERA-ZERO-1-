import * as THREE from 'three';
import { BotConfig, BotDifficulty, CraftedItem, DrawingPoint, MapId, PlayerCustomization, TeamId } from '../types';
import { sounds } from './audio';

export interface EngineCallbacks {
  onPlayerHpChange: (hp: number, maxHp: number) => void;
  onPlayerDied: (canRespawn: boolean, respawnSecs: number) => void;
  onCoreHpChange: (teamA_hp: number, teamB_hp: number, canRespawnA: boolean, canRespawnB: boolean) => void;
  onCoreScreenPositionsChange: (coreA: { x: number; y: number; visible: boolean }, coreB: { x: number; y: number; visible: boolean }) => void;
  onKillFeed: (killer: string, victim: string, weapon: string) => void;
  onMatchEnd: (winner: TeamId, message: string) => void;
  onHazardTrigger: (active: boolean) => void;
}

export class ThreeGameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private timer: THREE.Timer;
  private animationFrameId: number | null = null;
  private callbacks: EngineCallbacks;
  private readonly mapRaycaster = new THREE.Raycaster();
  private readonly botRespawnTimers = new Map<string, number>();
  private hazardDamageTimer = 0;
  private hazardSoundTimer = 0;
  private isDisposed = false;
  private isMatchEnded = false;
  private isPaused = false;
  private wasInHazard = false;

  // Player & Camera
  public playerGroup: THREE.Group;
  private playerMesh: THREE.Group;
  private weaponSlotRight: THREE.Group;
  private weaponSlotLeft: THREE.Group;
  private playerPosition = new THREE.Vector3(0, 2, 40);
  private playerVelocity = new THREE.Vector3();
  private playerRotationY = 0;
  private cameraYaw = 0;
  private cameraPitch = 0.25;
  private cameraDistance = 9;
  private isGrounded = false;
  private playerHp = 200;
  private maxPlayerHp = 200;
  private jumpBufferTime = 0;
  private isPlayerAlive = true;
  private playerRespawnTimer = 0;

  // Customization & Craft
  private customization: PlayerCustomization;
  private currentCraftedItem: CraftedItem | null = null;
  private equippedMesh: THREE.Object3D | null = null;

  // Inputs
  private keys: { [key: string]: boolean } = {};
  private isPointerLocked = false;
  private isMouseDown = false;
  private lastShootTime = 0;

  // Event handlers for cleanup
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleContainerClick: () => void;
  private handlePointerLockChange: () => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleResize: () => void;
  private handleWindowBlur: () => void;

  // Game World & Map
  private currentMapId: MapId = 'nexus_citadel';
  private mapObjects: THREE.Object3D[] = [];
  private jumpPads: { mesh: THREE.Mesh; pos: THREE.Vector3; radius: number; playerTouching: boolean }[] = [];
  private hazardZones: { mesh: THREE.Mesh; min: THREE.Vector3; max: THREE.Vector3; type: string }[] = [];
  private movingPlatforms: { mesh: THREE.Mesh; startY: number; amplitude: number; speed: number }[] = [];

  // Cores & Bases
  private coreA_Mesh: THREE.Group | null = null;
  private coreB_Mesh: THREE.Group | null = null;
  private coreA_Hp = 1000;
  private coreB_Hp = 1000;
  private maxCoreHp = 1000;
  private canRespawnA = true;
  private canRespawnB = true;

  // Bots
  private bots: {
    config: BotConfig;
    group: THREE.Group;
    mesh: THREE.Group;
    velocity: THREE.Vector3;
    state: 'patrol' | 'chase' | 'attack_core';
    targetPos: THREE.Vector3;
    lastDecisionTime: number;
    lastShootTime: number;
  }[] = [];

  // Projectiles & Particles
  private bullets: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    shooter: string;
    team: TeamId;
    damage: number;
    lifespan: number;
    isHeavy?: boolean;
  }[] = [];
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    lifespan: number;
    maxLife: number;
  }[] = [];

  constructor(container: HTMLElement, customization: PlayerCustomization, mapId: MapId, callbacks: EngineCallbacks) {
    this.container = container;
    this.customization = customization;
    this.currentMapId = mapId;
    this.callbacks = callbacks;
    this.mapRaycaster.params.Line.threshold = 0.1;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.timer = new THREE.Timer();
    this.timer.connect(document);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // Player Groups
    this.playerGroup = new THREE.Group();
    this.playerMesh = new THREE.Group();
    this.weaponSlotRight = new THREE.Group();
    this.weaponSlotRight.position.set(0.6, 1.2, 0.4);
    this.weaponSlotLeft = new THREE.Group();
    this.weaponSlotLeft.position.set(-0.6, 1.2, 0.4);

    this.playerGroup.add(this.playerMesh);
    this.playerGroup.add(this.weaponSlotRight);
    this.playerGroup.add(this.weaponSlotLeft);
    this.scene.add(this.playerGroup);

    // Build World
    this.buildLighting();
    this.loadMap(mapId);
    this.buildCharacterMesh(this.playerMesh, this.customization);
    this.spawnBasesAndCores();

    // Event Listeners
    this.setupEvents();

    // Start Loop
    this.animate();
  }

  // --- LIGHTING ---
  private buildLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(40, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -70;
    dirLight.shadow.camera.right = 70;
    dirLight.shadow.camera.top = 70;
    dirLight.shadow.camera.bottom = -70;
    this.scene.add(dirLight);

    // Colorful rim light
    const rimLight = new THREE.PointLight(0x06b6d4, 1.5, 120);
    rimLight.position.set(0, 30, 0);
    this.scene.add(rimLight);
  }

  // --- MAP BUILDER ---
  public loadMap(mapId: MapId) {
    this.currentMapId = mapId;

    // Clear old map
    for (const obj of this.mapObjects) {
      this.scene.remove(obj);
      this.disposeObject(obj);
    }
    this.mapObjects = [];
    this.jumpPads = [];
    this.hazardZones = [];
    this.movingPlatforms = [];

    if (mapId === 'nexus_citadel') {
      this.buildNexusCitadel();
    } else if (mapId === 'void_gardens') {
      this.buildVoidGardens();
    } else {
      this.buildChromaFactory();
    }
  }

  private buildNexusCitadel() {
    this.scene.background = new THREE.Color(0x050b14);
    this.scene.fog = new THREE.FogExp2(0x081326, 0.009);

    // Cyber Arena Floor
    const floorGeo = new THREE.PlaneGeometry(160, 160, 20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.mapObjects.push(floor);

    // Glowing Cyber Grid lines
    const gridHelper = new THREE.GridHelper(160, 40, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0.05;
    this.scene.add(gridHelper);
    this.mapObjects.push(gridHelper);

    // Neon Catwalks & Central Bridge
    const bridgeGeo = new THREE.BoxGeometry(20, 1.5, 70);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.25
    });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 4, 0);
    bridge.receiveShadow = true;
    bridge.castShadow = true;
    this.scene.add(bridge);
    this.mapObjects.push(bridge);

    // Skyscrapers & Cover Blocks
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0b1320, metalness: 0.9, roughness: 0.2 });
    const positions = [
      [-35, 15, -25], [35, 15, -25],
      [-35, 15, 25], [35, 15, 25],
      [-20, 8, 0], [20, 8, 0]
    ];
    positions.forEach(([x, h, z]) => {
      const geo = new THREE.BoxGeometry(10, h * 2, 10);
      const mesh = new THREE.Mesh(geo, pillarMat);
      mesh.position.set(x, h, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Add neon strip
      const stripGeo = new THREE.BoxGeometry(10.2, 0.8, 10.2);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(0, 0, 0);
      mesh.add(strip);

      this.scene.add(mesh);
      this.mapObjects.push(mesh);
    });

    // 4 Jump Pads
    const padPositions = [[-20, 0.2, -15], [20, 0.2, -15], [-20, 0.2, 15], [20, 0.2, 15]];
    padPositions.forEach(([x, y, z]) => {
      this.createJumpPad(new THREE.Vector3(x, y, z));
    });

    // 2 Border Hazard Energy Zones
    this.createHazardZone(new THREE.Vector3(-65, 0, 0), new THREE.Vector3(12, 1, 80), 'toxic_circuit', 0x06b6d4);
    this.createHazardZone(new THREE.Vector3(65, 0, 0), new THREE.Vector3(12, 1, 80), 'toxic_circuit', 0xec4899);
  }

  private buildVoidGardens() {
    this.scene.background = new THREE.Color(0x070614);
    this.scene.fog = new THREE.FogExp2(0x110e2e, 0.008);

    // Central Floating Island
    const islandGeo = new THREE.CylinderGeometry(40, 25, 12, 24);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x1e1838, roughness: 0.6 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.set(0, -6, 0);
    this.scene.add(island);
    this.mapObjects.push(island);

    // Island Top bioluminescent grass
    const grassGeo = new THREE.CircleGeometry(40, 24);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e1065, emissive: 0xa855f7, emissiveIntensity: 0.2 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0.02, 0);
    this.scene.add(grass);
    this.mapObjects.push(grass);

    // Satellite Floating Islands
    const satConfigs = [
      { x: -50, y: -4, z: -35, r: 18 },
      { x: 50, y: -4, z: -35, r: 18 },
      { x: -50, y: -4, z: 35, r: 18 },
      { x: 50, y: -4, z: 35, r: 18 }
    ];
    satConfigs.forEach(({ x, y, z, r }) => {
      const satGeo = new THREE.CylinderGeometry(r, r * 0.6, 10, 16);
      const satMesh = new THREE.Mesh(satGeo, islandMat);
      satMesh.position.set(x, y, z);
      this.scene.add(satMesh);
      this.mapObjects.push(satMesh);

      // Grass
      const satGrass = new THREE.Mesh(new THREE.CircleGeometry(r, 16), grassMat);
      satGrass.rotation.x = -Math.PI / 2;
      satGrass.position.set(x, 0.02, z);
      this.scene.add(satGrass);
      this.mapObjects.push(satGrass);
    });

    // Monoliths
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const monoGeo = new THREE.ConeGeometry(3, 16, 4);
      const monoMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.2, metalness: 0.8 });
      const mono = new THREE.Mesh(monoGeo, monoMat);
      mono.position.set(Math.cos(angle) * 28, 8, Math.sin(angle) * 28);
      mono.castShadow = true;
      this.scene.add(mono);
      this.mapObjects.push(mono);
    }

    // Moving Floating Platforms
    this.createMovingPlatform(new THREE.Vector3(-25, 2, -18), 3, 1.2);
    this.createMovingPlatform(new THREE.Vector3(25, 2, 18), 3, 1.4);

    // Jump pads
    this.createJumpPad(new THREE.Vector3(0, 0.2, 0));
    this.createJumpPad(new THREE.Vector3(-30, 0.2, 0));
    this.createJumpPad(new THREE.Vector3(30, 0.2, 0));

    // Deep Void Hazard Zone (Fall detection)
    this.createHazardZone(new THREE.Vector3(0, -15, 0), new THREE.Vector3(200, 2, 200), 'void_abyss', 0x581c87);
  }

  private buildChromaFactory() {
    this.scene.background = new THREE.Color(0x14080e);
    this.scene.fog = new THREE.FogExp2(0x240e1b, 0.009);

    // Industrial floor
    const floorGeo = new THREE.PlaneGeometry(150, 150);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b1322, metalness: 0.7, roughness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.mapObjects.push(floor);

    // Huge pipelines
    for (let i = -1; i <= 1; i += 2) {
      const pipeGeo = new THREE.CylinderGeometry(2.5, 2.5, 120, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4c0519, metalness: 0.9, roughness: 0.2 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(i * 35, 12, 0);
      this.scene.add(pipe);
      this.mapObjects.push(pipe);
    }

    // Raised Steel Walkways
    const catwalkGeo = new THREE.BoxGeometry(80, 1, 14);
    const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x3f162c, metalness: 0.6 });
    const catwalk = new THREE.Mesh(catwalkGeo, catwalkMat);
    catwalk.position.set(0, 5, 0);
    this.scene.add(catwalk);
    this.mapObjects.push(catwalk);

    // 2 Toxic Ink Acid Pools (Hazards)
    this.createHazardZone(new THREE.Vector3(-25, 0.1, -15), new THREE.Vector3(24, 0.4, 24), 'toxic_ink', 0xf43f5e);
    this.createHazardZone(new THREE.Vector3(25, 0.1, 15), new THREE.Vector3(24, 0.4, 24), 'toxic_ink', 0xf43f5e);

    // Jump pads
    this.createJumpPad(new THREE.Vector3(-15, 0.2, 25));
    this.createJumpPad(new THREE.Vector3(15, 0.2, -25));
    this.createJumpPad(new THREE.Vector3(0, 5.2, 0));
  }

  // --- INTERACTIVE ELEMENTS ---
  private createJumpPad(pos: THREE.Vector3) {
    const padGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.4, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.7
    });
    const mesh = new THREE.Mesh(padGeo, padMat);
    mesh.position.copy(pos);
    mesh.castShadow = true;

    // Glowing center ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.15, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.22;
    mesh.add(ring);

    this.scene.add(mesh);
    this.mapObjects.push(mesh);
    this.jumpPads.push({ mesh, pos, radius: 2.5, playerTouching: false });
  }

  private createHazardZone(pos: THREE.Vector3, size: THREE.Vector3, type: string, color: number) {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.mapObjects.push(mesh);

    const min = new THREE.Vector3(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2);
    const max = new THREE.Vector3(pos.x + size.x / 2, pos.y + size.y / 2 + 3.0, pos.z + size.z / 2);
    this.hazardZones.push({ mesh, min, max, type });
  }

  private createMovingPlatform(pos: THREE.Vector3, amplitude: number, speed: number) {
    const geo = new THREE.CylinderGeometry(5, 5, 0.8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.mapObjects.push(mesh);
    this.movingPlatforms.push({ mesh, startY: pos.y, amplitude, speed });
  }

  // --- BASES & CORES ---
  private spawnBasesAndCores() {
    // Base A (Player Team Cyan - South: Z = 60)
    const baseAGeo = new THREE.CylinderGeometry(14, 16, 2, 24);
    const baseAMat = new THREE.MeshStandardMaterial({ color: 0x082f49, emissive: 0x0284c7, emissiveIntensity: 0.3 });
    const baseA = new THREE.Mesh(baseAGeo, baseAMat);
    baseA.position.set(0, 1, 60);
    this.scene.add(baseA);
    this.mapObjects.push(baseA);

    this.coreA_Mesh = this.buildCoreMesh(0x06b6d4);
    this.coreA_Mesh.position.set(0, 6, 60);
    this.scene.add(this.coreA_Mesh);

    // Base B (Enemy Team Magenta - North: Z = -60)
    const baseBGeo = new THREE.CylinderGeometry(14, 16, 2, 24);
    const baseBMat = new THREE.MeshStandardMaterial({ color: 0x4a044e, emissive: 0xc026d3, emissiveIntensity: 0.3 });
    const baseB = new THREE.Mesh(baseBGeo, baseBMat);
    baseB.position.set(0, 1, -60);
    this.scene.add(baseB);
    this.mapObjects.push(baseB);

    this.coreB_Mesh = this.buildCoreMesh(0xec4899);
    this.coreB_Mesh.position.set(0, 6, -60);
    this.scene.add(this.coreB_Mesh);
  }

  private buildCoreMesh(glowColor: number): THREE.Group {
    const group = new THREE.Group();

    // Central Energy Crystal (Octahedron)
    const crystalGeo = new THREE.OctahedronGeometry(2.8, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.name = 'crystal';
    group.add(crystal);

    // Rotating Outer Energy Rings
    const ringGeo1 = new THREE.TorusGeometry(4.2, 0.18, 8, 32);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.name = 'ring1';
    group.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(5.0, 0.14, 8, 32);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: glowColor });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.name = 'ring2';
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);

    return group;
  }

  // --- CHARACTER MESH RIG ---
  private buildCharacterMesh(targetGroup: THREE.Group, cust: PlayerCustomization) {
    while (targetGroup.children.length > 0) {
      targetGroup.remove(targetGroup.children[0]);
    }

    const isFemale = cust.gender === 'female';
    const outfitColor = cust.teamHex ? parseInt(cust.teamHex.replace('#', '0x')) : 0x06b6d4;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.7 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.4, metalness: 0.5 });
    const darkClothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({
      color: parseInt(cust.hairColor.replace('#', '0x') || '0x38bdf8'),
      roughness: 0.5
    });

    // Body Container
    const body = new THREE.Group();
    body.name = 'bodyMesh';

    // Torso
    const torsoWidth = isFemale ? 0.75 : 0.9;
    const torsoGeo = new THREE.BoxGeometry(torsoWidth, 1.1, 0.45);
    const torso = new THREE.Mesh(torsoGeo, outfitMat);
    torso.position.y = 1.45;
    torso.castShadow = true;
    body.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.25;
    head.castShadow = true;
    body.add(head);

    // Hair
    const hairGeo = isFemale
      ? new THREE.CylinderGeometry(0.38, 0.42, 0.5, 12)
      : new THREE.BoxGeometry(0.72, 0.35, 0.72);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = isFemale ? 2.3 : 2.4;
    body.add(hair);

    // Limbs
    const armGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
    const armL = new THREE.Mesh(armGeo, darkClothMat);
    armL.position.set(-0.55, 1.35, 0);
    armL.name = 'armL';
    body.add(armL);

    const armR = new THREE.Mesh(armGeo, darkClothMat);
    armR.position.set(0.55, 1.35, 0);
    armR.name = 'armR';
    body.add(armR);

    const legGeo = new THREE.BoxGeometry(0.3, 0.95, 0.3);
    const legL = new THREE.Mesh(legGeo, darkClothMat);
    legL.position.set(-0.25, 0.5, 0);
    legL.name = 'legL';
    body.add(legL);

    const legR = new THREE.Mesh(legGeo, darkClothMat);
    legR.position.set(0.25, 0.5, 0);
    legR.name = 'legR';
    body.add(legR);

    targetGroup.add(body);
  }

  // --- BOT INITIALIZATION ---
  public setupBots(botConfigs: BotConfig[]) {
    // Clear previous bots
    for (const b of this.bots) {
      this.scene.remove(b.group);
    }
    this.bots = [];

    botConfigs.forEach((config, idx) => {
      const group = new THREE.Group();
      const mesh = new THREE.Group();
      group.add(mesh);

      const fakeCust: PlayerCustomization = {
        name: config.name,
        gender: idx % 2 === 0 ? 'male' : 'female',
        outfit: 'chroma_armor',
        hairColor: config.team === 'magenta' ? '#ec4899' : '#eab308',
        teamColor: config.team,
        teamHex: config.team === 'magenta' ? '#ec4899' : '#eab308'
      };
      this.buildCharacterMesh(mesh, fakeCust);

      // Spawn near Base B (North)
      const spawnX = (idx - (botConfigs.length - 1) / 2) * 12;
      group.position.set(spawnX, 2, -50);
      this.scene.add(group);

      this.bots.push({
        config,
        group,
        mesh,
        velocity: new THREE.Vector3(),
        state: 'patrol',
        targetPos: new THREE.Vector3(0, 2, 0),
        lastDecisionTime: 0,
        lastShootTime: 0
      });
    });
  }

  // --- CRAFTED ITEM MOUNTING ---
  private buildTracedShapeMesh(item: CraftedItem) {
    const paths = item.drawingPaths?.filter((path) => path.length > 1);
    if (!paths?.length) return null;

    const allPoints = paths.flat();
    const minX = Math.min(...allPoints.map((point) => point.x));
    const maxX = Math.max(...allPoints.map((point) => point.x));
    const minY = Math.min(...allPoints.map((point) => point.y));
    const maxY = Math.max(...allPoints.map((point) => point.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scale = 2.2 / Math.max(maxX - minX, maxY - minY, 1);
    const radius = Math.max(0.025, scale * 7);
    const color = new THREE.Color(item.color || '#06b6d4');
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.45,
      roughness: 0.25
    });
    const tracedItem = new THREE.Group();

    paths.forEach((path) => {
      const vertices = path.map((point: DrawingPoint) => new THREE.Vector3(
        (point.x - centerX) * scale,
        (centerY - point.y) * scale,
        0
      ));
      const isClosed = vertices[0].distanceTo(vertices[vertices.length - 1]) < 0.01;
      const curve = new THREE.CatmullRomCurve3(vertices, isClosed, 'centripetal');
      const segments = Math.min(256, Math.max(8, vertices.length * 4));
      const geometry = new THREE.TubeGeometry(curve, segments, radius, 8, isClosed);
      const stroke = new THREE.Mesh(geometry, material);
      stroke.castShadow = true;
      tracedItem.add(stroke);
    });

    if (item.type !== 'shield') tracedItem.rotation.x = Math.PI / 4;
    return tracedItem;
  }

  public equipCraftedItem(item: CraftedItem) {
    this.currentCraftedItem = item;

    // Remove existing weapon from slots
    for (const slot of [this.weaponSlotRight, this.weaponSlotLeft]) {
      while (slot.children.length > 0) {
        const child = slot.children[0];
        child.traverse((object) => {
          if (object instanceof THREE.Mesh) this.disposeObject(object);
        });
        slot.remove(child);
      }
    }
    this.equippedMesh = null;

    const tracedMesh = this.buildTracedShapeMesh(item);
    if (tracedMesh) {
      const slot = item.type === 'shield' ? this.weaponSlotLeft : this.weaponSlotRight;
      slot.add(tracedMesh);
      this.equippedMesh = tracedMesh;
      sounds.playCraftSuccess();
      return;
    }

    if (item.type === 'sword') {
      // 3D Sword in Right Hand
      const swordGroup = new THREE.Group();
      // Blade
      const bladeGeo = new THREE.BoxGeometry(0.12, 1.8, 0.3);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: parseInt(item.color.replace('#', '0x')),
        emissive: parseInt(item.color.replace('#', '0x')),
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.8;
      swordGroup.add(blade);

      // Handle
      const hiltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      hilt.position.y = -0.1;
      swordGroup.add(hilt);

      swordGroup.rotation.x = Math.PI / 4;
      this.weaponSlotRight.add(swordGroup);
      this.equippedMesh = swordGroup;

    } else if (item.type === 'shield') {
      // 3D Shield in Left Hand
      const shieldGroup = new THREE.Group();
      const shieldGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 6);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: parseInt(item.color.replace('#', '0x')),
        emissive: parseInt(item.color.replace('#', '0x')),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.rotation.z = Math.PI / 2;
      shieldGroup.add(shield);

      this.weaponSlotLeft.add(shieldGroup);
      this.equippedMesh = shieldGroup;

    } else if (item.type === 'cannon') {
      // 3D Cannon in Right Hand
      const cannonGroup = new THREE.Group();
      const barrelGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 12);
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: parseInt(item.color.replace('#', '0x')),
        emissiveIntensity: 0.4
      });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.6;
      cannonGroup.add(barrel);

      this.weaponSlotRight.add(cannonGroup);
      this.equippedMesh = cannonGroup;
    }

    sounds.playCraftSuccess();
  }

  // --- EVENTS & INPUTS ---
  private setupEvents() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (this.isMatchEnded || this.isPaused || this.isDisposed || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.isPlayerAlive) this.jumpBufferTime = 0.18;
    };
    
    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    this.handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !this.isMatchEnded && !this.isPaused) {
        this.isMouseDown = true;
      }
    };

    this.handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    };

    // Pointer Lock for mouse aiming
    this.handleContainerClick = () => {
      if (!this.isPointerLocked && document.pointerLockElement !== this.container) {
        this.container.requestPointerLock?.();
      }
    };

    this.handlePointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (this.isPointerLocked) {
        this.cameraYaw -= e.movementX * 0.003;
        this.cameraPitch = Math.max(-0.4, Math.min(0.8, this.cameraPitch + e.movementY * 0.003));
      }
    };

    this.handleResize = () => {
      if (!this.container || this.container.clientWidth === 0 || this.container.clientHeight === 0) return;
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    };

    this.handleWindowBlur = () => {
      this.keys = {};
      this.isMouseDown = false;
      this.jumpBufferTime = 0;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.container.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.container.addEventListener('click', this.handleContainerClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  // --- SHOOTING & COMBAT ---
  private shootBullet(origin: THREE.Vector3, direction: THREE.Vector3, shooter: string, team: TeamId, isHeavy = false) {
    const colorHex = team === 'cyan' ? 0x06b6d4 : 0xec4899;
    const geo = isHeavy ? new THREE.SphereGeometry(0.55, 12, 12) : new THREE.SphereGeometry(0.24, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const speed = isHeavy ? 40 : 65;
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    const damage = isHeavy ? 45 : (this.currentCraftedItem?.type === 'sword' ? 35 : 20);

    this.bullets.push({
      mesh,
      velocity,
      shooter,
      team,
      damage,
      lifespan: 2.5,
      isHeavy
    });

    sounds.playShoot(isHeavy ? 0.7 : 1.1);
  }

  // --- MAIN GAME LOOP ---
  private animate = () => {
    if (this.isDisposed) return;
    if (this.isMatchEnded) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.timer.update();
    if (this.isPaused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const delta = Math.min(this.timer.getDelta(), 0.08);
    const elapsed = this.timer.getElapsed();

    this.updateMovingPlatforms(elapsed);
    this.updateCores(elapsed);
    this.updatePlayer(delta, elapsed);
    this.updateBots(delta, elapsed);
    this.updateBullets(delta);
    this.updateParticles(delta);
    this.updateCamera(delta);

    this.renderer.render(this.scene, this.camera);
  };

  private updateMovingPlatforms(elapsed: number) {
    this.movingPlatforms.forEach((p) => {
      p.mesh.position.y = p.startY + Math.sin(elapsed * p.speed) * p.amplitude;
    });
  }

  private updateCores(elapsed: number) {
    if (this.coreA_Mesh) {
      const crystal = this.coreA_Mesh.getObjectByName('crystal');
      const r1 = this.coreA_Mesh.getObjectByName('ring1');
      const r2 = this.coreA_Mesh.getObjectByName('ring2');
      if (crystal) crystal.rotation.y = elapsed * 1.2;
      if (r1) r1.rotation.z = elapsed * 1.5;
      if (r2) r2.rotation.y = -elapsed * 1.8;
      this.coreA_Mesh.position.y = 6 + Math.sin(elapsed * 2) * 0.5;
    }

    if (this.coreB_Mesh) {
      const crystal = this.coreB_Mesh.getObjectByName('crystal');
      const r1 = this.coreB_Mesh.getObjectByName('ring1');
      const r2 = this.coreB_Mesh.getObjectByName('ring2');
      if (crystal) crystal.rotation.y = -elapsed * 1.2;
      if (r1) r1.rotation.z = -elapsed * 1.5;
      if (r2) r2.rotation.y = elapsed * 1.8;
      this.coreB_Mesh.position.y = 6 + Math.sin(elapsed * 2 + 1) * 0.5;
    }
  }

  private updatePlayer(delta: number, elapsed: number) {
    this.jumpBufferTime = Math.max(0, this.jumpBufferTime - delta);
    if (!this.isPlayerAlive) {
      if (this.canRespawnA) {
        this.playerRespawnTimer -= delta;
        if (this.playerRespawnTimer <= 0) {
          this.respawnPlayer();
        }
      }
      return;
    }

    // Input Movement Vector
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

    let isMoving = false;
    if (moveDir.lengthSq() > 0) {
      isMoving = true;
      moveDir.normalize();

      // Transform by camera yaw
      const moveX = moveDir.x * Math.cos(this.cameraYaw) - moveDir.z * Math.sin(this.cameraYaw);
      const moveZ = moveDir.x * Math.sin(this.cameraYaw) + moveDir.z * Math.cos(this.cameraYaw);

      const speed = this.currentCraftedItem?.type === 'sword' ? 22 : 18;
      this.playerVelocity.x = moveX * speed;
      this.playerVelocity.z = moveZ * speed;

      // Face direction of movement
      this.playerRotationY = Math.atan2(moveX, moveZ);
    } else {
      this.playerVelocity.x *= 0.8;
      this.playerVelocity.z *= 0.8;
    }

    // Gravity
    this.playerVelocity.y -= 30 * delta;
    const previousPosition = this.playerPosition.clone();
    this.playerPosition.addScaledVector(this.playerVelocity, delta);

    const candidatePosition = this.playerPosition.clone();
    this.playerPosition.copy(previousPosition);
    this.playerPosition.y = candidatePosition.y;
    const tryMoveAxis = (axis: 'x' | 'z') => {
      const distance = candidatePosition[axis] - this.playerPosition[axis];
      if (Math.abs(distance) < 0.0001) return;

      const collisionOrigin = this.playerPosition.clone().add(new THREE.Vector3(0, 1, 0));
      const direction = axis === 'x'
        ? new THREE.Vector3(Math.sign(distance), 0, 0)
        : new THREE.Vector3(0, 0, Math.sign(distance));
      this.mapRaycaster.set(collisionOrigin, direction);
      this.mapRaycaster.far = Math.abs(distance) + 0.45;
      if (this.mapRaycaster.intersectObjects(this.mapObjects, true).length > 0) {
        this.playerVelocity[axis] = 0;
        return;
      }

      this.playerPosition[axis] = candidatePosition[axis];
    };
    tryMoveAxis('x');
    tryMoveAxis('z');

    // Floor collision
    let floorLevel = 0;
    // Check bridge in Nexus Citadel
    if (this.currentMapId === 'nexus_citadel' && this.playerPosition.y >= 4.75 && Math.abs(this.playerPosition.x) < 10 && Math.abs(this.playerPosition.z) < 35) {
      floorLevel = 4.75;
    }
    if (this.currentMapId === 'chroma_factory' && this.playerPosition.y >= 5.5 && Math.abs(this.playerPosition.x) < 40 && Math.abs(this.playerPosition.z) < 7) {
      floorLevel = 5.5;
    }
    for (const platform of this.movingPlatforms) {
      const platformTop = platform.mesh.position.y + 0.4;
      if (this.playerPosition.y >= platformTop && this.playerPosition.y - platformTop < 1.2 &&
        Math.hypot(this.playerPosition.x - platform.mesh.position.x, this.playerPosition.z - platform.mesh.position.z) < 4.5) {
        floorLevel = Math.max(floorLevel, platformTop);
      }
    }
    // Check void gardens islands
    if (this.currentMapId === 'void_gardens') {
      const distCenter = Math.sqrt(this.playerPosition.x * this.playerPosition.x + this.playerPosition.z * this.playerPosition.z);
      if (distCenter > 42) {
        // Falling off island!
        floorLevel = -30;
      }
    }

    if (this.playerPosition.y <= floorLevel) {
      this.playerPosition.y = floorLevel;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    if (this.isGrounded && this.jumpBufferTime > 0 && this.isPlayerAlive) {
      this.playerVelocity.y = 12;
      this.isGrounded = false;
      this.jumpBufferTime = 0;
      sounds.playJump();
    }

    // Jump pads check
    for (const pad of this.jumpPads) {
      const dist = this.playerPosition.distanceTo(pad.pos);
      const touching = dist < pad.radius && Math.abs(this.playerPosition.y - pad.pos.y) < 1.5 && this.playerVelocity.y <= 0;
      if (touching && !pad.playerTouching) {
        this.playerVelocity.y = 25;
        this.isGrounded = false;
        sounds.playJump();
        this.createParticleBurst(this.playerPosition, 0x38bdf8, 15);
      }
      pad.playerTouching = touching;
    }

    // Hazard Zones check (Damage over time)
    let inHazard = false;
    for (const h of this.hazardZones) {
      if (
        this.playerPosition.x >= h.min.x && this.playerPosition.x <= h.max.x &&
        this.playerPosition.y >= h.min.y && this.playerPosition.y <= h.max.y &&
        this.playerPosition.z >= h.min.z && this.playerPosition.z <= h.max.z
      ) {
        inHazard = true;
        break;
      }
    }
    if (inHazard) {
      this.hazardDamageTimer += delta;
      this.hazardSoundTimer += delta;
      if (this.hazardDamageTimer >= 0.25) {
        this.damagePlayer(15 * this.hazardDamageTimer, 'Zona corrosiva');
        this.hazardDamageTimer = 0;
      }
      if (this.hazardSoundTimer >= 0.5) {
        sounds.playHazardTick();
        this.hazardSoundTimer = 0;
      }
    } else {
      this.hazardDamageTimer = 0;
      this.hazardSoundTimer = 0;
    }
    if (inHazard !== this.wasInHazard) {
      this.wasInHazard = inHazard;
      this.callbacks.onHazardTrigger(inHazard);
    }

    // Apply to group
    this.playerGroup.position.copy(this.playerPosition);
    this.playerGroup.rotation.y = this.playerRotationY;

    // Limb walking animation
    const bodyMesh = this.playerMesh.getObjectByName('bodyMesh');
    if (bodyMesh && isMoving) {
      const armL = bodyMesh.getObjectByName('armL');
      const armR = bodyMesh.getObjectByName('armR');
      const legL = bodyMesh.getObjectByName('legL');
      const legR = bodyMesh.getObjectByName('legR');
      const swing = Math.sin(elapsed * 12) * 0.5;
      if (armL) armL.rotation.x = swing;
      if (armR) armR.rotation.x = -swing;
      if (legL) legL.rotation.x = -swing;
      if (legR) legR.rotation.x = swing;
    }

    // Mouse shooting
    if (this.isMouseDown && elapsed - this.lastShootTime > 0.18) {
      this.lastShootTime = elapsed;
      const aimDir = new THREE.Vector3(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
        -Math.sin(this.cameraPitch),
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
      ).normalize();

      const shootPos = this.playerPosition.clone().add(new THREE.Vector3(0, 1.4, 0));
      const isHeavy = this.currentCraftedItem?.type === 'cannon';
      this.shootBullet(shootPos, aimDir, this.customization.name || 'Jugador', 'cyan', isHeavy);
    }
  }

  private updateBots(delta: number, elapsed: number) {
    for (const [botId, respawnAt] of this.botRespawnTimers) {
      const bot = this.bots.find((candidate) => candidate.config.id === botId);
      if (!this.canRespawnB || !bot) {
        this.botRespawnTimers.delete(botId);
        continue;
      }
      if (elapsed >= respawnAt) {
        bot.config.isAlive = true;
        bot.config.hp = bot.config.maxHp;
        bot.group.position.set((Math.random() - 0.5) * 20, 2, -55);
        bot.group.visible = true;
        this.botRespawnTimers.delete(botId);
      }
    }

    for (const b of this.bots) {
      if (!b.config.isAlive) continue;

      // AI Logic Tick
      if (elapsed - b.lastDecisionTime > b.config.reactionTime) {
        b.lastDecisionTime = elapsed;
        this.botAIThink(b, elapsed);
      }

      // Move bot towards targetPos
      const toTarget = b.targetPos.clone().sub(b.group.position);
      toTarget.y = 0;
      if (toTarget.lengthSq() > 2) {
        toTarget.normalize();
        b.velocity.x = toTarget.x * b.config.speed * 0.08;
        b.velocity.z = toTarget.z * b.config.speed * 0.08;
        b.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      } else {
        b.velocity.x *= 0.8;
        b.velocity.z *= 0.8;
      }

      const previousPosition = b.group.position.clone();
      b.group.position.addScaledVector(b.velocity, delta);
      const motion = b.group.position.clone().sub(previousPosition);
      motion.y = 0;
      if (motion.lengthSq() > 0) {
        this.mapRaycaster.set(previousPosition.clone().add(new THREE.Vector3(0, 1, 0)), motion.clone().normalize());
        this.mapRaycaster.far = motion.length() + 0.45;
        if (this.mapRaycaster.intersectObjects(this.mapObjects, true).length > 0) {
          b.group.position.x = previousPosition.x;
          b.group.position.z = previousPosition.z;
          b.velocity.x = 0;
          b.velocity.z = 0;
        }
      }

      // Bot Shooting
      const distToPlayer = b.group.position.distanceTo(this.playerPosition);
      if (distToPlayer < 45 && this.isPlayerAlive && elapsed - b.lastShootTime > 1.2) {
        b.lastShootTime = elapsed;
        const dir = this.playerPosition.clone().sub(b.group.position).add(new THREE.Vector3(0, 1.2, 0));

        // Inaccuracy based on difficulty
        const spread = (1 - b.config.accuracy) * 0.25;
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();

        const spawn = b.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        this.shootBullet(spawn, dir, b.config.name, b.config.team, false);
      }
    }
  }

  private botAIThink(bot: typeof this.bots[0], elapsed: number) {
    const distToPlayer = bot.group.position.distanceTo(this.playerPosition);
    const distToCoreA = bot.group.position.distanceTo(new THREE.Vector3(0, 6, 60));

    if (bot.config.difficulty === 'hard') {
      // Hard AI prioritizes attacking Core A if nearby or player
      if (distToCoreA < 40 && this.coreA_Hp > 0) {
        bot.state = 'attack_core';
        bot.targetPos.set(0, 2, 50);
        // Shoot at Core A
        if (elapsed - bot.lastShootTime > 0.8) {
          bot.lastShootTime = elapsed;
          const dir = new THREE.Vector3(0, 6, 60).sub(bot.group.position).normalize();
          this.shootBullet(bot.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), dir, bot.config.name, bot.config.team);
        }
      } else if (this.isPlayerAlive && distToPlayer < 60) {
        bot.state = 'chase';
        bot.targetPos.copy(this.playerPosition);
      } else {
        bot.state = 'patrol';
        bot.targetPos.set((Math.random() - 0.5) * 60, 2, (Math.random() - 0.5) * 40);
      }
    } else if (bot.config.difficulty === 'medium') {
      // Medium AI chases player if within 40 units
      if (this.isPlayerAlive && distToPlayer < 45) {
        bot.state = 'chase';
        bot.targetPos.copy(this.playerPosition);
      } else {
        bot.state = 'patrol';
        bot.targetPos.set((Math.random() - 0.5) * 50, 2, (Math.random() - 0.5) * 30);
      }
    } else {
      // Easy AI moves randomly with large pauses
      bot.state = 'patrol';
      bot.targetPos.set((Math.random() - 0.5) * 40, 2, -20 + (Math.random() - 0.5) * 30);
    }
  }

  private updateBullets(delta: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const previousPosition = b.mesh.position.clone();
      b.mesh.position.addScaledVector(b.velocity, delta);
      b.lifespan -= delta;

      let destroyed = false;
      const travel = b.mesh.position.clone().sub(previousPosition);
      const travelDistance = travel.length();
      if (travelDistance > 0) {
        this.mapRaycaster.set(previousPosition, travel.normalize());
        this.mapRaycaster.far = travelDistance;
        destroyed = this.mapRaycaster.intersectObjects(this.mapObjects, true).length > 0;
      }

      // 1. Check Core A hit (Cyan base)
      if (!destroyed && b.team !== 'cyan' && this.coreA_Hp > 0 && this.coreA_Mesh) {
        if (this.segmentHitsSphere(previousPosition, b.mesh.position, new THREE.Vector3(0, 6, 60), 4.0)) {
          this.damageCore('cyan', b.damage);
          destroyed = true;
        }
      }

      // 2. Check Core B hit (Magenta base)
      if (!destroyed && b.team !== 'magenta' && this.coreB_Hp > 0 && this.coreB_Mesh) {
        if (this.segmentHitsSphere(previousPosition, b.mesh.position, new THREE.Vector3(0, 6, -60), 4.0)) {
          this.damageCore('magenta', b.damage);
          destroyed = true;
        }
      }

      // 3. Check Player hit
      if (!destroyed && b.team !== 'cyan' && this.isPlayerAlive) {
        const playerCenter = this.playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0));
        if (this.segmentHitsSphere(previousPosition, b.mesh.position, playerCenter, 1.4)) {
          let dmg = b.damage;
          // Shield mitigation
          if (this.currentCraftedItem?.type === 'shield') {
            dmg *= 0.4; // 60% damage reduction
          }
          this.damagePlayer(dmg, b.shooter);
          sounds.playHit();
          destroyed = true;
        }
      }

      // 4. Check Bots hit
      if (!destroyed && b.team === 'cyan') {
        for (const bot of this.bots) {
          if (!bot.config.isAlive) continue;
          const botCenter = bot.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          if (this.segmentHitsSphere(previousPosition, b.mesh.position, botCenter, 1.4)) {
            bot.config.hp -= b.damage;
            sounds.playHit();
            this.createParticleBurst(b.mesh.position, 0xec4899, 8);
            if (bot.config.hp <= 0) {
              this.killBot(bot, b.shooter);
            }
            destroyed = true;
            break;
          }
        }
      }

      if (destroyed || b.lifespan <= 0 || b.mesh.position.y < -10) {
        this.scene.remove(b.mesh);
        this.disposeObject(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  private segmentHitsSphere(start: THREE.Vector3, end: THREE.Vector3, center: THREE.Vector3, radius: number) {
    const segment = end.clone().sub(start);
    const lengthSquared = segment.lengthSq();
    const t = lengthSquared === 0 ? 0 : THREE.MathUtils.clamp(center.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
    return start.clone().addScaledVector(segment, t).distanceToSquared(center) <= radius * radius;
  }

  private damageCore(team: TeamId, amount: number) {
    if (team === 'cyan') {
      this.coreA_Hp = Math.max(0, this.coreA_Hp - amount);
      sounds.playCoreDamage();
      if (this.coreA_Hp <= 0 && this.canRespawnA) {
        this.canRespawnA = false;
        sounds.playCoreDestroyed();
        this.createParticleBurst(new THREE.Vector3(0, 6, 60), 0x06b6d4, 50);
        if (this.coreA_Mesh) this.scene.remove(this.coreA_Mesh);
        this.callbacks.onKillFeed('NÚCLEO ALIADO', 'COLAPSO TOTAL', '¡Respawn Desactivado!');
      }
    } else {
      this.coreB_Hp = Math.max(0, this.coreB_Hp - amount);
      sounds.playCoreDamage();
      if (this.coreB_Hp <= 0 && this.canRespawnB) {
        this.canRespawnB = false;
        sounds.playCoreDestroyed();
        this.createParticleBurst(new THREE.Vector3(0, 6, -60), 0xec4899, 50);
        if (this.coreB_Mesh) this.scene.remove(this.coreB_Mesh);
        this.callbacks.onKillFeed('NÚCLEO ENEMIGO', 'DESTRUIDO', '¡Respawn Rival Desactivado!');

        // Check victory if no bots left alive
        const aliveBots = this.bots.filter(b => b.config.isAlive);
        if (aliveBots.length === 0) {
          this.endMatch('cyan', '¡Victoria total! Base y enemigos eliminados.');
        }
      }
    }

    this.callbacks.onCoreHpChange(this.coreA_Hp, this.coreB_Hp, this.canRespawnA, this.canRespawnB);
  }

  private damagePlayer(amount: number, source: string) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.callbacks.onPlayerHpChange(this.playerHp, this.maxPlayerHp);

    if (this.playerHp <= 0 && this.isPlayerAlive) {
      this.isPlayerAlive = false;
      this.createParticleBurst(this.playerPosition, 0x06b6d4, 30);
      this.playerGroup.visible = false;
      this.callbacks.onKillFeed(source, this.customization.name || 'Jugador', 'Tinta Concentrada');

      if (!this.canRespawnA) {
        // PERMA-DEATH!
        this.callbacks.onPlayerDied(false, 0);
        this.endMatch('magenta', 'Derrota: has muerto definitivamente sin núcleo.');
      } else {
        // Respawn in 5 seconds
        this.playerRespawnTimer = 5;
        this.callbacks.onPlayerDied(true, 5);
      }
    }
  }

  private respawnPlayer() {
    this.isPlayerAlive = true;
    this.playerHp = this.maxPlayerHp;
    this.playerPosition.set(0, 2, 40); // Safe spawn south of Base A
    this.playerVelocity.set(0, 0, 0);
    this.playerGroup.position.copy(this.playerPosition);
    this.playerGroup.visible = true;
    this.callbacks.onPlayerHpChange(this.playerHp, this.maxPlayerHp);
    sounds.playCraftSuccess();
  }

  private killBot(bot: typeof this.bots[0], killer: string) {
    bot.config.isAlive = false;
    bot.group.visible = false;
    this.createParticleBurst(bot.group.position, 0xec4899, 25);
    this.callbacks.onKillFeed(killer, bot.config.name, 'Tinta Letal');

    if (this.canRespawnB) {
      this.botRespawnTimers.set(bot.config.id, this.timer.getElapsed() + 5);
    } else {
      // PERMANENT DEATH FOR THIS BOT!
      const aliveBots = this.bots.filter(b => b.config.isAlive);
      if (aliveBots.length === 0) {
        this.endMatch('cyan', '¡Victoria! Todos los defensores enemigos han sido eliminados.');
      }
    }
  }

  private endMatch(winner: TeamId, message: string) {
    if (this.isMatchEnded) return;
    this.isMatchEnded = true;
    this.isMouseDown = false;
    this.callbacks.onMatchEnd(winner, message);
  }

  private createParticleBurst(pos: THREE.Vector3, colorHex: number, count: number) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.12 + Math.random() * 0.15, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        Math.random() * 12 + 2,
        (Math.random() - 0.5) * 16
      );

      this.particles.push({
        mesh,
        velocity: vel,
        lifespan: 0.8 + Math.random() * 0.5,
        maxLife: 1.0
      });
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 25 * delta;
      p.lifespan -= delta;
      p.mesh.scale.multiplyScalar(0.96);

      if (p.lifespan <= 0) {
        this.scene.remove(p.mesh);
        this.disposeObject(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- 3RD PERSON CAMERA RIG ---
  private updateCamera(delta: number) {
    // Calculate target camera position behind player
    const idealOffset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      Math.sin(this.cameraPitch) * this.cameraDistance + 2.5,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance
    );

    const targetCamPos = this.playerPosition.clone().add(idealOffset);

    // Smooth Lerp
    this.camera.position.lerp(targetCamPos, 12 * delta);

    // Look at player chest/head
    const lookAtPos = this.playerPosition.clone().add(new THREE.Vector3(0, 1.8, 0));
    this.camera.lookAt(lookAtPos);

    const projectCore = (core: THREE.Group | null) => {
      if (!core) return { x: 0, y: 0, visible: false };
      const position = core.position.clone().add(new THREE.Vector3(0, 4, 0)).project(this.camera);
      const visible = position.z >= -1 && position.z <= 1 && Math.abs(position.x) <= 1 && Math.abs(position.y) <= 1;
      return {
        x: (position.x + 1) * 0.5 * this.container.clientWidth,
        y: (1 - position.y) * 0.5 * this.container.clientHeight,
        visible
      };
    };

    this.callbacks.onCoreScreenPositionsChange(projectCore(this.coreA_Mesh), projectCore(this.coreB_Mesh));
  }

  public dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Remove Event Listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.container.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.container.removeEventListener('click', this.handleContainerClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.botRespawnTimers.clear();
    if (document.pointerLockElement === this.container) document.exitPointerLock?.();

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        this.disposeObject(object);
      }
    });

    this.renderer.dispose();
    this.timer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public setPaused(paused: boolean) {
    if (this.isMatchEnded || this.isDisposed) return;
    this.isPaused = paused;
    this.timer.setTimescale(paused ? 0 : 1);
    this.keys = {};
    this.isMouseDown = false;
    if (paused && document.pointerLockElement === this.container) document.exitPointerLock?.();
  }

  private disposeObject(object: THREE.Object3D) {
    const renderable = object as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    renderable.geometry?.dispose();
    if (Array.isArray(renderable.material)) {
      renderable.material.forEach((material) => material.dispose());
    } else {
      renderable.material?.dispose();
    }
  }
}
