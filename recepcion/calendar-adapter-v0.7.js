/* Mi Pituquitos · Recepción — Calendar adapter v0.7 (solo lectura)
 * No incluye credenciales, llamadas API ni datos de clientes.
 * Input: eventos de Calendar previamente autorizados.
 * Output: reservas con identificación conservadora y exclusiones para revisión.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.PituquitosCalendarAdapter=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const unique=a=>Array.from(new Set(a));
function classify(event){
 const title=String(event.summary||"");
 const desc=String(event.description||"");
 const full=norm(title+" "+desc);
 if(/\b(no asistio|inasistencia|no vino|no se presento)\b/.test(full))return "no_asistio";
 if(/\b(reagendar|reprogramar|cancelad[oa])\b/.test(full)||event.status==="cancelled")return "revisar_no_confirmada";
 if(/\b(confirmar cita|por confirmar|confirmar abono|sin abono|pre cita|precita)\b/.test(full))return "pendiente_confirmacion";
 return "reserva_en_calendar";
}
function parse(event){
 const title=String(event.summary||"").trim();
 const parts=title.split("/").map(s=>s.trim()).filter(Boolean);
 // Los títulos con comas, varios perros o campos ambiguos NO se atribuyen automáticamente.
 const simple=parts.length>=2 && !title.includes(",") && !/\s+y\s+/i.test(parts[1]) && !/\b(pagado|pendiente|exento|confirmar)\b/i.test(parts[1]);
 const tutor=simple?parts[0]:null;
 const perro=simple?parts[1]:null;
 const date=typeof event.start==="string"?event.start:(event.start?.dateTime||event.start?.date||null);
 return {id:event.id||null,fecha:date,titulo:title,estado:classify(event),tutor,perro,clave:simple?norm(tutor)+"|"+norm(perro):null,requiereRevision:!simple};
}
function reconcile(events){
 const seen=new Set();
 const rows=[];
 for(const event of events||[]){
  const row=parse(event);
  const identity=row.id||[row.fecha,row.titulo].join("|");
  if(seen.has(identity))continue;
  seen.add(identity);rows.push(row);
 }
 return {rows,revision:rows.filter(r=>r.requiereRevision||r.estado!=="reserva_en_calendar"),reservaPorClave:Object.fromEntries(unique(rows.filter(r=>r.clave&&r.estado==="reserva_en_calendar").map(r=>r.clave)).map(k=>[k,rows.filter(r=>r.clave===k&&r.estado==="reserva_en_calendar").map(r=>r.fecha)]))};
}
return {normalizar:norm,clasificar:classify,interpretar:parse,conciliar:reconcile};
});
