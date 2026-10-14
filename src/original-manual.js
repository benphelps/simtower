export const MANUAL_INDEX={
  'Animation':'options','Balance':'finance','Basements':'parking','Bomb':'bomb','Bulldozer':'bulldozer-finger',
  'Calendar':'info-bar','Cars':'elevator-types','Cathedral':'cathedral-treasure','Clinic':'medical-security',
  'Cockroaches':'housekeeping','Condominiums':'condos','Construction':'placement','Customers':'commercial-demand',
  'Departure delay':'elevator-regulation','Edit window':'edit-window','Effects':'options','Elevators':'elevator-types',
  'Evaluation':'inspection','Express to Bottom':'elevator-programs','Express to Top':'elevator-programs',
  'Fast Mode':'options','Finance':'finance','Find Person':'find','Find Tenant':'find','Finger':'bulldozer-finger',
  'Fire':'fire','Floors':'lobbies-floors','Food':'food-shops','Help':'about-manual','Hotel map':'map-modes',
  'Hotels':'hotels','Housekeeping':'housekeeping','Income':'finance','Info Bar':'info-bar','Lease':'offices',
  'Lobby':'lobbies-floors','Local program':'elevator-programs','Maintenance':'finance','Map':'map-modes',
  'Medical':'medical-security','Metro':'metro','Movie theatre':'cinema','Names':'find','New game':'getting-started',
  'Noise':'condos','Offices':'offices','Open':'files','Parking':'parking','Party hall':'party-halls',
  'Pause':'pause','People':'options','Population':'ratings','Pricing':'map-modes','Quarter':'info-bar',
  'Ramps':'parking','Recycling':'recycling','Rename':'find','Rent':'offices','Restaurant':'food-shops',
  'Retail':'food-shops','Save':'files','Security':'medical-security','SECOM':'medical-security','Show':'elevator-preview',
  'Simulate':'elevator-preview','Single rooms':'hotels','Sky lobby':'lobbies-floors','Sound':'options',
  'Stairs':'stairs-escalators','Stars':'ratings','Stress':'stress','Suites':'hotels','Time':'info-bar',
  'Tool Bar':'placement','Tower':'ratings','Treasure':'cathedral-treasure','Twin rooms':'hotels',
  'VIP':'vip','Waiting floors':'elevator-regulation','Weekend':'info-bar','Worship':'cathedral-treasure',
};
export const normalizeManualText=text=>String(text).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function manualSearch(entries,query,limit=12) {
  const terms=normalizeManualText(query).split(' ').filter(Boolean);if(!terms.length)return [];
  return entries.map(entry=>{
    const title=normalizeManualText(entry.title),text=normalizeManualText(entry.text);
    if(!terms.every(term=>(title+' '+text).includes(term)))return null;
    const score=terms.reduce((n,term)=>n+Number(title.includes(term))*10+Number(title===term)*20,0);
    const position=Math.max(0,entry.text.toLowerCase().indexOf(terms[0])-60);
    return {...entry,score,snippet:entry.text.slice(position,position+190).trim()};
  }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,limit);
}
