'use strict';
const ZONE='America/Santiago',DAY=/^\d{4}-\d{2}-\d{2}$/;
function bad(message){const e=new Error(message);e.httpStatus=400;throw e;}
function dateOnly(s){if(typeof s!=='string'||!DAY.test(s))bad('Fecha inválida');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)bad('Fecha inválida');return d;}
function plusDay(d){return new Date(d.getTime()+86400000);}
function parts(ms){const p=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));}
function midnightChile(date){
 const target=dateOnly(date).toISOString().slice(0,10),center=Date.parse(target+'T00:00:00Z');
 let low=center-36*3600000,high=center+36*3600000;
 const civil=ms=>{const p=parts(ms);return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');};
 if(!(civil(low)<target&&civil(high)>=target))throw Error('Rango de zona horaria no resuelto');
 while(high-low>1){const mid=low+Math.floor((high-low)/2);if(civil(mid)<target)low=mid;else high=mid;}
 if(civil(high)!==target)throw Error('Fecha local inexistente');
 return new Date(high).toISOString();
}
function safeEvent(e){return {id:String(e?.id||''),fecha:e?.start?.dateTime||e?.start?.date||null,estado:e?.status==='cancelled'?'cancelada':'requiere_revision',identidadVerificada:false,requiereRevision:true};}
function createGateway({authenticate,calendarClient,calendarId,clock=()=>new Date()}){
 if(typeof authenticate!=='function'||typeof calendarClient?.listEvents!=='function'||!calendarId)throw Error('Configuración privada incompleta');
 return async function handle(req){
  try{
   const user=await authenticate(req);if(!user?.authorized)return {status:401,body:{error:'Acceso no autorizado'}};
   const from=dateOnly(req?.query?.desde),to=dateOnly(req?.query?.hasta),span=(to-from)/86400000;
   if(span<0||span>93)bad('Rango no permitido');
   const timeMin=midnightChile(req.query.desde),timeMax=midnightChile(plusDay(to).toISOString().slice(0,10));
   const events=[],tokens=new Set();let token;
   for(let page=0;page<10;page++){
    const response=await calendarClient.listEvents({calendarId,timeMin,timeMax,pageToken:token,maxResults:250});
    if(!Array.isArray(response?.items)||response.items.length>250)throw Error('Respuesta de Calendar inválida');
    if(events.length+response.items.length>1000)throw Error('Límite de eventos');
    events.push(...response.items.map(safeEvent));
    token=response.nextPageToken;
    if(!token)return {status:200,headers:{'Cache-Control':'no-store'},body:{consultadoEn:clock().toISOString(),zonaHoraria:ZONE,reservas:events,advertencias:['Identidad sin verificar; invitaciones bloqueadas']}};
    if(typeof token!=='string'||tokens.has(token))throw Error('Paginación inválida');tokens.add(token);
   }
   throw Error('Límite de páginas');
  }catch(e){if(e.httpStatus===400)return {status:400,body:{error:e.message}};return {status:503,headers:{'Cache-Control':'no-store'},body:{error:'No se pudo verificar la agenda. Invitaciones bloqueadas.'}};}
 };
}
module.exports={createGateway,midnightChile,safeEvent};
