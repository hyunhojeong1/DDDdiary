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
import AsyncStorage from "@react-native-async-storage/async-storage"

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
    todayDayInWeek : "",
    todayProcess : types.optional(types.boolean, false),
    todayAlarmLastTopic : types.optional(types.array(types.string),<string[]>[]), // Ex. [20250504745, ..]
    myDiaries: types.map(MyDiaryModel),
    todayQuestion : "",
    fcmToken : "",
    admobOn : types.optional(types.boolean, false),
    somethingChanged : false,
    fetchedNextAlarm : "",
    selfCheckScore7Weeks : types.optional(types.array(types.number),<number[]>[0,0,0,0,0,0,0]),
    selfCheckScoreWeek : types.optional(types.number, 0),
    needSelfCheck : false,
    lastSelfCheckTime : "",
    androidYesFNAT : false, // 안드로이드에서 일기 시작이나, 평가 완료(시간 변경) 후에만 다음 시간 불러오기를 허가하는 스위치
    screenTime7Weeks : types.optional(types.array(types.number),<number[]>[0,0,0,0,0,0,0]),
    needScreenTime : false,
    lastRecordWeek : types.optional(types.number, 0),
    fullfillCheckDate : types.optional(types.number, 0), // 0으로 바꾸는 식으로 쓰면 안 됨.
    fullfillCheckAlarms : 0,
  })
  .actions(withSetPropAction)
  .actions((store) => ({
    modelOneDiary(fulldate : number, contents : object) {
      store.myDiaries.set(fulldate.toString(), contents);
    },
    unModelOneDiary(diaryNDate : number) {
      store.myDiaries.delete(diaryNDate.toString());
    },
    async dateRenewal() { // 여기서 save mystatus는 지양한다.
      const { dateISO, fulldate, past14Date, currentTimeZone, currentTimeZoneMinutes, weekday } = getCurrentDate();
      store.setProp("todayISODate", dateISO);
      store.setProp("todayNDate", fulldate);
      store.setProp("past14NDate", past14Date);
      store.setProp("todayDayInWeek", weekday);
      if(store.timeZone !== currentTimeZone) {
        try{
          const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
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
          const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
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
    get preUsedTodoList() {
      const values = Array.from(store.myDiaries.values())
        .filter((value)=> value.text1.length > 2 && value.diaryNDate !== store.todayNDate)
        .sort((a,b)=> b.diaryNDate - a.diaryNDate);
      let lastTodoText1 = "";
      if(values.length !== 0){
        lastTodoText1 = values[0].text1;
      }
      return {lastTodoText1};
    },
    get preUsedAlarms() {
      const values = Array.from(store.myDiaries.values())
        .filter((value)=> value.alarms.length !== 0 && value.diaryNDate !== store.todayNDate)
        .sort((a,b)=> b.diaryNDate - a.diaryNDate);
      if(values.length !== 0){
        const preAlarms = values.map((value)=> {
          return [value.diaryNDate.toString(), `common:${value.dayInWeek}`, ...value.alarms];
        })
        return preAlarms;
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
    async saveTodayDiary(alarms : string[], shareCheck : boolean, text2 : string) {
      await store.dateRenewal();
      const sortedAlarms = alarms.filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber);
      let numAlarms : number[] = [];
      numAlarms = sortedAlarms.map((value)=> {
        return changeTimetoUTC(changeTimetoNumber(value).timeNumber);
      });
      let todayQAnswer = text2;
      if(!shareCheck) {
        numAlarms = [];
      }

      let stringAlarms : string[] = [];
      stringAlarms = sortedAlarms.map((value) => {
        return changeTimetoFCMTopic(changeTimetoNumber(value).timeNumber);
      });

      const newAddTopics = stringAlarms.filter(alarm => !store.todayAlarmLastTopic.includes(alarm));
      const needDeleteTopics = store.todayAlarmLastTopic.filter(alarm => !stringAlarms.includes(alarm));
      const needReserveTopics = store.todayAlarmLastTopic.filter(alarm => stringAlarms.includes(alarm));

      try{
        const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM2nd');
        const resultBooly = await ffFunction({
          hubType : "startDiary",
          todayprocess : true,
          todayalarms : numAlarms,
          todayQAnswer : todayQAnswer,
          fcmToken : store.fcmToken,
          newTopics : newAddTopics, // 이미 구독한 알람은 제외하고 전달
          lastTopics : needDeleteTopics, // 새알람 제외한 기존 구독 알람을 제거
        });
        if(resultBooly.data) {
          store.setProp("todayAlarmLastTopic", [...needReserveTopics, ...newAddTopics]);
          store.setProp("androidYesFNAT", true);

          if(store.todayNDate !== store.fullfillCheckDate) {
            store.setProp("fullfillCheckDate", store.todayNDate); // 이후 당일엔 절대 바꿀 수 없다.
            store.setProp("fetchedNextAlarm", "");
            store.setProp("lastSelfCheckTime", ""); // 필수로 if문 안쪽(점수 정확성)
            store.setProp("needSelfCheck", false);

            let nowScore = store.selfCheckScoreWeek;
            nowScore = nowScore - 10*(store.fullfillCheckAlarms);
            if (nowScore < 0) {nowScore = 0;}

            if(numAlarms.length === 0) {
              nowScore = nowScore + 70;
            } else {
              nowScore = nowScore + 100;
            }
            store.setProp("selfCheckScoreWeek", nowScore);
          }
          return true;
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
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM2nd');
          const resultBooly = await ffFunction({
            hubType : "removeDiary",
            todayprocess : false,
            todayalarms : [],
            todayQAnswer: "",
            fcmToken : store.fcmToken,
            newTopics : [],
            lastTopics : needDeleteTopics, // array 형태 MST tree 추적 유의
          });
          if(resultBooly.data) {
            store.unModelOneDiary(diaryNDate);
            store.setProp("todayAlarmLastTopic", []);
            store.setProp("androidYesFNAT" , false);
            store.setProp("fullfillCheckAlarms", 0);

            let nowScore = store.selfCheckScoreWeek;
            if (store.lastSelfCheckTime === "") {
              nowScore = nowScore - 50;
              if (nowScore < 0) {nowScore = 0;}
            }
            store.setProp("selfCheckScoreWeek", nowScore);
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
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM2nd');
          const resultBooly = await ffFunction({
            hubType : "dailyAlarmOn",
            todayprocess : true,
            todayalarms : [],
            todayQAnswer: "",
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
          const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM2nd');
          const resultBooly = await ffFunction({
            hubType : "dailyAlarmOff",
            todayprocess : true,
            todayalarms : [],
            todayQAnswer: "",
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
        store.setProp("fetchedNextAlarm", response.fetchedNextAlarm);
        store.setProp("selfCheckScore7Weeks", response.selfCheckScore7Weeks);
        store.setProp("selfCheckScoreWeek", response.selfCheckScoreWeek);
        store.setProp("needSelfCheck", response.needSelfCheck);
        store.setProp("lastSelfCheckTime", response.lastSelfCheckTime);
        store.setProp("androidYesFNAT", response.androidYesFNAT);
        store.setProp("screenTime7Weeks", response.screenTime7Weeks);
        store.setProp("needScreenTime", response.needScreenTime);
        store.setProp("lastRecordWeek", response.lastRecordWeek);
        store.setProp("fullfillCheckDate", response.fullfillCheckDate);
        store.setProp("fullfillCheckAlarms", response.fullfillCheckAlarms);
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
        const ffFunction = httpsCallable<unknown, boolean>(getFunctions(undefined, "asia-northeast3"), 'ffSubscribeFCM2nd');
        const resultBooly = await ffFunction({
          hubType : "defaultUnsubscribe",
          todayprocess : true,
          todayalarms : [],
          todayQAnswer: "",
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
        const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
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
    async modelAndSaveOneDiary(fulldate : number, contents : object) {
      store.myDiaries.set(fulldate.toString(), contents);
      await save("myStatus", store);
    },
    async fetchNextAlarmTime() { // 백그라운드 전환 시에만 발동 업뎃하는 것. 포어그라운드에서 다음 알람 정보를 원할땐 이 Prop을 사용하면 안된다.
      const response = store.myDiaries.get(store.todayNDate.toString());
      if (response) {
        const nowAlarms = [...response.alarms];
        if (nowAlarms.length > 0) {
          const sortedAlarms = nowAlarms.filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber);
          store.setProp("fullfillCheckAlarms", sortedAlarms.length);
          if (sortedAlarms.length === 0) {
            store.setProp("fetchedNextAlarm", "");
            await save("myStatus", store);
            return "noMoreAlarm";
          } else if (sortedAlarms[0] !== store.fetchedNextAlarm) {
            if (!store.androidYesFNAT) {
              return "noMoreAlarm";
            }
            store.setProp("androidYesFNAT", !store.androidYesFNAT);
            store.setProp("fetchedNextAlarm", sortedAlarms[0]);
            await save("myStatus", store);
            return sortedAlarms[0];
          } else if (sortedAlarms[0] === store.fetchedNextAlarm) {
            return sortedAlarms[0];
          }
        }
      }
      store.setProp("fetchedNextAlarm", "");
      await save("myStatus", store);
      return "noMoreAlarm";
    },
    async addingReuseTimeTask(newTask : string) {
      const response = store.myDiaries.get(store.todayNDate.toString());
      if(response) {
        let newText3 = `${""}${response.text3}`;
        newText3 = `${newText3}\n${newTask}`;
        const contents = {
          diaryNDate : response.diaryNDate,
          diaryISODate : response.diaryISODate,
          text1 : response.text1,
          text2 : response.text2,
          text3 : newText3,
          shareCheck : response.shareCheck,
          cautionCheck : response.cautionCheck,
          dailyQuestion : response.dailyQuestion,
          alarms : [...response.alarms], // MST 추적 끊기
          alarmsZone : response.alarmsZone,
          dayInWeek : response.dayInWeek,
        };
        store.modelOneDiary(response.diaryNDate, contents);
        if(store.todayProcess) { // 수정 중 아닐 때만 값 저장, 충돌 방지 목적
          await save("myStatus", store);
        }
      }
      await AsyncStorage.removeItem('@lockscreen_reply');
    },
    async preSelfCheck() {
      const response = store.myDiaries.get(store.todayNDate.toString());
      if (response) {
        const nowAlarms = [...response.alarms];
        if (nowAlarms.length > 0) {
          const sortedAlarms = nowAlarms.filter(alarm => changeTimetoNumber(alarm).timeNumber <= getCurrentDate().currentTimeNumber
            && changeTimetoNumber(alarm).timeNumber >= changeTimetoNumber(store.fetchedNextAlarm).timeNumber);

          if(sortedAlarms.length > 0) {
            const nowDate = new Date();
            const lastWeekMonday = new Date(nowDate);
            const thisWeekMonday = new Date(nowDate);
            const weekdayIndex = nowDate.getDay();
            if (weekdayIndex > 0) {
              const gapBetweenMonday  = weekdayIndex - 1;
              lastWeekMonday.setDate(lastWeekMonday.getDate()-7-gapBetweenMonday);
              thisWeekMonday.setDate(thisWeekMonday.getDate()-gapBetweenMonday);
              const lastMondayFulldate = 10000*(lastWeekMonday.getFullYear()-2000) + 100*(lastWeekMonday.getMonth()+1) + lastWeekMonday.getDate();
              const thisMondayFulldate = 10000*(thisWeekMonday.getFullYear()-2000) + 100*(thisWeekMonday.getMonth()+1) + thisWeekMonday.getDate();

              if(store.lastRecordWeek <= lastMondayFulldate) {
                store.setProp("needScreenTime", true);
                const screen7Weeks = [...store.screenTime7Weeks];
                const newArrScreen = screen7Weeks.slice(1);
                const newArrScreen2 = [...newArrScreen, 0];
                store.setProp("screenTime7Weeks", newArrScreen2);

                const score7Weeks = [...store.selfCheckScore7Weeks];
                const newArr = score7Weeks.slice(1);
                const newArr2 = [...newArr, store.selfCheckScoreWeek];
                store.setProp("selfCheckScore7Weeks", newArr2);
                store.setProp("lastRecordWeek", thisMondayFulldate);
                store.setProp("selfCheckScoreWeek", 0);
              }
            }
            let nowScore = store.selfCheckScoreWeek;
            nowScore = nowScore - 10*sortedAlarms.length;
            if (nowScore < 0) {nowScore = 0;}
            store.setProp("selfCheckScoreWeek", nowScore);
            store.setProp("needSelfCheck", true);
            const sortedAlarms2 = nowAlarms.filter(alarm => changeTimetoNumber(alarm).timeNumber > getCurrentDate().currentTimeNumber)
              .sort((a,b)=> changeTimetoNumber(a).timeNumber - changeTimetoNumber(b).timeNumber);
            if(sortedAlarms2.length > 0) {
              store.setProp("fetchedNextAlarm", sortedAlarms2[0]); // 중복 감점 방지 최신화
            } else if (sortedAlarms2.length === 0) {
              store.setProp("fetchedNextAlarm", "");
            }
            await save("myStatus", store);
          }
        }
      }
    },
  }))


export interface MyStatusStore extends Instance<typeof MyStatusStoreModel> {}
export interface MyStatusStoreSnapshot extends SnapshotOut<typeof MyStatusStoreModel> {}


