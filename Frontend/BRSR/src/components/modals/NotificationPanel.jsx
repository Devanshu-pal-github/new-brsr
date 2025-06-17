import { X } from 'lucide-react';

// Move notifications data outside the component
export const notifications = [
  {
    _id: 'notif_001',
    title: 'Audit Deadline Approaching',
    description: 'The annual ESG compliance audit for Q4 2025 is due in 7 days. Please ensure all required documentation is prepared.',
    timestamp: '2025-06-16T09:00:00Z',
    read: false,
  },
  {
    _id: 'notif_002',
    title: 'BRSR Report Submission Reminder',
    description: 'The BRSR report for FY 2024-25 is pending submission. Complete the sustainability metrics by June 20, 2025.',
    timestamp: '2025-06-15T14:30:00Z',
    read: false,
  },
  {
    _id: 'notif_003',
    title: 'Carbon Emissions Data Incomplete',
    description: 'Scope 3 emissions data for Q2 2025 is incomplete. Please update the data to finalize the ESG report.',
    timestamp: '2025-06-14T11:15:00Z',
    read: true,
  },
];

export const getUnreadCount = () => notifications.filter(n => !n.read).length;

const NotificationPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const count = notifications.length || 0;

  // Function to truncate description to 10 words
  const truncateDescription = (description) => {
    const words = description.split(' ');
    if (words.length > 10) {
      return words.slice(0, 10).join(' ') + '...';
    }
    return description;
  };

  // Function to handle click outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Function to format timestamp to "Day HH:mm"
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50" onClick={handleOverlayClick}>
      <div className="absolute right-32 top-16 w-80">
        <div className="w-full bg-gradient-to-br from-white to-gray-50 border border-slate-200/70 shadow-xl rounded-2xl backdrop-blur-sm transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1A2341]">Notifications</h3>
              {count > 0 && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[#1A2341]/60 hover:text-[#1A2341] transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications */}
          <ul className="max-h-64 overflow-y-auto text-sm divide-y divide-slate-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pr-1">
            {count === 0 ? (
              <li className="px-4 py-5 text-center text-gray-400">No notifications yet.</li>
            ) : (
              notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={`flex flex-col px-4 py-3 transition relative border-l-4 border-b-slate-200 ${
                    notification.read
                      ? 'bg-white border-transparent'
                      : 'bg-white border-[#1A2341]'
                  } hover:bg-slate-100`}
                >
                  <p className="text-gray-800 font-medium">{notification.title}</p>
                  <p className="text-gray-800">{truncateDescription(notification.description)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;