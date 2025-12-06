'use client';

import { useRef, useState, useCallback } from 'react';
import Scene, { ShapeType } from '@/components/Scene';
import HandTracker, { HandData } from '@/components/HandTracker';
import UI from '@/components/UI';

export default function Home() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('sphere');
  const [debugGesture, setDebugGesture] = useState<string>('none');

  // Shared Reference for high-performance updates
  const handDataRef = useRef<HandData>({
    x: 0.5,
    y: 0.5,
    z: 0,
    isDetected: false,
    gesture: 'none',
    pinchDistance: 0,
    tiltX: 0,
    tiltY: 0,
  });

  const handleHandUpdate = useCallback((data: HandData) => {
    // Smooth input data
    const lerp = 0.3;
    const current = handDataRef.current;

    if (data.isDetected) {
      current.x += (data.x - current.x) * lerp;
      current.y += (data.y - current.y) * lerp;
      current.z = data.z; // usually 0
      current.isDetected = true;
      current.gesture = data.gesture;
      current.pinchDistance = data.pinchDistance;
      current.tiltX += (data.tiltX - current.tiltX) * lerp;
      current.tiltY += (data.tiltY - current.tiltY) * lerp;

      // Update debug UI occasionally
      if (Math.random() > 0.9) setDebugGesture(data.gesture);
    } else {
      current.isDetected = false;
      current.gesture = 'none';
      if (Math.random() > 0.9) setDebugGesture('none');
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black selection:bg-none">
      <Scene currentShape={currentShape} handDataRef={handDataRef} />

      <HandTracker onHandUpdate={handleHandUpdate} />

      <UI currentShape={currentShape} onShapeChange={setCurrentShape} />

      {/* Header Info */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-none z-20">
        <div>
          <h1 className="text-white/80 text-lg tracking-[0.2em] font-light uppercase">
            Aether<span className="font-bold text-cyan-400">Hand</span>
          </h1>
          <p className="text-white/40 text-xs mt-1 tracking-wider">
            Gesture Interactive Particle System
          </p>
        </div>

        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 justify-end">
            <span
              className={`w-2 h-2 rounded-full ${
                debugGesture !== 'none'
                  ? 'bg-green-500 shadow-[0_0_10px_#22c55e]'
                  : 'bg-red-500'
              }`}
            ></span>
            <span className="text-white/60 text-xs font-mono uppercase">
              AI Vision
            </span>
          </div>
          <div className="text-white/40 text-xs font-mono">
            MODE:{' '}
            <span className="text-cyan-400">{debugGesture.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Interaction Hints */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 space-y-6 pointer-events-none opacity-50 hidden md:block">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/60 text-xs">
            ✋
          </div>
          <span className="text-white/40 text-xs uppercase tracking-widest">
            Repulse
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/60 text-xs">
            ✊
          </div>
          <span className="text-white/40 text-xs uppercase tracking-widest">
            Gravity
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/60 text-xs">
            👌
          </div>
          <span className="text-white/40 text-xs uppercase tracking-widest">
            Condense
          </span>
        </div>
      </div>
    </main>
  );
}
