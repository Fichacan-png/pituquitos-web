'use strict';
const {createPublicKey,verify}=require('node:crypto');
const MAX_TOKEN=8192;
const b64json=s=>JSON.parse(Buffer.from(s,'base64url').toString('utf8'));
function createSessionVerifier({issuer,audience,jwksUrl,fetchImpl=globalThis.fetch,clock=()=>Date.now(),cacheMs=300000}){
 if(!/^https:\/\//.test(issuer||'')||!/^https:\/\//.test(jwksUrl||'')||!audience||typeof fetchImpl!=='function')throw Error('OIDC configuration incomplete');
 const pinnedIssuer=issuer.replace(/\/$/,'');
 let cache=null,until=0;
 async function getKeys(){
  if(cache&&clock()<until)return cache;
  const r=await fetchImpl(jwksUrl,{method:'GET',redirect:'error',headers:{Accept:'application/json'}});
  if(!r?.ok)throw Error('JWKS unavailable');
  const data=await r.json();
  if(!Array.isArray(data?.keys)||data.keys.length>30)throw Error('Invalid JWKS');
  cache=data.keys.filter(k=>k.kty==='RSA'&&k.use!=='enc'&&k.alg!=='HS256'&&typeof k.kid==='string');
  until=clock()+cacheMs;
  return cache;
 }
 return async function verifySession(token){
  try{
   if(typeof token!=='string'||token.length>MAX_TOKEN||token.split('.').length!==3)return null;
   const [a,b,c]=token.split('.');const header=b64json(a),payload=b64json(b);
   if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||header.crit||header.jku||header.jwk||header.x5u)return null;
   const now=Math.floor(clock()/1000);
   if(payload.iss!==pinnedIssuer||!(typeof payload.aud==='string'?payload.aud===audience:Array.isArray(payload.aud)&&payload.aud.includes(audience)))return null;
   if(!Number.isInteger(payload.exp)||payload.exp<=now||!Number.isInteger(payload.iat)||payload.iat>now+60)return null;
   if(payload.nbf!==undefined&&(!Number.isInteger(payload.nbf)||payload.nbf>now))return null;
   if(typeof payload.sub!=='string'||!payload.sub||payload.email_verified!==true)return null;
   const keys=await getKeys();const key=keys.find(k=>k.kid===header.kid&&(!k.alg||k.alg==='RS256'));
   if(!key)return null;
   const pub=createPublicKey({key,format:'jwk'});
   if(!verify('RSA-SHA256',Buffer.from(a+'.'+b),pub,Buffer.from(c,'base64url')))return null;
   return {verified:true,emailVerified:true,subject:payload.sub};
  }catch{return null;}
 };
}
module.exports={createSessionVerifier};
