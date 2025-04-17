import { MongoClient, ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { connectToDatabase } from "./db";

const DB_NAME = "stemi-2dot0-dev";

// Seed data for the database
const physicians = [
  {
    _id: new ObjectId(),
    name: "Dr. John Smith",
    empId: "e1234",
    speciality: "Cardiology", 
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Dr. Sarah Johnson",
    empId: "e5678", 
    speciality: "Neurology",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Dr. Michael Chen",
    empId: "e9012", 
    speciality: "Pulmonology",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Dr. Jessica Martinez",
    empId: "e3456", 
    speciality: "Cardiology",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Dr. David Wilson",
    empId: "e7890", 
    speciality: "Emergency Medicine",
    active: true,
    lastActive: new Date()
  }
];

const nurses = [
  {
    _id: new ObjectId(),
    name: "Nurse Mary Brown",
    empId: "n1234", 
    nurseType: "ICU",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Nurse Robert Davis",
    empId: "n5678", 
    nurseType: "ER",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Nurse Emily Taylor",
    empId: "n9012", 
    nurseType: "Cardiology",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Nurse James Wilson",
    empId: "n3456", 
    nurseType: "ICU",
    active: true,
    lastActive: new Date()
  },
  {
    _id: new ObjectId(),
    name: "Nurse Sofia Rodriguez",
    empId: "n7890", 
    nurseType: "ER",
    active: true,
    lastActive: new Date()
  }
];

const patients = [
  {
    _id: new ObjectId(),
    firstName: "James",
    lastName: "Wilson",
    mrn: "MRN10001",
    caseId: "CASE20001",
    dob: "1975-05-15",
    admissionDate: new Date("2025-03-25"),
    status: "Admitted",
    condition: "Stable"
  },
  {
    _id: new ObjectId(),
    firstName: "Emma",
    lastName: "Garcia",
    mrn: "MRN10002",
    caseId: "CASE20002",
    dob: "1982-09-23",
    admissionDate: new Date("2025-04-01"),
    status: "Critical",
    condition: "Unstable"
  },
  {
    _id: new ObjectId(),
    firstName: "Michael",
    lastName: "Taylor",
    mrn: "MRN10003",
    caseId: "CASE20003",
    dob: "1968-11-07",
    admissionDate: new Date("2025-03-28"),
    status: "Stable",
    condition: "Recovering"
  }
];

export async function seedDatabase() {
  try {
    console.log("Starting database seeding process...");
    
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    
    // Check if collections exist, create them if they don't
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes("physicians")) {
      console.log("Creating physicians collection");
      await db.createCollection("physicians");
    }
    
    if (!collectionNames.includes("nurses")) {
      console.log("Creating nurses collection");
      await db.createCollection("nurses");
    }
    
    if (!collectionNames.includes("patients")) {
      console.log("Creating patients collection");
      await db.createCollection("patients");
    }
    
    // Check for existing data and update/insert as needed
    const physicianCount = await db.collection("physicians").countDocuments();
    const nurseCount = await db.collection("nurses").countDocuments();
    const patientCount = await db.collection("patients").countDocuments();
    
    // Handle physicians - update with all the new physicians
    if (physicianCount === 0) {
      console.log("Seeding physicians...");
      await db.collection("physicians").insertMany(physicians);
    } else if (physicianCount < physicians.length) {
      console.log(`Updating physicians collection from ${physicianCount} to ${physicians.length} documents`);
      
      // Delete existing physicians and insert the new expanded list
      await db.collection("physicians").deleteMany({});
      await db.collection("physicians").insertMany(physicians);
      console.log("Physician collection updated with more test users");
    } else {
      console.log(`Physicians collection already has ${physicianCount} documents`);
    }
    
    // Handle nurses - update with all the new nurses
    if (nurseCount === 0) {
      console.log("Seeding nurses...");
      await db.collection("nurses").insertMany(nurses);
    } else if (nurseCount < nurses.length) {
      console.log(`Updating nurses collection from ${nurseCount} to ${nurses.length} documents`);
      
      // Delete existing nurses and insert the new expanded list
      await db.collection("nurses").deleteMany({});
      await db.collection("nurses").insertMany(nurses);
      console.log("Nurse collection updated with more test users");
    } else {
      console.log(`Nurses collection already has ${nurseCount} documents`);
    }
    
    // Handle patients
    if (patientCount === 0) {
      console.log("Seeding patients...");
      await db.collection("patients").insertMany(patients);
    } else {
      console.log(`Patients collection already has ${patientCount} documents`);
    }
    
    console.log("Database seeding completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}