export type Plot = { id:string; name:string; kind:string; length:number; width:number; rows?:number; columns?:number; zones:string[] };
export function gridSize(plot:Plot) { return {rows:plot.rows ?? 2,columns:plot.columns ?? 2}; }
/** Keep coordinates stable; never silently discard planted cells. */
export function resizePlot(plot:Plot,rows:number,columns:number):Plot {
  if(!Number.isInteger(rows) || !Number.isInteger(columns) || rows<1 || columns<1 || rows>12 || columns>12) throw new Error('Choose 1–12 rows and columns.');
  const old=gridSize(plot);
  if(plot.zones.some((crop,i)=>crop && (Math.floor(i/old.columns)>=rows || i%old.columns>=columns))) throw new Error('Clear or move crops outside the smaller grid before resizing.');
  return {...plot,rows,columns,zones:Array.from({length:rows*columns},(_,i)=>{
    const row=Math.floor(i/columns),col=i%columns;
    return row<old.rows && col<old.columns ? plot.zones[row*old.columns+col] || '' : '';
  })};
}
export const plotKinds=['Raised bed','In-ground bed','Container','Indoor tray'];
export function makePlots(space:string,count:number,length:number,width:number,slots:string[]):Plot[] {
  const kind=space.includes('Pots')?'Container':space.includes('Rows')?'In-ground bed':space.includes('Indoor')?'Indoor tray':'Raised bed';
  return Array.from({length:Math.min(30,Math.max(0,Math.floor(count)))},(_,i)=>({id:`plot-${i+1}`,name:`${kind} ${i+1}`,kind,length:space.includes('Pots')?1:length,width:space.includes('Pots')?1:width,zones:[slots[i] || '', '', '', '']}));
}
export function validPlot(plot:Plot) {
  const {rows,columns}=gridSize(plot);
  return Boolean(plot.id && plot.name.trim() && plot.name.length<=100 && plotKinds.includes(plot.kind) && Number.isFinite(plot.length) && Number.isFinite(plot.width) && plot.length>0 && plot.width>0 && plot.length<=100 && plot.width<=100 && Number.isInteger(rows) && Number.isInteger(columns) && rows>=1 && columns>=1 && rows<=12 && columns<=12 && plot.zones.length===rows*columns && plot.zones.every(c=>typeof c==='string' && c.length<=100));
}
export function plotSummary(plots:Plot[],crops:string[]) {
  const placed=[...new Set(plots.flatMap(p=>p.zones).filter(Boolean))];
  return {placed,unassigned:crops.filter(c=>!placed.includes(c)),area:plots.reduce((n,p)=>n+p.length*p.width,0)};
}
