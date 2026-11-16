import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { BoardThemeId, PlayerColor } from '../types/chess';
import {
  buildStauntonPiece,
  createArenaTableTexture,
  createBoardFrameTexture,
  createBoardSquareTexture,
  createContactShadowTexture,
  createPieceMaterials,
  getTheme3DColors,
} from '../utils/chess3dModels';
import { PieceSvg } from './ChessPieces';

interface ChessBoard3DProps {
  fen: string;
  orientation: PlayerColor;
  themeId: BoardThemeId;
  canInteract: boolean;
  playerTurnColor: PlayerColor | 'both';
  lastMove: { from: string; to: string } | null;
  isReviewing: boolean;
  onAttemptMove: (from: string, to: string, promotion?: PieceSymbol) => boolean;
}

type CameraPreset = 'classic' | 'broadcast' | 'duel' | 'top';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function squareToWorld(sq: string): THREE.Vector3 {
  const fileIdx = FILES.indexOf(sq[0]);
  const rankIdx = RANKS.indexOf(sq[1]);
  return new THREE.Vector3(fileIdx - 3.5, 0, rankIdx - 3.5);
}

function getPresetPosition(preset: CameraPreset, orientation: PlayerColor): THREE.Vector3 {
  const sign = orientation === 'w' ? 1 : -1;
  switch (preset) {
    case 'broadcast':
      return new THREE.Vector3(0, 7.2, 13.8 * sign);
    case 'duel':
      return new THREE.Vector3(8.8 * sign, 9.4, 10.2 * sign);
    case 'top':
      return new THREE.Vector3(0, 15.8, 1.4 * sign);
    case 'classic':
    default:
      return new THREE.Vector3(0, 10.4, 12.0 * sign);
  }
}

interface ActiveGlide {
  group: THREE.Group;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  duration: number;
  isJump: boolean;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export const ChessBoard3D: React.FC<ChessBoard3DProps> = ({
  fen,
  orientation,
  themeId,
  canInteract,
  playerTurnColor,
  lastMove,
  isReviewing,
  onAttemptMove,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('classic');
  const [orbitLocked, setOrbitLocked] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: PlayerColor;
  } | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const activeTurn = chess.turn();
  const isPlayerAllowed =
    canInteract &&
    !isReviewing &&
    (playerTurnColor === 'both' || playerTurnColor === activeTurn);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !isPlayerAllowed) return new Map<Square, Move>();
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    const map = new Map<Square, Move>();
    for (const m of moves) map.set(m.to, m);
    return map;
  }, [chess, isPlayerAllowed, selectedSquare]);

  const stateRef = useRef({
    fen,
    chess,
    orientation,
    themeId,
    selectedSquare,
    hoveredSquare,
    legalTargets,
    lastMove,
    isPlayerAllowed,
    pendingPromotion,
    onAttemptMove,
  });
  stateRef.current = {
    fen,
    chess,
    orientation,
    themeId,
    selectedSquare,
    hoveredSquare,
    legalTargets,
    lastMove,
    isPlayerAllowed,
    pendingPromotion,
    onAttemptMove,
  };

  const sceneApiRef = useRef<{
    syncBoard: (moveHint: { from: string; to: string } | null) => void;
    syncHighlights: () => void;
    applyTheme: (id: BoardThemeId) => void;
    moveCameraTo: (preset: CameraPreset, orient: PlayerColor) => void;
    setOrbitEnabled: (enabled: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x220e04);
    scene.fog = new THREE.FogExp2(0x220e04, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 120);
    camera.position.copy(getPresetPosition('classic', stateRef.current.orientation));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.25, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 8.5;
    controls.maxDistance = 21.0;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.update();

    // Tournament Studio 3-Point + Warm Overhead + Cool Rim Lighting
    const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.95);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(6.2, 13.0, 7.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -6.2;
    keyLight.shadow.camera.right = 6.2;
    keyLight.shadow.camera.top = 6.2;
    keyLight.shadow.camera.bottom = -6.2;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.15);
    rimLight.position.set(-7.5, 7.5, -8.5);
    scene.add(rimLight);

    const warmBackAccent = new THREE.PointLight(0xf59e0b, 1.5, 24, 1.4);
    warmBackAccent.position.set(0, 6.0, -6.5);
    scene.add(warmBackAccent);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Tournament Table Pedestal
    const tableTex = createArenaTableTexture(maxAniso);
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTex,
      roughness: 0.68,
      metalness: 0.14,
    });
    const tableGeo = new THREE.CylinderGeometry(14, 14, 0.44, 60);
    const tablePlane = new THREE.Mesh(tableGeo, tableMat);
    tablePlane.position.y = -0.5;
    tablePlane.receiveShadow = true;
    scene.add(tablePlane);

    // Crafted Wooden Board Chassis with Brass Trim & Corner Plates
    const frameSideMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314,
      roughness: 0.34,
      metalness: 0.12,
    });
    const frameTopMat = new THREE.MeshStandardMaterial({
      roughness: 0.34,
      metalness: 0.12,
    });
    const frameGeo = new THREE.BoxGeometry(9.4, 0.28, 9.4);
    const frameMesh = new THREE.Mesh(frameGeo, [
      frameSideMat,
      frameSideMat,
      frameTopMat,
      frameSideMat,
      frameSideMat,
      frameSideMat,
    ]);
    frameMesh.position.y = -0.182; // top face at y = -0.042
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    scene.add(frameMesh);

    const lowerSkirtGeo = new THREE.BoxGeometry(9.64, 0.14, 9.64);
    const lowerSkirtMat = new THREE.MeshStandardMaterial({
      color: 0x1a120d,
      roughness: 0.5,
      metalness: 0.2,
    });
    const lowerSkirt = new THREE.Mesh(lowerSkirtGeo, lowerSkirtMat);
    lowerSkirt.position.y = -0.265;
    lowerSkirt.receiveShadow = true;
    scene.add(lowerSkirt);

    // Brushed Brass Inner Trim & 4 Corner Brackets
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe2b64b,
      roughness: 0.22,
      metalness: 0.88,
    });
    const inlayGeo = new THREE.BoxGeometry(8.22, 0.02, 8.22);
    const inlayMesh = new THREE.Mesh(inlayGeo, brassMat);
    inlayMesh.position.y = -0.046; // top face at y = -0.036
    scene.add(inlayMesh);

    const groutGeo = new THREE.BoxGeometry(8.04, 0.02, 8.04);
    const groutMat = new THREE.MeshStandardMaterial({
      color: 0x14100d,
      roughness: 0.85,
      metalness: 0.05,
    });
    const groutMesh = new THREE.Mesh(groutGeo, groutMat);
    groutMesh.position.y = -0.032; // top face at y = -0.022 (safely BELOW the 64 squares!)
    scene.add(groutMesh);

    const cornerGeo = new THREE.BoxGeometry(0.38, 0.3, 0.38);
    const cornerOffsets: [number, number][] = [
      [-4.6, -4.6],
      [4.6, -4.6],
      [-4.6, 4.6],
      [4.6, 4.6],
    ];
    for (const [cx, cz] of cornerOffsets) {
      const bracket = new THREE.Mesh(cornerGeo, brassMat);
      bracket.position.set(cx, -0.18, cz);
      bracket.castShadow = true;
      scene.add(bracket);
    }

    // 64 Raised Chamfered Squares (top face at exact y = 0.000, above grout at -0.022)
    const squareMeshes = new Map<string, THREE.Mesh>();
    const padMeshes = new Map<string, THREE.Mesh>();
    const ringMeshes = new Map<string, THREE.Mesh>();
    const orbMeshes = new Map<string, THREE.Mesh>();

    const squareGeo = new THREE.BoxGeometry(0.972, 0.05, 0.972);
    const padGeo = new THREE.PlaneGeometry(0.92, 0.92);
    padGeo.rotateX(-Math.PI / 2);
    const ringGeo = new THREE.RingGeometry(0.32, 0.45, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const orbGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.045, 24);

    const lightMat = new THREE.MeshStandardMaterial({ roughness: 0.34, metalness: 0.04 });
    const darkMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.08 });
    let lightTex: THREE.CanvasTexture | null = null;
    let darkTex: THREE.CanvasTexture | null = null;
    let frameTex: THREE.CanvasTexture | null = null;

    const applyTheme = (id: BoardThemeId) => {
      const cols = getTheme3DColors(id);
      frameSideMat.color.set(cols.frame);
      lightTex?.dispose();
      darkTex?.dispose();
      frameTex?.dispose();
      lightTex = createBoardSquareTexture(cols.light, cols.lightGrain, maxAniso, 0);
      darkTex = createBoardSquareTexture(cols.dark, cols.darkGrain, maxAniso, 3);
      frameTex = createBoardFrameTexture(cols.frame, maxAniso);
      lightMat.map = lightTex;
      lightMat.needsUpdate = true;
      darkMat.map = darkTex;
      darkMat.needsUpdate = true;
      frameTopMat.map = frameTex;
      frameTopMat.needsUpdate = true;
    };
    applyTheme(stateRef.current.themeId);

    const squareClickables: THREE.Object3D[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = `${FILES[c]}${RANKS[r]}`;
        const isLight = (r + c) % 2 === 0;
        const sqMesh = new THREE.Mesh(squareGeo, isLight ? lightMat : darkMat);
        sqMesh.position.set(c - 3.5, -0.025, r - 3.5); // top face exact y = 0.000
        sqMesh.receiveShadow = true;
        sqMesh.userData.square = sq;
        scene.add(sqMesh);
        squareMeshes.set(sq, sqMesh);
        squareClickables.push(sqMesh);

        const padMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        const padMesh = new THREE.Mesh(padGeo, padMat);
        padMesh.position.set(c - 3.5, 0.004, r - 3.5);
        padMesh.visible = false;
        padMesh.userData.square = sq;
        scene.add(padMesh);
        padMeshes.set(sq, padMesh);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(c - 3.5, 0.006, r - 3.5);
        ringMesh.visible = false;
        ringMesh.userData.square = sq;
        scene.add(ringMesh);
        ringMeshes.set(sq, ringMesh);

        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.85,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.92,
        });
        const orbMesh = new THREE.Mesh(orbGeo, orbMat);
        orbMesh.position.set(c - 3.5, 0.025, r - 3.5);
        orbMesh.visible = false;
        orbMesh.userData.square = sq;
        scene.add(orbMesh);
        orbMeshes.set(sq, orbMesh);
        squareClickables.push(orbMesh);
      }
    }

    const shadowTex = createContactShadowTexture();
    const pieceMats = createPieceMaterials(shadowTex);
    const pieceGroupMap = new Map<
      string,
      { group: THREE.Group; key: string; targetY: number; type: PieceSymbol }
    >();
    const piecesRoot = new THREE.Group();
    scene.add(piecesRoot);

    const disposeGroupGeometries = (group: THREE.Group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry) {
          obj.geometry.dispose();
        }
      });
    };

    const activeGlides: ActiveGlide[] = [];
    const activeSparks: SparkParticle[] = [];
    const sparkGeo = new THREE.SphereGeometry(0.055, 8, 8);

    const spawnCaptureBurst = (worldPos: THREE.Vector3, colorHex: number) => {
      if (isSoftwareGl) return;
      for (let i = 0; i < 14; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 1,
        });
        const spark = new THREE.Mesh(sparkGeo, mat);
        spark.position.set(worldPos.x, 0.45, worldPos.z);
        scene.add(spark);
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.6 + Math.random() * 2.2;
        activeSparks.push({
          mesh: spark,
          vel: new THREE.Vector3(
            Math.cos(angle) * speed,
            2.2 + Math.random() * 2.0,
            Math.sin(angle) * speed
          ),
          life: 0,
          maxLife: 0.48 + Math.random() * 0.18,
        });
      }
    };

    const syncHighlights = () => {
      const {
        selectedSquare: sel,
        hoveredSquare: hov,
        legalTargets: targets,
        lastMove: lm,
        chess: bChess,
        isPlayerAllowed: allowed,
      } = stateRef.current;
      const inCheck = bChess.inCheck();
      const turn = bChess.turn();

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = `${FILES[c]}${RANKS[r]}` as Square;
          const pad = padMeshes.get(sq);
          const ring = ringMeshes.get(sq);
          const orb = orbMeshes.get(sq);
          if (!pad || !ring || !orb) continue;

          const pMat = pad.material as THREE.MeshBasicMaterial;
          const rMat = ring.material as THREE.MeshBasicMaterial;
          const sqPiece = bChess.get(sq);
          const isTarget = targets.has(sq);

          orb.visible = isTarget && !sqPiece;
          orb.scale.setScalar(hov === sq && orb.visible ? 1.25 : 1);

          // Full-square tinted pads for crisp board readability & capture targets
          if (inCheck && sqPiece?.type === 'k' && sqPiece.color === turn) {
            pad.visible = true;
            pMat.color.set(0xef4444);
            pMat.opacity = 0.56;
          } else if (isTarget && sqPiece) {
            pad.visible = true;
            pMat.color.set(0xef4444);
            pMat.opacity = 0.44;
          } else if (sel === sq) {
            pad.visible = true;
            pMat.color.set(0xfacc15);
            pMat.opacity = 0.48;
          } else if (lm && (lm.from === sq || lm.to === sq)) {
            pad.visible = true;
            pMat.color.set(0xf59e0b);
            pMat.opacity = 0.34;
          } else if (hov === sq && allowed && ((sqPiece && sqPiece.color === turn) || isTarget)) {
            pad.visible = true;
            pMat.color.set(isTarget ? 0x10b981 : 0xfbbf24);
            pMat.opacity = 0.28;
          } else {
            pad.visible = false;
          }

          // Ring highlights for Check, Selected, and Capturable Enemy Targets
          if (inCheck && sqPiece?.type === 'k' && sqPiece.color === turn) {
            ring.visible = true;
            rMat.color.set(0xef4444);
            rMat.opacity = 0.95;
            ring.scale.setScalar(1.12);
          } else if (isTarget && sqPiece) {
            ring.visible = true;
            rMat.color.set(0xef4444);
            rMat.opacity = 0.92;
            ring.scale.setScalar(1.1);
          } else if (sel === sq) {
            ring.visible = true;
            rMat.color.set(0xfacc15);
            rMat.opacity = 0.95;
            ring.scale.setScalar(1.06);
          } else {
            ring.visible = false;
          }
        }
      }

      for (const [sq, entry] of pieceGroupMap.entries()) {
        const sqPiece = bChess.get(sq as Square);
        const canHoverLift =
          allowed && sqPiece && sqPiece.color === turn && hov === sq && sel !== sq;
        entry.targetY = sq === sel ? 0.22 : canHoverLift ? 0.08 : 0;
      }

      requestRender();
    };

    const syncBoard = (moveHint: { from: string; to: string } | null) => {
      const { chess: bChess } = stateRef.current;
      const board = bChess.board();

      const nextPieces = new Map<string, { type: PieceSymbol; color: PlayerColor }>();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = board[r][c];
          if (cell) {
            nextPieces.set(`${FILES[c]}${RANKS[r]}`, { type: cell.type, color: cell.color });
          }
        }
      }

      const movedEntry = moveHint ? pieceGroupMap.get(moveHint.from) : undefined;
      const nextAtDest = moveHint ? nextPieces.get(moveHint.to) : undefined;
      const wasCapture = moveHint ? pieceGroupMap.has(moveHint.to) : false;

      if (
        moveHint &&
        movedEntry &&
        nextAtDest &&
        movedEntry.key === `${nextAtDest.color}${nextAtDest.type}`
      ) {
        const capturedEntry = pieceGroupMap.get(moveHint.to);
        if (capturedEntry) {
          piecesRoot.remove(capturedEntry.group);
          disposeGroupGeometries(capturedEntry.group);
          pieceGroupMap.delete(moveHint.to);
          spawnCaptureBurst(squareToWorld(moveHint.to), 0xfbbf24);
        }

        pieceGroupMap.delete(moveHint.from);
        movedEntry.group.userData.square = moveHint.to;
        movedEntry.group.traverse((child) => {
          child.userData.square = moveHint.to;
        });
        pieceGroupMap.set(moveHint.to, movedEntry);

        const startPos = movedEntry.group.position.clone();
        const endPos = squareToWorld(moveHint.to);
        activeGlides.push({
          group: movedEntry.group,
          startPos,
          endPos,
          progress: 0,
          duration: 0.24,
          isJump: movedEntry.type === 'n',
        });

        for (const [sq, entry] of [...pieceGroupMap.entries()]) {
          const desired = nextPieces.get(sq);
          if (!desired || entry.key !== `${desired.color}${desired.type}`) {
            piecesRoot.remove(entry.group);
            disposeGroupGeometries(entry.group);
            pieceGroupMap.delete(sq);
          }
        }
        for (const [sq, desired] of nextPieces.entries()) {
          if (!pieceGroupMap.has(sq)) {
            const g = buildStauntonPiece(desired.type, desired.color, pieceMats);
            const wp = squareToWorld(sq);
            g.position.set(wp.x, 0, wp.z);
            g.userData.square = sq;
            g.traverse((ch) => {
              ch.userData.square = sq;
            });
            piecesRoot.add(g);
            pieceGroupMap.set(sq, {
              group: g,
              key: `${desired.color}${desired.type}`,
              targetY: 0,
              type: desired.type,
            });
            if (wasCapture && sq === moveHint.to) {
              spawnCaptureBurst(wp, 0xfbbf24);
            }
          }
        }
      } else {
        activeGlides.length = 0;
        for (const entry of pieceGroupMap.values()) {
          piecesRoot.remove(entry.group);
          disposeGroupGeometries(entry.group);
        }
        pieceGroupMap.clear();

        for (const [sq, info] of nextPieces.entries()) {
          const pieceGroup = buildStauntonPiece(info.type, info.color, pieceMats);
          const worldPos = squareToWorld(sq);
          pieceGroup.position.set(worldPos.x, 0, worldPos.z);
          pieceGroup.userData.square = sq;
          pieceGroup.traverse((child) => {
            child.userData.square = sq;
          });
          piecesRoot.add(pieceGroup);
          pieceGroupMap.set(sq, {
            group: pieceGroup,
            key: `${info.color}${info.type}`,
            targetY: 0,
            type: info.type,
          });
        }
      }

      if (bChess.isCheckmate()) {
        const kingColor = bChess.turn();
        for (const [sq, info] of nextPieces.entries()) {
          if (info.type === 'k' && info.color === kingColor) {
            spawnCaptureBurst(squareToWorld(sq), 0xef4444);
          }
        }
      }

      syncHighlights();
    };

    let desiredCameraPos: THREE.Vector3 | null = null;
    const moveCameraTo = (preset: CameraPreset, orient: PlayerColor) => {
      desiredCameraPos = getPresetPosition(preset, orient);
      requestRender();
    };
    const setOrbitEnabled = (enabled: boolean) => {
      controls.enableRotate = enabled;
      controls.enableZoom = enabled;
    };
    controls.addEventListener('start', () => {
      desiredCameraPos = null;
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const pickSquareAtPointer = (clientX: number, clientY: number): Square | undefined => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const pieceHits = raycaster.intersectObjects(piecesRoot.children, true);
      const squareHits = raycaster.intersectObjects(squareClickables, false);
      return (pieceHits[0]?.object.userData.square ||
        squareHits[0]?.object.userData.square) as Square | undefined;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 30) return;
      lastHoverCheck = now;

      const sq = pickSquareAtPointer(e.clientX, e.clientY) ?? null;
      if (sq !== stateRef.current.hoveredSquare) {
        setHoveredSquare(sq);
      }

      if (!sq || !stateRef.current.isPlayerAllowed) {
        renderer.domElement.style.cursor = controls.enableRotate ? 'grab' : 'default';
        return;
      }
      const bChess = stateRef.current.chess;
      const piece = bChess.get(sq);
      const isClickable =
        (piece && piece.color === bChess.turn()) || stateRef.current.legalTargets.has(sq);
      renderer.domElement.style.cursor = isClickable
        ? 'pointer'
        : controls.enableRotate
        ? 'grab'
        : 'default';
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 10) return;

      const {
        isPlayerAllowed: allowed,
        pendingPromotion: promo,
        chess: bChess,
        selectedSquare: sel,
        legalTargets: targets,
        onAttemptMove: attemptMove,
      } = stateRef.current;

      if (!allowed || promo) return;

      const hitSquare = pickSquareAtPointer(e.clientX, e.clientY);
      if (!hitSquare) {
        setSelectedSquare(null);
        return;
      }

      const pieceAtSq = bChess.get(hitSquare);
      const turn = bChess.turn();

      if (sel) {
        if (sel === hitSquare) {
          setSelectedSquare(null);
          return;
        }
        if (targets.has(hitSquare)) {
          const fromPiece = bChess.get(sel);
          const movesFromSel = bChess.moves({ square: sel, verbose: true });
          const needsPromo = movesFromSel.some(
            (m) => m.to === hitSquare && Boolean(m.promotion)
          );
          if (needsPromo && fromPiece) {
            setPendingPromotion({ from: sel, to: hitSquare, color: fromPiece.color });
            setSelectedSquare(null);
            return;
          }
          const ok = attemptMove(sel, hitSquare);
          if (ok) setSelectedSquare(null);
          return;
        }
        if (pieceAtSq && pieceAtSq.color === turn) {
          setSelectedSquare(hitSquare);
          return;
        }
        setSelectedSquare(null);
        return;
      }

      if (pieceAtSq && pieceAtSq.color === turn) {
        setSelectedSquare(hitSquare);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        let needsFollowUp = false;

        if (desiredCameraPos) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCameraPos.x, 7, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCameraPos.y, 7, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCameraPos.z, 7, delta);
          if (camera.position.distanceTo(desiredCameraPos) < 0.03) {
            camera.position.copy(desiredCameraPos);
            desiredCameraPos = null;
          } else {
            needsFollowUp = true;
          }
        }

        for (let i = activeGlides.length - 1; i >= 0; i--) {
          const g = activeGlides[i];
          g.progress = Math.min(1, g.progress + delta / g.duration);
          const ease = 1 - Math.pow(1 - g.progress, 3);
          g.group.position.x = THREE.MathUtils.lerp(g.startPos.x, g.endPos.x, ease);
          g.group.position.z = THREE.MathUtils.lerp(g.startPos.z, g.endPos.z, ease);
          const arcPeak = g.isJump ? 0.92 : 0.24;
          g.group.position.y = Math.sin(g.progress * Math.PI) * arcPeak;
          if (g.progress >= 1) {
            g.group.position.set(g.endPos.x, 0, g.endPos.z);
            activeGlides.splice(i, 1);
          } else {
            needsFollowUp = true;
          }
        }

        for (let i = activeSparks.length - 1; i >= 0; i--) {
          const sp = activeSparks[i];
          sp.life += delta;
          if (sp.life >= sp.maxLife) {
            scene.remove(sp.mesh);
            (sp.mesh.material as THREE.Material).dispose();
            activeSparks.splice(i, 1);
          } else {
            sp.vel.y -= 7.5 * delta;
            sp.mesh.position.addScaledVector(sp.vel, delta);
            const mat = sp.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 1 - sp.life / sp.maxLife;
            needsFollowUp = true;
          }
        }

        for (const entry of pieceGroupMap.values()) {
          const isGliding = activeGlides.some((g) => g.group === entry.group);
          if (isGliding) continue;
          if (Math.abs(entry.group.position.y - entry.targetY) > 0.004) {
            entry.group.position.y = THREE.MathUtils.damp(
              entry.group.position.y,
              entry.targetY,
              15,
              delta
            );
            needsFollowUp = true;
          } else {
            entry.group.position.y = entry.targetY;
          }
        }

        const didControlChange = controls.update();
        if (didControlChange && controls.enableDamping) {
          needsFollowUp = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsFollowUp) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('change', requestRender);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    sceneApiRef.current = {
      syncBoard,
      syncHighlights,
      applyTheme,
      moveCameraTo,
      setOrbitEnabled,
    };

    syncBoard(null);
    if (!isSoftwareGl) renderer.compile(scene, camera);
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      for (const entry of pieceGroupMap.values()) {
        disposeGroupGeometries(entry.group);
      }
      pieceGroupMap.clear();

      for (const pad of padMeshes.values()) {
        (pad.material as THREE.Material).dispose();
      }
      for (const ring of ringMeshes.values()) {
        (ring.material as THREE.Material).dispose();
      }
      for (const orb of orbMeshes.values()) {
        (orb.material as THREE.Material).dispose();
      }

      lightTex?.dispose();
      darkTex?.dispose();
      frameTex?.dispose();
      tableTex.dispose();
      shadowTex.dispose();

      pieceMats.whiteBody.dispose();
      pieceMats.whiteTrim.dispose();
      pieceMats.blackBody.dispose();
      pieceMats.blackTrim.dispose();
      pieceMats.feltBase.dispose();
      pieceMats.shadowMat.dispose();

      lightMat.dispose();
      darkMat.dispose();
      frameSideMat.dispose();
      frameTopMat.dispose();
      lowerSkirtMat.dispose();
      brassMat.dispose();
      groutMat.dispose();
      tableMat.dispose();

      tableGeo.dispose();
      frameGeo.dispose();
      lowerSkirtGeo.dispose();
      inlayGeo.dispose();
      groutGeo.dispose();
      cornerGeo.dispose();
      squareGeo.dispose();
      padGeo.dispose();
      ringGeo.dispose();
      orbGeo.dispose();
      sparkGeo.dispose();
      renderer.dispose();
      sceneApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    setSelectedSquare(null);
    sceneApiRef.current?.syncBoard(isReviewing ? null : lastMove);
  }, [fen, isReviewing, lastMove]);

  useEffect(() => {
    sceneApiRef.current?.syncHighlights();
  }, [selectedSquare, hoveredSquare, legalTargets, lastMove, isPlayerAllowed]);

  useEffect(() => {
    sceneApiRef.current?.applyTheme(themeId);
    sceneApiRef.current?.syncHighlights();
  }, [themeId]);

  useEffect(() => {
    sceneApiRef.current?.moveCameraTo(cameraPreset, orientation);
  }, [cameraPreset, orientation]);

  useEffect(() => {
    sceneApiRef.current?.setOrbitEnabled(!orbitLocked);
  }, [orbitLocked]);

  const handleConfirmPromotion = (promo: PieceSymbol) => {
    if (!pendingPromotion) return;
    onAttemptMove(pendingPromotion.from, pendingPromotion.to, promo);
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  return (
    <div className="relative w-full max-w-[600px] aspect-square rounded-xl overflow-hidden border border-amber-400/25 bg-[#220e04] shadow-2xl touch-manipulation">
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Interactive 3D Chessboard"
      />

      {/* Minimal Top-Left Hint Badge (Zero Occlusion) */}
      {!hudCollapsed && (
        <div className="hidden sm:block absolute top-2.5 left-3 z-10 pointer-events-none text-[11px] text-amber-100/90 bg-[#241005]/90 px-2.5 py-1 rounded border border-amber-400/20">
          {orbitLocked
            ? 'Camera locked · Tap/click piece to move'
            : 'Drag to orbit · Scroll/pinch to zoom · Tap piece to move'}
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 max-w-[95%]">
        <button
          type="button"
          onClick={() => setHudCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-t-md bg-[#241005]/95 border border-amber-400/25 text-[10px] font-medium text-amber-200 hover:text-white transition-colors"
        >
          {hudCollapsed ? (
            <>
              <Eye className="w-3 h-3" aria-hidden="true" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-1 px-1.5 py-1 rounded-lg bg-[#241005]/95 border border-amber-400/25 shadow-xl">
            {(
              [
                { id: 'classic', label: '3D Classic' },
                { id: 'broadcast', label: 'Broadcast' },
                { id: 'duel', label: '3/4 Duel' },
                { id: 'top', label: 'Top View' },
              ] as { id: CameraPreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setCameraPreset(preset.id);
                  sceneApiRef.current?.moveCameraTo(preset.id, orientation);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  cameraPreset === preset.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <span className="h-4 w-px bg-white/12 mx-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setOrbitLocked((l) => !l)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                orbitLocked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Lock camera angle for fast Blitz moves"
            >
              {orbitLocked ? (
                <Lock className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Unlock className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{orbitLocked ? 'Locked' : 'Lock View'}</span>
            </button>
          </div>
        )}
      </div>

      {webglLost && (
        <div className="absolute inset-0 z-30 bg-[#241005] flex flex-col items-center justify-center p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-amber-50">3D Graphics Context Interrupted</p>
          <p className="text-xs text-amber-200/75">
            Switch to 2D Classic mode using the toggle above to continue cleanly.
          </p>
        </div>
      )}

      {pendingPromotion && (
        <div className="absolute inset-0 z-20 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#241005] border border-amber-400/30 rounded-xl p-5 shadow-2xl max-w-xs w-full">
            <h3 className="text-sm font-semibold text-amber-50 text-center mb-3">
              Promote Pawn
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  onClick={() => handleConfirmPromotion(promo)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#341809] hover:bg-amber-500/20 border border-amber-400/20 hover:border-amber-400/60 transition-colors"
                >
                  <div className="w-10 h-10">
                    <PieceSvg type={promo} color={pendingPromotion.color} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 mt-1">
                    {promo === 'q' ? 'Queen' : promo === 'r' ? 'Rook' : promo === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="mt-3 w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
