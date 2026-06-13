import { TILE_COLORS, SPECIAL_COLORS, OBSTACLE_COLORS } from './TileTypes.js';

export const TYPE = {
  NORMAL:   'normal',
  STRIPE_H: 'stripe_h',
  STRIPE_V: 'stripe_v',
  BOMB:     'bomb',
  RAINBOW:  'rainbow',
  STONE:    'stone',
  ICE:      'ice',
  LAVA:     'lava',
  EMPTY:    'empty',
};

export class Tile {
  constructor(color, type = TYPE.NORMAL) {
    this.color   = color;   // 0-5 index into TILE_COLORS
    this.type    = type;
    this.iceHp   = type === TYPE.ICE  ? 2 : 0;
    this.lavaHp  = type === TYPE.LAVA ? 1 : 0;
    this.burnTimer = 0;   // used by 'burn' mechanic
    this.markDelete = false;
  }

  isObstacle() {
    return this.type === TYPE.STONE || this.type === TYPE.ICE || this.type === TYPE.LAVA;
  }

  isMovable() {
    return this.type !== TYPE.STONE;
  }

  colorSet() {
    if (this.type === TYPE.STONE) return OBSTACLE_COLORS.stone;
    if (this.type === TYPE.ICE)   return OBSTACLE_COLORS.ice;
    if (this.type === TYPE.LAVA)  return OBSTACLE_COLORS.lava;
    if (this.type in SPECIAL_COLORS) return SPECIAL_COLORS[this.type];
    return TILE_COLORS[this.color];
  }
}

export class Board {
  constructor(cols, rows, levelDef) {
    this.cols = cols;
    this.rows = rows;
    this.level = levelDef;
    this.cells = [];   // [row][col] = Tile | null
    this.gravityDir = 'down'; // 'down' | 'up' | 'left' | 'right'
    this._init();
  }

  _init() {
    const { obstacles = [], specials = [], colors = 6 } = this.level;

    // Place stones
    const stoneCells = new Set();
    const stoneConf = obstacles.find(o => o.type === 'stone');
    if (stoneConf) {
      while (stoneCells.size < stoneConf.count) {
        const r = 1 + Math.floor(Math.random() * (this.rows - 2));
        const c = Math.floor(Math.random() * this.cols);
        stoneCells.add(`${r},${c}`);
      }
    }

    // Place ice
    const iceCells = new Set();
    const iceConf = obstacles.find(o => o.type === 'ice');
    if (iceConf) {
      while (iceCells.size < iceConf.count) {
        const r = 2 + Math.floor(Math.random() * (this.rows - 3));
        const c = Math.floor(Math.random() * this.cols);
        const key = `${r},${c}`;
        if (!stoneCells.has(key)) iceCells.add(key);
      }
    }

    // Place lava
    const lavaCells = new Set();
    const lavaConf = obstacles.find(o => o.type === 'lava');
    if (lavaConf) {
      while (lavaCells.size < lavaConf.count) {
        const r = 3 + Math.floor(Math.random() * (this.rows - 4));
        const c = Math.floor(Math.random() * this.cols);
        const key = `${r},${c}`;
        if (!stoneCells.has(key) && !iceCells.has(key)) lavaCells.add(key);
      }
    }

    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const key = `${r},${c}`;
        if (stoneCells.has(key)) {
          this.cells[r][c] = new Tile(0, TYPE.STONE);
        } else if (iceCells.has(key)) {
          this.cells[r][c] = new Tile(0, TYPE.ICE);
        } else if (lavaCells.has(key)) {
          this.cells[r][c] = new Tile(0, TYPE.LAVA);
        } else {
          this.cells[r][c] = this._randomNormal(r, c, colors);
        }
      }
    }
    this._ensureNoStartMatches(colors);
  }

  _randomNormal(r, c, colorCount) {
    const specials = this.level.specials || [];
    const t = new Tile(Math.floor(Math.random() * colorCount));
    for (const s of specials) {
      if (Math.random() < (s.chance || 0)) {
        t.type = s.type;
        return t;
      }
    }
    return t;
  }

  _ensureNoStartMatches(colorCount) {
    let found = true;
    let passes = 0;
    while (found && passes < 10) {
      found = false;
      passes++;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.cells[r][c];
          if (!t || t.isObstacle()) continue;
          const left2  = c >= 2 && this._sameColor(r, c-1, t) && this._sameColor(r, c-2, t);
          const up2    = r >= 2 && this._sameColor(r-1, c, t) && this._sameColor(r-2, c, t);
          if (left2 || up2) {
            t.color = Math.floor(Math.random() * colorCount);
            found = true;
          }
        }
      }
    }
  }

  _sameColor(r, c, ref) {
    const t = this.get(r, c);
    return t && t.type === TYPE.NORMAL && t.color === ref.color;
  }

  get(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return this.cells[r][c];
  }

  set(r, c, tile) {
    this.cells[r][c] = tile;
  }

  swap(r1, c1, r2, c2) {
    const tmp = this.cells[r1][c1];
    this.cells[r1][c1] = this.cells[r2][c2];
    this.cells[r2][c2] = tmp;
  }

  isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  /**
   * Find all matched groups. Returns array of arrays of {r,c} cells.
   */
  findMatches() {
    const visited = new Set();
    const groups  = [];

    // Horizontal runs
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const t = this.cells[r][c];
        if (!t || t.isObstacle() || t.type === TYPE.RAINBOW) { c++; continue; }
        let len = 1;
        while (c + len < this.cols) {
          const n = this.cells[r][c + len];
          if (n && !n.isObstacle() && this._matchable(t, n)) len++;
          else break;
        }
        if (len >= 3) {
          const group = [];
          for (let i = 0; i < len; i++) group.push({ r, c: c + i });
          groups.push({ cells: group, dir: 'h', len });
        }
        c += len;
      }
    }

    // Vertical runs
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const t = this.cells[r][c];
        if (!t || t.isObstacle() || t.type === TYPE.RAINBOW) { r++; continue; }
        let len = 1;
        while (r + len < this.rows) {
          const n = this.cells[r + len][c];
          if (n && !n.isObstacle() && this._matchable(t, n)) len++;
          else break;
        }
        if (len >= 3) {
          const group = [];
          for (let i = 0; i < len; i++) group.push({ r: r + i, c });
          groups.push({ cells: group, dir: 'v', len });
        }
        r += len;
      }
    }

    return this._mergeGroups(groups);
  }

  _matchable(a, b) {
    if (a.type === TYPE.RAINBOW || b.type === TYPE.RAINBOW) return true;
    return a.color === b.color;
  }

  _mergeGroups(groups) {
    // Merge overlapping groups into single sets, preserving special creation info
    const cellMap = new Map(); // key -> { group index }
    const merged  = [];

    for (const g of groups) {
      const touchedGroups = new Set();
      for (const { r, c } of g.cells) {
        const key = `${r},${c}`;
        if (cellMap.has(key)) touchedGroups.add(cellMap.get(key));
      }
      if (touchedGroups.size === 0) {
        const idx = merged.length;
        merged.push({ cells: [...g.cells], dir: g.dir, len: g.len });
        for (const { r, c } of g.cells) cellMap.set(`${r},${c}`, idx);
      } else {
        const [first, ...rest] = [...touchedGroups];
        for (const { r, c } of g.cells) {
          const key = `${r},${c}`;
          if (!cellMap.has(key)) {
            merged[first].cells.push({ r, c });
            cellMap.set(key, first);
          }
        }
        for (const other of rest) {
          for (const cell of merged[other].cells) {
            const key = `${cell.r},${cell.c}`;
            if (cellMap.get(key) === other) {
              merged[first].cells.push(cell);
              cellMap.set(key, first);
            }
          }
          merged[other] = null;
        }
        if (g.len > merged[first].len) {
          merged[first].len = g.len;
          merged[first].dir = g.dir;
        }
      }
    }

    return merged.filter(Boolean);
  }

  /**
   * Determine what special tile (if any) a match group creates.
   * Returns null | 'stripe_h' | 'stripe_v' | 'bomb' | 'rainbow'
   */
  specialForGroup(group) {
    const len = group.cells.length;
    if (len >= 7) return TYPE.RAINBOW;
    if (len >= 5) return TYPE.BOMB;
    if (len === 4) return group.dir === 'h' ? TYPE.STRIPE_V : TYPE.STRIPE_H;
    return null;
  }

  /**
   * Mark all cells in matches as deleted. Trigger specials.
   * Returns { deleted: Set<key>, specials: [{r,c,type}], icesBroken: int, scoreAdd: int }
   */
  applyMatches(matches, chainLevel = 1) {
    const toDelete   = new Set();
    const newSpecials = [];
    let scoreAdd = 0;
    let icesBroken = 0;

    for (const group of matches) {
      const special = this.specialForGroup(group);
      let pivot = null;

      for (const { r, c } of group.cells) {
        const t = this.cells[r][c];
        if (!t) continue;

        // Check adjacent ice tiles
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ice = this.get(r + dr, c + dc);
          if (ice && ice.type === TYPE.ICE) {
            ice.iceHp--;
            if (ice.iceHp <= 0) {
              toDelete.add(`${r+dr},${c+dc}`);
              icesBroken++;
            }
          }
        }

        toDelete.add(`${r},${c}`);
        pivot = { r, c };
      }

      // Trigger special tiles in group
      for (const { r, c } of group.cells) {
        const t = this.cells[r][c];
        if (!t) continue;
        if (t.type === TYPE.STRIPE_H || t.type === TYPE.STRIPE_V ||
            t.type === TYPE.BOMB     || t.type === TYPE.RAINBOW) {
          this._triggerSpecial(t.type, r, c, toDelete);
        }
      }

      // Schedule creation of new special at pivot
      if (special && pivot) {
        newSpecials.push({ r: pivot.r, c: pivot.c, type: special });
      }

      const base = group.cells.length * 100;
      scoreAdd += base * chainLevel;
    }

    // Delete marked cells
    for (const key of toDelete) {
      const [r, c] = key.split(',').map(Number);
      const t = this.cells[r][c];
      if (!t) continue;
      if (t.type === TYPE.STONE) continue; // stone never deleted by normal match
      this.cells[r][c] = null;
    }

    // Place new specials
    for (const { r, c, type } of newSpecials) {
      if (!this.cells[r][c]) {
        const orig = this.findNearestNormal(r, c, matches);
        const color = orig ? orig.color : 0;
        const nt = new Tile(color, type);
        this.cells[r][c] = nt;
      }
    }

    return { scoreAdd, icesBroken, deleted: toDelete };
  }

  _triggerSpecial(type, r, c, toDelete) {
    if (type === TYPE.STRIPE_H) {
      for (let col = 0; col < this.cols; col++) toDelete.add(`${r},${col}`);
    } else if (type === TYPE.STRIPE_V) {
      for (let row = 0; row < this.rows; row++) toDelete.add(`${row},${c}`);
    } else if (type === TYPE.BOMB) {
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          if (this.get(r+dr, c+dc)) toDelete.add(`${r+dr},${c+dc}`);
    } else if (type === TYPE.RAINBOW) {
      // Find most common color on board and delete all of it
      const freq = new Array(6).fill(0);
      for (let row = 0; row < this.rows; row++)
        for (let col = 0; col < this.cols; col++) {
          const t = this.cells[row][col];
          if (t && t.type === TYPE.NORMAL) freq[t.color]++;
        }
      const target = freq.indexOf(Math.max(...freq));
      for (let row = 0; row < this.rows; row++)
        for (let col = 0; col < this.cols; col++) {
          const t = this.cells[row][col];
          if (t && t.color === target) toDelete.add(`${row},${col}`);
        }
    }
  }

  findNearestNormal(r, c, matches) {
    for (const g of matches)
      for (const cell of g.cells) {
        const t = this.cells[cell.r][cell.c];
        if (t && t.type === TYPE.NORMAL) return t;
      }
    return null;
  }

  /**
   * Drop tiles based on gravityDir. Returns list of {fromR,fromC,toR,toC} movements.
   */
  applyGravity() {
    const moves = [];
    if (this.gravityDir === 'down') {
      for (let c = 0; c < this.cols; c++) {
        let empty = this.rows - 1;
        for (let r = this.rows - 1; r >= 0; r--) {
          const t = this.cells[r][c];
          if (t && t.isMovable()) {
            if (empty !== r) {
              moves.push({ fromR: r, fromC: c, toR: empty, toC: c });
              this.cells[empty][c] = t;
              this.cells[r][c] = null;
            }
            empty--;
          } else if (t && !t.isMovable()) {
            empty = r - 1;
          }
        }
      }
    } else if (this.gravityDir === 'up') {
      for (let c = 0; c < this.cols; c++) {
        let empty = 0;
        for (let r = 0; r < this.rows; r++) {
          const t = this.cells[r][c];
          if (t && t.isMovable()) {
            if (empty !== r) {
              moves.push({ fromR: r, fromC: c, toR: empty, toC: c });
              this.cells[empty][c] = t;
              this.cells[r][c] = null;
            }
            empty++;
          } else if (t && !t.isMovable()) {
            empty = r + 1;
          }
        }
      }
    }
    return moves;
  }

  /**
   * Fill null cells from the spawn edge. Returns list of {r,c} new cells.
   */
  fillEmpty(colorCount) {
    const added = [];
    if (this.gravityDir === 'down' || this.gravityDir === 'up') {
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows; r++) {
          if (!this.cells[r][c]) {
            this.cells[r][c] = this._randomNormal(r, c, colorCount);
            added.push({ r, c });
          }
        }
      }
    }
    return added;
  }

  rotateGravity() {
    const dirs = ['down', 'left', 'up', 'right'];
    const i = dirs.indexOf(this.gravityDir);
    this.gravityDir = dirs[(i + 1) % 4];
  }

  hasAnyMoves() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[r][c];
        if (!t || !t.isMovable()) continue;
        for (const [dr, dc] of [[0,1],[1,0]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= this.rows || nc >= this.cols) continue;
          const n = this.cells[nr][nc];
          if (!n || !n.isMovable()) continue;
          this.swap(r, c, nr, nc);
          const m = this.findMatches();
          this.swap(r, c, nr, nc);
          if (m.length > 0) return true;
        }
      }
    }
    return false;
  }
}
