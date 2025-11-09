import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Memento } from "../types"; // Corrected import path for Memento type
import * as THREE from "three";

interface MementoPointProps {
  memento: Memento;
  position: THREE.Vector3;
  onHover: (mementoId: string | null) => void;
  onClick: (memento: Memento) => void;
}

const MementoPoint: React.FC<MementoPointProps> = ({
  memento,
  position,
  onHover,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      // Optional: Add a subtle floating animation
      meshRef.current.rotation.x += 0.001;
      meshRef.current.rotation.y += 0.001;
    }
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    onHover(memento.id);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(false);
    onHover(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onClick(memento);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[2, 32, 32]} />
      <meshPhysicalMaterial
        color={"#7a4a00"} // warm base
        emissive={"#ffb347"} // warm inner glow
        emissiveIntensity={1.4}
        transmission={0.6}
        thickness={0.6}
        ior={1.2}
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.2}
      />

      {/* Re-added Html content for memento details */}
      <Html
        center
        // keeps it above other Html elements; tweak the first number higher if needed
        zIndexRange={[2000, 0]}
        // keeps the DOM content facing the camera at any angle (optional)
        sprite
        position={[0, 0, 0.1]}
      >
        <div
          style={{
            position: "relative",
            width: 100,
            height: 100,
            borderRadius: "50%",
            overflow: "hidden",
            // optional: soft outer glow
            boxShadow: "0 0 24px 8px rgba(255, 199, 102, 0.35)",
          }}
        >
          {/* MEDIA (bottom layer) */}
          {memento.media_url ? (
            <img
              src={memento.media_url}
              alt={memento.title || "Memento Media"}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover", // fills circle, no letterboxing
                zIndex: 0,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 12,
                padding: 6,
                textAlign: "center",
                zIndex: 0,
              }}
            >
              {memento.title}
            </div>
          )}

          {/* GOLD OVERLAY (top layer) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              zIndex: 1,
              pointerEvents: "none", // don't block clicks/hover
              // warm radial glow + soft edge
              background:
                "radial-gradient(65% 65% at 50% 45%, rgba(255, 210, 122, 0.9) 0%, rgba(255, 183, 77, 0.55) 45%, rgba(255, 183, 77, 0.15) 75%, rgba(255, 183, 77, 0) 100%)",
              // makes highlights pop; remove if you want a flat tint
              mixBlendMode: "screen",
              // subtle highlight ring
              boxShadow:
                "inset 0 0 18px rgba(255, 199, 102, 0.65), 0 0 20px rgba(255, 199, 102, 0.35)",
            }}
          />
        </div>
      </Html>
    </mesh>
  );
};

export default MementoPoint;
