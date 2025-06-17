import React from 'react';
import { 
  BarChart3, 
  Users, 
  Factory, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Leaf,
  MapPin
} from 'lucide-react';
import DashboardCard from './DashboardCard';
import CircularProgress from './charts/CircularProgress';
import ProgressBar from './charts/ProgressBar';
import PlantLocationMap from './charts/PlantLocationMap';

const Dashboard = () => {
  // Example data - replace with actual data from your application
  const completionStats = {
    overall: 68,
    environment: 75,
    social: 62,
    governance: 67
  };

  // Enhanced plant locations data with realistic Indian locations
  const plantLocations = [
    {
      id: 1,
      name: "Mumbai Manufacturing Hub",
      address: "MIDC Industrial Area, Andheri East, Mumbai, Maharashtra",
      status: "active",
      latitude: 19.0760,
      longitude: 72.8777,
      type: "Manufacturing"
    },
    {
      id: 2,
      name: "Delhi NCR Plant",
      address: "Sector 63, Noida, Uttar Pradesh",
      status: "active",
      latitude: 28.6139,
      longitude: 77.2090,
      type: "Assembly"
    },
    {
      id: 3,
      name: "Bangalore Tech Center",
      address: "Electronic City Phase 1, Bangalore, Karnataka",
      status: "active",
      latitude: 12.9716,
      longitude: 77.5946,
      type: "R&D"
    },
    {
      id: 4,
      name: "Chennai Production Unit",
      address: "Sriperumbudur Industrial Park, Chennai, Tamil Nadu",
      status: "active",
      latitude: 13.0827,
      longitude: 80.2707,
      type: "Manufacturing"
    },
    {
      id: 5,
      name: "Pune Development Center",
      address: "Hinjewadi Phase 2, Pune, Maharashtra",
      status: "pending",
      latitude: 18.5204,
      longitude: 73.8567,
      type: "R&D"
    },
    {
      id: 6,
      name: "Hyderabad Unit",
      address: "HITEC City, Hyderabad, Telangana",
      status: "active",
      latitude: 17.3850,
      longitude: 78.4867,
      type: "Manufacturing"
    },
    {
      id: 7,
      name: "Ahmedabad Facility",
      address: "Sanand GIDC, Ahmedabad, Gujarat",
      status: "active",
      latitude: 23.0225,
      longitude: 72.5714,
      type: "Assembly"
    },
    {
      id: 8,
      name: "Kolkata Center",
      address: "Salt Lake Sector V, Kolkata, West Bengal",
      status: "pending",
      latitude: 22.5726,
      longitude: 88.3639,
      type: "R&D"
    },
    {
      id: 9,
      name: "Jaipur Plant",
      address: "Sitapura Industrial Area, Jaipur, Rajasthan",
      status: "active",
      latitude: 26.9124,
      longitude: 75.7873,
      type: "Manufacturing"
    },
    {
      id: 10,
      name: "Indore Unit",
      address: "Pithampur Industrial Area, Indore, Madhya Pradesh",
      status: "pending",
      latitude: 22.7196,
      longitude: 75.8577,
      type: "Assembly"
    },
    {
      id: 11,
      name: "Chandigarh Facility",
      address: "Industrial Area Phase I, Chandigarh",
      status: "active",
      latitude: 30.7333,
      longitude: 76.7794,
      type: "Manufacturing"
    },
    {
      id: 12,
      name: "Bhubaneswar Center",
      address: "Info City, Bhubaneswar, Odisha",
      status: "active",
      latitude: 20.2961,
      longitude: 85.8245,
      type: "R&D"
    }
  ];

  // Updated plant statistics based on the enhanced data
  const plantStats = {
    total: plantLocations.length,
    active: plantLocations.filter(p => p.status === 'active').length,
    pending: plantLocations.filter(p => p.status === 'pending').length,
    types: {
      manufacturing: plantLocations.filter(p => p.type === 'Manufacturing').length,
      assembly: plantLocations.filter(p => p.type === 'Assembly').length,
      rnd: plantLocations.filter(p => p.type === 'R&D').length
    }
  };

  const recentNotifications = [
    { id: 1, text: 'Audit Deadline Approaching', type: 'warning' },
    { id: 2, text: 'BRSR Report Submission Reminder', type: 'info' },
    { id: 3, text: 'Carbon Emissions Data Updated', type: 'success' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1A2341] mb-4 sm:mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-auto">
        {/* Overall Progress Card */}
        <DashboardCard 
          title="Overall Progress" 
          icon={BarChart3}
          className="sm:col-span-1"
        >
          <div className="flex justify-center p-2 sm:p-4">
            <CircularProgress 
              percentage={completionStats.overall}
              label="Total Completion"
              sublabel="All Modules"
              size={window.innerWidth < 640 ? 100 : window.innerWidth < 1024 ? 110 : 120}
            />
          </div>
        </DashboardCard>

        {/* Module Progress Card */}
        <DashboardCard 
          title="Module Progress" 
          icon={CheckCircle2}
          className="sm:col-span-2 h-fit"
        >
          <div className="space-y-3 p-2 sm:p-4">
            <ProgressBar 
              percentage={completionStats.environment}
              label="Environment"
              sublabel="Environmental metrics and compliance"
            />
            <ProgressBar 
              percentage={completionStats.social}
              label="Social"
              sublabel="Social responsibility and impact"
            />
            <ProgressBar 
              percentage={completionStats.governance}
              label="Governance"
              sublabel="Corporate governance and ethics"
            />
          </div>
        </DashboardCard>

        {/* Updated Plant Statistics Card */}
        <DashboardCard 
          title="Plant Statistics" 
          icon={Factory}
          className="sm:col-span-1"
        >
          <div className="space-y-3 p-2 sm:p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Total Plants</span>
              <span className="text-lg sm:text-xl font-bold text-[#1A2341]">{plantStats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Active</span>
              <span className="text-base sm:text-lg font-semibold text-green-600">{plantStats.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Pending Review</span>
              <span className="text-base sm:text-lg font-semibold text-orange-500">{plantStats.pending}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Manufacturing</span>
                <span className="text-base sm:text-lg font-semibold text-blue-600">{plantStats.types.manufacturing}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Assembly</span>
                <span className="text-base sm:text-lg font-semibold text-purple-600">{plantStats.types.assembly}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">R&D Centers</span>
                <span className="text-base sm:text-lg font-semibold text-indigo-600">{plantStats.types.rnd}</span>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Plant Location Map Card */}
        <DashboardCard 
          title="Plant Locations" 
          icon={MapPin}
          className="col-span-full lg:col-span-2"
        >
          <div className="w-full">
            <PlantLocationMap plants={plantLocations} />
          </div>
        </DashboardCard>

        {/* Recent Notifications Card */}
        <DashboardCard 
          title="Recent Notifications" 
          icon={AlertCircle}
          className="sm:col-span-1"
        >
          <div className="space-y-3 p-2 sm:p-4 max-h-[300px] overflow-y-auto">
            {recentNotifications.map(notification => (
              <div 
                key={notification.id} 
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {notification.type === 'warning' && (
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                )}
                {notification.type === 'info' && (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                )}
                {notification.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm text-gray-700">{notification.text}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Sustainability Metrics Card */}
        <DashboardCard 
          title="Sustainability Metrics" 
          icon={Leaf}
          className="sm:col-span-1"
        >
          <div className="space-y-4 p-2 sm:p-4">
            <div className="flex items-center justify-center">
              <CircularProgress 
                percentage={82}
                size={window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 90 : 100}
                label="Carbon Reduction"
                sublabel="Year over Year"
              />
            </div>
            <div className="pt-2 border-t">
              <ProgressBar 
                percentage={75}
                label="Renewable Energy"
                sublabel="Current Usage"
              />
            </div>
          </div>
        </DashboardCard>

        {/* Team Activity Card */}
        <DashboardCard 
          title="Team Activity" 
          icon={Users}
          className="sm:col-span-1"
        >
          <div className="space-y-3 p-2 sm:p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Active Users</span>
              <span className="text-base sm:text-lg font-semibold text-[#1A2341]">24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Reports Generated</span>
              <span className="text-base sm:text-lg font-semibold text-[#1A2341]">156</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Updates This Week</span>
              <span className="text-base sm:text-lg font-semibold text-[#1A2341]">38</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default Dashboard; 