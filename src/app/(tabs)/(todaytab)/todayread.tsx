import { Button, CardView, Checkbox, Header, ListItem, Screen, Text, TextField } from "@/components";
import { ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { ActivityIndicator, Alert, AppRegistry, Dimensions, Image, Platform, ScrollView, TextStyle, View, ViewStyle } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useStores } from "@/models";
import { observer } from "mobx-react-lite";
import { Trans, useTranslation } from "react-i18next";
import { MotiView } from "moti";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BannerAd, BannerAdSize, TestIds, useForeground } from "react-native-google-mobile-ads";
import * as Haptics from 'expo-haptics'
import { checkInternetConnection } from "@/utils/network";
import SelfAssessmentModal from "@/app/selfCheckModal";
import { changeTimetoNumber } from "@/utils/changeTimes";
import { getCurrentDate } from "@/utils/getCurrentDate";
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";


const diaryInstruction = require("../../../../assets/images/diary_instruction1.png");
const diaryInstruction2 = require("../../../../assets/images/diary_instruction2.png");
const diaryInstruction3 = require("../../../../assets/images/diary_instruction3.png");

// DEV 조건도 넣기, 개발 중에는 real id도 test로 바꾸기
const adUnitId1_Test = TestIds.BANNER;
const adUnitId2_Test = TestIds.BANNER;
const adUnitId1_Real = Platform.OS === "ios" ? "ca-app-pub-5890559342478686/8781983898" : "ca-app-pub-5890559342478686/7352936863";
const adUnitId2_Real = Platform.OS === "ios" ? "ca-app-pub-5890559342478686/4138037002" : "ca-app-pub-5890559342478686/9538366059";

export default observer(function TodayRead() {
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { t } = useTranslation();
  const bannerRef = useRef<BannerAd>(null);
  const bannerRef2 = useRef<BannerAd>(null);
  const screenWidth = Dimensions.get('window').width;
  const [isRefreshed, setIsRefreshed] = useState(true);
  const [isDeleted, setIsDeleted] = useState(true);

  const admobOn = myStatusStore.admobOn;
  const adUnitId1 = admobOn && !(__DEV__) ? adUnitId1_Real : adUnitId1_Test;
  const adUnitId2 = admobOn && !(__DEV__) ? adUnitId2_Real : adUnitId2_Test;

  useForeground(() => {
    Platform.OS === 'ios' && bannerRef.current?.load();
    Platform.OS === 'ios' && bannerRef2.current?.load();
  });

  const handleModify = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    myStatusStore.setProp("somethingChanged", true); // 재시작 후 수정시 구독 취소 방지
    myStatusStore.setProp('todayProcess',false)
  };

  const handleEject = async ()=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    Alert.alert(
      t('todayRScreen:askEject'),
      t('todayRScreen:explainEject'),
      [
        { text: t('todayRScreen:keepTrying'), style: 'cancel' },
        { text: t('todayRScreen:giveUp'), style : 'destructive', onPress: async () => {
          setIsDeleted(false);
          try{
            const booly = await myStatusStore.removeOneDiary(myStatusStore.todayNDate);
            if(booly) {
              myStatusStore.setProp("somethingChanged", true); // 자동 구독 취소 방지
              setIsDeleted(true);
              myStatusStore.setProp("todayProcess", false);
            } else {
              setIsDeleted(true);
              Alert.alert(t('settingScreen:alarmYetSaving1'), t('settingScreen:alarmYetSaving2'));
            }
          } catch (e) {
            Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
          }
        }},
      ]);
  };

  const handleRefresh = async ()=> {
    setIsRefreshed(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await myStatusStore.setRefresh();
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsRefreshed(true);
  };

  const handleAddingTask = async () => {
    if(!myStatusStore.todayProcess) {
      await AsyncStorage.removeItem('@lockscreen_reply');
    } else {
      const value = await AsyncStorage.getItem('@lockscreen_reply');
      if (value !== null && value !== "") {
        await myStatusStore.addingReuseTimeTask(value);
      }
    }
  };


  // 앱에서 바로 잠금화면으로 간 경우, 잠금화면을 풀면 바로 fg 상태가 되는 문제 개선
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        if(!detail.pressAction) return;
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'reply') {
          if(!detail.input) return;
          let replyText = detail.input;
          const preReply = await AsyncStorage.getItem('@lockscreen_reply');
          if (preReply !== null) {
            replyText = `${preReply}\n${detail.input}`;
          }
          await AsyncStorage.setItem('@lockscreen_reply', replyText);
          await handleAddingTask();
        }

      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);


  return (
    <Screen
      contentContainerStyle={themed($container)}
    >
      <Header 
        titleTx="tabs:todaydiary"
        containerStyle={themed($header)}
        LeftActionComponent={
          <Button preset='default'
            tx='todayRScreen:todayModify' 
            style = {themed($headerBtn)}
            onPress={handleModify}
          />
        }
        RightActionComponent={ isDeleted ?
          <Button preset='default' 
            textStyle={themed($headerBtnEject)} 
            tx='todayRScreen:todayEject' 
            style = {themed($headerBtn)}
            onPress={handleEject} 
          />
        :
          <View style={themed($actIndicator)} >
            <ActivityIndicator size={"small"} />
          </View>
        }
      />
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
        style={{ flex: 1 }}
      ><ScrollView>
        <View>
          <Button 
            preset='default'
            tx="todayRScreen:keepGoing"
            style = {themed($statusBtn)}
            LeftAccessory={() => ( 
              isRefreshed ?
                <FontAwesome name="circle" size={12} color="#00aa00" />
              :
                <View>
                  <ActivityIndicator size={"small"} />
                </View>
            )}
            onPress={handleRefresh}
          />
          <CardView style={themed($cardView)}>
            <Text
              preset="heading"
              text={myStatusStore.dateOfficial(myStatusStore.todayISODate, myStatusStore.todayNDate)}
            />
            <Text
              tx="todayWScreen:q3"
              preset="subheading"
              style={themed($nextTimeComment)}
            />
            { myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarms
                .filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber).length === 0 ?
              <Text
                tx="todayRScreen:noMoreAlarm"
              />
            : null
            }
            <Text
              text={
                myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarms
                  .filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber)[0]
              }
              style={themed($nextAlarmBoldText)}
            />
            <Text
              tx="todayRScreen:explainQ3R"
              preset="subheading"
              style={themed($currentTodoComment)}
            />
            { myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text3 === "" ?
              <Text
                tx="todayRScreen:noMoreActions"
              />
            : null
            }
            <Text
              text={myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text3}
              style={themed($todayAnswerTextQ3)}
            />
            <View style={themed($adContainer)}>
              <BannerAd
                ref={bannerRef} 
                unitId={adUnitId1} 
                size={BannerAdSize.LARGE_BANNER}
              />
            </View>
            <Text
              tx="todayRScreen:q1"
              preset="subheading"
            />
            <Text
              text={myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text1}
              style={themed($todayAnswerText)}
            />
            <Text
              tx="todayRScreen:q2"
              preset="subheading"
            />
            <Text
              text={t(`dailyQuestion:${myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.dailyQuestion}`)}
              style={themed($todayQuestionText)}
            />
            <Text
              text={myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text2}
              style={themed($todayAnswerText)}
            />
            <View style={themed($adContainer)}>
              <BannerAd
                ref={bannerRef2} 
                unitId={adUnitId2} 
                size={BannerAdSize.LARGE_BANNER}
              />
            </View>
            <Text
              tx="todayRScreen:qAlarm"
              preset="subheading"
            />
            <Text
              tx="todayRScreen:explainAlarmR"
            />
            <View style={{flexDirection:'row'}}>
              <CardView style={themed($alarmBoxLeft)}>
                <Text preset='formLabel' text="AM" />
                {myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarms.map((item, index)=>(
                  item.includes("AM") ?
                    <ListItem 
                      key={index} 
                      text={item}
                      style={themed($alarmTime)}
                    /> : null
                ))}
              </CardView>
              <CardView style={themed($alarmBoxRight)}>
              <Text preset='formLabel' text="PM" />
                {myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarms.map((item, index)=>(
                  item.includes("PM") ?
                    <ListItem 
                      key={index} 
                      text={item}
                      style={themed($alarmTime)}
                    /> : null
                ))}
              </CardView>
            </View>
            <Text 
              text={`${t("todayRScreen:timeZone")}${myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarmsZone}`}
            />
            { myStatusStore.timeZone !== myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.alarmsZone ? 
              <Text
                text={t("todayRScreen:explainZoneChange")} 
                style={themed($todayTimezoneText)}
            /> : null}
            <Checkbox 
              value={myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.shareCheck}
              label={t("todayWScreen:shareCheck")}
              disabled
              containerStyle={themed($todayShareCheckMargin)}
            />
            <Text
              preset="subheading"
              text={t('todayWScreen:explainQ3')}
              style={themed($instructionTitle)}
            />
            <View style={{...themed($instructionImgView), maxHeight: screenWidth*0.9}}>
              <Image
                source={diaryInstruction}
                style={{width : '100%', height : '100%'}}
              />
            </View>
            <Text style={themed($instructionNormalText)}>
              <Trans
                i18nKey="todayWScreen:instruction1"
                components={{
                  bold: <Text style={themed($instructionBoldText)} />,
                }}
              />
            </Text>
            <View style={{...themed($instructionImgView), maxHeight: screenWidth*0.9}}>
              <Image
                source={diaryInstruction2}
                style={{width : '100%', height : '100%',}}
              />
            </View>
            <Text style={themed($instructionNormalText)}>
              <Trans
                i18nKey="todayWScreen:instruction2"
                components={{
                  bold: <Text style={themed($instructionBoldText)} />,
                }}
              />
            </Text>
            <View style={{...themed($instructionImgView), maxHeight: screenWidth*0.9}}>
              <Image
                source={diaryInstruction3}
                style={{width : '100%', height : '100%'}}
              />
            </View>
            <Text style={themed($instructionNormalText)}>
              <Trans
                i18nKey="todayWScreen:instruction3"
                components={{
                  bold: <Text style={themed($instructionBoldText)} />,
                }}
              />
            </Text>
          </CardView>
        </View>
      </ScrollView></MotiView>

      <SelfAssessmentModal
        visible={myStatusStore.needSelfCheck && myStatusStore.todayProcess}
      />
    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.tabBackground,
})

const $header: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  borderBottomColor : colors.separator,
  borderBottomWidth : 1,
})

const $headerBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  borderWidth : 0,
})

const $headerBtnEject: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.angry500,
})

const $actIndicator: ThemedStyle<ViewStyle> = ({spacing}) => ({
  marginRight : spacing.lg,
})

const $statusBtn : ThemedStyle<ViewStyle> = ({spacing}) => ({
  marginTop : spacing.xs,
  alignSelf: 'center',
  borderRadius: spacing.xxl,
  paddingHorizontal: spacing.xxl,
  paddingVertical: spacing.xxs,
  minHeight : spacing.xl,
})

const $cardView : ThemedStyle<ViewStyle> = ({spacing}) => ({
  paddingLeft : spacing.xs,
  paddingRight : spacing.xs,
})

const $todayAnswerText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom : spacing.xxxl,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  marginLeft : spacing.sm,
})

const $todayQuestionText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  marginLeft : spacing.xs,
})

const $adContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop : spacing.xs,
  marginBottom : spacing.xxl,
  alignItems : 'center',
})

const $alarmBoxLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  justifyContent : 'flex-start',
  flex : 1,
  paddingTop : spacing.sm,
  minHeight : 120,
  marginLeft : 0,
  marginRight : spacing.xxs,
})

const $alarmBoxRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  justifyContent : 'flex-start',
  flex : 1,
  paddingTop : spacing.sm,
  minHeight : 120,
  marginLeft : spacing.xxs,
  marginRight : 0,
})

const $alarmTime: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight : spacing.xxxs,
})

const $todayTimezoneText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop : spacing.xxs,
  marginBottom : spacing.md,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  color : colors.palette.angry500,
})

const $todayShareCheckMargin: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop : spacing.sm,
})

const $todayAnswerTextQ3: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xxxs,
  marginBottom : spacing.xs,
  fontSize : spacing.md,
  lineHeight : spacing.lg,
  marginLeft : spacing.sm,
})

const $instructionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xxxl*2,
  marginBottom : spacing.sm,
})

const $instructionImgView: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width : '100%',
})

const $instructionNormalText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom : spacing.xxxl,
})

const $instructionBoldText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight : 'bold',
  color : colors.palette.delight100,
})

const $nextTimeComment: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xl,
})

const $currentTodoComment: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop : spacing.xl,
})

const $nextAlarmBoldText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight : 'bold',
})

