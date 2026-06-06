import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Cookies from 'js-cookie';

import { TabNavigation } from './components/TabNavigation';
import { ChatTab } from './components/ChatTab';
import { DocumentsTab } from './components/DocumentsTab';
import { AuditTab } from './components/AuditTab';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState<string>('chat');

  // Load active tab from cookies on component mount
  useEffect(() => {
    const savedTab = Cookies.get('activeTab');
    if (savedTab && ['chat', 'documents', 'audit'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab />;
      case 'documents':
        return <DocumentsTab />;
      case 'audit':
        return <AuditTab />;
      default:
        return <ChatTab />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🤖</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">RAG Service</h1>
                  <p className="text-sm text-gray-500">Private Document Intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ● Online
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Tab Content */}
          <div className="mt-6">
            {renderActiveTab()}
          </div>
        </main>

        <Toaster position="top-right" />
      </div>
    </QueryClientProvider>
  );
}

export default App;