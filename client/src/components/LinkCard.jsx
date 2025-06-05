import React from 'react';
import { formatDate, extractDomain, truncateText } from '../utils/helpers';

/**
 * LinkCard component for displaying a shared link with consistent styling
 * Used in Dashboard, Links, and other pages
 */
const LinkCard = ({ 
  link, 
  showActions = true, 
  onMarkAsRead = null, 
  onDelete = null 
}) => {
  const handleMarkAsRead = (e) => {
    e.preventDefault();
    if (onMarkAsRead) {
      onMarkAsRead(link._id);
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (onDelete) {
      onDelete(link._id);
    }
  };

  const domain = extractDomain(link.url);

  return (
    <div className={`p-4 border rounded-lg mb-4 ${!link.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-gray-500">
                {domain.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {truncateText(link.title, 60)}
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {truncateText(link.url, 50)}
                </a>
              </p>
              <div className="text-xs text-gray-500">
                {link.sender && (
                  <span>
                    Shared by <span className="font-medium">{link.sender.username}</span>
                  </span>
                )}
                {link.receivers && link.receivers.length > 0 && (
                  <span>
                    Shared with <span className="font-medium">
                      {link.receivers.map(r => r.user?.username).join(', ')}
                    </span>
                  </span>
                )}
                <span className="mx-1">•</span>
                <span>{formatDate(link.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="mt-4 md:mt-0 md:ml-4 flex flex-shrink-0 space-x-2">
            {!link.isRead && onMarkAsRead && (
              <button
                onClick={handleMarkAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-600 px-3 py-1 rounded"
              >
                Mark as read
              </button>
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Open
            </a>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      
      {link.note && (
        <div className="mt-3 pl-12">
          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded italic">
            "{link.note}"
          </p>
        </div>
      )}
    </div>
  );
};

export default LinkCard;
