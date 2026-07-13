import { renderEmergency, renderFillBlank, renderSequence, renderSingleChoice, renderTrueFalse, updateCommonActivity } from "./common.js";

export function renderActivity(ctx) {
  if (ctx.activity.type === "true-false") return renderTrueFalse(ctx);
  if (ctx.activity.type === "sequence") return renderSequence(ctx);
  if (ctx.activity.type === "fill-blank") return renderFillBlank(ctx);
  if (ctx.activity.type === "emergency") return renderEmergency(ctx);
  return renderSingleChoice(ctx);
}

export function updateActivity(ctx) {
  updateCommonActivity(ctx);
}
