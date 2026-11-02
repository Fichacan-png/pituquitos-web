/* Mi Pituquitos · Recepción — conciliación conservadora v0.8
   No usa credenciales, no modifica Calendar ni envía WhatsApp.
   Solo recibe eventos ya obtenidos por un canal autorizado.
*/
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.PituquitosConciliacion=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const normalizar=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const estado=e=>{
 const s=normalizar([e.summary,e.description].filter(Boolean).join(" "));
 if(e.status==="cancelled"||/\b(cancelad[oa]|reagendar|reprogramar)\b/.test(s))return "excluir_revisar";
 if(/\b(no asistio|inasistencia|no vino|no se presento)\b/.test(s))return "excluir_inasistencia";
 if(/\b(confirmar cita|por confirmar|confirmar abono|sin abono|pre cita|precita)\b/.test(s))return "provisional";
 return "calendar_sin_verificar";
};
function interpretar(e){
 const titulo=String(e.summary||"").trim(), est=estado(e);
 const fecha=typeof e.start==="string"?e.start:e.start?.dateTime||e.start?.date||null;
 const partes=titulo.split("/").map(x=>x.trim()).filter(Boolean);
 let tutor=null,perros=[],razon="formato ambiguo";
 if(partes.length>=2&&!titulo.includes(",")&&!/\b(pagado|pendiente|exento|confirmar|abono)\b/i.test(partes[1])){
  tutor=partes[0];
  const p=partes[1].split(/\s+y\s+/i).map(x=>x.trim()).filter(Boolean);
  if(p.length<=2&&p.every(x=>x.length>=2&&x.length<=35)){perros=p;razon=p.length>1?"varios perros: revisar":"identificación tentativa";}
 }
 return {id:e.id||null,fecha,titulo,estado:est,tutor,perros,razon,requiereRevision:est!=="calendar_sin_verificar"||perros.length!==1};
}
function conciliar(eventos,contactos=[]){
 const vistos=new Set(),filas=[],indices=new Map();
 for(const e of eventos||[]){
  const f=interpretar(e),id=f.id||[f.fecha,f.titulo].join("|");
  if(vistos.has(id))continue;
  vistos.add(id);filas.push(f);
  if(f.estado.startsWith("excluir")||!f.tutor||!f.perros.length)continue;
  for(const perro of f.perros){
   const clave=normalizar(f.tutor)+"|"+normalizar(perro);
   if(!indices.has(clave))indices.set(clave,[]);
   indices.get(clave).push({fecha:f.fecha,estado:f.estado,id:f.id,requiereRevision:f.requiereRevision});
  }
 }
 const decisiones=contactos.map(c=>{
  const clave=normalizar(c.tutor)+"|"+normalizar(c.perro),coincidencias=indices.get(clave)||[];
  // Una coincidencia tentativa no autoriza contacto; una coincidencia futura bloquea invitación hasta revisión.
  const futuras=coincidencias.filter(x=>x.fecha&&(!c.fechaEvaluacion||x.fecha.slice(0,10)>=c.fechaEvaluacion));
  return {...c,estadoInvitacion:futuras.length?"bloqueado_reserva_o_precita":"revision_manual",coincidencias:futuras};
 });
 return {filas,revision:filas.filter(f=>f.requiereRevision),decisiones,resumen:{eventos:filas.length,requierenRevision:filas.filter(f=>f.requiereRevision).length}};
}
return {normalizar,estado,interpretar,conciliar};
});