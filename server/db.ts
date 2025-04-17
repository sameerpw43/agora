import { MongoClient, ObjectId } from "mongodb";



const uri = process.env.MONGODB_URI || "mongodb+srv://mahendar:mahendar1234@stemi-2dot0-dev.5dpfq.mongodb.net/?retryWrites=true&w=majority&appName=stemi-2dot0-dev";
const dbName = process.env.MONGODB_DB || "stemi-2dot0-dev";

let client: MongoClient | null = null;

export async function connectToDatabase() {
  if (client) return client;

  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB successfully");
    return client;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function getCollection(collectionName: string) {
  const client = await connectToDatabase();
  return client.db(dbName).collection(collectionName);
}

export async function getPhysicians() {
  const collection = await getCollection("physicians");
  return collection.find({ active: true }).toArray();
}

export async function getPhysicianById(id: string) {
  const collection = await getCollection("physicians");
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function getPhysicianByEmpId(empId: string) {
  const collection = await getCollection("physicians");
  return collection.findOne({ empId });
}

export async function getNurses() {
  const collection = await getCollection("nurses");
  return collection.find({ active: true }).toArray();
}

export async function getNurseById(id: string) {
  const collection = await getCollection("nurses");
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function getNurseByEmpId(empId: string) {
  const collection = await getCollection("nurses");
  return collection.findOne({ empId });
}

export async function getPatients() {
  const collection = await getCollection("patients");
  return collection.find().toArray();
}

export async function getPatientById(id: string) {
  const collection = await getCollection("patients");
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function getPatientByCaseId(caseId: string) {
  const collection = await getCollection("patients");
  return collection.findOne({ caseId });
}

export async function createMessage(message: any) {
  const collection = await getCollection("messages");
  const result = await collection.insertOne(message);
  return { ...message, _id: result.insertedId };
}

export async function getMessages(channelId: string) {
  const collection = await getCollection("messages");
  return collection.find({ channelId }).sort({ createdAt: 1 }).toArray();
}

export async function createStatusUpdate(statusUpdate: any) {
  const collection = await getCollection("statusUpdates");
  const result = await collection.insertOne({
    ...statusUpdate,
    createdAt: new Date()
  });
  return { ...statusUpdate, _id: result.insertedId, createdAt: new Date() };
}

export async function getStatusUpdates(patientId: string) {
  const collection = await getCollection("statusUpdates");
  return collection.find({ patientId }).sort({ createdAt: -1 }).toArray();
}

export async function createChannel(caseId: string) {
  const collection = await getCollection("channels");
  const existing = await collection.findOne({ caseId });
  
  if (existing) {
    return existing;
  }
  
  const result = await collection.insertOne({
    caseId,
    createdAt: new Date(),
    members: []
  });
  
  return { _id: result.insertedId, caseId, createdAt: new Date(), members: [] };
}

export async function getChannelByCaseId(caseId: string) {
  const collection = await getCollection("channels");
  return collection.findOne({ caseId });
}

// Keep this function for backward compatibility during transition
export async function getChannelByPatientId(patientId: string) {
  // In the transition period, first try to find by patientId
  const collection = await getCollection("channels");
  const byPatientId = await collection.findOne({ patientId });
  if (byPatientId) return byPatientId;
  
  // If not found, try to look up patient by ID and get caseId
  try {
    const patient = await getPatientById(patientId);
    if (patient && patient.caseId) {
      return getChannelByCaseId(patient.caseId);
    }
  } catch (error) {
    console.error("Error finding channel by patientId:", error);
  }
  
  return null;
}

export async function addMemberToChannel(channelId: string, empId: string, userType: 'physician' | 'nurse') {
  const collection = await getCollection("channels");
  await collection.updateOne(
    { _id: new ObjectId(channelId) },
    { $addToSet: { members: { empId, userType, joinedAt: new Date() } } }
  );
  
  return getChannelById(channelId);
}

export async function getChannelById(channelId: string) {
  const collection = await getCollection("channels");
  return collection.findOne({ _id: new ObjectId(channelId) });
}
