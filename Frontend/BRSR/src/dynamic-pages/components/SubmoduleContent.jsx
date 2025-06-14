import React, { useEffect } from 'react';
import CategoryContainer from './CategoryContainer';

const SubmoduleContent = ({ submodule }) => {
  useEffect(() => {
    console.log('📂 SubmoduleContent rendering with submodule:', submodule);
    if (submodule && submodule.categories) {
      console.log('📂 Categories in submodule:', submodule.categories);
      submodule.categories.forEach(category => {
        console.log(`📂 Category ${category.name} has question_ids:`, category.question_ids);
      });
    }
  }, [submodule]);

  return (
    <div>
      <h3 className="text-2xl font-extrabold text-gray-900 mb-5 border-b pb-3">{submodule?.name}</h3>
      <div className="space-y-6">
        {submodule?.categories && submodule.categories.length > 0 ? (
          submodule.categories.map((category) => (
            <CategoryContainer key={category.id} category={category} />
          ))
        ) : (
          <p className="text-gray-500">No categories found in this submodule.</p>
        )}
      </div>
    </div>
  );
};

export default SubmoduleContent;