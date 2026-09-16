import * as THREE from 'three';

export const mapPalette = {
  sceneBackground: 0x071a24,
  sceneFog: 0x6f91a0,
  baseFill: 0xffffff,
  baseEmissive: 0x07180f,
  hoverFill: 0xa9d982,
  hoverEmissive: 0x173d24,
  activeFill: 0xf4d889,
  activeEmissive: 0x4a3510,
  underlayStart: 0x102d24,
  underlayEnd: 0x315b3b,
  outerLine: 0x8bc99d,
  innerLine: 0xd2e6bc,
  barStart: 0x71dbff,
  barEnd: 0xe6fbff,
  barEmissive: 0x20557a,
  markerFill: 0xffdc95,
  markerEmissive: 0xa16525,
  diffusion: '#b6f3ff',
  labelText: '#f7feff',
  labelValue: '#b9efff'
};

export const terrainColors = {
  lowland: new THREE.Color(0x83ab5e),
  grassland: new THREE.Color(0x5a8b42),
  forest: new THREE.Color(0x3a6930),
  highland: new THREE.Color(0x9b8f5f),
  rock: new THREE.Color(0xb8a878),
  peak: new THREE.Color(0xe5dcc8),
  side: new THREE.Color(0x1a3f35)
};

export const barColorStart = new THREE.Color(0x00d9ff);
export const barColorMid = new THREE.Color(0x00a8ff);
export const barColorEnd = new THREE.Color(0xff6b6b);
