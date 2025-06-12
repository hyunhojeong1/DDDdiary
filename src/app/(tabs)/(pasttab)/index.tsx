import { Button, Card, EmptyState, Header, ListView, Screen, Text } from "@/components";
import { useStores } from "@/models";
import { ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { SplashScreen, useRouter } from "expo-router";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, TextStyle, View, ViewStyle } from "react-native";
import Octicons from '@expo/vector-icons/Octicons';
import * as Haptics from 'expo-haptics';
import { checkInternetConnection } from "@/utils/network";

SplashScreen.preventAutoHideAsync();

export default observer(function PastDiary() {
  const { themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { t } = useTranslation();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(true);

  useEffect(()=>{
    handleListUp();
    myStatusStore.unsubscribeFCMDefault();
  },[myStatusStore.todayProcess])

  const handleListUp = ()=> {
    const diaryArray = Array.from(myStatusStore.myDiaries.values())
      .sort((a,b)=> b.diaryNDate - a.diaryNDate);
    return diaryArray;
  };

  const handleDeleteDiary = async (diaryKeyDate : number)=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    Alert.alert(
      t('pastScreen:deleteDiary'),
      t('pastScreen:explainDelete'),
      [
        {text : t('common:cancel'), style : 'destructive'},
        {text : t('common:ok'), onPress : async () => {
          setIsSaved(false);
          try {
            const booly = await myStatusStore.removeOneDiary(diaryKeyDate);
            if(booly) {
              if(diaryKeyDate === myStatusStore.todayNDate) {
                myStatusStore.setProp("todayProcess", false);
              }
              setIsSaved(true);
            } else {
              setIsSaved(true);
              Alert.alert(t('settingScreen:alarmYetSaving1'), t('settingScreen:alarmYetSaving2'));
            }
          } catch (e) {
            Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
          }
        }},
    ]);
  };

  return (
    <Screen 
      contentContainerStyle={themed($container)}
    >
      <Header 
        titleTx="tabs:pastdiary" 
        containerStyle={themed($header)}
      />
      <View style={themed($pastMainPage)}>
        <ListView
          contentContainerStyle={themed($listviewPadding)}
          data = {handleListUp()}
          keyExtractor={(item)=>item.diaryNDate.toString()}
          estimatedItemSize={56}
          ListHeaderComponent={
            handleListUp().length === 0 ?
            <View>
              <Text
                style={themed($bigTitle)}
                text={`${myStatusStore.nickname}${t('pastScreen:bigTitle')}`}
              />
              <EmptyState 
                headingTx="emptyStateComponent:pastDiary.heading"
                contentTx="emptyStateComponent:pastDiary.content"
                buttonTx="emptyStateComponent:pastDiary.button"
                buttonStyle={themed($goWriteBtn)}
                buttonOnPress={()=>router.push('/(tabs)/(todaytab)/todaywrite')}
              />
            </View> 
            : 
            <Text
              style={themed($bigTitle)}
              text={`${myStatusStore.nickname}${t('pastScreen:bigTitle')}`}
            />
          }
          renderItem={({item})=>(
            <Card 
              key={item.diaryNDate}
              heading={myStatusStore.dateOfficial(item.diaryISODate, item.diaryNDate)}
              content={item.text1}
              footer={item.text2}
              headingStyle={themed($cardHeaderText)}
              footerStyle={themed($cardContentText)}
              contentStyle={themed($cardContentText)}
              style={themed($listCard)}
              RightComponent={ isSaved ?
                <Button
                  style = {themed($removeBtn)}
                  LeftAccessory={()=>(<Octicons name="trash" size={20} color="#999999" />)}
                  onPress={()=>handleDeleteDiary(item.diaryNDate)}
                />
              :
                <Button
                  style = {themed($removeBtn)}
                  LeftAccessory={()=><ActivityIndicator size={"small"} />}
                />
              }
              onPress={()=> {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname : '/(tabs)/(pasttab)/detail',
                  params : {diaryTitleDate : myStatusStore.dateOfficial(item.diaryISODate, 3000), diaryNDate : item.diaryNDate},
                });
              }}
            />
          )}
          ListFooterComponent={()=>(
            <Text
              tx="pastScreen:explain2Weeks"
              style={themed($explain2WeeksText)}
            />
          )}
        />
      </View>
    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor : colors.palette.neutral150,
})

const $header: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  borderBottomColor : colors.separator,
  borderBottomWidth : 1,
})

const $bigTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign :'right',
  marginTop : spacing.xxs,
  marginBottom : spacing.lg,
  fontWeight : '600',
  fontSize : spacing.lg,
  lineHeight : spacing.xl,
})

const $pastMainPage: ThemedStyle<ViewStyle> = ({}) => ({
  flex: 1,
})

const $listviewPadding: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal : spacing.md,
})

const $listCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.xxxs,
})

const $cardHeaderText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontWeight : '500',
  fontSize : spacing.md,
  marginLeft : spacing.xxs,
  marginBottom : spacing.xs,
})

const $cardContentText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize : spacing.md,
  marginLeft : spacing.xxs,
})

const $removeBtn: ThemedStyle<ViewStyle> = ({}) => ({
  borderWidth : 0,
})

const $goWriteBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.palette.neutral100,
  borderRadius : spacing.lg,
  borderWidth : 1,
  borderColor : colors.separator,
  marginHorizontal : spacing.lg,
  maxWidth : '85%',
  minWidth : '50%',
  minHeight : 0,
})

const $explain2WeeksText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginVertical : spacing.xl,
})


