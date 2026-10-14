// Isolated translations of the recovered economic routines. The dispatcher
// invokes them at original clock events instead of inventing daily sales.
import {signedWord} from './original-actor-stats.js';
export function rentAmount(data, type, tier) {
  // 0x2D2BE: tier 4 explicitly pays zero before indexing the four-column table.
  return tier === 4 ? 0 : (data.rent[type]?.[tier] || 0) * data.moneyScale;
}
export function maintenanceAmount(data, type, count = 1) {
  // 0x2D3E6 (one room) / 0x2D458 (transport cars and flights).
  return (data.maintenance[type] || 0) * data.moneyScale * count;
}
export function businessReceipt(data, type, visits, dayCounter) {
  // 0x2DCD7 / 0x335D1: closing receipts use total visitors, except the two
  // special event dates. 0x323F4 closes at 21:00, 0x324A3 at 23:00.
  if (dayCounter % 60 === 59 || dayCounter % 84 === 83) return 0;
  if (type === 29) return visits > 0 ? 200 * data.moneyScale : 0;
  const rules = data.businessReceipts[type];
  if (!rules) return 0;
  if(type===6||type===12)visits=signedWord(visits); //335D1 compares native WORD withsignedJGE.
  const tier = visits < rules.thresholds[2] ? 3 : visits < rules.thresholds[1] ? 2 : visits < rules.thresholds[0] ? 1 : 0;
  return rules.amounts[tier] * data.moneyScale;
}
export function lobbyMaintenance(data, cells, star) {
  // 0x2D4D4: original calculation truncates internal currency BEFORE scaling.
  const rate = data.lobbyMaintenance[star < 3 ? 0 : star === 3 ? 1 : 2];
  return Math.trunc(cells * rate / 10) * data.moneyScale;
}
// Native COUNT window category order (0xD55E / 0xD5F8).
export const INCOME_TYPES=[7,3,4,5,10,12,6,29,18,9];
export const EXPENSE_TYPES=[24,1,42,43,27,44,20,31,15,14];
export function quarterAccounts(balance) {return {income:Array(11).fill(0),maintenance:Array(11).fill(0),other:0,construction:0,previousBalance:balance};}
export function recordAccount(accounts,amount,type,kind) {
  if(kind==='construction')accounts.construction-=amount;
  else if(kind==='maintenance'){const i=EXPENSE_TYPES.indexOf(type);if(i>=0)accounts.maintenance[i]-=amount;}
  else {const i=INCOME_TYPES.indexOf(type);if(i>=0)accounts.income[i]+=amount;else accounts.other+=amount;}
}
