import { useRef, useEffect, memo, useMemo, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileIcon, ImageIcon, PlayIcon, VideoIcon } from "lucide-react";
import { Attachment } from "@/lib/socket";
import { useStaffDirectory } from "@/hooks/use-staff-directory";

// Memoized image attachment component to prevent flickering
const MemoizedImageAttachment = memo(({ 
  attachment, 
  isCurrentUser 
}: { 
  attachment: Attachment, 
  isCurrentUser: boolean 
}) => {
  // Using state to handle image loading
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Process the URL to ensure it works across different origins
  const processUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's a blob URL that was created locally
    if (url.startsWith('blob:')) {
      // For blob URLs, we can't do much if they don't work for the receiver
      // as they're only valid in the context they were created
      return url;
    }
    
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // If it's already an absolute URL, return as is
    return url;
  };

  // Stabilize the component and prevent rerenders
  const imageUrl = useMemo(() => {
    // Process the URL to ensure it's properly formed
    return processUrl(attachment.thumbnailUrl || attachment.url);
  }, [attachment.thumbnailUrl, attachment.url]);
  
  // Try loading the image with retry logic
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Error loading image:', e);
    
    if (retryCount < maxRetries) {
      // Retry with a slight delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Force reload by appending a cache-busting parameter
        const img = e.target as HTMLImageElement;
        if (img) {
          const cacheBuster = `?nocache=${Date.now()}`;
          img.src = `${imageUrl}${cacheBuster}`;
        }
      }, 1000);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };
  
  return (
    <a 
      href={processUrl(attachment.url)} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div 
        className="relative overflow-hidden rounded-md max-w-[200px]"
        style={{ 
          minHeight: "100px",
          background: !isLoaded ? "#f1f5f9" : "transparent" // Light background while loading
        }}
      >
        {!hasError ? (
          <img 
            src={imageUrl} 
            alt={attachment.name || 'Image'} 
            loading="lazy"
            crossOrigin="anonymous" // Add cross-origin support
            className={`w-full h-auto object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
          />
        ) : (
          // Fallback for error loading
          <div className="flex flex-col items-center justify-center h-[100px] bg-gray-100 text-gray-500 text-xs p-2">
            <ImageIcon className="h-5 w-5 mb-1" />
            <span>Image failed to load</span>
            <span className="text-xs text-gray-400 mt-1 max-w-[180px] truncate">{attachment.url}</span>
          </div>
        )}
      </div>
      <div className="text-xs mt-1 text-center text-gray-600">
        {attachment.name || 'Image'}
      </div>
    </a>
  );
});

// Memoized document attachment component
const MemoizedDocAttachment = memo(({ 
  attachment, 
  isCurrentUser 
}: { 
  attachment: Attachment, 
  isCurrentUser: boolean 
}) => {
  // Process the URL to ensure it works across different origins
  const processUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's a blob URL that was created locally
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // If it's already an absolute URL, return as is
    return url;
  };
  
  // Document URL that's processed for cross-origin compatibility
  const docUrl = useMemo(() => processUrl(attachment.url), [attachment.url]);
  
  return (
    <a 
      href={docUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`flex items-center p-2 rounded-md ${
        isCurrentUser ? 'bg-blue-600' : 'bg-gray-100'
      }`}
      download
    >
      <FileIcon className={`h-5 w-5 ${isCurrentUser ? 'text-white' : 'text-blue-500'}`} />
      <span className={`ml-2 text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
        {attachment.name}
      </span>
    </a>
  );
});

// Memoized audio attachment component
const MemoizedAudioAttachment = memo(({ 
  attachment, 
  isCurrentUser 
}: { 
  attachment: Attachment, 
  isCurrentUser: boolean 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  // Process the URL to ensure it works across different origins
  const processUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's a blob URL that was created locally
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // If it's already an absolute URL, return as is
    return url;
  };
  
  // Audio URL that's processed for cross-origin compatibility
  const audioUrl = useMemo(() => processUrl(attachment.url), [attachment.url]);
  
  // Handle audio error with retry logic
  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('Error loading audio:', e);
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Force reload with a cache-busting parameter
        const audio = e.target as HTMLAudioElement;
        if (audio) {
          const cacheBuster = `?nocache=${Date.now()}`;
          audio.src = `${audioUrl}${cacheBuster}`;
          audio.load(); // Important for audio elements
        }
      }, 1000);
    } else {
      setHasError(true);
    }
  };
  
  return (
    <div className="audio-container">
      {!hasError ? (
        <>
          <div 
            className="relative bg-gray-100 rounded-md p-2"
            style={{ 
              minHeight: isLoaded ? "auto" : "50px",
            }}
          >
            <audio 
              controls 
              src={audioUrl} 
              className={`w-full max-w-[250px] transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}
              preload="metadata"
              onLoadedMetadata={() => setIsLoaded(true)}
              onError={handleAudioError}
              crossOrigin="anonymous"
            >
              <a href={audioUrl} download>
                Download audio: {attachment.name}
              </a>
            </audio>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-gray-500">Loading audio...</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[50px] bg-gray-100 text-gray-500 text-xs p-2 rounded-md">
          <PlayIcon className="h-5 w-5 mb-1" />
          <span>Audio failed to load</span>
          <a 
            href={audioUrl} 
            download 
            className="text-blue-500 hover:underline mt-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try download instead
          </a>
        </div>
      )}
      <div className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-200' : 'text-gray-500'}`}>
        {attachment.name}
      </div>
    </div>
  );
});

// Memoized video attachment component
const MemoizedVideoAttachment = memo(({ 
  attachment, 
  isCurrentUser 
}: { 
  attachment: Attachment, 
  isCurrentUser: boolean 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  // Process the URL to ensure it works across different origins
  const processUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's a blob URL that was created locally
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // If it's already an absolute URL, return as is
    return url;
  };
  
  // Video URL that's processed for cross-origin compatibility
  const videoUrl = useMemo(() => processUrl(attachment.url), [attachment.url]);
  
  // Handle video error with retry logic
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Error loading video:', e);
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Force reload with a cache-busting parameter
        const video = e.target as HTMLVideoElement;
        if (video) {
          const cacheBuster = `?nocache=${Date.now()}`;
          video.src = `${videoUrl}${cacheBuster}`;
          video.load(); // Important for video elements
        }
      }, 1000);
    } else {
      setHasError(true);
    }
  };
  
  return (
    <div className="video-container">
      {!hasError ? (
        <div 
          className="relative overflow-hidden rounded-md"
          style={{ 
            minHeight: "150px",
            background: !isLoaded ? "#f1f5f9" : "transparent"
          }}
        >
          <video 
            controls 
            src={videoUrl} 
            className={`w-full max-w-[250px] rounded-md transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}
            preload="metadata"
            onLoadedData={() => setIsLoaded(true)}
            onError={handleVideoError}
            crossOrigin="anonymous"
          >
            <a href={videoUrl} download>
              Download video: {attachment.name}
            </a>
          </video>
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-500">Loading video...</span>
            </div>
          )}
        </div>
      ) : (
        // Fallback for error loading
        <div className="flex flex-col items-center justify-center h-[150px] bg-gray-100 text-gray-500 text-xs p-2 rounded-md">
          <VideoIcon className="h-5 w-5 mb-1" />
          <span>Video failed to load</span>
          <a 
            href={videoUrl} 
            download 
            className="text-blue-500 hover:underline mt-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try download instead
          </a>
        </div>
      )}
      <div className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-200' : 'text-gray-500'}`}>
        {attachment.name}
      </div>
    </div>
  );
});

interface Message {
  _id: string;
  type: string;
  senderId: string; // Changed from number to string to support empId
  senderName?: string; // Optional sender name from the server
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
}

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ 
  message, 
  currentUser,
  formatTime
}: { 
  message: Message, 
  currentUser: User | null,
  formatTime: (timestamp: string) => string
}) => {
  // Use the staff directory hook to get names by empId
  const { getNameByEmpId, isLoading } = useStaffDirectory();
  
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-gray-100 rounded-full px-4 py-1 text-gray-600 text-sm flex items-center">
          <span>{message.content}</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          {formatTime(message.createdAt)}
        </div>
      </div>
    );
  }
  
  // Compare using empId (string) instead of numeric id
  const isCurrentUser = currentUser?.empId === message.senderId;
  
  // Get the sender name from the staff directory
  const senderName = useMemo(() => {
    // First check if the message already has a name
    if (message.senderName) return message.senderName;
    
    // If it's the current user, use their name
    if (message.senderId === currentUser?.empId) {
      return currentUser.name;
    }
    
    // Otherwise, look up in the staff directory
    return getNameByEmpId(message.senderId);
  }, [message.senderName, message.senderId, currentUser, getNameByEmpId]);
  
  return (
    <div
      className={`chat-message ${
        isCurrentUser ? "justify-end" : ""
      }`}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-3">
          <AvatarFallback>{senderName ? senderName[0] : "U"}</AvatarFallback>
        </Avatar>
      )}
      
      <div>
        {!isCurrentUser && (
          <div className="flex items-center">
            <span className="font-medium text-sm">
              {isLoading ? "Loading..." : senderName}
            </span>
          </div>
        )}
        
        <div
          className={`chat-bubble ${
            isCurrentUser
              ? "bg-primary text-white"
              : "bg-white"
          }`}
        >
          {message.content && <p className="mb-2">{message.content}</p>}
          
          {/* Attachments display - optimized to reduce flickering */}
          {message.attachments && message.attachments.length > 0 ? (
            <div className="attachments-container mt-2 grid gap-2">
              {message.attachments.map((attachment, index) => {
                // Use a stable key combining message id and index
                const stableKey = `${message._id}-${index}`;
                return (
                  <div key={stableKey} className="attachment">
                    {/* Use memoized image component to prevent flickering */}
                    {attachment.type === 'image' && (
                      <MemoizedImageAttachment 
                        attachment={attachment} 
                        isCurrentUser={isCurrentUser}
                        key={`img-${stableKey}`}
                      />
                    )}
                    
                    {/* Use memoized document component */}
                    {attachment.type === 'document' && (
                      <MemoizedDocAttachment 
                        attachment={attachment} 
                        isCurrentUser={isCurrentUser}
                        key={`doc-${stableKey}`}
                      />
                    )}
                    
                    {/* Audio attachments */}
                    {attachment.type === 'audio' && (
                      <MemoizedAudioAttachment 
                        attachment={attachment} 
                        isCurrentUser={isCurrentUser}
                        key={`audio-${stableKey}`}
                      />
                    )}
                    
                    {/* Video attachments */}
                    {attachment.type === 'video' && (
                      <MemoizedVideoAttachment 
                        attachment={attachment} 
                        isCurrentUser={isCurrentUser}
                        key={`video-${stableKey}`}
                      />
                    )}
                    
                    {/* Unknown attachment type fallback */}
                    {!['image', 'document', 'audio', 'video'].includes(attachment.type) && (
                      <div className="unknown-attachment bg-gray-100 p-2 rounded-md">
                        <FileIcon className="h-5 w-5 text-gray-500" />
                        <span className="ml-2 text-sm text-gray-800">
                          {attachment.name || 'Unknown file'}
                        </span>
                        <div className="text-xs mt-1 text-gray-500">
                          Type: {attachment.type || 'unknown'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // If message has type 'attachment' but no attachments array, debug this case
            message.type === 'attachment' && (
              <div className="bg-red-50 p-2 rounded-md text-red-600 text-xs">
                Attachment message without attachment data
              </div>
            )
          )}
        </div>
        
        <span className="chat-timestamp">
          {formatTime(message.createdAt)}
        </span>
      </div>
      
      {isCurrentUser && (
        <Avatar className="h-8 w-8 ml-3">
          {currentUser?.profileImage && (
            <AvatarImage
              src={currentUser.profileImage || ''}
              alt={currentUser.name}
            />
          )}
          <AvatarFallback>
            {currentUser?.name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

function MessageListComponent({ messages, currentUser }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  
  // Stabilize the messages using a combination of length and ids for better performance
  const stableMessages = useMemo(() => {
    // We use a stable identity by creating a dependency on the length and message IDs
    // This will only update when messages actually change
    return messages;
  }, [messages.length, messages.map(m => m._id).join(',')]);
  
  // Optimize scrolling - only scroll on new messages, not on every render
  useEffect(() => {
    // Only scroll if messages length has changed (new message) or first render
    if (stableMessages.length !== prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLengthRef.current = stableMessages.length;
    }
  }, [stableMessages.length]); // Only depend on the length, not the entire array
  
  // Memoize the formatTime function to prevent unnecessary re-renders
  const formatTime = useCallback((timestamp: string) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      
      // If less than 24 hours, show time
      if (Date.now() - date.getTime() < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Otherwise show relative time
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return timestamp;
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {stableMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      ) : (
        <>
          {/* Render memoized message items */}
          {stableMessages.map((message) => (
            <MessageItem 
              key={message._id} 
              message={message} 
              currentUser={currentUser} 
              formatTime={formatTime}
            />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
const MessageList = memo(MessageListComponent);
export default MessageList;
