import { formatDistanceToNow, format } from "date-fns";
import { Timer, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusUpdate {
  _id: string;
  patientId: string;
  status: string;
  createdBy: string; // Changed from number to string to support empId
  createdByName?: string;
  location?: string;
  details?: string;
  createdAt: string | Date;
}

interface PatientStatusProps {
  statusUpdates: StatusUpdate[];
  patientId: string;
}

export default function PatientStatus({ statusUpdates, patientId }: PatientStatusProps) {
  const formatTime = (timestamp: string | Date) => {
    if (!timestamp) return "";
    
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return format(date, "hh:mm a, d MMM");
    } catch (error) {
      return String(timestamp);
    }
  };
  
  const getStatusStyles = (status: string) => {
    if (status.includes('Alarm Raised')) {
      return 'danger';
    } else if (status.includes('Accepted') || status.includes('Arrived')) {
      return 'success';
    } else if (status.includes('Assigned') || status.includes('Enroute') || status.includes('Departed')) {
      return 'primary';
    } else {
      return 'secondary';
    }
  };

  return (
    <div className="w-72 bg-white border-l overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Patient Status Updates</h3>
        <div className="flex items-center mt-1 text-red-500">
          <Timer className="mr-1 h-4 w-4" />
          <span className="text-lg font-semibold">00: 17: 13: 33</span>
          <Info className="ml-1 h-4 w-4" />
        </div>
      </div>
      
      <div className="p-4">
        {statusUpdates.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            No status updates yet
          </div>
        ) : (
          statusUpdates.map((update, index) => (
            <div key={update._id} className="mb-6 relative">
              {index < statusUpdates.length - 1 && (
                <div className="timeline-line"></div>
              )}
              <div className="timeline-dot">
                <div className="flex items-center">
                  <span className={cn(
                    "status-badge",
                    getStatusStyles(update.status)
                  )}>
                    {update.status}
                  </span>
                </div>
                {update.createdByName && (
                  <div className="text-sm mt-1">By {update.createdByName}</div>
                )}
                {update.location && (
                  <div className="text-sm text-gray-500">{update.location}</div>
                )}
                <div className="text-xs text-gray-500">
                  {formatTime(update.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
