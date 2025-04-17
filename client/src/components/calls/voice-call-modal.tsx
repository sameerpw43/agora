import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Users, UserPlus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { agoraService } from "@/lib/agora";
import { socketService } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import MembersDialog from "./members-dialog";
import { AddCallMembersDialog } from "./add-call-members-dialog";

interface Patient {
  _id: string;
  caseId: string;
  firstName: string;
  lastName: string;
}

interface Member {
  _id: string;
  name: string;
  role: string;
  empId: string;
  specialty?: string;
  profileImage?: string;
}

interface VoiceCallModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  userName?: string;
  empId?: string;
}

export default function VoiceCallModal({
  patient,
  isOpen,
  onClose,
  channelName,
  userName = "You",
  empId,
}: VoiceCallModalProps) {
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimerId, setCallTimerId] = useState<NodeJS.Timeout | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const { toast } = useToast();
  
  // Start call when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(`Voice call modal opened for channel: ${channelName}`);
      
      // Initialize Agora voice call (without video)
      console.log(`Starting voice call for channel: ${channelName || "default-channel"}`);
      
      // Handle remote users joining
      const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
        console.log(`Remote user joined voice call: ${user.uid}`);
        
        // Add user to our state if not already present
        setRemoteUsers(prev => {
          if (prev.find(u => u.uid === user.uid)) {
            return prev;
          }
          return [...prev, user];
        });
      };
      
      // Handle remote users leaving
      const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
        console.log(`Remote user left voice call: ${user.uid}`);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      };
      
      agoraService.startCall(
        channelName || "default-channel", 
        undefined, 
        false,
        handleUserJoined,
        handleUserLeft,
        empId
      ).then((success) => {
          if (success) {
            console.log('Voice call started successfully');
            
            // Start call timer
            const timerId = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
            setCallTimerId(timerId);
          } else {
            console.error('Failed to start voice call');
          }
        })
        .catch((error) => {
          console.error('Error starting voice call:', error);
        });
    }
    
    // Clean up when modal closes
    return () => {
      console.log('Voice call modal closing, cleaning up resources');
      
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
        console.log(`Inviting ${member.name} to voice call in channel ${channelName}`);
        
        // Use socketService to send call invitation
        socketService.sendCallInvitation({
          channelId: channelName,
          callType: 'voice',
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md p-0 rounded-xl">
          <div className="p-6">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">
                    {patient?.firstName?.[0] || "P"}
                    {patient?.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-xl font-semibold mb-1">
                Group Call: {patient?.firstName} {patient?.lastName}
              </h3>
              <p className="text-gray-500 mb-6">
                Case ID: {patient?.caseId}
              </p>
              
              <div className="flex justify-center space-x-4 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={toggleMute}
                >
                  {muted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={() => setShowMembersDialog(true)}
                >
                  <Users className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="icon" 
                  className="rounded-full w-12 h-12"
                  onClick={() => setShowAddMembersDialog(true)}
                  title="Add members to call"
                >
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">
                Connected: {formatCallDuration(callDuration)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Members Dialog */}
      <MembersDialog
        isOpen={showMembersDialog}
        onClose={() => setShowMembersDialog(false)}
        remoteUsers={remoteUsers}
        localUserName={userName}
      />
      
      {/* Add Call Members Dialog */}
      {showAddMembersDialog && (
        <AddCallMembersDialog
          isOpen={showAddMembersDialog}
          onClose={() => setShowAddMembersDialog(false)}
          onAddMembers={handleAddMembersToCall}
          callType="voice"
          channelId={channelName}
        />
      )}
    </>
  );
}
