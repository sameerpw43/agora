import { useEffect, useState, useRef, useMemo } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Users, MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agoraService } from "@/lib/agora";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { useToast } from "@/hooks/use-toast";
import MembersDialog from "./members-dialog";
import { AddCallMembersDialog } from "./add-call-members-dialog";
import { socketService } from "@/lib/socket";
import { useStaffDirectory } from "@/hooks/use-staff-directory";

interface Patient {
  _id: string;
  caseId: string;
  firstName: string;
  lastName: string;
}

interface VideoCallModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  userName?: string;
  empId?: string;
}

interface Member {
  _id: string;
  name: string;
  role: string;
  empId: string;
  specialty?: string;
  profileImage?: string;
}

export default function VideoCallModal({
  patient,
  isOpen,
  onClose,
  channelName,
  userName = "You",
  empId,
}: VideoCallModalProps) {
  const [muted, setMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimerId, setCallTimerId] = useState<NodeJS.Timeout | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const mainVideoRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { getNameByEmpId } = useStaffDirectory();
  
  // Function to get participant name from UID
  const getParticipantName = (uid: string | number) => {
    // Convert to string regardless of input type
    const uidStr = uid.toString();
    
    // Try to map the UID to a known staff member
    try {
      // Check for physician UIDs (generated with prefix 1)
      // For example, for empId "e1234", the UID would be "11234"
      // This matches UIDs in format "1xxxx" where xxxx is the numeric part of the empId
      if (uidStr.startsWith('1') && uidStr.length >= 5) {
        const numericPart = uidStr.substring(1);
        const empId = `e${numericPart}`;
        const name = getNameByEmpId(empId);
        if (name) return name;
      }
      
      // Check for nurse UIDs (generated with prefix 2)
      // For example, for empId "n5678", the UID would be "25678"
      if (uidStr.startsWith('2') && uidStr.length >= 5) {
        const numericPart = uidStr.substring(1);
        const empId = `n${numericPart}`;
        const name = getNameByEmpId(empId);
        if (name) return name;
      }
      
      // Fallback 1: Check if a full empId appears within the UID string
      // This is a secondary approach for older UIDs or different formats
      const physicianEmpIdMatch = uidStr.match(/e\d{4}/);
      if (physicianEmpIdMatch) {
        const empId = physicianEmpIdMatch[0];
        const name = getNameByEmpId(empId);
        if (name) return name;
      }
      
      // Check for nurse empId format
      const nurseEmpIdMatch = uidStr.match(/n\d{4}/);
      if (nurseEmpIdMatch) {
        const empId = nurseEmpIdMatch[0];
        const name = getNameByEmpId(empId);
        if (name) return name;
      }
      
      // Last fallback: just show the last 4 digits of the UID
      return uidStr.slice(-4);
    } catch (error) {
      console.error("Error getting participant name:", error);
      return uidStr.slice(-4);
    }
  };
  
  // Start call when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(`Video call modal opened for channel: ${channelName}`);
      
      // Handle remote users joining with better error handling
      const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
        console.log(`Remote user joined video call: ${user.uid}`);
        
        // Add user to our state if not already present
        setRemoteUsers(prev => {
          if (prev.find(u => u.uid === user.uid)) {
            return prev;
          }
          return [...prev, user];
        });
        
        // Play video in container with retry logic
        if (user.videoTrack) {
          console.log(`User ${user.uid} has video track, attempting to play`);
          
          const playVideoWithRetry = (attempt = 0) => {
            const maxAttempts = 3;
            const userDivId = `remote-user-${user.uid}`;
            const userDiv = document.getElementById(userDivId);
            
            if (userDiv) {
              try {
                console.log(`Playing remote video in div: ${userDivId} (attempt ${attempt + 1})`);
                user.videoTrack!.play(userDivId);
              } catch (error) {
                console.error(`Failed to play remote video (attempt ${attempt + 1}):`, error);
                if (attempt < maxAttempts) {
                  setTimeout(() => playVideoWithRetry(attempt + 1), 1000);
                }
              }
            } else {
              console.warn(`Container for remote user ${user.uid} not found (attempt ${attempt + 1})`);
              if (attempt < maxAttempts) {
                setTimeout(() => playVideoWithRetry(attempt + 1), 1000);
              }
            }
          };
          
          // Start the retry process after a short delay to ensure DOM is ready
          setTimeout(() => playVideoWithRetry(), 500);
        } else {
          console.warn(`Remote user ${user.uid} joined but has no video track`);
        }
      };
      
      // Handle remote users leaving
      const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
        console.log(`Remote user left video call: ${user.uid}`);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      };
      
      // Initialize Agora call
      console.log(`Starting video call for channel: ${channelName || "default-channel"}`);
      agoraService.startCall(
        channelName || "default-channel", 
        undefined, 
        true,
        handleUserJoined,
        handleUserLeft,
        empId
      )
        .then((success) => {
          if (success) {
            console.log('Video call started successfully');
            
            // Start call timer
            const timerId = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
            setCallTimerId(timerId);
            
            // Play local video in container with retry logic
            const playLocalVideoWithRetry = (attempt = 0) => {
              const maxAttempts = 3;
              
              if (localVideoRef.current) {
                const localVideoTrack = agoraService.getLocalVideoTrack();
                if (localVideoTrack) {
                  try {
                    console.log(`Playing local video track in local-video element (attempt ${attempt + 1})`);
                    localVideoTrack.play('local-video');
                  } catch (error) {
                    console.error(`Failed to play local video (attempt ${attempt + 1}):`, error);
                    if (attempt < maxAttempts) {
                      setTimeout(() => playLocalVideoWithRetry(attempt + 1), 1000);
                    }
                  }
                } else {
                  console.warn(`Local video track not available (attempt ${attempt + 1})`);
                  if (attempt < maxAttempts) {
                    setTimeout(() => playLocalVideoWithRetry(attempt + 1), 1000);
                  }
                }
              } else {
                console.warn(`Local video container not found (attempt ${attempt + 1})`);
                if (attempt < maxAttempts) {
                  setTimeout(() => playLocalVideoWithRetry(attempt + 1), 1000);
                }
              }
            };
            
            // Start the retry process after a short delay
            setTimeout(() => playLocalVideoWithRetry(), 500);
          } else {
            console.error('Failed to start video call');
          }
        })
        .catch((error) => {
          console.error('Error starting video call:', error);
        });
    }
    
    // Clean up when modal closes
    return () => {
      console.log('Video call modal closing, cleaning up resources');
      
      if (callTimerId) {
        clearInterval(callTimerId);
      }
      
      // Note: Don't call endCall() here, it's handled by the parent component
      // which will determine if we need to end or just leave the call
      
      setRemoteUsers([]);
    };
  }, [isOpen, channelName, empId]);
  
  const formatCallDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };
  
  const toggleMute = () => {
    const newMuteState = !muted;
    
    // Update UI state immediately for responsive feel
    setMuted(newMuteState);
    
    // Attempt to toggle audio in Agora
    const success = agoraService.toggleAudio(!newMuteState);
    
    if (!success) {
      console.error("Failed to toggle audio state");
      // If failed, revert UI state
      setMuted(!newMuteState);
      toast({
        title: "Audio Toggle Failed",
        description: "Could not change audio state. Please try again.",
        variant: "destructive"
      });
    } else {
      console.log(`Audio ${newMuteState ? 'muted' : 'unmuted'} successfully`);
    }
  };
  
  const toggleVideo = () => {
    const newVideoState = !videoDisabled;
    
    // Update UI state immediately for responsive feel
    setVideoDisabled(newVideoState);
    
    // Attempt to toggle video in Agora
    const success = agoraService.toggleVideo(!newVideoState);
    
    if (!success) {
      console.error("Failed to toggle video state");
      // If failed, revert UI state
      setVideoDisabled(!newVideoState);
      toast({
        title: "Video Toggle Failed",
        description: "Could not change video state. Please try again.",
        variant: "destructive"
      });
    } else {
      console.log(`Video ${newVideoState ? 'disabled' : 'enabled'} successfully`);
    }
  };
  
  const handleEndCall = () => {
    if (callTimerId) {
      clearInterval(callTimerId);
    }
    // Just call onClose from parent which handles determining if this is a leave or end
    onClose();
  };
  
  // Function to handle adding members to the call
  const handleAddMembersToCall = (members: Member[]) => {
    if (!channelName || !members.length) return;
    
    try {
      // Send invitation to each member via WebSocket
      members.forEach(member => {
        console.log(`Inviting ${member.name} to video call in channel ${channelName}`);
        
        // Use socketService to send call invitation
        socketService.sendCallInvitation({
          channelId: channelName,
          callType: 'video',
          targetUserId: member._id,
        });
      });
      
      toast({
        title: "Invitations Sent",
        description: `Invited ${members.length} members to join the call.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error inviting members to call:", error);
      toast({
        title: "Error",
        description: "Failed to send call invitations. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      <div className="p-4 flex justify-between items-center">
        <h3 className="text-white font-semibold">
          Group Video: {patient?.firstName} {patient?.lastName}
        </h3>
        <div className="text-white bg-white bg-opacity-20 px-3 py-1 rounded-lg">
          <span>{formatCallDuration(callDuration)}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-wrap p-4 gap-4 content-start">
        {/* Main video - active speaker or first remote user */}
        <div 
          id="main-video" 
          ref={mainVideoRef} 
          className="w-full h-96 bg-gray-800 rounded-lg relative"
        >
          {remoteUsers.length > 0 ? (
            <>
              <div 
                id={`remote-user-${remoteUsers[0].uid}`} 
                className="w-full h-full"
              ></div>
              <div className="absolute bottom-3 left-3 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                {getParticipantName(remoteUsers[0].uid)}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Waiting for participants...</p>
            </div>
          )}
        </div>
        
        {/* Participant videos */}
        <div 
          id="local-video" 
          ref={localVideoRef} 
          className="w-64 h-48 bg-gray-700 rounded-lg relative overflow-hidden"
        >
          <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-0.5 rounded text-sm">
            {userName}
          </div>
        </div>
        
        {remoteUsers.slice(1).map(user => (
          <div 
            key={user.uid} 
            id={`remote-user-${user.uid}`}
            className="w-64 h-48 bg-gray-700 rounded-lg relative overflow-hidden"
          >
            <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-0.5 rounded text-sm">
              {getParticipantName(user.uid)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 flex justify-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-white bg-opacity-10 text-white"
          onClick={toggleMute}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-white bg-opacity-10 text-white"
          onClick={toggleVideo}
        >
          {videoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="destructive"
          size="icon"
          className="w-12 h-12 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-white bg-opacity-10 text-white"
          onClick={() => setShowMembersDialog(true)}
        >
          <Users className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-white bg-opacity-10 text-white"
          onClick={() => setShowAddMembersDialog(true)}
          title="Add members to call"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Members dialog */}
      <MembersDialog
        isOpen={showMembersDialog}
        onClose={() => setShowMembersDialog(false)}
        remoteUsers={remoteUsers}
        localUserName={userName}
      />
      
      {/* Add Call Members dialog */}
      {showAddMembersDialog && (
        <AddCallMembersDialog
          isOpen={showAddMembersDialog}
          onClose={() => setShowAddMembersDialog(false)}
          onAddMembers={handleAddMembersToCall}
          callType="video"
          channelId={channelName}
        />
      )}
    </div>
  );
}