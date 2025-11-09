import * as THREE from "three";
import type { Memento } from "../types";

export const layoutSpace = (
  mementos: Memento[],
  radius: number = 50
): THREE.Vector3[] => {
  const positions: THREE.Vector3[] = [];
  const numMementos = mementos.length;

  if (numMementos === 0) {
    return positions;
  }

  // Spherical distribution
  for (let i = 0; i < numMementos; i++) {
    const phi = Math.acos(-1 + (2 * i) / numMementos); // Inclination
    const theta = Math.sqrt(numMementos * Math.PI) * phi; // Azimuth

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    positions.push(new THREE.Vector3(x, y, z));
  }

  return positions;
};
