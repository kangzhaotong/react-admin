/*
 * @Author: M78.Kangzhaotong
 * @Date: 2024-01-25 13:58:56
 * @Last Modified by: M78.Kangzhaotong
 * @Last Modified time: 2024-04-28 14:42:10
 */
import React, { useRef, useEffect, useState, MutableRefObject } from 'react';
import { Button } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import * as THREE from 'three';
import * as d3 from 'd3';
import {
  CSS2DObject,
  CSS2DRenderer
} from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls as MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils';
// import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import TWEEN, { type Tween } from '@tweenjs/tween.js';
import geoJson100000_Full from './json/100000_full.json';
import geoJson450000_Full from './json/450000_full.json';
import geoJson450100_Full from './json/450100_full.json';
// import geoJson450100 from './json/450100.json';
// import geoJson from './json/450100_full.json';
import circle1 from '@/assets/images/map-circle-1.png';
import circle2 from '@/assets/images/map-circle-2.png';
import circle3 from '@/assets/images/map-circle-3.png';
import chinaSatellite from '@/assets/images/china-satellite.jpg';
import { pxfix } from './config';
import { useDebounce } from '@/utils/utils';
import styles from './index.module.less';

let width = 0;
let height = 0;

let projection: any;

const lookAt = {
  x: 35,
  y: -10,
  z: 0
};
const cameraPostion = {
  x: 0,
  y: -850,
  z: 830
};
const CAMERA_MIN_DISTANCE = 320;
const CAMERA_MAX_DISTANCE = 2800;
const DEFAULT_CAMERA_DISTANCE = new THREE.Vector3(
  cameraPostion.x,
  cameraPostion.y,
  cameraPostion.z
).distanceTo(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z));

const clock: THREE.Clock = new THREE.Clock();
const textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
const terrainTessellator = new TessellateModifier(16, 2);
// NASA Blue Marble Next Generation (public domain), cropped to China and nearby areas.
// Source: https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74218/
const satelliteTexture = textureLoader.load(chinaSatellite);
satelliteTexture.colorSpace = THREE.SRGBColorSpace;
satelliteTexture.wrapS = THREE.ClampToEdgeWrapping;
satelliteTexture.wrapT = THREE.ClampToEdgeWrapping;
satelliteTexture.minFilter = THREE.LinearMipmapLinearFilter;
satelliteTexture.magFilter = THREE.LinearFilter;
const SATELLITE_BOUNDS = {
  west: 65,
  east: 145,
  south: 10,
  north: 60
};
const glowTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(184, 242, 255, 0.58)');
  gradient.addColorStop(0.4, 'rgba(88, 206, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(7, 22, 37, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
})();
const cloudTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  let seed = 41;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let index = 0; index < 32; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 45 + random() * 135;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(240, 248, 240, ${0.04 + random() * 0.06})`);
    gradient.addColorStop(0.52, 'rgba(225, 240, 230, 0.025)');
    gradient.addColorStop(1, 'rgba(210, 230, 220, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
})();
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const terrainColors = {
  lowland: new THREE.Color(0x83ab5e),
  grassland: new THREE.Color(0x5a8b42),
  forest: new THREE.Color(0x3a6930),
  highland: new THREE.Color(0x9b8f5f),
  rock: new THREE.Color(0xb8a878),
  peak: new THREE.Color(0xe5dcc8),
  side: new THREE.Color(0x1a3f35)
};
const satelliteTerrainTint = new THREE.Color(0xffffff);

const getTerrainHeight = (x: number, y: number) => {
  const broad =
    Math.sin(x * 0.0052 + y * 0.0022) * 0.45 +
    Math.cos(y * 0.0068 - x * 0.0015) * 0.35;
  const medium =
    Math.sin((x + y) * 0.0125) * 0.2 + Math.cos((x - y) * 0.0195) * 0.18;
  const detail =
    Math.sin(x * 0.038 + Math.cos(y * 0.012) * 2.0) * 0.08 +
    Math.cos(y * 0.035 + Math.sin(x * 0.009) * 1.5) * 0.06;
  const ridge = Math.pow(Math.abs(Math.sin(x * 0.0095 + y * 0.007)), 3.2) * 0.8;
  const elevation = clamp01((broad + medium + detail + 1.05) / 2.1);

  return 2.0 + Math.pow(elevation, 1.38) * 36 + ridge * 12;
};

const getTerrainColor = (heightValue: number, x: number, y: number) => {
  const moisture = clamp01(
    0.5 + Math.sin(x * 0.018 - y * 0.011) * 0.24 + Math.cos(y * 0.027) * 0.16
  );

  if (heightValue < 10) {
    return terrainColors.lowland
      .clone()
      .lerp(terrainColors.grassland, moisture * 0.72);
  }
  if (heightValue < 24) {
    return terrainColors.grassland.clone().lerp(terrainColors.forest, moisture);
  }
  if (heightValue < 36) {
    return terrainColors.forest
      .clone()
      .lerp(terrainColors.highland, (heightValue - 24) / 12);
  }
  if (heightValue < 44) {
    return terrainColors.highland
      .clone()
      .lerp(terrainColors.rock, (heightValue - 36) / 8);
  }
  return terrainColors.rock
    .clone()
    .lerp(terrainColors.peak, clamp01((heightValue - 44) / 9));
};

const applyTerrainRelief = (
  geometry: THREE.BufferGeometry,
  baseAltitude: number
) => {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const isSurface = z > baseAltitude * 0.5;
    const terrainHeight = isSurface ? getTerrainHeight(x, y) : 0;
    const color = isSurface
      ? getTerrainColor(terrainHeight, x, y).lerp(
          satelliteTerrainTint,
          0.72
        )
      : terrainColors.side;

    if (isSurface) {
      position.setZ(index, baseAltitude + terrainHeight);
    }
    color.toArray(colors, index * 3);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  position.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};

const smoothTerrainGeometry = (geometry: THREE.BufferGeometry) => {
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const smoothedGeometry = mergeVertices(geometry, 0.005);
  smoothedGeometry.computeVertexNormals(true);
  smoothedGeometry.computeBoundingBox();
  smoothedGeometry.computeBoundingSphere();
  return smoothedGeometry;
};

const applySatelliteUv = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(position.count * 2);
  const longitudeRange = SATELLITE_BOUNDS.east - SATELLITE_BOUNDS.west;
  const latitudeRange = SATELLITE_BOUNDS.north - SATELLITE_BOUNDS.south;

  for (let index = 0; index < position.count; index += 1) {
    const coordinate = projection.invert([
      position.getX(index),
      -position.getY(index)
    ]);
    const longitude = coordinate?.[0] ?? SATELLITE_BOUNDS.west;
    const latitude = coordinate?.[1] ?? SATELLITE_BOUNDS.south;

    uv[index * 2] = clamp01(
      (longitude - SATELLITE_BOUNDS.west) / longitudeRange
    );
    uv[index * 2 + 1] = clamp01(
      (latitude - SATELLITE_BOUNDS.south) / latitudeRange
    );
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
};

const applyTerrainReliefToLine = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    position.setZ(
      index,
      getTerrainHeight(position.getX(index), position.getY(index)) + 3.5
    );
  }
  position.needsUpdate = true;
};
// 地图配色
const mapPalette = {
  // 场景背景
  sceneBackground: 0x071a24,
  // 场景雾化
  sceneFog: 0x6f91a0,
  // 地图基础颜色
  baseFill: 0xffffff,
  // 地图基础发光
  baseEmissive: 0x07180f,
  // 地图悬停颜色
  hoverFill: 0xa9d982,
  // 地图悬停发光
  hoverEmissive: 0x173d24,
  // 地图激活颜色
  activeFill: 0xf4d889,
  // 地图激活发光
  activeEmissive: 0x4a3510,
  // 地图底层颜色
  underlayStart: 0x102d24,
  // 地图底层颜色
  underlayEnd: 0x315b3b,
  // 地图外边框颜色
  outerLine: 0x8bc99d,
  // 地图内边框颜色
  innerLine: 0xd2e6bc,
  // 柱状图起始颜色
  barStart: 0x71dbff,
  // 柱状图结束颜色
  barEnd: 0xe6fbff,
  // 柱状图发光
  barEmissive: 0x20557a,
  // 标记点颜色
  markerFill: 0xffdc95,
  // 标记点发光
  markerEmissive: 0xa16525,
  // 扩散效果颜色
  diffusion: '#b6f3ff',
  // 标签文字颜色
  labelText: '#f7feff',
  // 标签值颜色
  labelValue: '#b9efff'
};
// 地图材质
const geoMaterial = new THREE.MeshStandardMaterial({
  map: satelliteTexture,
  color: mapPalette.baseFill,
  emissive: mapPalette.baseEmissive,
  vertexColors: true,
  roughness: 0.68,
  metalness: 0.05,
  transparent: true,
  opacity: 0.86
});
// 地图悬停材质
const geoHoverMaterial = new THREE.MeshStandardMaterial({
  map: satelliteTexture,
  color: mapPalette.hoverFill,
  emissive: mapPalette.hoverEmissive,
  vertexColors: true,
  roughness: 0.62,
  metalness: 0.04,
  transparent: true,
  opacity: 0.94
});
// 地图激活材质
const geoActiveMaterial = new THREE.MeshStandardMaterial({
  map: satelliteTexture,
  color: mapPalette.activeFill,
  emissive: mapPalette.activeEmissive,
  vertexColors: true,
  roughness: 0.58,
  metalness: 0.05,
  transparent: true,
  opacity: 0.95
});

// 柱状图材质
const barMaterial = new THREE.MeshPhongMaterial({
  color: mapPalette.barStart,
  emissive: mapPalette.barEmissive,
  specular: 0xf0fdff,
  shininess: 145,
  transparent: true,
  opacity: 0.94
});
const raycaster = new THREE.Raycaster();
// 射线
const mouse = new THREE.Vector2();
const ROOT_ADCODE = '100000';
// DataV v2 的 full 数据是真实下级边界；v3 部分省份会出现属性是市、几何仍是整省的问题。
const REMOTE_GEO_JSON_HOST = 'https://geo.datav.aliyun.com/areas_v2/bound';
const DYNAMIC_MAP_EXTENT_RATIO = {
  horizontal: 0.55,
  vertical: 0.58
};

const provinceGDPData: Record<string, number> = {
  '100000': 0,
  '110000': 36102.65,
  '120000': 18977.62,
  '130000': 41956.39,
  '140000': 19780.08,
  '150000': 17891.58,
  '210000': 25115.40,
  '220000': 18277.70,
  '230000': 16872.47,
  '310000': 42919.18,
  '320000': 49420.34,
  '330000': 77715.76,
  '340000': 38666.63,
  '350000': 47214.97,
  '360000': 29619.77,
  '370000': 83019.13,
  '410000': 57955.15,
  '420000': 48408.78,
  '430000': 41781.36,
  '440000': 64899.30,
  '450000': 26985.09,
  '460000': 6104.20,
  '500000': 29467.59,
  '510000': 57115.91,
  '520000': 20067.14,
  '530000': 29237.95,
  '540000': 2338.33,
  '610000': 34860.72,
  '620000': 8652.32,
  '630000': 3902.24,
  '640000': 5889.91,
  '650000': 15734.13,
  '710000': 7262.00,
  '810000': 4849.15,
  '820000': 6832.16
};

type MapRegionConfig = {
  name: string;
  parentAdcode: string | null;
  json: any;
  projection?: {
    center: [number, number];
    scale: number;
  };
};

const mapDataRegistry: Record<string, MapRegionConfig> = {
  [ROOT_ADCODE]: {
    name: '全国',
    parentAdcode: null,
    json: geoJson100000_Full,
    projection: {
      center: [108.778074408, 30.0572355018],
      scale: 1500
    }
  },
  '450000': {
    name: '广西壮族自治区',
    parentAdcode: '100000',
    json: geoJson450000_Full,
    projection: {
      center: [108.7944, 23.8334],
      scale: 8000
    }
  },
  '450100': {
    name: '南宁市',
    parentAdcode: '450000',
    json: geoJson450100_Full,
    projection: {
      center: [108.467546, 23.055985],
      scale: 36000
    }
  }
};

const getRemoteGeoJsonUrl = (adcode: string) =>
  `${REMOTE_GEO_JSON_HOST}/${adcode}_full.json`;

const isSelfBoundaryOnly = (json: any, adcode: string) => {
  const firstFeature = json?.features?.[0];

  return (
    json?.features?.length === 1 &&
    String(firstFeature?.properties?.adcode) === adcode
  );
};

const createRemoteRegionConfig = (
  adcode: string,
  json: any,
  parentAdcode: string,
  fallbackName = ''
): MapRegionConfig => ({
  name: fallbackName || json.features[0]?.properties?.parent?.name || adcode,
  parentAdcode,
  json
});

let mapIndex = 0;
let mapTimer: any;
let deptIndex = 0;
let deptTimer: any;
let animationLoop: any;
const _dataAccess: any = {};
const ThreeMapDemo = () => {
  const [currentRegion, setCurrentRegion] = useState(
    mapDataRegistry[ROOT_ADCODE]
  );
  const [zoomPercent, setZoomPercent] = useState(100);
  const renderer: any = useRef<THREE.WebGLRenderer | null>();
  const renderer2: any = useRef();
  const camera: MutableRefObject<THREE.PerspectiveCamera> | any = useRef();
  const scene: MutableRefObject<THREE.Scene> | any = useRef();
  const scene2: MutableRefObject<THREE.Scene> | any = useRef();
  const controls: MutableRefObject<MapControls> | any = useRef();
  const css3DRenderer: any = useRef<CSS2DRenderer>();
  const cylinder: MutableRefObject<THREE.Mesh> | any = useRef(); // 锥体
  const diffusion: MutableRefObject<THREE.Mesh> | any = useRef(); // 扩散

  const underlayGroup = useRef(new THREE.Group());
  const mapGroup = useRef(new THREE.Group());
  const barGeoGroup = useRef(new THREE.Group());
  const markerGroup: MutableRefObject<THREE.Group[]> = useRef([]);
  const labelGroup: any = useRef([]);
  const currentGeoJsonRef = useRef(mapDataRegistry[ROOT_ADCODE].json);
  const currentAdcodeRef = useRef(ROOT_ADCODE);
  const loadingAdcodeRef = useRef('');
  const underlayMaterialRef = useRef<THREE.MeshPhongMaterial | null>(null);
  const underlayLineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const overlayLineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const oceanMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const cloudLayersRef = useRef<THREE.Mesh[]>([]);
  const terrainRevealRef = useRef({ value: 0 });
  const zoomTweenRef = useRef<any>(null);
  const cameraTweenRef = useRef<Tween<THREE.Vector3> | null>(null);
  const targetTweenRef = useRef<Tween<THREE.Vector3> | null>(null);
  const lastZoomPercentRef = useRef(100);

  const stopCameraAnimation = () => {
    zoomTweenRef.current?.stop();
    cameraTweenRef.current?.stop();
    targetTweenRef.current?.stop();
  };

  const divRef = useRef<HTMLDivElement | null>(null);
  const nameRef: any = useRef(null);
  const syncZoomPercent = () => {
    if (!camera.current || !controls.current) {
      return;
    }

    const distance = camera.current.position.distanceTo(
      controls.current.target
    );
    const nextPercent = Math.round(
      (DEFAULT_CAMERA_DISTANCE / distance) * 100
    );
    if (nextPercent !== lastZoomPercentRef.current) {
      lastZoomPercentRef.current = nextPercent;
      setZoomPercent(nextPercent);
    }
  };
  const zoomCamera = (scale: number) => {
    if (!camera.current || !controls.current) {
      return;
    }

    const offset = camera.current.position
      .clone()
      .sub(controls.current.target);
    const currentDistance = offset.length();
    const nextDistance = THREE.MathUtils.clamp(
      currentDistance * scale,
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE
    );
    const direction = offset.normalize();
    const tweenState = { distance: currentDistance };

    stopCameraAnimation();
    zoomTweenRef.current = new TWEEN.Tween(tweenState)
      .to({ distance: nextDistance }, 420)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => {
        camera.current.position
          .copy(controls.current.target)
          .addScaledVector(direction, tweenState.distance);
        controls.current.update();
      })
      .onComplete(syncZoomPercent)
      .start();
  };
  // 初始化Three容器
  const initThree = () => {
    if (divRef.current) {
      width = divRef.current.clientWidth;
      height = divRef.current.clientHeight;
    }

    renderer.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.current.outputColorSpace = THREE.SRGBColorSpace;
    renderer.current.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.current.toneMappingExposure = 1.08;
    renderer.current.shadowMap.enabled = true;
    renderer.current.shadowMap.type = THREE.PCFSoftShadowMap;
    satelliteTexture.anisotropy = Math.min(
      8,
      renderer.current.capabilities.getMaxAnisotropy()
    );
    satelliteTexture.needsUpdate = true;
    // renderer.current.sortObjects = false;
    renderer.current.setSize(width, height, true);
    renderer.current.setClearColor(0xeeeeee, 0.0);

    if (divRef.current) {
      divRef.current.appendChild(renderer.current.domElement);
    }

    css3DRenderer.current = new CSS2DRenderer();
    css3DRenderer.current.setSize(width, height);
    css3DRenderer.current.domElement.style.position = 'absolute';
    css3DRenderer.current.domElement.style.top = '0px';
    css3DRenderer.current.domElement.style.outline = 'none';
    css3DRenderer.current.domElement.style.zIndex = '2';

    if (divRef.current) {
      divRef.current.appendChild(css3DRenderer.current.domElement);
    }

    renderer2.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer2.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer2.current.outputColorSpace = THREE.SRGBColorSpace;
    renderer2.current.toneMapping = THREE.ACESFilmicToneMapping;
    renderer2.current.toneMappingExposure = 1.05;
    // renderer.sortObjects = false;
    renderer2.current.setSize(width, height, true);
    // 设置底色
    renderer2.current.setClearColor(0xffffff, 0);
    renderer2.current.domElement.className = 'canvas2';
    if (divRef.current) {
      divRef.current.appendChild(renderer2.current.domElement);
    }
  };

  // 定义场景
  const initScene = () => {
    scene.current = new THREE.Scene();
    scene2.current = new THREE.Scene();
    underlayGroup.current = new THREE.Group();
    mapGroup.current = new THREE.Group();
    barGeoGroup.current = new THREE.Group();
    scene.background = new THREE.Color(mapPalette.sceneBackground);
    // 雾化场景
    scene.fog = new THREE.FogExp2(mapPalette.sceneFog, 0.00035);
  };
  // 初始化相机视角
  const initCamera = () => {
    camera.current = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      100000
    );
    camera.current.up.x = 0;
    camera.current.up.y = 0;
    camera.current.up.z = 1;
    // camera.current.position.set(0, -800, 2000);
    // camera.current.position.set(0, -1250, 950);
    // camera.current.position.set(0, -1250, 950);
    camera.current.position.set(
      cameraPostion.x,
      cameraPostion.y,
      cameraPostion.z
    );
    camera.current.lookAt(lookAt.x, lookAt.y, lookAt.z);

    // camera.rotateX(-Math.PI * 0.5);
  };
  // 初始化光线粒子
  const initLight = () => {
    const ambientLight = new THREE.AmbientLight(0xc8dfd4, 0.65);
    const ambientLight2 = new THREE.AmbientLight(0xe5f0e0, 0.78);
    // ambientLight.layers.enable(0);
    // ambientLight.layers.enable(1);
    scene?.current?.add(ambientLight);
    scene2?.current?.add(ambientLight2);

    const hemiLight = new THREE.HemisphereLight(0xb5d0d8, 0x1f3d28, 1.05);
    hemiLight.position.set(0, 20, 0);
    scene2.current.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xfff6e0, 2.0);
    const directionalLight2 = new THREE.DirectionalLight(0xf8feff, 1.0);
    directionalLight.position.set(-620, -900, 1150);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.camera.left = -900;
    directionalLight.shadow.camera.right = 900;
    directionalLight.shadow.camera.top = 900;
    directionalLight.shadow.camera.bottom = -900;
    directionalLight.shadow.camera.near = 100;
    directionalLight.shadow.camera.far = 3000;
    directionalLight.shadow.bias = -0.00035;
    directionalLight2.position.set(540, -420, 700);
    scene?.current?.add(directionalLight);
    scene2?.current?.add(directionalLight2);
    // scene.add(new THREE.DirectionalLightHelper(directionalLight));
  };
  const initControl = () => {
    // 控制
    controls.current = new MapControls(
      camera?.current,
      renderer2?.current?.domElement
    );
    // controls = new OrbitControls(camera, css3DRenderer.domElement);
    controls.current.target.set(lookAt.x, lookAt.y, lookAt.z);

    // 平移
    // controls.enablePan = false;

    // 设置为true则启用阻尼(惯性)
    controls.current.enableDamping = true;
    controls.current.dampingFactor = 0.08;
    controls.current.zoomSpeed = 0.72;
    controls.current.rotateSpeed = 0.55;
    controls.current.panSpeed = 0.65;
    // 水平旋转范围
    // controls.maxAzimuthAngle = Math.PI / 2; // 往左
    // controls.minAzimuthAngle = -Math.PI / 2; // 往右
    // 垂直旋转范围
    controls.current.maxPolarAngle = Math.PI / 2.25; // 往上
    controls.current.minPolarAngle = 0.18; // 往下

    controls.current.maxDistance = CAMERA_MAX_DISTANCE;
    controls.current.minDistance = CAMERA_MIN_DISTANCE;
    controls.current.addEventListener('change', syncZoomPercent);
    controls.current.addEventListener('start', stopCameraAnimation);
    // 是否可以缩放
    // controls.enableZoom = true;
    // 禁止鼠标交互,此处设置为false之后，不能移动位置，不能旋转物体
    // controls.enableRotate = false;

    // 自动旋转
    // controls.autoRotate = true
  };
  const initName = () => {
    const canvas = nameRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const ctx: CanvasRenderingContext2D | any = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // // 新建一个离屏canvas
    // const offCanvas = document.createElement('canvas');
    // offCanvas.width = width;
    // offCanvas.height = height;

    // const ctxOffCanvas = canvas.getContext('2d');
    // 设置canvas字体样式
    // ctxOffCanvas.font = '16.5px Arial';
    // ctxOffCanvas.strokeStyle = '#FFFFFF';
    // ctxOffCanvas.fillStyle = '#000000';

    // ctx.font = '20px Aria';
    ctx.font = `${pxfix(3840, 20)}px Aria`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (cylinder.current?.visible) {
      ctx.font = `${pxfix(3840, 26)}px Aria`;
      // const [x, y] = projection(mapActive.position);
      // const x1 = x - (width / 2);
      // const y1 = -(y - (height / 2));

      const vector = new THREE.Vector3(
        cylinder.current.position.x,
        cylinder.current.position.y,
        cylinder.current.position.z + 30
      );
      // const position = vector.project(camera);
      // 经纬度转屏幕坐标
      vector.project(camera.current);
      const left = ((vector.x + 1) / 2) * width;
      const top = -((vector.y - 1) / 2) * height;
      // console.log(left, top);
      ctx.fillText(cylinder.current.name, left, top);
      ctx.fillText(
        _dataAccess?.catalogTotal || '',
        left,
        top + pxfix(3840, 30)
      );
    }
  };
  // 初始化地图旋转动画
  const animation = () => {
    const elapsed = performance.now() * 0.001;
    initName();
    TWEEN.update();
    if (controls.current) {
      controls.current.update();
      // console.log(camera.current);
      // console.log(scene.current);
    }
    if (cylinder.current) {
      // updateObj(cylinder.current, 1500);
      cylinder.current.rotation.y += 0.05;
    }
    geoMaterial.opacity =
      (0.88 + Math.sin(elapsed * 0.42) * 0.025) *
      terrainRevealRef.current.value;
    if (underlayMaterialRef.current) {
      underlayMaterialRef.current.opacity =
        0.58 + Math.sin(elapsed * 0.3) * 0.035;
    }
    if (overlayLineMaterialRef.current) {
      overlayLineMaterialRef.current.opacity =
        0.32 + Math.sin(elapsed * 0.72) * 0.08;
    }
    if (underlayLineMaterialRef.current) {
      underlayLineMaterialRef.current.opacity =
        0.58 + Math.sin(elapsed * 0.48) * 0.08;
    }
    if (oceanMaterialRef.current) {
      oceanMaterialRef.current.opacity =
        0.76 + Math.sin(elapsed * 0.38) * 0.055;
      oceanMaterialRef.current.emissiveIntensity =
        0.35 + Math.sin(elapsed * 0.5) * 0.08;
    }
    cloudLayersRef.current.forEach((cloud, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      cloud.rotation.z += direction * (0.00012 + index * 0.00005);
      cloud.position.x = Math.sin(elapsed * (0.055 + index * 0.018)) * 38;
      cloud.position.y = Math.cos(elapsed * (0.045 + index * 0.014)) * 24;
      const material = cloud.material as THREE.MeshBasicMaterial;
      material.opacity =
        0.09 + index * 0.025 + Math.sin(elapsed * 0.3 + index) * 0.018;
    });
    // renderer.autoClear = false;
    renderer.current?.clear();
    renderer.current?.render(scene.current, camera.current);
    css3DRenderer.current?.render(scene.current, camera.current);
    // renderer2.autoClear = false;
    renderer2.current?.clear();
    renderer2.current?.render(scene2.current, camera.current);
    // composer.animation();
    animationLoop = requestAnimationFrame(animation);
  };
  const initMesh = () => {
    const oceanGeometry = new THREE.CircleGeometry(910, 160);
    const oceanMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1d5a70,
      emissive: 0x0a2533,
      roughness: 0.2,
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.26,
      transparent: true,
      opacity: 0.72
    });
    oceanMaterialRef.current = oceanMaterial;
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.name = '卫星海面';
    ocean.position.z = -1.5;
    ocean.receiveShadow = true;
    scene.current.add(ocean);

    if (cloudTexture) {
      const cloudConfigs = [
        { width: 1460, height: 820, z: 74, opacity: 0.07, rotation: -0.08 },
        { width: 1320, height: 760, z: 92, opacity: 0.095, rotation: 0.16 }
      ];
      cloudLayersRef.current = cloudConfigs.map((config, index) => {
        const geometry = new THREE.PlaneGeometry(config.width, config.height);
        const material = new THREE.MeshBasicMaterial({
          map: cloudTexture,
          color: index === 0 ? 0xd9eadc : 0xf0f4e9,
          transparent: true,
          opacity: config.opacity,
          depthWrite: false,
          blending: THREE.NormalBlending
        });
        const cloud = new THREE.Mesh(geometry, material);
        cloud.name = `卫星云层-${index + 1}`;
        cloud.position.z = config.z;
        cloud.rotation.z = config.rotation;
        cloud.renderOrder = 8 + index;
        scene.current.add(cloud);
        return cloud;
      });
    }

    // 添加底部圆形装饰
    const texture1 = textureLoader.load(circle1);
    const texture2 = textureLoader.load(circle2);
    const texture3 = textureLoader.load(circle3);
    if (glowTexture) {
      const glowPlane = new THREE.PlaneGeometry(1700, 1700);
      const glowMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowPlane, glowMaterial);
      glowMesh.name = '地图底部辉光';
      glowMesh.position.z = -10;
      scene.current.add(glowMesh);

      const glowAnim = new TWEEN.Tween(glowMesh.scale)
        .to({ x: 1.06, y: 1.06, z: 1 }, 2800)
        .yoyo(true)
        .repeat(Infinity)
        .start();
      glowAnim;
    }
    const planes = [
      {
        radius: 1400,
        map: texture1,
        rotate: Math.PI * 2,
        dur: 28000,
        opacity: 0.16,
        color: 0x7ec5b5
      },
      {
        radius: 1260,
        map: texture2,
        rotate: Math.PI * 2,
        dur: 18000,
        opacity: 0.2,
        color: 0x8ad0bf
      },
      {
        radius: 1160,
        map: texture3,
        rotate: Math.PI * 2,
        dur: 12000,
        opacity: 0.18,
        color: 0xcfe0ca
      }
    ];

    planes.forEach((item) => {
      const plane = new THREE.PlaneGeometry(item.radius, item.radius);
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: item.map,
        transparent: true,
        depthWrite: false,
        opacity: item.opacity,
        color: item.color,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(plane, planeMaterial);
      mesh.name = '圆圈';
      mesh.position.z = -7;
      // mesh.rotateX(Math.PI * 1.5);
      // mesh.position.y = -1 + i;
      const meshAnim = new TWEEN.Tween(mesh.rotation).to(
        { x: 0, y: 0, z: item.rotate },
        item.dur
      );
      // sceneAnim.delay(0).easing(TWEEN.Easing.Quadratic.Out).start();
      meshAnim.delay(0).repeat(Infinity).start();

      scene.current.add(mesh);
    });

    // const shape = new THREE.Shape();
    // console.log(shape.getLength());
    const colors = [
      new THREE.Color(mapPalette.underlayStart),
      new THREE.Color(mapPalette.underlayEnd)
    ];
    // 地图材质
    const mapMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      color: new THREE.Color().lerpColors(colors[0], colors[1], 0.5),
      emissive: 0x0a1f19,
      specular: 0xa8c5b5,
      shininess: 35,
      depthWrite: false,
      transparent: true,
      opacity: 0.65
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: mapPalette.outerLine,
      transparent: true,
      opacity: 0.86,
      linewidth: 1,
      linecap: 'round', // ignored by WebGLRenderer
      linejoin: 'round' // ignored by WebGLRenderer
      // opacity: 0.1
    });
    underlayMaterialRef.current = mapMaterial;
    underlayLineMaterialRef.current = lineMaterial;
    const option = {
      mapMaterial,
      lineMaterial,
      altitude: 30,
      highlight: false
    };
    scene.current.add(underlayGroup.current);
    scene.current.add(mapGroup.current);

    const lineMaterial2 = new THREE.LineBasicMaterial({
      color: mapPalette.innerLine,
      transparent: true,
      opacity: 0.6
    });
    overlayLineMaterialRef.current = lineMaterial2;
    // 南宁市
    const option2 = {
      mapMaterial: geoMaterial,
      lineMaterial: lineMaterial2,
      altitude: 1,
      highlight: true
    };
    renderMap(currentGeoJsonRef.current, option, option2);
  };
  const getDynamicMapExtent = (
    json: any
  ): [[number, number], [number, number]] => {
    // 远程省份没有手工 scale，使用统一舞台范围保持与广西本地视图接近的视觉比例。
    const { horizontal, vertical } = DYNAMIC_MAP_EXTENT_RATIO;

    return [
      [-width * horizontal, -height * vertical],
      [width * horizontal, height * vertical]
    ];
  };
  const updateProjection = (json: any) => {
    const currentConfig = mapDataRegistry[currentAdcodeRef.current];
    if (currentConfig.projection) {
      // 本地维护的区域使用固定投影，避免每次适配造成地图比例跳动。
      projection = d3
        .geoMercator()
        .center(currentConfig.projection.center)
        .scale(currentConfig.projection.scale)
        .translate([0, 0]);
      return;
    }

    // 动态远程区域使用 fitExtent，但范围按大屏舞台比例控制，不铺满整个画布。
    projection = d3.geoMercator().fitExtent(getDynamicMapExtent(json), json);
  };
  const clearObjectGroup = (group: THREE.Group) => {
    const children = [...group.children];
    children.forEach((child) => {
      dispose(group, child);
    });
  };
  const renderMap = (json: any, underlayOption: any, overlayOption: any) => {
    currentGeoJsonRef.current = json;
    clearObjectGroup(underlayGroup.current);
    clearObjectGroup(mapGroup.current);
    clearObjectGroup(barGeoGroup.current);
    if (labelGroup.current.length) {
      labelGroup.current.forEach((item: any) => {
        scene.current.remove(item);
      });
      labelGroup.current = [];
    }

    updateProjection(json);
    createMap({ ...underlayOption, json });
    createMap({ ...overlayOption, json });
    initBar(json);
    initLabel(json);
    changeMapStyle('', 'click');
  };
  const createMap = (option: any) => {
    const { json, mapMaterial, lineMaterial, altitude, highlight, isBorder } =
      option;
    // const len = json.features.length;
    for (const feature of json.features) {
      // for (let i = 0; i < len; i += 1) {
      // const feature = json.features[i];
      const { geometry, properties } = feature;
      // 创建地区容器
      const county: THREE.Object3D | any = new THREE.Object3D();
      county.name = properties.name;
      county.userData = {
        ...properties
      };
      // const cLen = geometry.coordinates.length;
      for (const multiPolygon of geometry.coordinates) {
        // for (let j = 0; j < geometry.coordinates.length; j += 1) {
        // const multiPolygon = geometry.coordinates[j];
        // console.log(multiPolygon);
        if (geometry.type === 'MultiPolygon') {
          // const mLen = multiPolygon.length;
          // for (let o = 0; o < mLen; o += 1) {
          // const polygon = multiPolygon[o];
          // console.log(polygon, properties);
          for (const polygon of multiPolygon) {
            const { shape, linGeometry, positions } = createShape(
              polygon,
              altitude
            );
            // console.log(shape, linGeometry, positions);
            // 非边框线
            if (!isBorder) {
              // 拉伸造型
              let extrudeGeometry: THREE.BufferGeometry =
                new THREE.ExtrudeGeometry(
                  shape, // 二维轮廓
                  {
                    depth: altitude,
                    // amount: 30, // 拉伸长度
                    bevelEnabled: false // 无倒角
                  }
                );
              if (highlight) {
                const sourceGeometry = extrudeGeometry;
                extrudeGeometry = terrainTessellator.modify(sourceGeometry);
                if (extrudeGeometry !== sourceGeometry) {
                  sourceGeometry.dispose();
                }
                applyTerrainRelief(extrudeGeometry, altitude);
                const terrainedGeometry = extrudeGeometry;
                extrudeGeometry = smoothTerrainGeometry(terrainedGeometry);
                if (extrudeGeometry !== terrainedGeometry) {
                  terrainedGeometry.dispose();
                }
                applySatelliteUv(extrudeGeometry);
                applyTerrainReliefToLine(linGeometry);
              }

              // const length = shape.getLength();
              // if (length) {
              const mesh: THREE.Mesh | any = new THREE.Mesh(
                extrudeGeometry,
                mapMaterial
              );
              mesh.castShadow = highlight;
              mesh.receiveShadow = highlight;
              const line = new THREE.Line(linGeometry, lineMaterial);
              // eslint-disable-next-line max-depth
              if (properties.centroid) {
                const [x, y] = projection(properties.centroid);
                mesh.name = properties.name;
                mesh._centroid = [x, -y];
                mesh.userData = {
                  ...properties
                };
                county._centroid = [x, -y];
              }

              // eslint-disable-next-line max-depth
              if (!highlight) {
                county.position.z = -altitude;
                county.position.z = -altitude;
              }
              county.add(mesh);
              county.add(line);
              // }
            } else {
              const geometry = new LineGeometry();
              geometry.setPositions(positions);
              const line = new Line2(geometry, lineMaterial);
              line.name = properties.name;
              line.scale.set(1, 1, 1);
              county.add(line);
            }
          }
        }
      }

      // county.rotateX(Math.PI * 1.5);
      // county.position.x = -width / 2;
      // county.position.z = -height / 2;
      if (!highlight) {
        underlayGroup.current.add(county);
      } else {
        mapGroup.current.add(county);
      }
    }
  };
  const createShape = (points: any, z: number) => {
    const shape = new THREE.Shape();
    const linGeometry = new THREE.BufferGeometry();
    const positions = [];
    // const len = points.length;
    // for (let i = 0; i < len; i += 1) {
    const entries = points.entries();
    for (const [i, p] of entries) {
      // const p = points[i];
      const [x, y] = projection(p);
      if (i === 0) {
        shape.moveTo(x, -y);
      } else {
        shape.lineTo(x, -y);
      }
      positions.push(x, -y, z);
      const vertices = new Float32Array([
        x,
        -y,
        z // 第一个顶点的坐标 (x1, y1, z1)
        // 添加更多的顶点坐标...
      ]);
      linGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(vertices, 3)
      );
    }

    return {
      shape,
      linGeometry,
      positions
    };
  };
  const initMarker = () => {
    if (markerGroup.current.length) {
      markerGroup.current.forEach((item) => {
        scene.current.remove(item);
      });
      markerGroup.current = [];
    }

    // for (const marker of _deptData) {
    //   if (marker.position.length) {
    //     const [x, y] = projection(marker.position);

    //     const point = document.createElement("div");
    //     point.className = "point";
    //     const pointChild = document.createElement("div");
    //     pointChild.className = "child";
    //     pointChild.textContent = marker.name;

    //     point.appendChild(pointChild);

    //     const css2dObj: CSS2DObject | any = new CSS2DObject(point);
    //     css2dObj.visible = false;
    //     css2dObj.name = marker.name;
    //     css2dObj._district = marker.district;
    //     css2dObj.position.x = x;
    //     css2dObj.position.y = -y;
    //     css2dObj.position.z = 51;
    //     // console.log(css2dObj)

    //     markerGroup.current.push(css2dObj);
    //     scene.current.add(css2dObj);
    //   }
    // }
    // console.log(markerGroup);
  };
  const initCylinder = () => {
    const cylinderGeometry = new THREE.CylinderGeometry(1, 15, 20, 4, 20);
    const cylinderMaterial = new THREE.MeshPhongMaterial({
      color: mapPalette.markerFill,
      emissive: mapPalette.markerEmissive,
      specular: 0xfff7d8,
      shininess: 170
    });

    cylinder.current = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    console.log(cylinder.current, 'cylinder.currentcylinder.current');
    cylinder.current.visible = false;
    cylinder.current.rotateX(-Math.PI * 0.5);
    cylinder.current.position.z = 70;
    scene2.current.add(cylinder.current);
  };
  const initDiffusion = () => {
    const width = 20;
    const color = mapPalette.diffusion;
    // 创建box
    // const geometry = new THREE.PlaneBufferGeometry(width, width, 1, 1);
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -width,
      -width,
      0,
      width,
      -width,
      0,
      width,
      width,
      0,
      -width,
      width,
      0
    ]);
    // 定义平面的顶点索引
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    // 设置顶点位置属性
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // 设置顶点索引属性
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`;
    const fragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uSpeed;
    uniform float uSge;
    uniform float time;
    float PI = 3.14159265;
    float drawCircle(float index, float range) {
        float opacity = 1.0;
        if (index >= 1.0 - range) {
            opacity = 1.0 - (index - (1.0 - range)) / range;
        } else if(index <= range) {
            opacity = index / range;
        }
        return opacity;
    }
    float distanceTo(vec2 src, vec2 dst) {
        float dx = src.x - dst.x;
        float dy = src.y - dst.y;
        float dv = dx * dx + dy * dy;
        return sqrt(dv);
    }
    void main() {
        float iTime = -time * uSpeed;
        float opacity = 0.0;
        float len = distanceTo(vec2(0.5, 0.5), vec2(vUv.x, vUv.y));

        float size = 1.0 / uSge;
        vec2 range = vec2(0.65, 0.75);
        float index = mod(iTime + len, size);
        // 中心圆
        vec2 cRadius = vec2(0.06, 0.12);

        if (index < size && len <= 0.5) {
            float i = sin(index / size * PI);

            // 处理边缘锯齿
            if (i >= range.x && i <= range.y){
                // 归一
                float t = (i - range.x) / (range.y - range.x);
                // 边缘锯齿范围
                float r = 0.3;
                opacity = drawCircle(t, r);

            }
            // 渐变
            opacity *=  1.0 - len / 0.5;
        };

        gl_FragColor = vec4(uColor, uOpacity * opacity);
    }`;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
        uSpeed: { value: 0.09 },
        uSge: { value: 3 },
        uRadius: { value: width / 2 },
        time: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader
    });
    diffusion.current = new THREE.Mesh(geometry, material);
    diffusion.current.visible = false;

    diffusion.current.position.x = 0;
    diffusion.current.position.y = 0;
    diffusion.current.position.z = 51;

    diffusion.current.scale.set(5, 5, 5);

    function render2() {
      const delta = clock.getDelta();
      material.uniforms.time.value += delta;
      requestAnimationFrame(render2);
    }
    render2();

    scene.current.add(diffusion.current);
  };
  const onWindowResize = () => {
    if (divRef.current) {
      width = divRef.current.clientWidth;
      height = divRef.current.clientHeight;
    }
    camera.current.aspect = width / height;
    camera.current.updateProjectionMatrix();
    renderer.current?.setSize(width, height, true);
    renderer2.current?.setSize(width, height, true);
    css3DRenderer.current?.setSize(width, height);
    renderCurrentRegion();
  };
  const onMouseEnter = (event: any) => {
    const getBoundingClientRect: any = divRef.current?.getBoundingClientRect();
    mouse.x = ((event.clientX - getBoundingClientRect?.left) / width) * 2 - 1;
    mouse.y =
      -(((event.clientY - getBoundingClientRect?.top) / height) * 2) + 1;

    raycaster.setFromCamera(mouse, camera.current);

    // 地区划入
    const intersects = raycaster.intersectObjects(
      mapGroup.current.children,
      true
    );

    if (intersects.length > 0) {
      // if (markerGroup.visible) return;
      const { object } = intersects[0];
      changeMapStyle(object.name, 'hover');
    } else {
      changeMapStyle('', 'hover');
    }
  };
  const isMapRenderReady = () => {
    return (
      Boolean(underlayMaterialRef.current) &&
      Boolean(underlayLineMaterialRef.current) &&
      Boolean(overlayLineMaterialRef.current)
    );
  };
  const getCurrentRenderOptions = () => {
    return {
      underlay: {
        mapMaterial: underlayMaterialRef.current,
        lineMaterial: underlayLineMaterialRef.current,
        altitude: 30,
        highlight: false
      },
      overlay: {
        mapMaterial: geoMaterial,
        lineMaterial: overlayLineMaterialRef.current,
        altitude: 1,
        highlight: true
      }
    };
  };
  const renderCurrentRegion = () => {
    if (
      !isMapRenderReady()
    ) {
      return;
    }

    const { underlay, overlay } = getCurrentRenderOptions();
    renderMap(currentGeoJsonRef.current, underlay, overlay);
  };
  const fetchRegionJson = async (adcode: string) => {
    const url = getRemoteGeoJsonUrl(adcode);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const json = await res.json();

      return isSelfBoundaryOnly(json, adcode) ? null : json;
    } catch (error) {
      console.warn('地图数据加载失败', url, error);
    }

    return null;
  };
  const getRegionConfig = async (
    adcode: string,
    fallbackName = ''
  ): Promise<MapRegionConfig | null> => {
    if (mapDataRegistry[adcode]) {
      return mapDataRegistry[adcode];
    }

    if (loadingAdcodeRef.current === adcode) {
      return null;
    }

    loadingAdcodeRef.current = adcode;
    const json = await fetchRegionJson(adcode);
    loadingAdcodeRef.current = '';

    if (!json?.features?.length) {
      return null;
    }

    const regionConfig = createRemoteRegionConfig(
      adcode,
      json,
      currentAdcodeRef.current,
      fallbackName
    );
    mapDataRegistry[adcode] = regionConfig;

    return regionConfig;
  };
  const canDrillToRegion = (adcode: string) => {
    // 全国可动态进入任意省；省内只允许进入已有本地配置，避免继续请求不可控层级。
    return (
      currentAdcodeRef.current === ROOT_ADCODE || Boolean(mapDataRegistry[adcode])
    );
  };
  const restoreCamera = (duration = 1200) => {
    stopCameraAnimation();
    const cameraAnim = new TWEEN.Tween(camera.current.position).to(
      {
        x: cameraPostion.x,
        y: cameraPostion.y,
        z: cameraPostion.z
      },
      duration
    );
    cameraTweenRef.current = cameraAnim;
    cameraAnim
      .easing(TWEEN.Easing.Quartic.Out)
      .onUpdate(syncZoomPercent)
      .onComplete(syncZoomPercent)
      .start();

    const targetAnim = new TWEEN.Tween(controls.current.target).to(
      { x: lookAt.x, y: lookAt.y, z: lookAt.z },
      duration
    );
    targetTweenRef.current = targetAnim;
    targetAnim.easing(TWEEN.Easing.Quartic.Out).start();
  };
  const drillToRegion = async (adcode: string, name = '') => {
    const nextRegion = await getRegionConfig(adcode, name);
    if (!nextRegion) {
      return;
    }
    currentAdcodeRef.current = adcode;
    setCurrentRegion(nextRegion);
    currentGeoJsonRef.current = nextRegion.json;
    renderCurrentRegion();
    restoreCamera();
  };
  const restoreMap = () => {
    currentAdcodeRef.current = ROOT_ADCODE;
    setCurrentRegion(mapDataRegistry[ROOT_ADCODE]);
    currentGeoJsonRef.current = mapDataRegistry[ROOT_ADCODE].json;
    renderCurrentRegion();
    changeMapStyle('', 'click');
    restoreCamera();
  };
  const onMapClick = (event: MouseEvent) => {
    const getBoundingClientRect: any = divRef.current?.getBoundingClientRect();
    mouse.x = ((event.clientX - getBoundingClientRect?.left) / width) * 2 - 1;
    mouse.y =
      -(((event.clientY - getBoundingClientRect?.top) / height) * 2) + 1;

    raycaster.setFromCamera(mouse, camera.current);
    const intersects = raycaster.intersectObjects(mapGroup.current.children, true);
    if (!intersects.length) {
      changeMapStyle('', 'click');
      return;
    }

    const { object } = intersects[0] as any;
    const adcode = String(object?.userData?.adcode || '');
    const name = object?.name || '';
    changeMapStyle(name, 'click');
    if (
      adcode &&
      adcode !== currentAdcodeRef.current &&
      canDrillToRegion(adcode)
    ) {
      drillToRegion(adcode, name);
    }
  };
  // 切换地区选中 材质
  const changeMapStyle = (name: string, type: string) => {
    mapGroup.current.traverse((child: any) => {
      if (child.isMesh) {
        // 过滤掉外面线框
        if (type === 'click') {
          child.isSelect = false;
          child.material = geoMaterial;
          if (child.name === name) {
            child.isSelect = true;
            child.material = geoActiveMaterial;
          }
        } else if (type === 'hover') {
          if (!child.isSelect) {
            child.material = geoMaterial;
            if (child.name === name) {
              child.material = geoHoverMaterial;
            }
          }
        }
      }
    });
  };
  const initAnim = () => {
    terrainRevealRef.current.value = 0;
    new TWEEN.Tween(terrainRevealRef.current)
      .to({ value: 1 }, 2600)
      .delay(800)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
    // 场景旋转
    scene.current.rotation.z = Math.PI;
    const sceneAnim2 = new TWEEN.Tween(scene.current.rotation).to(
      { z: 0 },
      3000
    );
    // // sceneAnim.delay(2000).easing(TWEEN.Easing.Cubic.Out).start();
    sceneAnim2.delay(500).easing(TWEEN.Easing.Quartic.Out).start();

    // 相机位置
    const cameraAnim = new TWEEN.Tween(camera.current.position).to(
      { ...cameraPostion },
      3000
    );
    // sceneAnim.delay(2000).easing(TWEEN.Easing.Cubic.Out).start();
    cameraTweenRef.current = cameraAnim;
    cameraAnim
      .delay(500)
      .easing(TWEEN.Easing.Quartic.Out)
      .onUpdate(syncZoomPercent)
      .onComplete(syncZoomPercent)
      .start();

    // 地图高度
    mapGroup.current.scale.z = 0.1;
    const mapAnim = new TWEEN.Tween(mapGroup.current.scale).to({ z: 1 }, 1500);
    mapAnim.delay(2500).easing(TWEEN.Easing.Quartic.Out).start();

    // 地图文字
    const nameOption = {
      opacity: 0
    };
    nameRef.current.style.opacity = 0;
    css3DRenderer.current.domElement.style.opacity = 0;
    const nameAnim = new TWEEN.Tween(nameOption)
      .to({ opacity: 1 }, 1500)
      .onUpdate(() => {
        if (nameRef.current) {
          nameRef.current.style.opacity = nameOption.opacity;
          css3DRenderer.current.domElement.style.opacity = nameOption.opacity;
        }
      });
    nameAnim.delay(3000).start();

    // 柱状图
    barGeoGroup.current.scale.z = 0;
    barGeoGroup.current.visible = false;
    const barAnim = new TWEEN.Tween(barGeoGroup.current.scale)
      .to({ z: 1 }, 1500)
      .onUpdate(() => {
        if (!barGeoGroup.current.visible) {
          barGeoGroup.current.visible = true;
        }
      });
    barAnim.delay(3000).easing(TWEEN.Easing.Quartic.Out).start();
  };
  useEffect(() => {
    initThree();
    initScene();
    initCamera();
    initLight();
    initControl();
    // initDat();
    // initGrid();
    animation();
    initMesh();
    initMarker();
    initCylinder();
    initDiffusion();

    window.addEventListener('resize', onWindowResize, false);
    renderer2?.current?.domElement?.addEventListener(
      'mousemove',
      onMouseEnter,
      false
    );
    renderer2?.current?.domElement?.addEventListener('click', onMapClick, false);

    initAnim();
    // cityLoop();
    // _onChange(cityData.find((d) => d.name === '全市') || {}, 2);
    return () => {
      window.removeEventListener('resize', onWindowResize, false);
      renderer2.current?.domElement.removeEventListener(
        'mousemove',
        onMouseEnter,
        false
      );
      renderer2.current?.domElement.removeEventListener('click', onMapClick, false);
      controls.current?.removeEventListener('change', syncZoomPercent);
      controls.current?.removeEventListener('start', stopCameraAnimation);
      stopCameraAnimation();
      controls.current?.dispose();
      clearAll();
    };
  }, []);
  const initLabel = (json: any) => {
    // 禁用原始标签，改用GDP标签
    return;
  };
  const initDat = () => {
    const datGui = new GUI();
    const guiOption = {
      x: camera.current.position.x || 0,
      y: camera.current.position.y || 0,
      z: camera.current.position.z || 0
    };
    datGui.add(guiOption, 'x', -2000, 2000, 1).onChange((value) => {
      camera.current.position.x = value;
    });
    datGui.add(guiOption, 'y', -2000, 2000, 1).onChange((value) => {
      camera.current.position.y = value;
    });
    datGui.add(guiOption, 'z', -2000, 2000, 1).onChange((value) => {
      camera.current.position.z = value;
    });
  };
  const clearAll = () => {
    if (mapTimer) {
      mapIndex = 0;
      clearInterval(mapTimer);
    }
    if (deptTimer) {
      deptIndex = 0;
      clearInterval(deptTimer);
    }

    geoMaterial.dispose();
    geoHoverMaterial.dispose();
    geoActiveMaterial.dispose();
    barMaterial.dispose();
    underlayMaterialRef.current?.dispose();
    underlayLineMaterialRef.current?.dispose();
    overlayLineMaterialRef.current?.dispose();
    oceanMaterialRef.current = null;
    cloudLayersRef.current = [];

    const arr = scene.current.children.filter((x: any) => x);
    arr.forEach((a: any) => {
      dispose(scene.current, a);
    });

    const arr2 = scene2.current.children.filter((x: any) => x);
    arr2.forEach((a: any) => {
      dispose(scene2.current, a);
    });

    // console.log(renderer2.current.info); // 查看memery字段即可

    scene.current.clear();
    scene2.current.clear();
    scene.current.remove();
    scene2.current.remove();
    renderer.current?.dispose();
    renderer.current?.forceContextLoss();
    renderer.current.content = null;
    renderer.current.domElement = null;

    renderer2.current?.dispose();
    renderer2.current?.forceContextLoss();
    renderer2.current.content = null;
    renderer2.current.domElement = null;

    // css3DRenderer.dispose();
    // css3DRenderer.forceContextLoss();
    // markerGroup.children = [];
    // map.children = [];
    css3DRenderer.current.content = null;
    css3DRenderer.current.domElement = null;

    cancelAnimationFrame(animationLoop);
    THREE.Cache.clear();
  };
  const dispose = (parent: THREE.Object3D, child: THREE.Object3D | any) => {
    if (child.children.length) {
      const arr = child.children.filter((x: any) => x);
      arr.forEach((a: any) => {
        dispose(child, a);
      });
    }
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof Line2
    ) {
      const isSharedMaterial =
        child.material === geoMaterial ||
        child.material === geoHoverMaterial ||
        child.material === geoActiveMaterial ||
        child.material === underlayMaterialRef.current ||
        child.material === underlayLineMaterialRef.current ||
        child.material === overlayLineMaterialRef.current;
      if (!isSharedMaterial && child.material.map) {
        child.material.map.dispose();
      }
      if (!isSharedMaterial) {
        child.material.dispose();
      }
      child.geometry.dispose();
    } else if (
      child.material &&
      child.material !== geoMaterial &&
      child.material !== geoHoverMaterial &&
      child.material !== geoActiveMaterial &&
      child.material !== underlayMaterialRef.current &&
      child.material !== underlayLineMaterialRef.current &&
      child.material !== overlayLineMaterialRef.current
    ) {
      child.material.dispose();
    }
    child.remove();
    parent.remove(child);
  };
  function initBar(json: any) {
    const featureCount = json.features.length;
    const startColor = new THREE.Color(0x00d9ff);
    const midColor = new THREE.Color(0x00a8ff);
    const endColor = new THREE.Color(0xff6b6b);

    const gdpValues = json.features
      .map((f: any) => {
        const adcode = String(f.properties?.adcode || '');
        return provinceGDPData[adcode] || 0;
      })
      .filter((v: number) => v > 0);

    const maxGDP = Math.max(...gdpValues, 1);

    for (const [featureIndex, feature] of json.features.entries()) {
      const { properties } = feature;
      const adcode = String(properties?.adcode || '');
      const gdp = provinceGDPData[adcode] || 0;

      if (gdp <= 0) {
        continue;
      }

      const [x, y] = projection(properties.centroid);
      const height = Math.min((gdp / maxGDP) * 35 + 5, 45);
      const ratio = gdp / maxGDP;

      const boxGeo = new THREE.BoxGeometry(12, 12, height);
      const boxMaterial = barMaterial.clone();

      let barColor: THREE.Color;
      if (ratio < 0.5) {
        barColor = new THREE.Color().lerpColors(startColor, midColor, ratio * 2);
      } else {
        barColor = new THREE.Color().lerpColors(midColor, endColor, (ratio - 0.5) * 2);
      }

      boxMaterial.color.copy(barColor);
      boxMaterial.emissive.copy(barColor).multiplyScalar(0.35);

      const boxMesh = new THREE.Mesh(boxGeo, boxMaterial);
      boxMesh.position.x = x;
      boxMesh.position.y = -y + 15;
      boxMesh.position.z = height / 2 + 48;
      boxMesh.userData = { gdp, province: properties.name, height, x, y };

      barGeoGroup.current.add(boxMesh);

      // 添加GDP标签
      const label = document.createElement('div');
      label.className = 'gdp-label';
      label.innerHTML = `<div class="gdp-value">${(gdp / 10000).toFixed(1)}万亿</div><div class="gdp-province">${properties.name}</div>`;
      label.style.position = 'absolute';
      label.style.pointerEvents = 'none';
      label.style.whiteSpace = 'nowrap';
      label.style.fontSize = '12px';
      label.style.color = '#b9efff';
      label.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
      label.style.textAlign = 'center';
      label.style.lineHeight = '1.2';

      const css2dLabel = new CSS2DObject(label);
      css2dLabel.position.set(x, -y + 15, height + 65);
      css2dLabel.visible = true;

      barGeoGroup.current.add(css2dLabel);
    }
    if (!scene.current.children.includes(barGeoGroup.current)) {
      scene.current.add(barGeoGroup.current);
    }
  }
  return (
    <div className={styles.mapWrap}>
      <div className={`${styles.tabs} ${styles.tabsBottom}`}>
        {currentRegion.parentAdcode ? (
          <Button
            className={styles.controlButton}
            aria-label="返回上级区域"
            onClick={() => {
              drillToRegion(currentRegion.parentAdcode as string);
            }}
          >
            返回上级
          </Button>
        ) : null}
        <Button
          className={styles.controlButton}
          aria-label="恢复全国地图"
          onClick={() => {
            restoreMap();
          }}
        >
          恢复地图
        </Button>
        <Button
          className={styles.controlButton}
          aria-label="恢复默认视角"
          onClick={() => {
            restoreCamera(2000);
          }}
        >
          恢复视角
        </Button>
      </div>
      <div className={styles.zoomControls} aria-label="地图缩放控制">
        <Button
          className={styles.zoomButton}
          aria-label="缩小地图"
          title="缩小地图"
          icon={<MinusOutlined />}
          onClick={() => zoomCamera(1.18)}
        />
        <div className={styles.zoomStatus}>
          <strong>{zoomPercent}%</strong>
          <span>滚轮缩放</span>
        </div>
        <Button
          className={styles.zoomButton}
          aria-label="放大地图"
          title="放大地图"
          icon={<PlusOutlined />}
          onClick={() => zoomCamera(0.84)}
        />
      </div>
      <div className={styles.mapHint}>拖动旋转 · 滚轮缩放 · 点击区域下钻</div>
      <div ref={divRef} className={styles.map} />
      <canvas ref={nameRef} className={styles.name} />
    </div>
  );
};

export default ThreeMapDemo;
