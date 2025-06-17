import React from 'react';
import PropTypes from 'prop-types';

const TableQuestionRenderer = ({ meta, response, editable, onCellChange }) => {
    if (!meta || !response) {
        return <div>No table data available</div>;
    }

    const handleCellChange = (rowId, colId, value) => {
        if (editable && onCellChange) {
            onCellChange(rowId, colId, value);
        }
    };

    const renderCell = (cell, column) => {
        const value = cell.value ?? '';

        if (!editable || column.calc) {
            return <div className="px-2 py-1">{value}</div>;
        }

        switch (column.type) {
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleCellChange(cell.row_id, cell.col_id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => handleCellChange(cell.row_id, cell.col_id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                );
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={value === 'true' || value === true}
                        onChange={(e) => handleCellChange(cell.row_id, cell.col_id, e.target.checked)}
                        className="w-4 h-4 mx-2 accent-blue-500 rounded focus:ring-2 focus:ring-blue-500/50"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleCellChange(cell.row_id, cell.col_id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                );
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {meta.columns.map((column) => (
                            <th
                                key={column.col_id}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {column.title}
                                {column.required && <span className="text-red-500 ml-1">*</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {response.rows.map((row, rowIndex) => (
                        <tr key={row.row_id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {meta.columns.map((column) => {
                                const cell = row.cells.find(c => c.col_id === column.col_id);
                                return (
                                    <td
                                        key={`${row.row_id}-${column.col_id}`}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                    >
                                        {cell ? renderCell(cell, column) : null}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

TableQuestionRenderer.propTypes = {
    meta: PropTypes.shape({
        columns: PropTypes.arrayOf(PropTypes.shape({
            col_id: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            type: PropTypes.string,
            calc: PropTypes.bool,
            required: PropTypes.bool
        })).isRequired,
    }).isRequired,
    response: PropTypes.shape({
        rows: PropTypes.arrayOf(PropTypes.shape({
            row_id: PropTypes.string.isRequired,
            cells: PropTypes.arrayOf(PropTypes.shape({
                row_id: PropTypes.string.isRequired,
                col_id: PropTypes.string.isRequired,
                value: PropTypes.any,
                calc: PropTypes.bool
            })).isRequired
        })).isRequired
    }).isRequired,
    editable: PropTypes.bool,
    onCellChange: PropTypes.func
};

TableQuestionRenderer.defaultProps = {
    editable: false,
    onCellChange: null
};

export default TableQuestionRenderer; 