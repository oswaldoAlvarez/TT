import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Scene } from '../src/scene/Scene'
import { useInstancesStore } from '../src/store/instance.hook'

const SCREEN_BACKGROUND_COLOR = '#111111'

const OVERLAY_HORIZONTAL_PADDING = 16
const OVERLAY_BOTTOM_PADDING = 16
const OVERLAY_GAP = 12

const BUTTON_RADIUS = 12
const BUTTON_VERTICAL_PADDING = 14

const Home = () => {
  const instanceCount = useInstancesStore((state) => state.instances.length)
  const selectedInstanceId = useInstancesStore((state) => state.selectedId)

  const generateInstance = useInstancesStore((state) => state.addRandomInstance)
  const clearInstances = useInstancesStore((state) => state.clear)

  const overlayLabel = useMemo(() => {
    const selectedLabel = selectedInstanceId ? ` | Selected: ${selectedInstanceId}` : ''
    return `Instances: ${instanceCount}${selectedLabel}`
  }, [instanceCount, selectedInstanceId])

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND_COLOR }}>
        <Scene />
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: OVERLAY_HORIZONTAL_PADDING,
            right: OVERLAY_HORIZONTAL_PADDING,
            bottom: OVERLAY_BOTTOM_PADDING,
            gap: OVERLAY_GAP,
          }}
        >
          <Text pointerEvents="none" style={{ fontSize: 14, color: 'white' }}>
            {overlayLabel}
          </Text>
          <Pressable
            onPress={generateInstance}
            style={{
              paddingVertical: BUTTON_VERTICAL_PADDING,
              borderRadius: BUTTON_RADIUS,
              alignItems: 'center',
              backgroundColor: 'white',
            }}
          >
            <Text style={{ color: 'black', fontSize: 16, fontWeight: '600' }}>Generate</Text>
          </Pressable>
          <Pressable
            onPress={clearInstances}
            style={{
              paddingVertical: BUTTON_VERTICAL_PADDING,
              borderRadius: BUTTON_RADIUS,
              alignItems: 'center',
              backgroundColor: '#2a2a2a',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default Home