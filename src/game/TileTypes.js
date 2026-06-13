// Tile color palettes (base, light highlight, dark shadow)
export const TILE_COLORS = [
  { base: 0xe74c3c, light: 0xff7675, dark: 0xc0392b }, // red
  { base: 0xe67e22, light: 0xfd9644, dark: 0xd35400 }, // orange
  { base: 0xf1c40f, light: 0xffeaa7, dark: 0xf39c12 }, // yellow
  { base: 0x2ecc71, light: 0x55efc4, dark: 0x27ae60 }, // green
  { base: 0x3498db, light: 0x74b9ff, dark: 0x2980b9 }, // blue
  { base: 0x9b59b6, light: 0xd980fa, dark: 0x8e44ad }, // purple
];

export const SPECIAL_COLORS = {
  stripe_h:  { base: 0xffd700, light: 0xfff176, dark: 0xf9a825 },
  stripe_v:  { base: 0x00e5ff, light: 0x80ffea, dark: 0x00b8d9 },
  bomb:      { base: 0xff1744, light: 0xff6090, dark: 0xc4001d },
  rainbow:   { base: 0xffffff, light: 0xffffff, dark: 0xcccccc },
};

export const OBSTACLE_COLORS = {
  stone: { base: 0x607d8b, light: 0x90a4ae, dark: 0x455a64 },
  ice:   { base: 0x80deea, light: 0xe0f7fa, dark: 0x4dd0e1 },
  lava:  { base: 0xff6f00, light: 0xffab40, dark: 0xe65100 },
};

/**
 * Draw a single tile onto a Phaser.GameObjects.Graphics object.
 * shape: 'rounded' | 'circle' | 'diamond' | 'hex' | 'star'
 * size: tile size in px (tile occupies size×size box)
 * colorSet: { base, light, dark }
 * selected: bool
 * special: null | 'stripe_h' | 'stripe_v' | 'bomb' | 'rainbow'
 */
export function drawTile(g, x, y, size, colorSet, shape, selected = false, special = null) {
  const s = size * 0.44;   // half-size of the shape
  const cx = x + size / 2;
  const cy = y + size / 2;

  g.save();

  // shadow
  g.fillStyle(0x000000, 0.25);
  drawShape(g, cx + 2, cy + 3, s, shape);
  g.fillPath();

  // base
  g.fillStyle(colorSet.dark, 1);
  drawShape(g, cx, cy, s, shape);
  g.fillPath();

  // highlight face (offset up-left)
  g.fillStyle(colorSet.base, 1);
  drawShape(g, cx - 1, cy - 1, s * 0.92, shape);
  g.fillPath();

  // shine (top-left glare)
  g.fillStyle(colorSet.light, 0.45);
  drawShine(g, cx - s * 0.3, cy - s * 0.35, s * 0.35, shape);
  g.fillPath();

  // selection ring
  if (selected) {
    g.lineStyle(3, 0xffffff, 0.9);
    drawShape(g, cx, cy, s + 3, shape);
    g.strokePath();
  }

  // special icon text rendered separately via Phaser Text objects
  g.restore();
}

function drawShape(g, cx, cy, r, shape) {
  g.beginPath();
  switch (shape) {
    case 'circle':
      g.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'diamond': {
      g.moveTo(cx, cy - r);
      g.lineTo(cx + r * 0.78, cy);
      g.lineTo(cx, cy + r);
      g.lineTo(cx - r * 0.78, cy);
      g.closePath();
      break;
    }
    case 'hex': {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.closePath();
      break;
    }
    case 'star': {
      const pts = 5, inner = r * 0.45;
      for (let i = 0; i < pts * 2; i++) {
        const a = (Math.PI / pts) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : inner;
        const px = cx + rad * Math.cos(a);
        const py = cy + rad * Math.sin(a);
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.closePath();
      break;
    }
    default: { // 'rounded'
      const rr = r * 0.22;
      g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, rr);
      return; // fillRoundedRect is a complete call, no fillPath needed
    }
  }
}

function drawShine(g, cx, cy, r, shape) {
  // simplified oval highlight
  g.beginPath();
  g.ellipse(cx, cy, r * 1.2, r * 0.7, -30 * (Math.PI / 180), 0, Math.PI * 2);
}

export const SHAPE_ICONS = {
  stripe_h: '━',
  stripe_v: '┃',
  bomb:     '💥',
  rainbow:  '🌈',
  stone:    '🪨',
  ice:      '❄',
  lava:     '🔥',
};

export const TILE_EMOJIS = ['🔴','🟠','🟡','🟢','🔵','🟣'];
