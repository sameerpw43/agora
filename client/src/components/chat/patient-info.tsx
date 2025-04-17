import { useState } from "react";
import { Users, Ambulance, UserPlus, Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AddChatMembersDialog } from "./add-chat-members-dialog";
import { socketService } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  _id: string;
  caseId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dob: string;
}

// This interface needs to match the one used in add-members-dialog.tsx
interface Member {
  _id: string;
  name: string;
  empId: string;
  role: string;
  specialty?: string;
  profileImage?: string;
}

interface PatientInfoProps {
  patient: Patient;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  isCallActive?: boolean; // Flag to indicate if a call is already in progress
  onAddMembersToCall?: (members: Member[], callType: "voice" | "video") => void;
  channelId?: string;
}

export default function PatientInfo({ 
  patient, 
  onStartVoiceCall,
  onStartVideoCall,
  isCallActive = false,
  onAddMembersToCall,
  channelId = ""
}: PatientInfoProps) {
  const [showAddChatMembersDialog, setShowAddChatMembersDialog] = useState(false);
  const { toast } = useToast();
  
  // Function to handle adding members to the chat group (not to a call)
  const handleAddChatMembers = async (members: Member[]) => {
    try {
      if (!channelId) {
        throw new Error("Channel ID is required to add members");
      }
      
      // Make API calls to add each member to the channel
      for (const member of members) {
        const userType = member.role.toLowerCase().includes('physician') ? 'physician' : 'nurse';
        
        const response = await fetch(`/api/channels/${channelId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: member._id,
            userType
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to add member ${member.name}`);
        }
      }
      
      toast({
        title: "Members Added",
        description: `Added ${members.length} members to the group chat.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error adding members to chat:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add members to the chat group.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-white p-4 border-b">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">
            {patient.firstName} {patient.lastName}
          </h3>
          <div className="text-sm text-gray-500">Case ID: {patient.caseId}</div>
          <div className="flex mt-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
            <Avatar className="h-6 w-6 -ml-1">
              <AvatarImage src="https://randomuser.me/api/portraits/men/33.jpg" />
              <AvatarFallback>NR</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            className="flex flex-col items-center text-gray-600 h-auto"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs">Members</span>
          </Button>
          
          <Button
            variant="ghost"
            className="flex flex-col items-center text-gray-600 h-auto"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
              <Ambulance className="h-5 w-5" />
            </div>
            <span className="text-xs">EMS</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center h-auto ${isCallActive ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'}`}
            onClick={isCallActive ? undefined : onStartVoiceCall}
            disabled={isCallActive}
            title={isCallActive ? "Call already in progress" : "Start voice call"}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isCallActive ? 'bg-gray-200' : 'bg-gray-100'}`}>
              <Phone className="h-5 w-5" />
            </div>
            <span className="text-xs">Call</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center h-auto ${isCallActive ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'}`}
            onClick={isCallActive ? undefined : onStartVideoCall}
            disabled={isCallActive}
            title={isCallActive ? "Call already in progress" : "Start video call"}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isCallActive ? 'bg-gray-200' : 'bg-gray-100'}`}>
              <Video className="h-5 w-5" />
            </div>
            <span className="text-xs">Video</span>
          </Button>
          
          <Button
            variant="ghost"
            className="flex flex-col items-center text-gray-600 h-auto"
            onClick={() => setShowAddChatMembersDialog(true)}
            title="Add members to chat group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="text-xs">Add</span>
          </Button>
        </div>
      </div>

      {/* Add Chat Members Dialog */}
      {showAddChatMembersDialog && (
        <AddChatMembersDialog
          isOpen={showAddChatMembersDialog}
          onClose={() => setShowAddChatMembersDialog(false)}
          onAddMembers={handleAddChatMembers}
          channelId={channelId}
        />
      )}
    </div>
  );
}
