import { useAppTheme } from '@/utils/useAppTheme'
import { CardView, ListItem, Screen, Text } from '@/components'
import { ThemedStyle } from '@/theme'
import { ScrollView, TextStyle, View, ViewStyle } from 'react-native'
import { useStores } from '@/models'
import { useLayoutEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useSafeAreaInsetsStyle } from '@/utils/useSafeAreaInsetsStyle'
import { useTranslation } from 'react-i18next'


export default observer(function PastTabLayout() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const { themed } = useAppTheme();
  const { t } = useTranslation();
  const { myStatusStore } =useStores();

  const { diaryTitleDate, diaryNDate } = useLocalSearchParams();
  const displayDate: string | undefined = Array.isArray(diaryTitleDate) ? diaryTitleDate[0] : diaryTitleDate;
  const diaryKeyDate: string | undefined = Array.isArray(diaryNDate) ? diaryNDate[0] : diaryNDate;
  const navigation = useNavigation();
  

  useLayoutEffect(()=>{
    navigation.setOptions({
      title : displayDate ?? 'Detail',
    });
  },[navigation, displayDate]);


  return (
    <Screen 
      contentContainerStyle={themed($container)}
    >
      <ScrollView>
        <Screen style={[themed($detailPage), $bottomContainerInsets]}>
          <Text
            tx="todayRScreen:q1"
            preset='subheading'
          />
          <Text
            text={myStatusStore.myDiaries.get(diaryKeyDate)?.text1}
            style={themed($pastAnswerText)}
          />
          <Text
            tx="todayRScreen:q2"
            preset="subheading"
          />
          <Text
            text={myStatusStore.myDiaries.get(diaryKeyDate)?.text2}
            style={themed($pastAnswerText)}
          />
          <Text
            tx="todayRScreen:qAlarm"
            preset='subheading'
          />
          <View style={{flexDirection:'row'}}>
            <CardView style={themed($alarmBox)}>
              <Text preset='formLabel' text="AM"/>
              {myStatusStore.myDiaries.get(diaryKeyDate)?.alarms.map((item, index)=>(
                item.includes("AM") ?
                  <ListItem 
                    key={index} 
                    text={item}
                    style={themed($alarmTime)}
                  /> 
                : null
              ))}
            </CardView>
            <CardView style={themed($alarmBox)}>
            <Text preset='formLabel' text="PM"/>
              {myStatusStore.myDiaries.get(diaryKeyDate)?.alarms.map((item, index)=>(
                item.includes("PM") ?
                  <ListItem 
                    key={index} 
                    text={item}
                    style={themed($alarmTime)}
                  /> 
                : null
              ))}
            </CardView>
          </View>
          <Text
            tx="todayWScreen:q3"
            preset="subheading"
          />
          <Text
            text={myStatusStore.myDiaries.get(diaryKeyDate)?.text3}
            style={themed($pastAnswerText)}
          />
          <Text
            tx="todayWScreen:todayQ"
            preset="subheading"
          />
          <Text
            text={t(`dailyQuestion:${myStatusStore.myDiaries.get(diaryKeyDate)?.dailyQuestion}`)}
            style={themed($pastDailyQuestionText)}
          />      
        </Screen>
      </ScrollView>
    </Screen>
  )
})


const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral100,
})

const $detailPage: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.palette.neutral100,
  padding : spacing.md,
})

const $pastAnswerText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom : spacing.xxxl,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  marginLeft : spacing.md,
})

const $alarmBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginBottom : spacing.xxl,
  justifyContent : 'flex-start',
  flex : 1,
  paddingTop : spacing.sm,
  minHeight : 100,
  backgroundColor : colors.palette.neutral200,
})

const $alarmTime: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight : spacing.xxxs,
})

const $pastDailyQuestionText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom : spacing.xxxl,
  paddingBottom : spacing.xxxl,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  marginLeft : spacing.md,
  fontFamily : "System",
})