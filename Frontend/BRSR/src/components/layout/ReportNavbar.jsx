import React from "react";
import FinancialYearDropdown from "./FinancialYearDropdown";
import ManagePlantsControl from "./ManagePlantsControl";
import NotificationControl from "./NotificationControl";
import UserMenu from "./UserMenu";

const ReportNavbar = () => (
  <nav className="bg-[#000D30] text-white w-full shadow-md z-50">
    <div className="mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-12">
        <FinancialYearDropdown />
        <div />
        <div className="flex items-center gap-4">
          <ManagePlantsControl />
          <NotificationControl />
          <UserMenu />
        </div>
      </div>
    </div>
  </nav>
);

export default ReportNavbar;