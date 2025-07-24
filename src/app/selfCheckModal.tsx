import { Text, TextField } from '@/components';
import { useStores } from '@/models';
import { useAppTheme } from '@/utils/useAppTheme';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
	ViewStyle,
	TextStyle,
	Platform,
	Linking,
	Image,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { spacing, ThemedStyle } from '@/theme';
import { observer } from 'mobx-react-lite';
import { changeTimetoNumber } from '@/utils/changeTimes';
import { getCurrentDate } from '@/utils/getCurrentDate';
import * as Haptics from 'expo-haptics';

type SelfAssessmentModalProps = {
	visible : boolean
}

const settingIcon = require("../../assets/images/settings_icon_Google.png");
const settingIconDark = require("../../assets/images/settings_icon_Google_dark.png");
const digitalWIcon = require("../../assets/images/digitalWell_icon_Google.png");
const digitalWIconDark = require("../../assets/images/digitalWell_icon_Google_dark.png");
const screenTIcon = require("../../assets/images/screentime_icon_Google.png");
const screenTIconDark = require("../../assets/images/screentime_icon_Google_dark.png");

export default observer(function SelfAssessmentModal({visible} : SelfAssessmentModalProps) {
	const { theme, themed } = useAppTheme();
	const { myStatusStore } = useStores();
	const {t} = useTranslation();

	// 스크린타임
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [typeError, setTypeError] = useState('');
	const [screenInfo, setScreenInfo] = useState(false);

	// 셀프체크
	const [lalastTime, setLalastTime] = useState("");
	const [lastTime, setLastTime] = useState("");
	const [selectedNumber, setSelectedNumber] = useState(5);
	const [point1Time, setPoint1Time] = useState(5);
	const [point0Time, setPoint0Time] = useState(10);


	useEffect(()=> {
		const response = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString());
      if (response) {
        const nowAlarms = [...response.alarms];
        if (nowAlarms.length > 0) {
					const sortedAlarms = nowAlarms.filter(alarm => changeTimetoNumber(alarm).timeNumber <= getCurrentDate().currentTimeNumber)
					  .sort((a,b) => changeTimetoNumber(b).timeNumber - changeTimetoNumber(a).timeNumber);
					const index0Alarm = sortedAlarms[0];
					if(sortedAlarms.length === 1) {
						setLalastTime(t('selfCheckModal:todayStart'));
						setLastTime(index0Alarm);
					} else if(sortedAlarms.length > 1) {
						let index1Alarm = sortedAlarms[1];
						if(myStatusStore.lastSelfCheckTime !== "" && index1Alarm) {
							if (changeTimetoNumber(index1Alarm).timeNumber < changeTimetoNumber(myStatusStore.lastSelfCheckTime).timeNumber) {
								index1Alarm = myStatusStore.lastSelfCheckTime;
							}
						}
						setLalastTime(index1Alarm);
						setLastTime(index0Alarm);
						const timeGap = changeTimetoNumber(index0Alarm).timeNumber - changeTimetoNumber(index1Alarm).timeNumber;
						if(timeGap < 45 || timeGap === 55 || timeGap === 70 ) {
							setPoint1Time(0);
							setPoint0Time(0);
						} else if (timeGap === 45 || (timeGap >= 85 && timeGap < 200)) {
							setPoint1Time(5);
							setPoint0Time(10);
						} else if (timeGap >= 200 && timeGap < 300) {
							setPoint1Time(10);
							setPoint0Time(20);
						} else if (timeGap >= 300) {
							setPoint1Time(12);
							setPoint0Time(25);
						}
					} else {
						setLalastTime("");
						setLastTime("");
					}
				}
			}
	}, [myStatusStore.needSelfCheck, myStatusStore.fetchedNextAlarm]);

  const handleScreenTimeSubmit = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		let h = parseInt(hours, 10);
		let m = parseInt(minutes, 10);
		if(hours === "") {h = 0}
		if(minutes === "") {m = 0}
    if (
			isNaN(h) ||
			isNaN(m) ||
      h >= 24 ||
      h < 0 ||
      m >= 60 ||
      m < 0 ||
			(h === 0 && m === 0)
    ) {
      setTypeError(t('selfCheckModal:needCorrectTime'));
      return;
    }
    setTypeError('');
    const totalTime = h * 60 + m;
		const screen7Weeks = [...myStatusStore.screenTime7Weeks];
		screen7Weeks[6] = totalTime;
		const newArr = [...screen7Weeks];
		myStatusStore.setProp("screenTime7Weeks", newArr);
		myStatusStore.setProp("needScreenTime", false);
		myStatusStore.saveWithFeedback();
  };

	const handleScoring = async (points : number) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		let nowScore = myStatusStore.selfCheckScoreWeek;
		nowScore = nowScore + points + 10;
		if (nowScore < 0) {nowScore = 0;}
		myStatusStore.setProp("selfCheckScoreWeek", nowScore);
		myStatusStore.setProp("lastSelfCheckTime", lastTime);
		myStatusStore.setProp("androidYesFNAT", true);
		await new Promise(resolve => setTimeout(resolve, 300));
		myStatusStore.setProp("needSelfCheck", false);
		myStatusStore.saveWithFeedback();
	};

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={themed($overlay)}>
        <View style={themed($container)}>
					<ScrollView style={{padding : 10,}}>
						<Text 
							style={themed($title)}
							tx='selfCheckModal:selfCheckTitle'
						/>
						{myStatusStore.needScreenTime ?
							<View>
								<Text style={themed($askScreenTime)}>
									{t('selfCheckModal:askScreenTime')}
									<Text onPress={()=> setScreenInfo(prev => !prev)}>
										<AntDesign name="questioncircleo" style={themed($askScreenTime)}/>
									</Text>
								</Text>
								{ screenInfo && Platform.OS === "ios" ? 
									<View style={{marginVertical : spacing.xl,}}>
										<Text>
											{t('selfCheckModal:explainIosScreen1')}
											(<Image source={theme.isDark ? settingIconDark : settingIcon} style={{width : spacing.lg, height : spacing.lg}} />)
											{t('selfCheckModal:explainIosScreen2')}
											(<Image source={theme.isDark ? screenTIconDark : screenTIcon} style={{width : spacing.lg, height : spacing.lg}} />)
											{t('selfCheckModal:explainIosScreen3')}
										</Text>
										<Text
											tx='selfCheckModal:goToSetting'
											style={themed($goSettingText)}
											onPress={()=> {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
												Linking.openURL('App-prefs:root');
											}}
										/>
										<Text 
											tx='selfCheckModal:explainIosScreen4'
										/>
									</View>
								: 
									screenInfo && Platform.OS === "android" ?
									<View style={{marginVertical : spacing.xl,}}>
										<Text>
											{t('selfCheckModal:explainAndScreen1')}
											(<Image source={theme.isDark ? settingIconDark : settingIcon} style={{width : spacing.lg, height : spacing.lg}} />)
											{t('selfCheckModal:explainAndScreen2')}
											(<Image source={theme.isDark ? digitalWIconDark : digitalWIcon} style={{width : spacing.lg, height : spacing.lg}} />)
											{t('selfCheckModal:explainAndScreen3')}
										</Text>
										<Text
											tx='selfCheckModal:goToSetting'
											style={themed($goSettingText)}
											onPress={()=> {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
												Linking.sendIntent('android.settings.SETTINGS')
											}}
										/>
										<Text 
											tx='selfCheckModal:explainAndScreen4'
										/>
									</View>
								: null
								}
								<View style={themed($screenTimeFrame)}>
									<TextField
										inputWrapperStyle={themed($screenTimeInput)}
										style={themed($screenTimeLabel)}
										value={hours}
										onChangeText={setHours}
										keyboardType="numeric"
										maxFontSizeMultiplier={1.4}
										multiline={false}
										maxLength={2}
									/>
									<Text 
										style={themed($screenTimeLabel)}
										tx='selfCheckModal:time'
									/>
									<TextField
										inputWrapperStyle={themed($screenTimeInput)}
										style={themed($screenTimeLabel)}
										value={minutes}
										onChangeText={setMinutes}
										keyboardType="numeric"
										maxFontSizeMultiplier={1.4}
										multiline={false}
										maxLength={2}
									/>
									<Text
										style={themed($screenTimeLabel)}
										tx='selfCheckModal:minute'
									/>
									<TouchableOpacity
										style={themed($submitBtn)}
										onPress={handleScreenTimeSubmit}
									>
										<Text
											style={themed($submitBtnText)}
											tx='selfCheckModal:save'
										/>
									</TouchableOpacity>
								</View>
							</View>
						: null
						}

						{typeError ? (
							<Text style={themed($typeErrorText)}>{typeError}</Text>
						) : null}

						<View style={themed($alarmTimeContainer)}>
							<Text>
								{ myStatusStore.userCLang !== "ko" && myStatusStore.userCLang !== "ja" ?
									<Text
										tx='selfCheckModal:from'
										preset='formLabel'
									/>
								: null}
								<Text
									style={themed($alarmTimeText)} 
									text={lalastTime}
								/>
								{ myStatusStore.userCLang === "ko" || myStatusStore.userCLang === "ja" ?
								<Text
									tx='selfCheckModal:from'
									preset='formLabel'
								/>
								: null}
							</Text>
							<Text>
								{ myStatusStore.userCLang !== "ko" && myStatusStore.userCLang !== "ja" ?
									<Text
										tx='selfCheckModal:to'
										preset='formLabel'
									/>
								: null}
								<Text
									style={themed($alarmTimeText)}
									text={lastTime}
								/>
								{ myStatusStore.userCLang === "ko" || myStatusStore.userCLang === "ja" ?
									<Text 
										tx='selfCheckModal:to'
										preset='formLabel'
									/>
								: null}
							</Text>
							<Text 
								style={themed($askScreenTime)}
								tx="selfCheckModal:askHowManyTimes"
							/>
						</View>

						<TouchableOpacity
							key={0}
							style={themed($selectCard)}
							onPress={() => {
								setSelectedNumber(0);
								handleScoring(-10);
							}}
						>
							<View style={themed($cardLayout)}>
								<Text style={themed($cardLabelText)}>
									{t('selfCheckModal:timesMore4')}
									{selectedNumber === 0 ? 
										<AntDesign name="checkcircle" style={themed($checkCircle)} /> 
									: null }
								</Text>
								<Text style={themed($cardPointsTextMinus)}>
									-10 P
								</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity
							key={1}
							style={themed($selectCard)}
							onPress={() => {
								setSelectedNumber(1);
								handleScoring(-5);
							}}
						>
							<View style={themed($cardLayout)}>
								<Text style={themed($cardLabelText)}>
									{t('selfCheckModal:times2or3')}
									{selectedNumber === 1 ?
										<AntDesign name="checkcircle" style={themed($checkCircle)} /> 
									: null }
								</Text>
								<Text style={themed($cardPointsTextMinus)}>
									-5 P
								</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity
							key={2}
							style={themed($selectCard)}
							onPress={() => {
								setSelectedNumber(2);
								handleScoring(point1Time);
							}}
						>
							<View style={themed($cardLayout)}>
								<Text style={themed($cardLabelText)}>
									{t('selfCheckModal:times1')}
									{selectedNumber === 2 ? 
										<AntDesign name="checkcircle" style={themed($checkCircle)} /> 
									: null }
								</Text>
								<Text 
									style={themed($cardPointsText)}
									text={`+${point1Time} P`}
								/>
							</View>
						</TouchableOpacity>

						<TouchableOpacity
							key={3}
							style={themed($selectCard)}
							onPress={() => {
								setSelectedNumber(3);
								handleScoring(point0Time);
							}}
						>
							<View style={themed($cardLayout)}>
								<Text style={themed($cardLabelText)}>
									{t('selfCheckModal:times0')}
									{selectedNumber === 3 ? 
										<AntDesign name="checkcircle" style={themed($checkCircle)} /> 
									: null }
								</Text>
								<Text 
									style={themed($cardPointsText)}
									text={`+${point0Time} P`}
								/>
							</View>
						</TouchableOpacity>

						<View style={themed($selectCardLastOne)}>
							<View style={themed($cardLayout)}>
								<Text 
									style={themed($cardLabelText)}
									tx='selfCheckModal:skip'
								/>
								<Text style={themed($cardPointsTextMinus)}>
									-10 P
								</Text>
							</View>
						</View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const $overlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
	flex: 1,
	backgroundColor: 'rgba(0,0,0,0.6)',
	justifyContent: 'center',
	alignItems: 'center',
})

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	width: '95%',
	height: '85%',
	backgroundColor: colors.tabBackground,
	borderRadius: spacing.md,
	padding: spacing.xxxs,
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
	fontSize: spacing.lg,
	lineHeight : spacing.xl,
	fontWeight: 'bold',
	marginVertical : spacing.md,
	textAlign: 'center',
})

const $askScreenTime: ThemedStyle<TextStyle> = ({ spacing }) => ({
	fontSize : spacing.md,
	marginTop : spacing.lg,
	textAlign : 'center',
})

const $goSettingText: ThemedStyle<TextStyle> = ({ colors }) => ({
	color : colors.palette.delight100,
	textDecorationLine : 'underline',
})

const $screenTimeFrame: ThemedStyle<ViewStyle> = ({ spacing }) => ({
	flexDirection : 'row',
	alignItems : 'center',
	justifyContent : 'center',
	marginVertical : spacing.md,
})

const $screenTimeInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	width : spacing.xxl,
	marginLeft : spacing.xs,
	backgroundColor : colors.tabBackground,
})

const $screenTimeLabel: ThemedStyle<TextStyle> = ({ spacing }) => ({
	fontSize: spacing.md,
	marginHorizontal : spacing.xxxs,
	textAlign : 'center',
})

const $submitBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	backgroundColor: colors.tabBackground,
	marginLeft : spacing.sm,
	alignItems: 'center',
})

const $submitBtnText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
	color: colors.palette.delight100,
	fontSize: spacing.md,
})

const $typeErrorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
	color: colors.palette.angry500,
	marginBottom: spacing.xl,
	fontSize : spacing.md,
})

const $alarmTimeContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
	minHeight : 250,
	alignItems : 'center', 
	justifyContent :'center', 
	marginVertical : spacing.xs,
})

const $alarmTimeText: ThemedStyle<TextStyle> = ({ spacing }) => ({
	fontWeight : 'bold',
	fontSize : spacing.lg,
	lineHeight : spacing.xxl,
})

const $selectCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	backgroundColor: colors.tabBackground,
	borderWidth : 1,
	borderColor : colors.palette.neutral400,
	borderRadius : spacing.xl,
	padding : spacing.md,
	marginBottom : spacing.lg,
})

const $selectCardLastOne: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	backgroundColor: colors.tabBackground,
	borderWidth : 1,
	borderColor : colors.palette.neutral400,
	borderRadius : spacing.xl,
	padding : spacing.md,
	marginBottom : spacing.xxxl*2,
})

const $cardLayout: ThemedStyle<ViewStyle> = ({}) => ({
	flexDirection: 'row',
	alignItems: 'center',
	justifyContent: 'space-between',
})

const $cardLabelText: ThemedStyle<TextStyle> = ({ spacing }) => ({
	fontSize: spacing.md,
	lineHeight : spacing.xl,
	fontWeight : 'bold',
})

const $cardPointsTextMinus: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
	fontSize: spacing.md,
	lineHeight : spacing.xl,
	color: colors.palette.angry500,
	fontWeight : 'bold',
})

const $cardPointsText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
	fontSize: spacing.md,
	lineHeight : spacing.xl,
	color: colors.palette.delight100,
	fontWeight : 'bold',
})

const $checkCircle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
	fontSize: spacing.md,
	color : colors.palette.delight100,
})

