import { Button, CardView, Checkbox, Header, ListItem, Text, TextField } from "@/components";
import { ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { useEffect, useState } from "react";
import { useStores } from "@/models";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { Picker } from "@react-native-picker/picker";
import { getCurrentDate } from "@/utils/getCurrentDate";
import * as Haptics from 'expo-haptics';
import { MotiView } from "moti";
import { orderAlarms } from "@/utils/changeTimes";
import { banForRefresh } from "@/utils/banForRefresh";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle";
import { checkInternetConnection } from "@/utils/network";



export default observer(function TodayWrite() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"]);
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { t } = useTranslation();
  const [isRefreshed, setIsRefreshed] = useState(true);
  const [isSaved, setIsSaved] = useState(true);

  //일기내용
  const [text1, setText1] = useState<string>("");
  const [text2, setText2] = useState<string>("");
  const [text3, setText3] = useState<string>("");
  const [shareCheck, setShareCheck] = useState<boolean>(true);
  const [cautionCheck, setCautionCheck] = useState<boolean>(false);
  const [alarms, setAlarms] = useState<string[]>([]);
  const [reUseComment, setReUseComment] = useState<boolean>(false);

  //알람세팅
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute]= useState<string>('00');
  const [ampm, setAmpm] = useState<string>('PM');

  useEffect(()=>{
    handleInitialDiary();
  },[])

  useEffect(()=>{
    if(text1) {setText1(prev => `${prev} `);}
    if(text2) {setText2(prev => `${prev} `);}
    if(text3) {setText3(prev => `${prev} `);}
  },[theme.isDark])

  const handleCancle = ()=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('todayWScreen:cancelWriting'),
      t('todayWScreen:explainCancel'),
      [
        { text: t('common:noWay'), style: 'destructive' },
        { text: t('common:okISee'), onPress: async () => {
          await myStatusStore.fetchMystatus();
          handleInitialDiary();
        }},
    ]);
  };

  const handleStart = async()=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    setIsSaved(false);
    if(!cautionCheck) {
      setIsSaved(true);
      Alert.alert(t('todayWScreen:needWarningCheck'), t('todayWScreen:explainWarningCheck'));
      return;
    }
    if(banForRefresh()) {
      setIsSaved(true);
      Alert.alert(t('todayWScreen:needWait12'), t('todayWScreen:explainWait12'));
      return;
    }
    const {dateISO, fulldate} = getCurrentDate();
    const contents = {
      diaryNDate : fulldate,
      diaryISODate : dateISO,
      text1 : text1,
      text2 : text2,
      text3 : text3,
      shareCheck : shareCheck,
      cautionCheck : cautionCheck,
      dailyQuestion : myStatusStore.todayQuestion,
      alarms : alarms,
      alarmsZone : myStatusStore.timeZone,
    };
    myStatusStore.setProp("somethingChanged", true);
    try{
      const booly = await myStatusStore.saveTodayDiary(alarms, shareCheck);
      if(booly) {
        setIsSaved(true);
        await myStatusStore.modelAndSaveOneDiary(fulldate, contents);
        myStatusStore.setProp("todayProcess", true);
      } else {
        setIsSaved(true);
        Alert.alert(t('settingScreen:alarmYetSaving1'), t('settingScreen:alarmYetSaving2'));
      }
    } catch (e) {
      Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
    }
  };

  const handleRefresh = async ()=> {
    setIsRefreshed(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    myStatusStore.dateRenewal();
    myStatusStore.setTodayQuestion();
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsRefreshed(true);
  };

  const handleInitialDiary = () => {
    const response = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString());
    if(response) {
      setText1(response.text1);
      setText2(response.text2);
      setText3(response.text3);
      setShareCheck(response.shareCheck);
      setCautionCheck(response.cautionCheck);
      setAlarms([...response.alarms]); // MST 추적 끊기. 날짜 변경시 오늘 일기가 내일 일기에 저장되는 경우 문제
    } else {
      setText1("");
      setText2("");
      setText3("");
      setShareCheck(true);
      setCautionCheck(false);
      setAlarms([]);
    }
  };

  const handleAddAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let modifiedMinute = minute;
    if(ampm === "AM" && hour === "12" && minute === "00") {
      modifiedMinute = "15";
    }
    const newAlarm = `${hour}:${modifiedMinute} ${ampm}`;
    if (alarms.includes(newAlarm)) {
      setModalVisible(false);
      return;
    }
    if (alarms.length >= 7 ) {
      Alert.alert(t('todayWScreen:warnMaxAlarm'), t('todayWScreen:explainMaxAlarm'));
      setModalVisible(false);
      return;
    }
    const updatedAlarms = [...alarms, newAlarm];
    const sortedAlarms = orderAlarms(updatedAlarms);
    setAlarms(sortedAlarms);
    setModalVisible(false);
  };

  const handleReuseAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('todayWScreen:explainReuse'),"",
      [{ text: t('common:cancel'), style: 'destructive' },
        { text: t('todayWScreen:comeHere'), onPress: () => {
          const lastUsed = [...myStatusStore.lastUsedAlarm];
            if(lastUsed.length !==0){
              setAlarms(lastUsed);
            } else { setReUseComment(true); }
      }}]
    );
  };

  const handleDeleteAlarm = (alarmToDel : string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedAlarms = alarms.filter(alarm=> alarm !== alarmToDel);
    setAlarms(updatedAlarms);
  };
  
  return (
    <View
      style={themed($container)}
    >
      <Header 
        titleTx="tabs:todaydiary"
        containerStyle={themed($header)}
        LeftActionComponent={
          <Button preset='default'
            tx='common:cancel' 
            style = {themed($headerBtn)} 
            onPress={handleCancle}
          />
        }
        RightActionComponent={ isSaved ?
          <Button preset='default' 
            textStyle={themed($headerBtnStart)} 
            tx='todayWScreen:todayStart'
            style = {themed($headerBtn)}
            onPress={handleStart}
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
            tx="todayWScreen:writing"
            style = {themed($statusBtn)}
            LeftAccessory={() => ( 
              isRefreshed ?
                <FontAwesome name="circle" size={12} color="#999999" />
              :
                <View>
                  <ActivityIndicator size={"small"} />
                </View>
            )}
            onPress={handleRefresh}
          />
          <CardView>
            <Text
              preset="heading"
              text={myStatusStore.dateOfficial(myStatusStore.todayISODate, 3000)}
            />
            <Text
              tx="todayWScreen:q1"
              preset="subheading"
            />
            <TextField
              maxLength={2000}
              inputWrapperStyle={themed($activeTextField)}
              placeholderTx="todayWScreen:placeholderQ1"
              multiline={true}
              value={text1}
              onChangeText={setText1}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
            />
            <Text
              tx="todayWScreen:q2"
              preset="subheading"
            />
            <TextField
              maxLength={2000}
              inputWrapperStyle={themed($activeTextField)}
              placeholderTx="todayWScreen:placeholderQ2"
              multiline={true}
              value={text2}
              onChangeText={setText2}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
            />
            <Text
              tx="todayWScreen:qAlarm"
              preset="subheading"
            />
            <TextField
              readOnly
              scrollEnabled={false}
              multiline={true}
              inputWrapperStyle={themed($inactiveTextField)}
              value={theme.isDark ? t('todayWScreen:explainAlarm') : `${t('todayWScreen:explainAlarm')} `}
            />
            <View style={{flexDirection:'row'}}>
              <Button 
                tx="todayWScreen:addAlarmBtn"
                onPress={()=>{setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                style={themed($alarmAddBtnLeft)}
              />
              <Button 
                tx="todayWScreen:reuseAlarmBtn"
                onPress={()=>handleReuseAlarm()}
                style={themed($alarmAddBtnRight)}
              />
            </View>
            <Text
              text={reUseComment ? t('todayWScreen:reUseComment'): ""}
              preset="default"
            />
            <View style={{flexDirection:'row'}}>
              <CardView style={themed($alarmBoxLeft)}>
                <Text text="AM" preset="formLabel" />
                {alarms.map((item, index)=>(
                  item.includes("AM") ?
                    <ListItem
                      key={index}
                      style={themed($alarmTime)}
                      text={item}
                      RightComponent={
                        <TouchableOpacity onPress={()=>handleDeleteAlarm(item)}>
                          <Octicons name="trash" size={20} color="#999999" />
                        </TouchableOpacity>
                      }
                    /> : null
                ))}
              </CardView>
              <CardView style={themed($alarmBoxRight)}>
              <Text text="PM" preset="formLabel" />
                {alarms.map((item, index)=>(
                  item.includes("PM") ?
                    <ListItem 
                      key={index}
                      style={themed($alarmTime)}
                      text={item}
                      RightComponent={
                        <TouchableOpacity onPress={()=>handleDeleteAlarm(item)}>
                          <Octicons name="trash" size={20} color="#999999" />
                        </TouchableOpacity>
                      }
                    /> : null
                ))}
              </CardView>
            </View>
            <Checkbox 
              value={shareCheck}
              onValueChange={setShareCheck}
              label={t("todayWScreen:shareCheck")}
              containerStyle={themed($todayShareCheckMargin)}
            />
            <Text
              tx="todayWScreen:q3"
              preset="subheading"
            />
            <TextField
              readOnly
              scrollEnabled={false}
              containerStyle={themed($inactiveTextField)}
              multiline={true}
              value={theme.isDark ? t('todayWScreen:explainQ3') : `${t('todayWScreen:explainQ3')} `}
            />
            <TextField
              maxLength={2000}
              inputWrapperStyle={themed($activeTextField)}
              placeholderTx="todayWScreen:placeholderQ3"
              multiline={true}
              value={text3}
              onChangeText={setText3}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
            />
            <Text
              tx="todayWScreen:todayQ"
              preset="subheading"
            />
            <TextField
              readOnly
              scrollEnabled={false}
              multiline={true}
              value={ theme.isDark ?
                `${t('dailyQuestion:generalQ')}\n${t(`dailyQuestion:${myStatusStore.todayQuestion}`)}`
              : `${t('dailyQuestion:generalQ')}\n${t(`dailyQuestion:${myStatusStore.todayQuestion}`)} ` }
              inputWrapperStyle={themed($activeTextField)}
            />
            <Text
              tx="todayWScreen:qCaution"
              preset="subheading"
            />
            <TextField
              readOnly
              scrollEnabled={false}
              containerStyle={themed($inactiveTextField)}
              multiline={true}
              value={theme.isDark ? t('todayWScreen:Caution') : `${t('todayWScreen:Caution')} `}
            />
            <Button
              tx="todayWScreen:cautionOk"
              onPress={()=>{setCautionCheck(prev=>!prev); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
              textStyle = {cautionCheck ? 
                themed($cautionCheckedBtn) 
              : 
                themed($cautionUncheckedBtn)
              }
              LeftAccessory={() => (
                <Octicons 
                  name="check" 
                  style={cautionCheck ?
                    themed($cautionCheckedBtn)
                  :
                    themed($cautionUncheckedBtn)
                  } 
                />
              )}
            />
            <Text
              tx="todayWScreen:allowAlarm"
              preset="formHelper"
              onPress={()=> Platform.OS === "ios" ? Linking.openURL("app-settings:DDDdiary") : Linking.openSettings()}
            />            
          </CardView>


          <Modal 
            visible={modalVisible} 
            transparent={true} 
            animationType="slide"
          >
            <View style={themed($GeneralModal)}>
              <View style={themed($GeneralModalHeader)}>
                <Button 
                  tx="common:cancel" 
                  onPress={()=>{setModalVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={themed($GeneralModalBtn)}
                  textStyle={themed($GeneralModalBtnTx)}
                />
                <Button 
                  tx="common:ok" 
                  onPress={handleAddAlarm} 
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
                  {ampm === "AM" && hour === "12" ?
                    [...Array(3).keys()].map(
                      i => (<Picker.Item key={(i+1)*15} label={`:  ${((i+1)*15).toString().padStart(2, '0')}`} value={((i+1)*15).toString().padStart(2, '0')} />)
                    )
                  :
                    [...Array(4).keys()].map(
                      i => (<Picker.Item key={i*15} label={`:  ${(i*15).toString().padStart(2, '0')}`} value={(i*15).toString().padStart(2, '0')} />)
                    )
                  }
                </Picker>
                <Picker 
                  selectedValue={ampm} 
                  onValueChange={setAmpm}
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
      </ScrollView></MotiView>
    </View>
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

const $headerBtnStart: ThemedStyle<TextStyle> = ({ colors}) => ({
  color : colors.palette.delight100,
})

const $actIndicator: ThemedStyle<ViewStyle> = ({spacing}) => ({
  marginRight : spacing.md,
})

const $statusBtn : ThemedStyle<ViewStyle> = ({spacing}) => ({
  marginTop : spacing.xs,
  alignSelf: 'center',
  borderRadius: spacing.xxl,
  paddingHorizontal: spacing.xxl,
  paddingVertical: spacing.xxs,
  minHeight : spacing.xl,
})

const $activeTextField: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.tabBackground,
  marginBottom : spacing.xxxl,
})

const $inactiveTextField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.xs,
})

const $alarmAddBtnLeft: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex : 1,
  backgroundColor : colors.palette.neutral150,
  marginRight : spacing.xxxs,
})

const $alarmAddBtnRight: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex : 1,
  backgroundColor : colors.palette.neutral150,
  marginLeft : spacing.xxxs,
})

const $alarmBoxLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  justifyContent : 'flex-start',
  flex : 1,
  paddingTop : spacing.xs,
  marginTop : 0,
  marginLeft : 0,
  marginRight : spacing.xxs,
  minHeight : 100,
})

const $alarmBoxRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  justifyContent : 'flex-start',
  flex : 1,
  paddingTop : spacing.xs,
  marginTop : 0,
  marginLeft : spacing.xxs,
  marginRight : spacing.xxs,
  minHeight : 100,
})

const $alarmTime: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight : spacing.xxxs,
  alignItems : "center",
})

const $todayShareCheckMargin: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop : spacing.xxxs,
  marginBottom : spacing.xxxl,
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

const $pickerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.neutral900,
})

const $cautionCheckedBtn: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.delight100,
  fontSize : spacing.md,
})

const $cautionUncheckedBtn: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.neutral500,
  fontSize : spacing.md,
})
