import { Button, CardView, Checkbox, Header, ListItem, Text, TextField, } from "@/components";
import { spacing, ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Platform, ScrollView, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useStores } from "@/models";
import { observer } from "mobx-react-lite";
import { Trans, useTranslation } from "react-i18next";
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


const diaryInstruction = require("../../../../assets/images/diary_instruction1.png");
const diaryInstruction2 = require("../../../../assets/images/diary_instruction2.png");
const diaryInstruction3 = require("../../../../assets/images/diary_instruction3.png");


export default observer(function TodayWrite() {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"]);
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;
  const [isRefreshed, setIsRefreshed] = useState(true);
  const [isSaved, setIsSaved] = useState(true);
  const cautionRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  //일기내용
  const [text1, setText1] = useState<string>("");
  const [text2, setText2] = useState<string>("");
  const [text3, setText3] = useState<string>("");
  const [shareCheck, setShareCheck] = useState<boolean>(true);
  const [cautionCheck, setCautionCheck] = useState<boolean>(false);
  const [alarms, setAlarms] = useState<string[]>([]);
  const [reUseComment, setReUseComment] = useState<boolean>(false);
  const [reuseTodoComment, setReuseTodoComment] = useState<boolean>(false);

  //알람세팅
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute]= useState<string>('00');
  const [ampm, setAmpm] = useState<string>('PM');

  //이전알람모달
  const [preAlarmModalVisible, setPreAlarmModalVisible] = useState<boolean>(false);
  const [preAlarms, setPreAlarms] = useState<string[][]>([]);
  const [preAlarmPickString, setPreAlarmPickString] = useState<string>(""); // ios는 picker value 배열사용 불가

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
    if(text2.length > 500) {
      Alert.alert(t('todayWScreen:noOver500'), `${t('todayWScreen:nowTextLength')}${text2.length}`);
      return;
    }
    setIsSaved(false);
    if(!cautionCheck) {
      setIsSaved(true);
      Alert.alert(
        t('todayWScreen:needWarningCheck'), 
        t('todayWScreen:explainWarningCheck'),
        [
          { text: t('common:ok'), onPress: () => {
            handleScrollTo();
            return;
          }},
      ]);
      return;
    }
    if(banForRefresh()) {
      setIsSaved(true);
      Alert.alert(t('todayWScreen:needWait12'), t('todayWScreen:explainWait12'));
      return;
    }
    const {dateISO, fulldate, weekday} = getCurrentDate();
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
      dayInWeek : weekday,
    };
    myStatusStore.setProp("somethingChanged", true);
    try{
      const booly = await myStatusStore.saveTodayDiary(alarms, shareCheck, text2);
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

  const handleReuseTodo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('todayWScreen:explainReuse'),
      "",
      [
        { text: t('common:cancel'), style: 'destructive' },
        { text: t('todayWScreen:comeHere'), onPress: () => {
          const {lastTodoText1} = myStatusStore.preUsedTodoList;
          if (lastTodoText1.length > 0) {
            setText1(lastTodoText1);
          } else {
            setReuseTodoComment(true);
          }
        }},
    ]);
  };

  const handleOpenAlarmModal = () => {
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentTimeNumber = getCurrentDate().currentTimeNumber;
    if(currentTimeNumber < 1200 && alarms.length === 0) {
      setHour('1');
      setAmpm('AM');
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

  const handleReuseAlarmModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const preAlarms = [...myStatusStore.preUsedAlarms];
    if(preAlarms.length !==0) {
      setPreAlarms(preAlarms);
      const initialPick = `${preAlarms[0][0]}@${preAlarms[0].slice(2).join(", ")}`;
      setPreAlarmPickString(initialPick);
      setPreAlarmModalVisible(true);
    } else {
      setReUseComment(true);
    }
  };

  const handleReuseAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const reArray1 = preAlarmPickString.split("@");
    const reArray2 = reArray1[1].split(", ");
    setAlarms(reArray2);
    setPreAlarmModalVisible(false);
  };

  const handleDeleteAlarm = (alarmToDel : string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedAlarms = alarms.filter(alarm=> alarm !== alarmToDel);
    setAlarms(updatedAlarms);
  };

  const handleQuickStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if(!cautionCheck) {
      setCautionCheck(true);
      const hasInternet = await checkInternetConnection();
      if(!hasInternet){
        Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
        return;
      }
      if(text2.length > 500) {
        Alert.alert(t('todayWScreen:noOver500'), `${t('todayWScreen:nowTextLength')}${text2.length}`);
        return;
      }
      setIsSaved(false);
      if(banForRefresh()) {
        setIsSaved(true);
        Alert.alert(t('todayWScreen:needWait12'), t('todayWScreen:explainWait12'));
        return;
      }
      const {dateISO, fulldate, weekday} = getCurrentDate();
      const contents = {
        diaryNDate : fulldate,
        diaryISODate : dateISO,
        text1 : text1,
        text2 : text2,
        text3 : text3,
        shareCheck : shareCheck,
        cautionCheck : true,
        dailyQuestion : myStatusStore.todayQuestion,
        alarms : alarms,
        alarmsZone : myStatusStore.timeZone,
        dayInWeek : weekday,
      };
      myStatusStore.setProp("somethingChanged", true);
      try{
        const booly = await myStatusStore.saveTodayDiary(alarms, shareCheck, text2);
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
    } else {
      setCautionCheck(false);
      return;
    }
  }

  const handleScrollTo = () => {
    cautionRef.current?.measureLayout(
      scrollRef.current!.getScrollableNode(),
      (x, y) => {
        scrollRef.current?.scrollTo({y: y, animated : true})
      },
  )};
  
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
      ><ScrollView ref={scrollRef}>
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
            <Text
              tx='todayWScreen:reuseTodoBtn'
              preset="formLabel"
              style={themed($reuseLastTodoBtn)}
              onPress={handleReuseTodo}
            />
            { reuseTodoComment ? 
              <Text
                tx='todayWScreen:reuseTodoComment'
                preset="default"
              /> : null
            }
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
            <Text
              text={t(`dailyQuestion:${myStatusStore.todayQuestion}`)}
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
            <Text
              text={t('todayWScreen:explainAlarm')}
            />
            <View style={{flexDirection:'row'}}>
              <Button 
                tx="todayWScreen:addAlarmBtn"
                onPress={handleOpenAlarmModal}
                style={themed($alarmAddBtnLeft)}
              />
              <Button 
                tx="todayWScreen:reuseAlarmBtn"
                onPress={handleReuseAlarmModal}
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
              tx="todayWScreen:qCaution"
              preset="subheading"
            />
            <TextField
              readOnly
              ref={cautionRef}
              scrollEnabled={false}
              containerStyle={themed($inactiveTextField)}
              multiline={true}
              value={theme.isDark ? t('todayWScreen:Caution') : `${t('todayWScreen:Caution')} `}
            />
            <Button
              tx="todayWScreen:cautionOk"
              onPress={()=>{handleQuickStart()}}
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
                style={{width : '100%', height : '100%'}}
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

          <Modal 
            visible={preAlarmModalVisible} 
            transparent={true} 
            animationType="slide"
          >
            <View style={themed($GeneralModal)}>
              <View style={themed($GeneralModalHeader)}>
                <Button 
                  tx="common:cancel" 
                  onPress={()=>{setPreAlarmModalVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
                  style={themed($GeneralModalBtn)}
                  textStyle={themed($GeneralModalBtnTx)}
                />
                <Button 
                  tx="common:ok" 
                  onPress={handleReuseAlarm} 
                  style={themed($GeneralModalBtn)}
                  textStyle={themed($GeneralModalBtnTx)}
                />
              </View>
              <View style={themed($GeneralPickerContainer)}>
                <Picker 
                  selectedValue={preAlarmPickString} 
                  onValueChange={setPreAlarmPickString}
                  style={themed($preAlarmPicker)}
                  itemStyle = {themed($pickerText)}
                  dropdownIconColor={theme.colors.palette.neutral900}
                >
                  {preAlarms.length > 0 ?
                    preAlarms.map(
                      alarms => (<Picker.Item key={alarms[0]} label={`${t(alarms[1])}: ${alarms.slice(2).join(", ")}`} value={`${alarms[0]}@${alarms.slice(2).join(", ")}`} />)
                    )
                  : null
                  }
                </Picker>
              </View>
              <View style={[themed($GeneralPickerContainer), $bottomContainerInsets]}>
                <Text
                  tx="todayWScreen:explainPreAlarmUse"
                  style={{fontSize : spacing.sm, marginHorizontal : spacing.sm,}}
                />
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
  backgroundColor: colors.tabBackground
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

const $reuseLastTodoBtn: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor : colors.palette.neutral200,
  margin: spacing.xs,
  borderRadius: spacing.lg,
  alignSelf : 'flex-start',
  textAlign : 'center',
  paddingHorizontal : spacing.md,
  paddingVertical : spacing.xxs,
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

const $preAlarmPicker: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  minWidth : '95%',
  marginBottom : spacing.xxxl,
  color : colors.palette.neutral900,
})

const $pickerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.neutral900,
})

const $instructionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xxxl*2,
  marginBottom : spacing.sm,
})

const $instructionImgView: ThemedStyle<ViewStyle> = ({}) => ({
  width : '100%',
})

const $instructionNormalText: ThemedStyle<TextStyle> = ({}) => ({
  marginBottom : spacing.xxxl,
})

const $instructionBoldText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color : colors.palette.delight100,
  fontWeight : 'bold',
})

const $cautionCheckedBtn: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.delight100,
  fontSize : spacing.md,
})

const $cautionUncheckedBtn: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color : colors.palette.neutral500,
  fontSize : spacing.md,
})
