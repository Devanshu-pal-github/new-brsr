import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, FileText } from 'lucide-react';
import { logout, selectCurrentUser } from '../../store/slices/authSlice';
import AuditModal from "../AuditModal";
import MCPModal from "../MCPModal";
import { v4 as uuidv4 } from 'uuid';

const getUserInitials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isMCPModalOpen, setIsMCPModalOpen] = useState(false);
  const menuRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
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
              navigate('/profile');
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
            onClick={() => {
              setIsMCPModalOpen(true);
              setOpen(false);
            }}
          >
            MCP
          </li>
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D] text-white"
            onClick={handleLogout}
          >
            Logout
          </li>
        </ul>
      )}
      {isAuditModalOpen && (
        <AuditModal onClose={() => setIsAuditModalOpen(false)} />
      )}
      {isMCPModalOpen && (
        <MCPModal onClose={() => setIsMCPModalOpen(false)} />
      )}
    </div>
  );
};

export default UserMenu;
