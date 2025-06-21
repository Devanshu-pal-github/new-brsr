export const GHG_SCOPES = [
  "Scope 1",
  "Scope 2",
  "Scope 3"
];

export const GHG_CATEGORIES = {
  "Scope 1": [
    {
      category_name: "Stationary Combustion",
      subcategories: [
        { 
          subcategory_name: "Coal", 
          unit: "kg",
          emission_factors: [
            { value: 2.30, unit: "kg CO2e/kg", source: "CIMFR 2007", notes: "India-specific bituminous coal" },
            { value: 1.40, unit: "kg CO2e/kg", source: "CIMFR 2007", notes: "India-specific lignite" },
            { value: 2.42, unit: "kg CO2e/kg", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Oil (e.g., diesel, fuel oil)", 
          unit: "liters",
          emission_factors: [
            { value: 2.73, unit: "kg CO2e/liter", source: "CEA, GHG Platform India", notes: "India-specific diesel" },
            { value: 3.07, unit: "kg CO2e/liter", source: "BEE, MoEFCC", notes: "India-specific furnace oil" },
            { value: 2.68, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Natural gas", 
          unit: "cubic meters(m³)",
          emission_factors: [
            { value: 1.89, unit: "kg CO2e/m³", source: "GHG Platform India", notes: "India-specific" },
            { value: 1.85, unit: "kg CO2e/m³", source: "Defra", notes: "UK-based fallback" },
            { value: 1.90, unit: "kg CO2e/m³", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Biomass", 
          unit: "tonnes",
          emission_factors: [
            { value: 0.00, unit: "kg CO2e/tonne", source: "IPCC 2006", notes: "CO2-neutral, CH4/N2O may apply" }
          ]
        },
        { 
          subcategory_name: "Other fuels (e.g., propane, kerosene)", 
          unit: "liters",
          emission_factors: [
            { value: 1.51, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "Propane, no India-specific data" },
            { value: 2.10, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "Kerosene, no India-specific data" }
          ]
        }
      ]
    },
    {
      category_name: "Mobile Combustion",
      subcategories: [
        { 
          subcategory_name: "Gasoline (petrol)", 
          unit: "liters",
          emission_factors: [
            { value: 2.31, unit: "kg CO2e/liter", source: "CEA, GHG Platform India", notes: "India-specific" },
            { value: 2.31, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Diesel", 
          unit: "liters",
          emission_factors: [
            { value: 2.73, unit: "kg CO2e/liter", source: "CEA, GHG Platform India", notes: "India-specific" },
            { value: 2.68, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Liquefied petroleum gas (LPG)", 
          unit: "kg",
          emission_factors: [
            { value: 1.53, unit: "kg CO2e/kg", source: "BEE, MoEFCC", notes: "India-specific" },
            { value: 1.51, unit: "kg CO2e/kg", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Compressed natural gas (CNG)", 
          unit: "kg",
          emission_factors: [
            { value: 1.80, unit: "kg CO2e/kg", source: "GHG Platform India", notes: "India-specific" },
            { value: 1.89, unit: "kg CO2e/kg", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Aviation fuel (for company-owned aircraft)", 
          unit: "liters",
          emission_factors: [
            { value: 2.53, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        },
        { 
          subcategory_name: "Marine fuel (for company-owned vessels)", 
          unit: "liters",
          emission_factors: [
            { value: 3.11, unit: "kg CO2e/liter", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        }
      ]
    },
    {
      category_name: "Process Emissions",
      subcategories: [
        { 
          subcategory_name: "Cement production (CO2 from calcination)", 
          unit: "tonnes",
          emission_factors: [
            { value: 0.53, unit: "kg CO2e/kg cement", source: "MoEFCC, GHG Platform India", notes: "India-specific" },
            { value: 0.55, unit: "kg CO2e/kg cement", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Steel production (CO2 from iron reduction)", 
          unit: "tonnes",
          emission_factors: [
            { value: 1.85, unit: "kg CO2e/tonne steel", source: "GHG Platform India", notes: "India-specific" },
            { value: 1.80, unit: "kg CO2e/tonne steel", source: "IPCC 2006", notes: "Default global value" }
          ]
        },
        { 
          subcategory_name: "Chemical manufacturing (e.g., ammonia production)", 
          unit: "tonnes",
          emission_factors: [
            { value: 1.20, unit: "kg CO2e/tonne product", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        },
        { 
          subcategory_name: "Other industrial processes (e.g., aluminum smelting)", 
          unit: "tonnes",
          emission_factors: [
            { value: 1.50, unit: "kg CO2e/tonne product", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        }
      ]
    },
    {
      category_name: "Fugitive Emissions",
      subcategories: [
        { 
          subcategory_name: "Refrigerant leaks (e.g., HFCs, CFCs)", 
          unit: "kg",
          emission_factors: [
            { value: 1300, unit: "kg CO2e/kg", source: "IPCC 2006", notes: "HFC-134a GWP, no India-specific data" }
          ]
        },
        { 
          subcategory_name: "Methane leaks (e.g., from natural gas pipelines)", 
          unit: "kg",
          emission_factors: [
            { value: 27.9, unit: "kg CO2e/kg CH4", source: "IPCC AR6", notes: "GWP-based, no India-specific factor" }
          ]
        },
        { 
          subcategory_name: "CO2 or methane from wastewater treatment", 
          unit: "kg",
          emission_factors: [
            { value: 27.9, unit: "kg CO2e/kg CH4", source: "IPCC 2006", notes: "Methane GWP, no India-specific data" }
          ]
        },
        { 
          subcategory_name: "Sulphur hexafluoride (SF6) from electrical equipment", 
          unit: "kg",
          emission_factors: [
            { value: 23500, unit: "kg CO2e/kg", source: "IPCC 2006", notes: "GWP-based, no India-specific data" }
          ]
        }
      ]
    },
    {
      category_name: "On-site Waste Treatment",
      subcategories: [
        { 
          subcategory_name: "Methane from anaerobic digestion", 
          unit: "kg",
          emission_factors: [
            { value: 27.9, unit: "kg CO2e/kg CH4", source: "IPCC 2006", notes: "GWP-based, no India-specific data" }
          ]
        },
        { 
          subcategory_name: "CO2 or methane from incineration", 
          unit: "kg",
          emission_factors: [
            { value: 1.83, unit: "kg CO2e/kg waste", source: "IPCC 2006", notes: "Fossil-based waste, no India-specific data" }
          ]
        },
        { 
          subcategory_name: "Landfill gas emissions", 
          unit: "kg",
          emission_factors: [
            { value: 27.9, unit: "kg CO2e/kg CH4", source: "IPCC 2006", notes: "Methane GWP, no India-specific data" }
          ]
        }
      ]
    }
  ],
  "Scope 2": [
    {
      category_name: "Purchased Electricity",
      subcategories: [
        { 
          subcategory_name: "Grid electricity (from fossil fuels, e.g., coal, natural gas)", 
          unit: "kWh",
          emission_factors: [
            { value: 0.82, unit: "kg CO2e/kWh", source: "CEA CO2 Baseline Database (2023-24)", notes: "India national average" },
            { value: 0.85, unit: "kg CO2e/kWh", source: "CEA", notes: "Northern grid" },
            { value: 0.75, unit: "kg CO2e/kWh", source: "CEA", notes: "Southern grid" }
          ]
        },
        { 
          subcategory_name: "Grid electricity (from renewables, e.g., solar, wind, hydro)", 
          unit: "kWh",
          emission_factors: [
            { value: 0.00, unit: "kg CO2e/kWh", source: "CEA, BEE", notes: "Certified renewable energy" }
          ]
        },
        { 
          subcategory_name: "Nuclear-generated electricity", 
          unit: "kWh",
          emission_factors: [
            { value: 0.01, unit: "kg CO2e/kWh", source: "IPCC 2006", notes: "Low emission, no India-specific data" }
          ]
        }
      ]
    },
    {
      category_name: "Purchased Steam, Heat, or Cooling",
      subcategories: [
        { 
          subcategory_name: "Steam (from fossil fuel-based boilers)", 
          unit: "tonnes",
          emission_factors: [
            { value: 0.07, unit: "kg CO2e/MJ", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        },
        { 
          subcategory_name: "District heating (from centralized heating systems)", 
          unit: "kWh",
          emission_factors: [
            { value: 0.07, unit: "kg CO2e/MJ", source: "IPCC 2006", notes: "No India-specific data" }
          ]
        },
        { 
          subcategory_name: "Cooling (from district cooling systems)", 
          unit: "kWh",
          emission_factors: [
            { value: 0.82, unit: "kg CO2e/kWh", source: "CEA", notes: "Assumes grid electricity" }
          ]
        },
        { 
          subcategory_name: "Renewable-based steam or heat (e.g., geothermal, biomass)", 
          unit: "tonnes",
          emission_factors: [
            { value: 0.00, unit: "kg CO2e/tonne", source: "IPCC 2006", notes: "CO2-neutral, CH4/N2O may apply" }
          ]
        }
      ]
    }
  ],
  "Scope 3": [
    // Add Scope 3 categories/subcategories here in the future
  ]
};

export const GHG_UNITS = [
  "liters",
  "cubic meters(m³)",
  "kg",
  "tonnes",
  "kWh",
  "MJ",
  "kg CO2e/liter",
  "kg CO2e/m³",
  "kg CO2e/kg",
  "kg CO2e/tonne",
  "kg CO2e/kWh",
  "kg CO2e/MJ",
  "kg CO2e/kg CH4"
];

// Table columns for GHG data grid
export const GHG_TABLE_COLUMNS = [
  { key: "category_name", label: "Category" },
  { key: "subcategory_name", label: "Subcategory" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "emission_factor", label: "Emission Factor" },
  { key: "emission_factor_unit", label: "Emission Factor Unit" },
  { key: "emissions_co2e", label: "Emissions CO2e" },
  { key: "data_source", label: "Data Source" },
  { key: "notes", label: "Notes" }
];