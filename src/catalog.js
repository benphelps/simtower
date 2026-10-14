// Economic values come from the executable's YEN resources. Gameplay fields
// below remain explicit reconstruction choices until their callers are mapped.
export const CELL = 8;
export const FLOOR = 36;
const entries = [
  [24, 'lobby', 'Lobby', 'Structure', 1, 4, 0, null, 0],
  [0, 'floor', 'Floor', 'Structure', 1, 4, 0, 5000, 0],
  [1, 'elevator', 'Standard elevator', 'Transport', 1, 4, 0, 1064, 0],
  [22, 'stairs', 'Stairs', 'Transport', 1, 8, 0, 2408, 0],
  [27, 'escalator', 'Escalator', 'Transport', 3, 8, 0, 2728, 0],
  [42, 'express', 'Express elevator', 'Transport', 3, 6, 0, 3944, 0],
  [43, 'service', 'Service elevator', 'Transport', 2, 4, 0, 3816, 0],
  [7, 'office', 'Office', 'Work & living', 1, 9, 6, 1448, 0],
  [9, 'condo', 'Condominium', 'Work & living', 1, 16, 3, 1576, 0],
  [3, 'single', 'Single hotel room', 'Hotel', 2, 4, 1, 1192, 0],
  [4, 'twin', 'Twin hotel room', 'Hotel', 3, 6, 2, 1256, 0],
  [5, 'suite', 'Hotel suite', 'Hotel', 3, 10, 2, 1320, 0],
  [15, 'housekeeping', 'Housekeeping', 'Services', 2, 15, 6, 1960, 0],
  [12, 'fastfood', 'Fast food', 'Shops & leisure', 1, 16, 12, 1768, 0],
  [6, 'restaurant', 'Restaurant', 'Shops & leisure', 3, 24, 16, 1384, 0],
  [10, 'shop', 'Retail shop', 'Shops & leisure', 3, 12, 10, 1640, 0],
  [18, 'cinema', 'Movie theater', 'Shops & leisure', 3, 31, 0, 2152, 0],
  [29, 'partyhall', 'Party hall', 'Shops & leisure', 3, 24, 30, 2856, 0],
  [14, 'security', 'Security office', 'Services', 2, 16, 6, 1896, 0],
  [13, 'medical', 'Medical center', 'Services', 3, 26, 6, 1832, 0],
  [20, 'recycling', 'Recycling center', 'Services', 3, 25, 4, 2280, 0],
  [17, 'secom', 'SECOM center', 'Services', 4, 2, 0, 3880, 0],
  [11, 'parking', 'Parking space', 'Basement', 3, 4, 0, 1704, 0],
  [44, 'ramp', 'Parking ramp', 'Basement', 3, 16, 0, 3816, 0],
  [31, 'metro', 'Metro station', 'Basement', 4, 30, 100, 2984, 0],
  [36, 'cathedral', 'Cathedral', 'Landmark', 5, 28, 100, 3304, 0],
];
export const CATALOG = Object.fromEntries(entries.map(([id, key, name, group, star, width, capacity, sprite, frame]) => [key, { id, key, name, group, star, width, capacity, sprite, frame }]));
export const TRANSPORT = new Set(['elevator', 'express', 'service']);
export const LINKS = new Set(['stairs', 'escalator']);
export const HOTELS = new Set(['single', 'twin', 'suite']);
export const COMMERCIAL = new Set(['fastfood', 'restaurant', 'shop', 'cinema', 'partyhall']);
export const INCOME = new Set(['office', 'condo', ...HOTELS, ...COMMERCIAL]);
export const SITE_CELLS = 375; // 0x274D7: 3000 pixels, eight pixels per cell.
export const BASEMENT_LIMIT = -10;
export const HEIGHTS = { cinema: 2, partyhall: 2, recycling: 2, metro: 3, cathedral: 5 };
export const facilityHeight = key => HEIGHTS[key] || 1;
export const skyLobbyFloor = floor => floor > 0 && (floor + 1) % 15 === 0;
export const elevatorCapacity = key => key === 'express' ? 42 : 21; // 0x390FC / 0x39904 / 0x11D45
export const POPULATION_TYPES = new Set([3,4,5,6,7,9,10,12,18,29]); // 0xD55E rejects service/metro/cathedral types.
export function price(data, key) { return data.cost[CATALOG[key].id] * data.moneyScale; }
export function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
