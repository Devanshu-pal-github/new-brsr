import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';

const FormField = ({
    label,
    icon: Icon,
    required,
    error,
    children,
    className = ''
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {label && (
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                    {label}
                    {required && <span className="text-red-500 text-xs">*</span>}
                </label>
            )}
            {children}
            {error && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
};

FormField.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.elementType,
    required: PropTypes.bool,
    error: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

FormField.defaultProps = {
    label: '',
    icon: null,
    required: false,
    error: '',
    className: ''
};

export default FormField;