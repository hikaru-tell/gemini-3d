'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandData } from './HandTracker';

export type ShapeType = 'sphere' | 'heart' | 'torus' | 'galaxy';

interface SceneProps {
  currentShape: ShapeType;
  handDataRef: React.MutableRefObject<HandData>;
}

const PARTICLE_COUNT = 12000; // Increased count for better visuals
const FIELD_RADIUS = 10;
const HAND_INFLUENCE_RADIUS = 6.0;

export default function Scene({ currentShape, handDataRef }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const requestRef = useRef<number>(0);
  
  // Physics & State
  const originalPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const randomOffsetsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const timeRef = useRef<number>(0);
  
  // Camera State for smooth transitions
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 20));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.02); // Darker fog
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 20;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    initParticles(scene);

    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.015;
      
      updateCamera();
      updateParticles();
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    calculateShape(currentShape);
  }, [currentShape]);

  function initParticles(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    const currentPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color();

    calculateShape('sphere');
    currentPositions.set(originalPositionsRef.current);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Futuristic Neon Palette
      const t = i / PARTICLE_COUNT;
      if (Math.random() > 0.5) {
          color.setHSL(0.6 + t * 0.1, 0.9, 0.6); // Cyan/Blue
      } else {
          color.setHSL(0.8 + t * 0.1, 0.9, 0.6); // Magenta/Purple
      }
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      randomOffsetsRef.current[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      map: createGlowTexture()
    });

    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);
  }

  function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if(!ctx) return new THREE.Texture();
    
    // Soft glow
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(230, 240, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  function calculateShape(type: ShapeType) {
    const positions = originalPositionsRef.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x = 0, y = 0, z = 0;
      
      // Normalized index
      const t = i / PARTICLE_COUNT;

      if (type === 'sphere') {
         const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
         const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
         const r = FIELD_RADIUS * (0.8 + Math.random() * 0.2);
         x = r * Math.sin(phi) * Math.cos(theta);
         y = r * Math.sin(phi) * Math.sin(theta);
         z = r * Math.cos(phi);
      } 
      else if (type === 'heart') {
         const phi = Math.random() * Math.PI * 2;
         const theta = Math.random() * Math.PI;
         // Complex heart formula approx
         const r = FIELD_RADIUS * 0.05 * Math.sqrt(Math.random()); 
         const xx = 16 * Math.pow(Math.sin(phi), 3);
         const yy = 13 * Math.cos(phi) - 5 * Math.cos(2*phi) - 2 * Math.cos(3*phi) - Math.cos(4*phi);
         x = xx * r * 8;
         y = yy * r * 8 + 2;
         z = (Math.random() - 0.5) * 5;
      }
      else if (type === 'torus') {
         const u = Math.random() * Math.PI * 2;
         const v = Math.random() * Math.PI * 2;
         const R = 8, r = 2.5;
         x = (R + r * Math.cos(v)) * Math.cos(u);
         y = (R + r * Math.cos(v)) * Math.sin(u);
         z = r * Math.sin(v);
         // Add some dispersion
         x += (Math.random() - 0.5);
         y += (Math.random() - 0.5);
         z += (Math.random() - 0.5);
      }
      else if (type === 'galaxy') {
         const spiral = i * 0.02; // Tightness
         const arms = 3;
         const armOffset = (i % arms) * (Math.PI * 2 / arms);
         const r = Math.random() * FIELD_RADIUS * 1.5;
         const angle = spiral + armOffset;
         const curve = Math.pow(r / FIELD_RADIUS, 1.5); // Density distribution
         
         x = Math.cos(angle) * r;
         y = (Math.random() - 0.5) * (2 + r * 0.2); // Flat disc with bulge
         z = Math.sin(angle) * r;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
  }

  function updateCamera() {
    if (!cameraRef.current) return;
    const hand = handDataRef.current;
    
    // Dynamic Camera Parallax based on Hand Position
    // If hand is detected, tilt camera slightly
    if (hand.isDetected) {
        // Map 0..1 to -Range..Range
        // Tilt more on X axis (rotation Y) based on hand X
        // AMPLIFIED MOVEMENT: Increase multipliers
        const targetX = (hand.x - 0.5) * 35; // Increased from 10
        const targetY = (hand.y - 0.5) * 35; // Increased from 10
        
        // Also rotate based on hand tilt if available
        const rotY = hand.tiltX * 1.5; // Hand tilt affects camera rotation significantly
        
        // Smoothly interpolate
        cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.08;
        cameraRef.current.position.y += (-targetY - cameraRef.current.position.y) * 0.08;
        cameraRef.current.rotation.y += (rotY - cameraRef.current.rotation.y) * 0.08;
    } else {
        // Return to center slowly
        cameraRef.current.position.lerp(new THREE.Vector3(0,0,20), 0.02);
        cameraRef.current.rotation.x = 0;
        cameraRef.current.rotation.y = 0;
        cameraRef.current.rotation.z = 0;
    }
    
    cameraRef.current.lookAt(0, 0, 0);
  }

  function updateParticles() {
    if (!particlesRef.current) return;
    
    const geometry = particlesRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const targetPositions = originalPositionsRef.current;
    const offsets = randomOffsetsRef.current;
    const time = timeRef.current;
    const hand = handDataRef.current;
    
    // Convert normalized hand coords to world space approx
    const vFOV = THREE.MathUtils.degToRad(75);
    const distFromCam = 15; // Plane z=5 (20-15)
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distFromCam;
    const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);
    
    const wx = (hand.x - 0.5) * visibleWidth;
    const wy = (0.5 - hand.y) * visibleHeight;
    const wz = 5;

    // Determine Interaction Mode
    let mode = 'float';
    if (hand.isDetected) {
        mode = hand.gesture;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      const tx = targetPositions[idx];
      const ty = targetPositions[idx + 1];
      const tz = targetPositions[idx + 2];

      // Base Floating Motion (Simplex-like noise)
      // Faster, bigger noise for dynamic feel
      const noiseX = Math.sin(time * 1.5 + offsets[i] * 0.5) * 0.35;
      const noiseY = Math.cos(time * 1.2 + offsets[i] * 0.5) * 0.35;
      const noiseZ = Math.sin(time * 1.8 + offsets[i] * 0.5) * 0.35;

      let cx = positions[idx];
      let cy = positions[idx + 1];
      let cz = positions[idx + 2];
      
      let cr = colors[idx];
      let cg = colors[idx + 1];
      let cb = colors[idx + 2];

      // 1. Move towards target (Shape formation)
      // Faster or slower depending on mode
      const returnSpeed = mode === 'fist' ? 0.01 : 0.05; // Fist breaks formation
      cx += (tx + noiseX - cx) * returnSpeed;
      cy += (ty + noiseY - cy) * returnSpeed;
      cz += (tz + noiseZ - cz) * returnSpeed;

      // 2. Hand Interaction
      if (hand.isDetected) {
          const dx = cx - wx;
          const dy = cy - wy;
          const dz = cz - wz;
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < HAND_INFLUENCE_RADIUS * HAND_INFLUENCE_RADIUS + 10) { // +10 buffer
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              
              // --- Gesture Logic ---
              
              if (mode === 'fist') {
                  // BLACK HOLE / GRAVITY
                  // Strong attraction to center
                  // AMPLIFIED STRENGTH
                  const strength = (1 - dist / (HAND_INFLUENCE_RADIUS * 2)) * 2.5; // Increased from 0.8
                  cx -= nx * strength * 3; // Increased speed
                  cy -= ny * strength * 3;
                  cz -= nz * strength * 3;
                  
                  // Add swirl - FASTER
                  const swirlStrength = 0.8;
                  cx += -ny * swirlStrength;
                  cy += nx * swirlStrength;
                  
                  // Color shift to Red/Orange
                  cr += (1.0 - cr) * 0.15;
                  cg += (0.1 - cg) * 0.15;
                  cb += (0.0 - cb) * 0.15;
              } 
              else if (mode === 'pinch') {
                  // FREEZE / PRECISE CONTROL
                  // Particles lock in place or form a line? 
                  // Let's make them condense very tightly to hand center
                  const strength = (1 - dist / HAND_INFLUENCE_RADIUS) * 0.8;
                   if (dist > 0.5) { // Tighter threshold
                      cx -= nx * strength * 1.5;
                      cy -= ny * strength * 1.5;
                      cz -= nz * strength * 1.5;
                   }
                   
                   // Color shift to White
                   cr += (1.0 - cr) * 0.25;
                   cg += (1.0 - cg) * 0.25;
                   cb += (1.0 - cb) * 0.25;
              }
              else {
                  // OPEN PALM (Default) - REPULSION / FORCE FIELD
                  // AMPLIFIED REPULSION
                  if (dist < HAND_INFLUENCE_RADIUS * 1.2) { // Slightly larger radius
                      const strength = (1 - dist / (HAND_INFLUENCE_RADIUS * 1.2)) * 4.0; // Much stronger (was 1.5)
                      cx += nx * strength;
                      cy += ny * strength;
                      cz += nz * strength;
                      
                      // Color shift to Cyan/Blue bright
                      cr += (0.0 - cr) * 0.2;
                      cg += (1.0 - cg) * 0.2;
                      cb += (1.0 - cb) * 0.2;
                  }
              }
          }
      } else {
          // Revert colors slowly to base logic if needed, 
          // but usually overwriting with next frame's loop is okay 
          // if we store base color. 
          // For now, let them drift.
      }

      positions[idx] = cx;
      positions[idx + 1] = cy;
      positions[idx + 2] = cz;
      
      colors[idx] = cr;
      colors[idx + 1] = cg;
      colors[idx + 2] = cb;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return <div ref={containerRef} className="absolute top-0 left-0 w-full h-full z-0" />;
}
