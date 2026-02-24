import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, Calendar, Users } from 'lucide-react';

const Navbar = () => {
  const { user, role, logout, loading } = useAuth();  // ← add loading
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return null;           // Still fetching — wait silently
  if (!user) return null;             // Confirmed not logged in — hide navbar
  if (!loading && !user) return null;
  
  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Felicity</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {role === 'participant' && (
                <>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/browse-events"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Browse Events
                  </Link>
                  <Link
                    to="/clubs"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Clubs
                  </Link>
                </>
              )}

              {role === 'organizer' && (
                <>
                  <Link
                    to="/organizer/dashboard"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/organizer/create-event"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Event
                  </Link>
                  <Link
                    to="/organizer/attendance"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Attendance
                  </Link>
                  <Link
                    to="/organizer/attendance-logs"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Attendance Logs
                  </Link>
                  <Link
                    to="/organizer/orders"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Orders
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/dashboard?tab=organizers"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Clubs
                  </Link>
                  <Link
                    to="/admin/dashboard?tab=password-resets"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-indigo-500"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Password Resets
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-sm text-gray-700 mr-4">
                {user.firstName || user.organizerName || 'Admin'}
              </span>
            </div>
            <Link
              to="/profile"
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <User className="w-6 h-6" />
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;