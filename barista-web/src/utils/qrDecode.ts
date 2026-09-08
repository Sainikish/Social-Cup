import jsQR from 'jsqr';

// Minimal shape of the real (experimental) BarcodeDetector API - not shipped
// in TypeScript's DOM lib yet, so declared locally rather than assumed.
export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

// Feature-detected, never assumed - BarcodeDetector has limited browser
// availability (notably absent in Safari at the time of writing per MDN).
// Treated purely as an optimization over decodeQrFromCanvas() below, which
// works identically in every browser and is what this feature actually
// depends on for correctness.
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function createBarcodeDetector(): BarcodeDetectorLike | null {
  if (!isBarcodeDetectorSupported()) {
    return null;
  }
  try {
    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    return new BarcodeDetectorCtor({ formats: ['qr_code'] });
  } catch {
    // Some browsers expose the constructor but reject unsupported formats,
    // or throw for other reasons - treat any construction failure exactly
    // like "not supported" rather than letting it crash the scanner.
    return null;
  }
}

// The reliable fallback: decodes a QR code from whatever has already been
// drawn onto `canvas` (a video frame, in practice) using jsQR, a pure-JS
// decoder with no native/experimental API dependency. Returns null rather
// than throwing when there is nothing decodable in the current frame - that
// is the normal, expected outcome of most scan attempts, not an error.
export function decodeQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  if (canvas.width === 0 || canvas.height === 0) {
    return null;
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  return result?.data ?? null;
}
