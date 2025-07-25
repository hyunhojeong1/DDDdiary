import { Button, Screen, Switch, Text, TextField } from "@/components";
import { spacing, ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { Alert, Linking, Modal, TextStyle, View, ViewStyle, Platform, PermissionsAndroid, ScrollView, ActivityIndicator, Image, Dimensions } from "react-native";
import { useEffect, useState } from "react";
import { useStores } from "@/models";
import { useTranslation } from "react-i18next";
import {Picker} from '@react-native-picker/picker';
import { useRouter } from "expo-router";
import * as Notifications from 'expo-notifications';
import { getMessaging } from "@react-native-firebase/messaging";
import * as Haptics from 'expo-haptics';
import { checkInternetConnection } from "@/utils/network";
import { AdsConsent, AdsConsentDebugGeography } from 'react-native-google-mobile-ads';
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle";
import { changeTimetoNumber } from "@/utils/changeTimes";



const messaging = getMessaging();
const ddddiaryChar = require("../../assets/images/ddddiaryChar_cut1.png");
const ddddiaryCharDark = require("../../assets/images/ddddiaryChar_cut1_dark.png");
const ddddiaryChar2 = require("../../assets/images/ddddiaryChar_cut2.png");
const ddddiaryChar2Dark = require("../../assets/images/ddddiaryChar_cut2_dark.png");


export default function appStarting() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { i18n, t } = useTranslation();
  const initialLang = i18n.language.split("-")[0];
  const route = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const [page, setPage] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalValue, setModalValue] = useState('en');
  const [warning, setWarning] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [isEEA, setIsEEA] = useState(false);

  //Daily Alarm Modal
  const [timeDal, setTimeDal] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('PM');
  const [alarmSwitch, setAlarmSwitch] = useState(false);
  const [isToggled, setIsToggled] = useState(true);


  useEffect(()=>{
    myStatusStore.setProp("userCLang", initialLang);
    checkIFEEA();
  },[]);

  const checkIFEEA = async () => {
    const info = await AdsConsent.requestInfoUpdate();
    const isInEEA = info.status;
    if(isInEEA === "REQUIRED" || isInEEA === "UNKNOWN") {
      setIsEEA(true);
    }
  };

  const handleNextPage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(false);
    fetchAlarm();

    if(Platform.OS === 'android' && Platform.Version >=33) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if(granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          t('appStartScreen:alarmDenied'), 
          t('appStartScreen:explainAlarmDenied'),
          [{
            text : t('appStartScreen:whatIsThat'),
            style : 'destructive',
            onPress : () => Linking.openSettings(),
          },{
            text : t('common:okISee'),
          }]
        );
      }
      handleGetFCMToken();
    } else if(Platform.OS === 'ios') {
      const request = await Notifications.requestPermissionsAsync();
      if (!request.granted) {
        Alert.alert(
          t('appStartScreen:alarmDenied'), 
          t('appStartScreen:explainAlarmDenied'),
          [{
            text : t('appStartScreen:whatIsThat'),
            style : 'destructive',
            onPress : () => Linking.openURL("app-settings:DDDdiary"),
          },{
            text : t('common:okISee'),
          }]
        );
      }
      handleGetFCMToken();
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      })
    }
  };


  const fetchAlarm = () => {
    const {hour12Number, minuteNumber, ampm} = changeTimetoNumber(myStatusStore.userDAlarm);
    if(hour12Number && minuteNumber && ampm) {
      setHour(hour12Number.toString());
      setMinute(minuteNumber.toString().padStart(2,'0'));
      setAmPm(ampm);
    }
    setAlarmSwitch(myStatusStore.userDAlarmOn);
  };

  const handleGetFCMToken = async () => {
    if(myStatusStore.fcmToken === ""){
      const token = await messaging.getToken();
      myStatusStore.setProp("fcmToken", token);
    }
  };

  const handleLangChange = (value : string)=> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(false);
    myStatusStore.setProp("userCLang", value);
    i18n.changeLanguage(value);
  };


  const handleSetAlarm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    const alarmTime = `${hour}:${minute} ${ampm}`
    myStatusStore.setProp("userDAlarm", alarmTime); //새 값 받고 toggle함수로 넘기기
    handleAlarmToggle(true);
    setTimeDal(false);
  };

  const handleAlarmToggle = async (value : boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    setIsToggled(false);
    myStatusStore.setProp("somethingChanged", true);
    setIsToggled(true);
    setAlarmSwitch(value); // save mystatus 안해도, nickname은 MST에 자동 저장된 상태임을 유의

    // const booly = await myStatusStore.toggleUserDAlarm(value);
    // if(booly) {
    //   setIsToggled(true);
    //   setAlarmSwitch(value); // save mystatus 안해도, nickname은 MST에 자동 저장된 상태임을 유의
    // } else {
    //   setIsToggled(true);
    //   handleGetFCMToken();
    //   Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
    // }
  };

  const handleJoin = async (value : boolean)=> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    setIsSaved(false);
    try {
      const response = await myStatusStore.joinOrErrorInfo();
      if (response === "ok") {
        await myStatusStore.toggleUserDAlarm(value);
        Alert.alert(t('appStartScreen:welcomeJoin1'),t('appStartScreen:welcomeJoin2'));
        await myStatusStore.saveMyStatus();
        setIsSaved(true);
        route.replace('/(tabs)/(todaytab)/todaywrite');
      } else {
        setWarning(response);
        setIsSaved(true);
      }
    } catch (e) {
      setWarning('appStartScreen:errorInfo');
      setIsSaved(true);
    }
  };
  
  return (
    <Screen 
      safeAreaEdges={["top"]}
      contentContainerStyle={themed($container)}
    >
      {page ? 
          <View style={{flex : 1}}>
            <ScrollView>
              <View style={themed($topContainer)}>
                <Text
                  text="DDDdiary"
                  style={themed($welcomeTitle)}
                />
                <Text
                  tx="appStartScreen:helloBeginner"
                  style={themed($welcomeHeader)}
                />
                {initialLang !== "en" ? 
                  <Text text={"(Hello!)"} /> : null }
                {!theme.isDark ? 
                  <View style={{maxHeight: screenWidth*0.75}}>
                    <Image
                      source={ddddiaryChar}
                      style={{width : '100%', height : '100%'}}
                    />
                  </View>
                : <View style={{maxHeight: screenWidth*0.75}}>
                    <Image
                      source={ddddiaryCharDark}
                      style={{width: '100%', height: '100%'}}
                    />
                  </View>
                }
                <Text
                  tx="appStartScreen:needYourInfo"
                  preset="default"
                  style={{marginTop : spacing.sm}}
                />
                {initialLang !== "en" ? 
                  <Text 
                    text={"(Initial setup is required to use DDDdiary.)"}
                    style={themed($smallText)}
                  /> 
                : null }
                <Text
                  tx="appStartScreen:yourAlarmAllow"
                  preset="subheading"
                  style={themed($listHeader)}
                />
                {initialLang !== "en" ? 
                  <Text 
                    text="Allow notifications"
                    style={themed($smallText)}
                  /> : null 
                }
                <Text
                  tx="appStartScreen:explainAlarmAllow"
                  preset="default"
                />

                <Text
                  tx="appStartScreen:yourNickname"
                  preset="subheading"
                  style={themed($listHeader)}
                />
                {initialLang !== "en" ? 
                  <Text 
                    text={"Your nickname\n"} 
                    style={themed($smallText)}
                  /> : null 
                }
                { isEEA ?
                  <View>
                    <Text
                      tx="appStartScreen:yourGoogleAds"
                      preset="subheading"
                      style={themed($listHeader)}
                    />
                    <Text 
                      text="Ads setting"
                      style={themed($smallText)}
                    />
                    <Text
                      tx="appStartScreen:explainGoogleAds"
                      preset="default"
                    />
                  </View>
                : null 
                }
                <Button 
                  tx="appStartScreen:okBtn" 
                  onPress={handleNextPage} 
                  style={themed($gotItBtn)}
                  textStyle={{color : '#FFF'}}
                />
                </View>

                {!theme.isDark ? 
                  <View style={{height : screenWidth*0.62 + spacing.md*2, marginTop : spacing.lg}}>
                  <Text
                    tx="appStartScreen:dontWorry"
                    style={{width : '90%', marginLeft : spacing.sm, fontSize : spacing.md, lineHeight : spacing.lg}}
                  />
                    <Image
                      source={ddddiaryChar2}
                      style={{width : screenWidth, height : screenWidth*0.62, position : 'absolute', top: spacing.md*2}}
                    />
                  </View>
                : <View style={{height : screenWidth*0.62 + spacing.md*2, marginTop : spacing.lg}}>
                  <Text
                    tx="appStartScreen:dontWorry"
                    style={{width : '90%', marginLeft : spacing.sm, fontSize : spacing.md, lineHeight : spacing.lg}}
                  />
                    <Image
                      source={ddddiaryChar2Dark}
                      style={{width : screenWidth, height : screenWidth*0.62, position : 'absolute', top: spacing.md*2}}
                    />
                  </View>
                }
            </ScrollView>
          </View>

      :

        <View style={themed($nextPageContainer)}>
          <ScrollView>
            <Text
              tx="appStartScreen:yourLanguage"
              preset="subheading"
              style={themed($listHeader)}
            />
            {initialLang !== "en" ? 
              <Text text="Current Language Setting" /> : null }
            <View style={themed($langChange)}>
              <Text
                text={t(`lang:${myStatusStore.userCLang}`)}
                preset="heading"
              />
              <Button 
                style={themed($langChangeBtn)}
                onPress={()=>{setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                tx="common:change"/>
            </View>
            <Text
              tx="appStartScreen:needYourNickname"
              preset="subheading"
              style={themed($listHeader)}
            />
            <TextField
              inputWrapperStyle={themed($activeTextField)}
              maxFontSizeMultiplier={1.4}
              multiline={false}
              maxLength={30} 
              placeholderTx="appStartScreen:askNickname"
              onChangeText={(value)=>{myStatusStore.setProp('nickname',value); setWarning("");}}
            />
            <Text
              text={t(warning)}
              preset="formLabel"
              style={themed($warningText)}
            />
            <Text
              text={t(`appStartScreen:setDailyAlarm`)}
              preset="subheading"
              style={themed($listHeader)}
            />
            <Text
              text={t(`appStartScreen:explainDailyAlarm`)}
              style={themed($smallText)}
            />
            <Text
              style={themed($detailTextLarge)}
              text={`${t('settingScreen:alarmTime')}${myStatusStore.userDAlarm}`}
            />
            { isToggled ?
              <Switch
                containerStyle={themed($verticalMargin)}
                inputInnerStyle={themed($switchBtn)}
                labelTx={myStatusStore.userDAlarmOn ? "settingScreen:activation" : "settingScreen:inactivation"}
                labelPosition="right"
                value={alarmSwitch}
                onValueChange={(value)=>{handleAlarmToggle(value);}}
              />
            :
              <View style={themed($actIndicator)} >
                <ActivityIndicator size={'small'} />
              </View>
            }
            <Button 
              style={themed($detailBtn)}
              text={t(`settingScreen:button1`)}
              onPress={()=>{setTimeDal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
            />
            <Button 
              text={isSaved ? t("appStartScreen:letsJoin") : ""}
              LeftAccessory={()=> !isSaved ? <View><ActivityIndicator color={'white'} size={"small"} /></View> : null}
              onPress={()=> handleJoin(alarmSwitch)}
              style={themed($gotItBtn)}
              textStyle={{color : '#FFF'}}
            />
          </ScrollView>

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={()=>setModalVisible(false)}
          >
            <View style={themed($GeneralModal)}>
              <View style={themed($GeneralModalHeader)}>
                <Picker
                  selectedValue={modalValue}
                  onValueChange={(value)=>setModalValue(value)}
                  style={themed($langPicker)}
                  itemStyle = {themed($pickerText)}    
                  dropdownIconColor={theme.colors.palette.neutral900}              
                >
                  <Picker.Item label="English" value={"en"} />
                  <Picker.Item label="한국어" value={"ko"} />
                  <Picker.Item label="日本語" value={"ja"} />
                  <Picker.Item label="中文" value={"zh"} />
                  <Picker.Item label="español" value={"es"} />
                </Picker>
                <Button 
                  tx="common:ok" 
                  onPress={()=>handleLangChange(modalValue)}
                  style={themed($GeneralModalBtn)}
                  textStyle={themed($GeneralModalBtnTx)}
                />
              </View>
            </View>
          </Modal>


          <Modal
            visible={timeDal} 
            transparent={true} 
            animationType="slide"
          >
            <View style={themed($GeneralModal)}>
              <View style={themed($GeneralModalHeader)}>
                <Button 
                  tx="common:cancel" 
                  onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTimeDal(false); }} 
                  style={themed($GeneralModalBtn2Alarm)} 
                  textStyle={themed($GeneralModalBtnTx)}
                />
                <Button 
                  tx="common:ok" 
                  onPress={handleSetAlarm} 
                  style={themed($GeneralModalBtn2Alarm)} 
                  textStyle={themed($GeneralModalBtnTx)}
                />
              </View>
              <View style={[themed($GeneralPickerContainer), $bottomContainerInsets]}>
                <Picker 
                  selectedValue={hour} 
                  onValueChange={setHour} 
                  style={themed($timePicker)}
                  itemStyle = {themed($pickerText)}
                  dropdownIconColor={theme.colors.palette.neutral900}
                >
                  {[...Array(12).keys()].map(
                    i => (<Picker.Item key={i + 1} label={`${i + 1}`} value={`${i + 1}`} />)
                  )}
                </Picker>
                <Picker 
                  selectedValue={minute} 
                  onValueChange={setMinute} 
                  style={themed($timePicker)}
                  itemStyle = {themed($pickerText)}
                  dropdownIconColor={theme.colors.palette.neutral900}
                >
                  {[...Array(4).keys()].map(
                    i => (<Picker.Item key={i*15} label={`:  ${(i*15).toString().padStart(2, '0')}`} value={(i*15).toString().padStart(2, '0')} />)
                  )}
                </Picker>
                <Picker 
                  selectedValue={ampm} 
                  onValueChange={setAmPm} 
                  style={themed($timePicker)}
                  itemStyle = {themed($pickerText)}
                  dropdownIconColor={theme.colors.palette.neutral900}
                >
                  <Picker.Item label={t('common:amText')} value="AM" />
                  <Picker.Item label={t('common:pmText')} value="PM" />
                </Picker>
              </View>
            </View>
          </Modal>
        </View>
      }
    </Screen>
  )
}


const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.tabBackground,
  borderColor : colors.separator,
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginHorizontal : spacing.sm,
  paddingVertical : spacing.lg,
})

const $welcomeTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize : spacing.xl,
  fontWeight : '900',
  lineHeight : spacing.xl,
  marginVertical : spacing.md,
})

const $welcomeHeader: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize : spacing.xl,
  lineHeight : spacing.xxl,
})

const $smallText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize : spacing.sm,
  lineHeight : spacing.md,
})

const $listHeader: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xxl,
})

const $gotItBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.palette.delight100,
  marginVertical : spacing.xxl,
  borderRadius : spacing.lg,
  borderWidth : 0,
})

const $nextPageContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex : 1,
  paddingHorizontal: spacing.sm,
  paddingVertical : spacing.md,
})

const $langChange: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection : 'row',
  alignItems : 'center',
  marginVertical : spacing.sm,

})

const $langChangeBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  marginLeft : spacing.lg,
  minHeight : 0,
  minWidth : 0,
})

const $GeneralModal: ThemedStyle<ViewStyle> = ({}) => ({
  flex : 1,
  justifyContent : 'flex-end'
})

const $GeneralModalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  justifyContent : 'space-between',
  flexDirection : 'row',
  alignItems : 'center',
  backgroundColor : colors.palette.neutral200,
  borderTopLeftRadius : spacing.xl,
  borderTopRightRadius : spacing.xl,
  borderTopWidth : 1,
  borderLeftWidth : 1,
  borderRightWidth : 1,
  borderColor : colors.separator,
  paddingBottom : spacing.xxxl,
  paddingTop : spacing.xl, // 안드로이드 약간 필요
})

const $GeneralModalBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor : 'transparent',
  borderWidth : 0,
  padding : spacing.sm,
  margin : spacing.sm,
  marginRight : spacing.xl,
  marginBottom : spacing.xxxl,
})

const $GeneralModalBtn2Alarm: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor : 'transparent',
  borderWidth : 0,
  padding : spacing.sm,
  margin : spacing.sm,
})

const $GeneralModalBtnTx: ThemedStyle<TextStyle> = ({ colors}) => ({
  color: colors.palette.delight100,
})

const $GeneralPickerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection : 'row',
  justifyContent : 'center',
  backgroundColor : colors.palette.neutral200,
})

const $timePicker: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  minWidth : '30%',
  marginBottom : spacing.xxxl,
  color : colors.palette.neutral900,
})

const $langPicker: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  minWidth : '50%',
  marginLeft : spacing.xl,
  marginBottom : spacing.xxxl,
  color : colors.palette.neutral900,
})

const $pickerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.neutral900,
})

const $activeTextField: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor : colors.tabBackground,
})

const $warningText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.angry500,
})

const $detailTextLarge: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.delight100,
  fontSize : spacing.md,
  paddingTop : spacing.lg,
  fontWeight : 'bold',
})

const $verticalMargin: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical : spacing.sm,
})

const $switchBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor : colors.palette.delight100,
})

const $actIndicator: ThemedStyle<ViewStyle> = ({spacing}) => ({
  marginVertical : spacing.lg,
  marginHorizontal : spacing.md,
  alignItems : 'flex-start',
  justifyContent : 'flex-start',
})

const $detailBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginHorizontal : spacing.xl,
  backgroundColor : colors.palette.neutral100,
  borderRadius : spacing.xs,
  borderWidth : 1,
})


