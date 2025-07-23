import { getSnapshot, Instance, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { MyFriendModel } from "./MyFriend"
import { load, save } from "@/utils/storage"
import { delay } from "@/utils/delay"
import { changeTimetoLocal, changeTimetoString } from "@/utils/changeTimes"
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getCrashlytics, log, recordError } from "@react-native-firebase/crashlytics"


type MyFriend = {
  friendNickRandom : string
  friendNickname : string
  friendRandomId : string
  myMemo : string
  friendTodayProcess : boolean
  friendAlarms : string
  friendTodayQAnswer : string
  friendFavorite : boolean
};

type FFfriend = {
  friendnick : string
  friendAlarms : number[]
  friendQAnswer : string
};

const crashlytics = getCrashlytics();

export const MyFriendStoreModel = types
  .model("MyFriendStore")
  .props({
    MyFriends: types.map(MyFriendModel),
    refetchFriends : types.optional(types.boolean, true), // 10초
    isReady : types.optional(types.boolean, true), //false로 하면 최초 가입시 문제
  })
  .actions(withSetPropAction)
  .actions((store) => ({
    getFriendLength() {
      const friendsLength = Array.from(store.MyFriends.keys()).length;
      return friendsLength;
    },
    addANewFriend(nickRandom : string, nickname : string, randomId : string, mymemo : string) {
      store.MyFriends.set(nickRandom, {
        friendNickRandom : nickRandom,
        friendNickname : nickname,
        friendRandomId : randomId,
        myMemo : mymemo,
        friendTodayProcess : false,
        friendAlarms : "",
        friendTodayQAnswer : "",
        friendFavorite : false,
      });
    },
    clearFriends() {
      store.MyFriends.clear();
    },
    unmodelFriend(friendNickRandom : string) { // deleteFriend가 async로 수정되면서 Map.delete 사용 불가하게 변화
      store.MyFriends.delete(friendNickRandom);
    },
    addSortedFriends(sortedFriends : MyFriend[]) {
      sortedFriends.map((value)=> store.MyFriends.set(value.friendNickRandom, value));
    },
    addFriendModel(key : string, model : MyFriend) {
      store.MyFriends.set(key, model);
    },
  }))
  .views((store) => ({
    async fetchMyFriend() {
      const response = await load<MyFriendStore>("myFriends");
      try{
        if (response) {
          Object.keys(response.MyFriends).forEach((key : string)=>{
              const friend = store.MyFriends.get(key);
              if(friend) {
                friend.setProp("friendTodayProcess", false);
                friend.setProp("friendAlarms", "");
                friend.setProp("friendTodayQAnswer", "");
                store.addFriendModel(key,friend);
              }
          });
        }
      } catch(e) {
        log(crashlytics, 'InnerApp Problem : Load Friends Error');
        recordError(crashlytics, e as Error);
      }
      try{
        const ffFunction = httpsCallable<unknown, FFfriend[]>(getFunctions(undefined, "asia-northeast3"), 'ffFetchMyFriend2nd');
        const resultArray = await ffFunction();
        resultArray.data.map((friend)=> {
          const myTodayYesFriend = store.MyFriends.get(friend.friendnick);
          if(myTodayYesFriend) {
            const alarms = friend.friendAlarms.map((time)=> changeTimetoString(changeTimetoLocal(time)) );
            myTodayYesFriend.setProp("friendTodayProcess", true);
            myTodayYesFriend.setProp('friendAlarms', alarms.join(", "));
            myTodayYesFriend.setProp("friendTodayQAnswer", friend.friendQAnswer);
            store.addFriendModel(friend.friendnick, myTodayYesFriend);
          }
        });
      } catch (e) {
        log(crashlytics, 'Firebase - FetchMyFriend Error');
        recordError(crashlytics, e as Error);
      }
    },
    async saveMyFriends() {
      if(store.getFriendLength() > 20 ) {return;}
      const friendsArray = Array.from(store.MyFriends.values());
      const favoriteTrue = friendsArray.filter(friend => friend.friendFavorite);
      const favoriteFalse = friendsArray.filter(friend => !friend.friendFavorite);
      favoriteTrue.sort((a, b) => a.friendNickRandom.localeCompare(b.friendNickRandom));
      favoriteFalse.sort((a, b) => a.friendNickRandom.localeCompare(b.friendNickRandom));

      const sortedFriends = [...favoriteTrue, ...favoriteFalse];
      const plainSSFriends = sortedFriends.map(friend => getSnapshot(friend));
      store.clearFriends();
      store.addSortedFriends(plainSSFriends);
      await save("myFriends", store);
      store.setProp("isReady", true);
    },
  }))
  .actions((store) => ({
    async refreshMyFriends() {
      if(store.refetchFriends){
        await store.fetchMyFriend();
        store.saveMyFriends();
        store.setProp("refetchFriends", false);
        await delay(8000);
        store.setProp("refetchFriends",true);
      }
    },
    async deleteFriend(friendNickRandom : string) {
      const oldFriendsArray = [...Array.from(store.MyFriends.keys())];
      const newFriendsArray = oldFriendsArray.filter(friend => friend !== friendNickRandom);
      const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
      await ffFunction({
        hubType : "friends",
        nickrandom : "dolko100000",
        todayprocess : true,
        friends : newFriendsArray,
        timezoneminute : 0
      });
      store.unmodelFriend(friendNickRandom); // async로 수정 이후 별도 action 필요
      store.saveMyFriends();
    },
    async deleteAllFriends() {
      const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
      await ffFunction({
        hubType : "friends",
        nickrandom : "dolko100000",
        todayprocess : true,
        friends : [],
        timezoneminute : 0
      });
      store.clearFriends();
      store.saveMyFriends();
    },
    toggleFavorite(friendNickRandom : string) {
      const toggledFriend = store.MyFriends.get(friendNickRandom);
      if(toggledFriend){
        if(toggledFriend.friendFavorite){
          toggledFriend.setProp("friendFavorite", false);
        } else {
          toggledFriend.setProp("friendFavorite", true);
        }
        store.MyFriends.set(friendNickRandom, toggledFriend);
      }
      store.saveMyFriends();
    },
    async addFriendOrErrorInfo(nickname : string, randomId : string, mymemo : string) {
      const regex = /^[\p{L}0-9]+$/u;
      const regex2 = /^[a-z0-9]{6}$/;
      const firstChar = nickname.charAt(0);
      if (nickname === "") return "appStartScreen:needNick";
      if (nickname.length < 5) return "appStartScreen:needNick";
      if (nickname.length > 16) return "appStartScreen:needNick";
      if (/^\d$/.test(firstChar)) return 'appStartScreen:needNoNumberFirst';
      if(!regex.test(nickname)) return "appStartScreen:noSpecialSpace";
      if(!regex2.test(randomId)) return "friendScreen:inapproRandomId";
      const nickRandom = `${nickname}${randomId}`;

      if(store.MyFriends.has(nickRandom)){
        const modifiedFriend = store.MyFriends.get(nickRandom);
        if(modifiedFriend){
          modifiedFriend.setProp("myMemo", mymemo);
          store.addFriendModel(nickRandom, modifiedFriend);
        }
      } else {
        if(store.getFriendLength() >= 20) {
          return "friendScreen:noMoreFriend";
        }
        try{
          let newFriendsArray = [nickRandom];
          if(store.getFriendLength() > 0){
            newFriendsArray = [...Array.from(store.MyFriends.keys()), nickRandom];
          }
          const ffFunction = httpsCallable<unknown, void>(getFunctions(undefined, "asia-northeast3"), 'ffSavingHub2nd');
          await ffFunction({
            hubType : "friends",
            nickrandom : "dolko100000",
            todayprocess : true,
            friends : newFriendsArray,
            timezoneminute : 0
          });
          store.addANewFriend(nickRandom, nickname, randomId, mymemo);
        } catch (e) {
          log(crashlytics, 'Firebase - addFriend Error');
          recordError(crashlytics, e as Error);
          throw e;
        }
      }
      await store.saveMyFriends();
      return "ok";
    },
  }))

export interface MyFriendStore extends Instance<typeof MyFriendStoreModel> {}
export interface MyFriendStoreSnapshot extends SnapshotOut<typeof MyFriendStoreModel> {}

