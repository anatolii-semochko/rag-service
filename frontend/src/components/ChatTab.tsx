import React from 'react';
import { Send, Settings, MessageCircle } from 'lucide-react';

export const ChatTab: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Chat Interface */}
      <div className="flex-1">
        <div className="card h-full min-h-[600px]">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="card-title">RAG Chat Interface</h2>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto min-h-[400px]">
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">Chat interface will be implemented here</p>
                  <p className="text-sm">This will include message history, input field, and RAG-powered responses</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Type your message..."
                disabled
              />
              <button className="btn-primary flex items-center gap-2" disabled>
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Settings Sidebar */}
      <div className="w-full lg:w-80">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium">Chat Settings</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Knowledge Base
              </label>
              <select className="input" disabled>
                <option>Select knowledge base...</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: 0.7
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.7"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                className="input"
                defaultValue={500}
                disabled
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};