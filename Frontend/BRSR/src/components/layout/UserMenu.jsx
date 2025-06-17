import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, selectCurrentUser } from "../../store/slices/authSlice";

const getUserInitials = (name = "User") => {
  const names = name.split(" ");
  const initials = names.slice(0, 2).map((n) => n.charAt(0).toUpperCase());
  return initials.join("");
};

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1">
        <div className="w-8 h-8 bg-[#20305D] rounded-full flex items-center justify-center text-white text-xs font-semibold">
          {getUserInitials(user?.name)}
        </div>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 w-36 bg-[#000D30] rounded-md shadow-md z-50 overflow-hidden text-sm">
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D]"
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
          >
            Profile
          </li>
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#20305D]"
            onClick={handleLogout}
          >
            Logout
          </li>
        </ul>
      )}
    </div>
  );
};

export default UserMenu;
