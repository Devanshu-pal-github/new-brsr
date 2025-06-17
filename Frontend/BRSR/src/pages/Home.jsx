import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../store/slices/authSlice';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';

const Home = () => {
  const user = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);

  return (
    <div className="min-h-screen bg-[#E6F0FA] relative overflow-hidden">
      {/* Navbar */}
      <Navbar className="bg-[#E6F0FA]/90 backdrop-blur-sm shadow-sm" />

      {/* Full-Screen Background Image Section */}
      <div className="relative w-full h-screen bg-[#1A3C5E]/50">
        <img
          src="/public/GPEVG.jpg"
          alt="Greenery Background"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-6">
          {/* Welcome Section */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-8 border border-[#E5E7EB] shadow-sm max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-[#1A3C5E] mb-4 font-['Inter']">
                  Welcome, {user?.user_name || 'User'}!
                </h1>
                <p className="text-[#E5E7EB] text-sm font-['Inter']">
                  Please select a report from the dropdown in the navigation bar to get started.
                </p>

                {userRole && (
                  <motion.div
                    className="mt-4 p-4 bg-[#E6F0FA] rounded-lg border border-[#B3D4FC] inline-block hover:scale-105 hover:shadow-md hover:bg-[#B3D4FC] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-[#1A3C5E] text-sm font-['Inter']">
                      You are logged in as: <span className="font-semibold">{userRole}</span>
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Kush Popup and Right-Side Section */}
          <div className="flex items-center justify-between w-full">
            {/* Quick-Action Popup (Kush) */}
            <motion.div
              className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-[#B3D4FC] shadow-sm w-64"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <h3 className="text-lg font-bold text-[#1A3C5E] mb-4 font-['Inter']">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full text-sm text-[#1A3C5E] bg-[#E6F0FA] rounded-md px-3 py-2 border border-[#E5E7EB] hover:scale-105 hover:bg-[#B3D4FC] hover:border-[#B3D4FC] transition-all duration-300 font-['Inter']">
                  Resume Previous Report
                </button>
                <button className="w-full text-sm text-[#1A3C5E] bg-[#E6F0FA] rounded-md px-3 py-2 border border-[#E5E7EB] hover:scale-105 hover:bg-[#B3D4FC] hover:border-[#B3D4FC] transition-all duration-300 font-['Inter']">
                  Connect to Counselor
                </button>
                <button className="w-full text-sm text-[#1A3C5E] bg-[#E6F0FA] rounded-md px-3 py-2 border border-[#E5E7EB] hover:scale-105 hover:bg-[#B3D4FC] hover:border-[#B3D4FC] transition-all duration-300 font-['Inter']">
                  View Reports
                </button>
              </div>
            </motion.div>

            {/* Right-Side Section */}
            <div className="flex flex-col items-end space-y-4">
              <h2 className="text-2xl font-bold text-[#1A3C5E] font-['Inter'] tracking-wide">
                Your ESG Partner
              </h2>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-[#B3D4FC] shadow-sm">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-sm text-[#1A3C5E] font-['Inter'] hover:underline hover:text-[#B3D4FC] transition-colors duration-300 cursor-pointer">
                Connect for More Information
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;