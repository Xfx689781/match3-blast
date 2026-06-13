import Phaser from 'phaser';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Generate all tile textures procedurally — no external assets needed
    this._makeGradientBg('bg_forest', 0x1b5e20, 0x2e7d32, 0x43a047);
    this._makeGradientBg('bg_ocean',  0x0d47a1, 0x1565c0, 0x1976d2);
    this._makeGradientBg('bg_fire',   0x4a0000, 0xb71c1c, 0xd32f2f);
    this._makeGradientBg('bg_ice',    0x0a1628, 0x0d47a1, 0x1565c0);
    this._makeGradientBg('bg_space',  0x020212, 0x0d0d2b, 0x1a1a4e);
  }

  _makeGradientBg(key, top, mid, bot) {
    const rt = this.textures.createCanvas(key, 480, 854);
    const ctx = rt.getContext();
    const grd = ctx.createLinearGradient(0, 0, 0, 854);
    grd.addColorStop(0,    '#' + top.toString(16).padStart(6, '0'));
    grd.addColorStop(0.5,  '#' + mid.toString(16).padStart(6, '0'));
    grd.addColorStop(1,    '#' + bot.toString(16).padStart(6, '0'));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 480, 854);
    rt.refresh();
  }

  create() {
    // Init save data
    if (!localStorage.getItem('blastSave')) {
      localStorage.setItem('blastSave', JSON.stringify({ unlocked: 1, stars: {}, scores: {} }));
    }
    this.scene.start('MainMenu');
  }
}
