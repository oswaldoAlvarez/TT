import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ShapeType = 'planet'
export type Vector3Tuple = [number, number, number]

export type Instance3D = {
  id: string
  type: ShapeType
  color: string
  ring: boolean
  hasContinents: boolean
  name: string
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

const MAX_INSTANCES = Platform.OS === 'ios' ? 14 : 26
const SPAWN_SPACING = Platform.OS === 'ios' ? 1.25 : 1.6
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
  const type: ShapeType = 'planet'
  const color = typeof candidate.color === 'string' ? candidate.color : '#4C8DFF'
  const ring = typeof candidate.ring === 'boolean' ? candidate.ring : false
  const hasContinents =
    typeof candidate.hasContinents === 'boolean' ? candidate.hasContinents : false
  const name = typeof candidate.name === 'string' ? candidate.name : null
  const scale = isFiniteNumber(candidate.scale) ? candidate.scale : 1

  const position: Vector3Tuple = isVector3Tuple(candidate.position)
    ? candidate.position
    : [0, 0, 0]

  const rotation: Vector3Tuple = isVector3Tuple(candidate.rotation)
    ? candidate.rotation
    : [0, 0, 0]

  const createdAt = isFiniteNumber(candidate.createdAt) ? candidate.createdAt : Date.now()

  if (!id) return null

  if (!name) return null

  return { id, type, color, ring, hasContinents, name, scale, position, rotation, createdAt }
}

const sanitizeInstances = (value: any): Instance3D[] => {
  if (!Array.isArray(value)) return []
  return value.map(sanitizeInstance).filter(Boolean) as Instance3D[]
}

const randomFloat = (min: number, max: number) => min + Math.random() * (max - min)

const PLANET_COLORS = ['#3B82F6', '#F97316', '#10B981', '#F43F5E', '#A855F7', '#EAB308']
const CONTINENT_PROBABILITY = 0.45

const randomInt = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1))

const randomLetter = () => String.fromCharCode(97 + randomInt(0, 4))

const createPlanetName = () => {
  const roll = Math.random()
  if (roll < 0.5) {
    return `Kepler-${randomInt(1, 999).toString().padStart(3, '0')}`
  }
  if (roll < 0.8) {
    return `TRAPPIST-1${randomLetter()}`
  }
  if (roll < 0.93) {
    return `HD ${randomInt(10000, 199999)} ${randomLetter()}`
  }
  return `GJ ${randomInt(100, 999)} ${randomLetter()}`
}
const randomPlanetColor = () => PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)]

const createInstanceId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createRandomInstance = (): Instance3D => ({
  id: createInstanceId(),
  type: 'planet',
  color: randomPlanetColor(),
  ring: Math.random() < 0.28,
  hasContinents: Math.random() < CONTINENT_PROBABILITY,
  name: createPlanetName(),
  scale: randomFloat(0.65, 1.25),
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

let storageDisabled = false
let storageDisabledWarned = false

const disableStorage = (error: unknown) => {
  if (storageDisabled) return
  const message = String(error)
  if (!message.includes('Not a directory')) return

  storageDisabled = true
  if (!storageDisabledWarned) {
    storageDisabledWarned = true
    console.warn(
      '[AsyncStorage] Disabled persistence due to invalid storage directory. ' +
        'Delete the iOS app or reset the simulator to fix.'
    )
  }
}

const safeStorage = {
  getItem: async (key: string) => {
    if (storageDisabled) return null
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      const wasDisabled = storageDisabled
      disableStorage(error)
      if (storageDisabled && !wasDisabled) return null
      console.warn('[AsyncStorage] getItem failed:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    if (storageDisabled) return
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      const wasDisabled = storageDisabled
      disableStorage(error)
      if (storageDisabled && !wasDisabled) return
      console.warn('[AsyncStorage] setItem failed:', error)
    }
  },
  removeItem: async (key: string) => {
    if (storageDisabled) return
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      const wasDisabled = storageDisabled
      disableStorage(error)
      if (storageDisabled && !wasDisabled) return
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
          type: 'planet',
          color: '#3B82F6',
          ring: false,
          hasContinents: true,
          name: 'Kepler-001',
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

      clear: () =>
        set({
          instances: [
            {
              id: CENTER_INSTANCE_ID,
              type: 'planet',
              color: '#3B82F6',
              ring: false,
              hasContinents: true,
              name: 'Kepler-001',
              scale: 1,
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              createdAt: Date.now(),
            },
          ],
          selectedId: null,
          lastCreatedId: null,
        }),

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
        const validIds = new Set(sanitizedInstances.map((instance) => instance.id))
        const selectedId =
          typeof persisted.selectedId === 'string' && validIds.has(persisted.selectedId)
            ? persisted.selectedId
            : null

        return {
          ...currentState,
          ...persisted,
          instances: sanitizedInstances.length ? sanitizedInstances : currentState.instances,
          selectedId,
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
