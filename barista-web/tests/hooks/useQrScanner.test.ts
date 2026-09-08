import { act, renderHook } from '@testing-library/react';

import { useQrScanner } from '../../src/hooks/useQrScanner';
import { createBarcodeDetector, decodeQrFromCanvas } from '../../src/utils/qrDecode';

vi.mock('../../src/utils/qrDecode');

const mockCreateBarcodeDetector = vi.mocked(createBarcodeDetector);
const mockDecodeQrFromCanvas = vi.mocked(decodeQrFromCanvas);

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
}

function fakeStream(track: FakeTrack): MediaStream {
  return { getTracks: () => [track] } as unknown as MediaStream;
}

function attachFakeVideo(hookResult: { videoRef: { current: HTMLVideoElement | null } }): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'play', { value: vi.fn().mockResolvedValue(undefined), configurable: true });
  Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
  Object.defineProperty(video, 'videoWidth', { value: 100, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 100, configurable: true });
  hookResult.videoRef.current = video;
  return video;
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Exercises the always-available jsQR fallback path by default in these
  // tests - BarcodeDetector itself is covered separately in
  // tests/utils/qrDecode.test.ts.
  mockCreateBarcodeDetector.mockReturnValue(null);
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: { getUserMedia },
  });
  // The hook draws each frame onto its own internal canvas before handing
  // it to (mocked, here) decodeQrFromCanvas - jsdom has no real 2D canvas
  // implementation without the optional native `canvas` package (not
  // installed - see package.json), so getContext('2d') is stubbed directly
  // rather than pulling that in just for a test double.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useQrScanner', () => {
  it('requests the camera only when start() is called, and becomes active on success', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.start();
    });

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
    expect(result.current.status).toBe('active');
  });

  it('reports "unavailable" when camera permission is denied', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('reports "unavailable" when no camera device exists (not a crash)', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Requested device not found', 'NotFoundError'));
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('calls onDecode exactly once, stops the stream, and returns to idle when a QR code is found', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    mockDecodeQrFromCanvas.mockReturnValue('member-code-123');
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(onDecode).toHaveBeenCalledTimes(1);
    expect(onDecode).toHaveBeenCalledWith('member-code-123');
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });

  it('never calls onDecode more than once even across several more decode ticks (duplicate-scan prevention)', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    mockDecodeQrFromCanvas.mockReturnValue('member-code-123');
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(onDecode).toHaveBeenCalledTimes(1);
  });

  it('does not decode anything when no code is present in the frame (the normal case)', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    mockDecodeQrFromCanvas.mockReturnValue(null);
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onDecode).not.toHaveBeenCalled();
    expect(result.current.status).toBe('active');
  });

  it('stops the camera stream on unmount', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    const onDecode = vi.fn();

    const { result, unmount } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it('stop() stops the stream immediately and returns to idle', async () => {
    const track = { stop: vi.fn() };
    getUserMedia.mockResolvedValue(fakeStream(track));
    const onDecode = vi.fn();

    const { result } = renderHook(() => useQrScanner({ onDecode }));
    attachFakeVideo(result.current);

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });
});
