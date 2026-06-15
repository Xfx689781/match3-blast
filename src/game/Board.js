import { TILE_COLORS } from './TileTypes.js';

export const TYPE = {
  NORMAL:   'normal',
  BOMB:     'bomb',    // 4-match → clears 3×3
  MEGA:     'mega',    // 5-match → clears entire board
  STRIPE_H: 'stripe_h',
  STRIPE_V: 'stripe_v',
  RAINBOW:  'rainbow', // pre-placed special: clears most-common color
  STONE:    'stone',
  ICE:      'ice',
  LAVA:     'lava',
};

export class Tile {
  constructor(color, type = TYPE.NORMAL) {
    this.color  = color;  // 0-5, always set — even for specials
    this.type   = type;
    this.iceHp  = type === TYPE.ICE  ? 2 : 0;
    this.lavaHp = type === TYPE.LAVA ? 1 : 0;
  }

  isObstacle() {
    return this.type === TYPE.STONE || this.type === TYPE.ICE || this.type === TYPE.LAVA;
  }

  isMovable() { return this.type !== TYPE.STONE; }

  isSpecialPower() {
    return this.type === TYPE.BOMB || this.type === TYPE.MEGA ||
           this.type === TYPE.STRIPE_H || this.type === TYPE.STRIPE_V ||
           this.type === TYPE.RAINBOW;
  }
}

export class Board {
  constructor(cols, rows, levelDef) {
    this.cols  = cols;
    this.rows  = rows;
    this.level = levelDef;
    this.cells = [];
    this.gravityDir = 'down';
    this._init();
  }

  _init() {
    const { obstacles = [], colors = 6 } = this.level;

    const place = (set, count, exclude = []) => {
      let tries = 0;
      while (set.size < count && tries < 1000) {
        tries++;
        const r = 1 + Math.floor(Math.random() * (this.rows - 2));
        const c = Math.floor(Math.random() * this.cols);
        const key = `${r},${c}`;
        if (!exclude.some(s => s.has(key))) set.add(key);
      }
    };

    const stoneCells = new Set();
    const iceCells   = new Set();
    const lavaCells  = new Set();
    const stoneConf  = obstacles.find(o => o.type === 'stone');
    const iceConf    = obstacles.find(o => o.type === 'ice');
    const lavaConf   = obstacles.find(o => o.type === 'lava');
    if (stoneConf) place(stoneCells, stoneConf.count);
    if (iceConf)   place(iceCells,   iceConf.count,  [stoneCells]);
    if (lavaConf)  place(lavaCells,  lavaConf.count, [stoneCells, iceCells]);

    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const key = `${r},${c}`;
        if (stoneCells.has(key)) this.cells[r][c] = new Tile(0, TYPE.STONE);
        else if (iceCells.has(key)) this.cells[r][c] = new Tile(0, TYPE.ICE);
        else if (lavaCells.has(key)) this.cells[r][c] = new Tile(0, TYPE.LAVA);
        else this.cells[r][c] = this._randomNormal(r, c, colors);
      }
    }
    this._ensureNoStartMatches(colors);
  }

  _randomNormal(r, c, colorCount) {
    const specials = this.level.specials || [];
    const color = Math.floor(Math.random() * colorCount);
    const t = new Tile(color, TYPE.NORMAL);
    for (const s of specials) {
      if (Math.random() < (s.chance || 0)) {
        t.type = s.type === 'stripe'
          ? (Math.random() < 0.5 ? TYPE.STRIPE_H : TYPE.STRIPE_V)
          : s.type;
        return t;
      }
    }
    return t;
  }

  _ensureNoStartMatches(colorCount) {
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.cells[r][c];
          if (!t || t.isObstacle()) continue;
          const left2 = c >= 2 && this._sameColor(r,c-1,t) && this._sameColor(r,c-2,t);
          const up2   = r >= 2 && this._sameColor(r-1,c,t) && this._sameColor(r-2,c,t);
          if (left2 || up2) { t.color = Math.floor(Math.random() * colorCount); changed = true; }
        }
      }
      if (!changed) break;
    }
  }

  _sameColor(r, c, ref) {
    const t = this.get(r, c);
    return t && !t.isObstacle() && t.color === ref.color;
  }

  get(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return this.cells[r][c];
  }

  set(r, c, tile) { this.cells[r][c] = tile; }

  swap(r1, c1, r2, c2) {
    const tmp = this.cells[r1][c1];
    this.cells[r1][c1] = this.cells[r2][c2];
    this.cells[r2][c2] = tmp;
  }

  isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  // Special tiles (bomb/stripe/rainbow) match with same-color normal tiles
  _matchable(a, b) {
    if (a.isObstacle() || b.isObstacle()) return false;
    return a.color === b.color;
  }

  findMatches() {
    const groups = [];

    // Horizontal
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const t = this.cells[r][c];
        if (!t || t.isObstacle()) { c++; continue; }
        let len = 1;
        while (c + len < this.cols) {
          const n = this.cells[r][c + len];
          if (n && this._matchable(t, n)) len++;
          else break;
        }
        if (len >= 3) groups.push({ cells: Array.from({length:len},(_,i)=>({r, c:c+i})), dir:'h', len });
        c += len;
      }
    }

    // Vertical
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const t = this.cells[r][c];
        if (!t || t.isObstacle()) { r++; continue; }
        let len = 1;
        while (r + len < this.rows) {
          const n = this.cells[r + len][c];
          if (n && this._matchable(t, n)) len++;
          else break;
        }
        if (len >= 3) groups.push({ cells: Array.from({length:len},(_,i)=>({r:r+i, c})), dir:'v', len });
        r += len;
      }
    }

    return this._mergeGroups(groups);
  }

  _mergeGroups(groups) {
    const cellMap = new Map();
    const merged  = [];

    for (const g of groups) {
      const touched = new Set();
      for (const {r, c} of g.cells) {
        const k = `${r},${c}`;
        if (cellMap.has(k)) touched.add(cellMap.get(k));
      }

      if (touched.size === 0) {
        const idx = merged.length;
        merged.push({ cells: [...g.cells], dir: g.dir, len: g.len });
        for (const {r,c} of g.cells) cellMap.set(`${r},${c}`, idx);
      } else {
        const [first, ...rest] = [...touched];
        for (const {r,c} of g.cells) {
          const k = `${r},${c}`;
          if (!cellMap.has(k)) { merged[first].cells.push({r,c}); cellMap.set(k, first); }
        }
        for (const other of rest) {
          for (const cell of merged[other].cells) {
            const k = `${cell.r},${cell.c}`;
            if (cellMap.get(k) === other) { merged[first].cells.push(cell); cellMap.set(k, first); }
          }
          merged[other] = null;
        }
        if (g.len > (merged[first].len || 0)) { merged[first].len = g.len; merged[first].dir = g.dir; }
      }
    }

    return merged.filter(Boolean);
  }

  // 4-in-a-row → BOMB, 5+-in-a-row → MEGA
  specialForGroup(group) {
    const len = group.cells.length;
    if (len >= 5) return TYPE.MEGA;
    if (len === 4) return TYPE.BOMB;
    return null;
  }

  applyMatches(matches, chainLevel = 1) {
    const toDelete     = new Set();
    const newSpecials  = [];
    const colorsCleared = new Array(6).fill(0);
    let scoreAdd  = 0;
    let icesBroken = 0;

    for (const group of matches) {
      const special = this.specialForGroup(group);
      let pivot = group.cells[Math.floor(group.cells.length / 2)];

      for (const {r, c} of group.cells) {
        const t = this.cells[r][c];
        if (!t) continue;

        // Break adjacent ice
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ice = this.get(r+dr, c+dc);
          if (ice && ice.type === TYPE.ICE) {
            ice.iceHp--;
            if (ice.iceHp <= 0) { toDelete.add(`${r+dr},${c+dc}`); icesBroken++; }
          }
        }

        toDelete.add(`${r},${c}`);
        if (!t.isObstacle()) colorsCleared[t.color] = (colorsCleared[t.color] || 0) + 1;
      }

      // Fire existing specials in group
      for (const {r, c} of group.cells) {
        const t = this.cells[r][c];
        if (t?.isSpecialPower()) this._triggerSpecial(t.type, r, c, toDelete);
      }

      if (special && pivot) newSpecials.push({ r: pivot.r, c: pivot.c, type: special, color: this.cells[pivot.r][pivot.c]?.color ?? 0 });

      scoreAdd += group.cells.length * 100 * chainLevel;
    }

    // Delete marked cells
    for (const key of toDelete) {
      const [r, c] = key.split(',').map(Number);
      const t = this.cells[r][c];
      if (!t || t.type === TYPE.STONE) continue;
      if (!t.isObstacle()) colorsCleared[t.color] = (colorsCleared[t.color] || 0) + 1;
      this.cells[r][c] = null;
    }

    // Place new specials at pivot (cell is now null)
    for (const {r, c, type, color} of newSpecials) {
      if (!this.cells[r][c]) {
        this.cells[r][c] = new Tile(color, type);
      }
    }

    return { scoreAdd, icesBroken, deleted: toDelete, colorsCleared };
  }

  _triggerSpecial(type, r, c, toDelete) {
    const mark = (row, col) => {
      const t = this.get(row, col);
      if (t && t.type !== TYPE.STONE) toDelete.add(`${row},${col}`);
    };

    if (type === TYPE.STRIPE_H) {
      for (let col = 0; col < this.cols; col++) mark(r, col);
    } else if (type === TYPE.STRIPE_V) {
      for (let row = 0; row < this.rows; row++) mark(row, c);
    } else if (type === TYPE.BOMB) {
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) mark(r+dr, c+dc);
    } else if (type === TYPE.MEGA) {
      // Clear entire board
      for (let row = 0; row < this.rows; row++)
        for (let col = 0; col < this.cols; col++) mark(row, col);
    } else if (type === TYPE.RAINBOW) {
      // Clear most-common color
      const freq = new Array(6).fill(0);
      for (let row = 0; row < this.rows; row++)
        for (let col = 0; col < this.cols; col++) {
          const t = this.cells[row][col];
          if (t && !t.isObstacle()) freq[t.color]++;
        }
      const target = freq.indexOf(Math.max(...freq));
      for (let row = 0; row < this.rows; row++)
        for (let col = 0; col < this.cols; col++) {
          const t = this.cells[row][col];
          if (t && t.color === target && !t.isObstacle()) toDelete.add(`${row},${col}`);
        }
    }
  }

  applyGravity() {
    const moves = [];
    const goingUp = this.gravityDir === 'up';

    for (let c = 0; c < this.cols; c++) {
      if (!goingUp) {
        // Downward gravity: scan bottom→top, fill lowest empty slot
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
      } else {
        // Upward gravity: scan top→bottom, fill highest empty slot
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

  fillEmpty(colorCount) {
    const added = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (!this.cells[r][c]) {
          this.cells[r][c] = this._randomNormal(r, c, colorCount);
          added.push({ r, c });
        }
    return added;
  }

  rotateGravity() {
    const dirs = ['down', 'left', 'up', 'right'];
    this.gravityDir = dirs[(dirs.indexOf(this.gravityDir) + 1) % 4];
  }

  hasAnyMoves() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[r][c];
        if (!t || !t.isMovable()) continue;
        for (const [dr, dc] of [[0,1],[1,0]]) {
          const nr = r+dr, nc = c+dc;
          if (nr >= this.rows || nc >= this.cols) continue;
          const n = this.cells[nr][nc];
          if (!n || !n.isMovable()) continue;
          this.swap(r,c,nr,nc);
          const m = this.findMatches();
          this.swap(r,c,nr,nc);
          if (m.length > 0) return true;
        }
      }
    }
    return false;
  }
}
