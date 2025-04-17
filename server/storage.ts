import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import { getCollection, getPhysicianByEmpId, getNurseByEmpId } from "./db";
import { ObjectId } from "mongodb";

// Import the MemoryStore directly (not the factory)
import MemoryStore from "memorystore";

// Define the session store type
type SessionStore = session.Store;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmpId(empId: string): Promise<any>;
  getAllPatients(): Promise<any[]>;
  getPatientById(id: string): Promise<any>;
  getPatientByCaseId(caseId: string): Promise<any>;
  getChannelByPatientId(patientId: string): Promise<any>; // Legacy method
  getChannelByCaseId(caseId: string): Promise<any>;
  createChannel(caseId: string): Promise<any>;
  getChannelById(channelId: string): Promise<any>;
  addMessageToChannel(channelId: string, message: any): Promise<any>;
  getChannelMessages(channelId: string): Promise<any[]>;
  addUserToChannel(channelId: string, empId: string, userType: string): Promise<any>;
  getStatusUpdates(patientId: string): Promise<any[]>;
  addStatusUpdate(statusUpdate: any): Promise<any>;
  getChannelMembers(channelId: string): Promise<any[]>;
  getPhysicians(): Promise<any[]>;
  getNurses(): Promise<any[]>;
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;
  sessionStore: SessionStore;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
    
    // For now, use a simple in-memory store without persistence
    // This is a temporary fix for the type issue
    this.sessionStore = new session.MemoryStore();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    // Ensure profileImage and specialty are explicitly set to null if not provided
    const user: User = { 
      ...insertUser, 
      id, 
      active: true,
      profileImage: insertUser.profileImage || null,
      specialty: insertUser.specialty || null
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmpId(empId: string): Promise<any> {
    try {
      // First try to find a physician
      const physician = await getPhysicianByEmpId(empId);
      if (physician) {
        return { ...physician, userType: 'physician' };
      }
      
      // Then try to find a nurse
      const nurse = await getNurseByEmpId(empId);
      if (nurse) {
        return { ...nurse, userType: 'nurse' };
      }
      
      return null;
    } catch (error) {
      console.error("Error in getUserByEmpId:", error);
      return null;
    }
  }

  async getAllPatients(): Promise<any[]> {
    try {
      const patientsCollection = await getCollection("patients");
      return patientsCollection.find({}).toArray();
    } catch (error) {
      console.error("Error in getAllPatients:", error);
      return [];
    }
  }

  async getPatientById(id: string): Promise<any> {
    try {
      const patientsCollection = await getCollection("patients");
      return patientsCollection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error in getPatientById:", error);
      return null;
    }
  }
  
  async getPatientByCaseId(caseId: string): Promise<any> {
    try {
      const patientsCollection = await getCollection("patients");
      return patientsCollection.findOne({ caseId });
    } catch (error) {
      console.error("Error in getPatientByCaseId:", error);
      return null;
    }
  }

  async getChannelByPatientId(patientId: string): Promise<any> {
    try {
      const channelsCollection = await getCollection("channels");
      return channelsCollection.findOne({ patientId });
    } catch (error) {
      console.error("Error in getChannelByPatientId:", error);
      return null;
    }
  }
  
  async getChannelByCaseId(caseId: string): Promise<any> {
    try {
      const channelsCollection = await getCollection("channels");
      return channelsCollection.findOne({ caseId });
    } catch (error) {
      console.error("Error in getChannelByCaseId:", error);
      return null;
    }
  }

  async createChannel(caseId: string): Promise<any> {
    try {
      const channelsCollection = await getCollection("channels");
      
      // Check if channel already exists with caseId
      const existingChannel = await this.getChannelByCaseId(caseId);
      if (existingChannel) {
        return existingChannel;
      }
      
      // Create new channel
      const newChannel = {
        caseId,
        createdAt: new Date(),
        members: []
      };
      
      const result = await channelsCollection.insertOne(newChannel);
      return { ...newChannel, _id: result.insertedId };
    } catch (error) {
      console.error("Error in createChannel:", error);
      return null;
    }
  }

  async addMessageToChannel(channelId: string, message: any): Promise<any> {
    try {
      const messagesCollection = await getCollection("messages");
      
      // Ensure we handle attachments properly
      const hasAttachments = message.attachments && message.attachments.length > 0;
      
      console.log("Adding message to channel with attachments:", {
        channelId,
        messageType: message.type,
        hasAttachments,
        attachmentsCount: hasAttachments ? message.attachments.length : 0
      });
      
      const newMessage = {
        ...message,
        channelId,
        // If message is of type 'attachment', make sure we preserve the type
        type: hasAttachments ? 'attachment' : (message.type || 'text'),
        createdAt: new Date()
      };
      
      console.log("Message object to be saved:", JSON.stringify(newMessage, null, 2));
      
      const result = await messagesCollection.insertOne(newMessage);
      const savedMessage = { ...newMessage, _id: result.insertedId };
      
      console.log("Message saved successfully with ID:", result.insertedId);
      
      return savedMessage;
    } catch (error) {
      console.error("Error in addMessageToChannel:", error);
      return null;
    }
  }

  async getChannelMessages(channelId: string): Promise<any[]> {
    try {
      const messagesCollection = await getCollection("messages");
      return messagesCollection.find({ channelId }).sort({ createdAt: 1 }).toArray();
    } catch (error) {
      console.error("Error in getChannelMessages:", error);
      return [];
    }
  }

  async addUserToChannel(channelId: string, empId: string, userType: string): Promise<any> {
    try {
      const channelsCollection = await getCollection("channels");
      
      // Add member to channel if not already a member
      await channelsCollection.updateOne(
        { _id: new ObjectId(channelId) },
        { 
          $addToSet: { 
            members: { 
              empId, 
              userType, 
              joinedAt: new Date() 
            } 
          } 
        }
      );
      
      return this.getChannelById(channelId);
    } catch (error) {
      console.error("Error in addUserToChannel:", error);
      return null;
    }
  }

  async getChannelById(channelId: string): Promise<any> {
    try {
      const channelsCollection = await getCollection("channels");
      return channelsCollection.findOne({ _id: new ObjectId(channelId) });
    } catch (error) {
      console.error("Error in getChannelById:", error);
      return null;
    }
  }

  async getStatusUpdates(patientId: string): Promise<any[]> {
    try {
      const statusUpdatesCollection = await getCollection("statusUpdates");
      return statusUpdatesCollection.find({ patientId }).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error("Error in getStatusUpdates:", error);
      return [];
    }
  }

  async addStatusUpdate(statusUpdate: any): Promise<any> {
    try {
      const statusUpdatesCollection = await getCollection("statusUpdates");
      const newStatusUpdate = {
        ...statusUpdate,
        createdAt: new Date()
      };
      
      const result = await statusUpdatesCollection.insertOne(newStatusUpdate);
      return { ...newStatusUpdate, _id: result.insertedId };
    } catch (error) {
      console.error("Error in addStatusUpdate:", error);
      return null;
    }
  }

  async getChannelMembers(channelId: string): Promise<any[]> {
    try {
      const channel = await this.getChannelById(channelId);
      if (!channel || !channel.members) {
        return [];
      }
      
      // Get full user data for each member
      const members = [];
      for (const member of channel.members) {
        let userData;
        if (member.userType === 'physician') {
          userData = await getCollection("physicians").then(c => 
            c.findOne({ empId: member.empId })
          );
        } else if (member.userType === 'nurse') {
          userData = await getCollection("nurses").then(c => 
            c.findOne({ empId: member.empId })
          );
        }
        
        if (userData) {
          members.push({
            ...userData,
            userType: member.userType,
            joinedAt: member.joinedAt
          });
        }
      }
      
      return members;
    } catch (error) {
      console.error("Error in getChannelMembers:", error);
      return [];
    }
  }

  async getPhysicians(): Promise<any[]> {
    try {
      const physiciansCollection = await getCollection("physicians");
      return physiciansCollection.find({}).toArray();
    } catch (error) {
      console.error("Error in getPhysicians:", error);
      return [];
    }
  }

  async getNurses(): Promise<any[]> {
    try {
      const nursesCollection = await getCollection("nurses");
      return nursesCollection.find({}).toArray();
    } catch (error) {
      console.error("Error in getNurses:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
