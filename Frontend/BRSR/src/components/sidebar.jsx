import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building, Leaf, X } from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Hardcoded environment module
  const environmentModule = {
    id: "35ae8d37-8263-46d5-b674-2cff3a3fd241",
    name: "Environment",
    icon: "Leaf",
  };

  const handleModuleClick = () => {
    navigate("/plants");
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="fixed top-[6vh] left-0 h-[calc(100vh-6vh)] w-20 bg-[#000B33] text-[#E5E7EB] transition-all duration-300 z-40 shadow-none m-0 p-0 border-none"
      style={{ boxShadow: "none", margin: 0, padding: 0, border: "none" }}
    >
      <div className="pt-3 pb-3 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300 z-[40]">
        {/* Header */}
        <div className="flex items-center gap-3 pl-5 mb-5">
          <Building className="w-5 h-5 text-green-300 flex-shrink-0" />
          <h2 className="text-[1rem] font-bold text-[#E5E7EB]">BRSR</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-1 flex flex-col items-start pl-0">
            {/* Dashboard */}
            <li className="w-full">
              <NavLink
                to="/home"
                className={(navData) =>
                  `flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start ${
                    navData.isActive
                      ? "bg-[#20305D] text-white"
                      : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span className="text-left">Home</span>
              </NavLink>
            </li>

            {/* Environment Module */}
            <li className="w-full">
              <NavLink
                to="/plants"
                className={(navData) =>
                  `flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start ${
                    navData.isActive
                      ? "bg-[#20305D] text-white"
                      : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                  }`
                }
                onClick={handleModuleClick}
              >
                <Leaf className="w-4 h-4 flex-shrink-0" />
                <span className="text-left">{environmentModule.name}</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="mt-auto px-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-[0.92rem] font-medium text-[#E5E7EB] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
