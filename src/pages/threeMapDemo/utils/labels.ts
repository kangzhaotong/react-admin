import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export const createGDPLabel = (gdp: number, province: string) => {
  const label = document.createElement('div');
  label.className = 'gdp-label';
  label.innerHTML = `<div class="gdp-value">${(gdp / 10000).toFixed(1)}万亿</div><div class="gdp-province">${province}</div>`;
  label.style.position = 'absolute';
  label.style.pointerEvents = 'none';
  label.style.whiteSpace = 'nowrap';
  label.style.fontSize = '12px';
  label.style.color = '#b9efff';
  label.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
  label.style.textAlign = 'center';
  label.style.lineHeight = '1.2';

  return label;
};

export const createCSS2DLabel = (label: HTMLElement, x: number, y: number, z: number) => {
  const css2dLabel = new CSS2DObject(label);
  css2dLabel.position.set(x, y, z);
  css2dLabel.visible = true;
  return css2dLabel;
};
