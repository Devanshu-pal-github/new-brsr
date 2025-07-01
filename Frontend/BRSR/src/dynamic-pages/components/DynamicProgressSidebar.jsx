import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuickActions from '../../../Environment/components/QuickActions';

// Helper: list of static module names/ids (add more as needed)
const STATIC_MODULES = [
  'environment', 'ghg', 'greenhouse gases', 'ghg emission', 'plants', 'plant', 'static', 'static_module', 'static-module', 'staticmodule'
];

function isDynamicModule(module) {
  // Prefer module.module_type if available, else fallback to name/id
  if (module?.module_type && module.module_type !== 'static') return true;
  const name = (module?.name || '').toLowerCase();
  const id = (module?.id || '').toLowerCase();
  return !STATIC_MODULES.some(staticName => name.includes(staticName) || id.includes(staticName));
}

const DynamicProgressSidebar = ({ submodules = [], currentSubmodule = null, module = null, answers = {}, financialYear }) => {
    const [searchParams] = useSearchParams();
    financialYear = searchParams.get('financialYear') || '2024-2025';

    // Debug: log the structure of submodules, categories, and questions
    console.log('[Sidebar] module:', module);
    console.log('[Sidebar] submodules:', submodules);
    if (submodules.length > 0) {
      submodules.forEach((sm, i) => {
        console.log(`[Sidebar] submodule[${i}]:`, sm);
        if (sm.categories) {
          sm.categories.forEach((cat, j) => {
            console.log(`[Sidebar] submodule[${i}].category[${j}]:`, cat);
            if (cat.questions) {
              console.log(`[Sidebar] submodule[${i}].category[${j}].questions:`, cat.questions);
            } else if (cat.question_ids) {
              console.log(`[Sidebar] submodule[${i}].category[${j}].question_ids:`, cat.question_ids);
            }
          });
        }
      });
    }

    // If not a dynamic module, render nothing
    if (module && !isDynamicModule(module)) {
      return null;
    }

    // Utility: robustly check if a question is answered (subjective, objective, table, etc)
    const isQuestionAnswered = (question) => {
        // Accept both question object or string id
        const qid = typeof question === 'string' ? question : (question.id || question._id || question.question_id);
        const answer = answers[qid];
        console.log('[Sidebar] Checking answer for', qid, answer);
        if (!answer) return false;
        // Try all possible fields for value
        const val = answer.updatedData ?? answer.value ?? answer.string_value ?? answer.text ?? answer.response ?? answer;
        if (Array.isArray(val)) {
            // Table: at least one non-empty row
            return val.some(row => typeof row === 'object' && Object.values(row).some(v => v !== undefined && v !== null && v !== '' && v !== '0'));
        }
        if (typeof val === 'object' && val !== null) {
            // Subjective/objective: at least one non-empty field
            return Object.values(val).some(v => v !== undefined && v !== null && v !== '' && v !== '0');
        }
        // Primitive
        return val !== undefined && val !== null && val !== '' && val !== '0';
    };

    // Helper: get all questions from a category, fallback to question_ids if needed
    const getQuestionsFromCategory = (cat) => {
      if (Array.isArray(cat.questions) && cat.questions.length > 0) return cat.questions;
      if (Array.isArray(cat.question_ids) && cat.question_ids.length > 0) {
        // Use question_ids directly for counting and completion
        return cat.question_ids;
      }
      return [];
    };

    // Calculate progress for any group of questions
    const getProgress = (questions = []) => {
        let total = 0, answered = 0;
        questions.forEach(q => {
            if (q) {
                total++;
                if (isQuestionAnswered(q)) answered++;
            }
        });
        return { total, answered };
    };

    // Memoize progress calculations for performance
    const moduleProgress = useMemo(() => {
        let total = 0, answered = 0;
        submodules.forEach(sm => {
            sm.categories?.forEach(cat => {
                const qs = getQuestionsFromCategory(cat);
                const { total: t, answered: a } = getProgress(qs);
                total += t; answered += a;
            });
        });
        return { total, answered };
    }, [submodules, answers]);

    const submoduleProgress = useMemo(() =>
        submodules.map(sm => {
            let total = 0, answered = 0;
            sm.categories?.forEach(cat => {
                const qs = getQuestionsFromCategory(cat);
                const { total: t, answered: a } = getProgress(qs);
                total += t; answered += a;
            });
            return { id: sm.id, name: sm.name, total, answered };
        }),
        [submodules, answers]
    );

    const categoryProgress = useMemo(() =>
        (currentSubmodule?.categories || []).map(cat => {
            const qs = getQuestionsFromCategory(cat);
            const { total, answered } = getProgress(qs);
            return { id: cat.id, name: cat.name, total, answered };
        }),
        [currentSubmodule, answers]
    );

    // If no submodules, show placeholder
    if (!submodules.length) {
        return (
            <aside className="hidden lg:flex flex-col mt-[15vh] mr-[30px] gap-2 px-2 pt-3 pb-3 bg-white border-l border-gray-200 shadow-lg min-w-[14vw] max-w-[16vw] w-full fixed right-4 top-0 h-[82vh] z-20 items-center justify-start rounded-[4px] transition-all duration-500">
                <div className="flex flex-col items-center justify-center h-full w-full text-gray-500">
                    <p className="text-sm">No progress data available</p>
                </div>
            </aside>
        );
    }

    // Determine if this is the Environment module (for GHG Emissions quick action)
    const isEnvironmentModule = module && (
        (module.name && module.name.toLowerCase().includes('environment')) ||
        (module.id && module.id.toLowerCase().includes('environment'))
    );

    return (
        <aside className="hidden lg:flex flex-col mt-[11vh] mr-[30px] gap-2 px-2 pt-3 pb-3 bg-white border-t border-l border-gray-200 shadow-lg min-w-[14vw] max-w-[16vw] w-full fixed right-4 top-0 h-[82vh] z-20 items-center justify-start rounded-[4px] transition-all duration-500 overflow-y-auto">
            {/* Module Progress */}
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
                        strokeDashoffset={314 * (1 - (moduleProgress.answered / (moduleProgress.total || 1)))}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="mt-[0.7vh] text-gray-700 font-semibold text-[11px]">
                    {moduleProgress.answered} of {moduleProgress.total} questions completed
                </div>
            </div>

            {/* Submodules Progress */}
            <div className="bg-[#F8FAFC] rounded-[4px] shadow p-[0.7vw] border border-gray-100 w-full flex flex-col gap-[0.7vh]">
                <div className="font-semibold text-[11px] mb-[0.3vh] text-[#000D30]">Submodules Progress</div>
                <div className="flex flex-col gap-[0.3vh]">
                    {submoduleProgress.map(sm => {
                        const completion = sm.total > 0 ? (sm.answered / sm.total) * 100 : 0;
                        return (
                            <div key={sm.id || sm.name}>
                                <div className="text-[11px] font-medium text-[#000D30] mb-0.5">{sm.name}</div>
                                <div className="w-full h-1 bg-gray-200 rounded-full mb-0.5">
                                    <div
                                        className="h-1 bg-[#4F46E5] rounded-full transition-all duration-700"
                                        style={{ width: `${completion}%` }}
                                    />
                                </div>
                                <div className="text-[9px] text-gray-500">{sm.answered} of {sm.total} completed</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Overview */}
            {categoryProgress.length > 0 && (
                <div className="bg-[#F8FAFC] rounded-[4px] shadow p-2 border border-gray-100 w-full flex flex-col gap-1">
                    <div className="font-semibold text-[11px] mb-1 text-[#000D30]">Category Overview</div>
                    <div className="flex flex-col gap-0.5">
                        {categoryProgress.map(cat => {
                            const truncated = (cat.name || '').length > 15 ? (cat.name || '').substring(0, 15) + '...' : cat.name;
                            return (
                                <div key={cat.id || cat.name} className="flex justify-between text-[10px]">
                                    <span className="hover:cursor-help truncate max-w-[120px]" title={cat.name}>{truncated}</span>
                                    <span>{cat.answered}/{cat.total} questions</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions (GHG Emissions only for Environment module) */}
            <QuickActions
                plantId={module?.plantId}
                financialYear={financialYear}
                hideGHG={!isEnvironmentModule}
            />
        </aside>
    );
};

export default DynamicProgressSidebar;