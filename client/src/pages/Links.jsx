import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { linksAPI } from '../services/api';
import LinkCard from '../components/LinkCard';

const Links = () => {
  const { api } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, [activeTab, currentPage]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'received') {
        response = await linksAPI.getReceivedLinks(currentPage, 10);
      } else {
        response = await linksAPI.getSentLinks(currentPage, 10);
      }
      
      setLinks(response.data.links);
      setTotalPages(Math.ceil(response.data.total / 10) || 1);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      fetchLinks();
      return;
    }
    
    try {
      setIsSearching(true);
      setLoading(true);
      
      const response = await linksAPI.searchLinks(searchQuery);
      setLinks(response.data.links);
      setTotalPages(1); // Search results don't have pagination
    } catch (error) {
      console.error('Error searching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    fetchLinks();
  };

  const handleMarkAsRead = async (linkId) => {
    try {
      await linksAPI.markAsRead(linkId);
      setLinks(prev => 
        prev.map(link => 
          link._id === linkId ? { ...link, isRead: true } : link
        )
      );
    } catch (error) {
      console.error('Error marking link as read:', error);
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await linksAPI.deleteLink(linkId);
      setLinks(prev => prev.filter(link => link._id !== linkId));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex space-x-4">
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'received'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setActiveTab('received');
                  setCurrentPage(1);
                  if (isSearching) {
                    clearSearch();
                  }
                }}
              >
                Received Links
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'sent'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setActiveTab('sent');
                  setCurrentPage(1);
                  if (isSearching) {
                    clearSearch();
                  }
                }}
              >
                Sent Links
              </button>
            </div>
            <div className="mt-4 md:mt-0">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder="Search links..."
                  className="px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
          {isSearching && (
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-600">
                Search results for: <strong>{searchQuery}</strong>
              </span>
              <button
                onClick={clearSearch}
                className="ml-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : links.length > 0 ? (
            <div className="divide-y">
              {links.map((link) => (
                <LinkCard
                  key={link._id}
                  link={link}
                  onMarkAsRead={activeTab === 'received' ? handleMarkAsRead : null}
                  onDelete={handleDeleteLink}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {isSearching
                  ? 'No links found matching your search'
                  : activeTab === 'received'
                  ? 'No links received yet'
                  : 'No links shared yet'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {!isSearching && totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-l-md border ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <div className="px-4 py-1 border-t border-b bg-white text-blue-600">
                  {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-r-md border ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Links;
