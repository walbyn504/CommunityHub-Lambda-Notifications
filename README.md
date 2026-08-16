# CommunityHub Lambda Notifications

Funcion AWS Lambda que crea una notificacion interna para el organizador cuando
una actividad alcanza su capacidad maxima y la elimina cuando una cancelacion
vuelve a liberar un cupo.

## Contrato de entrada

```json
{
  "type": "EVENT_CAPACITY_REACHED",
  "eventId": "ObjectId como string",
  "organizerId": "ObjectId como string",
  "eventTitle": "Asamblea comunal",
  "maxCapacity": 50,
  "occurredAt": "2026-08-16T18:00:00.000Z"
}
```

Para retirar la notificacion cuando vuelve a existir espacio, el backend envia
el mismo contrato con `type: "EVENT_CAPACITY_AVAILABLE"`.

## Preparar paquete ZIP

```powershell
npm install
Compress-Archive -Path src,node_modules,package.json,package-lock.json -DestinationPath communityhub-capacity-notification.zip -Force
```

En AWS Lambda se debe configurar el handler `src/handler.handler` y las
variables `MONGODB_URI` y `MONGODB_DB_NAME`.
