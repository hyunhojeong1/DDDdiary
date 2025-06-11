import { Text } from '@/components'
import { Pressable,} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Stack, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'


export default observer(function PastTabLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
          headerShown : false,
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen
        name='detail'
        options={{
            headerStyle : {backgroundColor : '#F4F2F1'},
            headerShown : true,
            headerTitleAlign :'center',
            presentation:'modal',
            animation:'slide_from_bottom',
            headerLeft : () => (
              <Pressable 
                onPress={()=>{
                  router.back();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}>
                <Text tx='pastScreen:toTheList' style={{color : 'black'}}/>
              </Pressable>
            ),
        }}
      />
    </Stack>
  )
})