import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";

const LOW_END = (navigator.hardwareConcurrency || 4) <= 4;

function Reel() {
  const group = useRef();
  const disc = useRef();
  const ring = useRef();
  const mouse = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.5, 0, Math.PI * 2, false);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hole = new THREE.Path();
      hole.absarc(
        Math.cos(a) * 0.9,
        Math.sin(a) * 0.9,
        0.36,
        0,
        Math.PI * 2,
        true,
      );
      shape.holes.push(hole);
    }
    const hub = new THREE.Path();
    hub.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
    shape.holes.push(hub);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 32,
    });
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    const { x, y } = mouse.current;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      x * 0.9 + 0.35,
      4,
      dt,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      -y * 0.5 + 0.15,
      4,
      dt,
    );
    disc.current.rotation.z += dt * 0.6;
    ring.current.rotation.y += dt * 0.4;
  });

  return (
    <group ref={group}>
      <Float speed={1.4} floatIntensity={0.5} rotationIntensity={0.12}>
        <mesh ref={disc} geometry={geometry} position={[0, 0, -0.16]}>
          <meshStandardMaterial
            color="#F5B700"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
        <mesh ref={ring} rotation={[1.1, 0, 0]}>
          <torusGeometry args={[2.2, 0.03, 12, 96]} />
          <meshStandardMaterial
            color="#F4F1E8"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function ReelScene() {
  const [dpr, setDpr] = useState(LOW_END ? 1 : 1.5);

  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 38 }}
      dpr={dpr}
      gl={{
        antialias: !LOW_END,
        alpha: true,
        powerPreference: "high-performance",
      }}
    >
      {/* lowers resolution automatically if the PC struggles */}
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => !LOW_END && setDpr(1.5)}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 5, 5]} intensity={2} color="#ffe2a0" />
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={4}
          position={[0, 4, 4]}
          scale={[8, 3, 1]}
          color="#fff2c8"
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[-5, 0, 2]}
          scale={[3, 6, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[5, -2, -3]}
          scale={[4, 4, 1]}
          color="#F5B700"
        />
      </Environment>
      <Reel />
    </Canvas>
  );
}
