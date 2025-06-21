import React, { useState, useMemo, useRef, useEffect } from "react";
import { GHG_CATEGORIES, GHG_UNITS } from "../ghgConfig";

const GHGAddModal = ({ open, onClose, onAdd, scope }) => {
    const [form, setForm] = useState({});
    const modalRef = useRef(null);

    // Click outside to close
    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open, onClose]);

    // Get categories and subcategories for the selected scope
    const categories = useMemo(() => GHG_CATEGORIES[scope] || [], [scope]);
    const selectedCategory = categories.find((cat) => cat.category_name === form.category_name);
    const subcategories = selectedCategory?.subcategories || [];

    // Calculate emissions_co2e if possible
    const quantity = parseFloat(form.quantity);
    const emissionFactor = parseFloat(form.emission_factor);
    const canAutoCalc = !isNaN(quantity) && !isNaN(emissionFactor);
    const autoEmissions = canAutoCalc ? (quantity * emissionFactor) / 1000 : ""; // Convert to tonnes

    // When category changes, reset subcategory and emission factor
    useEffect(() => {
        if (form.category_name && subcategories.length > 0 && !form.subcategory_name) {
            setForm((prev) => ({
                ...prev,
                subcategory_name: subcategories[0].subcategory_name,
                unit: subcategories[0].unit,
                emission_factor: subcategories[0].emission_factors[0]?.value || "",
                emission_factor_unit: subcategories[0].emission_factors[0]?.unit || ""
            }));
        }
    }, [form.category_name, subcategories]);

    // When subcategory changes, update emission factor options
    useEffect(() => {
        if (form.subcategory_name && subcategories.length > 0) {
            const sub = subcategories.find((s) => s.subcategory_name === form.subcategory_name);
            if (sub && sub.unit) {
                setForm((prev) => ({
                    ...prev,
                    unit: sub.unit,
                    emission_factor: sub.emission_factors[0]?.value || "",
                    emission_factor_unit: sub.emission_factors[0]?.unit || ""
                }));
            }
        }
    }, [form.subcategory_name, subcategories]);

    const handleChange = (key, value) => {
        setForm((prev) => {
            if (key === "category_name") {
                return { ...prev, category_name: value, subcategory_name: "", unit: "", emission_factor: "", emission_factor_unit: "", data_source: "" };
            }
            if (key === "subcategory_name") {
                const sub = subcategories.find((s) => s.subcategory_name === value);
                return {
                    ...prev,
                    subcategory_name: value,
                    unit: sub?.unit || "",
                    emission_factor: sub?.emission_factors[0]?.value || "",
                    emission_factor_unit: sub?.emission_factors[0]?.unit || "",
                    data_source: "" // Reset data_source to empty for user input
                };
            }
            if (key === "emission_factor") {
                const sub = subcategories.find((s) => s.subcategory_name === form.subcategory_name);
                const selectedFactor = sub?.emission_factors.find((f) => f.value === parseFloat(value));
                return {
                    ...prev,
                    emission_factor: value,
                    emission_factor_unit: selectedFactor?.unit || ""
                };
            }
            if (key === "emissions_co2e" && !canAutoCalc) {
                return { ...prev, [key]: value };
            }
            return { ...prev, [key]: value };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.category_name || !form.subcategory_name || !form.quantity) {
            alert("Please fill all required fields.");
            return;
        }
        const entry = {
            ...form,
            emissions_co2e: canAutoCalc ? autoEmissions : parseFloat(form.emissions_co2e) || "",
            status: "Pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log("Adding GHG Entry:", entry);
        onAdd(entry);
        setForm({});
        onClose();
    };

    const handleCancel = () => {
        setForm({});
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="bg-white rounded-xl max-w-3xl w-full p-8 shadow-2xl border border-gray-200 transform transition-all duration-300 ease-in-out"
            >
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                    onClick={handleCancel}
                >
                    ×
                </button>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Add New GHG Entry</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                value={form.category_name || ""}
                                onChange={(e) => handleChange("category_name", e.target.value)}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.category_name} value={cat.category_name}>
                                        {cat.category_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Subcategory */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory <span className="text-red-500">*</span></label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                value={form.subcategory_name || ""}
                                onChange={(e) => handleChange("subcategory_name", e.target.value)}
                                required
                                disabled={!form.category_name}
                            >
                                <option value="">Select Subcategory</option>
                                {subcategories.map((sub) => (
                                    <option key={sub.subcategory_name} value={sub.subcategory_name}>
                                        {sub.subcategory_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Emission Factor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Emission Factor <span className="text-gray-500 text-xs">(Select from source)</span></label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                value={form.emission_factor || ""}
                                onChange={(e) => handleChange("emission_factor", e.target.value)}
                                disabled={!form.subcategory_name}
                            >
                                <option value="">Select Emission Factor</option>
                                {subcategories.find((s) => s.subcategory_name === form.subcategory_name)?.emission_factors.map((factor) => (
                                    <option key={`${factor.value}-${factor.source}`} value={factor.value}>
                                        {factor.value} {factor.unit} ({factor.source})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Emission Factor Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Emission Factor Unit</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 focus:outline-none"
                                type="text"
                                value={form.emission_factor_unit || ""}
                                readOnly
                            />
                        </div>
                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                type="number"
                                value={form.quantity || ""}
                                onChange={(e) => handleChange("quantity", e.target.value)}
                                required
                                step="any"
                                min="0"
                            />
                        </div>
                        {/* Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 focus:outline-none"
                                type="text"
                                value={form.unit || ""}
                                readOnly
                                placeholder="Auto-set from subcategory"
                            />
                        </div>
                        {/* Emissions CO2e */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Emissions CO2e (tonnes)</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 focus:outline-none"
                                type="number"
                                value={canAutoCalc ? autoEmissions : (form.emissions_co2e || "")}
                                onChange={(e) => handleChange("emissions_co2e", e.target.value)}
                                readOnly={canAutoCalc}
                                step="any"
                                min="0"
                            />
                            {canAutoCalc && (
                                <span className="text-xs text-gray-500 mt-1 block">Auto-calculated: Quantity × Emission Factor ÷ 1000</span>
                            )}
                        </div>
                        {/* Data Source */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Source <span className="text-gray-500 text-xs">(e.g., meter, invoice)</span></label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                type="text"
                                value={form.data_source || ""}
                                onChange={(e) => handleChange("data_source", e.target.value)}
                                placeholder="Enter source of quantity data"
                            />
                        </div>
                        {/* Notes */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2341] transition"
                                type="text"
                                value={form.notes || ""}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                placeholder="Add any additional notes or assumptions"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button
                            type="button"
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-gradient-to-r from-[#1A2341] to-[#2c3e50] text-white rounded-lg hover:from-[#2c3e50] hover:to-[#1A2341] transition-all duration-200"
                        >
                            Add Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GHGAddModal;