'use client';

import { ShapeType } from './Scene';

interface UIProps {
  currentShape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
}

const shapes: ShapeType[] = ['sphere', 'torus', 'galaxy'];

export default function UI({ currentShape, onShapeChange }: UIProps) {
  return (
    <>
      <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-6 z-30 pointer-events-none">
        
        {/* Shape Selectors */}
        <div className="flex gap-4">
            {shapes.map((shape) => (
            <button
                key={shape}
                onClick={() => onShapeChange(shape)}
                className={`
                pointer-events-auto
                px-6 py-2 rounded-full text-sm font-medium uppercase tracking-wider
                transition-all duration-300 backdrop-blur-md border
                ${
                    currentShape === shape
                    ? 'bg-white/30 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] transform scale-105'
                    : 'bg-white/10 border-white/40 text-white hover:bg-white/20'
                }
                `}
            >
                {shape}
            </button>
            ))}
        </div>

      </div>
    </>
  );
}
