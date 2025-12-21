import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent, useThree } from "@react-three/fiber/native";
import { a, config, useSpring } from "@react-spring/three";

import { Instance3D, Vector3Tuple } from "../store/instance.hook";

type InstanceMeshProps = {
  data: Instance3D;
  isSelected: boolean;
  isLastCreated: boolean;
  onPress: () => void;
};

const SELECTED_SCALE_MULTIPLIER = 1.08;
const SPAWN_SCALE_MULTIPLIER = 0.75;

const BOX_SIZE = 1;
const SPHERE_RADIUS = 0.65;
const SPHERE_SEGMENTS = 48;

const OUTLINE_RING_RADIUS_MULTIPLIER = 1.01;
const OUTLINE_RING_SEGMENTS = 96;

const OUTLINE_COLOR_DEFAULT = "#0a0a0a";
const OUTLINE_COLOR_SELECTED = "#ffffff";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isVector3Tuple = (value: unknown): value is Vector3Tuple => {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return value.every((v) => isFiniteNumber(v));
};

const clampTuple = (value: unknown, fallback: Vector3Tuple): Vector3Tuple => {
  return isVector3Tuple(value) ? value : fallback;
};

const lightenHexColor = (hex: string, amount = 0.35) => {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));

  const out = (lr << 16) | (lg << 8) | lb;
  return `#${out.toString(16).padStart(6, "0")}`;
};

const useGreatCirclePoints = (
  radius: number,
  plane: "xy" | "xz" | "yz",
  segments = OUTLINE_RING_SEGMENTS
) => {
  return useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (let index = 0; index <= segments; index++) {
      const t = (index / segments) * Math.PI * 2;
      const x = Math.cos(t) * radius;
      const y = Math.sin(t) * radius;

      if (plane === "xy") points.push(new THREE.Vector3(x, y, 0));
      if (plane === "xz") points.push(new THREE.Vector3(x, 0, y));
      if (plane === "yz") points.push(new THREE.Vector3(0, x, y));
    }

    return points;
  }, [radius, plane, segments]);
};

const CircleLine = ({
  points,
  color,
}: {
  points: THREE.Vector3[];
  color: string;
}) => {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points);
    return g;
  }, [points]);

  return (
    <lineLoop raycast={() => null as any}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} />
    </lineLoop>
  );
};

export const InstanceMesh = ({
  data,
  isSelected,
  isLastCreated,
  onPress,
}: InstanceMeshProps) => {
  const invalidate = useThree((state) => state.invalidate);

  const position = useMemo(
    () => clampTuple(data.position, [0, 0, 0]),
    [data.position]
  );
  const rotation = useMemo(
    () => clampTuple(data.rotation, [0, 0, 0]),
    [data.rotation]
  );

  const materialColor = useMemo(() => {
    return isSelected ? lightenHexColor(data.color, 0.35) : data.color;
  }, [data.color, isSelected]);

  const targetScale = useMemo(() => {
    return isSelected ? data.scale * SELECTED_SCALE_MULTIPLIER : data.scale;
  }, [data.scale, isSelected]);

  const spring = useSpring({
    from: { s: data.scale * SPAWN_SCALE_MULTIPLIER },
    to: { s: targetScale },
    immediate: !isLastCreated && !isSelected,
    config: config.gentle,
    onChange: () => invalidate(),
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onPress();
  };

  const outlineColor = isSelected
    ? OUTLINE_COLOR_SELECTED
    : OUTLINE_COLOR_DEFAULT;

  const boxEdgesGeometry = useMemo(() => {
    if (data.type !== "box") return null;
    const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    return new THREE.EdgesGeometry(boxGeometry, 15);
  }, [data.type]);

  const ringRadius = SPHERE_RADIUS * OUTLINE_RING_RADIUS_MULTIPLIER;
  const circleXY = useGreatCirclePoints(ringRadius, "xy");
  const circleXZ = useGreatCirclePoints(ringRadius, "xz");
  const circleYZ = useGreatCirclePoints(ringRadius, "yz");

  return (
    <a.group
      position={position}
      rotation={rotation}
      scale={spring.s}
      onPointerDown={handlePointerDown}
    >
      <mesh>
        {data.type === "box" ? (
          <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
        ) : (
          <sphereGeometry
            args={[SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS]}
          />
        )}

        <meshStandardMaterial
          color={materialColor}
          roughness={0.65}
          metalness={0.05}
          transparent={false}
          opacity={1}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {data.type === "box" && boxEdgesGeometry ? (
        <lineSegments raycast={() => null as any}>
          <primitive object={boxEdgesGeometry} attach="geometry" />
          <lineBasicMaterial
            color={outlineColor}
            depthTest
            depthWrite={false}
          />
        </lineSegments>
      ) : null}

      {data.type === "sphere" ? (
        <>
          <CircleLine points={circleXY} color={outlineColor} />
          <CircleLine points={circleXZ} color={outlineColor} />
          <CircleLine points={circleYZ} color={outlineColor} />
        </>
      ) : null}
    </a.group>
  );
};
