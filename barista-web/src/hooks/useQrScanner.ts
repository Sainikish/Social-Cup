import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createBarcodeDetector,
  decodeQrFromCanvas,
  type BarcodeDetectorLike,
} from '../utils/qrDecode';

export type ScannerStatus = 'idle' | 'requesting' | 'active' | 'unavailable';

interface UseQrScannerOptions {
  // Called at most once per start() - the scanner stops itself immediately
  // on the first successful decode (see requirement: do not keep the
  // camera running after a QR code has been captured). Call start() again
  // to scan another code.
  onDecode: (value: string) => void;
}

interface UseQrScannerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: ScannerStatus;
  start: () => Promise<void>;
  stop: () => void;
}

const SCAN_INTERVAL_MS = 200;
const READY_STATE_HAVE_CURRENT_DATA = 2;

export function useQrScanner({ onDecode }: UseQrScannerOptions): UseQrScannerResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorLike | null>(null);
  const hasDecodedRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');

  const stopStream = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopStream();
    setStatus((current) => (current === 'unavailable' ? current : 'idle'));
  }, [stopStream]);

  const decodeFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || hasDecodedRef.current || video.readyState < READY_STATE_HAVE_CURRENT_DATA) {
      return;
    }

    let decodedValue: string | null = null;

    if (barcodeDetectorRef.current) {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        if (barcodes.length > 0) {
          decodedValue = barcodes[0].rawValue;
        }
      } catch {
        // Fall through to the jsQR fallback below on any detector failure -
        // BarcodeDetector is only ever an optimization, never the sole path.
      }
    }

    if (!decodedValue && video.videoWidth > 0 && video.videoHeight > 0) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      decodedValue = decodeQrFromCanvas(canvas);
    }

    // Re-checked here (not just at the top) because detect() above is
    // async - a second tick could have already decoded and stopped the
    // scanner while this call was in flight.
    if (decodedValue && !hasDecodedRef.current) {
      hasDecodedRef.current = true;
      stopStream();
      setStatus('idle');
      onDecode(decodedValue);
    }
  }, [onDecode, stopStream]);

  const start = useCallback(async () => {
    hasDecodedRef.current = false;
    barcodeDetectorRef.current = createBarcodeDetector();
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
      intervalRef.current = setInterval(() => {
        void decodeFrame();
      }, SCAN_INTERVAL_MS);
    } catch {
      // Covers permission denial, no camera device, and any other
      // getUserMedia failure identically - "Camera unavailable", with
      // manual entry as the always-available fallback (see ScannerScreen).
      setStatus('unavailable');
    }
  }, [decodeFrame]);

  useEffect(() => {
    // Stop the camera stream unconditionally on unmount - it must never
    // keep running once the user has navigated away from the scanner.
    return () => stopStream();
  }, [stopStream]);

  return { videoRef, status, start, stop };
}
