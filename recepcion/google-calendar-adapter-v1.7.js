'use strict';
const API='https://www.googleapis.com/calendar/v3/calendars/';
function createGoogleCalendarAdapter({getAccessToken,fetchImpl,timeoutMs=10000}){
 if(typeof getAccessToken!=='function'||typeof fetchImpl!=='function')throw Error('Server OAuth/transport not configured');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw Error('Invalid timeout');
 return {async listEvents({calendarId,timeMin,timeMax,pageToken,maxResults=250}){
  if(typeof calendarId!=='string'||!calendarId||typeof timeMin!=='string'||typeof timeMax!=='string')throw Error('Invalid Calendar query');
  if(!Number.isInteger(maxResults)||maxResults<1||maxResults>250)throw Error('Invalid page size');
  const token=await getAccessToken();if(typeof token!=='string'||!token.trim())throw Error('OAuth unavailable');
  const url=new URL(API+encodeURIComponent(calendarId)+'/events');
  url.searchParams.set('timeMin',timeMin);url.searchParams.set('timeMax',timeMax);
  url.searchParams.set('maxResults',String(maxResults));url.searchParams.set('singleEvents','true');
  url.searchParams.set('orderBy','startTime');url.searchParams.set('fields','nextPageToken,items(id,status,start(dateTime,date))');
  if(pageToken)url.searchParams.set('pageToken',pageToken);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetchImpl(url.toString(),{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:controller.signal,redirect:'error'});
   if(!response?.ok)throw Error('Calendar upstream unavailable');
   const data=await response.json();if(!data||!Array.isArray(data.items))throw Error('Calendar invalid response');
   return {items:data.items,nextPageToken:data.nextPageToken};
  }finally{clearTimeout(timer)}
 }};
}
module.exports={createGoogleCalendarAdapter};
