export const transformTableMetadata = (question) => {
    if (!question.table_metadata) {
        return {
            columns: [],
            rows: []
        };
    }

    const metadata = question.table_metadata;
    
    // Transform columns
    const columns = metadata.columns.map(col => ({
        col_id: col.id || col.col_id,
        title: col.title || col.name,
        type: col.type || 'string',
        calc: col.calc || false,
        required: col.required || false,
        validation: col.validation || {}
    }));

    // Transform rows
    const rows = metadata.rows.map(row => ({
        row_id: row.id || row.row_id,
        title: row.title || row.name,
        cells: columns.map(col => ({
            row_id: row.id || row.row_id,
            col_id: col.col_id,
            value: null,
            calc: col.calc || false
        }))
    }));

    return {
        columns,
        rows,
        version: metadata.version || '1.0'
    };
};

export const createEmptyTableResponse = (metadata) => {
    if (!metadata || !metadata.columns || !metadata.rows) {
        return {
            columns: [],
            rows: []
        };
    }

    return {
        columns: metadata.columns,
        rows: metadata.rows.map(row => ({
            row_id: row.row_id,
            cells: metadata.columns.map(col => ({
                row_id: row.row_id,
                col_id: col.col_id,
                value: null,
                calc: col.calc || false
            }))
        }))
    };
};

export const validateTableData = (data, metadata) => {
    if (!data || !metadata) return { isValid: false, errors: ['Invalid data or metadata'] };

    const errors = [];
    
    // Check if all required columns have values
    metadata.columns.forEach(col => {
        if (col.required) {
            data.rows.forEach((row, rowIndex) => {
                const cell = row.cells.find(c => c.col_id === col.col_id);
                if (!cell || cell.value === null || cell.value === '') {
                    errors.push(`Row ${rowIndex + 1}: ${col.title} is required`);
                }
            });
        }
    });

    // Validate data types and custom validations
    data.rows.forEach((row, rowIndex) => {
        row.cells.forEach(cell => {
            const col = metadata.columns.find(c => c.col_id === cell.col_id);
            if (col && cell.value !== null && cell.value !== '') {
                // Type validation
                switch (col.type) {
                    case 'number':
                        if (isNaN(Number(cell.value))) {
                            errors.push(`Row ${rowIndex + 1}: ${col.title} must be a number`);
                        }
                        break;
                    case 'date':
                        if (isNaN(Date.parse(cell.value))) {
                            errors.push(`Row ${rowIndex + 1}: ${col.title} must be a valid date`);
                        }
                        break;
                    // Add more type validations as needed
                }

                // Custom validation rules
                if (col.validation) {
                    if (col.validation.min !== undefined && Number(cell.value) < col.validation.min) {
                        errors.push(`Row ${rowIndex + 1}: ${col.title} must be at least ${col.validation.min}`);
                    }
                    if (col.validation.max !== undefined && Number(cell.value) > col.validation.max) {
                        errors.push(`Row ${rowIndex + 1}: ${col.title} must be at most ${col.validation.max}`);
                    }
                    if (col.validation.pattern && !new RegExp(col.validation.pattern).test(cell.value)) {
                        errors.push(`Row ${rowIndex + 1}: ${col.title} has invalid format`);
                    }
                }
            }
        });
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}; 