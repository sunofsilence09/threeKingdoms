export type Weather = 'sunny' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';
/** Direction the wind blows toward, rather than the direction it comes from. */
export type WindDirection = 'calm' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface BattleEnvironment { month: number; weather: Weather; windDirection: WindDirection; windStrength: 0 | 1 | 2 }
export interface FireTile { x: number; y: number; level: 1 | 2 | 3; remainingRounds: number; sourceId: string }
export const WEATHER_NAMES: Record<Weather, string> = { sunny: '晴', cloudy: '阴', fog: '雾', rain: '小雨', storm: '暴雨', snow: '雪' };
export const WEATHER_MULTIPLIER: Record<Weather, number> = { sunny: 1, cloudy: .9, fog: .8, rain: .5, storm: .15, snow: .35 };
export const EXTINGUISH_CHANCE: Record<Weather, number> = { sunny: .1, cloudy: .2, fog: .25, rain: .55, storm: .9, snow: .7 };
export const WIND_VECTORS: Record<WindDirection, { x: number; y: number }> = {
  calm: { x: 0, y: 0 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 }, se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 }, nw: { x: -1, y: -1 },
};
export const WIND_NAMES: Record<WindDirection, string> = { calm: '静', n: '北', ne: '东北', e: '东', se: '东南', s: '南', sw: '西南', w: '西', nw: '西北' };
export const OPPOSITE_WIND: Record<WindDirection, WindDirection> = { calm: 'calm', n: 's', ne: 'sw', e: 'w', se: 'nw', s: 'n', sw: 'ne', w: 'e', nw: 'se' };
export const DEFAULT_ENVIRONMENT: BattleEnvironment = { month: 3, weather: 'sunny', windDirection: 'calm', windStrength: 0 };

export function nextRandom(seed: number): { seed: number; roll: number } {
  let next = seed || 1;
  next ^= next << 13; next ^= next >>> 17; next ^= next << 5; next >>>= 0;
  return { seed: next, roll: next / 0x100000000 };
}
export function seasonalWeather(month: number, roll: number): Weather {
  const weights: [Weather, number][] = month === 12 || month <= 2
    ? [['sunny', 25], ['cloudy', 25], ['fog', 10], ['rain', 10], ['storm', 5], ['snow', 25]]
    : month >= 6 && month <= 8 ? [['sunny', 25], ['cloudy', 20], ['fog', 10], ['rain', 30], ['storm', 15]]
    : [['sunny', 40], ['cloudy', 30], ['fog', 15], ['rain', 12], ['storm', 3]];
  let value = roll * 100;
  for (const [weather, weight] of weights) { value -= weight; if (value < 0) return weather; }
  return weights[weights.length - 1][0];
}
export function randomWind(directionRoll: number, strengthRoll: number): Pick<BattleEnvironment, 'windDirection' | 'windStrength'> {
  const directions = Object.keys(WIND_VECTORS) as WindDirection[];
  const windDirection = directions[Math.min(8, Math.floor(directionRoll * 9))];
  return { windDirection, windStrength: windDirection === 'calm' ? 0 : strengthRoll < .65 ? 1 : 2 };
}
export function createEnvironment(month = 3, seed = 1): BattleEnvironment {
  month = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 3;
  const weather = nextRandom(seed), direction = nextRandom(weather.seed), strength = nextRandom(direction.seed);
  return { month, weather: seasonalWeather(month, weather.roll), ...randomWind(direction.roll, strength.roll) };
}
export const createBattleEnvironment = createEnvironment;
