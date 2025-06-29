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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4">
      {/* Enhanced backdrop with your colors */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#000B33]/60 via-[#000B33]/40 to-[#000B33]/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Main modal with responsive sizing */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl border border-slate-200/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        
        {/* Light, elegant header - responsive padding */}
        <div className="relative bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-7 text-slate-700 border-b border-slate-200/70 flex-shrink-0">
          <div className="absolute inset-0 bg-white/30" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 hover:bg-slate-200/50 rounded-full transition-colors duration-200 z-10 text-slate-600 hover:text-slate-800"
            aria-label="Close MCP Modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div className="relative flex items-center gap-2 sm:gap-3 pr-8 sm:pr-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">MCP Chat</h2>
              <p className="text-slate-600 text-xs sm:text-sm truncate">AI-Powered Assistant</p>
            </div>
          </div>
          
          {/* Subtle floating elements - hidden on very small screens */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none hidden sm:block">
            <div className="absolute top-3 left-6 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" />
            <div className="absolute top-7 right-12 w-1 h-1 bg-indigo-400/40 rounded-full animate-bounce" />
            <div className="absolute bottom-5 left-10 w-1.5 h-1.5 bg-slate-400/20 rounded-full animate-pulse delay-500" />
            <div className="absolute top-1/2 right-6 w-1 h-1 bg-blue-300/30 rounded-full animate-ping" />
          </div>
        </div>

        {/* Content area with flex-1 to take remaining space */}
        <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-white/80 to-slate-50/60 flex flex-col flex-1 min-h-0">
          
          {/* Enhanced input section - flex-shrink-0 to prevent shrinking */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4 flex-shrink-0">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-white/90 backdrop-blur-sm border border-slate-300/60 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 pr-10 sm:pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/70 text-sm sm:text-base placeholder-slate-500 text-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
                placeholder="Ask about plant data, reports, analytics... 🏭"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoFocus
              />
              {input && (
                <Sparkles className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500/70" />
              )}
            </div>
            
            <button
              onClick={handleSend}
              className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl font-semibold transition-all duration-200 shadow-md text-sm sm:text-base ${
                isLoading || !input.trim()
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-95 border border-blue-400/20'
              }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/70 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/70 rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/70 rounded-full animate-bounce delay-200" />
                  </div>
                  <span className="hidden sm:inline">Sending...</span>
                  <span className="sm:hidden">Send...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>

          {/* Fixed height scrollable response area */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/60 shadow-inner overflow-hidden flex flex-col h-40 sm:h-60 md:h-72 lg:h-80 xl:h-96">
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent h-full">
              {(() => {
                // Unwrap { data: { reply: [...] } } or { reply: [...] }
                let display = response;
                if (display && typeof display === 'object') {
                  if ('data' in display && display.data && typeof display.data === 'object' && 'reply' in display.data) {
                    display = display.data.reply;
                  } else if ('reply' in display) {
                    display = display.reply;
                  }
                }

                // If no response or null/empty, show a friendly placeholder
                if (
                  display === null ||
                  display === undefined ||
                  (typeof display === 'string' && display.trim().toLowerCase() === 'null') ||
                  (typeof display === 'string' && display.trim() === '') ||
                  (Array.isArray(display) && display.length === 0)
                ) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
                      <MessageCircle className="w-10 h-10 mb-2 text-blue-300 animate-pulse" />
                      <span className="text-base sm:text-lg font-medium">Your response will appear here</span>
                      <span className="text-xs sm:text-sm mt-1">Ask a question to get started!</span>
                    </div>
                  );
                }

                // Generalized: handle arrays of objects with a single common key
                if (Array.isArray(display) && display.length > 0 && display.every(item => typeof item === 'object' && Object.keys(item).length === 1)) {
                  // Find the single key used in all objects
                  const key = Object.keys(display[0])[0];
                  const allSameKey = display.every(item => Object.keys(item)[0] === key);
                  if (allSameKey) {
                    // Humanize heading
                    let heading = '';
                    if (key === 'name') heading = 'Reports:';
                    else if (key === 'plant_name') heading = 'Plants:';
                    else heading = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ':';
                    return (
                      <div className="text-left">
                        <h4 className="font-semibold text-base sm:text-lg mb-2 text-slate-800">{heading}</h4>
                        <ol className="list-decimal list-inside space-y-1">
                          {display.map((item, idx) => (
                            <li key={idx} className="text-slate-700 text-sm sm:text-base">{item[key]}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  }
                }
                // If it's a plain object (not array), render as a key-value table for user-friendly display
                if (display && typeof display === 'object' && !Array.isArray(display)) {
                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs sm:text-sm text-slate-700 border border-slate-200 rounded-lg">
                        <tbody>
                          {Object.entries(display).map(([key, value]) => (
                            <tr key={key} className="border-b last:border-b-0">
                              <td className="font-semibold pr-2 py-1 align-top text-slate-800 whitespace-nowrap">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                              <td className="pl-2 py-1 align-top">
                                {typeof value === 'object' && value !== null ? (
                                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 rounded p-1">{JSON.stringify(value, null, 2)}</pre>
                                ) : String(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                // Fallback: show as preformatted JSON or string
                return (
                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm text-slate-700 leading-relaxed font-mono">
                    {typeof display === 'object' ? JSON.stringify(display, null, 2) : display}
                  </pre>
                );
              })()}
            </div>
          </div>

          {/* Enhanced session info and error - flex-shrink-0 */}
          <div className="mt-3 sm:mt-4 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/80 rounded-lg px-3 py-2">
              <span className="truncate mr-2">
                Session: 
                <span className="font-mono text-slate-700 bg-slate-200/50 px-1.5 py-0.5 rounded text-[10px] ml-1">
                  {sessionId.slice(0, 8)}...
                </span>
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm" />
                <span className="text-emerald-600 font-medium text-xs">Connected</span>
              </span>
            </div>
            
            {error && (
              <div className="p-2.5 sm:p-3 bg-red-50/80 border border-red-200/60 rounded-lg sm:rounded-xl shadow-sm">
                <p className="text-xs text-red-600 font-medium break-words">
                  Error: {error.message || 'Unknown error'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPModal;