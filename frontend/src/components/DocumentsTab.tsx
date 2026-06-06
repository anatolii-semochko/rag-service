import React from 'react';
import { FileText, Upload, Folder, Search, Filter } from 'lucide-react';

export const DocumentsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header with Upload */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Document Manager</h2>
        </div>
        <button className="btn-primary flex items-center gap-2" disabled>
          <Upload className="w-4 h-4" />
          Upload Documents
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Search documents..."
            disabled
          />
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" disabled>
            <option>All Collections</option>
          </select>
          <button className="btn-outline flex items-center gap-2" disabled>
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Collections Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium">Collections</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">All Documents</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">0 documents</p>
              </div>
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No collections yet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Documents</h3>
            </div>
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h4 className="text-lg font-medium mb-2">No documents found</h4>
                <p className="text-sm mb-4">Upload documents to start building your knowledge base</p>
                <button className="btn-primary flex items-center gap-2 mx-auto" disabled>
                  <Upload className="w-4 h-4" />
                  Upload Your First Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collections</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <Folder className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">0 MB</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-sm font-bold">📊</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Indexed</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-sm font-bold">🔍</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};