import Phaser from 'phaser';
import { WORLDS } from '../data/levels.js';

const W = 480, H = 854;

export default class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    this._drawBg();
    this._drawTitle();
    this._drawPlayBtn();
    this._drawWorldPreviews();
    this._particles();
  }

  _drawBg() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x1a1a4e, 0x1a1a4e, 1);
    g.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Phaser.Math.FloatBetween(0.5, 2);
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      g.fillCircle(x, y, r);
    }
  }

  _drawTitle() {
    // Glow background for title
    const glow = this.add.graphics();
    glow.fillStyle(0x6c63ff, 0.15);
    glow.fillEllipse(W / 2, 180, 380, 140);

    this.add.text(W / 2, 130, 'BLAST', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '88px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#6c63ff',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 215, '& MATCH', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#ce93d8',
      letterSpacing: 10,
    }).setOrigin(0.5);

    // Floating animation
    this.tweens.add({
      targets: [glow],
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut',
    });
  }

  _drawPlayBtn() {
    const btnY = 340;
    const btn = this.add.graphics();
    btn.fillStyle(0x6c63ff, 1);
    btn.fillRoundedRect(W/2 - 110, btnY - 28, 220, 56, 28);
    btn.setInteractive(new Phaser.Geom.Rectangle(W/2 - 110, btnY - 28, 220, 56), Phaser.Geom.Rectangle.Contains);

    const label = this.add.text(W / 2, btnY, '开始游戏', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover',  () => { btn.clear(); btn.fillStyle(0x9c8fff,1); btn.fillRoundedRect(W/2-110,btnY-28,220,56,28); });
    btn.on('pointerout',   () => { btn.clear(); btn.fillStyle(0x6c63ff,1); btn.fillRoundedRect(W/2-110,btnY-28,220,56,28); });
    btn.on('pointerdown',  () => {
      this.tweens.add({ targets: [btn, label], scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true });
      this.time.delayedCall(200, () => this.scene.start('LevelSelect', { world: 1 }));
    });

    // Pulse
    this.tweens.add({
      targets: [btn, label],
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut',
    });
  }

  _drawWorldPreviews() {
    const startY = 430;
    const themeColors = [0x2ecc71, 0x3498db, 0xe74c3c, 0x80deea, 0xce93d8];
    const shapes = ['rounded', 'circle', 'diamond', 'hex', 'star'];

    this.add.text(W / 2, startY - 20, '5 个世界 · 20 关卡', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#aaaacc',
      letterSpacing: 4,
    }).setOrigin(0.5);

    WORLDS.forEach((world, i) => {
      const x = 40 + i * 84;
      const y = startY + 40;

      // World icon circle
      const g = this.add.graphics();
      g.fillStyle(themeColors[i], 0.25);
      g.fillCircle(x + 32, y, 32);
      g.lineStyle(2, themeColors[i], 0.8);
      g.strokeCircle(x + 32, y, 32);

      // Mini shape
      this._drawMiniShape(g, x + 32, y, 14, themeColors[i], shapes[i]);

      this.add.text(x + 32, y + 46, world.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#ddddff',
      }).setOrigin(0.5);
    });
  }

  _drawMiniShape(g, cx, cy, r, color, shape) {
    g.fillStyle(color, 1);
    g.lineStyle(0, 0, 0);
    switch (shape) {
      case 'circle':
        g.fillCircle(cx, cy, r); break;
      case 'diamond':
        g.fillTriangle(cx, cy-r, cx+r*0.8, cy, cx, cy+r);
        g.fillTriangle(cx, cy-r, cx-r*0.8, cy, cx, cy+r); break;
      case 'hex':
        g.fillPoints(Array.from({length:6},(_,i)=>{
          const a=(Math.PI/3)*i-Math.PI/6;
          return new Phaser.Geom.Point(cx+r*Math.cos(a), cy+r*Math.sin(a));
        }), true); break;
      case 'star': {
        const pts=[];
        for(let i=0;i<10;i++){
          const a=(Math.PI/5)*i-Math.PI/2;
          const rad=i%2===0?r:r*0.45;
          pts.push(new Phaser.Geom.Point(cx+rad*Math.cos(a),cy+rad*Math.sin(a)));
        }
        g.fillPoints(pts,true); break;
      }
      default:
        g.fillRoundedRect(cx-r,cy-r,r*2,r*2,r*0.3);
    }
  }

  _particles() {
    // Floating sparkles
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(H * 0.55, H);
      const dot = this.add.graphics();
      dot.fillStyle(0xce93d8, 0.6);
      dot.fillCircle(0, 0, Phaser.Math.Between(2, 4));
      dot.x = x; dot.y = y;
      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(60, 150),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => { dot.x = Phaser.Math.Between(20, W-20); dot.y = y; dot.alpha = 0.6; }
      });
    }
  }
}
