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
        
      </main>
    </div>
  );
};

export default Dashboard;