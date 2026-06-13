// Each level: id, world, name, cols, rows, timeLimit(s), targetScore,
// tileShape, colors(6 max), obstacles[], specials[], objectives[], bgKey, mechanics[]

export const WORLDS = [
  { id: 1, name: '森林',   theme: 'forest', color: 0x2d7a3a, accent: 0x5cb85c },
  { id: 2, name: '海洋',   theme: 'ocean',  color: 0x1565c0, accent: 0x42a5f5 },
  { id: 3, name: '火山',   theme: 'fire',   color: 0xb71c1c, accent: 0xff7043 },
  { id: 4, name: '冰川',   theme: 'ice',    color: 0x0d47a1, accent: 0x80deea },
  { id: 5, name: '星空',   theme: 'space',  color: 0x0d0d2b, accent: 0xce93d8 },
];

export const LEVELS = [
  // ── World 1: Forest ──────────────────────────────────────────────────
  {
    id: 1, world: 1, name: '林间初醒',
    cols: 7, rows: 7, timeLimit: 90, targetScore: 1200,
    tileShape: 'rounded', colors: 6,
    obstacles: [], specials: [],
    objectives: [{ type: 'score', target: 1200 }],
    mechanics: [],
  },
  {
    id: 2, world: 1, name: '树冠迷踪',
    cols: 7, rows: 7, timeLimit: 80, targetScore: 2500,
    tileShape: 'rounded', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.04 }],
    objectives: [{ type: 'score', target: 2500 }],
    mechanics: [],
  },
  {
    id: 3, world: 1, name: '古树爆发',
    cols: 7, rows: 8, timeLimit: 80, targetScore: 4500,
    tileShape: 'rounded', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.05 }, { type: 'bomb', chance: 0.02 }],
    objectives: [{ type: 'score', target: 4500 }],
    mechanics: [],
  },
  {
    id: 4, world: 1, name: '森林风暴',
    cols: 8, rows: 8, timeLimit: 75, targetScore: 8000,
    tileShape: 'rounded', colors: 6,
    obstacles: [{ type: 'stone', count: 4 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.03 }],
    objectives: [{ type: 'score', target: 8000 }],
    mechanics: [],
  },

  // ── World 2: Ocean ───────────────────────────────────────────────────
  {
    id: 5, world: 2, name: '珊瑚海湾',
    cols: 7, rows: 8, timeLimit: 85, targetScore: 10000,
    tileShape: 'circle', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.05 }],
    objectives: [{ type: 'score', target: 10000 }],
    mechanics: [],
  },
  {
    id: 6, world: 2, name: '洋流漂移',
    cols: 7, rows: 8, timeLimit: 80, targetScore: 14000,
    tileShape: 'circle', colors: 6,
    obstacles: [],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'rainbow', chance: 0.015 }],
    objectives: [{ type: 'score', target: 14000 }],
    mechanics: ['drift'],  // every 15s a random column shifts down 1
  },
  {
    id: 7, world: 2, name: '深海漩涡',
    cols: 8, rows: 8, timeLimit: 75, targetScore: 19000,
    tileShape: 'circle', colors: 6,
    obstacles: [{ type: 'stone', count: 6 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.03 }],
    objectives: [{ type: 'score', target: 19000 }],
    mechanics: ['drift'],
  },
  {
    id: 8, world: 2, name: '幽暗深渊',
    cols: 8, rows: 9, timeLimit: 70, targetScore: 26000,
    tileShape: 'circle', colors: 6,
    obstacles: [{ type: 'stone', count: 8 }],
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.04 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 26000 }],
    mechanics: ['drift', 'fog'],  // fog hides some tiles
  },

  // ── World 3: Fire ────────────────────────────────────────────────────
  {
    id: 9, world: 3, name: '熔岩序幕',
    cols: 7, rows: 8, timeLimit: 75, targetScore: 32000,
    tileShape: 'diamond', colors: 5,
    obstacles: [],
    specials: [{ type: 'bomb', chance: 0.05 }, { type: 'stripe', chance: 0.06 }],
    objectives: [{ type: 'score', target: 32000 }],
    mechanics: [],
  },
  {
    id: 10, world: 3, name: '熔核涌现',
    cols: 8, rows: 8, timeLimit: 70, targetScore: 42000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 5 }], // lava: reforms after cleared
    specials: [{ type: 'bomb', chance: 0.05 }, { type: 'stripe', chance: 0.06 }],
    objectives: [{ type: 'score', target: 42000 }],
    mechanics: ['lava_reform'],
  },
  {
    id: 11, world: 3, name: '连环爆破',
    cols: 8, rows: 8, timeLimit: 65, targetScore: 55000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 6 }],
    specials: [{ type: 'bomb', chance: 0.07 }, { type: 'stripe', chance: 0.07 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 55000 }],
    mechanics: ['chain_bonus', 'lava_reform'], // cascades multiply score
  },
  {
    id: 12, world: 3, name: '烈焰地狱',
    cols: 8, rows: 9, timeLimit: 60, targetScore: 72000,
    tileShape: 'diamond', colors: 5,
    obstacles: [{ type: 'lava', count: 8 }, { type: 'stone', count: 4 }],
    specials: [{ type: 'bomb', chance: 0.07 }, { type: 'stripe', chance: 0.07 }, { type: 'rainbow', chance: 0.025 }],
    objectives: [{ type: 'score', target: 72000 }],
    mechanics: ['chain_bonus', 'lava_reform', 'burn'], // tiles vanish after 4s if not matched
  },

  // ── World 4: Ice ─────────────────────────────────────────────────────
  {
    id: 13, world: 4, name: '冰原初探',
    cols: 7, rows: 8, timeLimit: 90, targetScore: 85000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 8 }], // ice: needs 2 adjacent matches to break
    specials: [{ type: 'stripe', chance: 0.06 }, { type: 'bomb', chance: 0.04 }],
    objectives: [{ type: 'score', target: 85000 }, { type: 'break_ice', target: 8 }],
    mechanics: [],
  },
  {
    id: 14, world: 4, name: '极地寒流',
    cols: 8, rows: 8, timeLimit: 80, targetScore: 105000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 12 }, { type: 'stone', count: 4 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.05 }],
    objectives: [{ type: 'score', target: 105000 }, { type: 'break_ice', target: 12 }],
    mechanics: [],
  },
  {
    id: 15, world: 4, name: '移动冰山',
    cols: 8, rows: 9, timeLimit: 75, targetScore: 130000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 10 }, { type: 'stone', count: 6 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.05 }, { type: 'rainbow', chance: 0.02 }],
    objectives: [{ type: 'score', target: 130000 }, { type: 'break_ice', target: 10 }],
    mechanics: ['ice_shift'], // ice blocks shift position every 12s
  },
  {
    id: 16, world: 4, name: '暴风雪',
    cols: 8, rows: 9, timeLimit: 65, targetScore: 165000,
    tileShape: 'hex', colors: 6,
    obstacles: [{ type: 'ice', count: 14 }, { type: 'stone', count: 5 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.025 }],
    objectives: [{ type: 'score', target: 165000 }, { type: 'break_ice', target: 14 }],
    mechanics: ['ice_shift', 'blizzard'], // new ice appears periodically
  },

  // ── World 5: Space ───────────────────────────────────────────────────
  {
    id: 17, world: 5, name: '星际迷航',
    cols: 8, rows: 9, timeLimit: 85, targetScore: 200000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 6 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.03 }],
    objectives: [{ type: 'score', target: 200000 }],
    mechanics: ['dark_bg'],
  },
  {
    id: 18, world: 5, name: '传送门',
    cols: 8, rows: 9, timeLimit: 80, targetScore: 250000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 6 }],
    specials: [{ type: 'stripe', chance: 0.07 }, { type: 'bomb', chance: 0.06 }, { type: 'rainbow', chance: 0.03 }],
    objectives: [{ type: 'score', target: 250000 }],
    mechanics: ['portals', 'dark_bg'], // portal pairs: match near one side teleports tile
  },
  {
    id: 19, world: 5, name: '引力翻转',
    cols: 8, rows: 9, timeLimit: 70, targetScore: 320000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 8 }],
    specials: [{ type: 'stripe', chance: 0.08 }, { type: 'bomb', chance: 0.07 }, { type: 'rainbow', chance: 0.035 }],
    objectives: [{ type: 'score', target: 320000 }],
    mechanics: ['gravity_flip', 'dark_bg'], // gravity direction rotates after each cascade
  },
  {
    id: 20, world: 5, name: '黑洞纪元',
    cols: 9, rows: 10, timeLimit: 60, targetScore: 420000,
    tileShape: 'star', colors: 6,
    obstacles: [{ type: 'stone', count: 8 }],
    specials: [{ type: 'stripe', chance: 0.08 }, { type: 'bomb', chance: 0.07 }, { type: 'rainbow', chance: 0.04 }],
    objectives: [{ type: 'score', target: 420000 }],
    mechanics: ['black_hole', 'gravity_flip', 'dark_bg'], // periodic suck toward center
  },
];

export function getLevelsByWorld(worldId) {
  return LEVELS.filter(l => l.world === worldId);
}

export function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}
