import { constrain } from "./helpers";

it("constrains a value to a minimum or maximum", () => {
  // within range
  expect(constrain(40, 30, 80)).toBe(40);
  // lower than min
  expect(constrain(20, 30, 80)).toBe(30);
  // higher than max
  expect(constrain(200, 30, 80)).toBe(80);
});
