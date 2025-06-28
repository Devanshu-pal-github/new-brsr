# Table Edit Popup AI Features Context

## Overview
This document describes the new AI-powered features and architectural changes for the table and table-with-additional-rows edit popup in the BRSR application. The goal is to provide a rich, AI-assisted editing experience for tabular questions, while maintaining type safety and minimal disruption to the existing UI and codebase.

---

## Features Checklist

1. **AI-Assisted Data Filling**
   - Suggest or auto-fill table cells based on partial data.
   - Button: "AI Fill Suggestions".

2. **Bulk Data Entry & Validation**
   - Paste from Excel/CSV, AI validates and maps data.
   - Highlight/flag inconsistent or outlier values.

3. **Natural Language to Table**
   - User can describe changes in plain English, AI fills table accordingly.
   - Input: "Describe your change..."

4. **Explain Calculations**
   - Click on a calculated cell to get an AI explanation of the value.
   - Tooltip or side panel for explanations.

5. **Scenario Simulation**
   - "What if" analysis: User asks for hypothetical changes, AI shows impact.
   - Button: "Simulate Scenario".

6. **Guided Data Entry**
   - Step-by-step prompts for missing/required fields, with AI hints.
   - Progress indicator for completion.

7. **Data Consistency Checks**
   - AI checks for logical consistency (e.g., row/column totals).
   - Suggestions for corrections.

8. **Auto-Generate Example Data**
   - AI generates realistic example data for the table.
   - Button: "Generate Example Data".

9. **Contextual Help**
   - AI provides regulatory/domain guidance for each column/row.
   - Help icon or side panel per cell/column.

---

## Implementation Steps

### 1. Component Structure
- Create a new folder: `Frontend/BRSR/src/dynamic-pages/components/table-ai/`
- For each feature, create a dedicated component (e.g., `AIFillSuggestions.jsx`, `BulkDataEntry.jsx`, etc.).
- Create a main wrapper component: `TableAIAssistantPanel.jsx` that includes all features as subcomponents.
- Ensure all components use TypeScript or PropTypes for type safety.

### 2. Edit Popup Integration
- In the main edit popup, conditionally render `TableAIAssistantPanel` for table/table-with-additional-rows questions.
- Do not alter the subjective question logic or UI.
- Minimal UI changes: add a sidebar, drawer, or expandable panel for AI features.

### 3. Feature Implementation
- Each feature component should:
  - Receive the current table data, metadata, and editing context as props.
  - Use existing Redux or context state for data updates.
  - Communicate with the AI backend via existing or new API endpoints.
  - Render results, suggestions, or actions in a user-friendly way.
- All features must be type-safe and not break existing table editing.

### 4. Backend Integration
- Add/extend endpoints for:
  - AI fill suggestions
  - Bulk data validation
  - Natural language to table conversion
  - Calculation explanations
  - Scenario simulation
  - Data consistency checks
  - Example data generation
  - Contextual help
- Ensure endpoints are secure and return type-safe, structured responses.

### 5. UI/UX Guidelines
- Do not disrupt the main table editing UI.
- Use modals, sidebars, or tooltips for AI features.
- All AI actions should be undoable or previewable before applying.
- Provide clear feedback for AI actions (success, error, suggestions).

### 6. Testing & QA
- Unit and integration tests for all new components.
- Manual QA for all 9 features in both table and table-with-additional-rows contexts.
- Regression test to ensure subjective question editing is unaffected.

---

## Type Safety
- All new components must use TypeScript or PropTypes.
- API responses must be validated and parsed before use.
- Table data structures must be strictly typed.

---

## Example File Structure

```
Frontend/BRSR/src/dynamic-pages/components/table-ai/
  AIFillSuggestions.jsx
  BulkDataEntry.jsx
  NaturalLanguageToTable.jsx
  ExplainCalculation.jsx
  ScenarioSimulation.jsx
  GuidedDataEntry.jsx
  DataConsistencyCheck.jsx
  ExampleDataGenerator.jsx
  ContextualHelp.jsx
  TableAIAssistantPanel.jsx
```

---

## Summary
- All 9 AI features will be implemented as modular, type-safe components.
- Only the table/table-with-additional-rows edit popup will be enhanced; subjective logic remains untouched.
- The main edit popup will include the new AI panel for relevant question types.
- This context file should be referenced for all future work on table AI features.

---

## Implementation Checklist (Step-by-Step)

### 1. Planning & Setup
- [x] Review and understand the current edit popup and table/table-with-additional-rows code.
- [x] Do NOT alter any code related to subjective questions or unrelated features.
- [x] Create a new folder: `table-ai/` for all new AI feature components.

### 2. Component Creation
- [x] For each AI feature, create a dedicated, type-safe component.
- [x] Create a main wrapper: TableAIAssistantPanel.jsx to aggregate all features.

### 3. Edit Popup Integration
- [x] Integrate all 9 AI feature components into TableAIAssistantPanel.jsx.
- [x] Conditionally render TableAIAssistantPanel in the edit popup for table/table-with-additional-rows questions only.
- [x] Ensure no changes to subjective question logic/UI.
- [x] UI changes should be minimal and non-intrusive (sidebar, drawer, or expandable panel).

### 4. Feature Implementation
- [x] AIFillSuggestions: Button, API call, preview, apply logic.
- [x] BulkDataEntry: Paste/validate data, highlight issues, map to table.
- [x] NaturalLanguageToTable: UI and logic implemented (input, loading, API call, preview, apply logic, type safety ensured).
- [x] ExplainCalculation: UI and logic implemented (click cell, API call, loading, error, popup with AI explanation).
- [x] Backend: Implemented `/api/ai/explain-calculation` endpoint (accepts cell value/context, returns dummy explanation for now).
- [x] ScenarioSimulation: UI and logic implemented (input, loading, API call, preview, apply logic).
- [x] Backend: Implemented `/api/ai/scenario-simulation` endpoint (accepts scenario input/table data, returns dummy simulation for now).
- [ ] Next: Integrate real AI logic/model for scenario simulation.
- [x] GuidedDataEntry: UI and logic implemented (step-by-step prompts, AI hints, progress indicator, error handling).
- [x] Backend: Implemented `/api/ai/guided-data-entry` endpoint (accepts step/table data, returns dummy hint for now).
- [ ] Next: Integrate real AI logic/model for guided data entry hints.
- [x] DataConsistencyCheck: UI and logic implemented (AI check, flagging issues, suggesting fixes, apply logic).
- [x] Backend: Implemented `/api/ai/data-consistency-check` endpoint (accepts table data/metadata, returns dummy issues and suggestions for now).
- [ ] Next: Integrate real AI logic/model for data consistency checks.
- [x] ExampleDataGenerator: UI and logic implemented (generate, preview, and apply example data using AI).
- [x] Backend: Implemented `/api/ai/example-data-generator` endpoint (accepts metadata, returns dummy example data for now).
- [ ] Next: Integrate real AI logic/model for example data generation.
- [x] ContextualHelp: UI and logic implemented (help icon, API call, loading, error, popup with AI guidance).
- [x] Backend: Implemented `/api/ai/contextual-help` endpoint (accepts column/row/metadata, returns dummy help for now).
- [ ] All 9 AI features now have both frontend and backend scaffolding implemented.
- [ ] Next: Integrate real AI logic/models for all endpoints and perform end-to-end testing.

### 5. Backend Integration
- [ ] Add/extend endpoints for each AI feature as needed.
- [ ] Ensure endpoints are secure and return type-safe, structured responses.

### 6. UI/UX & Testing
- [ ] Use modals, sidebars, or tooltips for AI features.
- [ ] Provide clear feedback for all AI actions.
- [ ] Unit/integration tests for all new components.
- [ ] Manual QA for all 9 features in both table and table-with-additional-rows contexts.
- [ ] Regression test to ensure subjective question editing is unaffected.

### 7. Documentation & Updates
- [x] Update this checklist after each implementation step.
- [ ] Document any design decisions, caveats, or known issues in this file.

---

## Do's and Don'ts

### Do's
- Do keep all new AI features modular and type-safe.
- Do update this context file after every major implementation or design change.
- Do ensure all features are undoable or previewable.
- Do provide clear user feedback for all AI actions.
- Do keep the UI/UX consistent and non-intrusive.
- Do test all features thoroughly before merging.

### Don'ts
- Don't alter or break any code related to subjective questions.
- Don't make unrelated changes in the codebase.
- Don't bypass type safety or skip validation of AI responses.
- Don't introduce breaking changes to the existing table editing workflow.
- Don't forget to update this file after each implementation step.

---

## Note
- This file is the single source of truth for all table AI feature work. Always consult and update it as you implement or refactor features.

---

## [2025-06-27] Progress Update
- [x] Conditionally rendered TableAIAssistantPanel in the edit popup for table/table-with-additional-rows questions only.
- [x] Ensured subjective question logic/UI is untouched.
- [x] Implemented actual logic for AI Fill Suggestions:
  - Button triggers API call to `/api/ai/table-fill-suggestions`.
  - Shows loading state, previews suggestions, and allows user to apply them.
  - Type safety and error handling included.
- [x] Implemented actual logic for Bulk Data Entry:
  - Textarea for CSV/TSV input.
  - Parses and previews pasted data.
  - Calls onBulkPaste with parsed rows.
  - Type safety and error handling included.
- [x] NaturalLanguageToTable: UI and logic implemented (input, loading, API call, preview, apply logic, type safety ensured).
- [x] Backend: Implemented `/api/ai/nl-to-table` endpoint in FastAPI (accepts NL input, table data, returns dummy suggestions for now).
- [x] ExplainCalculation: UI and logic implemented (click cell, API call, loading, error, popup with AI explanation).
- [x] Backend: Implemented `/api/ai/explain-calculation` endpoint (accepts cell value/context, returns dummy explanation for now).
- [x] ScenarioSimulation: UI and logic implemented (input, loading, API call, preview, apply logic).
- [x] Backend: Implemented `/api/ai/scenario-simulation` endpoint (accepts scenario input/table data, returns dummy simulation for now).
- [ ] Next: Integrate real AI logic/model for scenario simulation.
- [x] GuidedDataEntry: UI and logic implemented (step-by-step prompts, AI hints, progress indicator, error handling).
- [x] Backend: Implemented `/api/ai/guided-data-entry` endpoint (accepts step/table data, returns dummy hint for now).
- [ ] Next: Integrate real AI logic/model for guided data entry hints.
- [x] DataConsistencyCheck: UI and logic implemented (AI check, flagging issues, suggesting fixes, apply logic).
- [x] Backend: Implemented `/api/ai/data-consistency-check` endpoint (accepts table data/metadata, returns dummy issues and suggestions for now).
- [ ] Next: Integrate real AI logic/model for data consistency checks.
- [x] ExampleDataGenerator: UI and logic implemented (generate, preview, and apply example data using AI).
- [x] Backend: Implemented `/api/ai/example-data-generator` endpoint (accepts metadata, returns dummy example data for now).
- [ ] Next: Integrate real AI logic/model for example data generation.
- [x] ContextualHelp: UI and logic implemented (help icon, API call, loading, error, popup with AI guidance).
- [x] Backend: Implemented `/api/ai/contextual-help` endpoint (accepts column/row/metadata, returns dummy help for now).
- [ ] All 9 AI features now have both frontend and backend scaffolding implemented.
- [ ] Next: Integrate real AI logic/models for all endpoints, perform end-to-end testing, and update documentation with any design decisions or known issues.

## [2025-06-27] Progress Update (Continued)
- [x] AI Fill Suggestions: Fully functional (button triggers API, shows loading, previews/apply suggestions, type safety ensured).
- [x] Bulk Data Entry: Fully functional (users can paste CSV/TSV, data is parsed/previewed, sent to parent, type safety ensured).
- [x] Natural Language to Table: UI and logic implemented (input, loading, API call, preview, apply logic, type safety ensured).
- [x] Explain Calculation: UI and logic implemented (click cell, API call, loading, error, popup with AI explanation).
- [x] Scenario Simulation: UI and logic implemented (input, loading, API call, preview, apply logic).
- [ ] Next: Integrate backend endpoint `/api/ai/nl-to-table` and connect to real AI logic.
- [ ] Next: Integrate real AI logic/model for scenario simulation.
- [ ] Next: Implement GuidedDataEntry feature (UI for step-by-step prompts, AI hints, and progress indicator).
- [ ] Next: Implement DataConsistencyCheck feature (UI for AI checks, flagging issues, and suggesting fixes).
- [ ] Next: Implement ExampleDataGenerator feature (UI for generating and applying example data with AI).
- [ ] Next: Implement ContextualHelp feature (UI for AI guidance per cell/column, help icon or side panel).

---

## Reference
- All implementation steps, design decisions, and progress for table AI features must be documented in this file (`newcontext.md`).
- Always update this file after each major change or feature implementation.

---

## [2025-06-27] Design Decisions & Known Issues

### Design Decisions
- Modular architecture: Each AI feature is a separate, type-safe component for maintainability and scalability.
- API-first approach: All AI features communicate with backend endpoints for logic, ensuring separation of concerns and easier future upgrades.
- Minimal UI disruption: AI features are integrated as side panels, popups, or tooltips to preserve the core table editing experience.
- Type safety: All data structures and API responses are strictly typed for reliability.

### Known Issues / Caveats
- All AI endpoints currently return dummy data; real AI logic/model integration is pending.
- Error handling is basic and may need enhancement for production.
- UI/UX for some features (e.g., step-by-step guidance, scenario simulation) may require further user feedback and iteration.
- End-to-end tests and manual QA are required for all features before production.

---

## [2025-06-27] QA & Testing Checklist

### Manual QA
- [ ] Verify each AI feature UI renders correctly in the edit popup for table/table-with-additional-rows questions.
- [ ] Test all user interactions: button clicks, text input, scenario simulation, help popups, etc.
- [ ] Confirm that all AI endpoints are called and responses are handled (even if dummy data).
- [ ] Check error handling for failed API calls and invalid input.
- [ ] Ensure undo/preview functionality works for all AI actions.
- [ ] Validate that subjective question logic/UI is unaffected.

### Automated Testing
- [ ] Write unit tests for each AI feature component (input, output, error states).
- [ ] Write integration tests for frontend-backend API calls (mocking backend responses).
- [ ] Add regression tests to ensure no breaking changes to existing table editing workflow.

### End-to-End Testing
- [ ] Simulate a full user flow: open edit popup, use each AI feature, apply changes, and save.
- [ ] Test edge cases: large tables, empty tables, invalid data, rapid user actions.

---
