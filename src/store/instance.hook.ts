import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ShapeType = 'box' | 'sphere'
export type Vector3Tuple = [number, number, number]

export type Instance3D = {
  id: string
  type: ShapeType
  color: string
  scale: number
  position: Vector3Tuple
  rotation: Vector3Tuple
  createdAt: number
}

type InstancesState = {
  instances: Instance3D[]
  selectedId: string | null
  lastCreatedId: string | null
  addRandomInstance: () => void
  clear: () => void
  select: (id: string | null) => void
}

const MAX_INSTANCES = 30
const SPAWN_SPACING = 1.8
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))
const CENTER_INSTANCE_ID = 'center'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isVector3Tuple = (value: unknown): value is Vector3Tuple => {
  if (!Array.isArray(value) || value.length !== 3) return false
  return value.every((v) => isFiniteNumber(v))
}

const sanitizeInstance = (candidate: any): Instance3D | null => {
  if (!candidate || typeof candidate !== 'object') return null

  const id = typeof candidate.id === 'string' ? candidate.id : null
  const type: ShapeType = candidate.type === 'sphere' ? 'sphere' : 'box'
  const color = typeof candidate.color === 'string' ? candidate.color : '#4C8DFF'
  const scale = isFiniteNumber(candidate.scale) ? candidate.scale : 1

  const position: Vector3Tuple = isVector3Tuple(candidate.position)
    ? candidate.position
    : [0, 0, 0]

  const rotation: Vector3Tuple = isVector3Tuple(candidate.rotation)
    ? candidate.rotation
    : [0, 0, 0]

  const createdAt = isFiniteNumber(candidate.createdAt) ? candidate.createdAt : Date.now()

  if (!id) return null

  return { id, type, color, scale, position, rotation, createdAt }
}

const sanitizeInstances = (value: any): Instance3D[] => {
  if (!Array.isArray(value)) return []
  return value.map(sanitizeInstance).filter(Boolean) as Instance3D[]
}

const randomFloat = (min: number, max: number) => min + Math.random() * (max - min)

const randomColorHex = () => {
  const value = Math.floor(Math.random() * 0xffffff)
  return `#${value.toString(16).padStart(6, '0')}`
}

const createInstanceId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createRandomInstance = (): Instance3D => ({
  id: createInstanceId(),
  type: Math.random() < 0.5 ? 'box' : 'sphere',
  color: randomColorHex(),
  scale: randomFloat(0.6, 1.4),
  position: [0, 0, 0],
  rotation: [0, randomFloat(0, Math.PI), 0],
  createdAt: Date.now(),
})

const getSpiralSpawnPosition = (instanceIndex: number): Vector3Tuple => {
  const radius = SPAWN_SPACING * Math.sqrt(instanceIndex)
  const angle = instanceIndex * GOLDEN_ANGLE_RADIANS

  const x = radius * Math.cos(angle)
  const y = randomFloat(-0.4, 1.2)
  const z = radius * Math.sin(angle)

  return [x, y, z]
}

const safeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.warn('[AsyncStorage] getItem failed:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      console.warn('[AsyncStorage] setItem failed:', error)
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.warn('[AsyncStorage] removeItem failed:', error)
    }
  },
}

export const useInstancesStore = create<InstancesState>()(
  persist(
    (set, get) => ({
      instances: [
        {
          id: CENTER_INSTANCE_ID,
          type: 'box',
          color: '#4C8DFF',
          scale: 1,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          createdAt: Date.now(),
        },
      ],
      selectedId: null,
      lastCreatedId: null,

      addRandomInstance: () => {
        const currentInstances = get().instances
        const newInstance = createRandomInstance()

        const instanceIndex = currentInstances.length
        newInstance.position = getSpiralSpawnPosition(instanceIndex)

        const updatedInstances = [newInstance, ...currentInstances].slice(0, MAX_INSTANCES)

        set({
          instances: updatedInstances,
          lastCreatedId: newInstance.id,
        })
      },

      clear: () => set({ instances: [], selectedId: null, lastCreatedId: null }),

      select: (id) =>
        set((state) => {
          if (state.selectedId === id) return state
          return { selectedId: id }
        }),
    }),
    {
      name: 'tt.instances.store',
      storage: createJSONStorage(() => safeStorage),

      merge: (persistedState, currentState) => {
        const persisted: any = persistedState ?? {}
        const sanitizedInstances = sanitizeInstances(persisted.instances)

        return {
          ...currentState,
          ...persisted,
          instances: sanitizedInstances.length ? sanitizedInstances : currentState.instances,
          selectedId: typeof persisted.selectedId === 'string' ? persisted.selectedId : null,
          lastCreatedId: null,
        }
      },

      partialize: (state) => ({
        instances: state.instances,
        selectedId: state.selectedId,
      }),

      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[persist] rehydrate error:', error)
        else console.log('[persist] rehydrated OK')
      },
    }
  )
)
