import * as THREE from 'three';
import { terrainColors } from '../constants/colors';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const satelliteTerrainTint = new THREE.Color(0xffffff);

export const getTerrainHeight = (x: number, y: number) => {
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

export const getTerrainColor = (heightValue: number, x: number, y: number) => {
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

export const applyTerrainRelief = (
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
