'use strict';
const http=require('node:http');
const {createOidcReception}=require('./private-oidc-wiring-v2.2');
const {createGoogleTokenProvider}=require('./google-oauth-refresh-v2.3');
function createServer(env=process.env,dependencies={}){
 const required=['OIDC_ISSUER','OIDC_AUDIENCE','OIDC_JWKS_URL','ALLOWED_SUBJECTS','GOOGLE_CALENDAR_ID','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN'];
 if(required.some(k=>!env[k]||!String(env[k]).trim()))throw Error('Missing required private configuration');
 const allowedSubjects=env.ALLOWED_SUBJECTS.split(',').map(x=>x.trim()).filter(Boolean);
 if(!allowedSubjects.length||new Set(allowedSubjects).size!==allowedSubjects.length)throw Error('Invalid operator allowlist');
 const getAccessToken=createGoogleTokenProvider({clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,refreshToken:env.GOOGLE_REFRESH_TOKEN,fetchImpl:dependencies.fetchImpl||globalThis.fetch});
 const handler=createOidcReception({issuer:env.OIDC_ISSUER,audience:env.OIDC_AUDIENCE,jwksUrl:env.OIDC_JWKS_URL,allowedSubjects,calendarId:env.GOOGLE_CALENDAR_ID,getAccessToken,fetchImpl:dependencies.fetchImpl||globalThis.fetch});
 return http.createServer((req,res)=>handler(req,res));
}
if(require.main===module){
 try{const port=Number(process.env.PORT||8787);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');createServer().listen(port,'127.0.0.1',()=>process.stdout.write('Private reception listening on localhost\n'));}
 catch{process.stderr.write('Private reception startup blocked: configuration incomplete\n');process.exitCode=1;}
}
module.exports={createServer};
