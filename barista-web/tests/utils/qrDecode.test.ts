import jsQR from 'jsqr';

import { createBarcodeDetector, decodeQrFromCanvas, isBarcodeDetectorSupported } from '../../src/utils/qrDecode';

vi.mock('jsqr');

const mockJsQR = vi.mocked(jsQR);

// jsdom does not implement real 2D canvas rendering without the optional
// native `canvas` package (not installed here - see package.json: keeping
// dependencies minimal). getContext('2d') stubbed directly rather than
// pulling in that native dependency just for a test double.
function stubCanvasContext() {
  const getImageData = vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  const context = { drawImage: vi.fn(), getImageData } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  return { getImageData };
}

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error - test-only global cleanup
  delete window.BarcodeDetector;
});

describe('isBarcodeDetectorSupported / createBarcodeDetector', () => {
  it('reports unsupported when window.BarcodeDetector does not exist', () => {
    expect(isBarcodeDetectorSupported()).toBe(false);
    expect(createBarcodeDetector()).toBeNull();
  });

  it('constructs a detector when window.BarcodeDetector exists (feature-detected, not assumed)', () => {
    const detect = vi.fn();
    class FakeBarcodeDetector {
      detect = detect;
    }
    // @ts-expect-error - test-only global augmentation simulating browser support
    window.BarcodeDetector = FakeBarcodeDetector;

    expect(isBarcodeDetectorSupported()).toBe(true);
    expect(createBarcodeDetector()).not.toBeNull();
  });

  it('returns null (never throws) if construction fails - treated exactly like "not supported"', () => {
    class ThrowingBarcodeDetector {
      constructor() {
        throw new Error('unsupported format');
      }
    }
    // @ts-expect-error - test-only global augmentation
    window.BarcodeDetector = ThrowingBarcodeDetector;

    expect(createBarcodeDetector()).toBeNull();
  });
});

describe('decodeQrFromCanvas (the always-available jsQR fallback)', () => {
  it('returns null for a zero-size canvas without touching jsQR', () => {
    const canvas = document.createElement('canvas');
    expect(decodeQrFromCanvas(canvas)).toBeNull();
    expect(mockJsQR).not.toHaveBeenCalled();
  });

  it('returns the decoded value when jsQR finds a code', () => {
    stubCanvasContext();
    mockJsQR.mockReturnValue({ data: 'scanned-code-value' } as ReturnType<typeof jsQR>);
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;

    expect(decodeQrFromCanvas(canvas)).toBe('scanned-code-value');
  });

  it('returns null when jsQR finds nothing in the current frame (the normal, expected outcome)', () => {
    stubCanvasContext();
    mockJsQR.mockReturnValue(null);
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;

    expect(decodeQrFromCanvas(canvas)).toBeNull();
  });
});
