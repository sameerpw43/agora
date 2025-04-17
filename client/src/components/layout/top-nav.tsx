import { Bell } from "lucide-react";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TopNavProps {
  user: User | null;
}

export default function TopNav({ user }: TopNavProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-white border-b flex items-center justify-between px-6 py-2">
      <div className="text-sm text-gray-600">
        SRC - 17
      </div>
      <div className="flex items-center">
        <div className="relative mr-4">
          <Bell className="h-5 w-5 text-gray-600" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full">
            3
          </Badge>
        </div>
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={user?.profileImage} alt={user?.name} />
            <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500">
              {user?.role === 'physician' ? 'Physician' : 'Nurse'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
