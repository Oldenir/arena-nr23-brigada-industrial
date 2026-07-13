import { nr23Module } from "./nr23-content.js";
import { firstAidModule } from "./first-aid-content.js";

export const modules = {
  [nr23Module.id]: nr23Module,
  [firstAidModule.id]: firstAidModule
};

export const moduleList = [nr23Module, firstAidModule];

export function getModule(moduleId) {
  return modules[moduleId] || modules.nr23;
}

export function getActivity(moduleId, activityId) {
  return getModule(moduleId).activities.find((activity) => activity.id === activityId) || null;
}

export function allActivities() {
  return moduleList.flatMap((module) => module.activities.map((activity) => ({ ...activity, moduleId: module.id })));
}
