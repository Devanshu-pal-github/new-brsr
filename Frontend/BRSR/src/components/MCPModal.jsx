import React, { useState, useRef } from 'react';
import { useMcpChatMutation } from '../../src/store/api/apiSlice';
import { X, Send, Bot, Sparkles, MessageCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Using the original working functionality with your actual hook
const MCPModal = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [sessionId] = useState(() => {
    // Generate UUID v4 equivalent
    return 'sess_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  });
  
  // Mock for demonstration - replace with your actual hook
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Replace the mock with the actual useMcpChatMutation hook
  const [triggerMcpChat] = useMcpChatMutation();
  const sendChat = async ({ sessionId, message }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the actual MCP API
      const res = await triggerMcpChat({ sessionId, message });
      setIsLoading(false);
      return res;
    } catch (err) {
      setIsLoading(false);
      setError(err);
      throw err;
    }
  };

  const inputRef = useRef(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const res = await sendChat({ sessionId, message: input });
      // The response may be an object with a 'reply' property, or just a string
      setResponse(res?.reply || res);
      setInput(''); // Clear input after successful send
    } catch (err) {
      setResponse('Error: ' + (err?.data?.reply || err?.error || err?.message || 'Unknown error'));
      setError(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Enhanced backdrop with your colors */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#000B33]/60 via-[#000B33]/40 to-[#000B33]/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Main modal with modern styling but original functionality */}
      <div className="relative bg-[#000B33]/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-[#E5E7EB]/20 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        
        {/* Enhanced header */}
        <div className="relative bg-gradient-to-r from-[#000B33] via-[#001B4D] to-[#002B5D] p-6 text-[#E5E7EB] border-b border-[#E5E7EB]/10">
          <div className="absolute inset-0 bg-[#E5E7EB]/5" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#E5E7EB]/20 rounded-full transition-colors duration-200 z-10 text-[#E5E7EB]"
            aria-label="Close MCP Modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center gap-3">
            <div className="p-2 bg-[#E5E7EB]/20 rounded-xl backdrop-blur-sm">
              <Bot className="w-6 h-6 text-[#E5E7EB]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#E5E7EB]">MCP Chat</h2>
              <p className="text-[#E5E7EB]/70 text-sm">AI-Powered Assistant</p>
            </div>
          </div>
          
          {/* Floating particles effect */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-2 left-4 w-2 h-2 bg-[#E5E7EB]/30 rounded-full animate-pulse" />
            <div className="absolute top-6 right-8 w-1 h-1 bg-[#E5E7EB]/40 rounded-full animate-bounce" />
            <div className="absolute bottom-4 left-8 w-1.5 h-1.5 bg-[#E5E7EB]/20 rounded-full animate-pulse delay-500" />
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 bg-gradient-to-b from-[#000B33]/30 to-[#000B33]/50 min-h-[400px] flex flex-col">
          
          {/* Input form - keeping original form structure */}
          <form onSubmit={handleSend} className="flex flex-col gap-4 mb-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-[#000B33]/90 backdrop-blur-sm border border-[#E5E7EB]/30 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#E5E7EB]/50 focus:border-[#E5E7EB]/50 text-sm placeholder-[#E5E7EB]/50 text-[#E5E7EB] shadow-lg transition-all duration-200"
                placeholder="Type your message... ✨"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              {input && (
                <Sparkles className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/60" />
              )}
            </div>
            
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg ${
                isLoading || !input.trim()
                  ? 'bg-[#E5E7EB]/20 text-[#E5E7EB]/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#001B4D] to-[#002B5D] text-[#E5E7EB] hover:from-[#002B5D] hover:to-[#003B6D] hover:shadow-xl transform hover:scale-105 active:scale-95 border border-[#E5E7EB]/20'
              }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#E5E7EB]/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#E5E7EB]/60 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-[#E5E7EB]/60 rounded-full animate-bounce delay-200" />
                  </div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>

          {/* Response area - keeping original structure */}
          <div className="flex-1 bg-[#000B33]/80 backdrop-blur-sm rounded-2xl p-4 border border-[#E5E7EB]/20 overflow-y-auto shadow-inner">
            {response ? (
              <pre className="whitespace-pre-wrap break-words text-sm text-[#E5E7EB] leading-relaxed">
                {typeof response === 'object' ? JSON.stringify(response, null, 2) : response}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-3 bg-[#E5E7EB]/10 rounded-2xl">
                  <MessageCircle className="w-6 h-6 text-[#E5E7EB]/60" />
                </div>
                <div>
                  <h3 className="font-medium text-[#E5E7EB]/80 mb-1">Ready to chat</h3>
                  <p className="text-[#E5E7EB]/50 text-sm">MCP response will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Session info and error - keeping original structure */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#E5E7EB]/60">
              <span>Session ID: <span className="font-mono text-[#E5E7EB]/80">{sessionId}</span></span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Connected
              </span>
            </div>
            
            {error && (
              <div className="p-2 bg-red-900/30 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-300">Error: {error.message || 'Unknown error'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPModal;