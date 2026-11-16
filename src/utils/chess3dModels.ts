import * as THREE from 'three';
import { PieceSymbol } from 'chess.js';
import { BoardThemeId, PlayerColor } from '../types/chess';

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.08,
      size / 2,
      size / 2,
      size * 0.48
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.26)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBoardSquareTexture(
  baseHex: string,
  grainHex: string,
  anisotropy: number,
  seedOffset = 0
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    // Subtle directional wood / marble veining
    ctx.strokeStyle = grainHex;
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 52; i++) {
      const y = (i / 52) * size;
      ctx.lineWidth = 1 + (i % 3) * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.32,
        y + Math.sin(i * 0.75 + seedOffset) * 10,
        size * 0.68,
        y - Math.cos(i * 0.55 + seedOffset) * 10,
        size,
        y + (i % 2 === 0 ? 3.5 : -3.5)
      );
      ctx.stroke();
    }

    // Crisp chamfer border on all 4 sides of each square tile ("khana")
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, size - 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(size - 2, 2);
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(size - 2, 2);
    ctx.lineTo(size - 2, size - 2);
    ctx.lineTo(2, size - 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBoardFrameTexture(
  frameHex: string,
  anisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = frameHex;
    ctx.fillRect(0, 0, size, size);

    // Rich satin wood grain on outer frame
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 96; i++) {
      const y = (i / 96) * size;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + Math.sin(i * 0.6) * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Double brass inlay border
    ctx.strokeStyle = '#D9A73E';
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, size - 32, size - 32);

    ctx.strokeStyle = 'rgba(217, 167, 62, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, size - 56, size - 56);

    // Frame is 9.4 units wide, inner board is 8.0 units -> margin = 0.7 / 9.4
    const margin = (0.7 / 9.4) * size;
    const sqPx = (size - margin * 2) / 8;

    ctx.fillStyle = '#F2D680';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    for (let i = 0; i < 8; i++) {
      const cx = margin + sqPx * (i + 0.5);
      ctx.fillText(files[i], cx, size - margin * 0.45);
      ctx.save();
      ctx.translate(cx, margin * 0.45);
      ctx.rotate(Math.PI);
      ctx.fillText(files[i], 0, 0);
      ctx.restore();

      const cy = margin + sqPx * (i + 0.5);
      ctx.fillText(ranks[i], margin * 0.45, cy);
      ctx.save();
      ctx.translate(size - margin * 0.45, cy);
      ctx.rotate(Math.PI);
      ctx.fillText(ranks[i], 0, 0);
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createArenaTableTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      36,
      size / 2,
      size / 2,
      size * 0.5
    );
    grad.addColorStop(0, '#233042');
    grad.addColorStop(0.5, '#161F2C');
    grad.addColorStop(1, '#0C1119');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle concentric championship rings
    ctx.strokeStyle = 'rgba(232, 184, 75, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.37, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function getTheme3DColors(themeId: BoardThemeId) {
  switch (themeId) {
    case 'emerald':
      return {
        light: '#F4F0DC',
        lightGrain: '#D0C9A6',
        dark: '#2E6B44',
        darkGrain: '#1B472B',
        frame: '#213528',
      };
    case 'slate':
      return {
        light: '#E7EDF5',
        lightGrain: '#B3C0CF',
        dark: '#3D506B',
        darkGrain: '#243247',
        frame: '#1A2332',
      };
    case 'walnut':
    default:
      return {
        light: '#F6E6CC',
        lightGrain: '#D3B389',
        dark: '#8C522B',
        darkGrain: '#593116',
        frame: '#3D2314',
      };
  }
}

export interface PieceMaterials {
  whiteBody: THREE.MeshPhysicalMaterial;
  whiteTrim: THREE.MeshStandardMaterial;
  blackBody: THREE.MeshPhysicalMaterial;
  blackTrim: THREE.MeshStandardMaterial;
  feltBase: THREE.MeshStandardMaterial;
  shadowMat: THREE.MeshBasicMaterial;
}

export function createPieceMaterials(shadowTex: THREE.CanvasTexture): PieceMaterials {
  return {
    whiteBody: new THREE.MeshPhysicalMaterial({
      color: 0xf9efe0,
      roughness: 0.24,
      metalness: 0.03,
      clearcoat: 0.68,
      clearcoatRoughness: 0.14,
    }),
    whiteTrim: new THREE.MeshStandardMaterial({
      color: 0xd9a841,
      roughness: 0.22,
      metalness: 0.86,
    }),
    blackBody: new THREE.MeshPhysicalMaterial({
      color: 0x333a47,
      roughness: 0.22,
      metalness: 0.14,
      clearcoat: 0.78,
      clearcoatRoughness: 0.12,
    }),
    blackTrim: new THREE.MeshStandardMaterial({
      color: 0xf0c756,
      roughness: 0.2,
      metalness: 0.88,
    }),
    feltBase: new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.92,
      metalness: 0.0,
    }),
    shadowMat: new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    }),
  };
}

function makeLathe(points: [number, number][], segments = 30): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(vecs, segments);
}

/**
 * Builds a sculptural, luxury Staunton 3D piece grounded flush at y = 0 with baked contact shadow.
 */
export function buildStauntonPiece(
  type: PieceSymbol,
  color: PlayerColor,
  mats: PieceMaterials
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = color === 'w' ? mats.whiteBody : mats.blackBody;
  const trimMat = color === 'w' ? mats.whiteTrim : mats.blackTrim;

  // Grounded contact shadow disc so pieces never look floating
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), mats.shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.008;
  group.add(shadowDisc);

  // Baize felt pad at base
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.35, 0.024, 30), mats.feltBase);
  felt.position.y = 0.014;
  felt.receiveShadow = true;
  group.add(felt);

  if (type === 'p') {
    const bodyGeo = makeLathe([
      [0.33, 0.024],
      [0.33, 0.095],
      [0.27, 0.15],
      [0.19, 0.22],
      [0.11, 0.51],
      [0.195, 0.55],
      [0.195, 0.6],
      [0.09, 0.63],
      [0.0, 0.64],
    ]);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 12, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.57;
    group.add(collar);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 26, 22), bodyMat);
    head.position.y = 0.77;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
  } else if (type === 'r') {
    const bodyGeo = makeLathe([
      [0.35, 0.024],
      [0.35, 0.105],
      [0.28, 0.165],
      [0.215, 0.25],
      [0.185, 0.72],
      [0.275, 0.78],
      [0.275, 0.87],
      [0.145, 0.87],
      [0.145, 0.79],
      [0.0, 0.79],
    ]);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.026, 12, 28), trimMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.765;
    group.add(ring);

    const merlonGeo = new THREE.BoxGeometry(0.115, 0.145, 0.088);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const merlon = new THREE.Mesh(merlonGeo, bodyMat);
      merlon.position.set(Math.cos(angle) * 0.215, 0.94, Math.sin(angle) * 0.215);
      merlon.rotation.y = -angle + Math.PI / 2;
      merlon.castShadow = true;
      merlon.receiveShadow = true;
      group.add(merlon);
    }
  } else if (type === 'n') {
    // Stepped turned base
    const baseGeo = makeLathe([
      [0.36, 0.024],
      [0.36, 0.11],
      [0.29, 0.17],
      [0.22, 0.24],
      [0.0, 0.24],
    ]);
    const base = new THREE.Mesh(baseGeo, bodyMat);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.026, 12, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.22;
    group.add(collar);

    // Sculpted 3D Horse Assembly (Chest, Arched Neck, Head, Snout, Ears, Mane)
    const horseGroup = new THREE.Group();

    // Muscular curved neck column
    const neckGeo = makeLathe(
      [
        [0.2, 0.22],
        [0.19, 0.36],
        [0.16, 0.56],
        [0.13, 0.74],
        [0.0, 0.76],
      ],
      24
    );
    const neck = new THREE.Mesh(neckGeo, bodyMat);
    neck.scale.set(0.9, 1, 1.25);
    neck.rotation.x = -0.22;
    neck.position.set(0, 0.02, -0.02);
    neck.castShadow = true;
    neck.receiveShadow = true;
    horseGroup.add(neck);

    // Full-bodied sculpted profile crest & head
    const profile = new THREE.Shape();
    profile.moveTo(-0.14, 0.23);
    profile.lineTo(0.16, 0.23);
    profile.quadraticCurveTo(0.18, 0.52, 0.09, 0.72);
    profile.lineTo(0.26, 0.8);
    profile.lineTo(0.27, 0.91);
    profile.lineTo(0.1, 1.03);
    profile.lineTo(0.02, 1.06);
    profile.quadraticCurveTo(-0.22, 0.88, -0.18, 0.48);
    profile.closePath();

    const headGeo = new THREE.ExtrudeGeometry(profile, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.045,
      bevelSegments: 5,
    });
    headGeo.translate(0, 0, -0.11);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.rotation.y = Math.PI / 2;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    horseGroup.add(headMesh);

    // Rounded snout / muzzle cap
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), bodyMat);
    snout.scale.set(0.85, 0.82, 1.15);
    snout.position.set(0, 0.84, 0.22);
    snout.castShadow = true;
    horseGroup.add(snout);

    // Sculpted mane crest ridge along back of neck
    for (let i = 0; i < 4; i++) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.09), trimMat);
      tuft.position.set(0, 0.48 + i * 0.135, -0.175 + i * 0.015);
      tuft.rotation.x = 0.25;
      tuft.castShadow = true;
      horseGroup.add(tuft);
    }

    // Twin 3D pointed ears
    const earGeo = new THREE.ConeGeometry(0.046, 0.15, 12);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(-0.075, 1.09, -0.02);
    leftEar.rotation.z = 0.14;
    leftEar.rotation.x = 0.15;
    leftEar.castShadow = true;
    horseGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, bodyMat);
    rightEar.position.set(0.075, 1.09, -0.02);
    rightEar.rotation.z = -0.14;
    rightEar.rotation.x = 0.15;
    rightEar.castShadow = true;
    horseGroup.add(rightEar);

    // White knights face Black (-Z), Black knights face White (+Z)
    horseGroup.rotation.y = color === 'w' ? Math.PI : 0;
    group.add(horseGroup);
  } else if (type === 'b') {
    const bodyGeo = makeLathe([
      [0.35, 0.024],
      [0.35, 0.105],
      [0.27, 0.175],
      [0.2, 0.25],
      [0.115, 0.65],
      [0.21, 0.7],
      [0.21, 0.755],
      [0.13, 0.785],
      [0.195, 0.94],
      [0.125, 1.08],
      [0.0, 1.15],
    ]);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.026, 12, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.72;
    group.add(collar);

    const mitreBand = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 10, 24), trimMat);
    mitreBand.rotation.x = Math.PI / 3;
    mitreBand.rotation.z = 0.35;
    mitreBand.position.y = 0.96;
    group.add(mitreBand);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 16), trimMat);
    finial.position.y = 1.2;
    finial.castShadow = true;
    group.add(finial);
  } else if (type === 'q') {
    const bodyGeo = makeLathe([
      [0.37, 0.024],
      [0.37, 0.12],
      [0.29, 0.19],
      [0.21, 0.28],
      [0.125, 0.76],
      [0.24, 0.83],
      [0.24, 0.885],
      [0.15, 0.915],
      [0.265, 1.13],
      [0.15, 1.13],
      [0.09, 1.23],
      [0.0, 1.25],
    ]);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 12, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.855;
    group.add(collar);

    const pearlGeo = new THREE.SphereGeometry(0.044, 14, 12);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pearl = new THREE.Mesh(pearlGeo, trimMat);
      pearl.position.set(Math.cos(a) * 0.235, 1.15, Math.sin(a) * 0.235);
      pearl.castShadow = true;
      group.add(pearl);
    }

    const crownOrb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 16), trimMat);
    crownOrb.position.y = 1.3;
    crownOrb.castShadow = true;
    group.add(crownOrb);
  } else if (type === 'k') {
    const bodyGeo = makeLathe([
      [0.38, 0.024],
      [0.38, 0.13],
      [0.3, 0.2],
      [0.22, 0.29],
      [0.135, 0.83],
      [0.26, 0.91],
      [0.26, 0.96],
      [0.16, 0.99],
      [0.245, 1.21],
      [0.1, 1.26],
      [0.0, 1.27],
    ]);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 12, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.93;
    group.add(collar);

    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.27, 0.078), trimMat);
    crossVert.position.y = 1.39;
    crossVert.castShadow = true;
    group.add(crossVert);

    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.068, 0.078), trimMat);
    crossHoriz.position.y = 1.43;
    crossHoriz.castShadow = true;
    group.add(crossHoriz);
  }

  group.scale.setScalar(1.04);
  return group;
}
