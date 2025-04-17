import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, UserRound } from "lucide-react";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { useStaffDirectory } from "@/hooks/use-staff-directory";

interface MembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  remoteUsers: IAgoraRTCRemoteUser[];
  localUserName: string;
}

export default function MembersDialog({
  isOpen,
  onClose,
  remoteUsers,
  localUserName,
}: MembersDialogProps) {
  // Use the staff directory to look up names
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
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Call Participants</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {/* Local user (you) */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10 bg-primary-foreground border border-primary">
                  <AvatarFallback>
                    <UserRound className="h-6 w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{localUserName} (You)</p>
                  <p className="text-xs text-muted-foreground">Local participant</p>
                </div>
              </div>
              
              {/* Divider */}
              <div className="h-px bg-border" />
              
              {/* Remote participants */}
              {remoteUsers.length > 0 ? (
                remoteUsers.map((user) => (
                  <div key={user.uid} className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {getParticipantName(user.uid)}
                      </p>
                      <p className="text-xs text-muted-foreground">Remote participant</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No other participants yet
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {remoteUsers.length + 1} participant{remoteUsers.length !== 0 ? "s" : ""} in call
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}