import React from 'react';
import { useGetCompanyReportsQuery } from '../../store/api/apiSlice';
import { useSearchParams } from 'react-router-dom';

const DynamicProgressSidebar = ({ submodules = [], currentSubmodule = null }) => {
    const [searchParams] = useSearchParams();
    const financialYear = searchParams.get('financialYear') || '2024-2025';
    const { data: reports = [] } = useGetCompanyReportsQuery();

    // Get current report based on financial year
    const currentReport = reports.find(report => report.financialYear === financialYear);
    const answers = currentReport?.answers || {};

    // Utility function to check if a question is answered
    const isQuestionAnswered = (questionId) => {
        if (!answers[questionId]) return false;
        
        const answer = answers[questionId];
        const updatedData = answer.updatedData;
        
        if (!updatedData) return false;

        // Check if it's an array of objects (table data)
        if (Array.isArray(updatedData)) {
            return updatedData.some(row => {
                if (typeof row === 'object') {
                    // Check if any field in the row has data
                    return Object.values(row).some(value => 
                        value !== undefined && 
                        value !== null && 
                        value !== '' && 
                        value !== '0'
                    );
                }
                return false;
            });
        }

        // For other types of answers
        return updatedData !== undefined && 
               updatedData !== null && 
               updatedData !== '' && 
               updatedData !== '0';
    };

    // Calculate overall module progress
    const calculateOverallProgress = () => {
        let totalQuestions = 0;
        let answeredQuestions = 0;
        const questionTracker = new Set();

        submodules.forEach(submodule => {
            submodule.categories?.forEach(category => {
                category.questions?.forEach(question => {
                    if (!questionTracker.has(question.id)) {
                        questionTracker.add(question.id);
                        totalQuestions++;
                        if (isQuestionAnswered(question.id)) {
                            answeredQuestions++;
                        }
                    }
                });
            });
        });

        return { totalQuestions, totalAnswered: answeredQuestions };
    };

    // Calculate progress for a single submodule
    const calculateSubmoduleProgress = (submodule) => {
        let totalQuestions = 0;
        let answeredQuestions = 0;
        const questionTracker = new Set();

        submodule.categories?.forEach(category => {
            category.questions?.forEach(question => {
                if (!questionTracker.has(question.id)) {
                    questionTracker.add(question.id);
                    totalQuestions++;
                    if (isQuestionAnswered(question.id)) {
                        answeredQuestions++;
                    }
                }
            });
        });

        return { totalQuestions, answeredQuestions };
    };

    // Calculate progress for categories in current submodule
    const calculateCategoryProgress = (category) => {
        let totalQuestions = 0;
        let answeredQuestions = 0;
        const questionTracker = new Set();

        category.questions?.forEach(question => {
            if (!questionTracker.has(question.id)) {
                questionTracker.add(question.id);
                totalQuestions++;
                if (isQuestionAnswered(question.id)) {
                    answeredQuestions++;
                }
            }
        });

        return { totalQuestions, answeredQuestions };
    };

    const { totalQuestions, totalAnswered } = calculateOverallProgress();

    // If no submodules are provided, show a placeholder state
    if (!submodules.length) {
        return (
            <aside className="hidden lg:flex flex-col mt-[11vh] mr-[30px] gap-[1.2vh] px-[0.7vw] pt-[1.2vh] pb-[1.2vh] bg-white border-l border-gray-200 shadow-lg min-w-[16vw] max-w-[18vw] w-full fixed right-4 top-0 h-[82vh] z-20 items-center justify-start rounded-[4px] transition-all duration-500">
                <div className="flex flex-col items-center justify-center h-full w-full text-gray-500">
                    <p className="text-sm">No progress data available</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden lg:flex flex-col mt-[11vh] mr-[30px] gap-[1.2vh] px-[0.7vw] pt-[1.2vh] pb-[1.2vh] bg-white border-l border-gray-200 shadow-lg min-w-[16vw] max-w-[18vw] w-full fixed right-4 top-0 h-[82vh] z-20 items-center justify-start rounded-[4px] transition-all duration-500 overflow-y-auto">
            {/* Overall Progress Circle */}
            <div className="flex flex-col items-center mb-[0.7vh]">
                <div className="font-semibold text-[13px] mb-[1vh] text-[#000D30]">Module Progress</div>
                <svg className="w-[6vw] h-[6vw] max-w-[80px] max-h-[80px]" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                    <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="8"
                        strokeDasharray="314"
                        strokeDashoffset={314 * (1 - (totalAnswered / totalQuestions))}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="mt-[0.7vh] text-gray-700 font-semibold text-[11px]">
                    {totalAnswered} of {totalQuestions} questions completed
                </div>
            </div>

            {/* Submodules Progress */}
            <div className="bg-[#F8FAFC] rounded-[4px] shadow p-[0.7vw] border border-gray-100 w-full flex flex-col gap-[0.7vh]">
                <div className="font-semibold text-[11px] mb-[0.3vh] text-[#000D30]">Submodules Progress</div>
                <div className="flex flex-col gap-[0.3vh]">
                    {submodules.map((submodule) => {
                        const { totalQuestions, answeredQuestions } = calculateSubmoduleProgress(submodule);
                        const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

                        return (
                            <div key={submodule.id || submodule.name}>
                                <div className="text-[11px] font-medium text-[#000D30] mb-0.5">
                                    {submodule.name}
                                </div>
                                <div className="w-full h-1 bg-gray-200 rounded-full mb-0.5">
                                    <div
                                        className="h-1 bg-[#4F46E5] rounded-full transition-all duration-700"
                                        style={{ width: `${completionPercentage}%` }}
                                    />
                                </div>
                                <div className="text-[9px] text-gray-500">
                                    {answeredQuestions} of {totalQuestions} completed
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Overview */}
            {currentSubmodule && currentSubmodule.categories && (
                <div className="bg-[#F8FAFC] rounded-[4px] shadow p-[0.7vw] border border-gray-100 w-full flex flex-col gap-[0.3vh]">
                    <div className="font-semibold text-[11px] mb-[0.3vh] text-[#000D30]">Category Overview</div>
                    <div className="flex flex-col gap-[0.15vh]">
                        {currentSubmodule.categories.map((category, idx) => {
                            const { totalQuestions, answeredQuestions } = calculateCategoryProgress(category);
                            const categoryName = category.name || 'Unnamed Category';
                            const truncatedName = categoryName.length > 15
                                ? categoryName.substring(0, 15) + '...'
                                : categoryName;

                            return (
                                <div key={category.id || `category-${idx}`} className="flex justify-between text-[10px]">
                                    <span
                                        className="hover:cursor-help truncate max-w-[120px]"
                                        title={categoryName}
                                    >
                                        {truncatedName}
                                    </span>
                                    <span>{answeredQuestions}/{totalQuestions} questions</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </aside>
    );
};

export default DynamicProgressSidebar; 