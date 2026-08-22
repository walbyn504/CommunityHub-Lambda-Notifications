const connectDB = require('./database');

const REMINDER_TYPE = 'EVENT_REMINDER';

const getConfiguration = () => {
  const configuredHours = Number(process.env.REMINDER_WINDOW_HOURS || 24);
  const configuredOffset = process.env.EVENT_TIMEZONE_OFFSET || '-06:00';

  return {
    windowHours: Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 24,
    timezoneOffset: /^[+-]\d{2}:\d{2}$/.test(configuredOffset) ? configuredOffset : '-06:00',
  };
};

const eventDateTime = (activity, timezoneOffset) => {
  const date = activity.date.toISOString().slice(0, 10);
  const time = activity.time.slice(0, 5);
  return new Date(`${date}T${time}:00${timezoneOffset}`);
};

exports.handler = async () => {
  const { windowHours, timezoneOffset } = getConfiguration();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  // El margen cubre diferencias entre UTC y la zona horaria del evento. El
  // filtro exacto por fecha y hora se realiza despues en memoria.
  const firstDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastDate = new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000);
  firstDate.setUTCHours(0, 0, 0, 0);
  lastDate.setUTCHours(23, 59, 59, 999);

  const db = await connectDB();
  const events = db.collection('events');
  const registrations = db.collection('registrations');
  const notifications = db.collection('notifications');

  const candidates = await events.find({
    status: 'PUBLISHED',
    date: { $gte: firstDate, $lte: lastDate },
  }).project({ title: 1, date: 1, time: 1 }).toArray();

  const upcomingEvents = candidates
    .map((activity) => ({
      ...activity,
      startsAt: eventDateTime(activity, timezoneOffset),
    }))
    .filter((activity) => (
      !Number.isNaN(activity.startsAt.getTime())
      && activity.startsAt > now
      && activity.startsAt <= windowEnd
    ));

  if (upcomingEvents.length === 0) {
    return { checkedEvents: candidates.length, upcomingEvents: 0, createdNotifications: 0 };
  }

  const eventIds = upcomingEvents.map((activity) => activity._id);
  const confirmedRegistrations = await registrations.find({
    event: { $in: eventIds },
    status: 'CONFIRMED',
  }).project({ user: 1, event: 1 }).toArray();

  const eventsById = new Map(
    upcomingEvents.map((activity) => [activity._id.toString(), activity])
  );
  const nowForDocuments = new Date();
  const operations = confirmedRegistrations.map((registration) => {
    const activity = eventsById.get(registration.event.toString());
    const reminderFor = activity.startsAt;
    const date = activity.date.toISOString().slice(0, 10);

    return {
      updateOne: {
        filter: {
          user: registration.user,
          event: activity._id,
          type: REMINDER_TYPE,
          reminderFor,
        },
        update: {
          $setOnInsert: {
            user: registration.user,
            event: activity._id,
            type: REMINDER_TYPE,
            reminderFor,
            message: `Recordatorio: la actividad "${activity.title}" inicia el ${date} a las ${activity.time}.`,
            read: false,
            createdAt: nowForDocuments,
            updatedAt: nowForDocuments,
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length === 0) {
    return {
      checkedEvents: candidates.length,
      upcomingEvents: upcomingEvents.length,
      createdNotifications: 0,
    };
  }

  const result = await notifications.bulkWrite(operations, { ordered: false });

  return {
    checkedEvents: candidates.length,
    upcomingEvents: upcomingEvents.length,
    confirmedRegistrations: confirmedRegistrations.length,
    createdNotifications: result.upsertedCount,
  };
};
