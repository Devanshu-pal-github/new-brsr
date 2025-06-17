import React, { useState } from "react";
import { Bell } from "lucide-react";
import NotificationPanel from "../modals/NotificationPanel"; // Adjust path if needed

const NotificationControl = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative">
        <Bell className="w-5 h-5" />
      </button>
      <NotificationPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default NotificationControl;
