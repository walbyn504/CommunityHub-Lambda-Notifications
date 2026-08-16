const { ObjectId } = require('mongodb');
const connectDB = require('./database');

const CAPACITY_EVENT_TYPE = 'EVENT_CAPACITY_REACHED';

exports.handler = async (event) => {
  const {
    type,
    eventId,
    organizerId,
    eventTitle,
    maxCapacity,
    occurredAt,
  } = event || {};

  if (type !== CAPACITY_EVENT_TYPE) {
    throw new Error('Tipo de evento no soportado');
  }

  if (!ObjectId.isValid(eventId) || !ObjectId.isValid(organizerId)) {
    throw new Error('Los identificadores recibidos no son validos');
  }

  if (!eventTitle || !Number.isInteger(maxCapacity) || maxCapacity < 1) {
    throw new Error('Los datos de la actividad no son validos');
  }

  const db = await connectDB();
  const notifications = db.collection('notifications');
  const now = new Date();

  // El filtro hace idempotente la funcion ante reintentos asincronos de AWS.
  const filter = {
    user: new ObjectId(organizerId),
    event: new ObjectId(eventId),
    type: CAPACITY_EVENT_TYPE,
  };

  const result = await notifications.updateOne(
    filter,
    {
      $setOnInsert: {
        ...filter,
        message: `La actividad "${eventTitle}" alcanzo su capacidad maxima de ${maxCapacity} participantes.`,
        read: false,
        occurredAt: occurredAt ? new Date(occurredAt) : now,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return {
    created: result.upsertedCount === 1,
    message: result.upsertedCount === 1
      ? 'Notificacion creada correctamente'
      : 'La notificacion ya existia',
  };
};
