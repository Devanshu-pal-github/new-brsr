import React, { useState } from "react";
import PlantManagementModal from "../modals/PlantManagementModal"; // Adjust path if needed

const ManagePlantsControl = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm hover:opacity-80">
        Manage Plants
      </button>
      {open && <PlantManagementModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default ManagePlantsControl;
