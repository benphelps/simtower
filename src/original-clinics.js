export function clinicPatientCount(clinic, actors) {
  if(clinic.medicalInside!==undefined)return clinic.medicalInside;
  // 0x2C531 increments only successfully admitted actorstate35;2C6B4
  // removes the patient as return travel starts. Waiting66 does not count.
  return actors.filter(actor => actor.job === clinic.id && actor.state === 35 && actor.trip === null).length;
}
export function clinicSprite(clinic, actors, tick) {
  // 0xA63C: any native metadata patient-count gives busyframe0; otherwise
  // daytime idleframe1/night idleframe2. The original sheet has three frames.
  const patients = clinicPatientCount(clinic, actors), frame = patients ? 0 : tick < 1600 ? 1 : 2;
  return { sheet: 1832 + frame, sx: 0, sy: 0, width: 208, height: 24 };
}
export function clinicAdmission(clinic, actors) {
  if (!clinic || clinic.key !== 'medical' || clinic.constructionRemaining) return 'missing';
  return (clinicPatientCount(clinic, actors)<<24>>24) >= 40 ? 'waiting' : 'admitted';
}
