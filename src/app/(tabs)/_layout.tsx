import { useStores } from '@/models';
import { ThemedStyle } from '@/theme';
import { getCurrentDate } from '@/utils/getCurrentDate';
import { useAppTheme } from '@/utils/useAppTheme'
import { SplashScreen, Tabs, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewStyle, AppState} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { getMessaging } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';
import { changeTimetoNumber } from '@/utils/changeTimes';
import MobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';
import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics';
import { getTrackingPermissionsAsync, PermissionStatus, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';



let isListenerRegistered = false;
const messaging = getMessaging();


export default function TabLayout() {
  const {themed} = useAppTheme();
  const { t, i18n } = useTranslation();
  const { myStatusStore } = useStores();
  const router = useRouter();
  const lastRefreshDateRef = useRef<number>(0);

  //adMob
  const isMobileAdsStartCalledRef = useRef(false);

  useEffect(()=>{
    fetchStatus();
    lastRefreshDateRef.current = getCurrentDate().fulldate;
    myStatusStore.setProp("somethingChanged", false);
    // console.log("현재 저장 현황: ", myStatusStore.selfCheckScore7Weeks, myStatusStore.selfCheckScoreWeek, myStatusStore.screenTime7Weeks, myStatusStore.androidYesFNAT);
  },[]);

  const fetchStatus = async () => {
    const idCheck = await myStatusStore.fetchMystatus();
    if(idCheck) {
      i18n.changeLanguage(myStatusStore.userCLang);
      SplashScreen.hideAsync();
      myStatusStore.resetInitialReady();
      handleGetFCMToken(); // 가입화면 토큰 발급 실패 시 백업
      handleNotifee();
      handleAddingTask(); // 앱 종료 후 시작 시 bg리스너가 동작하지 않음. 여기 필요
      handleSelfCheck();
      return;
    } else {
      router.push('/appstarting');
      SplashScreen.hideAsync();
    }
  };

  const handleGetFCMToken = async () => {
    if(myStatusStore.fcmToken === ""){
      const token = await messaging.getToken();
      myStatusStore.setProp("fcmToken", token);
    }
  };

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
    if(isListenerRegistered || myStatusStore.randomId === "") return; // 최초가입시 돌려보내기
    isListenerRegistered = true;
    const subscription = AppState.addEventListener("change", (state)=>{
      if(state === "active") {
        checkIfNewDay();
        Notifications.setBadgeCountAsync(0);
      }
      if(state === "background") {
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
      handleSelfCheck();
    }
  };

  const handleNextAlarmNotifee = async () => {
    if(!myStatusStore.todayProcess) return;
    const resultAlarmTime = await myStatusStore.fetchNextAlarmTime();
    let todoList = myStatusStore.myDiaries.get(myStatusStore.todayNDate.toString())?.text1 ?? "";
    if(resultAlarmTime !== "noMoreAlarm") {
      if(AppState.currentState !== "background") return;
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

  const handleSelfCheck = () => {
    if (!myStatusStore.todayProcess) {
      myStatusStore.setProp("needSelfCheck", false);
      return;
    }
    if (myStatusStore.fetchedNextAlarm === "") return; // 필수
    if (getCurrentDate().currentTimeNumber >= changeTimetoNumber(myStatusStore.fetchedNextAlarm).timeNumber) {
      myStatusStore.preSelfCheck();
    }
  };

  useEffect(() => {
    if(myStatusStore.randomId === "") return; // 최초가입시 돌려보내기
    AdsConsent.gatherConsent()
      .then(startGoogleMobileAdsSDK)
      .catch((error) => {
          const crashlytics = getCrashlytics();
          log(crashlytics, 'Admob Consent Error');
          recordError(crashlytics, error as Error);
        });
    startGoogleMobileAdsSDK();
  }, []);
   
  async function startGoogleMobileAdsSDK() {
    const {canRequestAds} = await AdsConsent.getConsentInfo();
    if (!canRequestAds || isMobileAdsStartCalledRef.current) {
      return;
    }
    isMobileAdsStartCalledRef.current = true;
    const gdprApplies = await AdsConsent.getGdprApplies();
    const hasConsentForPurposeOne = gdprApplies && (await AdsConsent.getPurposeConsents()).startsWith("1");
    if (!gdprApplies || hasConsentForPurposeOne) {
      const { status } = await getTrackingPermissionsAsync();
      if (status === PermissionStatus.UNDETERMINED) {
        await requestTrackingPermissionsAsync();
      }
    }
    await MobileAds().setRequestConfiguration({
      maxAdContentRating : MaxAdContentRating.T,
      tagForChildDirectedTreatment : false,
      tagForUnderAgeOfConsent : false,
      testDeviceIdentifiers : ['EMULATOR'],
    });
    MobileAds().initialize();
  }

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
