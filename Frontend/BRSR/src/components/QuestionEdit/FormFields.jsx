import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle, LinkIcon, FileText, Hash, Type , FileDigit} from "lucide-react";
import FormField from "./FormField";
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { QuestionInputType } from './QuestionInputType';

const FormFields = ({
    question,
    formData,
    errors,
    handleInputChange,
    setFormData,
    isTextareaFocused,
    setIsTextareaFocused,
    setSelectedTextInTextarea,
    textareaRef,
    leftAiMessage,
}) => {
    const getFieldIcon = (fieldType) => {
        switch (fieldType) {
            case "string": return <Type className="w-4 h-4 text-gray-500" />;
            case "decimal": return <Hash className="w-4 h-4 text-gray-500" />;
            case "link": return <LinkIcon className="w-4 h-4 text-gray-500" />;
            case "note": return <FileText className="w-4 h-4 text-gray-500" />;
            case "boolean": return <CheckCircle className="w-5 h-5 text-gray-600" />;
            default: return null;
        }
    };

    const handleTextareaSelectionChange = () => {
        if (textareaRef.current && isTextareaFocused && question.has_string_value) {
            const selection = window.getSelection().toString();
            setSelectedTextInTextarea(selection);
        } else {
            setSelectedTextInTextarea(null);
        }
    };

    const renderTableAsMarkdown = (tableData, rows) => {
        if (!rows || rows.length === 0) return '';

        const header = `| ${tableData.join(' | ')} |\n| ${tableData.map(() => '---').join(' | ')} |`;
        const body = rows
            .map(row => {
                const cells = row.split('|').map(cell => cell.trim());
                return `| ${cells.join(' | ')} |`;
            })
            .join('\n');

        return `${header}\n${body}`;
    };

    const renderStringValueField = () => {
        const inputType = question.input_type || QuestionInputType.TEXTAREA;

        if (inputType === QuestionInputType.EMAIL) {
            return (
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="email"
                            name="string_value"
                            value={formData.string_value || ""}
                            onChange={(e) => handleInputChange(e, "string")}
                            placeholder="Enter email address"
                            className="w-full p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                    {errors?.string_value && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            {errors.string_value}
                        </div>
                    )}
                </div>
            );
        }

        if (inputType === QuestionInputType.URL) {
            return (
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="url"
                            name="string_value"
                            value={formData.string_value || ""}
                            onChange={(e) => handleInputChange(e, "string")}
                            placeholder="Enter website URL"
                            className="w-full p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                    {errors?.string_value && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            {errors.string_value}
                        </div>
                    )}
                </div>
            );
        }

        if (inputType === QuestionInputType.TABLE_LIKE) {
            const tableData = leftAiMessage?.action === "SUGGEST_TABLE_STRUCTURE"
                ? (leftAiMessage.points || ['Category', 'Value', 'Description'])
                : ['Category', 'Value', 'Description'];
            const rows = formData.string_value ? formData.string_value.split('\n').map(row => row.split('|')) : [tableData.map(() => '')];

            return (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        {getFieldIcon("string")} Response {question.string_value_required && <span className="text-red-500 text-xs">*</span>}
                    </label>
                    <div className="w-full">
                        <table className="w-full border-collapse border border-gray-300" role="grid">
                            <thead>
                                <tr>
                                    {tableData.map((col, i) => (
                                        <th key={i} className="border border-gray-500 p-2 bg-gray-100 text-sm font-semibold text-gray-700" scope="col">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {tableData.map((_, colIndex) => (
                                            <td key={colIndex} className="border border-gray-300 p-2">
                                                <input
                                                    type="text"
                                                    value={row[colIndex] || ''}
                                                    onChange={(e) => {
                                                        const newRows = [...rows];
                                                        newRows[rowIndex][colIndex] = e.target.value;
                                                        setFormData(prev => ({ ...prev, string_value: newRows.map(r => r.join('|')).join('\n') }));
                                                    }}
                                                    className="w-full p-1 text-sm border-none focus:ring-0 focus:outline-none"
                                                    aria-label={`${tableData[colIndex]} for row ${rowIndex + 1}`}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            onClick={() => {
                                const newRows = [...rows, tableData.map(() => '')];
                                setFormData(prev => ({ ...prev, string_value: newRows.map(r => r.join('|')).join('\n') }));
                            }}
                            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Add new row to table"
                        >
                            Add Row
                        </button>
                        {formData.string_value.trim().length > 0 && (
                            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-800 mb-2">Table Preview:</h3>
                                <div className="prose prose-sm max-w-none text-gray-700">
                                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                        {renderTableAsMarkdown(tableData, formData.string_value.split('\n'))}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                    {errors?.string_value && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            {errors.string_value}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-3">
                
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        name="string_value"
                        value={formData.string_value || ""}
                        onChange={(e) => handleInputChange(e, "string")}
                        onFocus={() => setIsTextareaFocused(true)}
                        onBlur={() => setTimeout(() => setIsTextareaFocused(false), 200)}
                        onMouseUp={handleTextareaSelectionChange}
                        onKeyUp={handleTextareaSelectionChange}
                        onSelect={handleTextareaSelectionChange}
                        onTouchEnd={handleTextareaSelectionChange}
                        placeholder="Enter your response..."
                       className="w-full p-3 flex-1 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner overflow-y-auto mt-2 backdrop-blur-sm scrollbar-none text-sm transition-all duration-200 resize-y min-h-[300px] max-h-[340px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        rows={4}
                    />
                </div>
            </div>
        );
    };

    const renderDecimalValueField = () => (
        <div className="space-y-3 ">
            {/* <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            
            <FileDigit className="w-4 h-4 text-gray-500" />
                Value {question.decimal_value_required && <span className="text-red-500 text-xs">*</span>}
            </label> */}
            <div className="relative">
                <input
                    type="number"
                    name="decimal_value"
                    value={formData.decimal_value || ""}
                    onChange={(e) => handleInputChange(e, "decimal")}
                    placeholder="Enter a number"
                    step="any"
                    className="w-full p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 "
                    aria-label="Decimal value"
                />
            </div>
            {errors?.decimal_value && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {errors.decimal_value}
                </div>
            )}
        </div>
    );

    const renderBooleanValueField = () => (
        <div className="space-y-3">
            {/* <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                {getFieldIcon("boolean")} Yes/No {question.boolean_value_required && <span className="text-red-500 text-xs">*</span>}
            </label> */}
            <div className="relative flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60">
                <input
                    type="checkbox"
                    name="boolean_value"
                    checked={formData.boolean_value || false}
                    onChange={(e) => handleInputChange(e, "boolean")}
                    className="w-4 h-4 accent-blue-500 rounded focus:ring-2 focus:ring-blue-500/50"
                    aria-label="Boolean value"
                />
                <span className="text-sm text-gray-800">{formData.boolean_value ? "Yes" : "No"}</span>
            </div>
            {errors?.boolean_value && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {errors.boolean_value}
                </div>
            )}
        </div>
    );

    const renderLinkField = () => (
        <div className="space-y-3 w-full max-w-2xs ">
            {/* <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                {getFieldIcon("link")} Link {question.link_required && <span className="text-red-500 text-xs">*</span>}
            </label> */}
            <div className="relative">
                <input
                    type="text"
                    name="link"
                    value={formData.link || ""}
                    onChange={(e) => handleInputChange(e, "link")}
                    placeholder="Enter a URL"
                    className="w-full p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    aria-label="Link"
                />
            </div>
            {errors?.link && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {errors.link}
                </div>
            )}
        </div>
    );

    const renderNoteField = () => (
    <div className="space-y-3 w-full max-w-md">
        {/* <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            {getFieldIcon("note")} Note {question.note_required && <span className="text-red-500 text-xs">*</span>}
        </label> */}
        <div className="relative">
            <textarea
                name="note"
                value={formData.note || ""}
                onChange={(e) => handleInputChange(e, "note")}
                placeholder="Enter additional notes..."
                className="w-full p-3 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 text-sm transition-all duration-200 resize-y min-h-[100px] max-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                rows={3}
                aria-label="Note"
            />
        </div>
        {errors?.note && (
            <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4" />
                {errors.note}
            </div>
        )}
    </div>
);

    return (
        <form className="space-y-4">
            {question.has_string_value && renderStringValueField()}
            {(question.has_decimal_value || question.has_boolean_value || question.has_link || question.has_note) && (
                <div className="flex flex-wrap gap-4 justify-center">
                    {question.has_decimal_value && renderDecimalValueField()}
                    {question.has_boolean_value && renderBooleanValueField()}
                    {question.has_link && renderLinkField()}
                    {question.has_note && renderNoteField()}
                </div>
            )}
            {errors?.form && (
                <div className="mt-4 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.form}
                </div>
            )}
        </form>
    );
};

FormFields.propTypes = {
    question: PropTypes.object.isRequired,
    formData: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    handleInputChange: PropTypes.func.isRequired,
    setFormData: PropTypes.func.isRequired,
    isTextareaFocused: PropTypes.bool.isRequired,
    setIsTextareaFocused: PropTypes.func.isRequired,
    setSelectedTextInTextarea: PropTypes.func.isRequired,
    textareaRef: PropTypes.object.isRequired,
    leftAiMessage: PropTypes.object,
};

export default FormFields;