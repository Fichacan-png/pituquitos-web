# Mi Pituquitos · Recepción — arquitectura de integración privada v1.3

Estado: **diseño técnico, no desplegado**. Fecha: 2026-11-02.

## Decisión

La aplicación de recepción debe estar separada del sitio comercial `pituquitospet.cl`. La rama de trabajo no se fusiona con `main` sin pruebas y autorización. El calendario «pituquitos agenda» es la fuente de reservas; los registros históricos verificados son la fuente de últimas atenciones. No convertir notas antiguas «pagado», «pendiente» o «confirmar abono» en confirmaciones de banco.

## Flujo previsto

1. Operadora inicia sesión en entorno privado, con sesión autenticada y acceso restringido.
2. Un servicio **servidor** autorizado por Google OAuth, con alcance mínimo `calendar.events.readonly`, consulta el calendario permitido. Las credenciales/tokens no se incluyen en HTML, JavaScript público, repositorio ni archivos exportados.
3. El servidor entrega a la interfaz solo los campos imprescindibles para detectar reserva: ID opaco, fecha/hora, estado de revisión y correspondencia de cliente. Evitar descripciones completas, teléfonos, montos y notas privadas salvo necesidad justificada.
4. La interfaz muestra fecha/hora de última consulta y estado de sincronización. Si hay fallo, caducidad o coincidencia ambigua: **no autorizar invitaciones**.
5. Para contactar: identificar tutor + perro con un identificador estable, comprobar reserva futura y conversación reciente, preparar mensaje editable, aprobación humana, y registrar envío **solo cuando exista confirmación de envío real**.
6. La conexión futura a WhatsApp Business Cloud API requiere configuración empresarial y plantillas aprobadas para mensajes iniciados por el negocio; el botón «Aprobar y copiar» no equivale a envío.

## Política de datos heredados

La responsable está limpiando registros futuros de noviembre/diciembre heredados de Diana. No modificar ni eliminar eventos automáticamente. Clasificar títulos ambiguos y precitas como **revisión humana**; si existe posible reserva, bloquear invitación hasta comprobarla. La ausencia de coincidencia por nombre **no prueba** que no haya reserva.

## Contrato mínimo del backend propuesto

`GET /api/recepcion/salud` → `{version,calendarConnected,lastSyncAt,stale}`.

`GET /api/recepcion/reservas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` → `{consultadoEn,calendarIdAlias,reservas:[{id,fecha,estado,identidadVerificada,requiereRevision}],advertencias}`. Requiere sesión autenticada; no aceptar un calendar ID arbitrario del cliente.

`POST /api/recepcion/revisiones` → registra decisiones de la operadora con auditoría, sin modificar Calendar.

No implementar estos endpoints sin elegir proveedor, mecanismo de autenticación, almacenamiento de tokens, política de retención y pruebas de acceso.

## Criterios de aceptación antes de producción

- Pruebas automáticas del adaptador pasan y hay pruebas con casos anónimos representativos.
- Una cuenta sin autorización recibe 401/403, no datos.
- La consulta a Calendar es de solo lectura; no hay scopes de escritura.
- Una falla de Calendar no habilita invitaciones.
- No se exponen datos personales ni tokens en el repositorio público.
- Reserva futura, precita, alias o coincidencia ambigua detienen la invitación hasta validación.
- No se modifica el sitio comercial ni se envía WhatsApp sin autorización explícita.
