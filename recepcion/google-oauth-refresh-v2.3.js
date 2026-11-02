'use strict';
function createGoogleTokenProvider({clientId,clientSecret,refreshToken,fetchImpl=globalThis.fetch,clock=()=>Date.now()}){
 if(![clientId,clientSecret,refreshToken].every(x=>typeof x==='string'&&x.trim()))throw Error('Google OAuth configuration incomplete');
 let token=null,expiresAt=0,inflight=null;
 return async function getAccessToken(){
  if(token&&clock()<expiresAt-60000)return token;
  if(inflight)return inflight;
  inflight=(async()=>{
   const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'});
   const r=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!r?.ok)throw Error('Google authorization unavailable');
   const data=await r.json();
   if(typeof data?.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<120)throw Error('Google token response invalid');
   token=data.access_token;expiresAt=clock()+data.expires_in*1000;return token;
  })();
  try{return await inflight;}finally{inflight=null;}
 };
}
module.exports={createGoogleTokenProvider};
