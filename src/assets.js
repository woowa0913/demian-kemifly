import { ASSET_PATHS } from "./config.js";

export async function loadAssets() {
  const entries = Object.entries(ASSET_PATHS);
  const loaded = await Promise.all(entries.map(([key, src]) => loadImage(key, src)));
  return Object.fromEntries(loaded);
}

function loadImage(key, src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve([key, image]);
    image.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    image.src = src;
  });
}
