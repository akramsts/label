(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MM=96/25.4;
const LABEL_W=63.5,LABEL_H=33.87,SHEET_W=210,SHEET_H=297;
const STORE='kv-mrp-label-studio-v3';
const FIELDS=['brand','product','mrp','qty','size','productColor','batch','mfg','unit','origin','extra','manufacturer','packed','marketed','care','phone','email'];
const CHECK_IDS=['product','mrp','qty','manufacturer','phone','email'];
const REQUIRED=['product','mrp','qty','manufacturer'];
const NAMES={product:'product name',mrp:'MRP',qty:'net quantity',manufacturer:'manufacturer',phone:'phone number',email:'email'};
const MESSAGES={product:'Enter the product name.',mrp:'Enter the MRP.',qty:'Enter the net quantity, for example 1 N.',manufacturer:'Enter the manufacturer name and address.'};
const DEFAULT_COLORS={bg:'#ffffff',ink:'#172536',accent:'#087f70'};
const PAL={
 bg:[['White','#ffffff'],['Cream','#fff4dc'],['Light grey','#edf1f4'],['Pale green','#e4f4ed'],['Navy','#102b4e'],['Black','#172b3a']],
 ink:[['Black','#172536'],['Charcoal','#343a40'],['Navy','#102b4e'],['White','#ffffff']],
 accent:[['Teal','#087f70'],['Blue','#2563eb'],['Black','#172b3a'],['Wine','#8b2447'],['Orange','#d97706'],['Purple','#7046a8']]
};
const PAL_ROOT={bg:'bgPalette',ink:'textPalette',accent:'accentPalette'};
const PAL_NAME={bg:'background',ink:'text',accent:'accent'};
const SAMPLE={brand:'KNIT VINCH',product:"Men's Regular Fit T-Shirt",mrp:'599.00',qty:'1 N',size:'M',productColor:'Black',batch:'KV001',mfg:'',unit:'',origin:'India',extra:'Wash separately',manufacturer:'Knit Vinch, Purnea, Bihar, India',packed:'',marketed:'Knit Vinch, Purnea, Bihar, India',care:'Knit Vinch Customer Support',phone:'',email:''};
const ICON={ok:'i-check-circle',warn:'i-alert',error:'i-x-circle'};
const state={colors:{...DEFAULT_COLORS},count:24,start:1,outline:false,tab:'single'};
const touched=new Set();
let fitInfo={s:1,status:'ok'};
let skipDialog=false;
let storageOK=true;
let raf=0,saveTimer=0,toastTimer=0;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const val=id=>$(id).value.trim();
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=t=>t.replace(/\s*\n+\s*/g,', ').replace(/\s{2,}/g,' ').trim();
function lsGet(k){try{return localStorage.getItem(k)}catch(e){storageOK=false;return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageOK=false;return false}}
function parseMrp(raw){const s=String(raw).replace(/₹|rs\.?|inr|,|\s/gi,'');return /^\d+(\.\d{1,2})?$/.test(s)?Number(s):NaN}
const fmtMrp=n=>n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function lum(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const isHex=h=>/^#[0-9a-f]{6}$/i.test(h||'');
function fieldError(id){
 const v=val(id);
 if(REQUIRED.includes(id)&&!v)return MESSAGES[id];
 if(id==='mrp'&&v&&!(parseMrp(v)>0))return 'Enter the price as a number, for example 599 or 599.50.';
 if(id==='email'&&v&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return 'Enter a valid email address, for example care@example.com.';
 if(id==='phone'&&v){const d=v.replace(/\D/g,'').length;if(!/^[+()\-\d\s]+$/.test(v)||d<7||d>15)return 'Enter a valid phone number using digits only.'}
 return '';
}
function showError(id,msg){
 const err=$('err-'+id),el=$(id);if(!err)return;
 if(msg){err.textContent=msg;err.hidden=false;el.setAttribute('aria-invalid','true')}
 else{err.textContent='';err.hidden=true;el.removeAttribute('aria-invalid')}
}
function validateField(id){const m=fieldError(id);showError(id,m);return m}
function refreshErrors(){CHECK_IDS.forEach(id=>showError(id,touched.has(id)?fieldError(id):''))}
function detailsHTML(){
 const inline=[['Net Qty',val('qty')],['Size',val('size')],['Colour',val('productColor')],['Unit sale price',val('unit')],['Mfg. date',val('mfg')],['Batch/Lot',val('batch')],['Country of origin',val('origin')]]
  .filter(([,v])=>v).map(([k,v])=>`<span class="it"><b>${esc(k)}:</b> ${esc(v)}</span>`).join(' ');
 const blocks=[];
 const add=(k,v)=>{if(v)blocks.push(`<div class="ln"><b>${esc(k)}:</b> ${esc(v)}</div>`)};
 add('Manufactured by',clean(val('manufacturer')));
 add('Packed by',clean(val('packed')));
 add('Marketed by',clean(val('marketed')));
 const cc=[clean(val('care')),val('phone')&&'Ph: '+val('phone'),val('email')&&'Email: '+val('email')].filter(Boolean).join(', ');
 add('Customer care',cc);
 add('Care instructions',val('extra'));
 return (inline?`<div>${inline}</div>`:'')+blocks.join('');
}
function labelInner(){
 const brand=val('brand');
 const n=parseMrp(val('mrp'));
 const mrp=n>0?'\u20B9'+fmtMrp(n):'\u20B9 ____';
 return `<div class="lb">${brand?`<div class="lb-brand">${esc(brand)}</div>`:''}<div class="lb-product">${esc(val('product')||'Product name')}</div><div class="lb-mrp"><b>MRP ${mrp}</b><span>(Inclusive of all taxes)</span></div><div class="lb-rule"></div><div class="lb-details">${detailsHTML()}</div></div>`;
}
function fitText(inner){
 const m=$('measure');m.innerHTML=inner;
 const lb=m.firstElementChild;
 const fits=s=>{m.style.setProperty('--s',s);return lb.scrollHeight<=lb.clientHeight+1&&lb.scrollWidth<=lb.clientWidth+1};
 const MIN=.72;
 let s=1,status='ok';
 if(!fits(1)){
  if(!fits(MIN)){s=MIN;status='over'}
  else{let lo=MIN,hi=1;for(let i=0;i<7;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid}s=lo}
 }
 fitInfo={s,status};
 document.documentElement.style.setProperty('--s',s.toFixed(3));
}
function cellsHTML(inner){
 let h='';
 for(let i=1;i<=24;i++){
  const on=i>=state.start&&i<state.start+state.count;
  h+=on?`<div class="cell${state.outline?' outlined':''}" data-pos="${i}">${inner}</div>`:`<div class="cell empty" data-pos="${i}"></div>`;
 }
 return h;
}
function buildPalette(key){
 const root=$(PAL_ROOT[key]),items=PAL[key],cur=state.colors[key];
 root.replaceChildren();
 items.forEach(([name,hex],idx)=>{
  const b=document.createElement('button');
  b.type='button';b.className='swatch';b.setAttribute('role','radio');
  b.setAttribute('aria-checked',String(cur.toLowerCase()===hex));
  b.setAttribute('aria-label',name);b.title=name;
  b.style.background=hex;b.style.color=lum(hex)>.5?'#172536':'#fff';
  b.innerHTML='<svg class="ic"><use href="#i-check"/></svg>';
  b.addEventListener('click',()=>{
  state.colors[key]=hex;render();
  const all=$(PAL_ROOT[key]).querySelectorAll('.swatch:not(.custom)');
  const nb=all[idx];if(nb)nb.focus();
 });
  root.appendChild(b);
 });
 const isCustom=!items.some(([,h])=>h===cur.toLowerCase());
 const lab=document.createElement('label');
 lab.className='swatch custom'+(isCustom?' active':'');lab.title='Custom colour';
 const dot=document.createElement('span');dot.className='dot';
 const paintDot=hex=>{dot.style.background=hex;dot.style.color=lum(hex)>.5?'#172536':'#fff'};
 paintDot(isCustom?cur:'#ffffff');
 dot.innerHTML=`<svg class="ic"><use href="#${isCustom?'i-check':'i-plus'}"/></svg>`;
 const inp=document.createElement('input');
 inp.type='color';inp.value=cur;inp.setAttribute('aria-label','Custom '+PAL_NAME[key]+' colour');
 inp.addEventListener('input',()=>{state.colors[key]=inp.value;paintDot(inp.value);render({keepPalettes:true})});
 inp.addEventListener('change',()=>render());
 lab.append(dot,inp);root.appendChild(lab);
}
function computeChecks(){
 const out=[];
 const probs=CHECK_IDS.filter(id=>fieldError(id));
 out.push(probs.length?{label:'Details',state:'error',msg:'Complete or correct: '+probs.map(id=>NAMES[id]).join(', ')+'.'}:{label:'Details',state:'ok',msg:'All required details are filled in.'});
 const pct=Math.round(fitInfo.s*100);
 if(fitInfo.status==='over')out.push({label:'Text fit',state:'error',msg:'The text does not fit on the label. Shorten the addresses or remove optional details.'});
 else if(fitInfo.s<.85)out.push({label:'Text fit',state:'warn',msg:'Text was reduced to '+pct+'% to fit. Shorter details will print larger and be easier to read.'});
 else out.push({label:'Text fit',state:'ok',msg:fitInfo.s<.995?'Text slightly reduced ('+pct+'%) to fit.':'All text fits at full size.'});
 out.push(val('care')||val('phone')||val('email')?{label:'Customer care',state:'ok',msg:'Customer care details added.'}:{label:'Customer care',state:'warn',msg:'Add customer care details so buyers can reach you.'});
 const cr=contrast(state.colors.bg,state.colors.ink);
 out.push(cr<3?{label:'Colours',state:'warn',msg:'Text and background colours are too close. The label may be hard to read.'}:{label:'Colours',state:'ok',msg:'Text and background are easy to read.'});
 return out;
}
function renderChecks(){
 const items=computeChecks();
 $('chips').innerHTML=items.map(c=>`<li class="chip ${c.state}" title="${esc(c.msg)}"><svg class="ic"><use href="#${ICON[c.state]}"/></svg>${esc(c.label)}</li>`).join('');
 const first=items.find(c=>c.state==='error')||items.find(c=>c.state==='warn');
 const st=first?first.state:'ok';
 const box=$('statusMsg');box.className='status-msg '+st;
 box.querySelector('use').setAttribute('href','#'+ICON[st]);
 box.querySelector('span').textContent=first?first.msg:'All checks passed. Ready to print.';
}
function renderProgress(){
 const done=REQUIRED.filter(id=>!fieldError(id)).length;
 $('progText').textContent=done===4?'All required details complete':done+' of 4 required details complete';
 $('progBar').style.width=(done/4*100)+'%';
}
function setCount(n){state.count=clamp(Math.round(n)||1,1,25-state.start)}
function setStart(n){state.start=clamp(Math.round(n)||1,1,24);state.count=Math.min(state.count,25-state.start)}
function syncPrintInputs(){$('count').value=state.count;$('start').value=state.start;$('count').max=25-state.start}
function renderPrintUi(){
 const end=state.start+state.count-1;
 $('printHint').textContent=state.count===1?'Prints 1 label in position '+state.start+'.':'Prints '+state.count+' labels in positions '+state.start+' to '+end+'.';
 document.querySelectorAll('[data-count]').forEach(b=>{
  const n=+b.dataset.count;
  b.setAttribute('aria-pressed',String(b.dataset.full?(state.count===24&&state.start===1):(state.count===n)));
 });
 $('sheetNote').textContent=$('printHint').textContent+' Click any position to start there.';
}
function layout(){
 const mobile=window.matchMedia('(max-width:959px)').matches;
 const s1=$('stageSingle');
 if(s1.clientWidth>0){
  const pad=18;
  let k=Math.min((s1.clientWidth-pad*2-38)/(LABEL_W*MM),2.4);
  if(!mobile)k=Math.min(k,(s1.clientHeight-pad*2-30)/(LABEL_H*MM));
  k=Math.max(k,.5);
  $('singleBox').style.width=(LABEL_W*MM*k)+'px';
  $('singleBox').style.height=(LABEL_H*MM*k)+'px';
  $('singleInner').style.transform='scale('+k+')';
  $('zoomNote').textContent='Shown at '+Math.round(k*100)+'% of actual size. The printed label is exactly 63.5 \u00D7 33.87 mm.';
 }
 const s2=$('stageSheet');
 if(s2.clientWidth>0){
  const pad=16;
  let k=(s2.clientWidth-pad*2)/(SHEET_W*MM);
  if(!mobile)k=Math.min(k,(s2.clientHeight-pad*2)/(SHEET_H*MM));
  k=clamp(k,.2,1);
  $('sheetBox').style.width=(SHEET_W*MM*k)+'px';
  $('sheetBox').style.height=(SHEET_H*MM*k)+'px';
  $('sheetInner').style.transform='scale('+k+')';
 }
}
function render(opts){
 opts=opts||{};
 const inner=labelInner();
 fitText(inner);
 const r=document.documentElement.style;
 r.setProperty('--label-bg',state.colors.bg);
 r.setProperty('--label-ink',state.colors.ink);
 r.setProperty('--label-accent',state.colors.accent);
 $('singleCell').innerHTML=inner;
 const cells=cellsHTML(inner);
 $('sheetScreen').innerHTML=cells;
 $('sheetPrint').innerHTML=cells;
 if(!opts.keepPalettes)['bg','ink','accent'].forEach(buildPalette);
 renderPrintUi();renderChecks();renderProgress();layout();queueSave();
}
const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>render())};
function snapshot(){const f={};FIELDS.forEach(id=>f[id]=$(id).value);return{f,colors:{...state.colors},count:state.count,start:state.start,outline:state.outline}}
function apply(s){
 FIELDS.forEach(id=>{$(id).value=s.f&&s.f[id]!=null?String(s.f[id]):''});
 const c=s.colors||{};
 state.colors={bg:isHex(c.bg)?c.bg:DEFAULT_COLORS.bg,ink:isHex(c.ink)?c.ink:DEFAULT_COLORS.ink,accent:isHex(c.accent)?c.accent:DEFAULT_COLORS.accent};
 state.start=clamp(parseInt(s.start,10)||1,1,24);
 state.count=clamp(parseInt(s.count,10)||24,1,25-state.start);
 state.outline=!!s.outline;$('outline').checked=state.outline;
 syncPrintInputs();
}
function queueSave(){
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{
  const ok=lsSet(STORE,JSON.stringify(snapshot()));
  const el=$('saveState');
  el.classList.toggle('off',!ok);
  el.querySelector('span').textContent=ok?'Draft saved on this device':'Not saved automatically';
  el.querySelector('use').setAttribute('href',ok?'#i-check-circle':'#i-info');
 },350);
}
function toast(msg,action){
 const el=$('toast');el.replaceChildren();
 const t=document.createElement('span');t.textContent=msg;el.appendChild(t);
 if(action){
  const b=document.createElement('button');b.type='button';
  b.innerHTML='<svg class="ic"><use href="#i-undo"/></svg>';
  b.append(action.label);
  b.addEventListener('click',()=>{action.fn();el.classList.remove('show')});
  el.appendChild(b);
 }
 el.classList.add('show');clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.classList.remove('show'),action?6000:3000);
}
function loadSample(){
 const prev=snapshot();
 apply({f:SAMPLE,colors:DEFAULT_COLORS,count:24,start:1,outline:false});
 touched.clear();render();refreshErrors();
 toast('Sample details loaded.',{label:'Undo',fn:()=>{apply(prev);touched.clear();render();refreshErrors()}});
}
function clearAll(){
 const prev=snapshot();
 apply({f:{origin:'India'},colors:DEFAULT_COLORS,count:24,start:1,outline:false});
 touched.clear();render();refreshErrors();
 toast('All details cleared.',{label:'Undo',fn:()=>{apply(prev);touched.clear();render();refreshErrors()}});
}
function setView(v){
 document.body.dataset.view=v;
 document.querySelectorAll('.mb[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
 window.scrollTo(0,0);requestAnimationFrame(layout);
}
function setTab(t,focus){
 state.tab=t;
 ['single','sheet'].forEach(n=>{
  const tb=$('tab-'+n);tb.setAttribute('aria-selected',String(n===t));tb.tabIndex=n===t?0:-1;
  $('panel-'+n).hidden=n!==t;
 });
 if(focus)$('tab-'+t).focus();
 layout();
}
function requestPrint(){
 CHECK_IDS.forEach(id=>touched.add(id));
 refreshErrors();
 const bad=CHECK_IDS.find(id=>fieldError(id));
 if(bad){
  if(document.body.dataset.view!=='edit')setView('edit');
  const el=$(bad);const d=el.closest('details');if(d)d.open=true;
  el.focus({preventScroll:true});
  el.scrollIntoView({block:'center',behavior:'smooth'});
  toast('Fix the highlighted fields before printing.');
  return;
 }
 if(fitInfo.status==='over'){toast('The text does not fit on the label. Shorten the details first.');return}
 if(skipDialog)doPrint();else openDialog();
}
function openDialog(){
 const dlg=$('printDialog');
 if(typeof dlg.showModal!=='function'){window.print();return}
 $('dlgSkip').checked=false;dlg.showModal();
}
function doPrint(){window.print()}
FIELDS.forEach(id=>{
 const el=$(id);
 el.addEventListener('input',()=>{if(touched.has(id))validateField(id);schedule()});
 el.addEventListener('change',schedule);
 el.addEventListener('blur',()=>{
  touched.add(id);
  if(id==='mrp'){const n=parseMrp(el.value);if(n>0)el.value=n.toFixed(2)}
  validateField(id);schedule();
 });
});
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
 const d=Number(b.dataset.step);
 if(b.dataset.for==='count')setCount(state.count+d);else setStart(state.start+d);
 syncPrintInputs();render();
}));
$('count').addEventListener('input',()=>{const n=parseInt($('count').value,10);if(Number.isFinite(n)){setCount(n);schedule()}});
$('start').addEventListener('input',()=>{
 const n=parseInt($('start').value,10);
 if(Number.isFinite(n)){setStart(n);$('count').value=state.count;$('count').max=25-state.start;schedule()}
});
['count','start'].forEach(id=>$(id).addEventListener('change',()=>{syncPrintInputs();render()}));
document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>{
 if(b.dataset.full)state.start=1;
 setCount(+b.dataset.count);syncPrintInputs();render();
}));
$('outline').addEventListener('change',e=>{state.outline=e.target.checked;render()});
$('sheetScreen').addEventListener('click',e=>{
 const c=e.target.closest('[data-pos]');if(!c)return;
 setStart(+c.dataset.pos);syncPrintInputs();render();
 toast('Printing will start at position '+state.start+'.');
});
$('example').addEventListener('click',loadSample);
$('clear').addEventListener('click',clearAll);
$('printBtn').addEventListener('click',requestPrint);
$('printBtnM').addEventListener('click',requestPrint);
$('tipsBtn').addEventListener('click',openDialog);
document.querySelectorAll('.mb[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
['single','sheet'].forEach(n=>$('tab-'+n).addEventListener('click',()=>setTab(n)));
$('tab-single').parentElement.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='Home'||e.key==='End'){
  e.preventDefault();setTab(e.key==='ArrowLeft'||e.key==='Home'?'single':'sheet',true);
 }
});
const dlg=$('printDialog');
$('dlgCancel').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
$('dlgGo').addEventListener('click',()=>{
 if($('dlgSkip').checked){skipDialog=true;lsSet(STORE+'-skip','1')}
 dlg.close();setTimeout(doPrint,80);
});
window.addEventListener('resize',layout);
if(window.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(layout));ro.observe($('stageSingle'));ro.observe($('stageSheet'))}
skipDialog=lsGet(STORE+'-skip')==='1';
let saved=null;
try{const raw=lsGet(STORE);if(raw)saved=JSON.parse(raw)}catch(e){saved=null}
apply(saved&&saved.f?saved:{f:SAMPLE,colors:DEFAULT_COLORS,count:24,start:1,outline:false});
render();
setTab('single');
})();
