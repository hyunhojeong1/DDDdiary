import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"


export const MyFriendModel = types
  .model("MyFriend")
  .props({
    friendNickRandom : "",  //nick-random 순서 지킬것
    friendNickname : "",
    friendRandomId : "",
    myMemo : "",
    friendTodayProcess : types.optional(types.boolean, false),
    friendAlarms : "",
    friendTodayQAnswer : "",
    friendFavorite : types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions((store)=>({
    setFriendNickRandom() {
      store.friendNickRandom = `${store.friendNickname}${store.friendRandomId}`;
    },
    setFriendNickname(value : string) {
      store.friendNickname = value.replace(/ /g, "");
    }
  }))

export interface MyFriend extends Instance<typeof MyFriendModel> {}
export interface MyFriendSnapshotOut extends SnapshotOut<typeof MyFriendModel> {}
export interface MyFriendSnapshotIn extends SnapshotIn<typeof MyFriendModel> {}

