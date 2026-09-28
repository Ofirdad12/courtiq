(function(){
const STORE="courtiq_video_room_v1";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function parseYouTube(input){try{const u=new URL(input);if(u.hostname==="youtu.be")return u.pathname.slice(1).split("/")[0];if(/(^|\.)youtube\.com$/.test(u.hostname)){if(u.pathname==="/watch")return u.searchParams.get("v");if(u.pathname.startsWith("/embed/"))return u.pathname.split("/")[2];}}catch(_){}return null}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||"{}")}catch(_){return {}}}
function save(x){localStorage.setItem(STORE,JSON.stringify(x))}
function openRoom(){
 const state=load(),modal=document.createElement("div");modal.className="modal";
 modal.innerHTML=`<div class="modalCard compareModal"><button class="modalX">×</button><small class="eyebrow">COURTIQ · VIDEO EVIDENCE ROOM</small><h2>Import Game Video</h2><p>Paste a YouTube game link. CourtIQ keeps video evidence separate from verified box-score facts: timestamps and tags are evidence; tactical conclusions require analyst review.</p><div class="importFields"><input id="videoUrl" placeholder="https://youtu.be/..." value="${esc(state.url||"")}"></div><div id="videoStatus" class="impStatus"></div><button id="loadVideo" class="runImport">LOAD VIDEO</button><div id="videoWorkspace"></div></div>`;
 document.body.appendChild(modal);modal.querySelector(".modalX").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 const draw=()=>{const s=load(),box=modal.querySelector("#videoWorkspace");if(!s.videoId){box.innerHTML="";return}
 const events=s.events||[];
 box.innerHTML=`<div style="position:relative;padding-top:56.25%;margin:16px 0"><iframe id="cqVideo" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" src="https://www.youtube.com/embed/${esc(s.videoId)}?enablejsapi=1" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>
 <div class="schema"><b>VIDEO LOADED · ${esc(s.videoId)}</b><br>Use the YouTube clock, enter a timestamp, then tag the possession. CourtIQ does not claim automatic computer-vision detection in this browser build.</div>
 <div class="importFields"><input id="evTime" placeholder="Timestamp · 12:34"><select id="evTag"><option>Pick & Roll</option><option>Transition</option><option>Turnover</option><option>Shot Quality</option><option>Offensive Rebound</option><option>Post Up</option><option>Isolation</option><option>ATO / Set Play</option><option>Defense</option><option>Other</option></select><input id="evNote" placeholder="Evidence note · what happened?"></div><button id="addEvidence" class="runImport">ADD VIDEO EVIDENCE</button>
 <h3>Evidence Timeline</h3><div class="videoList">${events.length?events.map((e,i)=>`<div class="videoItem"><span>${i+1}</span><b>${esc(e.time)} · ${esc(e.tag)}</b> — ${esc(e.note||"No note")} <button data-del="${i}" class="importBtn">×</button></div>`).join(""):'<div class="schema">No tagged possessions yet.</div>'}</div>
 <div class="metricNote">Evidence status: analyst-tagged video. Link these timestamps to official Play-by-Play/box-score events before publishing tactical claims.</div>`;
 box.querySelector("#addEvidence").onclick=()=>{const time=box.querySelector("#evTime").value.trim(),tag=box.querySelector("#evTag").value,note=box.querySelector("#evNote").value.trim();if(!/^\d{1,3}:\d{2}$/.test(time)){modal.querySelector("#videoStatus").textContent="Enter timestamp as MM:SS, for example 12:34.";return}const x=load();(x.events??=[]).push({time,tag,note,createdAt:new Date().toISOString()});save(x);modal.querySelector("#videoStatus").textContent="Video evidence saved locally.";draw()};
 box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const x=load();x.events.splice(Number(b.dataset.del),1);save(x);draw()});
 };
 modal.querySelector("#loadVideo").onclick=()=>{const url=modal.querySelector("#videoUrl").value.trim(),id=parseYouTube(url);if(!id){modal.querySelector("#videoStatus").textContent="Paste a valid YouTube video URL.";return}const old=load();save({...old,url,videoId:id,events:old.videoId===id?(old.events||[]):[]});modal.querySelector("#videoStatus").textContent="Video connected to CourtIQ Video Room.";draw()};draw();
}
function install(){const bar=document.querySelector(".pills");if(bar&&!document.querySelector("#videoImport")){const b=document.createElement("button");b.id="videoImport";b.className="importBtn primaryAction";b.textContent="VIDEO IMPORT";b.onclick=openRoom;bar.appendChild(b)}
 document.querySelectorAll(".menu div").forEach(x=>{if(x.textContent.includes("Video Room")&&!x.dataset.videoBound){x.dataset.videoBound="1";x.addEventListener("click",openRoom)}})}
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});install();
window.CourtIQVideo={open:openRoom,parseYouTube};
})();