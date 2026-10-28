/** Mutable frame input avoids React renders while moving a thumb or mouse. */
export const input = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0 };
export function clearInput() {
  input.moveX = 0;
  input.moveZ = 0;
  input.lookX = 0;
  input.lookY = 0;
}
