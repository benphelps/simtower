// 0x33673 selects fixed PART limits using only commercial type and0x33710
// weekday/weekend/rain bucket. No adjacent-escalator or shared-room factor.
export const COMMERCIAL_LIMITS = {fastfood:[35,50,25],restaurant:[35,50,25],shop:[25,30,18]};
export function commercialDemandKind(weekend,special=false) {return special?2:weekend?1:0;}
export function commercialOpeningBudget(recommendations,key,weekend,special=false) {
  // 0x32192 takes larger weekday/weekend recommendations on weekends;
  // applies category cap, then its unconditional ten-applicant minimum.
  const kind=commercialDemandKind(weekend,special),limit=COMMERCIAL_LIMITS[key][kind];
  const source=kind===1?Math.max(recommendations[0],recommendations[1]):recommendations[kind];
  return {kind,source,limit,remaining:Math.max(10,Math.min(source,limit))};
}
export function commercialFeedbackBudget(recommendations,key,meanStress,data,star,weekend,special=false) {
  // 0x330BC: the returning OWN patron updates only the selected facility's
  // bucket. External office/condo/show/metro visitors do not recommend here.
  if(meanStress<0)return recommendations;
  const kind=commercialDemandKind(weekend,special),tier=star<3?0:star===3?1:2;
  const amount=meanStress<data.tenantStress.good[tier]?2:meanStress<data.tenantStress.bad[tier]?1:0;
  const next=[...recommendations];next[kind]=Math.min(COMMERCIAL_LIMITS[key][kind],next[kind]+amount);return next;
}
