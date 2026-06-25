export const AVATAR_CONFIGS = {
  1: { bgColor: '#6C3CF7', pattern: 'hexagon'   },
  2: { bgColor: '#0EA5E9', pattern: 'rings'     },
  3: { bgColor: '#EF4444', pattern: 'triangles' },
  4: { bgColor: '#10B981', pattern: 'diamond'   },
  5: { bgColor: '#F59E0B', pattern: 'starburst' },
  6: { bgColor: '#EC4899', pattern: 'circles'   },
  7: { bgColor: '#3B82F6', pattern: 'grid'      },
  8: { bgColor: '#0D9488', pattern: 'spiral'    },
};

function hexPoints(cx, cy, r, rotDeg = 0) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30 + rotDeg) * Math.PI / 180;
    pts.push(`${Math.round((cx + r * Math.cos(angle)) * 10) / 10},${Math.round((cy + r * Math.sin(angle)) * 10) / 10}`);
  }
  return pts.join(' ');
}

function svgWrap(bgColor, size, content) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="50" cy="50" r="50" fill="${bgColor}"/>
  ${content}
</svg>`;
}

function hexagonSVG(size) {
  const bg = AVATAR_CONFIGS[1].bgColor;
  const centerHex = hexPoints(50, 50, 28);
  const smallHexes = [];
  const centers = [
    [90, 50], [70, 84.6], [30, 84.6],
    [10, 50], [30, 15.4], [70, 15.4]
  ];
  for (const [cx, cy] of centers) {
    smallHexes.push(hexPoints(cx, cy, 10));
  }
  return svgWrap(bg, size, `
    <polygon points="${centerHex}" fill="white" opacity="0.9"/>
    ${smallHexes.map(p => `<polygon points="${p}" fill="white" opacity="0.35"/>`).join('\n    ')}
  `);
}

function ringsSVG(size) {
  const bg = AVATAR_CONFIGS[2].bgColor;
  return svgWrap(bg, size, `
    <circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="5" opacity="0.85"/>
    <circle cx="50" cy="50" r="23" fill="none" stroke="white" stroke-width="5" opacity="0.65"/>
    <circle cx="50" cy="50" r="11" fill="none" stroke="white" stroke-width="5" opacity="0.9"/>
    <circle cx="50" cy="50" r="5" fill="white"/>
    <circle cx="50" cy="7" r="4" fill="white" opacity="0.7"/>
    <circle cx="93" cy="50" r="4" fill="white" opacity="0.7"/>
    <circle cx="50" cy="93" r="4" fill="white" opacity="0.7"/>
    <circle cx="7" cy="50" r="4" fill="white" opacity="0.7"/>
  `);
}

function trianglesSVG(size) {
  const bg = AVATAR_CONFIGS[3].bgColor;
  return svgWrap(bg, size, `
    <polygon points="50,12 82,68 18,68" fill="white" opacity="0.9"/>
    <polygon points="50,88 18,32 82,32" fill="white" opacity="0.35"/>
    <polygon points="50,36 62,58 38,58" fill="${bg}"/>
    <polygon points="50,64 62,42 38,42" fill="${bg}"/>
  `);
}

function diamondSVG(size) {
  const bg = AVATAR_CONFIGS[4].bgColor;
  return svgWrap(bg, size, `
    <polygon points="50,8 92,50 50,92 8,50" fill="white" opacity="0.9"/>
    <polygon points="50,22 78,50 50,78 22,50" fill="${bg}"/>
    <polygon points="50,34 66,50 50,66 34,50" fill="white" opacity="0.9"/>
    <polygon points="50,1 56,5 50,9 44,5" fill="white" opacity="0.5"/>
    <polygon points="99,50 95,56 91,50 95,44" fill="white" opacity="0.5"/>
    <polygon points="50,99 44,95 50,91 56,95" fill="white" opacity="0.5"/>
    <polygon points="1,50 5,44 9,50 5,56" fill="white" opacity="0.5"/>
  `);
}

function starburstSVG(size) {
  const bg = AVATAR_CONFIGS[5].bgColor;
  return svgWrap(bg, size, `
    <polygon points="35,20 80,35 65,80 20,65" fill="white" opacity="0.85"/>
    <polygon points="50,15 85,50 50,85 15,50" fill="white" opacity="0.85"/>
    <circle cx="50" cy="50" r="18" fill="${bg}"/>
    <circle cx="50" cy="50" r="10" fill="white" opacity="0.9"/>
  `);
}

function circlesSVG(size) {
  const bg = AVATAR_CONFIGS[6].bgColor;
  return svgWrap(bg, size, `
    <circle cx="50" cy="50" r="18" fill="white" opacity="0.9"/>
    <circle cx="50" cy="24" r="14" fill="white" opacity="0.55"/>
    <circle cx="72.5" cy="37" r="14" fill="white" opacity="0.55"/>
    <circle cx="72.5" cy="63" r="14" fill="white" opacity="0.55"/>
    <circle cx="50" cy="76" r="14" fill="white" opacity="0.55"/>
    <circle cx="27.5" cy="63" r="14" fill="white" opacity="0.55"/>
    <circle cx="27.5" cy="37" r="14" fill="white" opacity="0.55"/>
    <circle cx="50" cy="6" r="5" fill="white" opacity="0.4"/>
    <circle cx="88" cy="28" r="5" fill="white" opacity="0.4"/>
    <circle cx="88" cy="72" r="5" fill="white" opacity="0.4"/>
    <circle cx="50" cy="94" r="5" fill="white" opacity="0.4"/>
    <circle cx="12" cy="72" r="5" fill="white" opacity="0.4"/>
    <circle cx="12" cy="28" r="5" fill="white" opacity="0.4"/>
  `);
}

function gridSVG(size) {
  const bg = AVATAR_CONFIGS[7].bgColor;
  return svgWrap(bg, size, `
    <rect x="18" y="25" width="64" height="11" rx="5" fill="white" opacity="0.85"/>
    <rect x="18" y="45" width="64" height="11" rx="5" fill="white" opacity="0.85"/>
    <rect x="18" y="65" width="64" height="11" rx="5" fill="white" opacity="0.85"/>
    <rect x="25" y="18" width="11" height="64" rx="5" fill="${bg}"/>
    <rect x="45" y="18" width="11" height="64" rx="5" fill="${bg}"/>
    <rect x="65" y="18" width="11" height="64" rx="5" fill="${bg}"/>
  `);
}

function spiralSVG(size) {
  const bg = AVATAR_CONFIGS[8].bgColor;
  return svgWrap(bg, size, `
    <rect x="20" y="20" width="60" height="60" fill="white" opacity="0.25" transform="rotate(0, 50, 50)"/>
    <rect x="27" y="27" width="46" height="46" fill="white" opacity="0.45" transform="rotate(15, 50, 50)"/>
    <rect x="34" y="34" width="32" height="32" fill="white" opacity="0.65" transform="rotate(30, 50, 50)"/>
    <rect x="41" y="41" width="18" height="18" fill="white" opacity="0.9" transform="rotate(45, 50, 50)"/>
  `);
}

const SVG_GENERATORS = {
  1: hexagonSVG,
  2: ringsSVG,
  3: trianglesSVG,
  4: diamondSVG,
  5: starburstSVG,
  6: circlesSVG,
  7: gridSVG,
  8: spiralSVG,
};

export function getAvatarSVG(avatarId, size = 100) {
  const gen = SVG_GENERATORS[avatarId] || SVG_GENERATORS[1];
  return gen(size);
}

export function getAvatarHTML(avatarId, size = 100) {
  return `<div style="display:inline-flex;border-radius:50%;overflow:hidden;width:${size}px;height:${size}px;flex-shrink:0">${getAvatarSVG(avatarId, size)}</div>`;
}

export function createAvatarElement(avatarId, size = 100) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `display:inline-flex;border-radius:50%;overflow:hidden;width:${size}px;height:${size}px;flex-shrink:0`;
  wrapper.innerHTML = getAvatarSVG(avatarId, size);
  return wrapper;
}
