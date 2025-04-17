import { Link } from "wouter";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Calendar, 
  Phone, 
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface Patient {
  _id: string;
  caseId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dob: string;
  phoneNumber?: string;
}

interface PatientListProps {
  patients: Patient[];
}

export default function PatientList({ patients }: PatientListProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };
  
  const calculateAge = (dobString: string) => {
    try {
      const dob = new Date(dobString);
      const ageDifMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (error) {
      return "";
    }
  };
  
  const getRandomStatus = (patientId: string) => {
    // Using patient ID to generate consistent status for demo purposes
    const hash = Array.from(patientId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const statuses = ["Stable", "Critical", "Active", "Pending", "Waiting"];
    return statuses[hash % statuses.length];
  };
  
  const getRandomTimeAgo = (patientId: string) => {
    // Using patient ID to generate consistent time for demo purposes
    const hash = Array.from(patientId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const minutes = 5 + (hash % 60);
    const date = new Date(Date.now() - minutes * 60 * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-500";
      case "Stable":
        return "bg-green-500";
      case "Active":
        return "bg-blue-500";
      case "Pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.length === 0 ? (
        <div className="col-span-full text-center py-10">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
            <User className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No patients found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        patients.map((patient) => {
          const status = getRandomStatus(patient._id);
          const lastUpdated = getRandomTimeAgo(patient._id);
          const age = calculateAge(patient.dob);
          
          return (
            <Card key={patient._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback>{getInitials(patient.firstName, patient.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>MRN: {patient.mrn}</span>
                          <span className="mx-1">•</span>
                          <span>{age} yrs</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(status)} text-white`}>
                      {status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>DOB: {formatDate(patient.dob)}</span>
                    </div>
                    {patient.phoneNumber && (
                      <div className="flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{patient.phoneNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">
                        Case ID: {patient.caseId}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Last updated {lastUpdated}
                  </div>
                </div>
                
                <div className="border-t flex">
                  <Link href={`/chat/${patient._id}`} className="flex-1 py-2 text-center hover:bg-gray-50 transition-colors">
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-center text-primary"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span>Join Chat</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
