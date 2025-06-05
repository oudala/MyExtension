import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Notifications from './Notifications';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 w-64 transform bg-blue-800 overflow-y-auto lg:translate-x-0 lg:static lg:inset-0 transition duration-300 ease-in-out">
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center">
            <span className="text-white text-2xl mx-2 font-semibold">LinkDrop</span>
          </div>
        </div>

        <nav className="mt-10">
          <Link
            to="/"
            className={`flex items-center px-6 py-3 text-white hover:bg-blue-700 ${isActive('/')}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mx-3">Dashboard</span>
          </Link>

          <Link
            to="/links"
            className={`flex items-center px-6 py-3 mt-2 text-white hover:bg-blue-700 ${isActive('/links')}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8284 10.1716C12.2663 8.60948 9.73367 8.60948 8.17157 10.1716L4.17157 14.1716C2.60948 15.7337 2.60948 18.2663 4.17157 19.8284C5.73367 21.3905 8.26633 21.3905 9.82843 19.8284L10.93 18.7269M10.1716 13.8284C11.7337 15.3905 14.2663 15.3905 15.8284 13.8284L19.8284 9.82843C21.3905 8.26633 21.3905 5.73367 19.8284 4.17157C18.2663 2.60948 15.7337 2.60948 14.1716 4.17157L13.072 5.27118" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mx-3">Links</span>
          </Link>

          <Link
            to="/friends"
            className={`flex items-center px-6 py-3 mt-2 text-white hover:bg-blue-700 ${isActive('/friends')}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.35418C12.7329 3.52375 13.8053 3 15 3C17.2091 3 19 4.79086 19 7C19 9.20914 17.2091 11 15 11C13.8053 11 12.7329 10.4762 12 9.64582M15 21H3V20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21ZM15 21H21V20C21 16.6863 18.3137 14 15 14C13.9071 14 12.8825 14.2922 12 14.8027M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mx-3">Friends</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className={`flex items-center px-6 py-3 mt-2 text-white hover:bg-blue-700 ${isActive('/profile')}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mx-3">Profile</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center px-6 py-3 mt-2 text-white hover:bg-blue-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mx-3">Logout</span>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-white border-b">
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 focus:outline-none lg:hidden"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-700 ml-2">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname === '/links' && 'Links'}
              {location.pathname === '/friends' && 'Friends'}
              {location.pathname === '/profile' && 'Profile'}
            </h1>
          </div>

          <div className="flex items-center">
            <div className="relative mr-4">
              <Notifications />
            </div>
            <div className="relative">
              <div className="flex items-center cursor-pointer">
                <span className="text-gray-700 mr-2">{user?.username}</span>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
