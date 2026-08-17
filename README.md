# CommunityHub Lambda Notifications

Funcion AWS Lambda que crea una notificacion interna para el organizador cada
vez que una actividad alcanza su capacidad maxima. Las notificaciones se
conservan como historial aunque posteriormente vuelva a existir espacio.

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

Cuando vuelve a existir espacio, el backend envia el mismo contrato con
`type: "EVENT_CAPACITY_AVAILABLE"`. La Lambda acepta el evento, pero no elimina
la notificacion anterior.

`occurredAt` identifica el ciclo de cupo lleno. Los reintentos de AWS con el
mismo valor no crean duplicados; si la actividad vuelve a llenarse, el nuevo
valor permite crear otra notificacion y conservar ambas en el historial.

## Preparar paquete ZIP

```powershell
npm install
Compress-Archive -Path src,node_modules,package.json,package-lock.json -DestinationPath communityhub-capacity-notification.zip -Force
```

En AWS Lambda se debe configurar el handler `src/handler.handler` y las
variables `MONGODB_URI` y `MONGODB_DB_NAME`.
