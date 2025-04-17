import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebsocket } from "./websocket";
import { setupAuth } from "./auth";
import { generateRtcToken, getAgoraConfig } from "./agora";
import { connectToDatabase } from "./db";

// Connect to MongoDB when server starts
connectToDatabase().catch(console.error);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server with extensive logging
  console.log("Setting up HTTP server and WebSocket connection");
  const wss = setupWebsocket(httpServer);
  
  // Add WebSocket server status check endpoint
  app.get("/api/ws-status", (req, res) => {
    const clientCount = wss.clients.size;
    console.log(`WebSocket status check: ${clientCount} clients connected`);
    res.json({ 
      wsServerRunning: true,
      clientCount,
      path: '/ws'
    });
  });
  
  // API routes
  // Physicians and Nurses API
  app.get("/api/physicians", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const physicians = await storage.getPhysicians();
      res.json(physicians);
    } catch (error) {
      console.error("Error fetching physicians:", error);
      res.status(500).json({ message: "Failed to fetch physicians" });
    }
  });
  
  app.get("/api/nurses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const nurses = await storage.getNurses();
      res.json(nurses);
    } catch (error) {
      console.error("Error fetching nurses:", error);
      res.status(500).json({ message: "Failed to fetch nurses" });
    }
  });
  
  // Patients API
  app.get("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });
  
  app.get("/api/patients/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const patient = await storage.getPatientById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });
  
  // Look up a patient by caseId
  app.get("/api/patients/case/:caseId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { caseId } = req.params;
      const patient = await storage.getPatientByCaseId(caseId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found with given case ID" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient by case ID:", error);
      res.status(500).json({ message: "Failed to fetch patient by case ID" });
    }
  });
  
  // Chat Channel API - using caseId from patient
  app.get("/api/channels/patient/:patientId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { patientId } = req.params;
      
      // First try to get the patient to extract the caseId
      const patient = await storage.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const caseId = patient.caseId;
      if (!caseId) {
        return res.status(400).json({ message: "Patient does not have a valid caseId" });
      }
      
      // Get channel by caseId or create if it doesn't exist
      let channel = await storage.getChannelByCaseId(caseId);
      
      // Create channel if it doesn't exist
      if (!channel) {
        channel = await storage.createChannel(caseId);
      }
      
      if (!channel) {
        return res.status(500).json({ message: "Failed to get or create channel" });
      }
      
      res.json(channel);
    } catch (error) {
      console.error("Error with channel:", error);
      res.status(500).json({ message: "Failed to process channel request" });
    }
  });
  
  app.post("/api/channels/:channelId/join", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channelId } = req.params;
      // Use empId instead of userId - empId is stored in the auth user record
      const empId = req.user?.empId;
      const userType = req.user?.role;
      
      if (!empId || !userType) {
        return res.status(400).json({ message: "Invalid user data or missing empId" });
      }
      
      const channel = await storage.addUserToChannel(channelId, empId, userType);
      
      res.json(channel);
    } catch (error) {
      console.error("Error joining channel:", error);
      res.status(500).json({ message: "Failed to join channel" });
    }
  });
  
  app.get("/api/channels/:channelId/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channelId } = req.params;
      const messages = await storage.getChannelMessages(channelId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Get channel details by ID (specific endpoint to avoid conflicts with other routes)
  app.get("/api/channels/detail/:channelId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channelId } = req.params;
      const channel = await storage.getChannelById(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      res.json(channel);
    } catch (error) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });
  
  app.get("/api/channels/:channelId/members", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channelId } = req.params;
      const members = await storage.getChannelMembers(channelId);
      
      res.json(members);
    } catch (error) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ message: "Failed to fetch channel members" });
    }
  });
  
  app.post("/api/channels/:channelId/members", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channelId } = req.params;
      // Use empId instead of userId
      const { empId, userType } = req.body;
      
      if (!empId || !userType) {
        return res.status(400).json({ message: "Employee ID (empId) and user type are required" });
      }
      
      // Validate userType is either 'physician' or 'nurse'
      if (userType !== 'physician' && userType !== 'nurse') {
        return res.status(400).json({ message: "User type must be either 'physician' or 'nurse'" });
      }
      
      // Add member to channel using empId
      const result = await storage.addUserToChannel(channelId, empId, userType);
      
      if (!result) {
        return res.status(500).json({ message: "Failed to add member to channel" });
      }
      
      res.status(201).json({ 
        message: "Member added successfully",
        channelId,
        empId,
        userType
      });
    } catch (error) {
      console.error("Error adding member to channel:", error);
      res.status(500).json({ 
        message: "Failed to add member to channel",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Status Updates API
  app.get("/api/patients/:patientId/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { patientId } = req.params;
      const statusUpdates = await storage.getStatusUpdates(patientId);
      
      res.json(statusUpdates);
    } catch (error) {
      console.error("Error fetching status updates:", error);
      res.status(500).json({ message: "Failed to fetch status updates" });
    }
  });
  
  app.post("/api/patients/:patientId/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { patientId } = req.params;
      const { status, location, details } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const statusUpdate = await storage.addStatusUpdate({
        patientId,
        status,
        createdBy: req.user?.id,
        location,
        details
      });
      
      res.status(201).json(statusUpdate);
    } catch (error) {
      console.error("Error creating status update:", error);
      res.status(500).json({ message: "Failed to create status update" });
    }
  });
  
  // Agora Token API with enhanced error handling and logging
  app.get("/api/agora/token", (req, res) => {
    try {
      console.log("Agora token request received:", { 
        query: req.query,
        auth: req.isAuthenticated(),
        user: req.user?.id
      });
      
      if (!req.isAuthenticated()) {
        console.warn("Unauthenticated token request rejected");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { channel, uid } = req.query;
      
      // Better input validation with detailed error messages
      if (!channel) {
        console.warn("Token request missing channel parameter");
        return res.status(400).json({ message: "Channel name is required" });
      }
      
      // Make UID optional - will be assigned by Agora if not provided
      let parsedUid: number | null = null;
      
      if (uid) {
        try {
          parsedUid = Number(uid);
          if (isNaN(parsedUid)) {
            console.warn(`Invalid UID format: ${uid}`);
            return res.status(400).json({ message: "UID must be a number if provided" });
          }
        } catch (parseError) {
          console.warn(`Error parsing UID: ${uid}`, parseError);
          return res.status(400).json({ message: "Invalid UID format" });
        }
      }
      
      // Generate token with appropriate UID
      const token = parsedUid !== null 
        ? generateRtcToken(channel as string, parsedUid) 
        : generateRtcToken(channel as string, 0);
      
      console.log(`Generated Agora token for channel: ${channel}, UID: ${parsedUid || 'auto-assigned'}`);
      
      // Return all necessary info for the client
      res.json({
        token,
        appId: getAgoraConfig().appId,
        uid: parsedUid,
        channel: channel
      });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      res.status(500).json({ 
        message: "Failed to generate token",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  return httpServer;
}
