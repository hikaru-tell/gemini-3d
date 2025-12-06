'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandData } from './HandTracker';

export type ShapeType = 'sphere' | 'torus' | 'galaxy';

interface SceneProps {
  currentShape: ShapeType;
  handDataRef: React.MutableRefObject<HandData>;
}

const PARTICLE_COUNT = 50000;
const FIELD_RADIUS = 18;
const HAND_INFLUENCE_RADIUS = 8.0;

export default function Scene({ currentShape, handDataRef }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  const requestRef = useRef<number>(0);
  
  const originalPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const randomOffsetsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const timeRef = useRef<number>(0);
  
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 25));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 25;
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
      size: 0.55, // Massive bokeh
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.6, // Lower opacity to handle overlap intensity
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
      
      const t = i / PARTICLE_COUNT;

      if (type === 'sphere') {
         const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
         const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
         const r = FIELD_RADIUS * (0.8 + Math.random() * 0.2);
         x = r * Math.sin(phi) * Math.cos(theta);
         y = r * Math.sin(phi) * Math.sin(theta);
         z = r * Math.cos(phi);
      } 
      else if (type === 'torus') {
         const u = Math.random() * Math.PI * 2;
         const v = Math.random() * Math.PI * 2;
         const R = 8, r = 2.5;
         x = (R + r * Math.cos(v)) * Math.cos(u);
         y = (R + r * Math.cos(v)) * Math.sin(u);
         z = r * Math.sin(v);
         x += (Math.random() - 0.5);
         y += (Math.random() - 0.5);
         z += (Math.random() - 0.5);
      }
      else if (type === 'galaxy') {
         const spiral = i * 0.02; 
         const r = Math.random() * FIELD_RADIUS * 1.5;
         const angle = spiral + (i % 3) * (Math.PI * 2 / 3);
         x = Math.cos(angle) * r;
         y = (Math.random() - 0.5) * (2 + r * 0.2);
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
    
    if (hand.isDetected) {
        // Map 0..1 to -Range..Range
        const targetX = (hand.x - 0.5) * 80;
        const targetY = (hand.y - 0.5) * 60;
        
        const rotY = hand.tiltX * 3.0;
        const rotX = hand.tiltY * 2.0;
        
        cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.08;
        cameraRef.current.position.y += (-targetY - cameraRef.current.position.y) * 0.08;
        
        // Zoom Logic Update
        // Hand Y: 0(Top) -> 1(Bottom).
        const targetZ = 5 + (hand.y * 30); 
        
        cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.05;

        cameraRef.current.rotation.y += (rotY - cameraRef.current.rotation.y) * 0.08;
        cameraRef.current.rotation.x += (rotX - cameraRef.current.rotation.x) * 0.08;
    } else {
        cameraRef.current.position.lerp(new THREE.Vector3(0,0,25), 0.02);
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
    
    const vFOV = THREE.MathUtils.degToRad(75);
    const distFromCam = 20; 
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distFromCam;
    const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);
    
    const wx = (hand.x - 0.5) * visibleWidth;
    const wy = (0.5 - hand.y) * visibleHeight;
    const wz = 5;

    let mode = 'float';
    if (hand.isDetected) {
        mode = hand.gesture;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      let tx = targetPositions[idx];
      let ty = targetPositions[idx + 1];
      let tz = targetPositions[idx + 2];

      const noiseX = Math.sin(time * 1.5 + offsets[i] * 0.5) * 0.35;
      const noiseY = Math.cos(time * 1.2 + offsets[i] * 0.5) * 0.35;
      const noiseZ = Math.sin(time * 1.8 + offsets[i] * 0.5) * 0.35;

      let cx = positions[idx];
      let cy = positions[idx + 1];
      let cz = positions[idx + 2];
      
      let cr = colors[idx];
      let cg = colors[idx + 1];
      let cb = colors[idx + 2];

      // Move to target
      const returnSpeed = mode === 'fist' ? 0.01 : 0.05;
      cx += (tx + noiseX - cx) * returnSpeed;
      cy += (ty + noiseY - cy) * returnSpeed;
      cz += (tz + noiseZ - cz) * returnSpeed;

      // Interaction
      if (hand.isDetected) {
          const dx = cx - wx;
          const dy = cy - wy;
          const dz = cz - wz;
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < HAND_INFLUENCE_RADIUS * HAND_INFLUENCE_RADIUS + 10) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              
              if (mode === 'fist') {
                  const strength = (1 - dist / (HAND_INFLUENCE_RADIUS * 3)) * 5.0; 
                  cx -= nx * strength * 5; 
                  cy -= ny * strength * 5;
                  cz -= nz * strength * 5;
                  
                  const swirlStrength = 2.0;
                  cx += -ny * swirlStrength;
                  cy += nx * swirlStrength;
                  
                  cr += (1.0 - cr) * 0.2;
                  cg += (0.0 - cg) * 0.2;
                  cb += (0.0 - cb) * 0.2;
              } 
              else if (mode === 'pinch') {
                  const strength = (1 - dist / HAND_INFLUENCE_RADIUS) * 1.5;
                   if (dist > 0.2) { 
                      cx -= nx * strength * 3.0;
                      cy -= ny * strength * 3.0;
                      cz -= nz * strength * 3.0;
                   }
                   cr += (1.0 - cr) * 0.3;
                   cg += (1.0 - cg) * 0.3;
                   cb += (1.0 - cb) * 0.3;
              }
              else {
                  const radius = HAND_INFLUENCE_RADIUS * 2.5; 
                  if (dist < radius) { 
                      const strength = (1 - dist / radius) * 15.0; 
                      cx += nx * strength;
                      cy += ny * strength;
                      cz += nz * strength;
                      
                      cr += (0.0 - cr) * 0.3;
                      cg += (1.0 - cg) * 0.3;
                      cb += (1.0 - cb) * 0.3;
                  }
              }
          }
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
