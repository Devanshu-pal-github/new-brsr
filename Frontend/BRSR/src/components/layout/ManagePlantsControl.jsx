import React, { useState } from "react";
import PlantManagementModal from "../modals/PlantManagementModal"; // Adjust path if needed

const ManagePlantsControl = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm border border-white rounded-md px-2 py-1 bg-[#000D30] text-white hover:scale-102 hover:bg-[#001A60] transition-transform transition-colors duration-300">
        Manage Plants
      </button>
      {open && <PlantManagementModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default ManagePlantsControl;


