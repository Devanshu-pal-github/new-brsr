import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../store/slices/authSlice';
import Navbar from '../components/layout/Navbar';

const Home = () => {
  const user = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar with report selection dropdown */}
      <Navbar />
      
      {/* Empty main content area */}
      <div className="container mx-auto px-8 py-8 mt-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome, {user?.user_name || 'User'}!
          </h1>
          <p className="text-gray-600">
            Please select a report from the dropdown in the navigation bar to get started.
          </p>
          
          {userRole && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg inline-block">
              <p className="text-blue-800">
                You are logged in as: <span className="font-semibold">{userRole}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;