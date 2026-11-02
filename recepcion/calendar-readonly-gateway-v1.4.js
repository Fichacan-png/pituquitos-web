'use strict';
// Private server adapter. Inject server-side authentication and Google Calendar client.
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS=93;
function httpError(status,message){const e=new Error(message);e.status=status;return e;}
function parseDay(s){if(!DATE.test(s||''))throw httpError(400,'Fecha inválida');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==s)throw httpError(400,'Fecha inválida');return d;}
function safeReservation(e){const start=e?.start?.dateTime||e?.start?.date||null;return {id:String(e?.id||''),fecha:start,estado:e?.status==='cancelled'?'cancelada':'requiere_revision',identidadVerificada:false,requiereRevision:true};}
function createGateway({authenticate,calendarClient,calendarId,clock=()=>new Date()}){
 if(typeof authenticate!=='function'||!calendarClient||typeof calendarClient.listEvents!=='function'||!calendarId)throw Error('Configuración privada incompleta');
 return async function handle(req){
  try{
   const identity=await authenticate(req);
   if(!identity?.authorized)return {status:401,body:{error:'Acceso no autorizado'}};
   const from=parseDay(req?.query?.desde),to=parseDay(req?.query?.hasta);
   const days=(to-from)/86400000;
   if(days<0||days>MAX_DAYS)throw httpError(400,'Rango no permitido');
   const events=[];let pageToken;
   do{
    const response=await calendarClient.listEvents({calendarId,timeMin:from.toISOString(),timeMax:new Date(to.getTime()+86400000).toISOString(),pageToken,maxResults:250});
    if(!Array.isArray(response?.items))throw Error('Respuesta inválida de Calendar');
    events.push(...response.items.map(safeReservation));
    if(events.length>1000)throw Error('Demasiados eventos');
    pageToken=response.nextPageToken;
   }while(pageToken);
   return {status:200,headers:{'Cache-Control':'no-store'},body:{consultadoEn:clock().toISOString(),reservas:events,advertencias:['Identidades no verificadas: no autorizar invitaciones con esta respuesta']}};
  }catch(e){
   if(e.status===400)return {status:400,body:{error:e.message}};
   return {status:503,headers:{'Cache-Control':'no-store'},body:{error:'No se pudo verificar la agenda. Invitaciones bloqueadas.'}};
  }
 };
}
module.exports={createGateway,safeReservation};
