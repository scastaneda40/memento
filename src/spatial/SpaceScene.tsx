import React, { useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { type Memento } from "../types";
import { layoutSpace } from "./layoutSpace";
import MementoPoint from "./MementoPoint";

interface SpaceSceneProps {
  mementos: Memento[];
}

const SceneContent: React.FC<{ mementos: Memento[] }> = ({ mementos }) => {
  const { scene } = useThree();
  const [hoveredMemento, setHoveredMemento] = useState<string | null>(null);
  const [selectedMemento, setSelectedMemento] = useState<Memento | null>(null);

  // Lighting
  React.useEffect(() => {
    scene.add(new THREE.AmbientLight(0x404040, 2));
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
  }, [scene]);

  const mementoPositions = layoutSpace(mementos);

  const handleMementoClick = (memento: Memento) => {
    setSelectedMemento(memento);
    // TODO: Implement info card display
    console.log("Clicked memento:", memento.title);
  };

  if (mementos.length === 0) {
    return (
      <Text position={[0, 0, 0]} color="white" fontSize={0.5}>
        No Mementos to display.
      </Text>
    );
  }

  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        screenSpacePanning={false}
        minDistance={10}
        maxDistance={1000}
      />
      <Stars
        radius={2000}
        depth={50}
        count={10000}
        factor={10}
        saturation={0}
        fade
      />

      {mementos.map((memento, index) => (
        <MementoPoint
          key={memento.id}
          memento={memento}
          position={mementoPositions[index]}
          onHover={setHoveredMemento}
          onClick={handleMementoClick}
        />
      ))}

      {/* Floating Info Card (TODO: Implement proper UI) */}
      {hoveredMemento && (
        <mesh position={[0, 2, -5]}>
          <planeGeometry args={[2, 1]} />
          <meshBasicMaterial color="white" transparent opacity={0.7} />
          {/* <Text position={[0, 0, 0.1]} fontSize={0.2} color="black">
            {mementos.find(m => m.id === hoveredMemento)?.title}
          </Text> */}
        </mesh>
      )}
    </>
  );
};

const SpaceScene: React.FC<SpaceSceneProps> = ({ mementos }) => {
  return (
    <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
      <SceneContent mementos={mementos} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.5} height={600} />
      </EffectComposer>
      {/* <primitive object={new THREE.AxesHelper(50)} /> */}
    </Canvas>
  );
};

export default SpaceScene;
