import Phaser from 'phaser';
import { getLevel, WORLDS } from '../data/levels.js';
import { Board, TYPE } from '../game/Board.js';
import { TILE_COLORS, SPECIAL_COLORS, OBSTACLE_COLORS, SHAPE_ICONS } from '../game/TileTypes.js';

const W = 480, H = 854;
const WORLD_COLORS = [0x2ecc71, 0x3498db, 0xe74c3c, 0x80deea, 0xce93d8];

export default class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data?.levelId || 1;
  }

  create() {
    this.levelDef   = getLevel(this.levelId);
    this.board      = new Board(this.levelDef.cols, this.levelDef.rows, this.levelDef);
    this.score      = 0;
    this.chain      = 0;
    this.timeLeft   = this.levelDef.timeLimit;
    this.busy       = false;
    this.selected   = null;
    this.tileObjs   = [];  // [r][c] = { bg, label, container }
    this.icesBroken = 0;
    this.gravDir    = 'down';
    this.mechTimers = {};

    this._computeLayout();
    this._drawBg();
    this._drawBoard();
    this._drawUI();
    this._startTimer();
    this._startMechanics();
  }

  _computeLayout() {
    const { cols, rows } = this.levelDef;
    const maxBoardW = W - 24;
    const maxBoardH = H - 200;
    const tileW = Math.floor(maxBoardW / cols);
    const tileH = Math.floor(maxBoardH / rows);
    this.TILE = Math.min(tileW, tileH, 62);
    this.GAP  = 3;
    this.STEP = this.TILE + this.GAP;
    this.boardW = cols * this.STEP - this.GAP;
    this.boardH = rows * this.STEP - this.GAP;
    this.boardX = (W - this.boardW) / 2;
    this.boardY = 155 + (H - 155 - 60 - this.boardH) / 2;
  }

  _tilePos(r, c) {
    return {
      x: this.boardX + c * this.STEP + this.TILE / 2,
      y: this.boardY + r * this.STEP + this.TILE / 2,
    };
  }

  _drawBg() {
    const wi = (this.levelDef.world - 1);
    const hasDark = this.levelDef.mechanics?.includes('dark_bg');

    const g = this.add.graphics();
    if (hasDark) {
      g.fillGradientStyle(0x020212, 0x020212, 0x080820, 0x080820, 1);
    } else {
      const dark = [0x0a2010, 0x061030, 0x300505, 0x061828, 0x080820][wi];
      const mid  = [0x1b4020, 0x0d2a60, 0x4a1010, 0x0d2850, 0x101040][wi];
      g.fillGradientStyle(dark, dark, mid, mid, 1);
    }
    g.fillRect(0, 0, W, H);

    // Board bg
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(this.boardX - 8, this.boardY - 8, this.boardW + 16, this.boardH + 16, 14);
    bg.lineStyle(2, WORLD_COLORS[wi], 0.4);
    bg.strokeRoundedRect(this.boardX - 8, this.boardY - 8, this.boardW + 16, this.boardH + 16, 14);
  }

  _drawUI() {
    const wi = this.levelDef.world - 1;
    const wc = WORLD_COLORS[wi];

    // Back button
    const back = this.add.text(20, 24, '←', {
      fontFamily: 'Arial', fontSize: '26px', color: '#aaaacc',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('LevelSelect', { world: this.levelDef.world }));

    // Level title
    this.add.text(W / 2, 24, `第 ${this.levelId} 关  ${this.levelDef.name}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '18px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Score
    this.add.text(this.boardX, 62, '得分', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#aaaacc',
    });
    this.scoreTxt = this.add.text(this.boardX, 80, '0', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '24px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    });

    // Target score
    const tgt = this.levelDef.targetScore;
    this.add.text(W / 2, 62, `目标 ${tgt.toLocaleString()}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px',
      color: '#' + wc.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // Progress bar
    const barX = this.boardX, barY = 110, barW = this.boardW;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x222244, 1);
    barBg.fillRoundedRect(barX, barY, barW, 10, 5);
    this.progressBar = this.add.graphics();
    this.progressBarMeta = { x: barX, y: barY, w: barW, color: wc };
    this._updateProgressBar();

    // Timer
    this.timeTxt = this.add.text(W - this.boardX, 62, this._fmtTime(this.timeLeft), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '24px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);
    this.add.text(W - this.boardX, 46, '时间', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#aaaacc',
    }).setOrigin(1, 0);

    // Objectives display
    const objY = H - 52;
    this._drawObjectives(objY);

    // Mechanics badges
    this._drawMechanicsBadges();
  }

  _drawObjectives(y) {
    const objs = this.levelDef.objectives || [];
    const seg = W / objs.length;
    objs.forEach((obj, i) => {
      const cx = seg * i + seg / 2;
      let label = '';
      if (obj.type === 'score')     label = `🏆 ${(this.score / obj.target * 100).toFixed(0)}%`;
      if (obj.type === 'break_ice') label = `❄ ${this.icesBroken}/${obj.target}`;
      this.add.text(cx, y, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ddddff',
      }).setOrigin(0.5);
    });
  }

  _drawMechanicsBadges() {
    const mechs = this.levelDef.mechanics || [];
    const labels = {
      drift: '🌊洋流', fog: '🌫迷雾', lava_reform: '🔥熔岩',
      chain_bonus: '⚡连击', burn: '💨灼烧',
      ice_shift: '🧊移冰', blizzard: '❄暴风雪',
      dark_bg: '🌑暗域', portals: '🌀传送', gravity_flip: '🔄重力', black_hole: '⚫黑洞',
    };
    let x = 10;
    const y = H - 28;
    mechs.forEach(m => {
      if (!labels[m]) return;
      const txt = this.add.text(x, y, labels[m], {
        fontFamily: 'Arial, sans-serif', fontSize: '12px',
        color: '#bbbbff',
        backgroundColor: '#22224488',
        padding: { x: 6, y: 3 },
      });
      x += txt.width + 10;
    });
  }

  _updateProgressBar() {
    const { x, y, w, color } = this.progressBarMeta;
    const pct = Math.min(this.score / this.levelDef.targetScore, 1);
    this.progressBar.clear();
    this.progressBar.fillStyle(color, 0.8);
    this.progressBar.fillRoundedRect(x, y, w * pct, 10, 5);
  }

  _fmtTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${String(ss).padStart(2, '0')}`;
  }

  _startTimer() {
    this.timerEvt = this.time.addEvent({
      delay: 1000, repeat: this.levelDef.timeLimit - 1,
      callback: () => {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.timeTxt.setText(this._fmtTime(this.timeLeft));
        if (this.timeLeft <= 10) this.timeTxt.setColor('#ff4444');
        if (this.timeLeft <= 0 && !this.busy) this._endGame(false);
      },
    });
  }

  // ── Board rendering ────────────────────────────────────────────────────

  _drawBoard() {
    const { cols, rows } = this.levelDef;
    this.tileObjs = Array.from({ length: rows }, () => new Array(cols).fill(null));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        this._spawnTileObj(r, c);
  }

  _spawnTileObj(r, c, animate = false) {
    const tile = this.board.get(r, c);
    if (!tile) { this.tileObjs[r][c] = null; return; }
    const { x, y } = this._tilePos(r, c);
    const size = this.TILE;

    // Draw tile on a RenderTexture for caching
    const g = this.add.graphics();
    this._renderTile(g, tile, size);
    g.setPosition(x - size / 2, y - size / 2);

    // Label for special/obstacle
    let label = null;
    const icon = this._iconFor(tile);
    if (icon) {
      label = this.add.text(x, y, icon, {
        fontSize: `${size * 0.4}px`,
      }).setOrigin(0.5).setDepth(2);
    }

    const obj = { g, label, r, c };
    this.tileObjs[r][c] = obj;

    // Make interactive (normal + special movable tiles)
    if (tile.type !== TYPE.STONE) {
      g.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, size, size),
        Phaser.Geom.Rectangle.Contains
      );
      g.on('pointerdown', () => this._onTileClick(r, c));
    }

    if (animate) {
      g.setAlpha(0);
      g.y -= 30;
      this.tweens.add({ targets: g, alpha: 1, y: g.y + 30, duration: 200, ease: 'Back.out' });
      if (label) {
        label.setAlpha(0);
        this.tweens.add({ targets: label, alpha: 1, duration: 200, delay: 60 });
      }
    }
  }

  _renderTile(g, tile, size) {
    const cs = tile.colorSet();
    const s  = size * 0.44;
    const cx = size / 2, cy = size / 2;
    const shape = this.levelDef.tileShape || 'rounded';

    // Shadow
    g.fillStyle(0x000000, 0.3);
    this._fillShape(g, cx + 2, cy + 3, s, shape);

    // Dark base
    g.fillStyle(cs.dark, 1);
    this._fillShape(g, cx, cy, s, shape);

    // Main face
    g.fillStyle(cs.base, 1);
    this._fillShape(g, cx - 1, cy - 1, s * 0.9, shape);

    // Shine
    g.fillStyle(cs.light, 0.4);
    g.fillEllipse(cx - s * 0.25, cy - s * 0.3, s * 0.55, s * 0.35);

    // Ice crack overlay
    if (tile.type === TYPE.ICE && tile.iceHp === 1) {
      g.lineStyle(1, 0xffffff, 0.5);
      g.beginPath();
      g.moveTo(cx - s * 0.3, cy - s * 0.3);
      g.lineTo(cx + s * 0.2, cy + s * 0.4);
      g.strokePath();
    }
  }

  _fillShape(g, cx, cy, r, shape) {
    g.beginPath();
    switch (shape) {
      case 'circle':
        g.arc(cx, cy, r, 0, Math.PI * 2, false, 32);
        g.fillPath();
        break;
      case 'diamond':
        g.fillTriangle(cx, cy-r, cx+r*0.8, cy, cx, cy+r);
        g.fillTriangle(cx, cy-r, cx-r*0.8, cy, cx, cy+r);
        break;
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          pts.push(new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.45;
          pts.push(new Phaser.Geom.Point(cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
        }
        g.fillPoints(pts, true);
        break;
      }
      default:
        g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.22);
    }
  }

  _iconFor(tile) {
    if (tile.type === TYPE.STRIPE_H) return '━';
    if (tile.type === TYPE.STRIPE_V) return '┃';
    if (tile.type === TYPE.BOMB)     return '✸';
    if (tile.type === TYPE.RAINBOW)  return '★';
    if (tile.type === TYPE.STONE)    return '●';
    if (tile.type === TYPE.ICE)      return tile.iceHp === 2 ? '❄' : '·';
    if (tile.type === TYPE.LAVA)     return '🔥';
    return null;
  }

  _destroyTileObj(r, c) {
    const obj = this.tileObjs[r]?.[c];
    if (!obj) return;
    obj.g?.destroy();
    obj.label?.destroy();
    this.tileObjs[r][c] = null;
  }

  _rebuildTileObj(r, c) {
    this._destroyTileObj(r, c);
    this._spawnTileObj(r, c, false);
  }

  // ── Input ──────────────────────────────────────────────────────────────

  _onTileClick(r, c) {
    if (this.busy || this.timeLeft <= 0) return;

    if (!this.selected) {
      this.selected = { r, c };
      this._highlightSelected(r, c, true);
      return;
    }

    const { r: sr, c: sc } = this.selected;
    this._highlightSelected(sr, sc, false);

    if (sr === r && sc === c) {
      this.selected = null;
      return;
    }

    if (this.board.isAdjacent(sr, sc, r, c)) {
      this.selected = null;
      this._doSwap(sr, sc, r, c);
    } else {
      this.selected = { r, c };
      this._highlightSelected(r, c, true);
    }
  }

  _highlightSelected(r, c, on) {
    const obj = this.tileObjs[r]?.[c];
    if (!obj?.g) return;
    if (on) {
      this.tweens.add({ targets: obj.g, scaleX: 1.12, scaleY: 1.12, duration: 120 });
      // White border overlay
      if (!obj.selectRing) {
        const { x, y } = this._tilePos(r, c);
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffffff, 0.9);
        this._strokeShape(ring, this.TILE / 2, this.TILE / 2, this.TILE * 0.44, this.levelDef.tileShape || 'rounded');
        ring.setPosition(x - this.TILE / 2, y - this.TILE / 2);
        ring.setDepth(3);
        obj.selectRing = ring;
        this.tweens.add({ targets: ring, alpha: 0.5, yoyo: true, repeat: -1, duration: 400 });
      }
    } else {
      this.tweens.add({ targets: obj.g, scaleX: 1, scaleY: 1, duration: 120 });
      obj.selectRing?.destroy();
      delete obj.selectRing;
    }
  }

  _strokeShape(g, cx, cy, r, shape) {
    switch (shape) {
      case 'circle':
        g.strokeCircle(cx, cy, r); break;
      case 'diamond':
        g.strokeTriangle(cx, cy-r, cx+r*0.8, cy, cx, cy+r);
        g.strokeTriangle(cx, cy-r, cx-r*0.8, cy, cx, cy+r); break;
      default:
        g.strokeRoundedRect(cx-r, cy-r, r*2, r*2, r*0.22);
    }
  }

  // ── Swap & cascade ─────────────────────────────────────────────────────

  async _doSwap(r1, c1, r2, c2) {
    this.busy = true;

    // Animate swap
    await this._animSwap(r1, c1, r2, c2);
    this.board.swap(r1, c1, r2, c2);

    const matches = this.board.findMatches();
    if (matches.length === 0) {
      // Revert
      await this._animSwap(r1, c1, r2, c2);
      this.board.swap(r1, c1, r2, c2);
      this._flashRed(r1, c1, r2, c2);
      this.busy = false;
      return;
    }

    this.chain = 0;
    await this._cascade();
    this._checkWin();
    this.busy = false;
  }

  async _cascade() {
    let matches = this.board.findMatches();
    while (matches.length > 0) {
      this.chain++;
      const chainBonus = this.levelDef.mechanics?.includes('chain_bonus') ? this.chain : 1;

      // Flash matched tiles
      this._flashMatched(matches);
      await this._wait(280);

      const result = this.board.applyMatches(matches, chainBonus);
      this.score += result.scoreAdd;
      this.icesBroken += result.icesBroken;
      this.scoreTxt.setText(this.score.toLocaleString());
      this._updateProgressBar();

      // Show score pop
      this._scorePopup(result.scoreAdd, chainBonus);

      // Delete visual tiles
      for (const key of result.deleted) {
        const [r, c] = key.split(',').map(Number);
        this._destroyTileObj(r, c);
      }
      // Rebuild any new specials
      for (let r = 0; r < this.levelDef.rows; r++)
        for (let c = 0; c < this.levelDef.cols; c++) {
          const t = this.board.get(r, c);
          if (t && !this.tileObjs[r][c]) this._spawnTileObj(r, c, false);
        }

      await this._wait(80);

      // Gravity
      const drops = this.board.applyGravity();
      await this._animDrop(drops);

      // Fill
      const newCells = this.board.fillEmpty(this.levelDef.colors || 6);
      for (const { r, c } of newCells) this._spawnTileObj(r, c, true);
      await this._wait(220);

      if (this.levelDef.mechanics?.includes('gravity_flip') && this.chain % 3 === 0) {
        this.board.rotateGravity();
        this._showMechanicMsg(`重力偏转 →`);
      }

      matches = this.board.findMatches();
    }

    if (!this.board.hasAnyMoves()) {
      this._showMechanicMsg('洗牌中…');
      await this._wait(600);
      this.board._init();
      this._rebuildAllTiles();
    }
  }

  _rebuildAllTiles() {
    for (let r = 0; r < this.levelDef.rows; r++)
      for (let c = 0; c < this.levelDef.cols; c++) {
        this._destroyTileObj(r, c);
        this._spawnTileObj(r, c, true);
      }
  }

  // ── Animations ─────────────────────────────────────────────────────────

  _animSwap(r1, c1, r2, c2) {
    return new Promise(resolve => {
      const p1 = this._tilePos(r1, c1), p2 = this._tilePos(r2, c2);
      const o1 = this.tileObjs[r1]?.[c1], o2 = this.tileObjs[r2]?.[c2];
      let done = 0;
      const finish = () => { if (++done === 2) { this._swapTileObjs(r1,c1,r2,c2); resolve(); } };

      if (o1?.g) {
        this.tweens.add({ targets: o1.g, x: p2.x - this.TILE/2, y: p2.y - this.TILE/2, duration: 160, ease: 'Sine.easeInOut', onComplete: finish });
        if (o1.label) this.tweens.add({ targets: o1.label, x: p2.x, y: p2.y, duration: 160, ease: 'Sine.easeInOut' });
        if (o1.selectRing) this.tweens.add({ targets: o1.selectRing, x: p2.x - this.TILE/2, y: p2.y - this.TILE/2, duration: 160 });
      } else finish();

      if (o2?.g) {
        this.tweens.add({ targets: o2.g, x: p1.x - this.TILE/2, y: p1.y - this.TILE/2, duration: 160, ease: 'Sine.easeInOut', onComplete: finish });
        if (o2.label) this.tweens.add({ targets: o2.label, x: p1.x, y: p1.y, duration: 160, ease: 'Sine.easeInOut' });
      } else finish();
    });
  }

  _swapTileObjs(r1, c1, r2, c2) {
    const tmp = this.tileObjs[r1][c1];
    this.tileObjs[r1][c1] = this.tileObjs[r2][c2];
    this.tileObjs[r2][c2] = tmp;
    if (this.tileObjs[r1][c1]) { this.tileObjs[r1][c1].r = r1; this.tileObjs[r1][c1].c = c1; }
    if (this.tileObjs[r2][c2]) { this.tileObjs[r2][c2].r = r2; this.tileObjs[r2][c2].c = c2; }
  }

  _flashMatched(matches) {
    for (const group of matches) {
      for (const { r, c } of group.cells) {
        const obj = this.tileObjs[r]?.[c];
        if (!obj?.g) continue;
        this.tweens.add({
          targets: obj.g,
          scaleX: 1.25, scaleY: 1.25, alpha: 0,
          duration: 260, ease: 'Power2',
        });
        if (obj.label) this.tweens.add({ targets: obj.label, alpha: 0, duration: 260 });
        // Particle burst
        this._emitParticles(obj.g.x + this.TILE / 2, obj.g.y + this.TILE / 2, this.board.get(r, c)?.colorSet().base || 0xffffff);
      }
    }
  }

  _emitParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, 4);
      dot.x = x; dot.y = y;
      const angle = (Math.PI * 2 / 6) * i;
      const dist  = Phaser.Math.Between(20, 50);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.3, scaleY: 0.3,
        duration: 350,
        onComplete: () => dot.destroy(),
      });
    }
  }

  _animDrop(drops) {
    return new Promise(resolve => {
      if (drops.length === 0) { resolve(); return; }
      let pending = drops.length;
      for (const { fromR, fromC, toR, toC } of drops) {
        const obj = this.tileObjs[fromR]?.[fromC];
        const { x: tx, y: ty } = this._tilePos(toR, toC);
        if (obj?.g) {
          this.tweens.add({
            targets: obj.g,
            x: tx - this.TILE / 2, y: ty - this.TILE / 2,
            duration: 160, ease: 'Bounce.out',
            onComplete: () => {
              this.tileObjs[toR][toC] = obj;
              this.tileObjs[fromR][fromC] = null;
              obj.r = toR; obj.c = toC;
              if (obj.label) { obj.label.x = tx; obj.label.y = ty; }
              if (--pending === 0) resolve();
            },
          });
        } else {
          if (--pending === 0) resolve();
        }
      }
    });
  }

  _flashRed(r1, c1, r2, c2) {
    for (const [r, c] of [[r1,c1],[r2,c2]]) {
      const obj = this.tileObjs[r]?.[c];
      if (!obj?.g) continue;
      this.tweens.add({ targets: obj.g, alpha: 0.3, yoyo: true, repeat: 2, duration: 80 });
    }
  }

  _scorePopup(amount, chain) {
    const centerX = W / 2;
    const centerY = this.boardY + this.boardH / 2;
    let txt = `+${amount.toLocaleString()}`;
    if (chain > 1) txt = `${chain}连击! ${txt}`;
    const pop = this.add.text(centerX, centerY, txt, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: chain > 2 ? '28px' : '20px',
      color: chain > 2 ? '#ffd700' : '#ffffff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: pop,
      y: centerY - 70, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => pop.destroy(),
    });
  }

  _showMechanicMsg(msg) {
    const txt = this.add.text(W / 2, this.boardY - 30, msg, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px',
      color: '#ffffaa', backgroundColor: '#00000099',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 20, duration: 1200, onComplete: () => txt.destroy() });
  }

  _wait(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  // ── Win/Lose ───────────────────────────────────────────────────────────

  _checkWin() {
    const objs = this.levelDef.objectives || [];
    const allMet = objs.every(obj => {
      if (obj.type === 'score')     return this.score >= obj.target;
      if (obj.type === 'break_ice') return this.icesBroken >= obj.target;
      return true;
    });
    if (allMet) {
      this.timerEvt.remove();
      this.busy = true;
      this.time.delayedCall(400, () => this._endGame(true));
    }
  }

  _endGame(won) {
    this.timerEvt?.remove();
    const stars = won ? this._calcStars() : 0;

    if (won) {
      const save = JSON.parse(localStorage.getItem('blastSave') || '{}');
      save.unlocked = Math.max(save.unlocked || 1, this.levelId + 1);
      if (!save.stars) save.stars = {};
      save.stars[this.levelId] = Math.max(save.stars[this.levelId] || 0, stars);
      if (!save.scores) save.scores = {};
      save.scores[this.levelId] = Math.max(save.scores[this.levelId] || 0, this.score);
      localStorage.setItem('blastSave', JSON.stringify(save));
    }

    this.scene.start('LevelComplete', {
      levelId: this.levelId,
      score: this.score,
      stars,
      won,
      world: this.levelDef.world,
    });
  }

  _calcStars() {
    const pct = this.score / this.levelDef.targetScore;
    if (pct >= 2.0) return 3;
    if (pct >= 1.3) return 2;
    return 1;
  }

  // ── Mechanics ──────────────────────────────────────────────────────────

  _startMechanics() {
    const mechs = this.levelDef.mechanics || [];

    if (mechs.includes('drift')) {
      this.mechTimers.drift = this.time.addEvent({
        delay: 15000, loop: true,
        callback: () => {
          if (this.busy) return;
          const c = Phaser.Math.Between(0, this.levelDef.cols - 1);
          this._showMechanicMsg(`洋流推移 第${c+1}列`);
          this.time.delayedCall(600, () => {
            if (!this.busy) {
              this.busy = true;
              this._shiftColumnDown(c).then(() => { this.busy = false; });
            }
          });
        },
      });
    }

    if (mechs.includes('blizzard')) {
      this.mechTimers.blizzard = this.time.addEvent({
        delay: 18000, loop: true,
        callback: () => {
          if (this.busy) return;
          const r = Phaser.Math.Between(1, this.levelDef.rows - 2);
          const c = Phaser.Math.Between(0, this.levelDef.cols - 1);
          const t = this.board.get(r, c);
          if (t && t.type === TYPE.NORMAL) {
            this._showMechanicMsg('❄ 新冰块降临!');
            // freeze it
            this.board.cells[r][c].type = TYPE.ICE;
            this.board.cells[r][c].iceHp = 2;
            this._rebuildTileObj(r, c);
          }
        },
      });
    }

    if (mechs.includes('black_hole')) {
      this.mechTimers.blackHole = this.time.addEvent({
        delay: 20000, loop: true,
        callback: () => {
          if (this.busy) return;
          this._showMechanicMsg('⚫ 黑洞吸引!');
          this.time.delayedCall(600, () => {
            if (this.busy) return;
            const cr = Math.floor(this.levelDef.rows / 2);
            const cc = Math.floor(this.levelDef.cols / 2);
            this.busy = true;
            this._pullToCenter(cr, cc).then(() => {
              this._cascade().then(() => { this.busy = false; this._checkWin(); });
            });
          });
        },
      });
    }
  }

  async _shiftColumnDown(col) {
    const rows = this.levelDef.rows;
    const bottom = this.board.get(rows - 1, col);
    for (let r = rows - 1; r > 0; r--) {
      this.board.cells[r][col] = this.board.cells[r-1][col];
    }
    this.board.cells[0][col] = null;
    const newCells = this.board.fillEmpty(this.levelDef.colors || 6);

    // Rebuild column visuals
    for (let r = 0; r < rows; r++) this._rebuildTileObj(r, col);

    await this._wait(200);
    await this._cascade();
    this._checkWin();
  }

  async _pullToCenter(cr, cc) {
    const { rows, cols } = this.levelDef;
    const pulled = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.abs(r - cr) + Math.abs(c - cc) <= 1) continue;
        const t = this.board.get(r, c);
        if (t && t.isMovable() && Math.random() < 0.3) {
          pulled.push({ r, c });
        }
      }
    }
    for (const { r, c } of pulled) {
      this.board.cells[r][c] = null;
      this._destroyTileObj(r, c);
    }
    const newCells = this.board.fillEmpty(this.levelDef.colors || 6);
    for (const { r, c } of newCells) this._spawnTileObj(r, c, true);
    await this._wait(300);
  }
}
