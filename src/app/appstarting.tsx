import { Button, Screen, Text, TextField } from "@/components";
import { ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { Alert, Linking, Modal, TextStyle, View, ViewStyle, Platform, PermissionsAndroid, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useStores } from "@/models";
import { useTranslation } from "react-i18next";
import {Picker} from '@react-native-picker/picker';
import { useRouter } from "expo-router";
import * as Notifications from 'expo-notifications';
import { getMessaging } from "@react-native-firebase/messaging";
import * as Haptics from 'expo-haptics';
import { checkInternetConnection } from "@/utils/network";


const messaging = getMessaging();

export default function appStarting() {
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { i18n, t } = useTranslation();
  const initialLang = i18n.language.split("-")[0];
  const route = useRouter();
  const [page, setPage] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalValue, setModalValue] = useState('en');
  const [warning, setWarning] = useState("");
  const [isSaved, setIsSaved] = useState(true);


  useEffect(()=>{
    myStatusStore.setProp("userCLang", initialLang);
  },[]);

  const handleNextPage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(false);

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

  const handleJoin = async ()=> {
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
        Alert.alert(t('appStartScreen:welcomeJoin1'),t('appStartScreen:welcomeJoin2'));
        await myStatusStore.saveMyStatus();
        setIsSaved(true);
        route.push('/(tabs)/(todaytab)/todaywrite');
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
            <ScrollView contentContainerStyle={themed($topContainer)}>
              <Text
                text="DDDdiary"
                style={themed($welcomeTitle)}
              />
              <Text
                tx="appStartScreen:helloBeginner"
                style={themed($welcomeHeader)}
              />
              <Text
                tx="appStartScreen:needYourInfo"
                style={themed($welcomeHeader)}
              />
              {initialLang !== "en" ? 
                <Text text={"Hello!\nWe only need 2 pieces of information from you."} /> : null }
              <Text
                tx="appStartScreen:yourAlarmAllow"
                preset="subheading"
                style={themed($listHeader)}
              />
              {initialLang !== "en" ? 
                <Text text="Allow notifications" /> : null }
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
                <Text text={"Your nickname\n"} /> : null }
            </ScrollView>
            <View style={themed($bottomContainer)}>
              <Button tx="appStartScreen:okBtn" onPress={handleNextPage} />
            </View>
          </View>

      :

        <View style={themed($nextPageContainer)}>
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
            <Button 
              text={isSaved ? t("appStartScreen:letsJoin") : ""}
              LeftAccessory={()=> !isSaved ? <View><ActivityIndicator size={"small"} /></View> : null}
              onPress={handleJoin}
              style={themed($letsStartBtn)}
            />


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
        </View>
      }
    </Screen>
  )
}


const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.tabBackground,
  borderTopWidth : 1,
  borderColor : colors.separator,
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical : spacing.lg,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexBasis: "30%",
  backgroundColor: colors.palette.neutral150,
  borderTopLeftRadius: spacing.lg,
  borderTopRightRadius: spacing.lg,
  borderWidth : 1,
  borderColor : colors.separator,
  paddingHorizontal: spacing.lg,
  justifyContent: "space-around",
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

const $listHeader: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xxl,
})

const $nextPageContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex : 1,
  paddingHorizontal: spacing.lg,
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

const $GeneralModalBtnTx: ThemedStyle<TextStyle> = ({ colors}) => ({
  color: colors.palette.delight100,
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

const $letsStartBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginHorizontal : spacing.lg,
  marginTop : spacing.xxxl,
  backgroundColor : colors.palette.neutral100,
  borderRadius : spacing.lg,
  borderWidth : 1,
})

