import { MongoClient, type MongoClientOptions } from 'mongodb';

// URL-encode any '#' in the URI to avoid parsing errors
const rawUri = process.env.MONGODB_URI!;
if (!rawUri) {
  throw new Error('Please add your Mongo URI to .env.local');
}
const uri = rawUri.replace(/#/g, '%23');

const options: MongoClientOptions = {
  tls: true,
  tlsAllowInvalidCertificates: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function connectToDB() {
  const client = await clientPromise;
  return client.db('kofa'); // Replace 'kofa' with your DB name if needed
}