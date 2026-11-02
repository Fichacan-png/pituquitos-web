'use strict';
const {createPrivateReception}=require('./private-reception-v1.9');
const MAX_URL=300;
function createHttpHandler(config){
 const handle=createPrivateReception(config);
 return async function http(req,res){
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'"});res.end(JSON.stringify(body));};
  try{
   if(req.method!=='GET')return send(405,{error:'Método no permitido'});
   if(typeof req.url!=='string'||req.url.length>MAX_URL)return send(400,{error:'Solicitud inválida'});
   const u=new URL(req.url,'http://internal.invalid');
   if(u.pathname!=='/api/recepcion/reservas')return send(404,{error:'Ruta no encontrada'});
   const keys=[...u.searchParams.keys()];
   if(keys.length!==2||keys.some(k=>!['desde','hasta'].includes(k))||u.searchParams.getAll('desde').length!==1||u.searchParams.getAll('hasta').length!==1)return send(400,{error:'Parámetros inválidos'});
   const r=await handle({headers:req.headers,query:{desde:u.searchParams.get('desde'),hasta:u.searchParams.get('hasta')}});
   return send(r.status,r.body);
  }catch{return send(503,{error:'No se pudo verificar la agenda. Invitaciones bloqueadas.'});}
 };
}
module.exports={createHttpHandler};
