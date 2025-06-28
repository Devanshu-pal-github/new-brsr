import React, { useState, useRef } from 'react';
import { useMcpChatMutation } from '../../src/store/api/apiSlice';
import { X, Send, Bot, Sparkles, MessageCircle } from 'lucide-react';

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Enhanced backdrop with your colors */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#000B33]/60 via-[#000B33]/40 to-[#000B33]/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Main modal with light, modern styling */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        
        {/* Light, elegant header */}
        <div className="relative bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-7 text-slate-700 border-b border-slate-200/70">
          <div className="absolute inset-0 bg-white/30" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-200/50 rounded-full transition-colors duration-200 z-10 text-slate-600 hover:text-slate-800"
            aria-label="Close MCP Modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">MCP Chat</h2>
              <p className="text-slate-600 text-sm">AI-Powered Assistant</p>
            </div>
          </div>
          
          {/* Subtle floating elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-3 left-6 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" />
            <div className="absolute top-7 right-12 w-1 h-1 bg-indigo-400/40 rounded-full animate-bounce" />
            <div className="absolute bottom-5 left-10 w-1.5 h-1.5 bg-slate-400/20 rounded-full animate-pulse delay-500" />
            <div className="absolute top-1/2 right-6 w-1 h-1 bg-blue-300/30 rounded-full animate-ping" />
          </div>
        </div>

        {/* Light content area */}
        <div className="p-8 bg-gradient-to-b from-white/80 to-slate-50/60 min-h-[480px] flex flex-col">
          
          {/* Enhanced input section */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-white/90 backdrop-blur-sm border border-slate-300/60 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/70 text-base placeholder-slate-500 text-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
                placeholder="Ask about plant data, reports, or company analytics... 🏭"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoFocus
              />
              {input && (
                <Sparkles className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500/70" />
              )}
            </div>
            
            <button
              onClick={handleSend}
              className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold transition-all duration-200 shadow-md text-base ${
                isLoading || !input.trim()
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-95 border border-blue-400/20'
              }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-200" />
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
          </div>

          {/* Light response area */}
          <div className="flex-1 bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 overflow-y-auto shadow-inner">
            {response ? (
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-700 leading-relaxed font-mono">
                {typeof response === 'object' ? JSON.stringify(response, null, 2) : response}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-800">Plant Data Assistant 🏭</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    I can help you access and analyze your company's plant data, reports, and operational insights:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-700 font-medium">Plant performance & metrics</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200/50">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm text-slate-700 font-medium">Production reports & analytics</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-slate-700 font-medium">Operational data insights</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-xs text-slate-500 italic">Ask about your plant data to get started! 📊</p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced session info and error */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/80 rounded-lg px-3 py-2">
              <span>Session: <span className="font-mono text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded text-[10px]">{sessionId.slice(0, 12)}...</span></span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm" />
                <span className="text-emerald-600 font-medium">Connected</span>
              </span>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-xl shadow-sm">
                <p className="text-xs text-red-600 font-medium">Error: {error.message || 'Unknown error'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPModal;