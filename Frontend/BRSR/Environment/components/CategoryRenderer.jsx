import QuestionRenderer from './QuestionRenderer';

const CategoryRenderer = ({ category }) => (
  <div className="space-y-8">
    {category.questions?.map((question) => (
      <QuestionRenderer key={question.id} question={question} />
    ))}
  </div>
);

export default CategoryRenderer;