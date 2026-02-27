import React, { useEffect, useMemo, useRef } from 'react'
import { PixelRatio, Platform, View } from 'react-native'
import { Canvas, useThree } from '@react-three/fiber/native'
import useControls from 'r3f-native-orbitcontrols'

import { InstanceMesh } from './InstanceMesh'
import { useInstancesStore } from '../store/instance.hook'

const BACKGROUND_COLOR = '#111111'

const AMBIENT_LIGHT_INTENSITY = 0.7
const DIRECTIONAL_LIGHT_INTENSITY = 2.6
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [4, 2, 4]

const CAMERA_POSITION: [number, number, number] = [0, 1.2, 6]
const CAMERA_FOV = 55

const InvalidateOnChange = ({ deps }: { deps: any[] }) => {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    invalidate()
  }, deps)

  return null
}

const useRafInvalidate = () => {
  const invalidate = useThree((state) => state.invalidate)
  const rafIdRef = useRef<number | null>(null)

  return () => {
    if (rafIdRef.current != null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      invalidate()
    })
  }
}

const CameraControls = ({ OrbitControls }: { OrbitControls: any }) => {
  const rafInvalidate = useRafInvalidate()

  return (
    <OrbitControls
      enableRotate
      enableZoom
      enablePan={false}
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.9}
      onChange={rafInvalidate}
    />
  )
}

export const Scene = () => {
  const isIOS = Platform.OS === 'ios'
  const [OrbitControls, events] = useControls()

  const instances = useInstancesStore((state) => state.instances)
  const selectedId = useInstancesStore((state) => state.selectedId)
  const lastCreatedId = useInstancesStore((state) => state.lastCreatedId)
  const select = useInstancesStore((state) => state.select)

  const dpr = useMemo(() => {
    if (Platform.OS === 'ios') return 1
    return Math.min(2, PixelRatio.get())
  }, [])
  const frameLoop = Platform.OS === 'ios' ? 'always' : 'demand'

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND_COLOR }} {...events}>
      <Canvas
        style={{ flex: 1 }}
        {...({ frameloop: frameLoop, dpr } as any)}
        gl={{
          antialias: false,
          alpha: false,
          depth: true,
          stencil: false,
          powerPreference: 'low-power',
        }}
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(BACKGROUND_COLOR)
          camera.lookAt(0, 0, 0)
        }}
      >
        <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
        <directionalLight
          position={DIRECTIONAL_LIGHT_POSITION}
          intensity={DIRECTIONAL_LIGHT_INTENSITY}
        />

        <CameraControls OrbitControls={OrbitControls} />

        <InvalidateOnChange deps={[instances, selectedId, lastCreatedId]} />

        {instances.map((instance) => (
          <InstanceMesh
            key={instance.id}
            data={instance}
            isSelected={selectedId === instance.id}
            isLastCreated={lastCreatedId === instance.id}
            onPress={() => select(instance.id)}
          />
        ))}
      </Canvas>
    </View>
  )
}
