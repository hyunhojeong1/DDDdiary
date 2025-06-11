import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

export const MyDiaryModel = types
  .model("MyDiary")
  .props({
    diaryNDate : types.optional(types.number, 0),
    diaryISODate : "",
    text1 : "",
    text2 : "",
    text3 : "",
    shareCheck : types.optional(types.boolean, true),
    cautionCheck : types.optional(types.boolean, false),
    dailyQuestion : "",
    alarms : types.optional(types.array(types.string), <string[]>[]),
    alarmsZone : "", 
  })
  .actions(withSetPropAction)

export interface MyDiary extends Instance<typeof MyDiaryModel> {}
export interface MyDiarySnapshotOut extends SnapshotOut<typeof MyDiaryModel> {}
export interface MyDiarySnapshotIn extends SnapshotIn<typeof MyDiaryModel> {}

