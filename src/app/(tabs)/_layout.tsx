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

  useEffect(()=>{
    if(isListenerRegistered) return;
    isListenerRegistered = true;
    const subscription = AppState.addEventListener("change", (state)=>{
      if(state === "active") {
        checkIfNewDay();
        Notifications.setBadgeCountAsync(0);
      }
      if(state === "background") {
        handleNextAlarmFCM();
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
    }
  };

  const handleNextAlarmFCM = () => {
    if(myStatusStore.todayProcess) {
      const response = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString());
      if (response) {
        const nowAlarms = [...response.alarms];
        if (nowAlarms.length > 0) {
          myStatusStore.fetchNextAlarmFCM(nowAlarms);
        } else {
          myStatusStore.setProp("fetchedNextAlarm", "");
          myStatusStore.saveMyStatus();
        }
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
