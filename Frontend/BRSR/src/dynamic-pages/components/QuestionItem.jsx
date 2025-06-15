import React, { useState } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const QuestionItem = ({ question }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState(question.answer || {});

  const handleSave = (data) => {
    console.log('Saving question data:', {
      questionId: question.id,
      questionTitle: question.title,
      updatedData: data
    });
    setQuestionData(data);
    setIsEditModalOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-lg font-semibold text-gray-800">{question.question_text || question.title || question.human_readable_id}</h4>
        {question.isAuditRequired !== undefined && (
          <AuditBadge isAuditRequired={question.isAuditRequired} />
        )}
      </div>
      
      {(question.description || question.metadata?.description) && (
        <p className="text-gray-600 text-sm mb-4">{question.description || question.metadata?.description}</p>
      )}
      
      <div className="mt-4">
        <DynamicQuestionRenderer 
          question={question} 
          questionData={questionData} 
          onSave={handleSave}
          isEditModalOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
        />
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-[#20305D] text-white rounded hover:bg-[#162442] text-sm"
        >
          Edit Response
        </button>
      </div>
    </div>
  );
};

export default QuestionItem;