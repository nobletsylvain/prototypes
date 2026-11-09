export function exportFilmSelection(state, packageId = null) {
  const pack = packageId ? state.packages.find(p => p.id === packageId) : null;
  const selected = pack ? state.plates.filter(p => pack.plateIds.includes(p.id)) : state.plates.filter(p => p.location === 'hand');
  return {schema:'thecapital-film-selection/1',origin:'hash-production-v01',packageId:pack?.id ?? null,items:selected.map(p=>({id:p.id,format:p.format,variety:p.variety,contributions:p.contents.map(c=>({...c,harvest:state.lots[c.lotId].harvest,quality:state.lots[c.lotId].quality}))})),finish:{seconds:0.55,style:'brisk',rollConsumable:false},identityPolicy:'preserve-all',transport:'manual-json-export'};
}
