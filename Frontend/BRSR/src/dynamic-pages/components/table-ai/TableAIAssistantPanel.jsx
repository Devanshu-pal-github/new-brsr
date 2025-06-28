import React from 'react';
import PropTypes from 'prop-types';
import AIFillSuggestions from './AIFillSuggestions';
import BulkDataEntry from './BulkDataEntry';
import NaturalLanguageToTable from './NaturalLanguageToTable';
import ExplainCalculation from './ExplainCalculation';
import ScenarioSimulation from './ScenarioSimulation';
import GuidedDataEntry from './GuidedDataEntry';
import DataConsistencyCheck from './DataConsistencyCheck';
import ExampleDataGenerator from './ExampleDataGenerator';
import ContextualHelp from './ContextualHelp';

// This component will serve as the main wrapper for all table AI features.
// It will receive table data, metadata, and editing context as props.
// Each AI feature will be included as a subcomponent here.

const TableAIAssistantPanel = ({ tableData, metadata, onTableUpdate, context }) => {
  // Handler wrappers for each feature to ensure correct data flow
  const handleSuggestion = (suggestions) => onTableUpdate(suggestions);
  const handleBulkPaste = (rows) => onTableUpdate(rows);
  const handleNLTable = (nlTable) => onTableUpdate(nlTable);
  const handleScenario = (simulatedTable) => onTableUpdate(simulatedTable);
  const handleStepComplete = (stepData) => onTableUpdate(stepData);
  const handleFixes = (fixedTable) => onTableUpdate(fixedTable);
  const handleExample = (exampleData) => onTableUpdate(exampleData);

  return (
    <aside className="table-ai-assistant-panel">
      <h3>AI Assistant for Table Editing</h3>
      <AIFillSuggestions tableData={tableData} metadata={metadata} onSuggestion={handleSuggestion} />
      <BulkDataEntry tableData={tableData} metadata={metadata} onBulkPaste={handleBulkPaste} />
      <NaturalLanguageToTable tableData={tableData} metadata={metadata} onApplyNLTable={handleNLTable} />
      <ExplainCalculation cellValue={null} cellContext={context} />
      <ScenarioSimulation tableData={tableData} metadata={metadata} onApplyScenario={handleScenario} />
      <GuidedDataEntry tableData={tableData} metadata={metadata} onStepComplete={handleStepComplete} />
      <DataConsistencyCheck tableData={tableData} metadata={metadata} onApplyFixes={handleFixes} />
      <ExampleDataGenerator metadata={metadata} onApplyExample={handleExample} />
      <ContextualHelp column={null} row={null} metadata={metadata} />
    </aside>
  );
};

TableAIAssistantPanel.propTypes = {
  tableData: PropTypes.array.isRequired,
  metadata: PropTypes.object.isRequired,
  onTableUpdate: PropTypes.func.isRequired,
  context: PropTypes.object
};

export default TableAIAssistantPanel;
