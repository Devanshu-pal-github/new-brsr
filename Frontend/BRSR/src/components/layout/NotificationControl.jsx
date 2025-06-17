import React, { useState } from "react";
import { Bell } from "lucide-react";
import NotificationPanel, { getUnreadCount } from "../modals/NotificationPanel";

const NotificationControl = () => {
  const [open, setOpen] = useState(false);
  const unreadCount = getUnreadCount();

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative hover:text-gray-200 transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default NotificationControl;
