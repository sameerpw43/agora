import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "./storage";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  empId?: string;
  username?: string;
  channelId?: string;
  isAlive?: boolean;
}

interface Attachment {
  type: string; // 'image' | 'document' | 'audio' | 'video'
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

// Incoming attachment may not have all required fields
interface IncomingAttachment {
  type?: string;
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

interface ChatMessage {
  type: string;
  channelId: string;
  senderId: string; // Always use string for senderId to support empId
  senderName: string;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

interface SystemMessage {
  type: string;
  channelId: string;
  content: string;
  timestamp: Date;
}

interface StatusUpdateMessage {
  type: string;
  patientId: string;
  status: string;
  createdBy: string; // Changed from number to string to support empId
  createdByName: string;
  location?: string;
  details?: string;
  timestamp: Date;
}

interface CallMessage {
  type: string;
  channelId: string;
  callerId: string; // Changed from number to string to support empId
  callerName: string;
  callType: 'voice' | 'video';
  action: 'start' | 'end' | 'join' | 'leave';
  targetUsers?: string[]; // Optional array of user IDs to target specific users
}

export const setupWebsocket = (server: Server) => {
  console.log("Setting up WebSocket server on path: /ws");
  
  // Define WebSocket server with more explicit options
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    // Increase timeout values for better connection handling
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Other options settable:
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  });
  
  wss.on('listening', () => {
    console.log("WebSocket server is now listening for connections");
  });
  
  wss.on('error', (error) => {
    console.error("WebSocket server error:", error);
  });
  
  // Handle basic ping messages for testing
  wss.on('connection', (socket) => {
    console.log("New WebSocket connection established");
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Simple ping-pong for testing connectivity
        if (message.type === 'ping') {
          console.log("Received ping message, responding with pong");
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        console.error("Error parsing WebSocket test message:", err);
      }
    });
    
    // Send a welcome message
    socket.send(JSON.stringify({ 
      type: 'welcome', 
      message: 'Connected to WebSocket server',
      timestamp: new Date().toISOString()
    }));
  });
  
  // Store connected clients by channel
  const channels: Map<string, ExtendedWebSocket[]> = new Map();
  
  const broadcast = (channelId: string, data: any) => {
    const clients = channels.get(channelId) || [];
    
    // Debug message content - especially for attachments
    if (data.type === 'attachment' || (data.attachments && data.attachments.length > 0)) {
      console.log(`Broadcasting ${data.type} message to ${clients.length} clients in channel ${channelId}:`, {
        messageType: data.type,
        hasAttachments: !!data.attachments,
        attachmentsCount: data.attachments?.length || 0,
        // Only log first attachment for debugging
        sampleAttachment: data.attachments?.[0] ? {
          type: data.attachments[0].type,
          url: data.attachments[0].url,
          name: data.attachments[0].name
        } : null
      });
    } else {
      console.log(`Broadcasting ${data.type} message to ${clients.length} clients in channel ${channelId}`);
    }
    
    // Serialize message only once
    const message = JSON.stringify(data);
    
    // Count successful sends for debugging
    let sentCount = 0;
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (err) {
          console.error(`Error sending message to client:`, err);
        }
      }
    });
    
    console.log(`Successfully sent message to ${sentCount}/${clients.length} clients`);
  };
  
  const heartbeat = () => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  };
  
  const interval = setInterval(heartbeat, 30000);
  
  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'auth': {
            // Store both identifiers for compatibility, but empId is the primary identifier
            ws.empId = data.empId;
            ws.userId = data.userId || null;
            ws.username = data.username;
            console.log(`WebSocket authenticated: empId=${ws.empId}, username=${ws.username}`);
            
            // Broadcast online status when a user connects
            if (ws.empId) {
              console.log(`User ${ws.username} (${ws.empId}) is now online`);
              
              // Broadcast online status to all connected clients
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'userStatus',
                    empId: ws.empId,
                    username: ws.username,
                    status: 'online',
                    inCall: false,
                    timestamp: new Date()
                  }));
                }
              });
            }
            
            break;
          }
          
          case 'join': {
            const channelId = data.channelId;
            ws.channelId = channelId;
            
            // Add to channel clients
            if (!channels.has(channelId)) {
              channels.set(channelId, []);
            }
            channels.get(channelId)?.push(ws);
            
            // Send history messages
            console.log(`Fetching history messages for channel ${channelId}`);
            const messages = await storage.getChannelMessages(channelId);
            console.log(`Found ${messages.length} history messages for channel ${channelId}`);
            
            // Ensure all messages have proper formatted timestamps
            const formattedMessages = messages.map(msg => ({
              ...msg,
              createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt
            }));
            
            console.log('Sending history batch to client');
            ws.send(JSON.stringify({
              type: 'history',
              messages: formattedMessages
            }));
            
            // Send status updates
            const patient = await storage.getPatientById(data.patientId);
            if (patient) {
              console.log(`Fetching status updates for patient ${data.patientId}`);
              const statusUpdates = await storage.getStatusUpdates(data.patientId);
              console.log(`Found ${statusUpdates.length} status updates for patient ${data.patientId}`);
              
              // Ensure all status updates have proper formatted timestamps
              const formattedUpdates = statusUpdates.map(update => ({
                ...update,
                createdAt: update.createdAt instanceof Date ? update.createdAt.toISOString() : update.createdAt
              }));
              
              console.log('Sending status updates batch to client');
              ws.send(JSON.stringify({
                type: 'statusUpdates',
                updates: formattedUpdates
              }));
            }
            
            // Broadcast join message
            const systemMessage: SystemMessage = {
              type: 'system',
              channelId,
              content: `${data.username} has joined the channel`,
              timestamp: new Date()
            };
            
            broadcast(channelId, systemMessage);
            
            // Store the join message
            await storage.addMessageToChannel(channelId, {
              type: 'system',
              senderId: ws.empId || ws.userId?.toString(), // Prefer empId but fall back to userId as string
              content: `${data.username} has joined the channel`,
              createdAt: new Date()
            });
            
            break;
          }
          
          case 'message': 
          case 'attachment': {
            const { channelId, content, attachments } = data;
            // Use empId as primary identifier, falling back to userId if needed
            if ((!ws.empId && !ws.userId) || !channelId) break;
            
            // Determine if this is an attachment message by checking both the type and attachments
            const isAttachment = data.type === 'attachment' || (attachments && attachments.length > 0);
            
            // Log full attachment details for debugging
            console.log("Processing message with attachments:", {
              type: data.type,
              hasAttachments: isAttachment,
              attachmentsCount: attachments?.length || 0,
              attachments: attachments ? JSON.stringify(attachments) : 'none'
            });
            
            // Ensure attachments are in the correct format
            const formattedAttachments = attachments && attachments.length > 0 
              ? attachments.map((att: { 
                  type?: string; 
                  url: string; 
                  name?: string; 
                  size?: number; 
                  mimeType?: string; 
                  thumbnailUrl?: string; 
                }) => ({
                  type: att.type || 'image',  // Default to image if type is missing
                  url: att.url,
                  name: att.name || 'file',   // Default name if missing
                  size: att.size,
                  mimeType: att.mimeType,
                  thumbnailUrl: att.thumbnailUrl
                }))
              : undefined;
              
            // Ensure we have a valid senderId string
            const senderId = ws.empId || (ws.userId ? ws.userId.toString() : '0');
            
            // Create message object with proper typing for attachments
            const chatMessage: ChatMessage = {
              type: isAttachment ? 'attachment' : 'message',
              channelId,
              senderId, // Use the pre-validated string value
              senderName: ws.username || 'Unknown User',
              content,
              timestamp: new Date(),
              attachments: formattedAttachments
            };
            
            console.log("Final message object to broadcast:", chatMessage);
            
            // Store in database - use the same formatted attachments
            const savedMessage = await storage.addMessageToChannel(channelId, {
              type: isAttachment ? 'attachment' : 'text',
              senderId: ws.empId || ws.userId?.toString(), // Prefer empId but fall back to userId as string
              content,
              attachments: formattedAttachments, // Use the formatted attachments to ensure consistency
              createdAt: new Date()
            });
            
            console.log("Message saved to database:", savedMessage);
            
            // Broadcast to all clients in channel
            broadcast(channelId, chatMessage);
            break;
          }
          
          case 'statusUpdate': {
            const { patientId, status, location, details } = data;
            // Use empId as primary identifier, falling back to userId if needed
            if ((!ws.empId && !ws.userId) || !patientId) break;
            
            // Create status update
            const statusUpdate = await storage.addStatusUpdate({
              patientId,
              status,
              createdBy: ws.empId || ws.userId?.toString(), // Prefer empId but fall back to userId as string
              location,
              details
            });
            
            // Broadcast to all relevant channels
            const channel = await storage.getChannelByPatientId(patientId);
            if (channel) {
              // Ensure we have a valid createdBy string
              const createdBy = ws.empId || (ws.userId ? ws.userId.toString() : '0');
              
              const statusMessage: StatusUpdateMessage = {
                type: 'statusUpdate',
                patientId,
                status,
                createdBy,
                createdByName: ws.username || 'Unknown User',
                location,
                details,
                timestamp: new Date()
              };
              
              broadcast(channel._id.toString(), statusMessage);
            }
            break;
          }
          
          case 'callInvitationResponse': {
            const { channelId, callType, inviterId, responderId, responderName, response } = data;
            
            if (!inviterId) {
              console.error("Invalid call invitation response - missing inviterId:", data);
              break;
            }
            
            // Use empId as primary identifier (with fallback to userId for backward compatibility)
            console.log(`Received ${response} response from user ${ws.empId || ws.userId} (${ws.username || 'Unknown'}) to call invitation from user ${inviterId} for channel ${channelId}`);
            
            // Find the original inviter's WebSocket
            let inviterClient: ExtendedWebSocket | undefined;
            
            console.log(`Searching for inviter with ID: ${inviterId}`);
            wss.clients.forEach((client: ExtendedWebSocket) => {
              // Check for both empId (primary) and userId (fallback)
              const clientEmpId = client.empId;
              const clientIdStr = client.userId?.toString();
              const inviterIdStr = inviterId.toString();
              
              // Match on either empId (preferred) or userId
              if (client.readyState === WebSocket.OPEN && 
                  ((clientEmpId && clientEmpId === inviterId) || 
                   (clientIdStr && clientIdStr === inviterIdStr))) {
                inviterClient = client;
                console.log(`Found matching inviter client: ${client.username} (ID: ${client.empId || client.userId})`);
              }
            });
            
            if (inviterClient) {
              // Forward the response to the original inviter
              const responseMessage = {
                type: 'callInvitationResponse',
                channelId,
                callType,
                responderId: ws.empId || (ws.userId ? ws.userId.toString() : '0'),
                responderName: ws.username || responderName || 'Unknown User',
                response,
                timestamp: new Date().toISOString()
              };
              
              try {
                console.log(`Sending response to inviter: ${JSON.stringify(responseMessage)}`);
                inviterClient.send(JSON.stringify(responseMessage));
                console.log(`Successfully sent ${response} response to inviter ${inviterId}`);
                
                // If the response is "decline", notify the channel that the call was declined
                if (response === 'decline') {
                  // No need to broadcast, only the inviter needs to know
                }
              } catch (err) {
                console.error(`Error forwarding call invitation response to inviter ${inviterId}:`, err);
              }
            } else {
              console.warn(`Inviter ${inviterId} not found or not connected to receive response`);
              
              // If the inviter is no longer connected and this was a decline, inform the channel
              if (response === 'decline') {
                // No need to do anything special, the call should end on its own when inviter disconnects
              }
            }
            
            break;
          }
          
          case 'callInvitation': {
            const { channelId, callType, targetUserId, inviterId, inviterName } = data;
            // Use data properties if available, otherwise use WebSocket properties
            const senderEmpId = inviterId || ws.empId || (ws.userId ? ws.userId.toString() : '0');
            const senderName = inviterName || ws.username;
            
            if (!senderEmpId || !channelId || !targetUserId) {
              console.error("Invalid call invitation data:", data);
              break;
            }
            
            console.log(`Received call invitation from user ${senderEmpId} (${senderName}) to user ${targetUserId} for ${callType} call in channel ${channelId}`);
            
            // Find all WebSocket connections in all channels
            let targetClient: ExtendedWebSocket | undefined;
            let targetFound = false;
            
            console.log(`Searching for target user with ID: ${targetUserId}`);
            // Log all connected clients for debugging
            wss.clients.forEach((client: ExtendedWebSocket) => {
              console.log(`Connected client: empId=${client.empId}, userId=${client.userId}, username=${client.username}, readyState=${client.readyState === WebSocket.OPEN ? 'OPEN' : 'NOT_OPEN'}`);
              
              // Try both empId and userId matching
              const clientEmpId = client.empId;
              const clientIdStr = client.userId?.toString();
              const targetIdStr = targetUserId.toString();
              
              if (client.readyState === WebSocket.OPEN && 
                 ((clientEmpId && clientEmpId === targetUserId) || 
                  (clientIdStr && clientIdStr === targetIdStr))) {
                targetFound = true;
                targetClient = client;
                console.log(`Found matching target client: ${client.username} (empId=${client.empId}, userId=${client.userId})`);
              }
            });
            
            if (!targetFound) {
              console.warn(`No matching client found for target user ID: ${targetUserId}`);
            }
            
            if (targetClient) {
              // Prepare invitation message with all required data
              const invitationMessage = {
                type: 'callInvitation',
                channelId,
                callType,
                inviterId: senderEmpId,
                inviterName: senderName || 'Unknown User',
                timestamp: new Date().toISOString()
              };
              
              try {
                console.log(`Sending invitation to target: ${JSON.stringify(invitationMessage)}`);
                targetClient.send(JSON.stringify(invitationMessage));
                console.log(`Successfully sent call invitation to user ${targetUserId}`);
              } catch (err) {
                console.error(`Error sending call invitation to user ${targetUserId}:`, err);
              }
            } else {
              console.warn(`Target user ${targetUserId} not found or not connected for call invitation`);
            }
            
            break;
          }
          
          case 'userStatus': {
            const { status, inCall, timestamp } = data;
            
            // Validate the sender has authenticated
            if (!ws.empId && !ws.userId) break;
            
            // Get sender details
            const empId = ws.empId || (ws.userId ? ws.userId.toString() : '0');
            const username = ws.username || 'Unknown User';
            
            console.log(`User status update from ${username} (${empId}): ${status}${inCall ? ', in call' : ''}`);
            
            // Broadcast user status to all connected clients
            wss.clients.forEach((client: ExtendedWebSocket) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'userStatus',
                  empId,
                  username,
                  status,
                  inCall,
                  timestamp: timestamp || new Date(),
                  lastSeen: status === 'offline' ? new Date() : undefined
                }));
              }
            });
            
            break;
          }
          
          case 'callSignal': {
            const { channelId, callType, action, targetUsers } = data;
            // Use empId as primary identifier, falling back to userId if needed
            if ((!ws.empId && !ws.userId) || !channelId) break;
            
            const callMessage: CallMessage = {
              type: 'callSignal',
              channelId,
              callerId: ws.empId || (ws.userId ? ws.userId.toString() : '0'),
              callerName: ws.username || 'Unknown User',
              callType,
              action
            };
            
            // If there are target users, only send to those specific users
            if (targetUsers && Array.isArray(targetUsers) && targetUsers.length > 0) {
              console.log(`Targeted call invitation to ${targetUsers.length} users`);
              
              const clients = channels.get(channelId) || [];
              let sentCount = 0;
              
              // Send to all targeted clients in this channel
              clients.forEach(client => {
                const clientId = client.empId || (client.userId ? client.userId.toString() : null);
                
                if (client.readyState === WebSocket.OPEN && 
                    clientId && 
                    targetUsers.includes(clientId)) {
                  try {
                    client.send(JSON.stringify(callMessage));
                    sentCount++;
                    console.log(`Sent targeted call invitation to user ${client.empId || client.userId} (${client.username || 'Unknown'})`);
                  } catch (err) {
                    console.error(`Error sending targeted call invitation:`, err);
                  }
                }
              });
              
              console.log(`Successfully sent targeted call invitations to ${sentCount}/${targetUsers.length} users`);
            } else {
              // Regular broadcast to all users in the channel
              broadcast(channelId, callMessage);
            }
            
            break;
          }
        }
      } catch (error) {
        console.error('Error handling websocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Broadcast offline status when a user disconnects
      if (ws.empId || ws.userId) {
        const empId = ws.empId || (ws.userId ? ws.userId.toString() : '0');
        const username = ws.username || 'Unknown User';
        
        console.log(`WebSocket disconnected: User ${username} (${empId}) is now offline`);
        
        // Broadcast offline status to all connected clients
        wss.clients.forEach((client: ExtendedWebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'userStatus',
              empId,
              username,
              status: 'offline',
              inCall: false,
              timestamp: new Date(),
              lastSeen: new Date()
            }));
          }
        });
      }
      
      // Handle channel-specific logic
      if (ws.channelId && ws.username) {
        // Remove from channel clients
        const clients = channels.get(ws.channelId) || [];
        const index = clients.indexOf(ws);
        if (index !== -1) {
          clients.splice(index, 1);
        }
        
        // Broadcast leave message if they were in a channel
        if (ws.channelId) {
          const systemMessage: SystemMessage = {
            type: 'system',
            channelId: ws.channelId,
            content: `${ws.username} has left the channel`,
            timestamp: new Date()
          };
          
          broadcast(ws.channelId, systemMessage);
          
          // Store the leave message
          storage.addMessageToChannel(ws.channelId, {
            type: 'system',
            senderId: ws.empId || ws.userId?.toString(), // Prefer empId but fall back to userId as string
            content: `${ws.username} has left the channel`,
            createdAt: new Date()
          }).catch(console.error);
        }
      }
    });
  });
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  return wss;
};
