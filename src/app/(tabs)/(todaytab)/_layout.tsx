import { View } from 'react-native'
import TodayRead from './todayread'
import TodayWrite from './todaywrite'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'


export default observer(function TodayTabLayout() {
  const { myStatusStore } = useStores();
  
  return (
    <View style={{flex:1}}>
      { myStatusStore.todayProcess ? <TodayRead /> : <TodayWrite />}
    </View>
  )
})
