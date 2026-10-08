/* Season-only experimental RAPM. EPM is imported, never imitated. */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const five=v=>Array.isArray(v)&&v.length===5&&v.every(x=>typeof x==='string'&&x.trim()===x&&x.length>0)&&new Set(v).size===5;
 function fit(data,lambda=100){
  if(!data||typeof data.season!=='string'||!data.season.trim()||typeof data.competition!=='string'||!data.competition.trim()||!Array.isArray(data.stints)||!data.stints.length||data.stints.length>20000)throw Error('Require season, competition and 1–20,000 stints.');
  if(!finite(lambda)||lambda<=0)throw Error('Lambda must be positive.');
  const ids=new Set(),games=new Set(),players=new Set();
  data.stints.forEach(s=>{
   if(typeof s.gameId!=='string'||!s.gameId||typeof s.id!=='string'||!s.id||ids.has(JSON.stringify([s.gameId,s.id]))||!five(s.home)||!five(s.away)||s.home.some(p=>s.away.includes(p))||!finite(s.possessions)||s.possessions<=0||!Number.isInteger(s.possessions)||!Number.isInteger(s.homePoints)||s.homePoints<0||!Number.isInteger(s.awayPoints)||s.awayPoints<0)throw Error('Invalid or duplicate stint. Supply two disjoint fives, verified possession-pair counts, and nonnegative integer points.');
   ids.add(JSON.stringify([s.gameId,s.id]));games.add(s.gameId);[...s.home,...s.away].forEach(p=>players.add(p));
  });
  if(games.size<2)throw Error('RAPM needs multiple games; one game is unavailable.');
  if(players.size>400)throw Error('Maximum 400 player IDs per fit.');
  const names=[...players].sort(),index=new Map(names.map((p,i)=>[p,i])),n=names.length,exposure=Array(n).fill(0),pg=names.map(()=>new Set());
  const rows=data.stints.map(s=>{const x=[...s.home.map(p=>[index.get(p),1]),...s.away.map(p=>[index.get(p),-1])];x.forEach(([i])=>{exposure[i]+=s.possessions;pg[i].add(s.gameId);});return {x,w:s.possessions,y:100*(s.homePoints-s.awayPoints)/s.possessions};});
  // Unpenalized intercept absorbs the average home margin in the uploaded sample.
  const a=Array.from({length:n+1},()=>Array(n+1).fill(0)),b=Array(n+1).fill(0);
  rows.forEach(r=>{const x=[...r.x,[n,1]];x.forEach(([i,xi])=>{b[i]+=r.w*xi*r.y;x.forEach(([j,xj])=>a[i][j]+=r.w*xi*xj);});});
  for(let i=0;i<n;i++)a[i][i]+=lambda;
  // Cholesky solves the positive definite weighted ridge system.
  const l=Array.from({length:n+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=n;i++)for(let j=0;j<=i;j++){let v=a[i][j];for(let k=0;k<j;k++)v-=l[i][k]*l[j][k];if(i===j){if(v<=0||!finite(v))throw Error('Model could not be solved.');l[i][j]=Math.sqrt(v);}else l[i][j]=v/l[j][j];}
  const z=Array(n+1).fill(0),beta=Array(n+1).fill(0);
  for(let i=0;i<=n;i++){let v=b[i];for(let j=0;j<i;j++)v-=l[i][j]*z[j];z[i]=v/l[i][i];}
  for(let i=n;i>=0;i--){let v=z[i];for(let j=i+1;j<=n;j++)v-=l[j][i]*beta[j];beta[i]=v/l[i][i];}
  return {season:data.season,competition:data.competition,games:games.size,stints:rows.length,possessions:rows.reduce((v,r)=>v+r.w,0),lambda,homeIntercept:beta[n],players:names.map((id,i)=>({id,rapm:beta[i],possessions:exposure[i],games:pg[i].size})).sort((a,b)=>b.rapm-a.rapm)};
 }
 function epm(data){
  if(!data||data.provider!=='Dunks & Threes'||typeof data.sourceUrl!=='string'||!/^https:\/\/(www\.)?dunksandthrees\.com(?:\/|$)/i.test(data.sourceUrl)||typeof data.asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)||typeof data.season!=='string'||!data.season.trim()||typeof data.competition!=='string'||!data.competition.trim()||!Array.isArray(data.players)||!data.players.length||data.players.length>1000)throw Error('EPM requires a Dunks & Threes source URL, asOf date, season, competition and players.');
  const seen=new Set();data.players.forEach(p=>{if(typeof p.id!=='string'||!p.id.trim()||seen.has(p.id)||!finite(p.epm))throw Error('EPM needs unique player IDs and numeric values.');seen.add(p.id);});return data;
 }
 function mount(scope){
  if(!scope||scope.querySelector('.impactMetrics'))return;
  const el=root.document.createElement('section');el.className='card box impactMetrics';el.innerHTML='<h3>RAPM / EPM · השפעת שחקן</h3><div dir="rtl"><p><b>RAPM — Regularized Adjusted Plus-Minus:</b> אומדן השפעת שחקן על הפרש הנקודות ל־100 פוזשנים, תוך התאמה לחברים וליריבים ששיחקו איתו. רגולריזציה ממתנת אומדנים קיצוניים. דורש נתוני הרכבים ופוזשנים ממשחקים רבים; Box Score לבדו אינו מספיק.</p><p><b>EPM — Estimated Plus-Minus:</b> מדד של Dunks &amp; Threes שמשלב מודל סטטיסטי עם RAPM. כאן מוצגים רק ערכים מיובאים עם מקור ותאריך; אין חישוב מקומי של EPM הרשמי.</p><p>למשל, ‎+3 פירושו אומדן של יתרון של 3 נקודות ל־100 פוזשנים ביחס לשחקן ממוצע במדד. זו אינה הבטחה ל־3 נקודות במשחק הבא.</p></div><details><summary>Season RAPM · חישוב ניסיוני מנתוני עונה</summary><p>Upload one competition and season. Stable player IDs must be identical across games. Each nonoverlapping stint must contain BOTH simultaneous lineups, score changes and a verified count of possession pairs (one offensive possession per side). Never duplicate home/away records or use estimated box-score possessions. This upload is a separate season sample; it does not overwrite game records.</p><pre style="white-space:pre-wrap">{"season":"2026-27","competition":"League ID","stints":[{"gameId":"g1","id":"s1","home":["h1","h2","h3","h4","h5"],"away":["a1","a2","a3","a4","a5"],"possessions":10,"homePoints":12,"awayPoints":9}]}</pre><p>Format example only. Add measured stints from multiple games. Default λ=100 is an uncalibrated ridge penalty, not a confidence level. Validate across held-out games before using rankings for decisions. Players who always share the court cannot be reliably separated.</p><label>Ridge λ <input class="impactLambda" type="number" min="0.01" step="1" value="100"></label><label> RAPM JSON <input class="impactRapmFile" type="file" accept=".json,application/json"></label><div class="impactRapmOut" role="status">RAPM — לא זמין עד לייבוא נתוני עונה מתאימים.</div></details><details><summary>Import sourced EPM · ייבוא עם מקור</summary><p>Import values obtained with permission from the provider. Source metadata is supplied by the uploader and is not independently authenticated. No EPM estimate is generated for European or Israeli leagues.</p><pre style="white-space:pre-wrap">{"provider":"Dunks &amp; Threes","sourceUrl":"https://dunksandthrees.com/epm","asOf":"YYYY-MM-DD","season":"SEASON","competition":"NBA","players":[{"id":"PLAYER_ID","epm":0}]}</pre><label>EPM JSON <input class="impactEpmFile" type="file" accept=".json,application/json"></label><div class="impactEpmOut" role="status">EPM — לא זמין ללא ערכים ממקור מזוהה.</div></details><p class="metricNote">Imported samples and results last only in this open analysis view. Reimport after switching teams or reopening. Missing values remain unavailable.</p><p><a href="https://dunksandthrees.com/about/epm" target="_blank" rel="noopener noreferrer">EPM methodology</a> · <a href="https://ryurko.github.io/cmu_score_preprints/module_resources/nba-rapm/intro_nba_rapm_SOLUTIONS.html" target="_blank" rel="noopener noreferrer">RAPM methodology</a></p>';
  scope.appendChild(el);
  const read=async(file)=>{if(!file)throw Error('Select JSON.');if(file.size>5000000)throw Error('Maximum JSON size: 5 MB.');return JSON.parse(await file.text());};
  let sample=null;
  const draw=()=>{const out=el.querySelector('.impactRapmOut');try{const r=fit(sample,Number(el.querySelector('.impactLambda').value));out.innerHTML='<p>EXPERIMENTAL · '+esc(r.competition)+' · '+esc(r.season)+' · '+r.games+' games · '+r.stints+' stints · '+r.possessions+' possession pairs · λ='+r.lambda+' · No calibrated confidence interval.</p><div class="playerScroll"><table class="stats"><thead><tr><th>Player ID</th><th>RAPM / 100</th><th>Possession pairs</th><th>Games</th></tr></thead><tbody>'+r.players.map(p=>'<tr><td>'+esc(p.id)+'</td><td>'+p.rapm.toFixed(2)+'</td><td>'+p.possessions+'</td><td>'+p.games+'</td></tr>').join('')+'</tbody></table></div>';}catch(e){out.textContent='RAPM unavailable: '+e.message;}};
  el.querySelector('.impactRapmFile').onchange=async e=>{sample=null;try{sample=await read(e.target.files[0]);draw();}catch(err){el.querySelector('.impactRapmOut').textContent=err.message;}};
  el.querySelector('.impactLambda').onchange=()=>{if(sample)draw();};
  el.querySelector('.impactEpmFile').onchange=async e=>{const out=el.querySelector('.impactEpmOut');try{const d=epm(await read(e.target.files[0]));out.innerHTML='<p>IMPORTED · '+esc(d.provider)+' · '+esc(d.competition)+' · '+esc(d.season)+' · '+esc(d.asOf)+' · <a href="'+esc(d.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source supplied by uploader</a></p><div class="playerScroll"><table class="stats"><thead><tr><th>Player ID</th><th>EPM / 100</th></tr></thead><tbody>'+d.players.map(p=>'<tr><td>'+esc(p.id)+'</td><td>'+p.epm.toFixed(2)+'</td></tr>').join('')+'</tbody></table></div>';}catch(err){out.textContent='EPM unavailable: '+err.message;}};
 }
 const api={fit,epm,mount};root.CourtIQImpact=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
