import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { CallInvitation } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

interface CallInvitationDialogProps {
  invitation: CallInvitation;
  onAccept: () => void;
  onDecline: () => void;
}

export function CallInvitationDialog({
  invitation,
  onAccept,
  onDecline
}: CallInvitationDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [remainingTime, setRemainingTime] = useState(30); // 30 seconds to respond
  const { toast } = useToast();

  useEffect(() => {
    // Auto-decline after 30 seconds
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDecline('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAccept = () => {
    setIsOpen(false);
    onAccept();
  };

  const handleDecline = (reason = 'declined') => {
    setIsOpen(false);
    onDecline();
    
    if (reason === 'timeout') {
      toast({
        title: 'Call invitation expired',
        description: 'The invitation was automatically declined',
        variant: 'default'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDecline()}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6">
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4 bg-primary/10">
              <AvatarFallback className="text-2xl">
                {invitation.callType === 'voice' ? <Phone className="h-8 w-8" /> : <Video className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-xl font-semibold mb-2">
              Incoming {invitation.callType === 'voice' ? 'Voice' : 'Video'} Call
            </h3>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground">{invitation.inviterName}</p>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Auto-declining in {remainingTime} seconds
            </p>
            
            <div className="flex justify-center space-x-4">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
                onClick={() => handleDecline()}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
              
              <Button
                variant="default"
                size="lg"
                className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
                onClick={handleAccept}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}