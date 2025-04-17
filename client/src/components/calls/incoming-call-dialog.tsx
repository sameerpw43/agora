import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Patient {
  _id: string;
  caseId: string;
  firstName: string;
  lastName: string;
}

interface IncomingCallDialogProps {
  isOpen: boolean;
  callType: 'voice' | 'video';
  callerName: string;
  patient: Patient;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  isOpen,
  callType,
  callerName,
  patient,
  onAccept,
  onDecline,
}) => {
  // Play ringtone when dialog is opened
  React.useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    
    if (isOpen) {
      // Create an audio element for ringtone
      audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      
      // Try to play the ringtone (might be blocked by browser autoplay policy)
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Auto-play was prevented. Ringtone not playing:', error);
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isOpen]);
  
  const handleAccept = () => {
    onAccept();
  };
  
  const handleDecline = () => {
    onDecline();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="sm:max-w-md p-0 rounded-xl">
        <div className="p-6">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4 relative">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {patient?.firstName?.[0] || "P"}
                  {patient?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              
              {/* Pulsing animation around avatar */}
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse"></div>
            </div>
            
            <h3 className="text-xl font-semibold mb-1">
              Incoming {callType === 'voice' ? 'Voice' : 'Video'} Call
            </h3>
            
            <p className="text-gray-600 mb-1">
              {callerName}
            </p>
            
            <p className="text-gray-500 mb-6">
              Case: {patient?.firstName} {patient?.lastName}
            </p>
            
            <div className="flex justify-center space-x-4 mb-2">
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={handleDecline}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
              
              <Button
                variant="default"
                size="icon"
                className="rounded-full w-12 h-12 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                {callType === 'voice' ? (
                  <Phone className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            <div className="flex justify-center space-x-2 text-sm">
              <span className="text-destructive">Decline</span>
              <span className="text-green-600">Accept</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;