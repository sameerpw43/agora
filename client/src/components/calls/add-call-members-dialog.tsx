import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { X, Search, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { socketService } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

interface Member {
  _id: string;
  name: string;
  role: string;
  empId: string;
  specialty?: string;
  profileImage?: string;
}

interface AddCallMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMembers: (members: Member[]) => void;
  callType: 'voice' | 'video';
  channelId: string;
}

export function AddCallMembersDialog({
  isOpen,
  onClose,
  onAddMembers,
  callType,
  channelId
}: AddCallMembersDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('physicians');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [physicians, setPhysicians] = useState<Member[]>([]);
  const [nurses, setNurses] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch staff members when opened
  useEffect(() => {
    if (isOpen) {
      fetchPhysicians();
      fetchNurses();
    }
  }, [isOpen]);

  const fetchPhysicians = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/physicians');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch physicians: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPhysicians(data);
    } catch (err: any) {
      console.error('Error fetching physicians:', err);
      setError('Failed to load physicians');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchNurses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nurses');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch nurses: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNurses(data);
    } catch (err: any) {
      console.error('Error fetching nurses:', err);
      setError('Failed to load nurses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m._id === member._id);
      
      if (isSelected) {
        return prev.filter(m => m._id !== member._id);
      } else {
        return [...prev, member];
      }
    });
  };

  const { toast } = useToast();
  
  const handleAddMembers = () => {
    if (selectedMembers.length === 0 || !channelId) return;
    
    // First notify the parent component for traditional call signal handling
    onAddMembers(selectedMembers);
    
    // Then send direct call invitations to each member
    selectedMembers.forEach(member => {
      const success = socketService.sendCallInvitation({
        channelId,
        callType,
        targetUserId: member._id
      });
      
      if (success) {
        toast({
          title: "Invitation Sent",
          description: `Call invitation sent to ${member.name}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Invitation Failed",
          description: `Could not send invitation to ${member.name}`,
          variant: "destructive"
        });
      }
    });
    
    setSelectedMembers([]);
    onClose();
  };

  const filteredPhysicians = physicians.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
    doc.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredNurses = nurses.filter(nurse => 
    nurse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nurse.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Members to {callType === 'voice' ? 'Voice' : 'Video'} Call</DialogTitle>
          <DialogDescription>
            Select staff members to invite to the current call
          </DialogDescription>
        </DialogHeader>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or specialty..." 
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Selected ({selectedMembers.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map(member => (
                <Badge 
                  key={member._id} 
                  variant="secondary"
                  className="flex items-center gap-1 py-1"
                >
                  {member.name}
                  <Button
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0"
                    onClick={() => handleSelectMember(member)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Tabs for Staff Types */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="physicians">Physicians</TabsTrigger>
            <TabsTrigger value="nurses">Nurses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="physicians" className="flex-1 overflow-y-auto mt-2">
            {isLoading ? (
              <div className="p-4 text-center">Loading physicians...</div>
            ) : error ? (
              <div className="p-4 text-center text-destructive">{error}</div>
            ) : filteredPhysicians.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No physicians found</div>
            ) : (
              <div className="space-y-2">
                {filteredPhysicians.map(physician => (
                  <div
                    key={physician._id}
                    className={cn(
                      "flex items-center p-2 rounded-md",
                      selectedMembers.some(m => m._id === physician._id) 
                        ? "bg-muted" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelectMember(physician)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>
                        {physician.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{physician.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {physician.specialty || 'Physician'} • ID: {physician.empId}
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedMembers.some(m => m._id === physician._id)}
                      className="ml-2"
                      onCheckedChange={() => handleSelectMember(physician)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="nurses" className="flex-1 overflow-y-auto mt-2">
            {isLoading ? (
              <div className="p-4 text-center">Loading nurses...</div>
            ) : error ? (
              <div className="p-4 text-center text-destructive">{error}</div>
            ) : filteredNurses.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No nurses found</div>
            ) : (
              <div className="space-y-2">
                {filteredNurses.map(nurse => (
                  <div
                    key={nurse._id}
                    className={cn(
                      "flex items-center p-2 rounded-md",
                      selectedMembers.some(m => m._id === nurse._id) 
                        ? "bg-muted" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelectMember(nurse)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>
                        {nurse.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{nurse.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Nurse • ID: {nurse.empId}
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedMembers.some(m => m._id === nurse._id)}
                      className="ml-2"
                      onCheckedChange={() => handleSelectMember(nurse)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0}
            className="flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Add {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}