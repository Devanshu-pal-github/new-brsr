import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/sidebar';

const Dashboard = () => {
  const user = useSelector(selectCurrentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Static list of reports
  const reports = [
    { id: 1, name: 'BRSR Report', description: 'Business Responsibility and Sustainability Report for FY 2023-2024', status: 'Active' },
    { id: 2, name: 'CSR Report', description: 'Corporate Social Responsibility Report for community initiatives', status: 'Draft' },
    { id: 3, name: 'ESG Report', description: 'Environmental, Social, and Governance Report for sustainability metrics', status: 'Completed' },
    { id: 4, name: 'CG Report', description: 'Corporate Governance Report for compliance and ethics', status: 'In Review' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 fixed left-0 top-[48px] h-[calc(100vh-48px)]">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <main className="container mx-auto px-8 py-8">
            {/* Welcome Section */}
            <section className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome, {user?.user_name || 'User'}!
              </h1>
              <p className="text-gray-600 mt-2">
                Explore your reports and manage sustainability data below.
              </p>
            </section>

            {/* Reports List */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Your Reports
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
                  >
                    <h3 className="text-xl font-semibold text-gray-800">
                      {report.name}
                    </h3>
                    <p className="text-gray-600 mt-2">{report.description}</p>
                    <div className="mt-4">
                      <span
                        className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                          report.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Stats Section */}
            <section className="mt-12">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Quick Stats
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800">Total Plants</h3>
                  <p className="text-3xl font-bold text-[#20305D] mt-2">12</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800">Active Reports</h3>
                  <p className="text-3xl font-bold text-[#20305D] mt-2">4</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800">Submissions</h3>
                  <p className="text-3xl font-bold text-[#20305D] mt-2">28</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800">Completion</h3>
                  <p className="text-3xl font-bold text-[#20305D] mt-2">76%</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;