'use strict';
const {createServer}=require('./server-v2.3');
const required=['OIDC_ISSUER','OIDC_AUDIENCE','OIDC_JWKS_URL','ALLOWED_SUBJECTS','GOOGLE_CALENDAR_ID','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN'];
function inspectConfiguration(env){
 const issues=[];
 for(const key of required)if(typeof env[key]!=='string'||!env[key].trim())issues.push('Falta '+key);
 for(const key of ['OIDC_ISSUER','OIDC_JWKS_URL'])if(env[key]){
  try{const u=new URL(env[key]);if(u.protocol!=='https:'||u.username||u.password||u.hash)issues.push('URL insegura en '+key)}catch{issues.push('URL inválida en '+key)}
 }
 if(env.OIDC_ISSUER&&env.OIDC_JWKS_URL){
  try{if(new URL(env.OIDC_ISSUER).origin!==new URL(env.OIDC_JWKS_URL).origin)issues.push('El JWKS usa un origen diferente; revisar manualmente')}catch{}
 }
 if(env.ALLOWED_SUBJECTS){const entries=env.ALLOWED_SUBJECTS.split(',').map(x=>x.trim());if(entries.some(x=>!x)||new Set(entries).size!==entries.length)issues.push('Lista de operadoras inválida')}
 if(env.GOOGLE_CALENDAR_ID&&(/\s/.test(env.GOOGLE_CALENDAR_ID)||env.GOOGLE_CALENDAR_ID.length>250))issues.push('ID de calendario inválido');
 return {readyForLocalTest:issues.length===0,readyForProduction:false,issues,notes:['El despliegue requiere HTTPS, gestión de secretos, OAuth real y controles de acceso verificados','El preflight no prueba el consentimiento de Google ni la identidad real']};
}
async function localUnauthorizedSmokeTest(env){
 const report=inspectConfiguration(env);if(!report.readyForLocalTest)return {...report,localSmokeTest:'blocked'};
 const server=createServer(env,{fetchImpl:async()=>{throw Error('Unexpected outbound call')}});
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const {port}=server.address();const r=await fetch('http://127.0.0.1:'+port+'/api/recepcion/reservas?desde=2026-11-02&hasta=2026-11-30');
  return {...report,localSmokeTest:r.status===401?'passed':'failed'};
 }catch{return {...report,localSmokeTest:'failed'}}finally{if(server.listening)await new Promise(resolve=>server.close(resolve))}
}
if(require.main===module){localUnauthorizedSmokeTest(process.env).then(r=>{process.stdout.write(JSON.stringify(r,null,2)+'\n');if(!r.readyForLocalTest||r.localSmokeTest!=='passed')process.exitCode=1})}
module.exports={inspectConfiguration,localUnauthorizedSmokeTest};
