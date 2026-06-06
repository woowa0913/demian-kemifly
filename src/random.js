export function secureUnit() {
  const buffer = new Uint32Array(1);
  window.crypto.getRandomValues(buffer);
  return buffer[0] / 0xffffffff;
}

export function secureRange(min, max) {
  return min + (max - min) * secureUnit();
}

export function securePick(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("securePick requires a non-empty array");
  }
  return items[Math.floor(secureUnit() * items.length)];
}
