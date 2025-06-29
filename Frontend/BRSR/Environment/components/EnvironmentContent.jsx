import React, { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import moduleData from "../data/moduleData.json";
import QuestionCategory from "./QuestionCategory";
import Breadcrumb from "./Breadcrumb";
import SubHeader from "./SubHeader";
import Layout from "../../src/components/layout/Layout";
import ProgressSidebar from "./ProgressSidebar";
import ChatbotWindow from "../../src/AICHATBOT/ChatbotWindow";
import { AppProvider } from "../../src/AICHATBOT/AppProvider";

const EnvironmentContent = ({
  plantId: propPlantId,
  environmentReports: propReports,
  renderBare = false,
  turnover: propTurnover,
}) => {
  const location = useLocation();
  const { plantId: statePlantId, environmentReports: stateReports } =
    location.state || {};
  const plantId = propPlantId || statePlantId;
  const environmentReports = propReports || stateReports;
  const turnover = propTurnover;
  console.log("[EnvironmentContent] turnover prop:", turnover);
  const [searchParams] = useSearchParams();
  const financialYear = searchParams.get("financialYear") || "2024-2025"; // Default value
  const [activeSubmodule, setActiveSubmodule] = useState(null);
  const [answers, setAnswers] = useState({});
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatbotInitialMode, setChatbotInitialMode] = useState("general");

  useEffect(() => {
    if (moduleData.submodules && moduleData.submodules.length > 0) {
      setActiveSubmodule(moduleData.submodules[0].name);
    }
  }, []);

  // Get current submodule
  const currentSubmodule = moduleData.submodules.find(
    (submodule) => submodule.name === activeSubmodule
  );

  console.log("currentSubmodule", moduleData);

  // Main inner content so we don't duplicate JSX
  const innerContent = (
    <>
      <div className="">
        <div className="mb-4">
          <Breadcrumb section={moduleData.name} activeTab={activeSubmodule} />
        </div>
      </div>

      <div className="mt-4 mx-2">
        <div className="w-full">
          <div className="mb-4">
            <SubHeader
              tabs={moduleData.submodules.map((sm) => sm.name)}
              activeTab={activeSubmodule}
              onTabChange={setActiveSubmodule}
            />
          </div>
          <div className="mt-4">
            {currentSubmodule && (
              <div className="space-y-4">
                {currentSubmodule.categories.map((category) => (
                  <QuestionCategory
                    key={category.id}
                    category={category}
                    financialYear={financialYear}
                    plantId={plantId}
                    environmentReports={environmentReports}
                    turnover={turnover}
                    onAnswerUpdate={(questionId, answer) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [questionId]: answer,
                      }));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Sidebar */}
      <ProgressSidebar
        submodules={moduleData.submodules}
        answers={answers}
        currentSubmodule={currentSubmodule}
        plantId={plantId}
      />

      {/* AI Chat Button */}
      <button
        className="fixed z-[120] bottom-[3vh] right-[3vw] w-[6vw] h-[6vw] min-w-[48px] min-h-[48px] max-w-[80px] max-h-[80px] rounded-full bg-gradient-to-br from-[#0A2E87] to-[#4F46E5] shadow-xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-white focus:outline-none"
        style={{ boxShadow: "0 8px 32px 0 rgba(10,46,135,0.25)" }}
        onClick={() => setAiChatOpen(true)}
        aria-label="Open AI Assistant Chat"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <line x1="12" y1="6" x2="12" y2="3" />
          <circle cx="12" cy="3" r="1" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
          <path d="M8 14h8" />
        </svg>
      </button>

      {/* AI Chat Window */}
      {aiChatOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
          <div
            className="w-full h-full absolute top-0 left-0 bg-black/30"
            onClick={() => setAiChatOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md m-4 md:m-8 animate-slide-up">
            <div className="bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-gray-200">
              <ChatbotWindow
                onClose={() => setAiChatOpen(false)}
                initialMode={chatbotInitialMode}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <AppProvider>
      {renderBare ? (
        <div className="module-layout min-h-screen p-2 md:p-3 w-[78%]">
          {innerContent}
        </div>
      ) : (
        <Layout hideSidebar>{innerContent}</Layout>
      )}
    </AppProvider>
  );
};

export default EnvironmentContent;
