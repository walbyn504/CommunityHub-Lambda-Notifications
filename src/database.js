const { MongoClient } = require('mongodb');

let clientPromise;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no esta configurada');
  }

  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'communityhub');
};

module.exports = connectDB;
