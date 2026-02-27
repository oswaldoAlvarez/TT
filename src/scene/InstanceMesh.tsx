import { useMemo } from "react";
import { Platform } from "react-native";
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

const SELECTED_SCALE_MULTIPLIER = 1.06;
const SPAWN_SCALE_MULTIPLIER = 0.85;

const PLANET_RADIUS = 0.7;
const SPHERE_SEGMENTS = Platform.OS === "ios" ? 14 : 40;

const ATMOSPHERE_SCALE = 1.06;
const ATMOSPHERE_OPACITY = Platform.OS === "ios" ? 0.12 : 0.18;

const RING_INNER = 0.95;
const RING_OUTER = 1.35;
const RING_SEGMENTS = Platform.OS === "ios" ? 24 : 64;

const isIOS = Platform.OS === "ios";
const shouldAnimate = !isIOS;
const shouldRenderRing = !isIOS;

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

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const createSeedFromId = (id: string) => {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const textureCache = new Map<string, THREE.DataTexture>();

const createPlanetTexture = (
  id: string,
  baseColor: string,
  hasContinents: boolean,
  size: number
) => {
  const key = `${id}-${baseColor}-${hasContinents}-${size}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const rng = mulberry32(createSeedFromId(id));
  const { r, g, b } = hexToRgb(baseColor);
  const ocean = {
    r: Math.max(0, Math.round(r * 0.6)),
    g: Math.max(0, Math.round(g * 0.6)),
    b: Math.max(0, Math.round(b * 0.7)),
  };
  const land = hasContinents
    ? {
        r: Math.min(255, Math.round(r + 40 + rng() * 60)),
        g: Math.min(255, Math.round(g + 50 + rng() * 80)),
        b: Math.min(255, Math.round(b + 20 + rng() * 40)),
      }
    : ocean;

  const data = new Uint8Array(size * size * 4);
  const offsetA = rng() * Math.PI * 2;
  const offsetB = rng() * Math.PI * 2;
  const scaleA = 1.3 + rng() * 1.8;
  const scaleB = 1.5 + rng() * 2.1;
  const threshold = 0.1 + rng() * 0.25;

  for (let y = 0; y < size; y += 1) {
    const v = y / (size - 1);
    const lat = (v - 0.5) * Math.PI;
    const latFactor = Math.cos(lat);
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const lon = (u - 0.5) * Math.PI * 2;

      let noise =
        Math.sin(lon * scaleA + offsetA) * 0.6 +
        Math.cos(lat * scaleB + offsetB) * 0.5 +
        Math.sin((lon + lat) * 1.7) * 0.3;
      noise = noise * latFactor;

      const isLand = hasContinents && noise > threshold;
      const color = isLand ? land : ocean;

      const index = (y * size + x) * 4;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  textureCache.set(key, texture);
  return texture;
};

const sphereGeometryCache = new Map<string, THREE.SphereGeometry>();
const getSphereGeometry = (radius: number, segments: number) => {
  const key = `${radius}-${segments}`;
  const cached = sphereGeometryCache.get(key);
  if (cached) return cached;
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  sphereGeometryCache.set(key, geometry);
  return geometry;
};

const ringGeometryCache = new Map<string, THREE.RingGeometry>();
const getRingGeometry = (inner: number, outer: number, segments: number) => {
  const key = `${inner}-${outer}-${segments}`;
  const cached = ringGeometryCache.get(key);
  if (cached) return cached;
  const geometry = new THREE.RingGeometry(inner, outer, segments);
  ringGeometryCache.set(key, geometry);
  return geometry;
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
    return isSelected ? lightenHexColor(data.color, 0.3) : data.color;
  }, [data.color, isSelected]);

  const emissiveColor = useMemo(
    () => lightenHexColor(data.color, 0.55),
    [data.color]
  );

  const targetScale = useMemo(() => {
    return isSelected ? data.scale * SELECTED_SCALE_MULTIPLIER : data.scale;
  }, [data.scale, isSelected]);

  const spring = useSpring({
    from: { s: data.scale * SPAWN_SCALE_MULTIPLIER },
    to: { s: targetScale },
    immediate: !shouldAnimate || (!isLastCreated && !isSelected),
    config: config.gentle,
    onChange: shouldAnimate ? () => invalidate() : undefined,
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onPress();
  };

  const sphereGeometry = useMemo(
    () => getSphereGeometry(PLANET_RADIUS, SPHERE_SEGMENTS),
    []
  );
  const atmosphereGeometry = useMemo(
    () => getSphereGeometry(PLANET_RADIUS * ATMOSPHERE_SCALE, SPHERE_SEGMENTS),
    []
  );
  const textureSize = Platform.OS === "ios" ? 48 : 72;
  const planetTexture = useMemo(
    () =>
      createPlanetTexture(data.id, materialColor, data.hasContinents, textureSize),
    [data.id, materialColor, data.hasContinents, textureSize]
  );
  const ringGeometry = useMemo(() => {
    if (!data.ring || !shouldRenderRing) return null;
    return getRingGeometry(RING_INNER, RING_OUTER, RING_SEGMENTS);
  }, [data.ring]);

  const ringRotation = useMemo(() => {
    return [Math.PI / 2 + rotation[0] * 0.15, rotation[1], 0] as Vector3Tuple;
  }, [rotation]);

  return (
    <a.group
      position={position}
      rotation={rotation}
      scale={spring.s}
      onPointerDown={handlePointerDown}
    >
      <mesh>
        <primitive object={sphereGeometry} attach="geometry" />
        {isIOS ? (
          <meshBasicMaterial color={materialColor} map={planetTexture} />
        ) : (
          <meshStandardMaterial
            color={materialColor}
            map={planetTexture}
            roughness={0.75}
            metalness={0.05}
            emissive={emissiveColor}
            emissiveIntensity={0.15}
          />
        )}
      </mesh>

      <mesh>
        <primitive object={atmosphereGeometry} attach="geometry" />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={ATMOSPHERE_OPACITY}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {ringGeometry ? (
        <mesh rotation={ringRotation}>
          <primitive object={ringGeometry} attach="geometry" />
          {isIOS ? (
            <meshBasicMaterial
              color={emissiveColor}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          ) : (
            <meshStandardMaterial
              color={emissiveColor}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          )}
        </mesh>
      ) : null}
    </a.group>
  );
};
