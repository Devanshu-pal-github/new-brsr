import React, { useState, useRef } from 'react';
import { useMcpChatMutation } from '../../src/store/api/apiSlice';
import { X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const MCPModal = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [sessionId] = useState(uuidv4());
  const [sendChat, { isLoading, error }] = useMcpChatMutation();
  const inputRef = useRef(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const res = await sendChat({ sessionId, message: input }).unwrap();
      setResponse(res.reply);
    } catch (err) {
      setResponse('Error: ' + (err?.data?.reply || err?.error || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 min-h-[480px] relative border-2 border-[#20305D] flex flex-col justify-start">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          aria-label="Close MCP Modal"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-[#20305D] mb-4">MCP Chat</h2>
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            className="border border-[#20305D] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#20305D] text-sm text-black bg-white"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="bg-[#20305D] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#001A4D] transition-colors text-sm"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <div className="mt-4 min-h-[160px] max-h-[220px] bg-[#F3F4F6] rounded-lg p-3 text-sm text-gray-800 border border-[#E5E7EB] overflow-y-auto">
          {response ? (
            <pre className="whitespace-pre-wrap break-words">{typeof response === 'object' ? JSON.stringify(response, null, 2) : response}</pre>
          ) : (
            <span className="text-gray-400">MCP response will appear here.</span>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400">Session ID: <span className="font-mono">{sessionId}</span></div>
        {error && <div className="mt-2 text-xs text-red-500">Error: {error.message || 'Unknown error'}</div>}
      </div>
    </div>
  );
};

export default MCPModal;
