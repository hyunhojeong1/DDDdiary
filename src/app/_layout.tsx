import { useEffect, useRef, useState } from "react"
import { Slot, SplashScreen} from "expo-router"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { useInitialRootStore} from "@/models"
import { initI18n } from "@/i18n"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { useThemeProvider } from "@/utils/useAppTheme"
import { ErrorBoundary } from "./_layout"
import 'react-native-reanimated'
import 'react-native-gesture-handler'
import { getAuth, onAuthStateChanged, signInAnonymously } from '@react-native-firebase/auth';
// import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';
// import {getTrackingPermissionsAsync, PermissionStatus, requestTrackingPermissionsAsync} from 'expo-tracking-transparency';
import { getCrashlytics, log, recordError } from "@react-native-firebase/crashlytics"
import getAppCheck, { initializeAppCheck } from "@react-native-firebase/app-check";
import { getApp } from "@react-native-firebase/app"
import { checkInternetConnection } from "@/utils/network"
import { Alert } from "react-native"
import { PaperProvider } from "react-native-paper"


SplashScreen.preventAutoHideAsync();


if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("src/devtools/ReactotronConfig.ts")
  console.log("__DEV__ :", __DEV__);
}

const app = getApp();
const appCheck = getAppCheck(app);

export { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary"

export default function Root() {
  // Wait for stores to load and render our layout inside of it so we have access
  // to auth info etc
  const { rehydrated } = useInitialRootStore();

  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const { themeScheme, setThemeContextOverride, ThemeProvider } = useThemeProvider();
  const [retryInternetCheck, setRetryInternetCheck] = useState(false);
  const [isInternetReady, setIsInternetReady] = useState(false);

  //adMob
  // const isMobileAdsStartCalledRef = useRef(false);
  

  useEffect(()=> {
    handleInternetCheck();
  },[retryInternetCheck]);

  const handleInternetCheck = async() => {
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert('Please Check Internet Connection!','인터넷 연결, 网, ネット',
        [{ text: 'OK', onPress: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setRetryInternetCheck((prev)=> !prev);
        }}]
      );
    } else {
      setIsInternetReady(true);
    }
  };

  useEffect(()=>{
    const rnfbProvider = appCheck.newReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity'
      },
      apple: {
        provider: __DEV__ ? 'debug': 'appAttestWithDeviceCheckFallback'
      },
    });

    initializeAppCheck(app, {
      provider : rnfbProvider,
      isTokenAutoRefreshEnabled : true
    });
  },[retryInternetCheck]);

  // useEffect(() => {
  //   AdsConsent.gatherConsent()
  //     .then(startGoogleMobileAdsSDK)
  //     .catch((error) => {
  //         const crashlytics = getCrashlytics();
  //         log(crashlytics, 'Admob Consent Error');
  //         recordError(crashlytics, error as Error);
  //       });
  //   startGoogleMobileAdsSDK();
  // }, [retryInternetCheck]);
   
  // async function startGoogleMobileAdsSDK() {
  //   const {canRequestAds} = await AdsConsent.getConsentInfo();
  //   if (!canRequestAds || isMobileAdsStartCalledRef.current) {
  //     return;
  //   }
  //   isMobileAdsStartCalledRef.current = true;
  //   const gdprApplies = await AdsConsent.getGdprApplies();
  //   const hasConsentForPurposeOne = gdprApplies && (await AdsConsent.getPurposeConsents()).startsWith("1");
  //   if (!gdprApplies || hasConsentForPurposeOne) {
  //     const { status } = await getTrackingPermissionsAsync();
  //     if (status === PermissionStatus.UNDETERMINED) {
  //       await requestTrackingPermissionsAsync();
  //     }
  //   }
  //   await mobileAds().setRequestConfiguration({
  //     maxAdContentRating : MaxAdContentRating.T,
  //     tagForChildDirectedTreatment : false,
  //     tagForUnderAgeOfConsent : false,
  //     testDeviceIdentifiers : ['EMULATOR'],
  //   });
  //   mobileAds().initialize();
  // }

  useEffect(()=> {
    const auth = getAuth();
    const unSubscriber = onAuthStateChanged(auth, (user)=> {
      if(!user) {
        handleSignInAnonymously();
      }
    });
    return unSubscriber;
  },[retryInternetCheck])

  async function handleSignInAnonymously() {
    try {
      const auth = getAuth();
      await signInAnonymously(auth);
    } catch (error) {
      const crashlytics = getCrashlytics();
      log(crashlytics, 'Anonymous Login Error');
      recordError(crashlytics, error as Error);
      throw error;
    }
  };

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const loaded = isI18nInitialized && rehydrated && isInternetReady;


  if (!loaded) {
    return null
  }


  return (
      <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
          <KeyboardProvider>
            <ErrorBoundary catchErrors="always">
              <PaperProvider>
                <Slot />
              </PaperProvider>
            </ErrorBoundary>
          </KeyboardProvider>
      </ThemeProvider>
  )
}

