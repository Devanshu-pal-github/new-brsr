import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import Navbar from '../components/layout/Navbar';

const Dashboard = () => {
  const user = useSelector(selectCurrentUser);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg
                      border border-gray-200 border-opacity-60 rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to BRSR Dashboard</h1>
          
          {user && (
            <div className="mb-6">
              <p className="text-gray-600">Hello, <span className="font-semibold">{user.username}</span>!</p>
              <p className="text-gray-600">You are successfully logged in.</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dashboard cards can be added here */}
            <div className="bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg p-5 text-white shadow-md">
              <h3 className="font-bold text-lg mb-2">Quick Stats</h3>
              <p>Your dashboard content goes here</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 shadow-md border border-gray-100">
              <h3 className="font-bold text-lg mb-2 text-gray-800">Recent Activity</h3>
              <p className="text-gray-600">No recent activities</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 shadow-md border border-gray-100">
              <h3 className="font-bold text-lg mb-2 text-gray-800">Notifications</h3>
              <p className="text-gray-600">No new notifications</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;