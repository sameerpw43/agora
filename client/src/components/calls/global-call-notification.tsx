import React from 'react';
import { useGlobalCall } from '@/hooks/use-global-call-context';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function GlobalCallNotification() {
  const {
    incomingCall,
    callInvitation,
    handleAcceptCall,
    handleDeclineCall,
    handleAcceptCallInvitation,
    handleDeclineCallInvitation,
    resetCallState
  } = useGlobalCall();

  // Incoming direct call dialog
  if (incomingCall) {
    return (
      <Dialog 
        open={true} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleDeclineCall();
            resetCallState(); // Ensure all call state is cleared when dialog closed
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {incomingCall.type === 'voice' ? (
                <Phone className="h-5 w-5 text-green-500" />
              ) : (
                <Video className="h-5 w-5 text-blue-500" />
              )}
              Incoming {incomingCall.type === 'voice' ? 'Voice' : 'Video'} Call
            </DialogTitle>
            <DialogDescription>
              <div className="mt-2 text-center">
                <p className="text-lg font-medium">{incomingCall.callerName} is calling you</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are receiving this call notification from anywhere in the application.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeclineCall}
              className="flex-1 mr-2"
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleAcceptCall}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Call invitation dialog
  if (callInvitation) {
    return (
      <Dialog 
        open={true} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleDeclineCallInvitation();
            resetCallState(); // Ensure all call state is cleared when dialog closed
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {callInvitation.callType === 'voice' ? (
                <Phone className="h-5 w-5 text-green-500" />
              ) : (
                <Video className="h-5 w-5 text-blue-500" />
              )}
              Call Invitation
            </DialogTitle>
            <DialogDescription>
              <div className="mt-2 text-center">
                <p className="text-lg font-medium">{callInvitation.inviterName} invited you to a call</p>
                <p className="text-sm text-muted-foreground">
                  Join the {callInvitation.callType} call in progress
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are receiving this invitation from anywhere in the application.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeclineCallInvitation}
              className="flex-1 mr-2"
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleAcceptCallInvitation}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Join Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}