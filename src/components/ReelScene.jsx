import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";

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
      bevelSegments: 4,
      curveSegments: 64,
    });
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    const { x, y } = mouse.current;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      x * 0.9 - 0.35,
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
      <Float speed={1.4} floatIntensity={0.7} rotationIntensity={0.15}>
        <mesh ref={disc} geometry={geometry} position={[0, 0, -0.16]}>
          <meshStandardMaterial
            color="#F5B700"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
        <mesh ref={ring} rotation={[1.1, 0, 0]}>
          <torusGeometry args={[2.35, 0.03, 16, 128]} />
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
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 5, 5]} intensity={2} color="#ffe2a0" />
      <Environment resolution={256}>
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
