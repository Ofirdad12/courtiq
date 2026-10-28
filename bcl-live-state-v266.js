(()=>{
'use strict';

function install(){
  const d=window.CourtIQData;
  if(!d?.importOfficialGame)return false;
  if(d.importOfficialGame?.__courtiqBclLiveStateV266)return true;
  const previous=d.importOfficialGame;
  const wrapped=async function(url,clubId=null){
    try{return await previous(url,clubId);}catch(error){
      const raw=String(url||'');
      const isBcl=/^https:\/\/(?:www\.)?championsleague\.basketball\/en\/games\/\d+-/i.test(raw);
      const message=String(error?.message||error||'');
      if(isBcl&&/BCL has not published the complete official box score|BCL_BOX_SCORE_PENDING|official box score.*available/i.test(message)){
        throw new Error('LIVE GAME · CourtIQ is receiving the BCL game feed, but the official final box-score totals are not published yet. Import the same link again after FINAL to calculate verified advanced statistics.');
      }
      throw error;
    }
  };
  wrapped.__courtiqBclLiveStateV266=true;
  d.importOfficialGame=wrapped;
  d.__bclLiveStateV266=true;
  return true;
}

install();
setTimeout(install,0);
setTimeout(install,250);
setTimeout(install,1000);
window.addEventListener('load',install,{once:true});
window.CourtIQBclLiveStateV266={install};
})();
