import { GDevelopModuleGuide } from '../types';

export const GDEVELOP_GUIDES: GDevelopModuleGuide[] = [
  {
    moduleId: 1,
    title: '1. Entorno 3D, Mapas Interactivos y Cámara 3ra Persona',
    category: 'Entorno 3D & Físicas',
    description: 'Configuración completa de la escena 3D, cámara orbital de seguimiento suave en tercera persona y mecánicas interactivas (zonas de daño por tick, jump pads de impulso y colisiones 3D) para los 3 mapas oficiales.',
    requiredExtensions: [
      { name: '3D Camera', author: 'GDevelop Team', purpose: 'Control orbital, elevación y seguimiento en tercera persona del personaje 3D.' },
      { name: '3D Object (Three.js)', author: 'GDevelop Team', purpose: 'Renderizado de mallas .glb/.gltf, iluminación y materiales PBR.' },
      { name: '3D Physics / Raycast 3D', author: 'Community', purpose: 'Cajas de colisión 3D, rebotes y detección de superficies de suelo.' }
    ],
    requiredBehaviors: [
      { objectName: 'Player_3D', behaviorName: '3D Physics Engine', purpose: 'Gravedad, masa y fuerzas de movimiento en X, Y, Z.' },
      { objectName: 'JumpPad_3D', behaviorName: '3D Box Collider', purpose: 'Trigger para propulsión vertical del jugador.' },
      { objectName: 'HazardPool_3D', behaviorName: '3D Trigger Box', purpose: 'Detección de contacto con tinta corrosiva.' }
    ],
    variables: [
      { scope: 'Global', name: 'CurrentMap', type: 'String', initialValue: '"nexus_citadel"', description: 'Identificador del mapa cargado actualmente.' },
      { scope: 'Scene', name: 'CameraDistance', type: 'Number', initialValue: '180', description: 'Distancia en Z de la cámara con respecto a la espalda del personaje.' },
      { scope: 'Scene', name: 'CameraElevation', type: 'Number', initialValue: '90', description: 'Altura en Y de la cámara sobre los hombros del jugador.' },
      { scope: 'Object', name: 'Player_3D.IsGrounded', type: 'Boolean', initialValue: 'true', description: 'Bandera de contacto con suelo mediante raycasting inferior.' }
    ],
    eventBlocks: [
      {
        id: 'cam_setup',
        title: 'Configuración Inicial de Cámara 3D (Al Iniciar Escena)',
        comment: 'Establece la perspectiva, campo de visión (FOV 65°) y la distancia de renderizado de la niebla según el mapa.',
        conditions: [
          { type: 'condition', text: 'Al comienzo de la escena', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Cámara 3D: Activar proyección en perspectiva (FOV: 65, Near: 1, Far: 4000)', parameters: [{ name: 'FOV', value: '65' }] },
          { type: 'action', text: 'Cámara 3D: Configurar color de niebla según mapa (Ciudadela: #0a0f1d, Jardines: #0b1928, Fábrica: #1f0b18)', parameters: [] },
          { type: 'action', text: 'Ocultar el cursor del ratón (Captura de puntero Mouse Pointer Lock)', parameters: [] }
        ]
      },
      {
        id: 'cam_follow',
        title: 'Lógica de Seguimiento Suave en 3ra Persona (En Cada Cuadro)',
        comment: 'La cámara orbita usando el movimiento del ratón y hace un Lerp hacia la posición calculada detrás del jugador.',
        conditions: [
          { type: 'condition', text: 'Siempre (En cada fotograma)', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Modificar ángulo Yaw de la cámara: sumar (MouseMovementX() * 0.15)', parameters: [] },
          { type: 'action', text: 'Modificar ángulo Pitch de la cámara: sujetar entre -30° y 60° con (MouseMovementY() * 0.15)', parameters: [] },
          { type: 'action', text: 'Posición Cámara X: Lerp(CameraX(), Player_3D.X() - sin(Yaw) * Variable(CameraDistance), 0.12)', parameters: [] },
          { type: 'action', text: 'Posición Cámara Y: Lerp(CameraY(), Player_3D.Y() + Variable(CameraElevation), 0.12)', parameters: [] },
          { type: 'action', text: 'Posición Cámara Z: Lerp(CameraZ(), Player_3D.Z() - cos(Yaw) * Variable(CameraDistance), 0.12)', parameters: [] },
          { type: 'action', text: 'Cámara 3D: Mirar hacia (Player_3D.X(), Player_3D.Y() + 40, Player_3D.Z())', parameters: [] }
        ]
      },
      {
        id: 'hazard_logic',
        title: 'Zonas de Daño Interactivas (Tinta Tóxica / Vacío)',
        comment: 'Aplica daño progresivo (-15 HP por segundo) al entrar en contacto con piscinas de tinta corrosiva en Fábrica Croma o precipicios en Jardines del Vacío.',
        conditions: [
          { type: 'condition', text: 'Player_3D está en colisión 3D con HazardZone_3D', parameters: [] },
          { type: 'condition', text: 'El temporizador de escena "HazardDamageTick" es mayor a 0.2 segundos', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Restar 3 a la variable Player_3D.HP (15 de daño por segundo acumulado)', parameters: [{ name: 'Valor', value: '3' }] },
          { type: 'action', text: 'Reiniciar el temporizador "HazardDamageTick"', parameters: [] },
          { type: 'action', text: 'Capa HUD: Mostrar viñeta roja con opacidad 180 y desvanecer con Tween', parameters: [] },
          { type: 'action', text: 'Reproducir sonido "Sizzle_Acid.wav" en volumen 70', parameters: [] }
        ]
      },
      {
        id: 'jumppad_logic',
        title: 'Plataformas de Salto (Jump Pads Interactivos)',
        comment: 'Impulsa al jugador a gran altura cuando pisa la plataforma de lanzamiento con un vector vertical instantáneo.',
        conditions: [
          { type: 'condition', text: 'Player_3D está en colisión 3D con JumpPad_3D', parameters: [] },
          { type: 'condition', text: 'Trigger Once (Ejecutar solo una vez por contacto)', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Player_3D (Física 3D): Aplicar impulso vertical instantáneo en eje Y con fuerza 850', parameters: [{ name: 'Fuerza', value: '850' }] },
          { type: 'action', text: 'JumpPad_3D: Crear emisor de partículas 3D "Burst_Cyan" en JumpPad_3D.Position()', parameters: [] },
          { type: 'action', text: 'Reproducir sonido "JumpPad_Launch.wav" con tono elevado (1.3)', parameters: [] }
        ]
      }
    ],
    expertTips: [
      'Para evitar que la cámara atraviese paredes 3D, agrega una comprobación de Raycast desde la cabeza del personaje hacia la posición ideal de la cámara. Si golpea un objeto de etiqueta "Wall3D", acorta la distancia al punto de impacto.',
      'En Ciudadela Nexus, optimiza el rendimiento desactivando las sombras en tiempo real de los rascacielos lejanos activando "Static Mesh" en las opciones del objeto 3D de GDevelop.'
    ]
  },
  {
    moduleId: 2,
    title: '2. Sistema Multijugador y Salas (Online P2P / Offline con Bots e IA)',
    category: 'Red & Inteligencia Artificial',
    description: 'Implementación de salas mediante código único de 6 caracteres con la extensión P2P WebRTC oficial de GDevelop, y un sistema offline contra bots con 3 niveles de dificultad de IA (Fácil, Media, Difícil).',
    requiredExtensions: [
      { name: 'P2P (Peer-to-Peer)', author: 'GDevelop Team', purpose: 'Conexión WebRTC cliente a cliente sin servidor dedicado obligatorio.' },
      { name: 'Pathfinding 3D / Navegación', author: 'Community', purpose: 'Cálculo de trayectorias evitando obstáculos y desniveles.' }
    ],
    requiredBehaviors: [
      { objectName: 'Bot_Enemy_3D', behaviorName: 'Pathfinding', purpose: 'Cálculo de rutas continuas hacia el jugador o el núcleo aliado.' }
    ],
    variables: [
      { scope: 'Global', name: 'RoomCode', type: 'String', initialValue: '""', description: 'Código único generado de sala alfanumérico (ej: INK-7492).' },
      { scope: 'Global', name: 'GameMode', type: 'String', initialValue: '"offline"', description: '"online" o "offline".' },
      { scope: 'Global', name: 'BotDifficulty', type: 'String', initialValue: '"medium"', description: '"easy", "medium" o "hard".' },
      { scope: 'Object', name: 'Bot_Enemy_3D.ReactionCooldown', type: 'Number', initialValue: '0.6', description: 'Tiempo de espera en segundos entre decisiones de ataque.' },
      { scope: 'Object', name: 'Bot_Enemy_3D.State', type: 'String', initialValue: '"patrol"', description: '"patrol", "chase_player" o "attack_core".' }
    ],
    eventBlocks: [
      {
        id: 'room_code_gen',
        title: 'Generación de Código Único de Sala P2P',
        comment: 'Crea un código aleatorio de partida y conecta al jugador como anfitrión (Host) en el broker de señalización P2P.',
        conditions: [
          { type: 'condition', text: 'El botón "Crear Sala Online" es presionado', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Modificar variable global RoomCode: "INK-" + ToString(RandomInRange(1000, 9999))', parameters: [] },
          { type: 'action', text: 'P2P: Conectar al broker usando ID: GlobalVariableString(RoomCode)', parameters: [] },
          { type: 'action', text: 'Texto_CodigoSala: Modificar texto: "CÓDIGO DE PARTIDA: " + GlobalVariableString(RoomCode)', parameters: [] },
          { type: 'action', text: 'Modificar variable global IsHost: true', parameters: [] }
        ]
      },
      {
        id: 'bot_ai_difficulty_setup',
        title: 'Configuración Escalable de Dificultad de Bots al Iniciar',
        comment: 'Ajusta los atributos de velocidad, puntería, dispersión y tiempo de reacción según la dificultad seleccionada.',
        conditions: [
          { type: 'condition', text: 'Al comienzo de la escena (Si GameMode == "offline")', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Si BotDifficulty == "easy": Bot_Enemy_3D.Speed = 160, Bot_Enemy_3D.ReactionCooldown = 1.2, Bot_Enemy_3D.Accuracy = 0.5', parameters: [] },
          { type: 'action', text: 'Si BotDifficulty == "medium": Bot_Enemy_3D.Speed = 240, Bot_Enemy_3D.ReactionCooldown = 0.6, Bot_Enemy_3D.Accuracy = 0.75', parameters: [] },
          { type: 'action', text: 'Si BotDifficulty == "hard": Bot_Enemy_3D.Speed = 320, Bot_Enemy_3D.ReactionCooldown = 0.25, Bot_Enemy_3D.Accuracy = 0.95', parameters: [] }
        ]
      },
      {
        id: 'bot_ai_hard_targeting',
        title: 'Lógica IA Difícil: Priorización de Núcleo vs Jugador',
        comment: 'Los bots en modo Difícil calculan la distancia al Núcleo de la Base Jugador. Si el camino está despejado, atacan directamente la estructura para forzar la muerte definitiva.',
        conditions: [
          { type: 'condition', text: 'GlobalVariableString(BotDifficulty) == "hard"', parameters: [] },
          { type: 'condition', text: 'Distancia entre Bot_Enemy_3D y Core_BaseA_3D < 450', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Bot_Enemy_3D.State = "attack_core"', parameters: [] },
          { type: 'action', text: 'Bot_Enemy_3D: Girar hacia Core_BaseA_3D.X(), Core_BaseA_3D.Z() a velocidad 180 deg/s', parameters: [] },
          { type: 'action', text: 'Si temporizador de objeto "BotShootTimer" > Bot_Enemy_3D.ReactionCooldown: Crear proyectil de tinta enemiga "InkBullet_Magenta" hacia el Núcleo', parameters: [] }
        ]
      }
    ],
    expertTips: [
      'Al enviar datos de posición en P2P con GDevelop, no envíes paquetes cada frame. Usa un temporizador de 50ms (20 paquetes por segundo) y aplica una interpolación Lerp en el receptor para evitar saturar el ancho de banda WebRTC.',
      'En la IA Fácil, añade un desfase aleatorio a la puntería: AnguloDeDisparo = AnguloAlObjetivo + RandomInRange(-25, 25).'
    ]
  },
  {
    moduleId: 3,
    title: '3. Personalización de Personaje 3D y Bloqueo Dinámico de Colores',
    category: 'Personaje & Customización',
    description: 'Gestión de mallas 3D para avatar masculino/femenino, cambio de ropa, color de cabello/tinta y sistema estricto de bloqueo de colores de equipo en tiempo real para evitar duplicados.',
    requiredExtensions: [
      { name: '3D Model Materials', author: 'GDevelop Team', purpose: 'Alteración en tiempo de ejecución de texturas y colores base del modelo GLB.' }
    ],
    requiredBehaviors: [
      { objectName: 'Player_Avatar_3D', behaviorName: '3D Model', purpose: 'Animaciones de correr, idle, salto y forja.' }
    ],
    variables: [
      { scope: 'Global', name: 'Player_Gender', type: 'String', initialValue: '"female"', description: '"male" o "female".' },
      { scope: 'Global', name: 'Player_Outfit', type: 'String', initialValue: '"tactical"', description: '"tactical", "cyberpunk" o "chroma_armor".' },
      { scope: 'Global', name: 'Player_TeamColor', type: 'String', initialValue: '"cyan"', description: '"cyan", "magenta", "yellow" o "green".' },
      { scope: 'Global', name: 'TeamColor_Cyan_Taken', type: 'Boolean', initialValue: 'false', description: 'Bloqueo para impedir que dos jugadores escojan el mismo color.' },
      { scope: 'Global', name: 'TeamColor_Magenta_Taken', type: 'Boolean', initialValue: 'true', description: 'Reclamado por el equipo rival/bots.' }
    ],
    eventBlocks: [
      {
        id: 'gender_swap',
        title: 'Intercambio de Modelo 3D (Hombre / Mujer)',
        comment: 'Cambia la malla base activa y transfiere las coordenadas de posición y físicas sin interrumpir la escena.',
        conditions: [
          { type: 'condition', text: 'El botón "Seleccionar_Hombre" es presionado', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Modificar variable global Player_Gender: "male"', parameters: [] },
          { type: 'action', text: 'Ocultar objeto 3D Hero_Female_3D', parameters: [] },
          { type: 'action', text: 'Mostrar objeto 3D Hero_Male_3D y ubicarlo en las coordenadas exactas de Hero_Female_3D', parameters: [] },
          { type: 'action', text: 'Asignar cámara 3D para que siga a Hero_Male_3D', parameters: [] }
        ]
      },
      {
        id: 'color_locking_validation',
        title: 'Sistema de Validación y Bloqueo de Colores de Equipo',
        comment: 'Comprueba si el color deseado ya fue reclamado por otro jugador en la sala o por el equipo rival, inhabilitando el botón y mostrando alerta.',
        conditions: [
          { type: 'condition', text: 'El jugador hace clic en el botón de color "Team_Magenta"', parameters: [] }
        ],
        actions: [],
        subEvents: [
          {
            id: 'sub_color_locked',
            title: 'Si el color ya está tomado',
            conditions: [
              { type: 'condition', text: 'GlobalVariable(TeamColor_Magenta_Taken) == true', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Reproducir sonido "Error_Buzzer.wav" en volumen 80', parameters: [] },
              { type: 'action', text: 'Mostrar texto en pantalla: "¡COLOR YA RECLAMADO POR OTRO JUGADOR!" durante 2 segundos con color rojo', parameters: [] },
              { type: 'action', text: 'Boton_Magenta: Establecer opacidad en 60 y aplicar tinte grisáceo', parameters: [] }
            ]
          },
          {
            id: 'sub_color_free',
            title: 'Si el color está disponible',
            conditions: [
              { type: 'condition', text: 'GlobalVariable(TeamColor_Magenta_Taken) == false', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Liberar el color anterior: GlobalVariable(TeamColor_Cyan_Taken) = false', parameters: [] },
              { type: 'action', text: 'Reclamar nuevo color: GlobalVariable(TeamColor_Magenta_Taken) = true', parameters: [] },
              { type: 'action', text: 'Player_Avatar_3D: Modificar color de emisión del material del cabello al código hexadecimal #EC4899', parameters: [] },
              { type: 'action', text: 'Si GameMode == "online": P2P Enviar mensaje "COLOR_CLAIMED" con payload {"color": "magenta"}', parameters: [] }
            ]
          }
        ]
      }
    ],
    expertTips: [
      'Usa sub-mallas o materiales separados dentro del archivo .GLB con nombres como "Hair_Mat", "Suit_Mat" y "Skin_Mat". Esto te permite en GDevelop usar la acción "Modificar color de material específico" sin tener que recargar el modelo completo.'
    ]
  },
  {
    moduleId: 4,
    title: '4. Mecánica del Pincel Mágico (Dibujo 2D a Objeto 3D Forjado)',
    category: 'Gameplay Innovador & Canvas',
    description: 'Panel de interfaz táctil/ratón 2D en una capa UI superior donde el usuario traza líneas libres. Al pulsar "Crear", un analizador de trazos determina si es Espada, Escudo o Cañón y genera el objeto 3D en las manos del personaje.',
    requiredExtensions: [
      { name: 'Shape Painter (Pintor de Formas)', author: 'GDevelop Team', purpose: 'Renderizado dinámico en tiempo real de líneas y curvas vectoriales según el trazo del ratón.' },
      { name: '3D Object Attachment / Pin', author: 'Community', purpose: 'Fijar la malla 3D forjada al punto de anclaje (Bone socket) de la mano del héroe.' }
    ],
    requiredBehaviors: [
      { objectName: 'Crafted_Sword_3D', behaviorName: '3D Object Link', purpose: 'Sincronizar posición y rotación con la mano del jugador.' }
    ],
    variables: [
      { scope: 'Scene', name: 'IsDrawing', type: 'Boolean', initialValue: 'false', description: 'Indica si el jugador está arrastrando el trazo sobre el lienzo.' },
      { scope: 'Scene', name: 'StrokePoints', type: 'Structure', initialValue: '[]', description: 'Array que almacena las coordenadas (X, Y) de los puntos dibujados.' },
      { scope: 'Object', name: 'Player_3D.EquippedWeapon', type: 'String', initialValue: '"blaster"', description: '"sword", "shield", "cannon" o "blaster".' },
      { scope: 'Object', name: 'Player_3D.WeaponDurability', type: 'Number', initialValue: '100', description: 'Durabilidad del arma forjada antes de consumirse.' }
    ],
    eventBlocks: [
      {
        id: 'canvas_drawing',
        title: 'Captura de Trazos del Pincel en Capa 2D',
        comment: 'Dibuja líneas suaves en el Shape Painter mientras el botón primario del ratón o touch esté presionado sobre el área de trabajo.',
        conditions: [
          { type: 'condition', text: 'El panel "InkCanvas_UI" está visible', parameters: [] },
          { type: 'condition', text: 'El botón del ratón izquierdo está presionado (o Touch activo)', parameters: [] },
          { type: 'condition', text: 'El cursor está dentro de los límites del panel de dibujo (X: 100-500, Y: 150-550)', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'ShapePainter: Dibujar línea desde el último punto registrado hasta (MouseX(), MouseY()) con grosor 12 y color de tinta', parameters: [] },
          { type: 'action', text: 'Añadir elemento a la estructura StrokePoints: {"x": MouseX(), "y": MouseY()}', parameters: [] },
          { type: 'action', text: 'Reproducir sonido sutil "Brush_Stroke.wav" cada 80ms', parameters: [] }
        ]
      },
      {
        id: 'forge_recognition_and_spawn',
        title: 'Botón "Crear": Análisis de Forma e Instanciación 3D',
        comment: 'Evalúa la geometría del trazo (relación de aspecto, dispersión de puntos y cerramiento) para clasificar la creación y montarla en 3D.',
        conditions: [
          { type: 'condition', text: 'El botón "Boton_CrearObjeto" es clickeado', parameters: [] },
          { type: 'condition', text: 'La cantidad de puntos en StrokePoints > 8', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Calcular AnchoTrazo = MaxX - MinX, AltoTrazo = MaxY - MinY', parameters: [] }
        ],
        subEvents: [
          {
            id: 'sub_sword',
            title: 'Trazo Alargado Vertical/Diagonal -> ESPADA 3D DE TINTA',
            conditions: [
              { type: 'condition', text: 'AltoTrazo / AnchoTrazo > 2.2 (o AnchoTrazo / AltoTrazo > 2.2)', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Crear objeto 3D "Sword_Ink_3D" en Player_3D.PointX("RightHand"), Player_3D.PointY("RightHand"), Player_3D.PointZ("RightHand")', parameters: [] },
              { type: 'action', text: 'Vincular Sword_Ink_3D a la mano del jugador con el comportamiento 3D Link', parameters: [] },
              { type: 'action', text: 'Modificar Player_3D.EquippedWeapon: "sword", Player_3D.MeleeDamage: 45', parameters: [] },
              { type: 'action', text: 'Ocultar panel InkCanvas_UI y reproducir fanfarria "Forge_Success.wav"', parameters: [] }
            ]
          },
          {
            id: 'sub_shield',
            title: 'Trazo Cerrado o Circular -> ESCUDO PROTECTOR 3D',
            conditions: [
              { type: 'condition', text: 'Distancia entre PrimerPunto y UltimoPunto < 45 y AnchoTrazo es similar a AltoTrazo', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Crear objeto 3D "Shield_Ink_3D" en Player_3D.PointX("LeftArm"), Player_3D.PointY("LeftArm"), Player_3D.PointZ("LeftArm")', parameters: [] },
              { type: 'action', text: 'Modificar Player_3D.DefenseReduction: 0.60 (Reduce 60% el daño recibido)', parameters: [] },
              { type: 'action', text: 'Activar halo luminoso de energía 3D alrededor del personaje', parameters: [] }
            ]
          },
          {
            id: 'sub_cannon',
            title: 'Trazo Complejo o Cruz -> CAÑÓN DE DISPARO PESADO',
            conditions: [
              { type: 'condition', text: 'Cualquier otra forma compleja con más de 25 puntos', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Crear objeto 3D "Heavy_Cannon_3D" equipado en Player_3D', parameters: [] },
              { type: 'action', text: 'Modificar Player_3D.EquippedWeapon: "cannon", Proyectil: "InkMissile_Heavy" (Daño en área)', parameters: [] }
            ]
          }
        ]
      }
    ],
    expertTips: [
      'Guarda una plantilla visual con 3 siluetas de guía semitransparentes en el fondo del Canvas. Así el jugador principiante puede simplemente calcar la silueta de la espada o escudo y obtener el arma exacta que desea garantizado.'
    ]
  },
  {
    moduleId: 5,
    title: '5. Lucha de Bases, Núcleo y Desactivación Definitiva de Respawn',
    category: 'Condiciones de Victoria & Lógica de Núcleo',
    description: 'Sistema de salud de Bases (1000 HP) y Jugadores (100 HP). Lógica crítica por eventos: si el Núcleo de un equipo es destruido (0 HP), la señal de reaparición queda desactivada para siempre y cualquier miembro derrotado muere definitivamente.',
    requiredExtensions: [
      { name: '3D Particle System', author: 'GDevelop Team', purpose: 'Explosiones volumétricas y chispas al impactar o destruir el núcleo de energía.' }
    ],
    requiredBehaviors: [
      { objectName: 'Core_Energy_3D', behaviorName: '3D Box Collider', purpose: 'Área de impacto para proyectiles y ataques cuerpo a cuerpo.' }
    ],
    variables: [
      { scope: 'Global', name: 'CoreHP_TeamA', type: 'Number', initialValue: '1000', description: 'Puntos de vida del Núcleo del Equipo A (Jugador).' },
      { scope: 'Global', name: 'CoreHP_TeamB', type: 'Number', initialValue: '1000', description: 'Puntos de vida del Núcleo del Equipo B (Enemigo).' },
      { scope: 'Global', name: 'CanRespawn_TeamA', type: 'Boolean', initialValue: 'true', description: 'Si es true, los miembros del Equipo A pueden reaparecer.' },
      { scope: 'Global', name: 'CanRespawn_TeamB', type: 'Boolean', initialValue: 'true', description: 'Si es true, los miembros del Equipo B pueden reaparecer.' },
      { scope: 'Scene', name: 'MatchWinner', type: 'String', initialValue: '""', description: '"team_a", "team_b" o vacío.' }
    ],
    eventBlocks: [
      {
        id: 'core_damage_logic',
        title: 'Impacto de Proyectil en Núcleo 3D',
        comment: 'Detecta cuando un disparo de tinta golpea la caja de colisión del Núcleo enemigo, restando vida e invocando partículas.',
        conditions: [
          { type: 'condition', text: 'InkBullet_Cyan está en colisión 3D con Core_BaseB_3D', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Restar 25 a la variable global CoreHP_TeamB', parameters: [{ name: 'Daño', value: '25' }] },
          { type: 'action', text: 'Destruir InkBullet_Cyan', parameters: [] },
          { type: 'action', text: 'Core_BaseB_3D: Activar efecto de parpadeo blanco emisivo durante 0.1s', parameters: [] },
          { type: 'action', text: 'Crear emisor de partículas 3D "Ink_Sparks_3D" en el punto de contacto', parameters: [] },
          { type: 'action', text: 'Reproducir sonido "Core_Damage_Alert.wav"', parameters: [] }
        ]
      },
      {
        id: 'core_destruction_cutoff',
        title: 'Colapso del Núcleo: Desactivación PERMANENTE de Respawn',
        comment: '¡REGLA FUNDAMENTAL!: Al llegar el núcleo a 0 de vida, se anula el Respawn del equipo de forma irreversible.',
        conditions: [
          { type: 'condition', text: 'GlobalVariable(CoreHP_TeamB) <= 0', parameters: [] },
          { type: 'condition', text: 'GlobalVariable(CanRespawn_TeamB) == true (Ejecutar solo una vez)', parameters: [] }
        ],
        actions: [
          { type: 'action', text: 'Modificar variable global CanRespawn_TeamB = false', parameters: [] },
          { type: 'action', text: 'Core_BaseB_3D: Iniciar animación "Crumble_Explode_3D"', parameters: [] },
          { type: 'action', text: 'Crear gran explosión de partículas 3D "Supernova_Explosion_3D" con radio 250', parameters: [] },
          { type: 'action', text: 'Reproducir sonido masivo "Core_Destroyed_Blast.wav"', parameters: [] },
          { type: 'action', text: 'Mostrar alerta en HUD con letras gigantes: "¡NÚCLEO ENEMIGO DESTRUIDO! ¡EL RESPAWN RIVAL ESTÁ DESACTIVADO!"', parameters: [] }
        ]
      },
      {
        id: 'player_death_respawn_check',
        title: 'Muerte del Personaje: Reaparición vs Muerte Definitiva',
        comment: 'Verifica el estado del Núcleo. Si aún vive, programa el Respawn tras 5 segundos. Si el Núcleo cayó, declara la eliminación permanente.',
        conditions: [
          { type: 'condition', text: 'Player_3D.HP <= 0', parameters: [] },
          { type: 'condition', text: 'Trigger Once (Solo una vez al morir)', parameters: [] }
        ],
        actions: [],
        subEvents: [
          {
            id: 'sub_has_respawn',
            title: 'Caso A: El Núcleo Aliado sigue vivo (CanRespawn_TeamA == true)',
            conditions: [
              { type: 'condition', text: 'GlobalVariable(CanRespawn_TeamA) == true', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Ocultar modelo Player_3D y desactivar físicas de movimiento', parameters: [] },
              { type: 'action', text: 'Iniciar temporizador de escena "PlayerRespawnTimer"', parameters: [] },
              { type: 'action', text: 'HUD: Mostrar pantalla de cuenta regresiva "Reapareciendo en 5... 4... 3..."', parameters: [] },
              { type: 'action', text: 'Al cumplirse 5 segundos: Mover Player_3D a SpawnPoint_TeamA.X(), SpawnPoint_TeamA.Z(), restaurar HP a 100, hacer visible y reactivar físicas', parameters: [] }
            ]
          },
          {
            id: 'sub_perma_death',
            title: 'Caso B: El Núcleo fue destruido (CanRespawn_TeamA == false) -> MUERTE DEFINITIVA',
            conditions: [
              { type: 'condition', text: 'GlobalVariable(CanRespawn_TeamA) == false', parameters: [] }
            ],
            actions: [
              { type: 'action', text: 'Destruir permanentemente el objeto Player_3D de la escena', parameters: [] },
              { type: 'action', text: 'Reproducir sonido sombrío "Defeat_Stinger.wav"', parameters: [] },
              { type: 'action', text: 'Cámara 3D: Cambiar a modo espectador flotante libre sobre el campo', parameters: [] },
              { type: 'action', text: 'Mostrar pantalla final: "¡ELIMINACIÓN PERMANENTE! Tu base no tiene soporte vital. DERROTA."', parameters: [] },
              { type: 'action', text: 'Modificar variable MatchWinner = "team_b"', parameters: [] }
            ]
          }
        ]
      }
    ],
    expertTips: [
      'Crea una variable booleana de objeto `IsVulnerable` en los Núcleos para que solo puedan recibir daño si el jugador ha desactivado primero las torretas perimetrales o si está dentro del radio de la base enemiga.',
      'Sincroniza el HUD con la expresión `ToString(Floor(GlobalVariable(CoreHP_TeamA))) + " / 1000 HP"` y aplica un color condicional: Verde si >500, Amarillo si >200, Rojo parpadeante si <200.'
    ]
  }
];

export const MAPS_CATALOG = [
  {
    id: 'nexus_citadel' as const,
    name: 'MAPA 01: CIUDADELA NEXUS',
    theme: 'Metrópolis Cyberpunk & Neón',
    description: 'Rascacielos cibernéticos de alta tecnología, puentes de energía holográfica suspendidos, torres con jump pads de elevación y pasillos estrechos para combate táctico.',
    skyColor: 0x050b14,
    fogColor: 0x081326,
    groundColor: 0x0f172a,
    accentColor: 0x06b6d4, // Cyan
    hazardsDescription: 'Zonas de sobrecarga estática en los bordes inferiores que restan 15 HP/s.',
    jumpPadsCount: 4,
    hazardsCount: 2
  },
  {
    id: 'void_gardens' as const,
    name: 'MAPA 02: JARDINES DEL VACÍO',
    theme: 'Islas Flotantes & Bioluminiscencia',
    description: 'Archipiélago de islas de roca flotantes en el espacio sideral unidas por plataformas oscilantes, templos prismáticos y precipicios infinitos de caída libre.',
    skyColor: 0x070614,
    fogColor: 0x110e2e,
    groundColor: 0x181438,
    accentColor: 0xa855f7, // Purple
    hazardsDescription: 'Precipicios al abismo sideral. Si caes de la isla pierdes el 100% de HP inmediatamente.',
    jumpPadsCount: 5,
    hazardsCount: 3
  },
  {
    id: 'chroma_factory' as const,
    name: 'MAPA 03: FÁBRICA CROMA',
    theme: 'Complejo Industrial Tóxico',
    description: 'Instalación de extracción de pigmentos pesados con piscinas de tinta corrosiva humeante, cintas transportadoras, prensas neumáticas móviles y pasarelas elevadas.',
    skyColor: 0x14080e,
    fogColor: 0x240e1b,
    groundColor: 0x2b1322,
    accentColor: 0xf43f5e, // Rose / Pink
    hazardsDescription: '3 piscinas de ácido de pigmento concentrado hirviente en la zona central.',
    jumpPadsCount: 3,
    hazardsCount: 4
  }
];
