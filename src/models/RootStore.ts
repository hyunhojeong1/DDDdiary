import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { MyStatusStoreModel } from "./MyStatusStore"
import { MyFriendStoreModel } from "./MyFriendStore"

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model("RootStore").props({
  myStatusStore: types.optional(MyStatusStoreModel, {}),
  myFriendStore: types.optional(MyFriendStoreModel, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}

