(()=>{
'use strict';
const PAGE_TITLES=['תקציר מנהלים','פרופיל קבוצה','מגמות וקונטקסט','שחקניות מפתח','ראיות ותכנית עבודה'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function sectionTitle(section){return section?.querySelector('h2')?.textContent?.trim()||'';}
function findSection(sections,needle){return sections.find(s=>sectionTitle(s).includes(needle))||null;}
function cloneSection(section){return section?section.cloneNode(true):null;}
function removeButtons(node){node?.querySelectorAll('button').forEach(x=>x.remove());return node;}
function trimTable(section,maxRows){
  if(!section)return section;
  const rows=[...section.querySelectorAll('tbody tr')];
  rows.slice(maxRows).forEach(r=>r.remove());
  if(rows.length>maxRows){
    const p=section.ownerDocument.createElement('p');
    p.className='note cq-trim-note';
    p.textContent=`מוצגות ${maxRows} השורות הרלוונטיות ביותר מתוך ${rows.length}. הדוח המלא נשאר זמין במנוע הנתונים.`;
    section.appendChild(p);
  }
  return section;
}
function trimArticles(section,maxArticles){
  if(!section)return section;
  const items=[...section.querySelectorAll('article')];
  items.slice(maxArticles).forEach(x=>x.remove());
  return section;
}
function compactText(section,maxParagraphs=3){
  if(!section)return section;
  const paragraphs=[...section.querySelectorAll('p')];
  paragraphs.slice(maxParagraphs).forEach(p=>p.remove());
  return section;
}
function page(doc,index,title,subtitle=''){
  const el=doc.createElement('section');
  el.className='report-page';
  el.innerHTML=`<div class="cq-page-head"><div><small>COURTIQ · 5-PAGE SCOUT</small><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><b>${index}/5</b></div><div class="cq-page-body"></div><div class="cq-page-foot">CourtIQ · Data → Evidence → Decision support · עמוד ${index} מתוך 5</div>`;
  return el;
}
function append(pageEl,node){if(node)pageEl.querySelector('.cq-page-body').appendChild(node);}
function addCoachChecklist(doc,pageEl){
  const block=doc.createElement('section');
  block.className='cq-coach-checklist';
  block.innerHTML=`<h2>תכנית עבודה למאמן</h2><div class="cq-check-grid">
    <article><h3>3 דברים שצריך לעצור</h3><ol><li contenteditable="true">מבוסס על ממצא מוכח בדוח</li><li contenteditable="true">מבוסס על ממצא מוכח בדוח</li><li contenteditable="true">מבוסס על ממצא מוכח בדוח</li></ol></article>
    <article><h3>3 דברים שנרצה לייצר</h3><ol><li contenteditable="true">עדיפות התקפית</li><li contenteditable="true">עדיפות התקפית</li><li contenteditable="true">עדיפות התקפית</li></ol></article>
    <article><h3>מה לאשר בווידאו</h3><ol><li>סוגי אקשנים והקשר טקטי</li><li>איכות זריקות וכיסויי PnR</li><li>Lineups, matchups ומצבי משחק</li></ol></article>
    <article><h3>בדיקת לייב</h3><ol><li contenteditable="true">רבע 1 — מה השתנה?</li><li contenteditable="true">מחצית — adjustment</li><li contenteditable="true">רבע 4 — מה להמשיך?</li></ol></article>
  </div>`;
  append(pageEl,block);
}
function addPrintButton(doc,main){
  const bar=doc.createElement('div');bar.className='cq-print-bar';
  bar.innerHTML='<button type="button" onclick="window.print()">הדפסה / שמירה כ־PDF · 5 עמודים</button><span>הדוח מסכם את המדגם שנבחר ואינו ממציא מידע טקטי שאינו קיים במקור.</span>';
  main.prepend(bar);
}
function injectStyles(doc){
  const style=doc.createElement('style');
  style.textContent=`
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box}
  body{margin:0;background:#e9efeb;color:#172d24;font:13px/1.45 Arial,sans-serif}
  main.cq-five-page{max-width:1180px;margin:auto;padding:18px}
  .cq-print-bar{position:sticky;top:0;z-index:10;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 14px;margin-bottom:14px;background:#123e2e;color:#fff;border-radius:10px}
  .cq-print-bar button{padding:9px 15px;border:0;border-radius:8px;font-weight:700;cursor:pointer}
  .report-page{position:relative;background:#fff;border:1px solid #d5e1d9;border-radius:12px;min-height:190mm;margin:0 0 18px;padding:14mm 12mm 12mm;overflow:hidden}
  .cq-page-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:3px solid #123e2e;padding-bottom:8px;margin-bottom:10px}
  .cq-page-head h1{margin:2px 0 0;font-size:24px}.cq-page-head p{margin:3px 0 0;color:#52675c}.cq-page-head>b{font-size:22px;color:#165d40}
  .cq-page-body{display:grid;gap:8px}.cq-page-body>section{margin:0;padding:10px 12px;border:1px solid #d8e4dc;border-radius:9px;background:#fff}
  h2{margin:0 0 7px;color:#165d40;font-size:16px}h3{margin:5px 0;font-size:14px}p{margin:5px 0}
  article{padding:8px 10px;border-right:4px solid #338762;background:#f2f8f4;margin:6px 0;break-inside:avoid}
  table{width:100%;border-collapse:collapse;font-size:11px;margin:5px 0}th,td{padding:5px 6px;border-bottom:1px solid #dce6df;text-align:right;vertical-align:top}th{background:#e7f0e9}
  .scroll{overflow:visible}.note{font-size:11px;color:#536c5e}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.kpis div{padding:9px;background:#e6f3ea}.kpis b{display:block;font-size:19px}
  .cq-page-foot{position:absolute;bottom:6mm;left:12mm;right:12mm;border-top:1px solid #d5e1d9;padding-top:5px;font-size:9px;color:#61756a}
  .cq-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cq-check-grid article{margin:0}.cq-check-grid ol{margin:4px 0;padding-right:20px}.cq-check-grid li{margin:4px 0}
  [contenteditable]{outline:none;border-bottom:1px dashed #8aa095}
  .cq-compact-context table{font-size:10px}.cq-trim-note{margin-top:5px}
  @media(max-width:800px){main.cq-five-page{padding:8px}.report-page{min-height:0;padding:16px}.kpis,.cq-check-grid{grid-template-columns:1fr 1fr}.cq-page-foot{position:static;margin-top:12px}.cq-print-bar{position:static}}
  @media print{body{background:#fff}main.cq-five-page{padding:0;max-width:none}.cq-print-bar{display:none}.report-page{height:190mm;min-height:190mm;margin:0;border:0;border-radius:0;page-break-after:always;break-after:page}.report-page:last-child{page-break-after:auto;break-after:auto}.cq-page-foot{bottom:3mm}a{color:#172d24;text-decoration:none}}
  `;
  doc.head.appendChild(style);
}
function condenseReport(win){
  try{
    const doc=win.document,oldMain=doc.querySelector('main');
    if(!oldMain||oldMain.dataset.cqFivePage==='1')return;
    const originalHeader=oldMain.querySelector(':scope > header');
    const sections=[...oldMain.querySelectorAll(':scope > section')];
    if(!sections.length)return;
    const by=n=>findSection(sections,n);
    const known=new Set(['תמונת הקבוצה','ממצאים מוכחים','כל המדדים הקבוצתיים','בית, חוץ ויריבות','מגמות: חלונות מלאים','חלוקת התוצאה לפי רבעים','סגל וחלוקת תפוקה','רשימת המשחקים ותקינות המקור','הערות המאמן','הגדרות וגבולות הראיות']);
    const playerProfiles=sections.filter(s=>!known.has(sectionTitle(s)));
    const meta=originalHeader?.querySelector('p')?.textContent?.trim()||'';
    const teamTitle=(originalHeader?.querySelector('h1')?.textContent||doc.title||'דוח סקאוט').replace('— דוח סקאוט מפורט','').trim();
    const main=doc.createElement('main');main.className='cq-five-page';main.dataset.cqFivePage='1';

    const p1=page(doc,1,PAGE_TITLES[0],teamTitle+' · '+meta);
    append(p1,trimArticles(removeButtons(cloneSection(by('תמונת הקבוצה'))),1));
    append(p1,trimArticles(removeButtons(cloneSection(by('ממצאים מוכחים'))),5));

    const p2=page(doc,2,PAGE_TITLES[1],'המדדים שמגדירים את פרופיל הקבוצה במדגם שנבחר');
    append(p2,trimTable(removeButtons(cloneSection(by('כל המדדים הקבוצתיים'))),18));
    append(p2,trimTable(removeButtons(cloneSection(by('חלוקת התוצאה לפי רבעים'))),4));

    const p3=page(doc,3,PAGE_TITLES[2],'מה יציב, מה משתנה, ומה תלוי קונטקסט');
    const trends=removeButtons(cloneSection(by('מגמות: חלונות מלאים')));if(trends)trends.classList.add('cq-compact-context');append(p3,trends);
    const context=trimTable(removeButtons(cloneSection(by('בית, חוץ ויריבות'))),10);if(context)context.classList.add('cq-compact-context');append(p3,context);
    append(p3,trimTable(removeButtons(cloneSection(by('רשימת המשחקים ותקינות המקור'))),6));

    const p4=page(doc,4,PAGE_TITLES[3],'מי מייצרת תפוקה, מי משנה פרופיל, ומה דורש מאצ׳אפ');
    append(p4,trimTable(removeButtons(cloneSection(by('סגל וחלוקת תפוקה'))),10));
    const focus=doc.createElement('section');focus.innerHTML='<h2>פוקוס שחקניות</h2><div class="cq-player-focus"></div>';
    const holder=focus.querySelector('.cq-player-focus');
    playerProfiles.slice(0,4).forEach(profile=>{const c=removeButtons(cloneSection(profile));compactText(c,3);c.querySelectorAll('h3').forEach(h=>{if(h.textContent.includes('פירוט משחקים')){let n=h.nextElementSibling;while(n){const next=n.nextElementSibling;n.remove();n=next;}h.remove();}});c.querySelectorAll('table').forEach((t,i)=>{if(i>0)t.closest('.scroll')?.remove();});holder.appendChild(c);});
    if(!holder.children.length)holder.innerHTML='<p>אין מספיק נתוני שחקניות תקינים במדגם.</p>';
    append(p4,focus);

    const p5=page(doc,5,PAGE_TITLES[4],'מה לקחת לחדר המאמנים ומה עדיין צריך לאשר בווידאו');
    addCoachChecklist(doc,p5);
    append(p5,compactText(removeButtons(cloneSection(by('הערות המאמן'))),2));
    append(p5,compactText(removeButtons(cloneSection(by('הגדרות וגבולות הראיות'))),2));

    [p1,p2,p3,p4,p5].forEach(x=>main.appendChild(x));
    oldMain.replaceWith(main);injectStyles(doc);addPrintButton(doc,main);
    doc.title=`CourtIQ · ${teamTitle} · 5-Page Scout`;
  }catch(err){console.warn('CourtIQ 5-page scout transform failed',err);}
}
function patchModal(modal){
  const btn=modal?.querySelector('.scoutBuild');
  if(!btn||btn.dataset.cqFivePagePatched==='1'||typeof btn.onclick!=='function')return;
  const originalHandler=btn.onclick;
  btn.dataset.cqFivePagePatched='1';
  btn.textContent=btn.textContent.replace('הפקת דוח סקאוט','הפקת דוח סקאוט · 5 עמודים');
  btn.onclick=function(ev){
    let child=null;const originalOpen=window.open;
    window.open=function(...args){child=originalOpen.apply(window,args);return child;};
    try{return originalHandler.call(this,ev);}finally{
      window.open=originalOpen;
      if(child){setTimeout(()=>condenseReport(child),0);setTimeout(()=>condenseReport(child),120);}
    }
  };
}
function scan(){document.querySelectorAll('.cq-scout-choice').forEach(patchModal);}
const observer=new MutationObserver(()=>queueMicrotask(scan));
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
window.CourtIQFivePageScout={condenseReport};
})();
