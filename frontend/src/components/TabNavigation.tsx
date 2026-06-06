import React from 'react';
import Cookies from 'js-cookie';
import { MessageCircle, FileText, BarChart3 } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'documents', label: 'Document Manager', icon: <FileText className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <BarChart3 className="w-4 h-4" /> }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    // Save active tab to cookies
    Cookies.set('activeTab', tabId, { expires: 365 });
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
              transition-colors duration-200
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};