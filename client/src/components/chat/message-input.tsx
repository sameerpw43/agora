import { useState, KeyboardEvent, useRef } from "react";
import { Camera, Paperclip, Send, Smile, X, File, Music, Film, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Attachment } from "@/lib/socket";

interface MessageInputProps {
  onSendMessage: (message: string, attachments?: Attachment[]) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments.length > 0 ? attachments : undefined);
      setMessage("");
      setAttachments([]);
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'video' | 'audio') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type;
      
      // Create a temporary URL to represent the file
      const url = URL.createObjectURL(file);
      
      // Create the attachment object
      const attachment: Attachment = {
        type,
        url,
        name: file.name,
        size: file.size,
        mimeType: fileType
      };
      
      // Add thumbnail for images and videos if possible
      if (type === 'image') {
        attachment.thumbnailUrl = url;
      }
      
      // Add to attachments list
      setAttachments(prev => [...prev, attachment]);
    }
    
    // Reset the input
    event.target.value = '';
  };
  
  const quickResponses = [
    "Patient vitals have been updated",
    "Cath lab is ready for the patient",
    "Dr. Vera has been invited to consult on patient status"
  ];

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Remove an attachment by index
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <>
      {/* Quick Action Buttons */}
      <div className="bg-white p-2 flex space-x-2 overflow-x-auto border-t">
        {quickResponses.map((response, index) => (
          <Button
            key={index}
            variant="outline"
            className="quick-action-btn"
            onClick={() => onSendMessage(response)}
          >
            {response}
          </Button>
        ))}
      </div>
      
      {/* Attachment Preview Area */}
      {attachments.length > 0 && (
        <div className="bg-white p-2 border-t flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative bg-gray-100 rounded-md p-2 flex items-center space-x-2 pr-8">
              {attachment.type === 'image' && attachment.thumbnailUrl && (
                <div className="h-10 w-10 bg-gray-200 rounded overflow-hidden">
                  <img src={attachment.thumbnailUrl} alt={attachment.name} className="h-full w-full object-cover" />
                </div>
              )}
              {attachment.type === 'document' && (
                <File className="h-10 w-10 text-blue-500" />
              )}
              {attachment.type === 'audio' && (
                <Music className="h-10 w-10 text-purple-500" />
              )}
              {attachment.type === 'video' && (
                <Film className="h-10 w-10 text-red-500" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[120px]">{attachment.name}</span>
                <span className="text-xs text-gray-500">{formatFileSize(attachment.size || 0)}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Message Input Area */}
      <div className="bg-white p-3 border-t flex items-center">
        {/* Camera (Use device camera) */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          ref={cameraInputRef} 
          onChange={(e) => handleFileSelect(e, 'image')} 
          className="hidden" 
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
        </Button>
        
        {/* Attachment options */}
        <Popover open={showAttachmentOptions} onOpenChange={setShowAttachmentOptions}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Paperclip className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" side="top">
            <div className="flex flex-col space-y-1">
              {/* Images from gallery */}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                ref={imageInputRef} 
                onChange={(e) => handleFileSelect(e, 'image')} 
                className="hidden" 
              />
              <Button 
                variant="ghost" 
                className="justify-start"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
              >
                <Image className="mr-2 h-4 w-4" />
                <span>Gallery</span>
              </Button>
              
              {/* Documents */}
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" 
                multiple 
                ref={fileInputRef} 
                onChange={(e) => handleFileSelect(e, 'document')} 
                className="hidden" 
              />
              <Button 
                variant="ghost" 
                className="justify-start"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
              >
                <File className="mr-2 h-4 w-4" />
                <span>Document</span>
              </Button>
              
              {/* Audio */}
              <input 
                type="file" 
                accept="audio/*" 
                multiple 
                ref={audioInputRef} 
                onChange={(e) => handleFileSelect(e, 'audio')} 
                className="hidden" 
              />
              <Button 
                variant="ghost" 
                className="justify-start"
                onClick={() => {
                  audioInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
              >
                <Music className="mr-2 h-4 w-4" />
                <span>Audio</span>
              </Button>
              
              {/* Video */}
              <input 
                type="file" 
                accept="video/*" 
                multiple 
                ref={videoInputRef} 
                onChange={(e) => handleFileSelect(e, 'video')} 
                className="hidden" 
              />
              <Button 
                variant="ghost" 
                className="justify-start"
                onClick={() => {
                  videoInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
              >
                <Film className="mr-2 h-4 w-4" />
                <span>Video</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          type="text"
          placeholder="Write message"
          className="flex-1 mx-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Smile className="h-5 w-5" />
        </Button>
        
        <Button 
          onClick={handleSendMessage}
          disabled={!message.trim() && attachments.length === 0}
          className="ml-1 bg-primary text-white px-4 py-2"
        >
          Send
          <Send className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
