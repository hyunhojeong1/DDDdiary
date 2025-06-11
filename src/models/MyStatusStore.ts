import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { load, save } from "@/utils/storage"
import { getCurrentDate } from "@/utils/getCurrentDate"
import { formatDate } from "@/utils/formatDate"
import { MyDiaryModel } from "./MyDiary"
import { changeTimetoFCMTopic, changeTimetoNumber, changeTimetoUTC } from "@/utils/changeTimes"
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from "@react-native-firebase/functions"
import { getMessaging } from '@react-native-firebase/messaging';
import { enUS } from "date-fns/locale"
import { getCrashlytics, log, recordError } from "@react-native-firebase/crashlytics"

const messaging = getMessaging();
const crashlytics = getCrashlytics();


export const MyStatusStoreModel = types
  .model("MyStatusStore")
  .props({
    guid: "",
    nickname: "",
    randomId: "", // Ex: e23j4k
    userCLang: "en",
    timeZoneMinutes : types.optional(types.number, 0), //offset Ex. -345
    timeZone : "",
    userDAlarm : "12:00 PM",
    userDAlarmZone : "",
    userDAlarmOn : types.optional(types.boolean, false),
    userDAlarmLastTopic : "",
    todayISODate : "",
    todayNDate : types.optional(types.number, 0),
    past14NDate : types.optional(types.number, 0),
    todayProcess : types.optional(types.boolean, false),
    todayAlarmLastTopic : types.optional(types.array(types.string),<string[]>[]), // Ex. [20250504745, ..]
    myDiaries: types.map(MyDiaryModel),
    todayQuestion : "",
    fcmToken : "",
    admobOn : types.optional(types.boolean, false),
    somethingChanged : false,
  })
  .actions(withSetPropAction)
  .actions((store) => ({
    modelOneDiary(fulldate : number, contents : object) {
      store.myDiaries.set(fulldate.toString(), contents);
    },
    unModelOneDiary(diaryNDate : number) {
      store.myDiaries.delete(diaryNDate.toString());
    },
    async dateRenewal() {
      const { dateISO, fulldate, past14Date, currentTimeZone, currentTimeZoneMinutes } = getCurrentDate();
      store.setProp("todayISODate", dateISO);
      store.setProp("todayNDate", fulldate);
      store.setProp("past14NDate", past14Date);
      if(store.timeZone !== currentTimeZone) {
        try{  // function 실패 시 다음에 다시 try
          const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub');
          await ffFunction({
            hubType : "timezone",
            nickrandom : "dolko100000",
            todayprocess : true,
            friends : [],
            timezoneminute : currentTimeZoneMinutes
          });
          store.setProp("timeZone", currentTimeZone);
          store.setProp("timeZoneMinutes", currentTimeZoneMinutes);
        } catch(e) {
          log(crashlytics, 'Firebase - dateRenewal Error');
        }
      }
    },
    setNickname(value : string) {
      store.setProp("nickname", value.replace(/ /g, ""));
    },
    setTodayQuestion() {
      const questionPick = store.todayNDate%100 + (Math.floor((store.todayNDate/100))%100)%3*31;
      store.setProp("todayQuestion", `q${questionPick}`);
    },
    setTodayProcess() {
      if(store.myDiaries.has(store.todayNDate.toString())) { // 날짜 변경 시 안정성
        store.setProp("todayProcess",true);
      } else {store.setProp("todayProcess",false);}
    },
  }))
  .views((store) => ({
    dateOfficial(dateISO : string, dateNumber : number) {
      try {
        const formatPattern =
          store.userCLang === "ko" || store.userCLang === "ja" || store.userCLang === "zh" ? "yyyy.MM.dd" : "dd MMM, yyyy";
          if(store.myDiaries.get(store.todayNDate.toString())?.diaryNDate === dateNumber) {
            return "Today";
          } else {
            const formatted = formatDate(dateISO, formatPattern, {locale : enUS});
            return formatted;
          }
        } catch {
        return "";
      }
    },
    async joinOrErrorInfo() {
      const regex = /^[\p{L}0-9]+$/u;
      const newRandomId = (Math.random().toString(36).substring(2)+Math.random().toString(36).substring(2)+Math.random().toString(36).substring(2)).substring(1,7);
      const firstChar = store.nickname.charAt(0);
      if (store.nickname === "") return 'appStartScreen:needNick';
      if (store.nickname.length < 5) return 'appStartScreen:needNick';
      if (store.nickname.length > 15) return 'appStartScreen:needNick';
      if (/^\d$/.test(firstChar)) return 'appStartScreen:needNoNumberFirst';
      if(!regex.test(store.nickname)) return 'appStartScreen:noSpecialSpace';
      if (newRandomId.length !== 6) return 'appStartScreen:errorInfo';
      
      store.setProp("randomId", newRandomId);
      const nickRandomId = `${store.nickname}${store.randomId}`;
      const auth = getAuth();
      const { currentTimeZone, currentTimeZoneMinutes } = getCurrentDate();
      
      if(auth.currentUser?.uid){
        try{
          store.setProp("guid", auth.currentUser.uid);
          const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub');
          await ffFunction({
            hubType : "join",
            nickrandom : nickRandomId,
            todayprocess : store.todayProcess, //닉넴 초기화 시 현재 정보 필요
            friends : [],
            timezoneminute : currentTimeZoneMinutes
          });
          store.setProp("timeZone", currentTimeZone);
          store.setProp("userDAlarmZone", currentTimeZone); // 앱 최초 시작 시 필요
          store.setProp("timeZoneMinutes", currentTimeZoneMinutes);
          return "ok";
        } catch (e) {
          log(crashlytics, 'Firebase - Join Error');
          recordError(crashlytics, e as Error);
          return 'appStartScreen:errorInfo';
        }
      } else return 'appStartScreen:errorInfo';
    },
    get lastUsedAlarm() {
      const values = Array.from(store.myDiaries.values())
        .filter((value)=> value.alarms.length !== 0 && value.diaryNDate !== store.todayNDate)
        .sort((a,b)=> b.diaryNDate - a.diaryNDate);
      if(values.length !== 0){
        return values[0].alarms;
      } else {
        return [];
      }
    },
    // dateRenewal 사전처리 필요
    async saveWithFeedback() {
      const response = await save("myStatus", store);
      if(response) {
        return true;
      } else {
        return false;
      }
    },
    async saveMyStatus() {
      await store.dateRenewal();
      await save("myStatus", store);
    },
    async saveTodayDiary(alarms : string[], shareCheck : boolean) {
      await store.dateRenewal();
      const sortedAlarms = alarms.filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber);
      let numAlarms : number[] = [];
      numAlarms = sortedAlarms.map((value)=> {
        return changeTimetoUTC(changeTimetoNumber(value).timeNumber);
      });
      if(!shareCheck) {numAlarms = [];}

      let stringAlarms : string[] = [];
      stringAlarms = sortedAlarms.map((value) => {
        return changeTimetoFCMTopic(changeTimetoNumber(value).timeNumber);
      });

      const newAddTopics = stringAlarms.filter(alarm => !store.todayAlarmLastTopic.includes(alarm));
      const needDeleteTopics = store.todayAlarmLastTopic.filter(alarm => !stringAlarms.includes(alarm));
      const needReserveTopics = store.todayAlarmLastTopic.filter(alarm => stringAlarms.includes(alarm));

      try{
        const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM');
        const resultBooly = await ffFunction({
          hubType : "startDiary",
          todayprocess : true,
          todayalarms : numAlarms,
          fcmToken : store.fcmToken,
          newTopics : newAddTopics, // 이미 구독한 알람은 제외하고 전달
          lastTopics : needDeleteTopics, // 새알람 제외한 기존 구독 알람을 제거
        });
        if(resultBooly.data) {
          store.setProp("todayAlarmLastTopic", [...needReserveTopics, ...newAddTopics]);
          const response = await save("myStatus", store);
          if(response) { return true; }
          else { return false; }
        } else {
          return false;
        }
      } catch (e) {
        log(crashlytics, 'Firebase - saveToday or subscribeFCM Error');
        recordError(crashlytics, e as Error);
        throw e;
      }
    },
  }))
  .actions((store) => ({
    async resetNickname() {
      store.setProp("nickname", "");
      store.setProp("randomId","");
      return await store.saveWithFeedback();
    },
    async removeOneDiary(diaryNDate : number) {
      if(diaryNDate === store.todayNDate){
        try{
          const needDeleteTopics = [...store.todayAlarmLastTopic];
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM');
          const resultBooly = await ffFunction({
            hubType : "removeDiary",
            todayprocess : false,
            todayalarms : [],
            fcmToken : store.fcmToken,
            newTopics : [],
            lastTopics : needDeleteTopics, // array 형태 MST tree 추적 유의
          });
          if(resultBooly.data) {
            store.unModelOneDiary(diaryNDate);
            store.setProp("todayAlarmLastTopic", []);
            const response = await save("myStatus", store);
            if(response) { return true; }
            else { return false; }
          } else {
            return false;
          }
        } catch (e) {
          log(crashlytics, 'Firebase - removeToday or unSubcribeFCM Error');
          recordError(crashlytics, e as Error);
          throw e;
        }
      } else {
        store.unModelOneDiary(diaryNDate);
        store.saveMyStatus();
        return true;
      }
    },
    async setRefresh() {
      await store.dateRenewal();
      store.setProp("somethingChanged", false); // 무조건 todayprocess 앞순서. 12시 취소 시작
      store.setTodayProcess();
      store.setTodayQuestion();
      store.saveMyStatus();
    },
    async toggleUserDAlarm(value : boolean) {
      await store.dateRenewal();
      store.setProp("userDAlarmZone", store.timeZone);
      if(value) {
        const numDAlarm = changeTimetoUTC(changeTimetoNumber(store.userDAlarm).timeNumber);
        const fcmTopic = `daily${numDAlarm.toString()}`; 
        let lastTopic : string[] = [];
        if(store.userDAlarmLastTopic !== "") {lastTopic = [store.userDAlarmLastTopic];}
        try {
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM');
          const resultBooly = await ffFunction({
            hubType : "dailyAlarmOn",
            todayprocess : true,
            todayalarms : [],
            fcmToken : store.fcmToken,
            newTopics : [fcmTopic],
            lastTopics : lastTopic,
          });
          if(resultBooly.data) {
            store.setProp("userDAlarmLastTopic", fcmTopic);
            store.setProp("userDAlarmOn",value);
            return true;
          } else {
            return false;
          }
        } catch (e) {
          log(crashlytics, 'Firebase - toggleDailyAlarmOn Error');
          recordError(crashlytics, e as Error);
          return false;
        }
      } else {
        try {
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM');
          const resultBooly = await ffFunction({
            hubType : "dailyAlarmOff",
            todayprocess : true,
            todayalarms : [],
            fcmToken : store.fcmToken,
            newTopics : [],
            lastTopics : [store.userDAlarmLastTopic],
          });
          if(resultBooly.data) {
            store.setProp("userDAlarmLastTopic", "");
            store.setProp("userDAlarmOn",value);
            return true;
          } else {
            return false;
          }
        } catch (e) {
          log(crashlytics, 'Firebase - toggleDailyAlarmOff Error');
          recordError(crashlytics, e as Error);
          return false;
        }
      }
    },
    async fetchMystatus() {
      const response = await load<MyStatusStore>("myStatus");
      if(response && response.randomId && response.nickname) {
        store.setProp("guid", response.guid);
        store.setProp("nickname",response.nickname);
        store.setProp("randomId", response.randomId);
        store.setProp("userCLang", response.userCLang);
        store.setProp("userDAlarm", response.userDAlarm);
        store.setProp("userDAlarmOn", response.userDAlarmOn);
        store.setProp("userDAlarmLastTopic", response.userDAlarmLastTopic);
        store.setProp("timeZone", response.timeZone);
        store.setProp("timeZoneMinutes", response.timeZoneMinutes);
        store.setProp("userDAlarmZone", response.userDAlarmZone);
        store.setProp("todayAlarmLastTopic", response.todayAlarmLastTopic);
        store.setProp("fcmToken", response.fcmToken);
        store.setProp("admobOn", response.admobOn);
        await store.dateRenewal();
        store.setTodayProcess();
        store.setTodayQuestion();
        Object.entries(response.myDiaries).forEach(([key, value]) => {
            store.modelOneDiary(Number(key),value);
        });
        Array.from(store.myDiaries.keys())
          .filter((key)=> Number(key) < store.past14NDate)
          .map((key)=> store.unModelOneDiary(Number(key)));

        return await store.saveWithFeedback();
      } else {
        store.setProp("guid", getAuth().currentUser?.uid); //앱 최초 가입시 guid가 없으면 함수에러 취약
        return false;
      }
    },
    async unsubscribeFCMDefault() {
      if(store.somethingChanged || store.todayProcess || store.todayAlarmLastTopic.length === 0) return;
      try {
        const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM');
        const resultBooly = await ffFunction({
          hubType : "defaultUnsubscribe",
          todayprocess : true,
          todayalarms : [],
          fcmToken : store.fcmToken,
          newTopics : [],
          lastTopics : [],
        });
        
        if(!resultBooly.data) {
          return;
        }
        const topicsArray = [...store.todayAlarmLastTopic];
        for(const topic of topicsArray) {
          if(store.somethingChanged || store.todayProcess) {
            break;
          }
          messaging.unsubscribeFromTopic(topic);
          const filtered = store.todayAlarmLastTopic.filter(item => item !== topic);
          store.setProp("todayAlarmLastTopic", filtered);
          store.saveWithFeedback();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        log(crashlytics, 'Firebase - unSubscribeFCMByDefault Error');
        recordError(crashlytics, e as Error);
      }
    },
    async resetInitialReady() {
      try{
        const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub');
        await ffFunction({
          hubType : "initialReady",
          nickrandom : "dolko100000",
          todayprocess : true,
          friends : [],
          timezoneminute : 0
        });
        if (!store.admobOn) {
          const ffFunction2 = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffFetchAdmobOn');
          const resultBooly = await ffFunction2();
          store.setProp("admobOn", resultBooly.data);
        }
      } catch (e) {
        log(crashlytics, 'Firebase - resetInitialReady Error');
        recordError(crashlytics, e as Error);
      }
    },
  }))


export interface MyStatusStore extends Instance<typeof MyStatusStoreModel> {}
export interface MyStatusStoreSnapshot extends SnapshotOut<typeof MyStatusStoreModel> {}


