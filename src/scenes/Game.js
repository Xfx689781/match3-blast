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
    this.icesBroken      = 0;
    this.colorCleared    = new Array(6).fill(0);
    this.bombsTriggered  = 0;

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
    this.boardY = 148 + Math.floor((H - 148 - 20 - this.boardH) / 2);
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

    // Inactive cell overlays (board-shape cutouts)
    if (this.board.inactiveCells.size > 0) {
      const inactiveG = this.add.graphics().setDepth(2);
      for (const key of this.board.inactiveCells) {
        const [ir, ic] = key.split(',').map(Number);
        const { x, y } = this._tilePos(ir, ic);
        inactiveG.fillStyle(0x000000, 0.72);
        inactiveG.fillRoundedRect(x - this.TILE/2 - 1, y - this.TILE/2 - 1, this.TILE + 2, this.TILE + 2, 6);
        inactiveG.lineStyle(1, 0xffffff, 0.06);
        inactiveG.strokeRoundedRect(x - this.TILE/2 - 1, y - this.TILE/2 - 1, this.TILE + 2, this.TILE + 2, 6);
      }
    }
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

    // Score (left card)
    const py = 48;
    this._uiCard(this.boardX, py, 118, 46);
    this.add.text(this.boardX + 8, py + 4, t('score'), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#7799cc',
    }).setDepth(5);
    this.scoreTxt = this.add.text(this.boardX + 8, py + 19, '0', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setDepth(5);

    // Timer (right card)
    this._uiCard(this.boardX + this.boardW - 118, py, 118, 46);
    this.add.text(this.boardX + this.boardW - 8, py + 4, t('time'), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#7799cc',
    }).setDepth(5).setOrigin(1, 0);
    this.timeTxt = this.add.text(this.boardX + this.boardW - 8, py + 19, this._fmtTime(this.timeLeft), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setDepth(5).setOrigin(1, 0);

    // Objectives at top (between score row and board)
    this._buildObjDisplay();
  }

  _uiCard(x, y, w, h) {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1, 0xffffff, 0.06);
    g.strokeRoundedRect(x, y, w, h, 8);
  }

  _buildObjDisplay() {
    const objs = (this.levelDef.objectives || []).filter(o => o.type !== 'score');
    if (!objs.length) return;

    this.objDisplays = [];
    const n    = objs.length;
    const cardH = 40;
    const cardY = 100;
    const gap   = 5;
    const totalW = this.boardW;
    const segW  = (totalW - gap * (n - 1)) / n;
    const wi    = this.levelDef.world - 1;

    objs.forEach((obj, i) => {
      const cardX = this.boardX + i * (segW + gap);

      // Card bg
      const bg = this.add.graphics().setDepth(5);
      bg.fillStyle(0x000000, 0.38);
      bg.fillRoundedRect(cardX, cardY, segW, cardH, 8);
      bg.lineStyle(1, 0xffffff, 0.07);
      bg.strokeRoundedRect(cardX, cardY, segW, cardH, 8);

      // Icon
      const emoji = obj.type === 'tiles_clear'     ? '💎'
                  : obj.type === 'color_clear'      ? (COLOR_EMOJIS[obj.color] || '🎯')
                  : obj.type === 'bombs_triggered'  ? '💣'
                  : '❄';
      this.add.text(cardX + 10, cardY + cardH / 2, emoji, { fontSize: '19px' })
        .setDepth(5).setOrigin(0, 0.5);

      // Count text (right side)
      const txt = this.add.text(cardX + segW - 8, cardY + 11, `0/${obj.target}`, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '14px',
        color: '#ffffff', stroke: '#000', strokeThickness: 2,
      }).setDepth(5).setOrigin(1, 0);

      // Progress bar
      const barX = cardX + 5;
      const barY = cardY + cardH - 9;
      const barW = segW - 10;
      const bgBar = this.add.graphics().setDepth(5);
      bgBar.fillStyle(0x112244, 1);
      bgBar.fillRoundedRect(barX, barY, barW, 6, 3);
      const bar = this.add.graphics().setDepth(5);
      const barColor = obj.type === 'color_clear'
        ? TILE_COLORS[obj.color]?.base ?? WORLD_COLORS[wi]
        : WORLD_COLORS[wi];

      this.objDisplays.push({ ...obj, txt, bar, barX, barY, barW, barColor });
    });
  }

  _updateObjDisplays() {
    if (!this.objDisplays) return;
    const total = this.colorCleared.reduce((a, b) => a + b, 0);
    for (const d of this.objDisplays) {
      const cur = d.type === 'tiles_clear'    ? total
                : d.type === 'color_clear'    ? (this.colorCleared[d.color] || 0)
                : d.type === 'bombs_triggered'? this.bombsTriggered
                : this.icesBroken;
      const pct = Math.min(cur / d.target, 1);
      d.txt.setText(`${Math.min(cur, d.target)}/${d.target}`);
      d.txt.setColor(cur >= d.target ? '#ffd700' : '#ffffff');
      d.bar.clear();
      if (pct > 0) {
        d.bar.fillStyle(d.barColor, 0.9);
        d.bar.fillRoundedRect(d.barX, d.barY, d.barW * pct, 6, 3);
        d.bar.fillStyle(0xffffff, 0.18);
        d.bar.fillRoundedRect(d.barX + 1, d.barY + 1, Math.max(0, d.barW * pct - 2), 2, 1);
      }
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
        if (!this.board.isInactive(r, c)) this._spawnTileObj(r, c, false);
  }

  _spawnTileObj(r, c, fromAbove = false) {
    if (this.board.isInactive(r, c)) return;
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
      const targetY = g.y;
      g.y = this.boardY - size - 6;
      g.setAlpha(0);
      this.tweens.add({ targets: g, y: targetY, alpha: 1, duration: 200, ease: 'Bounce.easeOut' });
      if (badge) {
        badge.setAlpha(0);
        this.tweens.add({ targets: badge, alpha: 1, duration: 130, delay: 70 });
      }
    }
  }

  // ── Tile visuals ──────────────────────────────────────────────────────

  _renderTile(g, tile, size) {
    const shape = this.levelDef.tileShape || 'rounded';
    const cx = size / 2, cy = size / 2;
    const r  = size * 0.42;

    if (tile.type === TYPE.RAINBOW) { this._renderRainbow(g, cx, cy, r); return; }
    if (tile.type === TYPE.MEGA)    { this._renderMega(g, cx, cy, r); return; }
    if (tile.type === TYPE.BOMB)    { this._renderBomb(g, tile, cx, cy, r); return; }
    if (tile.type === TYPE.STRIPE_H || tile.type === TYPE.STRIPE_V) {
      this._renderStripe(g, tile, cx, cy, r, shape, tile.type === TYPE.STRIPE_V);
      return;
    }

    const cs = TILE_COLORS[tile.color] || TILE_COLORS[0];

    g.fillStyle(0x000000, 0.32);
    this._fillShape(g, cx + 2, cy + 4, r, shape);

    g.fillStyle(cs.dark, 1);
    this._fillShape(g, cx, cy, r, shape);

    g.fillStyle(cs.base, 1);
    this._fillShape(g, cx - 1, cy - 2, r * 0.9, shape);

    g.fillStyle(cs.light, 0.55);
    g.fillEllipse(cx - 1, cy - r * 0.22, r * 1.72, r * 1.08);

    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(cx - r * 0.27, cy - r * 0.31, r * 0.46, r * 0.27);

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

  // Rainbow: multicolor pie wheel — wildcard, matches any color
  _renderRainbow(g, cx, cy, r) {
    const arc = [0xff3333, 0xff9900, 0xffee00, 0x33cc33, 0x3388ff, 0xcc44ff];

    g.fillStyle(0x000000, 0.3);
    g.fillCircle(cx + 2, cy + 4, r);

    for (let i = 0; i < 6; i++) {
      g.fillStyle(arc[i], 1);
      const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
      const pts = [new Phaser.Geom.Point(cx, cy)];
      for (let s = 0; s <= 9; s++) {
        const a = a0 + (a1 - a0) * s / 9;
        pts.push(new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
      }
      g.fillPoints(pts, true);
    }

    g.lineStyle(2, 0x111111, 0.75);
    g.strokeCircle(cx, cy, r);

    g.lineStyle(1, 0x000000, 0.3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      g.strokePath();
    }

    g.fillStyle(0xffffff, 0.92);
    g.fillCircle(cx, cy, r * 0.18);

    g.fillStyle(0xffffff, 0.48);
    g.fillEllipse(cx - r * 0.23, cy - r * 0.3, r * 0.37, r * 0.21);
  }

  // Mega: solid gold 5-pointed star — clears whole board on match
  _renderMega(g, cx, cy, r) {
    const pts = (ox, oy, rad, inner) => Array.from({ length: 10 }, (_, i) => {
      const a  = (Math.PI / 5) * i - Math.PI / 2;
      const ro = i % 2 === 0 ? rad : rad * inner;
      return new Phaser.Geom.Point(ox + ro * Math.cos(a), oy + ro * Math.sin(a));
    });

    g.fillStyle(0x000000, 0.35);
    g.fillPoints(pts(cx + 2, cy + 4, r, 0.42), true);

    g.fillStyle(0x7a5000, 1);
    g.fillPoints(pts(cx, cy, r, 0.42), true);

    g.fillStyle(0xffd700, 1);
    g.fillPoints(pts(cx - 1, cy - 2, r * 0.91, 0.44), true);

    g.fillStyle(0xfffacc, 0.52);
    g.fillEllipse(cx - 1, cy - r * 0.2, r * 1.55, r * 0.88);

    g.fillStyle(0xffffff, 0.72);
    g.fillEllipse(cx - r * 0.22, cy - r * 0.32, r * 0.38, r * 0.2);
  }

  // Bomb: dark ball with color sheen + bent fuse + spark
  _renderBomb(g, tile, cx, cy, r) {
    const cs = TILE_COLORS[tile.color] || TILE_COLORS[0];

    g.fillStyle(0x000000, 0.35);
    g.fillCircle(cx + 2, cy + 4, r);

    g.fillStyle(cs.dark, 1);
    g.fillCircle(cx, cy, r);

    const dc = this._tint(cs.base, 0.44);
    g.fillStyle(dc, 1);
    g.fillCircle(cx - 1, cy - 1, r * 0.87);

    g.fillStyle(cs.base, 0.4);
    g.fillEllipse(cx - r * 0.22, cy - r * 0.08, r * 1.28, r * 0.88);

    g.fillStyle(0xffffff, 0.62);
    g.fillEllipse(cx - r * 0.32, cy - r * 0.36, r * 0.36, r * 0.21);

    // Fuse
    g.lineStyle(2.5, 0x7a4010, 1);
    g.beginPath();
    g.moveTo(cx + r * 0.52, cy - r * 0.52);
    g.lineTo(cx + r * 0.68, cy - r * 0.78);
    g.lineTo(cx + r * 0.58, cy - r * 0.97);
    g.strokePath();

    g.fillStyle(0xffcc00, 1);
    g.fillCircle(cx + r * 0.58, cy - r * 0.97, r * 0.14);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx + r * 0.58, cy - r * 0.97, r * 0.07);
  }

  // Stripe: jewel with 3 glowing energy bars (H or V)
  _renderStripe(g, tile, cx, cy, r, shape, vertical) {
    const cs = TILE_COLORS[tile.color] || TILE_COLORS[0];
    const sw = r * 1.56;

    g.fillStyle(0x000000, 0.32);
    this._fillShape(g, cx + 2, cy + 4, r, shape);

    g.fillStyle(cs.dark, 1);
    this._fillShape(g, cx, cy, r, shape);

    g.fillStyle(cs.base, 1);
    this._fillShape(g, cx - 1, cy - 2, r * 0.9, shape);

    g.fillStyle(cs.light, 0.42);
    g.fillEllipse(cx - 1, cy - r * 0.22, r * 1.72, r * 1.08);

    if (vertical) {
      for (const ox of [-r * 0.3, 0, r * 0.3]) {
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(cx + ox - r * 0.065, cy - sw / 2, r * 0.13, sw);
        g.fillStyle(0xffffff, 0.88);
        g.fillRect(cx + ox - r * 0.025, cy - sw / 2, r * 0.05, sw);
      }
    } else {
      for (const oy of [-r * 0.27, 0, r * 0.27]) {
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(cx - sw / 2, cy + oy - r * 0.065, sw, r * 0.13);
        g.fillStyle(0xffffff, 0.88);
        g.fillRect(cx - sw / 2, cy + oy - r * 0.025, sw, r * 0.05);
      }
    }

    g.fillStyle(0xffffff, 0.65);
    g.fillEllipse(cx - r * 0.27, cy - r * 0.31, r * 0.46, r * 0.27);
  }

  _tint(hex, factor) {
    return ((Math.round(((hex >> 16) & 0xff) * factor) << 16) |
            (Math.round(((hex >> 8)  & 0xff) * factor) << 8)  |
             Math.round((hex & 0xff)           * factor));
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
    // Power specials have their own distinct renders — no badge needed
    if (tile.type === TYPE.STONE) return '▪';
    if (tile.type === TYPE.ICE)   return tile.iceHp === 2 ? '❄' : '·';
    if (tile.type === TYPE.LAVA)  return '🔥';
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

    const preA = this.board.get(r1, c1);
    const preB = this.board.get(r2, c2);
    const isAuto = t => t?.type === TYPE.RAINBOW || t?.type === TYPE.MEGA;

    await this._animSwap(r1, c1, r2, c2);
    this.board.swap(r1, c1, r2, c2);

    // RAINBOW or MEGA auto-triggers on any swap — no 3-match needed
    if (isAuto(preA) || isAuto(preB)) {
      // After swap: preA is now at (r2,c2), preB is at (r1,c1)
      const triggers = [];
      if (isAuto(preA)) triggers.push({ r: r2, c: c2, tile: preA });
      if (isAuto(preB)) triggers.push({ r: r1, c: c1, tile: preB });

      for (const { r, c, tile } of triggers) {
        const obj = this.tileObjs[r]?.[c];
        if (obj?.g) this.tweens.add({ targets: obj.g, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 320, ease: 'Power2' });
      }
      await this._wait(340);

      for (const { r, c, tile } of triggers) {
        const result = this.board.triggerAt(r, c);
        this.score += result.scoreAdd;
        this.icesBroken += result.icesBroken || 0;
        if (tile.type === TYPE.BOMB || tile.type === TYPE.MEGA) this.bombsTriggered++;
        for (let i = 0; i < 6; i++) this.colorCleared[i] += result.colorsCleared[i] || 0;
        for (const key of result.deleted) {
          const [dr, dc] = key.split(',').map(Number);
          const { x, y } = this._tilePos(dr, dc);
          this._burst(x, y, TILE_COLORS[tile.color ?? 0]?.base ?? 0xffffff, tile.type);
          this._destroyTileObj(dr, dc);
        }
      }
      this.scoreTxt.setText(this.score.toLocaleString());
      this._updateObjDisplays();
      this.chain = 0;
      await this._cascade();
      this._checkWin();
      this.busy = false;
      return;
    }

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
      this.bombsTriggered += result.bombsTriggered || 0;
      for (let i = 0; i < 6; i++) this.colorCleared[i] += result.colorsCleared[i] || 0;

      this.scoreTxt.setText(this.score.toLocaleString());
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
          if (!this.board.isInactive(r, c) && this.board.get(r, c) && !this.tileObjs[r][c])
            this._spawnTileObj(r, c, false);
        }

      await this._wait(60);

      // Drop existing tiles into empty spaces
      const drops = this.board.applyGravity();
      await this._animDrop(drops);

      // Fill empty board cells, then spawn visuals for ALL cells missing one.
      // This acts as a safety net: catches both newly filled cells AND any tiles
      // whose visual was lost during the drop animation.
      this.board.fillEmpty(this.levelDef.colors || 6);
      for (let r = 0; r < this.levelDef.rows; r++)
        for (let c = 0; c < this.levelDef.cols; c++) {
          if (!this.board.isInactive(r, c) && this.board.get(r, c) && !this.tileObjs[r][c])
            this._spawnTileObj(r, c, true);
        }

      await this._wait(260); // must be > spawn animation duration (200ms)

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
          if (!this.board.isInactive(r, c)) this._spawnTileObj(r, c, true);
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
    const total = this.colorCleared.reduce((a, b) => a + b, 0);
    const allMet = (this.levelDef.objectives || []).every(obj => {
      if (obj.type === 'tiles_clear')    return total >= obj.target;
      if (obj.type === 'break_ice')      return this.icesBroken >= obj.target;
      if (obj.type === 'color_clear')    return (this.colorCleared[obj.color] || 0) >= obj.target;
      if (obj.type === 'bombs_triggered')return this.bombsTriggered >= obj.target;
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
    const pct = this.timeLeft / this.levelDef.timeLimit;
    if (pct >= 0.45) return 3;
    if (pct >= 0.18) return 2;
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
