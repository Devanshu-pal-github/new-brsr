import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DynamicQuestionCategory from './DynamicQuestionCategory';

const SubmoduleContent = ({ submodule, moduleId }) => {
  const [searchParams] = useSearchParams();
  const financialYear = searchParams.get('financialYear') || '2024-2025';

  // Function to get unique top-level categories
  const getUniqueCategories = (categories) => {
    if (!categories) return [];
    
    // Create a map to track parent categories
    const categoryMap = new Map();
    
    // First pass: map all categories by their IDs
    categories.forEach(category => {
      if (!categoryMap.has(category.id)) {
        categoryMap.set(category.id, {
          ...category,
          isChild: false
        });
      }
    });
    
    // Second pass: mark child categories
    categories.forEach(category => {
      if (category.categories) {
        category.categories.forEach(childCategory => {
          const child = categoryMap.get(childCategory.id);
          if (child) {
            child.isChild = true;
          }
        });
      }
    });
    
    // Return only top-level (non-child) categories
    return Array.from(categoryMap.values()).filter(category => !category.isChild);
  };

  const topLevelCategories = getUniqueCategories(submodule.categories);

  return (
    <div>
      <div className="space-y-4">
        {topLevelCategories.length > 0 ? (
          topLevelCategories.map((category) => (
            <DynamicQuestionCategory 
              key={category.id} 
              category={category}
              financialYear={financialYear}
              moduleId={moduleId}
            />
          ))
        ) : (
          <p className="text-gray-500">No categories found in this submodule.</p>
        )}
      </div>
    </div>
  );
};

export default SubmoduleContent;