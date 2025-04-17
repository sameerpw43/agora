import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User as UserIcon, UserCheck, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Member {
  _id: string;
  name: string;
  role: string;
  empId: string;
  specialty?: string;
  profileImage?: string;
}

interface AddChatMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMembers: (members: Member[]) => void;
  channelId: string;
}

export function AddChatMembersDialog({
  isOpen,
  onClose,
  onAddMembers,
  channelId,
}: AddChatMembersDialogProps) {
  const [physicians, setPhysicians] = useState<Member[]>([]);
  const [nurses, setNurses] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState('physicians');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        
        // Fetch physicians
        const physiciansResponse = await fetch('/api/physicians');
        if (!physiciansResponse.ok) {
          throw new Error('Failed to fetch physicians');
        }
        const physiciansData = await physiciansResponse.json();
        setPhysicians(physiciansData);
        
        // Fetch nurses
        const nursesResponse = await fetch('/api/nurses');
        if (!nursesResponse.ok) {
          throw new Error('Failed to fetch nurses');
        }
        const nursesData = await nursesResponse.json();
        setNurses(nursesData);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast({
          title: 'Error',
          description: 'Failed to load members. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMembers((prev) => {
      // Check if member is already selected
      const isSelected = prev.some(m => m._id === member._id);
      
      if (isSelected) {
        // Remove from selection
        return prev.filter(m => m._id !== member._id);
      } else {
        // Add to selection
        return [...prev, member];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: 'Select Members',
        description: 'Please select at least one member to add to the chat group.',
        variant: 'default',
      });
      return;
    }

    try {
      // This function would add members to the channel via API
      onAddMembers(selectedMembers);
      
      toast({
        title: 'Members Added',
        description: `${selectedMembers.length} members have been added to the chat group.`,
        variant: 'default',
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding members to chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to add members to the chat group. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter members based on search query
  const filteredPhysicians = physicians.filter(physician => 
    physician.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    physician.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (physician.specialty && physician.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const filteredNurses = nurses.filter(nurse => 
    nurse.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    nurse.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to Chat Group</DialogTitle>
          <DialogDescription>
            Select physicians and nurses to add to this group chat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mt-2">
          <div className="flex items-center px-3 py-2 mb-4 rounded-md border">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search by name, ID, or specialty"
              className="flex w-full border-0 bg-transparent p-0 text-sm focus-visible:outline-none focus-visible:ring-0"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          <Tabs defaultValue="physicians" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="physicians">Physicians</TabsTrigger>
              <TabsTrigger value="nurses">Nurses</TabsTrigger>
            </TabsList>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="physicians">
                  <ScrollArea className="h-[300px] rounded-md">
                    {filteredPhysicians.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {filteredPhysicians.map((physician) => (
                          <div 
                            key={physician._id}
                            className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                            onClick={() => handleSelectMember(physician)}
                          >
                            {physician.profileImage ? (
                              <img
                                src={physician.profileImage}
                                alt={physician.name}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 space-y-0.5">
                              <div className="text-sm font-medium">{physician.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-2">
                                <span>ID: {physician.empId}</span>
                                {physician.specialty && (
                                  <>
                                    <span>•</span>
                                    <span>{physician.specialty}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Checkbox
                              checked={selectedMembers.some(m => m._id === physician._id)}
                              onCheckedChange={() => handleSelectMember(physician)}
                              className="h-5 w-5"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <UserCheck className="h-12 w-12 mb-2 opacity-20" />
                        <p>No physicians found</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="nurses">
                  <ScrollArea className="h-[300px] rounded-md">
                    {filteredNurses.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {filteredNurses.map((nurse) => (
                          <div 
                            key={nurse._id}
                            className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                            onClick={() => handleSelectMember(nurse)}
                          >
                            {nurse.profileImage ? (
                              <img
                                src={nurse.profileImage}
                                alt={nurse.name}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 space-y-0.5">
                              <div className="text-sm font-medium">{nurse.name}</div>
                              <div className="text-xs text-muted-foreground">
                                <span>ID: {nurse.empId}</span>
                              </div>
                            </div>
                            <Checkbox
                              checked={selectedMembers.some(m => m._id === nurse._id)}
                              onCheckedChange={() => handleSelectMember(nurse)}
                              className="h-5 w-5"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <UserCheck className="h-12 w-12 mb-2 opacity-20" />
                        <p>No nurses found</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm">
            {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'} selected
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedMembers.length === 0}>
              Add to Chat
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}