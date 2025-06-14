import QuestionRenderer from './QuestionRenderer';

const CategoryRenderer = ({ category, financialYear  }) => {
  if (!financialYear) {
    console.warn('CategoryRenderer: financialYear prop is required');
  }

  return (
    <div className="space-y-8">
      {category.questions?.map((question) => (
        <QuestionRenderer 
          key={question.id} 
          question={question} 
          financialYear={financialYear}
        />
      ))}
    </div>
  );
};

export default CategoryRenderer;