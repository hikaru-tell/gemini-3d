'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import type { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';

export interface HandData {
  x: number;
  y: number;
  z: number;
  isDetected: boolean;
  gesture: 'open' | 'fist' | 'pinch' | 'none';
  pinchDistance: number;
  tiltX: number; // -1 to 1 (left/right tilt)
  tiltY: number; // -1 to 1 (up/down tilt)
}

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
}

export default function HandTracker({ onHandUpdate }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isScriptLoaded || !videoRef.current) return;

    const videoElement = videoRef.current;
    const HandsConstructor = (window as any).Hands;

    if (!HandsConstructor) {
        setError("Failed to load Hands library.");
        return;
    }

    let hands: Hands | null = null;
    let stream: MediaStream | null = null;

    const detectGesture = (landmarks: NormalizedLandmark[]): { gesture: HandData['gesture'], pinchDist: number } => {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        
        // Calculate Pinch Distance (Euclidean distance in 2D, ignoring Z for simplicity usually works well for UI)
        const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        
        // Simple Pinch Detection
        if (pinchDist < 0.05) {
            return { gesture: 'pinch', pinchDist };
        }

        // Fist Detection
        // Check if fingertips are below finger pip joints (simplified)
        // Note: Coordinates: y increases downwards.
        // If Tip y > PIP y, finger is likely bent down.
        const isFingerBent = (tipIdx: number, pipIdx: number) => {
            return landmarks[tipIdx].y > landmarks[pipIdx].y;
        };

        const indexBent = isFingerBent(8, 6);
        const middleBent = isFingerBent(12, 10);
        const ringBent = isFingerBent(16, 14);
        const pinkyBent = isFingerBent(20, 18);

        if (indexBent && middleBent && ringBent && pinkyBent) {
            return { gesture: 'fist', pinchDist };
        }

        return { gesture: 'open', pinchDist };
    };

    const initMediaPipe = async () => {
      try {
        hands = new HandsConstructor({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        if (hands) {
            hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            });

            hands.onResults((results: Results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                
                // Use center of palm (approx) or Index finger
                // Index 9 is Middle Finger MCP (knuckle), usually stable center
                const handCenter = landmarks[9]; 
                
                const { gesture, pinchDist } = detectGesture(landmarks);
                
                // Calculate Tilt (Wrist vs Middle Finger MCP)
                // 0: Wrist, 9: Middle MCP
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                const dx = middleMCP.x - wrist.x;
                const dy = middleMCP.y - wrist.y;
                
                // Normalizing tilt (approximate range)
                const tiltX = Math.max(-1, Math.min(1, dx * 5));
                
                onHandUpdate({
                    x: 1.0 - handCenter.x, // Mirror X
                    y: handCenter.y,
                    z: 0, // Could approximate Z with landmark depth if needed
                    isDetected: true,
                    gesture,
                    pinchDistance: pinchDist,
                    tiltX,
                    tiltY: dy
                });
            } else {
                onHandUpdate({
                    x: 0, y: 0, z: 0,
                    isDetected: false,
                    gesture: 'none',
                    pinchDistance: 0,
                    tiltX: 0,
                    tiltY: 0
                });
            }
            });
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user'
          }
        });

        videoElement.srcObject = stream;
        
        await new Promise<void>((resolve) => {
           videoElement.onloadedmetadata = () => {
             videoElement.play();
             resolve();
           };
        });

        setIsLoading(false);
        
        const processFrame = async () => {
          if (videoElement && !videoElement.paused && !videoElement.ended) {
            if (hands) {
               await hands.send({ image: videoElement });
            }
          }
          requestRef.current = requestAnimationFrame(processFrame);
        };
        requestRef.current = requestAnimationFrame(processFrame);

      } catch (err) {
        console.error("MediaPipe Init Error:", err);
        setError("Camera access denied.");
        setIsLoading(false);
      }
    };

    initMediaPipe();

    return () => {
      cancelAnimationFrame(requestRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (hands) {
        hands.close();
      }
    };
  }, [isScriptLoaded, onHandUpdate]);

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        strategy="afterInteractive"
        onLoad={() => {
            setIsScriptLoaded(true);
        }}
      />
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-24 h-24 object-cover opacity-0 pointer-events-none z-0"
        playsInline
      />
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 pointer-events-none flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-cyan-500 text-xs tracking-wider">AI SYSTEM INITIALIZING</span>
        </div>
      )}
    </>
  );
}
