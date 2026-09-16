import * as THREE from 'three';
import { mapPalette } from '../constants/colors';

export const createGeoMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: mapPalette.baseFill,
    emissive: mapPalette.baseEmissive,
    vertexColors: true,
    roughness: 0.68,
    metalness: 0.05,
    transparent: true,
    opacity: 0.86
  });

export const createGeoHoverMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: mapPalette.hoverFill,
    emissive: mapPalette.hoverEmissive,
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 0.94
  });

export const createGeoActiveMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: mapPalette.activeFill,
    emissive: mapPalette.activeEmissive,
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95
  });

export const createBarMaterial = () =>
  new THREE.MeshPhongMaterial({
    color: mapPalette.barStart,
    emissive: mapPalette.barEmissive,
    specular: 0xf0fdff,
    shininess: 145,
    transparent: true,
    opacity: 0.94
  });

export const createOceanMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0x1d5a70,
    emissive: 0x0a2533,
    roughness: 0.2,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.26,
    transparent: true,
    opacity: 0.72
  });
