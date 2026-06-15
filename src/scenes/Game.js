import Phaser from 'phaser';
import { getLevel } from '../data/levels.js';
import { Board, TYPE } from '../game/Board.js';
import { TILE_COLORS, COLOR_EMOJIS } from '../game/TileTypes.js';
import { t, toggleLang } from '../data/i18n.js';

const W = 480, H = 854;
const WORLD_COLORS  = [0x2ecc71, 0x3498db, 0xe74c3c, 0x80deea, 0xce93d8];
const WORLD_DARKS   = [0x0a1f0e, 0x050d22, 0x1c0505, 0x04101c, 0x07070f];
const WORLD_MIDS    = [0x0e3318, 0x091c50, 0x360909, 0x091e3c, 0x0d0d2e];

export default class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.levelId = data?.levelId || 1; }

  create() {
    this.levelDef     = getLevel(this.levelId);
    this.board        = new Board(this.levelDef.cols, this.levelDef.rows, this.levelDef);
    this.score        = 0;
    this.chain        = 0;
    this.timeLeft     = this.levelDef.timeLimit;
    this.busy         = false;
    this.selected     = null;
    this.tileObjs     = [];
    this.icesBroken   = 0;
    this.colorCleared = new Array(6).fill(0);

    this._computeLayout();
    this._drawBg();          // background + animated particles + board panel
    this._drawBoard();
    this._drawUI();
    this._startTimer();
    this._startMechanics();
  }

  // ── Layout ─────────────────────────────────────────────────────────────

  _computeLayout() {
    const { cols, rows } = this.levelDef;
    this.TILE  = Math.min(Math.floor((W - 24) / cols), Math.floor((H - 220) / rows), 58);
    this.GAP   = 4;
    this.STEP  = this.TILE + this.GAP;
    this.boardW = cols * this.STEP - this.GAP;
    this.boardH = rows * this.STEP - this.GAP;
    this.boardX = (W - this.boardW) / 2;
    this.boardY = 162 + Math.floor((H - 162 - 80 - this.boardH) / 2);
  }

  _tilePos(r, c) {
    return {
      x: this.boardX + c * this.STEP + this.TILE / 2,
      y: this.boardY + r * this.STEP + this.TILE / 2,
    };
  }

  // ── Background & Board Panel ───────────────────────────────────────────

  _drawBg() {
    const wi  = this.levelDef.world - 1;
    const wc  = WORLD_COLORS[wi];
    const hasDark = this.levelDef.mechanics?.includes('dark_bg');

    // Gradient background
    const bg = this.add.graphics();
    const dark = hasDark ? 0x010108 : WORLD_DARKS[wi];
    const mid  = hasDark ? 0x050520 : WORLD_MIDS[wi];
    bg.fillGradientStyle(dark, dark, mid, mid, 1);
    bg.fillRect(0, 0, W, H);

    // Floating ambient particles
    const particleColor = hasDark ? 0x8866ff : wc;
    for (let i = 0; i < 22; i++) {
      const px = Phaser.Math.Between(8, W - 8);
      const py = Phaser.Math.Between(H * 0.35, H);
      const pr = Phaser.Math.FloatBetween(1.2, 3.8);
      const dot = this.add.graphics().setDepth(0);
      dot.fillStyle(i % 3 === 0 ? 0xffffff : particleColor, 0.45);
      dot.fillCircle(0, 0, pr);
      dot.x = px; dot.y = py;

      this.tweens.add({
        targets: dot,
        y: py - Phaser.Math.Between(90, 260),
        alpha: 0,
        duration: Phaser.Math.Between(2800, 6000),
        delay: Phaser.Math.Between(0, 5000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(8, W - 8);
          dot.y = Phaser.Math.Between(H * 0.45, H);
          dot.setAlpha(0.45);
        },
      });
    }

    // Board outer glow (static, subtle)
    const bx = this.boardX, by = this.boardY;
    const bw = this.boardW, bh = this.boardH;
    const glowG = this.add.graphics().setDepth(1);
    glowG.fillStyle(wc, 0.06);
    glowG.fillRoundedRect(bx - 18, by - 18, bw + 36, bh + 36, 22);

    // Board panel
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x000000, 0.42);
    panel.fillRoundedRect(bx - 10, by - 10, bw + 20, bh + 20, 16);

    // Animated border
    this.boardBorder = this.add.graphics().setDepth(2);
    this._drawBoardBorder(1.0);
    this.tweens.add({
      targets: this.boardBorder,
      alpha: 0.35,
      yoyo: true, repeat: -1,
      duration: 1600, ease: 'Sine.easeInOut',
    });

    // Inner rim
    const rim = this.add.graphics().setDepth(2);
    rim.lineStyle(1, 0xffffff, 0.07);
    rim.strokeRoundedRect(bx - 8, by - 8, bw + 16, bh + 16, 14);
  }

  _drawBoardBorder(alpha) {
    const wi = this.levelDef.world - 1;
    const g  = this.boardBorder;
    g.clear();
    g.lineStyle(2, WORLD_COLORS[wi], alpha);
    g.strokeRoundedRect(
      this.boardX - 10, this.boardY - 10,
      this.boardW + 20, this.boardH + 20, 16
    );
  }

  // ── UI ─────────────────────────────────────────────────────────────────

  _drawUI() {
    const wi = this.levelDef.world - 1;
    const wc = WORLD_COLORS[wi];

    // Back
    this.add.text(18, 24, '←', {
      fontFamily: 'Arial', fontSize: '22px', color: '#7777aa',
    }).setDepth(5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LevelSelect', { world: this.levelDef.world }));

    // Title
    this.add.text(W / 2, 24, `Lv.${this.levelId}  ${t(`level_${this.levelId}`)}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '15px',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setDepth(5).setOrigin(0.5);

    // Lang toggle
    this.add.text(W - 14, 12, t('lang'), {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#6c63ffcc',
      padding: { x: 7, y: 4 },
    }).setDepth(5).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { toggleLang(); this.scene.restart({ levelId: this.levelId }); });

    // Score
    const py = 50;
    this._uiCard(this.boardX, py, 115, 50);
    this.add.text(this.boardX + 8, py + 4, t('score'), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#7799cc',
    }).setDepth(5);
    this.scoreTxt = this.add.text(this.boardX + 8, py + 20, '0', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setDepth(5);

    // Timer
    this._uiCard(this.boardX + this.boardW - 115, py, 115, 50);
    this.add.text(this.boardX + this.boardW - 8, py + 4, t('time'), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#7799cc',
    }).setDepth(5).setOrigin(1, 0);
    this.timeTxt = this.add.text(this.boardX + this.boardW - 8, py + 20, this._fmtTime(this.timeLeft), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setDepth(5).setOrigin(1, 0);

    // Target
    this._uiCard(this.boardX + 125, py, this.boardW - 250, 50);
    this.add.text(W / 2, py + 4, t('target'), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#7799cc',
    }).setDepth(5).setOrigin(0.5, 0);
    this.add.text(W / 2, py + 20, this.levelDef.targetScore.toLocaleString(), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '16px',
      color: '#' + wc.toString(16).padStart(6, '0'),
    }).setDepth(5).setOrigin(0.5, 0);

    // Progress bar
    const barY = 116;
    const barBg = this.add.graphics().setDepth(5);
    barBg.fillStyle(0x111133, 1);
    barBg.fillRoundedRect(this.boardX, barY, this.boardW, 11, 5);
    this.progressBar = this.add.graphics().setDepth(5);
    this.progressMeta = { x: this.boardX, y: barY, w: this.boardW, color: wc };
    this._updateProgressBar();

    // Objectives
    this._buildObjDisplay();

    // Mechanic badges
    let bx2 = this.boardX;
    for (const m of (this.levelDef.mechanics || [])) {
      const label = t(`mech_${m}`);
      if (!label || label === `mech_${m}`) continue;
      const txt = this.add.text(bx2, H - 18, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px',
        color: '#8888bb', backgroundColor: '#11113388',
        padding: { x: 5, y: 2 },
      }).setDepth(5);
      bx2 += txt.width + 8;
    }
  }

  _uiCard(x, y, w, h) {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1, 0xffffff, 0.06);
    g.strokeRoundedRect(x, y, w, h, 8);
  }

  _buildObjDisplay() {
    const colorObjs = (this.levelDef.objectives || []).filter(o => o.type === 'color_clear');
    const iceObjs   = (this.levelDef.objectives || []).filter(o => o.type === 'break_ice');
    const all = [...colorObjs, ...iceObjs];
    if (!all.length) return;

    this.objDisplays = [];
    const segW = this.boardW / all.length;
    const y = H - 62;

    all.forEach((obj, i) => {
      const cx = this.boardX + i * segW + segW / 2;
      const g = this.add.graphics().setDepth(5);
      g.fillStyle(0x000000, 0.32);
      g.fillRoundedRect(cx - segW / 2 + 6, y - 2, segW - 12, 40, 8);

      const emoji = obj.type === 'color_clear' ? (COLOR_EMOJIS[obj.color] || '🎯') : '❄';
      this.add.text(cx - 14, y + 10, emoji, { fontSize: '20px' }).setDepth(5).setOrigin(0.5);
      const txt = this.add.text(cx + 8, y + 10, `0/${obj.target}`, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '14px',
        color: '#ffffff', stroke: '#000', strokeThickness: 2,
      }).setDepth(5).setOrigin(0, 0.5);

      this.objDisplays.push({ ...obj, txt });
    });
  }

  _updateObjDisplays() {
    if (!this.objDisplays) return;
    for (const d of this.objDisplays) {
      const cur = d.type === 'color_clear' ? (this.colorCleared[d.color] || 0) : this.icesBroken;
      d.txt.setText(`${Math.min(cur, d.target)}/${d.target}`);
      d.txt.setColor(cur >= d.target ? '#ffd700' : '#ffffff');
    }
  }

  _updateProgressBar() {
    const { x, y, w, color } = this.progressMeta;
    const pct = Math.min(this.score / this.levelDef.targetScore, 1);
    this.progressBar.clear();
    if (pct > 0) {
      this.progressBar.fillStyle(color, 0.85);
      this.progressBar.fillRoundedRect(x, y, w * pct, 11, 5);
      this.progressBar.fillStyle(0xffffff, 0.2);
      this.progressBar.fillRoundedRect(x + 2, y + 2, Math.max(0, w * pct - 4), 4, 2);
    }
  }

  _fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  _startTimer() {
    this.timerEvt = this.time.addEvent({
      delay: 1000, repeat: this.levelDef.timeLimit - 1,
      callback: () => {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.timeTxt.setText(this._fmtTime(this.timeLeft));
        if (this.timeLeft <= 10) {
          this.timeTxt.setColor('#ff4444');
          if (this.timeLeft <= 5) this.cameras.main.shake(60, 0.004);
        }
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
        this._spawnTileObj(r, c, false);
  }

  _spawnTileObj(r, c, fromAbove = false) {
    const tile = this.board.get(r, c);
    if (!tile) { this.tileObjs[r][c] = null; return; }

    const { x, y } = this._tilePos(r, c);
    const size = this.TILE;

    const g = this.add.graphics().setDepth(3);
    this._renderTile(g, tile, size);
    g.setPosition(x - size / 2, y - size / 2);

    // Center badge for special/obstacle icons
    let badge = null;
    const icon = this._iconFor(tile);
    if (icon) {
      badge = this.add.text(x, y, icon, {
        fontSize: `${Math.round(size * 0.4)}px`,
        color: '#ffffff',
        stroke: '#00000099',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(4);
    }

    const obj = { g, badge, r, c };
    this.tileObjs[r][c] = obj;

    if (tile.type !== TYPE.STONE) {
      g.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
      g.on('pointerdown', () => this._onTileClick(obj.r, obj.c));
    }

    if (fromAbove) {
      // Animate from just above the board, staggered by column
      const targetY = g.y;
      g.y = this.boardY - size - 6;
      g.setAlpha(0);
      const delay = c * 22;
      this.tweens.add({
        targets: g,
        y: targetY, alpha: 1,
        duration: 260 + r * 18,
        delay,
        ease: 'Bounce.easeOut',
      });
      if (badge) {
        badge.setAlpha(0);
        this.tweens.add({ targets: badge, alpha: 1, duration: 180, delay: delay + 120 });
      }
    }
  }

  // ── Tile visuals (clean 4-layer jewel) ────────────────────────────────

  _renderTile(g, tile, size) {
    const cs    = TILE_COLORS[tile.color] || TILE_COLORS[0];
    const shape = this.levelDef.tileShape || 'rounded';
    const cx = size / 2, cy = size / 2;
    const r  = size * 0.42;

    // 1. Drop shadow
    g.fillStyle(0x000000, 0.32);
    this._fillShape(g, cx + 2, cy + 4, r, shape);

    // 2. Dark outer body → creates border/rim effect
    g.fillStyle(cs.dark, 1);
    this._fillShape(g, cx, cy, r, shape);

    // 3. Main color face (slightly raised)
    g.fillStyle(cs.base, 1);
    this._fillShape(g, cx - 1, cy - 2, r * 0.9, shape);

    // 4. Top highlight — ellipse blends naturally without clipping
    g.fillStyle(cs.light, 0.55);
    g.fillEllipse(cx - 1, cy - r * 0.22, r * 1.72, r * 1.08);

    // 5. Specular dot (bright glint, top-left)
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(cx - r * 0.27, cy - r * 0.31, r * 0.46, r * 0.27);

    // Ice crack overlay
    if (tile.type === TYPE.ICE && tile.iceHp === 1) {
      g.lineStyle(1.5, 0xffffff, 0.7);
      g.beginPath();
      g.moveTo(cx - r*0.25, cy - r*0.3);
      g.lineTo(cx + r*0.2,  cy + r*0.25);
      g.moveTo(cx,          cy - r*0.05);
      g.lineTo(cx - r*0.28, cy + r*0.38);
      g.strokePath();
    }
  }

  _fillShape(g, cx, cy, r, shape) {
    switch (shape) {
      case 'circle':
        g.fillCircle(cx, cy, r);
        break;
      case 'diamond': {
        // Gem-cut diamond: 6 points
        const pts = [
          new Phaser.Geom.Point(cx,          cy - r),
          new Phaser.Geom.Point(cx + r*0.68, cy - r*0.1),
          new Phaser.Geom.Point(cx + r*0.82, cy + r*0.42),
          new Phaser.Geom.Point(cx,          cy + r),
          new Phaser.Geom.Point(cx - r*0.82, cy + r*0.42),
          new Phaser.Geom.Point(cx - r*0.68, cy - r*0.1),
        ];
        g.fillPoints(pts, true);
        break;
      }
      case 'hex': {
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          return new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a));
        });
        g.fillPoints(pts, true);
        break;
      }
      case 'star': {
        const pts = Array.from({ length: 10 }, (_, i) => {
          const a   = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.44;
          return new Phaser.Geom.Point(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
        });
        g.fillPoints(pts, true);
        break;
      }
      default: // rounded square — wide corners for friendly look
        g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.32);
    }
  }

  _iconFor(tile) {
    if (tile.type === TYPE.BOMB)     return '✸';
    if (tile.type === TYPE.MEGA)     return '★';
    if (tile.type === TYPE.STRIPE_H) return '━';
    if (tile.type === TYPE.STRIPE_V) return '┃';
    if (tile.type === TYPE.RAINBOW)  return '◈';
    if (tile.type === TYPE.STONE)    return '▪';
    if (tile.type === TYPE.ICE)      return tile.iceHp === 2 ? '❄' : '·';
    if (tile.type === TYPE.LAVA)     return '🔥';
    return null;
  }

  _destroyTileObj(r, c) {
    const obj = this.tileObjs[r]?.[c];
    if (!obj) return;
    obj.g?.destroy();
    obj.badge?.destroy();
    obj.selectRing?.destroy();
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
      this._setHighlight(r, c, true);
      return;
    }

    const { r: sr, c: sc } = this.selected;
    this._setHighlight(sr, sc, false);

    if (sr === r && sc === c) { this.selected = null; return; }

    if (this.board.isAdjacent(sr, sc, r, c)) {
      this.selected = null;
      this._doSwap(sr, sc, r, c);
    } else {
      this.selected = { r, c };
      this._setHighlight(r, c, true);
    }
  }

  _setHighlight(r, c, on) {
    const obj = this.tileObjs[r]?.[c];
    if (!obj?.g) return;
    if (on) {
      this.tweens.add({ targets: obj.g, scaleX: 1.1, scaleY: 1.1, duration: 90, ease: 'Back.easeOut' });
      if (!obj.selectRing) {
        const { x, y } = this._tilePos(r, c);
        const rng = this.add.graphics().setDepth(5);
        rng.lineStyle(2.5, 0xffffff, 1);
        rng.strokeRoundedRect(1, 1, this.TILE - 2, this.TILE - 2, this.TILE * 0.16);
        rng.setPosition(x - this.TILE / 2, y - this.TILE / 2);
        obj.selectRing = rng;
        this.tweens.add({ targets: rng, alpha: 0.35, yoyo: true, repeat: -1, duration: 320 });
      }
    } else {
      this.tweens.add({ targets: obj.g, scaleX: 1, scaleY: 1, duration: 90 });
      obj.selectRing?.destroy();
      delete obj.selectRing;
    }
  }

  // ── Game logic ─────────────────────────────────────────────────────────

  async _doSwap(r1, c1, r2, c2) {
    this.busy = true;
    await this._animSwap(r1, c1, r2, c2);
    this.board.swap(r1, c1, r2, c2);

    if (this.board.findMatches().length === 0) {
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
      const bonus = this.levelDef.mechanics?.includes('chain_bonus') ? this.chain : 1;

      // Flash animation on matched tiles
      this._flashMatched(matches);
      await this._wait(300);

      // Apply game logic
      const result = this.board.applyMatches(matches, bonus);
      this.score += result.scoreAdd;
      this.icesBroken += result.icesBroken;
      for (let i = 0; i < 6; i++) this.colorCleared[i] += result.colorsCleared[i] || 0;

      this.scoreTxt.setText(this.score.toLocaleString());
      this._updateProgressBar();
      this._updateObjDisplays();
      this._scorePopup(result.scoreAdd, bonus);

      // Remove destroyed visual tiles
      for (const key of result.deleted) {
        const [r, c] = key.split(',').map(Number);
        this._destroyTileObj(r, c);
      }

      // Reveal any new special tiles created by the match
      for (let r = 0; r < this.levelDef.rows; r++)
        for (let c = 0; c < this.levelDef.cols; c++) {
          if (this.board.get(r, c) && !this.tileObjs[r][c])
            this._spawnTileObj(r, c, false);
        }

      await this._wait(60);

      // Drop existing tiles into empty spaces
      const drops = this.board.applyGravity();
      await this._animDrop(drops);

      // Fill empty cells with new tiles falling from above
      const newCells = this.board.fillEmpty(this.levelDef.colors || 6);
      for (const { r, c } of newCells) this._spawnTileObj(r, c, true);

      // Wait for spawn animations to settle
      await this._wait(240);

      if (this.levelDef.mechanics?.includes('gravity_flip') && this.chain % 3 === 0) {
        this.board.rotateGravity();
        this._showMsg(t('gravityFlip'));
      }

      matches = this.board.findMatches();
    }

    // Reshuffle if no moves remain
    if (!this.board.hasAnyMoves()) {
      this._showMsg(t('shuffle'));
      await this._wait(500);
      this.board._init();
      for (let r = 0; r < this.levelDef.rows; r++)
        for (let c = 0; c < this.levelDef.cols; c++) {
          this._destroyTileObj(r, c);
          this._spawnTileObj(r, c, true);
        }
    }
  }

  // ── Animations ─────────────────────────────────────────────────────────

  _animSwap(r1, c1, r2, c2) {
    return new Promise(resolve => {
      const p1 = this._tilePos(r1, c1), p2 = this._tilePos(r2, c2);
      const o1 = this.tileObjs[r1]?.[c1], o2 = this.tileObjs[r2]?.[c2];
      let done = 0;
      const T = 140;
      const finish = () => { if (++done === 2) { this._swapTileObjs(r1,c1,r2,c2); resolve(); } };

      const moveObj = (obj, px, py) => {
        if (!obj?.g) { finish(); return; }
        this.tweens.add({ targets: obj.g, x: px - this.TILE/2, y: py - this.TILE/2, duration: T, ease: 'Sine.easeInOut', onComplete: finish });
        if (obj.badge) this.tweens.add({ targets: obj.badge, x: px, y: py, duration: T });
        if (obj.selectRing) this.tweens.add({ targets: obj.selectRing, x: px - this.TILE/2, y: py - this.TILE/2, duration: T });
      };

      moveObj(o1, p2.x, p2.y);
      moveObj(o2, p1.x, p1.y);
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
        this.tweens.add({ targets: obj.g, scaleX: 1.35, scaleY: 1.35, alpha: 0, duration: 280, ease: 'Power2' });
        if (obj.badge) this.tweens.add({ targets: obj.badge, alpha: 0, duration: 200 });
        const tile = this.board.get(r, c);
        const col  = TILE_COLORS[tile?.color ?? 0]?.base ?? 0xffffff;
        this._burst(obj.g.x + this.TILE / 2, obj.g.y + this.TILE / 2, col, tile?.type);
      }
    }
  }

  _burst(x, y, color, type) {
    const isBig  = type === TYPE.BOMB || type === TYPE.MEGA;
    const count  = isBig ? 14 : 8;
    const maxDist = isBig ? 90 : 52;
    for (let i = 0; i < count; i++) {
      const dot = this.add.graphics().setDepth(10);
      dot.fillStyle(i % 2 === 0 ? color : 0xffffff, 1);
      dot.fillCircle(0, 0, isBig ? Phaser.Math.Between(4, 7) : Phaser.Math.Between(3, 5));
      dot.x = x; dot.y = y;
      const angle = (Math.PI * 2 / count) * i + Phaser.Math.FloatBetween(-0.25, 0.25);
      const dist  = Phaser.Math.Between(18, maxDist);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.15, scaleY: 0.15,
        duration: isBig ? 520 : 340, ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }
  }

  _animDrop(drops) {
    return new Promise(resolve => {
      if (!drops.length) { resolve(); return; }
      let pending = drops.length;
      const done = () => { if (--pending === 0) resolve(); };

      for (const { fromR, fromC, toR, toC } of drops) {
        const obj = this.tileObjs[fromR]?.[fromC];
        const { x: tx, y: ty } = this._tilePos(toR, toC);

        if (obj?.g) {
          this.tweens.add({
            targets: obj.g,
            x: tx - this.TILE / 2, y: ty - this.TILE / 2,
            duration: 175, ease: 'Bounce.easeOut',
            onComplete: () => {
              this.tileObjs[toR][toC]   = obj;
              this.tileObjs[fromR][fromC] = null;
              obj.r = toR; obj.c = toC;
              if (obj.badge) { obj.badge.x = tx; obj.badge.y = ty; }
              done();
            },
          });
        } else { done(); }
      }
    });
  }

  _flashRed(r1, c1, r2, c2) {
    for (const [r, c] of [[r1,c1],[r2,c2]]) {
      const obj = this.tileObjs[r]?.[c];
      if (obj?.g) this.tweens.add({ targets: obj.g, alpha: 0.22, yoyo: true, repeat: 2, duration: 65 });
    }
  }

  _scorePopup(amount, chain) {
    const cx = W / 2, cy = this.boardY + this.boardH / 2;
    const big = chain > 2;
    const pop = this.add.text(cx, cy,
      big ? `${chain}✕  +${amount.toLocaleString()}` : `+${amount.toLocaleString()}`,
      {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: big ? '30px' : '20px',
        color: big ? '#ffd700' : '#ffffff',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: pop, y: cy - 75, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => pop.destroy() });
  }

  _showMsg(msg) {
    const txt = this.add.text(W / 2, this.boardY - 26, msg, {
      fontFamily: 'Arial, sans-serif', fontSize: '15px',
      color: '#ffffcc', backgroundColor: '#00000099',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 16, duration: 1300, onComplete: () => txt.destroy() });
  }

  _wait(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }

  // ── Win / Lose ─────────────────────────────────────────────────────────

  _checkWin() {
    const allMet = (this.levelDef.objectives || []).every(obj => {
      if (obj.type === 'score')       return this.score >= obj.target;
      if (obj.type === 'break_ice')   return this.icesBroken >= obj.target;
      if (obj.type === 'color_clear') return (this.colorCleared[obj.color] || 0) >= obj.target;
      return true;
    });
    if (allMet) {
      this.timerEvt?.remove();
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
      save.stars    = save.stars  || {};
      save.scores   = save.scores || {};
      save.stars[this.levelId]  = Math.max(save.stars[this.levelId]  || 0, stars);
      save.scores[this.levelId] = Math.max(save.scores[this.levelId] || 0, this.score);
      localStorage.setItem('blastSave', JSON.stringify(save));
    }
    this.scene.start('LevelComplete', {
      levelId: this.levelId, score: this.score, stars, won, world: this.levelDef.world,
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
      this.time.addEvent({ delay: 15000, loop: true, callback: () => {
        if (this.busy) return;
        const col = Phaser.Math.Between(0, this.levelDef.cols - 1);
        this._showMsg(t('drift'));
        this.time.delayedCall(600, async () => {
          if (!this.busy) { this.busy = true; await this._shiftColDown(col); this.busy = false; }
        });
      }});
    }

    if (mechs.includes('blizzard')) {
      this.time.addEvent({ delay: 18000, loop: true, callback: () => {
        if (this.busy) return;
        const r = Phaser.Math.Between(1, this.levelDef.rows - 2);
        const c = Phaser.Math.Between(0, this.levelDef.cols - 1);
        const tile = this.board.get(r, c);
        if (tile?.type === TYPE.NORMAL) {
          this._showMsg(t('blizzard'));
          tile.type = TYPE.ICE; tile.iceHp = 2;
          this._rebuildTileObj(r, c);
        }
      }});
    }

    if (mechs.includes('black_hole')) {
      this.time.addEvent({ delay: 20000, loop: true, callback: () => {
        if (this.busy) return;
        this._showMsg(t('blackHole'));
        this.time.delayedCall(600, async () => {
          if (!this.busy) {
            this.busy = true;
            await this._pullToCenter();
            await this._cascade();
            this._checkWin();
            this.busy = false;
          }
        });
      }});
    }
  }

  async _shiftColDown(col) {
    const rows = this.levelDef.rows;
    for (let r = rows - 1; r > 0; r--) this.board.cells[r][col] = this.board.cells[r-1][col];
    this.board.cells[0][col] = null;
    this.board.fillEmpty(this.levelDef.colors || 6);
    for (let r = 0; r < rows; r++) this._rebuildTileObj(r, col);
    await this._wait(200);
    await this._cascade();
    this._checkWin();
  }

  async _pullToCenter() {
    const { rows, cols } = this.levelDef;
    const cr = Math.floor(rows / 2), cc = Math.floor(cols / 2);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (Math.abs(r-cr) + Math.abs(c-cc) <= 1) continue;
        const tile = this.board.get(r, c);
        if (tile?.isMovable() && Math.random() < 0.3) {
          this.board.cells[r][c] = null;
          this._destroyTileObj(r, c);
        }
      }
    const newCells = this.board.fillEmpty(this.levelDef.colors || 6);
    for (const { r, c } of newCells) this._spawnTileObj(r, c, true);
    await this._wait(300);
  }
}
