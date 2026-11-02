'use strict';
const {createSessionVerifier}=require('./verified-session-v2.1');
const {createHttpHandler}=require('./private-http-v2.0');
function createOidcReception({issuer,audience,jwksUrl,allowedSubjects,calendarId,getAccessToken,fetchImpl=globalThis.fetch,clock}) {
 const verifySession=createSessionVerifier({issuer,audience,jwksUrl,fetchImpl,clock:clock?()=>clock().getTime():undefined});
 return createHttpHandler({verifySession,allowedSubjects,calendarId,getAccessToken,fetchImpl,clock});
}
module.exports={createOidcReception};
