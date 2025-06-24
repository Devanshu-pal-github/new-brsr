import React from "react";
import { Link } from "react-router-dom";
import FinancialYearDropdown from "./FinancialYearDropdown";
import ManagePlantsControl from "./ManagePlantsControl";
import NotificationControl from "./NotificationControl";
import UserMenu from "./UserMenu";
import { Webhook } from "lucide-react";
import { useSelector } from "react-redux"; // <-- import useSelector

const ReportNavbar = () => {
  // Get company details from Redux store
  const companyDetails = useSelector((state) => state.auth.companyDetails);

  return (
    <nav className="bg-[#000D30] text-white w-full shadow-md z-50">
      <div className="mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 min-h-12">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center gap-2 mr-15 hover:opacity-90 transition-opacity"
            >
              <Webhook className="w-8 h-8 text-[#E0F2FE] stroke-[1.25]" />
              <span className="font-semibold text-xl bg-gradient-to-r from-[#E0F2FE] to-white bg-clip-text text-transparent">
                Serenity
              </span>
            </Link>
            {/* Pass companyDetails as a prop */}
            <FinancialYearDropdown company={companyDetails} />
          </div>
          <div className="flex items-center gap-3">
            <ManagePlantsControl />
            <NotificationControl />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ReportNavbar;


