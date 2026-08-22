# CommunityHub Lambda Notifications

Funciones AWS Lambda que generan notificaciones internas de CommunityHub:

- Capacidad completa para el organizador, invocada por el backend.
- Recordatorios de actividades proximas para participantes, ejecutados cada
  hora mediante Amazon EventBridge.

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

## Recordatorios de actividades

El handler `src/reminderHandler.handler` busca actividades `PUBLISHED` que
comienzan durante las proximas 24 horas. Para cada inscripcion `CONFIRMED`, crea
una notificacion `EVENT_REMINDER`. La combinacion de usuario, actividad y fecha
de inicio evita duplicados cuando EventBridge reintenta una ejecucion.

Variables configurables:

| Variable | Valor predeterminado | Descripcion |
| --- | --- | --- |
| `MONGODB_URI` | Requerida | Conexion a MongoDB. |
| `MONGODB_DB_NAME` | `communityhub` | Nombre de la base de datos. |
| `EVENT_TIMEZONE_OFFSET` | `-06:00` | Zona horaria de las actividades. |
| `REMINDER_WINDOW_HOURS` | `24` | Anticipacion del recordatorio. |

`template.yaml` declara ambas funciones y configura el recordatorio con
`rate(1 hour)`. MongoDB Atlas debe permitir conexiones desde la red utilizada
por Lambda.

## Despliegue con AWS SAM

```powershell
sam build
sam deploy --guided
```

Durante el despliegue se solicitan `MongoDbUri`, `MongoDbName`,
`EventTimezoneOffset` y `ReminderWindowHours`.
