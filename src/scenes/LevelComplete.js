import Phaser from 'phaser';
import { t, toggleLang } from '../data/i18n.js';

const W = 480, H = 854;
const WORLD_COLORS = [0x2ecc71, 0x3498db, 0xe74c3c, 0x80deea, 0xce93d8];

export default class LevelComplete extends Phaser.Scene {
  constructor() { super('LevelComplete'); }

  init(data) {
    this.result = data;
  }

  create() {
    const { won, stars, score, levelId, world } = this.result;
    const wc = WORLD_COLORS[(world || 1) - 1];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });

    const card = this.add.graphics();
    card.fillStyle(0x1a1a3e, 1);
    card.fillRoundedRect(W/2 - 170, H/2 - 220, 340, 440, 20);
    card.lineStyle(3, wc, 0.8);
    card.strokeRoundedRect(W/2 - 170, H/2 - 220, 340, 440, 20);
    card.setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: card, alpha: 1, scaleX: 1, scaleY: 1, duration: 350, ease: 'Back.out' });

    const cy = H / 2;

    // Title
    const titleTxt = this.add.text(W/2, cy - 190, won ? t('win') : t('lose'), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '32px',
      color: won ? '#ffd700' : '#ff6666',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: titleTxt, alpha: 1, duration: 300, delay: 200 });

    // Emoji
    const em = this.add.text(W/2, cy - 130, won ? '🎉' : '💀', { fontSize: '64px' })
      .setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: em, alpha: 1, scaleX: 1.2, scaleY: 1.2, yoyo: true, duration: 400, delay: 250 });

    // Stars
    if (won) this._drawStars(stars, cy - 50);

    // Score label
    this.add.text(W/2, cy + 20, t('score'), {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#aaaacc',
    }).setOrigin(0.5);

    const scoreTxt = this.add.text(W/2, cy + 50, '0', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '36px',
      color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.addCounter({
      from: 0, to: score, duration: 900, delay: 400,
      onUpdate: tw => scoreTxt.setText(Math.floor(tw.getValue()).toLocaleString()),
    });

    // Buttons
    const hasNext = levelId < 20 && won;
    if (hasNext) {
      this._makeBtn(W/2, cy + 130, t('nextLevel'), wc,
        () => this.scene.start('Game', { levelId: levelId + 1 }));
    }

    const retryX = hasNext ? W/2 - 88 : W/2 - 88;
    this._makeBtn(retryX, cy + 185, t('retry'),  0x555588, () => this.scene.start('Game', { levelId }));
    this._makeBtn(W/2 + 88, cy + 185, t('levels'), 0x334466, () => this.scene.start('LevelSelect', { world }));

    // Lang toggle
    this.add.text(W - 16, 16, t('lang'), {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#6c63ff99',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { toggleLang(); this.scene.restart(this.result); });

    if (won) this._confetti(wc);
  }

  _drawStars(count, y) {
    [-70, 0, 70].forEach((ox, i) => {
      const filled = i < count;
      const star = this.add.text(W/2 + ox, y, filled ? '★' : '☆', {
        fontFamily: 'Arial, sans-serif', fontSize: '46px',
        color: filled ? '#ffd700' : '#444466',
      }).setOrigin(0.5).setAlpha(0).setScale(0.3);

      this.tweens.add({
        targets: star, alpha: 1, scaleX: 1, scaleY: 1,
        duration: 300, delay: 350 + i * 150, ease: 'Back.out',
        onComplete: () => {
          if (filled) this.tweens.add({ targets: star, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: 1, duration: 120 });
        },
      });
    });
  }

  _makeBtn(x, y, label, color, cb) {
    const bw = 160, bh = 44;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - bw/2, y - bh/2, bw, bh, 10);
    g.setInteractive(new Phaser.Geom.Rectangle(x-bw/2, y-bh/2, bw, bh), Phaser.Geom.Rectangle.Contains);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '17px',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    g.on('pointerover', () => { g.clear(); g.fillStyle(0xffffff,0.15); g.fillRoundedRect(x-bw/2,y-bh/2,bw,bh,10); g.fillStyle(color,0.8); g.fillRoundedRect(x-bw/2,y-bh/2,bw,bh,10); });
    g.on('pointerout',  () => { g.clear(); g.fillStyle(color,1); g.fillRoundedRect(x-bw/2,y-bh/2,bw,bh,10); });
    g.on('pointerdown', () => {
      this.tweens.add({ targets:[g,txt], scaleX:0.94, scaleY:0.94, duration:80, yoyo:true });
      this.time.delayedCall(180, cb);
    });
  }

  _confetti(baseColor) {
    const colors = [0xffd700, 0xff6b6b, 0x74b9ff, 0x55efc4, baseColor, 0xfdcb6e];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, W);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const dot = this.add.graphics();
      dot.fillStyle(color, 1);
      dot.fillRect(-4, -4, 8, 5);
      dot.x = x; dot.y = -10;
      dot.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.tweens.add({
        targets: dot,
        y: H + 20,
        rotation: dot.rotation + Phaser.Math.FloatBetween(-4, 4),
        x: x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(1200, 2800),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Sine.easeIn',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
