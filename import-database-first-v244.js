(()=>{
'use strict';

function identityFromUrl(raw){
  try{
    const u=new URL(String(raw||'').trim());
    const host=u.hostname.replace(/^www\./i,'').toLowerCase();
    if(host==='ibasketball.co.il'){
      const m=u.pathname.match(/^\/match\/([^/?#]+)\/?$/i);
      return m?{provider:'IBBA',externalId:m[1]}:null;
    }
    if(host==='basket.co.il'){
      const id=u.searchParams.get('GameId');
      return id?{provider:'WINNER_LEAGUE',externalId:id}:null;
    }
    if(host==='fiba.basketball'){
      const m=u.pathname.match(/\/games\/(\d+)-/i);
      return m?{provider:'FIBA',externalId:m[1]}:null;
    }
    if(host==='euroleaguebasketball.net'){
      const m=u.pathname.match(/\/([EU]\d{4})\/(\d+)\/?$/i);
      if(!m)return null;
      return {provider:u.pathname.toLowerCase().includes('/eurocup/')?'EUROCUP':'EUROLEAGUE',externalId:m[1].toUpperCase()+'-'+m[2]};
    }
    if(host==='plk.pl'){
      const m=u.pathname.match(/^\/mecz\/(\d+)/i);
      return m?{provider:'PLK',externalId:m[1]}:null;
    }
    if(host.endsWith('geniussports.com')){
      const m=u.pathname.match(/^\/u\/[^/]+\/(\d+)\//i);
      return m?{provider:'GENIUS_LIVESTATS',externalId:m[1]}:null;
    }
    if(host==='eurobasket.com'){
      const id=u.searchParams.get('Game')||u.searchParams.get('game');
      return id?{provider:'EUROBASKET_POLAND',externalId:String(id).slice(0,120)}:null;
    }
  }catch(_){}
  return null;
}

async function savedGame(url){
  const identity=identityFromUrl(url);
  const d=window.CourtIQData;
  if(!identity||!d?.workspace)return null;
  const w=await d.workspace();
  const row=(w?.games||[]).find(g=>String(g?.provider||'').toUpperCase()===identity.provider&&String(g?.external_id||'')===String(identity.externalId));
  if(!row?.payload?.ui)return null;
  const verified=row.payload.verified===true||row.payload.quality?.status==='VERIFIED';
  if(!verified)return null;
  return {
    game_id:row.id,
    ui:row.payload.ui,
    validation:row.payload.validation||null,
    report:row.payload.report||null,
    saved:true,
    reused_existing:true,
    cache_hit:true,
    club_id:w?.club?.id||row.club_id||null,
    source:'courtiq_verified_database'
  };
}

let upstream=null;
let wrapper=null;
function install(){
  const d=window.CourtIQData;
  if(!d?.importOfficialGame)return false;
  if(wrapper&&d.importOfficialGame===wrapper)return true;
  upstream=d.importOfficialGame.bind(d);
  wrapper=async function(url,clubId=null){
    let cached=null;
    try{cached=await savedGame(url);}catch(_){}
    if(cached)return cached;
    return upstream(url,clubId);
  };
  wrapper.__courtiqDatabaseFirstV244=true;
  d.importOfficialGame=wrapper;
  d.__importDatabaseFirstV244=true;
  return true;
}

install();
setTimeout(install,0);
setTimeout(install,250);
setTimeout(install,1000);
window.addEventListener('load',install,{once:true});
window.CourtIQImportDatabaseFirstV244={install,savedGame,identityFromUrl};
})();
