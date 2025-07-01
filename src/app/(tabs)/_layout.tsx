import { useStores } from '@/models';
import { ThemedStyle } from '@/theme';
import { getCurrentDate } from '@/utils/getCurrentDate';
import { useAppTheme } from '@/utils/useAppTheme'
import { SplashScreen, Tabs, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewStyle, AppState } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { getMessaging } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';

let isListenerRegistered = false;
const messaging = getMessaging();

export default function TabLayout() {
  const {themed} = useAppTheme();
  const { t, i18n } = useTranslation();
  const { myStatusStore } = useStores();
  const router = useRouter();
  const lastRefreshDateRef = useRef<number>(0);

  useEffect(()=>{
    fetchStatus();
    lastRefreshDateRef.current = getCurrentDate().fulldate;
    myStatusStore.setProp("somethingChanged", false);
  },[]);

  const fetchStatus = async () => {
    const idCheck = await myStatusStore.fetchMystatus();
    if(idCheck) {
      i18n.changeLanguage(myStatusStore.userCLang);
      SplashScreen.hideAsync();
      myStatusStore.resetInitialReady();
      handleGetFCMToken();
      return;
    } else {
      router.push('/appstarting');
      SplashScreen.hideAsync();
    }
  };

  const handleGetFCMToken = async () => { //appStart 토큰 발급 실패 시 백업
    if(myStatusStore.fcmToken === ""){
      const token = await messaging.getToken();
      myStatusStore.setProp("fcmToken", token);
    }
  };

  useEffect(()=> { // 초기 회원가입보다 후순위로 배치
    handleNotifee();
  },[]);

  const handleNotifee = async() => {
    await notifee.createChannel({
      id: 'notif2NextReuse',
      name: 'notif2NextReuse',
      importance: AndroidImportance.HIGH,
    });

    await notifee.setNotificationCategories([
      {
        id: 'reply',
        actions: [
          {
            id: 'reply',
            title: 'Reply',
            input: {
              placeholderText: t('tabs:iosAskReply'),
              buttonText: t('tabs:iosReplyBtn'),
            },
          },
        ],
      },
    ]);
  };

  useEffect(()=>{
    if(isListenerRegistered) return;
    isListenerRegistered = true;
    const subscription = AppState.addEventListener("change", (state)=>{
      if(state === "active") {
        checkIfNewDay();
        Notifications.setBadgeCountAsync(0);
      }
      if(state === "background") {
        // handleNextAlarmFCM();
        handleNextAlarmNotifee();
      }
    });
    return () => {
      subscription.remove();
      isListenerRegistered = false;
    }
  },[]);

  const checkIfNewDay = () => {
    const today = getCurrentDate().fulldate;
    if(lastRefreshDateRef.current !== today) {
      lastRefreshDateRef.current = today;
      myStatusStore.setRefresh();
    } else {
      handleAddingTask();
    }
  };

  // const handleNextAlarmFCM = async () => { 방식 변경 - notifee로 대체
  //   if(AppState.currentState === "active") return; // active 되기 전 잠깐 background로 인식하는 문제 개선
  //   if(myStatusStore.todayProcess) {
  //     const response = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString());
  //     if (response) {
  //       const nowAlarms = [...response.alarms];
  //       if (nowAlarms.length > 0) {
  //         myStatusStore.fetchNextAlarmFCM(nowAlarms);
  //       } else {
  //         myStatusStore.setProp("fetchedNextAlarm", "");
  //         myStatusStore.saveMyStatus();
  //       }
  //     }
  //   }
  // };

  const handleNextAlarmNotifee = async () => {
    if(AppState.currentState === "active") return; // active 되기 전 잠깐 background로 인식하는 문제 개선
    if(!myStatusStore.todayProcess) return;

    const resultAlarmTime = await myStatusStore.fetchNextAlarmTime();
    let todoList = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text1 ?? "";
    if(resultAlarmTime !== "noMoreAlarm") {
      await notifee.displayNotification({
        title: `${t('tabs:notifeeNextAlarm')}${resultAlarmTime}`,
        body: `${t('tabs:notifeeMyTodo')}${todoList}`,
        ios: {
          categoryId: 'reply',
        },
        android: {
          channelId: 'notif2NextReuse',
          smallIcon: 'notification_icon',
          actions: [
            {
              title: `${t('tabs:replyReuseTask')}`,
              pressAction: { id: 'reply' },
              input: {
                allowFreeFormInput: true,
                placeholder: `${t('tabs:askReuseTask')}`,
              },
            },
          ],
        },
      });
    }
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle : themed($tabs),
      }}
    >
      <Tabs.Screen 
        name="(pasttab)" 
        options={{
          tabBarIcon : ({color})=>(<FontAwesome name="backward" size={22} color={color} />),
          tabBarLabel : t('tabs:pastdiary'),
        }}
      />
      <Tabs.Screen 
        name="(todaytab)" 
        options={{
          tabBarIcon : ({color})=>(<FontAwesome name="play" size={22} color={color}/>),
          tabBarLabel : t('tabs:todaydiary'),
        }}
      />
      <Tabs.Screen 
        name="friends" 
        options={{
          tabBarIcon : ({color})=> (<Octicons name="people" size={25} color={color} />),
          tabBarLabel : t('tabs:friends'),
        }}
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          tabBarIcon : ({color})=> (<Octicons name="gear" size={25} color={color} />),
          tabBarLabel : t('tabs:settings'),
        }}
      />
    </Tabs>
  )
}

const $tabs: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
})
