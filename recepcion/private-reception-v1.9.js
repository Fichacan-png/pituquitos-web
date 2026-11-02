'use strict';
// Composition root for a private server, not an HTTP listener or deployment.
const {createOperatorAuthenticator}=require('./operator-auth-v1.8');
const {createGoogleCalendarAdapter}=require('./google-calendar-adapter-v1.7');
const {createGateway}=require('./calendar-readonly-gateway-v1.6');
function createPrivateReception({verifySession,allowedSubjects,getAccessToken,fetchImpl,calendarId,clock}){
 const authenticate=createOperatorAuthenticator({verifySession,allowedSubjects});
 const calendarClient=createGoogleCalendarAdapter({getAccessToken,fetchImpl});
 return createGateway({authenticate,calendarClient,calendarId,clock});
}
module.exports={createPrivateReception};
