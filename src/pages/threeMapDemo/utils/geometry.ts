import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils';

export const smoothTerrainGeometry = (geometry: THREE.BufferGeometry) => {
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const smoothedGeometry = mergeVertices(geometry, 0.005);
  smoothedGeometry.computeVertexNormals(true);
  smoothedGeometry.computeBoundingBox();
  smoothedGeometry.computeBoundingSphere();
  return smoothedGeometry;
};

export const applySatelliteUv = (
  geometry: THREE.BufferGeometry,
  projection: any
) => {
  const SATELLITE_BOUNDS = {
    west: 65,
    east: 145,
    south: 10,
    north: 60
  };

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

    uv[index * 2] = Math.min(1, Math.max(0, (longitude - SATELLITE_BOUNDS.west) / longitudeRange));
    uv[index * 2 + 1] = Math.min(1, Math.max(0, (latitude - SATELLITE_BOUNDS.south) / latitudeRange));
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
};

export const applyTerrainReliefToLine = (
  geometry: THREE.BufferGeometry,
  getHeight: (x: number, y: number) => number
) => {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    position.setZ(
      index,
      getHeight(position.getX(index), position.getY(index)) + 3.5
    );
  }
  position.needsUpdate = true;
};
