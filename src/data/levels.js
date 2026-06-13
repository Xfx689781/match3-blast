export const WORLDS = [
  { id: 1, theme: 'forest', color: 0x2d7a3a, accent: 0x5cb85c },
  { id: 2, theme: 'ocean',  color: 0x1565c0, accent: 0x42a5f5 },
  { id: 3, theme: 'fire',   color: 0xb71c1c, accent: 0xff7043 },
  { id: 4, theme: 'ice',    color: 0x0d47a1, accent: 0x80deea },
  { id: 5, theme: 'space',  color: 0x0d0d2b, accent: 0xce93d8 },
];

export const LEVELS = [
  // ── World 1: Forest ──────────────────────────────────────────────────
  {
    id: 1, world: 1,
    cols: 7, rows: 7, timeLimit: 85, targetScore: 1500,
    tileShape: 'rounded', colors: 6,
    obstacles: [], specials: [],
    objectives: [{ type: 'score', target: 1500 }],
    mechanics: [],
  },
  {
    id: 2, world: 1,
    cols: 7, rows: 7, timeLimit: 75, targetScore: 3000,
    tileShape: 'rounded', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.04 }],
    objectives: [{ type: 'score', target: 3000 }],
    mechanics: [],
  },
  {
    id: 3, world: 1,
    cols: 7, rows: 8, timeLimit: 72, targetScore: 5500,
    tileShape: 'rounded', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.05 }, { type: 'bomb', chance: 0.02 }],
    objectives: [{ type: 'score', target: 5500 }],
    mechanics: [],
  },
  {
    id: 4, world: 1,
    cols: 8, rows: 8, timeLimit: 65, targetScore: 10000,
    tileShape: 'rounded', colors: 6,
    obstacles: [{ type: 'stone', count: 5 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.03 }],
    objectives: [{ type: 'score', target: 10000 }],
    mechanics: [],
  },

  // ── World 2: Ocean ───────────────────────────────────────────────────
  {
    id: 5, world: 2,
    cols: 7, rows: 8, timeLimit: 78, targetScore: 13000,
    tileShape: 'circle', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.05 }],
    objectives: [{ type: 'score', target: 13000 }],
    mechanics: [],
  },
  {
    id: 6, world: 2,
    cols: 7, rows: 8, timeLimit: 72, targetScore: 17000,
    tileShape: 'circle', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'rainbow', chance: 0.015 }],
    objectives: [{ type: 'score', target: 17000 }],
    mechanics: ['drift'],
  },
  {
    id: 7, world: 2,
    cols: 8, rows: 8, timeLimit: 68, targetScore: 23000,
    tileShape: 'circle', colors: 6,
    obstacles: [{ type: 'stone', count: 7 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.03 }],
    objectives: [{ type: 'score', target: 23000 }],
    mechanics: ['drift'],
  },
  {
    id: 8, world: 2,
    cols: 8, rows: 9, timeLimit: 62, targetScore: 32000,
    tileShape: 'circle', colors: 6,
    obstacles: [{ type: 'stone', count: 9 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.04 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 32000 }],
    mechanics: ['drift', 'fog'],
  },

  // ── World 3: Fire ────────────────────────────────────────────────────
  {
    id: 9, world: 3,
    cols: 7, rows: 8, timeLimit: 68, targetScore: 40000,
    tileShape: 'diamond', colors: 5,
    obstacles: [],
    specials: [{ type: 'bomb', chance: 0.05 }, { type: 'stripe', chance: 0.06 }],
    objectives: [{ type: 'score', target: 40000 }],
    mechanics: [],
  },
  {
    id: 10, world: 3,
    cols: 8, rows: 8, timeLimit: 62, targetScore: 52000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 6 }],
    specials: [{ type: 'bomb', chance: 0.05 }, { type: 'stripe', chance: 0.06 }],
    objectives: [{ type: 'score', target: 52000 }],
    mechanics: ['lava_reform'],
  },
  {
    id: 11, world: 3,
    cols: 8, rows: 8, timeLimit: 58, targetScore: 68000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 7 }],
    specials: [{ type: 'bomb', chance: 0.07 }, { type: 'stripe', chance: 0.07 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 68000 }],
    mechanics: ['chain_bonus', 'lava_reform'],
  },
  {
    id: 12, world: 3,
    cols: 8, rows: 9, timeLimit: 55, targetScore: 88000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 9 }, { type: 'stone', count: 5 }],
    specials: [{ type: 'bomb', chance: 0.07 }, { type: 'stripe', chance: 0.07 }, { type: 'rainbow', chance: 0.025 }],
    objectives: [{ type: 'score', target: 88000 }],
    mechanics: ['chain_bonus', 'lava_reform', 'burn'],
  },

  // ── World 4: Ice ─────────────────────────────────────────────────────
  {
    id: 13, world: 4,
    cols: 7, rows: 8, timeLimit: 82, targetScore: 100000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 9 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.04 }],
    objectives: [{ type: 'score', target: 100000 }, { type: 'break_ice', target: 9 }],
    mechanics: [],
  },
  {
    id: 14, world: 4,
    cols: 8, rows: 8, timeLimit: 73, targetScore: 125000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 13 }, { type: 'stone', count: 5 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.05 }],
    objectives: [{ type: 'score', target: 125000 }, { type: 'break_ice', target: 13 }],
    mechanics: [],
  },
  {
    id: 15, world: 4,
    cols: 8, rows: 9, timeLimit: 68, targetScore: 155000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 11 }, { type: 'stone', count: 7 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.05 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 155000 }, { type: 'break_ice', target: 11 }],
    mechanics: ['ice_shift'],
  },
  {
    id: 16, world: 4,
    cols: 8, rows: 9, timeLimit: 60, targetScore: 195000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 15 }, { type: 'stone', count: 6 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.025 }],
    objectives: [{ type: 'score', target: 195000 }, { type: 'break_ice', target: 15 }],
    mechanics: ['ice_shift', 'blizzard'],
  },

  // ── World 5: Space ───────────────────────────────────────────────────
  {
    id: 17, world: 5,
    cols: 8, rows: 9, timeLimit: 78, targetScore: 240000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 7 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.03 }],
    objectives: [{ type: 'score', target: 240000 }],
    mechanics: ['dark_bg'],
  },
  {
    id: 18, world: 5,
    cols: 8, rows: 9, timeLimit: 72, targetScore: 300000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 7 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.03 }],
    objectives: [{ type: 'score', target: 300000 }],
    mechanics: ['portals', 'dark_bg'],
  },
  {
    id: 19, world: 5,
    cols: 8, rows: 9, timeLimit: 64, targetScore: 380000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 9 }],
    specials: [{ type: 'stripe', chance: 0.08 }, { type: 'bomb', chance: 0.07 }, { type: 'rainbow', chance: 0.035 }],
    objectives: [{ type: 'score', target: 380000 }],
    mechanics: ['gravity_flip', 'dark_bg'],
  },
  {
    id: 20, world: 5,
    cols: 9, rows: 10, timeLimit: 55, targetScore: 500000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 9 }],
    specials: [{ type: 'stripe', chance: 0.08 }, { type: 'bomb', chance: 0.07 }, { type: 'rainbow', chance: 0.04 }],
    objectives: [{ type: 'score', target: 500000 }],
    mechanics: ['black_hole', 'gravity_flip', 'dark_bg'],
  },
];

export function getLevelsByWorld(worldId) {
  return LEVELS.filter(l => l.world === worldId);
}

export function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}
