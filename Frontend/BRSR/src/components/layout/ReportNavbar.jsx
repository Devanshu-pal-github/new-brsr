import React from "react";
import FinancialYearDropdown from "./FinancialYearDropdown";
import ManagePlantsControl from "./ManagePlantsControl";
import NotificationControl from "./NotificationControl";
import UserMenu from "./UserMenu";
import { Webhook } from "lucide-react";

const ReportNavbar = () => (
  <nav className="bg-[#000D30] text-white w-full shadow-md z-50">
    <div className="mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center">
          <div className="flex items-center gap-3 mr-8">
            <Webhook className="w-8 h-8 text-[#E0F2FE] stroke-[1.5]" />
            <span className="font-semibold text-2xl bg-gradient-to-r from-[#E0F2FE] to-white bg-clip-text text-transparent">Serenity</span>
          </div>
          <FinancialYearDropdown />
        </div>
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


