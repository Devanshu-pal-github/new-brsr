import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, selectCurrentUser } from "../../store/slices/authSlice";
import AuditModal from "../AuditModal";

const getUserInitials = (userName = "User") => {
  if (!userName) return "U";
  const names = userName.split(" ");
  const initials = names.slice(0, 2).map((n) => n.charAt(0).toUpperCase());
  return initials.join("");
};

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#20305D] rounded-full flex items-center justify-center text-white text-xs font-semibold">
          {getUserInitials(user?.user_name)}
        </div>
        <span className="text-sm font-medium">{user?.user_name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 w-36 bg-[#000D30] rounded-md shadow-md z-50 overflow-hidden text-sm">
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D] text-white"
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
          >
            Profile
          </li>
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D] text-white"
            onClick={() => {
              setIsAuditModalOpen(true);
              setOpen(false);
            }}
          >
            Audit Log
          </li>
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D] text-white"
            onClick={handleLogout}
          >
            Logout
          </li>
        </ul>
      )}

      {/* Audit Modal */}
      {isAuditModalOpen && (
        <AuditModal onClose={() => setIsAuditModalOpen(false)} />
      )}
    </div>
  );
};

export default UserMenu;
