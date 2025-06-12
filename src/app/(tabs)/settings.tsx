import { Button, Header, ListItem, ListView, Screen, Switch, Text } from "@/components";
import { useStores } from "@/models";
import { ThemedStyle } from "@/theme";
import { changeTimetoNumber } from "@/utils/changeTimes";
import { useAppTheme } from "@/utils/useAppTheme";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Linking, Modal, TextStyle, View, ViewStyle } from "react-native";
import { AdsConsent } from 'react-native-google-mobile-ads';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import LicenseFullScreen from "../licenseFull";
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle";
import { observer } from "mobx-react-lite";
import * as Haptics from 'expo-haptics';
import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics';
import { checkInternetConnection } from "@/utils/network";


export default observer(function Settings() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const { theme, themed } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { myStatusStore, myFriendStore } = useStores();
  const router = useRouter();

  const [page, setPage] = useState("");
  const pageIndex = ["1", "2", "3", "4", "5", "6"];
  const [langValue, setLangValue] = useState('en');
  const [license, setLicense] = useState('');
  const [licenseFullPage, setLicenseFullPage] = useState(false);
  //모달관련
  const [timeDal, setTimeDal] = useState(false);
  const [langDal, setLangDal] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('PM');
  const [alarmSwitch, setAlarmSwitch] = useState(false);
  const [isToggled, setIsToggled] = useState(true);


  useEffect(()=>{
    setLangValue(myStatusStore.userCLang);
    fetchAlarm();
    loadLicense();
  },[])

  const fetchAlarm = () => {
    const {hour12Number, minuteNumber, ampm} = changeTimetoNumber(myStatusStore.userDAlarm);
    if(hour12Number && minuteNumber && ampm) {
      setHour(hour12Number.toString());
      setMinute(minuteNumber.toString().padStart(2,'0'));
      setAmPm(ampm);
    }
    setAlarmSwitch(myStatusStore.userDAlarmOn);
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
    const booly = await myStatusStore.toggleUserDAlarm(value);
    if(booly) {
      setIsToggled(true);
      setAlarmSwitch(value);
      myStatusStore.saveMyStatus();
    } else {
      setIsToggled(true);
      Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
    }
  };

  const handleLangChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    myStatusStore.setProp("userCLang", langValue);
    myStatusStore.saveMyStatus();
    i18n.changeLanguage(langValue);
    setLangDal(false);
  };

  const handleResetNickname = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    Alert.alert(
      t('settingScreen:resetSure1'),
      t('settingScreen:resetSure2'),
      [
        { text: t('common:noWay'), style: 'destructive' },
        { text: t('common:doIt'), onPress: async () => {
          try{
            await myFriendStore.deleteAllFriends();
            const booly = await myStatusStore.resetNickname();
            if(booly) {
              router.push('/appstarting');
            }
          } catch (e) {
            const crashlytics = getCrashlytics();
            log(crashlytics, 'resetNickname Error');
            recordError(crashlytics, e as Error);
            Alert.alert(t('common:errorHappened'), t('common:tryAgain'));
          }
        }},
    ]);
  };
  
  const handleThanks = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('settingScreen:thankYou'), t('settingScreen:thankYou2'));
  };

  const handleADBlock = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (consentInfo.isConsentFormAvailable) {
      await AdsConsent.showForm();
    }
    else {
      Alert.alert(t('settingScreen:noADRequired'));
    }
  };

  const loadLicense = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const [asset] = await Asset.loadAsync(require('../../../assets/licenses/LICENSE.txt'));
    if(asset.localUri){
      const textContent = await FileSystem.readAsStringAsync(asset.localUri);
      setLicense(textContent);
    }
  };

  return (
    <Screen 
      contentContainerStyle={themed($container)}
    >
      <Header 
        titleTx="tabs:settings" 
        containerStyle={themed($header)}
        LeftActionComponent={ licenseFullPage ?
          <Button 
            preset='default'
            tx='common:back' 
            style = {themed($headerBtn)} 
            onPress={()=>{setLicenseFullPage(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
          /> : <Text text="" />
        }
      />
      {licenseFullPage ? <LicenseFullScreen /> :
        <View style={{flex : 1}}>
          <ListView
            data = {pageIndex}
            keyExtractor={(item)=>item}
            estimatedItemSize={50}
            renderItem={({item})=>(
              <View>
                <ListItem
                  style={themed($listBtn)}
                  key={item}
                  text={t(`settingScreen:menu${item}`)}
                  onPress={()=>{setPage(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                />
                { page === "1" && item === "1" ?
                  <View style={themed($detailPage)}>
                    <Text
                      text={t(`settingScreen:explain${item}`)}
                    />
                    <Text
                      style={themed($detailTextLarge)}
                      text={`${t('settingScreen:alarmTime')}${myStatusStore.userDAlarm}`}
                    />
                    <Text 
                      text={`${t("todayRScreen:timeZone")}${myStatusStore.userDAlarmZone}`}
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
                    { myStatusStore.timeZone !== myStatusStore.userDAlarmZone ? 
                      <Text
                        text={t("settingScreen:explainZoneChange")} 
                      /> 
                    : null}
                    <Button 
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={()=>{setTimeDal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                    />
                    <Text
                      text={t(`settingScreen:secondExplain${item}`)}
                    />
                  </View>
                : null}
                { page === "2" && item === "2" ?
                  <View style={themed($detailPage)}>
                    <Text
                      text={t(`settingScreen:explain${item}`)}
                    />
                    <Text 
                      style={themed($detailTextLarge)}
                      text={t(`lang:${langValue}`)}
                    />
                    <Button
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={()=>{setLangDal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                    />
                  </View>
                : null}
                { page === "3" && item === "3" ?
                  <View style={themed($detailPage)}>
                    <Text
                      text={t(`settingScreen:explain${item}`)}
                    />
                    <Button 
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={handleResetNickname}
                    />
                  </View>
                : null}
                { page === "4" && item === "4" ?
                  <View style={themed($detailPage)}>
                    <Text
                      text={t(`settingScreen:explain${item}`)}
                    />
                    <Button 
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={handleADBlock}
                    />
                    <Text
                      tx="settingScreen:urlPrivacyPolicy"
                      style={{textDecorationLine:'underline'}}
                      preset="formHelper"
                      onPress={()=> Linking.openURL('https://hyunhojeong1.github.io/DDDdiary/')}
                    />      
                  </View>
                : null}
                { page === "5" && item === "5" ?
                  <View style={themed($detailPage)}>
                    <Text>{license}</Text>
                    <Button 
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={()=>{setLicenseFullPage(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                    />
                  </View>
                : null}
                { page === "6" && item === "6" ?
                  <View style={themed($detailPage)}>
                    <Text
                      text={t(`settingScreen:explain${item}`)}
                    />
                    <Button 
                      style={themed($detailBtn)}
                      text={t(`settingScreen:button${item}`)}
                      onPress={handleThanks}
                    />
                  </View>
                : null}

              </View>
            )}
          />
        </View>
      }


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
              style={themed($GeneralModalBtn)} 
              textStyle={themed($GeneralModalBtnTx)}
            />
            <Button 
              tx="common:ok" 
              onPress={handleSetAlarm} 
              style={themed($GeneralModalBtn)} 
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


      <Modal
        visible={langDal}
        transparent={true} 
        animationType="slide"
      >
        <View style={themed($GeneralModal)}>
          <View style={themed($GeneralModalHeader)}>
            <Button 
              tx="common:cancel" 
              onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLangDal(false); setLangValue(myStatusStore.userCLang);}} 
              style={themed($GeneralModalBtn)} 
              textStyle={themed($GeneralModalBtnTx)}
            />
            <Button 
              tx="common:ok" 
              onPress={handleLangChange} 
              style={themed($GeneralModalBtn)} 
              textStyle={themed($GeneralModalBtnTx)}
            />
          </View>
          <View style={[themed($GeneralPickerContainer), $bottomContainerInsets]}>
            <Picker
              selectedValue={langValue}
              onValueChange={(item) => setLangValue(item)}
              style={themed($langPicker)}
              itemStyle = {themed($pickerText)}
              dropdownIconColor={theme.colors.palette.neutral900}
            >
              <Picker.Item label="English" value="en" />
              <Picker.Item label="한국어" value="ko" />
              <Picker.Item label="日本語" value={"ja"} />
              <Picker.Item label="中文" value={"zh"} />
              <Picker.Item label="español" value={"es"} />
            </Picker>
          </View>
        </View>
      </Modal>

    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral150,
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

const $listBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal : spacing.xs,
  backgroundColor: colors.tabBackground,
  borderBottomColor : colors.separator,
  borderBottomWidth : 1,
})

const $detailPage: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.palette.neutral150,
  padding : spacing.sm,
  borderBottomColor : colors.separator,
  borderBottomWidth : 1,
})

const $detailTextLarge: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.delight100,
  fontSize : spacing.lg,
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
  marginHorizontal : spacing.lg,
  marginVertical : spacing.md,
  backgroundColor : colors.palette.neutral100,
  borderRadius : spacing.lg,
  borderWidth : 1,
})

const $GeneralModal: ThemedStyle<ViewStyle> = ({}) => ({
  flex : 1,
  justifyContent : 'flex-end'
})

const $GeneralModalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  justifyContent : 'space-between',
  flexDirection : 'row',
  backgroundColor : colors.palette.neutral200,
  borderTopLeftRadius : spacing.xl,
  borderTopRightRadius : spacing.xl,
  borderTopWidth : 1,
  borderLeftWidth : 1,
  borderRightWidth : 1,
  borderColor : colors.separator,
})

const $GeneralModalBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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
  marginBottom : spacing.xxxl,
  color : colors.palette.neutral900,
})

const $pickerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.neutral900,
})
