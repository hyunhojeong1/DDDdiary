import { Button, Card, EmptyState, Header, ListView, Screen, Text } from "@/components";
import { useStores } from "@/models";
import { spacing, ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { SplashScreen, useRouter } from "expo-router";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, TextStyle, View, ViewStyle } from "react-native";
import Octicons from '@expo/vector-icons/Octicons';
import * as Haptics from 'expo-haptics';
import { checkInternetConnection } from "@/utils/network";
import SelfAssessmentModal from "@/app/selfCheckModal";
import { CartesianChart, Bar, useChartPressState } from "victory-native";
import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";
import roboto from "../../../../assets/fonts/Roboto-Regular.ttf"


SplashScreen.preventAutoHideAsync();

export default observer(function PastDiary() {
  const { theme, themed } = useAppTheme();
  const { myStatusStore } = useStores();
  const { t } = useTranslation();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(true);

  //차트
  const font = useFont(roboto, 12);
  const { state : state1, isActive : isActive1 } = useChartPressState({ x: 0, y: { avgHours: 0 } });
  const { state : state2, isActive : isActive2 } = useChartPressState({ x: 0, y: { scoreSum: 0 } });
  const [activeXItem, setActiveXItem] = useState(-1);
  const [maxScreenTime, setMaxScreenTime] = useState(360);
  const [maxSelfCheckScore, setMaxSelfCheckScore] = useState(1000);
  const [activeXSTime, setActiveXSTime] = useState("");
  const [activeXScore, setActiveXScore] = useState("");

  const DATA = [
    { week: 1, avgHours: myStatusStore.screenTime7Weeks[0] },
    { week: 2, avgHours: myStatusStore.screenTime7Weeks[1] },
    { week: 3, avgHours: myStatusStore.screenTime7Weeks[2] },
    { week: 4, avgHours: myStatusStore.screenTime7Weeks[3] },
    { week: 5, avgHours: myStatusStore.screenTime7Weeks[4] },
    { week: 6, avgHours: myStatusStore.screenTime7Weeks[5] },
    { week: 7, avgHours: myStatusStore.screenTime7Weeks[6] },
  ];

  const DATAScore = [
    { week: 1, scoreSum: myStatusStore.selfCheckScore7Weeks[0]},
    { week: 2, scoreSum: myStatusStore.selfCheckScore7Weeks[1]},
    { week: 3, scoreSum: myStatusStore.selfCheckScore7Weeks[2]},
    { week: 4, scoreSum: myStatusStore.selfCheckScore7Weeks[3]},
    { week: 5, scoreSum: myStatusStore.selfCheckScore7Weeks[4]},
    { week: 6, scoreSum: myStatusStore.selfCheckScore7Weeks[5]},
    { week: 7, scoreSum: myStatusStore.selfCheckScore7Weeks[6]},
  ];

  useEffect(()=> {
    const keyIndex1 = state1.x.value.value-1;
    setActiveXItem(keyIndex1);
    const hour = Math.floor(myStatusStore.screenTime7Weeks[keyIndex1]/60);
    const minute = myStatusStore.screenTime7Weeks[keyIndex1]%60;
    if(hour > -1 || minute > -1) {
      setActiveXSTime(`${hour}h ${minute}m`);
    }
    setActiveXItem(keyIndex1);
    if(myStatusStore.selfCheckScore7Weeks[keyIndex1] > -1) {
      setActiveXScore(`${myStatusStore.selfCheckScore7Weeks[keyIndex1]}Point`);
    } 
  },[isActive1]);

  useEffect(()=> {
    const keyIndex2 = state2.x.value.value-1;
    setActiveXItem(keyIndex2);
    const hour = Math.floor(myStatusStore.screenTime7Weeks[keyIndex2]/60);
    const minute = myStatusStore.screenTime7Weeks[keyIndex2]%60;
    if(hour > -1 || minute > -1) {
      setActiveXSTime(`${hour}h ${minute}m`);
    }
    setActiveXItem(keyIndex2);
    if(myStatusStore.selfCheckScore7Weeks[keyIndex2] > -1) {
      setActiveXScore(`${myStatusStore.selfCheckScore7Weeks[keyIndex2]}Point`);
    }
  },[isActive2]);

  useEffect(()=> {
    const newArr = [...myStatusStore.screenTime7Weeks];
    const newArr2 = [...myStatusStore.selfCheckScore7Weeks];
    const sortedArray = newArr.sort((a,b)=>(b-a));
    if(sortedArray.length > 0) {setMaxScreenTime(sortedArray[0]);}
    const sortedArray2 = newArr2.sort((a,b)=>(b-a));
    if(sortedArray2.length > 0) {setMaxSelfCheckScore(sortedArray2[0]);}
  },[]);

  
  useEffect(()=>{
    handleListUp();
    myStatusStore.unsubscribeFCMDefault();
  },[myStatusStore.todayProcess]);

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
            <View>
              <Text
                style={themed($bigTitle)}
                text={`${myStatusStore.nickname}${t('pastScreen:bigTitle')}`}
              />
              <Text 
                preset="formLabel"
                text={`${t('pastScreen:pastScreenTime')}:\n ${activeXSTime}`}
              />
              <View style={{height : 150,}}>
                <CartesianChart
                  data={DATA}
                  xKey="week"
                  yKeys={["avgHours"]}
                  domain={{y:[0, maxScreenTime]}}
                  domainPadding={{left: spacing.xl, right: spacing.xl, top: spacing.sm,}}
                  axisOptions={{
                    font,
                    labelColor : theme.isDark ? '#fff' : '#000',
                    lineColor : theme.isDark ? '#fff4' : '#0004',
                    formatYLabel(label) {
                      return label.toString();
                    },
                    formatXLabel(value) {
                      return value.toString();
                    },
                    tickCount: {
                      y: 5,
                      x: 7,
                    },
                  }}
                  chartPressState={state1}
                >
                  {({ points, chartBounds }) => {

                    return points.avgHours.map((point, index) => {
                      return (
                        <Bar
                          key={index}
                          barCount={points.avgHours.length}
                          points={[point]}
                          chartBounds={chartBounds}
                          roundedCorners={{ topLeft: 3, topRight: 3, bottomLeft: 3, bottomRight: 3 }}
                          animate={{type:'spring'}}
                          barWidth={
                            index === activeXItem ? spacing.xxl : spacing.lg
                          }
                        >
                          <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, 200)}
                            colors={
                              index === 0 ? ["#FF4D4D", "#FF4D4D30"] :
                              index === 1 ? ["#FF9933", "#FF993330"] :
                              index === 2 ? ["#FFEB3B", "#FFEB3B30"] :
                              index === 3 ? ["#4CAF50", "#4CAF5030"] :
                              index === 4 ? ["#2196F3", "#2196F330"] :
                              index === 5 ? ["#3F51B5", "#3F51B530"] :
                              index === 6 ? ["#BA68C8", "#BA68C830"] :
                              ["#a78bfa", "#a78bfa50"]
                            }
                          />
                        </Bar>
                      );
                    });
                  }}
                </CartesianChart>
              </View>
              <Text
                preset="formHelper"
                tx="pastScreen:weeks"
                style={themed($graphXAxisTitle)}
              />

              <Text 
                preset="formLabel"
                text={`${t('pastScreen:pastDDScore')}:\n ${activeXScore}`}
              />
              <View style={{height : 150}}>
                <CartesianChart
                  data={DATAScore}
                  xKey="week"
                  yKeys={["scoreSum"]}
                  domain={{y:[0, maxSelfCheckScore]}}
                  domainPadding={{left: spacing.xl, right: spacing.xl, top: spacing.sm,}}
                  axisOptions={{
                    font,
                    labelColor : theme.isDark ? '#fff' : '#000',
                    lineColor : theme.isDark ? '#fff4' : '#0004',
                    formatYLabel(label) {
                      return label.toString();
                    },
                    formatXLabel(value) {
                      return value.toString();
                    },
                    tickCount: {
                      y: 5,
                      x: 7,
                    },
                  }}
                  chartPressState={state2}
                >
                  {({ points, chartBounds }) => {

                    return points.scoreSum.map((point, index) => {
                      return (
                        <Bar
                          key={index}
                          barCount={points.scoreSum.length}
                          points={[point]}
                          chartBounds={chartBounds}
                          roundedCorners={{ topLeft: 3, topRight: 3, bottomLeft: 3, bottomRight: 3 }}
                          animate={{type:'spring'}}
                          barWidth={
                            index === activeXItem ? spacing.xxl : spacing.lg
                          }
                        >
                          <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, 200)}
                            colors={
                              index === 0 ? ["#FF4D4D", "#FF4D4D30"] :
                              index === 1 ? ["#FF9933", "#FF993330"] :
                              index === 2 ? ["#FFEB3B", "#FFEB3B30"] :
                              index === 3 ? ["#4CAF50", "#4CAF5030"] :
                              index === 4 ? ["#2196F3", "#2196F330"] :
                              index === 5 ? ["#3F51B5", "#3F51B530"] :
                              index === 6 ? ["#BA68C8", "#BA68C830"] :
                              ["#a78bfa", "#a78bfa50"]
                            }
                          />
                        </Bar>
                      );
                    });
                  }}
                </CartesianChart>
              </View>
              <Text
                preset="formHelper"
                tx="pastScreen:weeks"
                style={themed($graphXAxisTitle)}
              />
            </View>
          }
          renderItem={({item})=>(
            <Card 
              key={item.diaryNDate}
              heading={`${myStatusStore.dateOfficial(item.diaryISODate, item.diaryNDate)} (${t(`common:${item.dayInWeek}`)})`}
              content={item.text1}
              headingStyle={themed($cardHeaderText)}
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
      <SelfAssessmentModal
        visible={myStatusStore.needSelfCheck && myStatusStore.todayProcess}
      />
    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor : colors.tabBackground,
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

const $graphXAxisTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign : 'center', 
  fontSize : spacing.xs,
  marginBottom : spacing.md,
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

