import Phaser from 'phaser';
import { WORLDS, LEVELS } from '../data/levels.js';

const W = 480, H = 854;
const WORLD_COLORS = [0x2ecc71, 0x3498db, 0xe74c3c, 0x80deea, 0xce93d8];
const WORLD_DARK   = [0x1a5e20, 0x0d47a1, 0x7f0000, 0x004d61, 0x3c1053];

export default class LevelSelect extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  init(data) {
    this.currentWorld = data?.world || 1;
  }

  create() {
    this.save = JSON.parse(localStorage.getItem('blastSave') || '{}');
    this._drawBg();
    this._drawHeader();
    this._drawWorldTabs();
    this._drawLevels();
  }

  _drawBg() {
    const wi = this.currentWorld - 1;
    const g = this.add.graphics();
    g.fillGradientStyle(WORLD_DARK[wi], WORLD_DARK[wi], 0x0d0d2b, 0x0d0d2b, 1);
    g.fillRect(0, 0, W, H);
  }

  _drawHeader() {
    const backBtn = this.add.text(30, 50, '← 返回', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#aaaacc',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

    this.add.text(W / 2, 50, '选择关卡', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const wi = this.currentWorld - 1;
    this.add.text(W / 2, 82, WORLDS[wi].name, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px',
      color: '#' + WORLD_COLORS[wi].toString(16).padStart(6, '0'),
      letterSpacing: 6,
    }).setOrigin(0.5);
  }

  _drawWorldTabs() {
    const y = 116;
    WORLDS.forEach((w, i) => {
      const x = 48 + i * 80;
      const active = (i + 1) === this.currentWorld;
      const color  = WORLD_COLORS[i];

      const g = this.add.graphics();
      g.fillStyle(color, active ? 0.9 : 0.25);
      g.fillRoundedRect(x - 24, y - 16, 48, 32, 8);
      if (active) {
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeRoundedRect(x - 24, y - 16, 48, 32, 8);
      }
      g.setInteractive(new Phaser.Geom.Rectangle(x-24, y-16, 48, 32), Phaser.Geom.Rectangle.Contains);
      g.on('pointerdown', () => {
        this.currentWorld = i + 1;
        this.scene.restart({ world: i + 1 });
      });

      this.add.text(x, y, w.name, {
        fontFamily: 'Arial, sans-serif', fontSize: '13px',
        color: active ? '#ffffff' : '#aaaacc',
      }).setOrigin(0.5);
    });
  }

  _drawLevels() {
    const worldLevels = LEVELS.filter(l => l.world === this.currentWorld);
    const cols = 4;
    const startX = 40;
    const startY = 175;
    const cellW = (W - startX * 2) / cols;
    const cellH = 90;

    worldLevels.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * cellW + cellW / 2;
      const cy = startY + row * cellH + cellH / 2;

      const unlocked = level.id <= (this.save.unlocked || 1);
      const stars    = this.save.stars?.[level.id] || 0;
      const best     = this.save.scores?.[level.id] || 0;
      const wi       = this.currentWorld - 1;
      const color    = WORLD_COLORS[wi];

      // Card
      const g = this.add.graphics();
      g.fillStyle(unlocked ? color : 0x333355, unlocked ? 0.2 : 0.15);
      g.fillRoundedRect(cx - cellW/2 + 6, cy - 36, cellW - 12, 72, 10);
      g.lineStyle(2, unlocked ? color : 0x555577, unlocked ? 0.6 : 0.3);
      g.strokeRoundedRect(cx - cellW/2 + 6, cy - 36, cellW - 12, 72, 10);

      if (unlocked) {
        g.setInteractive(
          new Phaser.Geom.Rectangle(cx - cellW/2 + 6, cy - 36, cellW - 12, 72),
          Phaser.Geom.Rectangle.Contains
        );
        g.on('pointerover', () => { g.clear(); g.fillStyle(color, 0.4); g.fillRoundedRect(cx-cellW/2+6,cy-36,cellW-12,72,10); g.lineStyle(2,0xffffff,0.6); g.strokeRoundedRect(cx-cellW/2+6,cy-36,cellW-12,72,10); });
        g.on('pointerout',  () => { g.clear(); g.fillStyle(color,0.2); g.fillRoundedRect(cx-cellW/2+6,cy-36,cellW-12,72,10); g.lineStyle(2,color,0.6); g.strokeRoundedRect(cx-cellW/2+6,cy-36,cellW-12,72,10); });
        g.on('pointerdown', () => {
          this.tweens.add({ targets: g, scaleX: 0.94, scaleY: 0.94, duration: 80, yoyo: true });
          this.time.delayedCall(180, () => this.scene.start('Game', { levelId: level.id }));
        });
      }

      // Level number
      this.add.text(cx, cy - 16, `${level.id}`, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '22px',
        color: unlocked ? '#ffffff' : '#666688',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);

      // Level name
      this.add.text(cx, cy + 6, level.name, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px',
        color: unlocked ? '#ddddff' : '#555577',
      }).setOrigin(0.5);

      // Stars
      if (stars > 0) {
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        this.add.text(cx, cy + 24, starStr, {
          fontFamily: 'Arial, sans-serif', fontSize: '14px',
          color: '#ffd700',
        }).setOrigin(0.5);
      }

      // Lock icon
      if (!unlocked) {
        this.add.text(cx, cy + 6, '🔒', {
          fontSize: '20px',
        }).setOrigin(0.5);
      }
    });
  }
}
