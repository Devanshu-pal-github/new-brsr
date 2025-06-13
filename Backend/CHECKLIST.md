# Project Checklist and Architecture

## Project Overview

This project is a complete rewrite of the previous system, designed to be more efficient, maintainable, and scalable. The primary goal is to create a B2B platform for various types of reporting, with BRSR reporting being the initial focus.

### Key Design Principles
1. **Modularity**: Each component is designed to be independent and reusable
2. **Scalability**: System can handle multiple report types and companies
3. **Flexibility**: Dynamic module allocation for different report types
4. **Data Integrity**: Two-way referencing between related collections
5. **Performance**: Optimized database design and query patterns
6. **Hierarchy**: Clear data flow and validation paths

### System Flow

1. **Access Control Hierarchy**
   - **Developer Admin (Super Admin)**: Full CRUD authority over all entities (Companies, Reports, Modules, Questions, Users, User Access). Responsible for initial setup, configuration, and B2B partner-level management.
   - **Company Admin**: Manages company-specific data, plants, and user access within their company. Can select pre-assigned reports and modules. No CRUD on core entities (Reports, Modules, Questions).
   - **Plant Admin**: Manages data for specific plants. Limited to data entry and validation within assigned modules.
   - **User**: Basic data entry and viewing permissions.

2. **Company Onboarding (Developer Admin Responsibility)**
   - Developer Admin initializes company.
   - Developer Admin assigns desired report types (e.g., BRSR).
   - Developer Admin configures and assigns modules (Basic and Calc).
   - Developer Admin creates company administrator account.
   - Developer Admin sets up initial financial year.

3. **Report, Module, Question Management (Developer Admin Responsibility)**
   - Reports, Modules, and Questions are pre-defined and managed exclusively by Developer Admins.
   - Company Admins will request specific reports/modules/questions, which Developer Admins will then assign to their company.

4. **Plant Setup and Hierarchy**
   - Two special plants created by default:
     - C001 (Aggregator Plant):
       * Stores factual aggregated cumulative data from all plants
       * Acts as the single source of truth for company-wide data
       * Maintains historical aggregated data
     - P001 (Home Plant):
       * Primary validation and data entry point
       * Validates all subjective data
       * Performs data auditing
       * Sends audited cumulative responses to C001
       * Acts as the gateway for data flow
   - Additional plants:
     - Submit raw data
     - Limited to calc module access
     - Data flows through P001 for validation

2. **Plant Setup and Hierarchy**
   - Two special plants created by default:
     - C001 (Aggregator Plant):
       * Stores factual aggregated cumulative data from all plants
       * Acts as the single source of truth for company-wide data
       * Maintains historical aggregated data
     - P001 (Home Plant):
       * Primary validation and data entry point
       * Validates all subjective data
       * Performs data auditing
       * Sends audited cumulative responses to C001
       * Acts as the gateway for data flow
   - Additional plants:
     - Submit raw data
     - Limited to calc module access
     - Data flows through P001 for validation

3. **Module Structure**
   - Hierarchical Organization:
     ```
     Module
     └── Sub-modules
         └── Categories
             └── Questions
     ```
   - Module Types:
     - Basic Modules:
       * Company-level access only
       * Typically contains company-wide data
     - Calc Modules:
       * Plant-level access
       * Also accessible by company
       * Contains plant-specific calculations

4. **Data Flow Process**
   ```
   Regular Plants
        ↓
   P001 (Validation & Auditing)
        ↓
   C001 (Aggregation & Storage)
        ↓
   Company-wide Reporting
   ```

## Database Collections Overview

1. **Reports Collection**
   - Purpose: Store report templates and configurations
   - Key Features:
     - Dynamic module assignment
     - Flexible report structure
     - Support for multiple report types
   - Fields:
     - UUID (Primary Key)
     - Report Name
     - Module IDs (Array, initially empty)
     - Basic Modules (Array)
     - Calc Modules (Array)
     - Created At, Updated At

2. **Modules Collection**
   - Purpose: Central repository for all report modules
   - Key Features:
     - Hierarchical structure (Module → Sub-module → Categories → Questions)
     - Support for both Basic and Calc modules
     - Fixed sub-module, categories, and question mappings
     - JSON structure format for easier frontend consumption
     - Bulk operations for efficient management
   - Fields:
     - UUID (Primary Key)
     - Module Name
     - Module Type (Basic/Calc)
     - Sub-modules Array:
       - id (UUID, unique identifier)
       - Name
       - Categories Array:
         - id (UUID, unique identifier)
         - Name
         - Question IDs (Array)
     - Created At, Updated At
   - Notes:
     - Sub-modules, categories, and questions are fixed per module
     - Modules can be assigned to multiple reports
     - Two-way referencing with Reports collection
     - JSON structure endpoints provide hierarchical representation
     - Bulk operations available for submodules, categories, and questions

3. **Answers Collection**
   - Purpose: Store module-specific responses
   - Key Features:
     - Flexible answer structure for all question types
     - For subjective: answer_data can include text, boolean, number, link, or combinations
     - For table: answer_data is a list of row dicts, with keys for each column and special keys for calc columns/rows. Table answers support arbitrary header hierarchies (label, header, subheader1, ..., subheaderN).
     - For table with additional rows: same as table, but rows can be added dynamically
     - Company and plant-specific data
     - Hierarchical data validation flow
     - **authoritative_source field:** Indicates which plant's answer is authoritative for a given question/year/company. 'P001' can override 'C001' (aggregator) at any time. All business logic must prefer P001's answer if present and authoritative.
   - Fields:
     - UUID (Primary Key)
     - Company ID (Reference)
     - Plant ID (Reference)
     - Financial Year
     - Question ID (Reference)
     - Answer Data (JSON, flexible for all types)
     - Validation Status:
       - Raw (from regular plants)
       - Audited (validated by P001)
       - Aggregated (stored in C001)
     - **Authoritative Source:** 'P001', 'C001', or None. Used to determine which answer is final for reporting and aggregation.
     - Created At, Updated At
   - Notes:
     - Each module has its own answer collection
     - Data flows: Plant → P001 → C001
     - Financial year tracking for historical data
     - Maintains audit trail of changes
     - Table answers support header hierarchy of arbitrary depth, calc fields, and dynamic rows

4. **Companies Collection**
   - Purpose: Store company profiles and report assignments
   - Key Features:
     - Multi-report support
     - Plant management
     - Financial year tracking
   - Fields:
     - UUID (Primary Key)
     - Company Name
     - Active Reports Array:
       - Report ID
       - Assigned Modules:
         - Basic Modules (Array)
         - Calc Modules (Array)
       - Financial Year
       - Status
     - Plant IDs (Array)
     - Created At, Updated At
   - Notes:
     - Companies can have multiple active reports
     - Two-way referencing with Plants collection
     - Financial year-based report tracking

5. **Plants Collection**
   - Purpose: Manage company plants and data aggregation
   - Key Features:
     - Special plants (C001, P001) handling
     - Hierarchical data flow
     - Company association
   - Fields:
     - UUID (Primary Key)
     - Plant Code (e.g., C001, P001)
     - Plant Name
     - Company ID (Reference)
     - Plant Type:
       - Aggregator (C001)
       - Home (P001)
       - Regular
     - Access Level:
       - Calc modules only (for regular plants)
       - All modules (for C001, P001)
     - Created At, Updated At
   - Notes:
     - C001: Aggregates validated data, contains factual aggregated cumulative data from all plants
     - P001: Primary validation and data entry, validates all subjective data and sends audited cumulative response to C001
     - Regular plants: Data submission only

6. **Questions Collection**
   - Purpose: Store question metadata and validation rules
   - Key Features:
     - Three question types supported:
       1. **Subjective**: Text, boolean, number (decimal, integer, percentage), link, and any combination thereof (e.g., boolean + text, boolean + link, etc.).
       2. **Table**: Table structure with an arbitrary (N) number of column header hierarchy levels. The header hierarchy can be represented as a list, e.g., label, header, subheader1, subheader2, ..., subheaderN. Supports special calc columns/rows for calculated values (e.g., totals). Table metadata defines header hierarchy, columns, rows, cells, calc fields, and UI hints for arbitrary complexity.
       3. **Table with Additional Rows**: Same as Table, but allows users to dynamically add rows. All table features apply.
     - Question type definitions
     - Validation rules
     - Module association
   - Fields:
     - UUID (Primary Key)
     - Question Number (Human readable)
     - Question Text
     - Question Type ("subjective", "table", "table_with_additional_rows")
     - Validation Rules:
       - Data type
       - Range/constraints
       - Required/Optional
       - Custom validations
     - Module ID (Reference)
     - Table Metadata (for table types):
       - Header hierarchy (list: label, header, subheader1, subheader2, ..., subheaderN)
       - Columns (properties, types, validation, calc, etc.)
       - Rows (properties, types, validation, calc, etc.)
       - Cells (optional, for cell-level metadata and validation)
       - Calc columns/rows
       - Column/row types and properties
       - UI hints (scroll, pagination, min/max width, etc.)
     - Created At, Updated At
   - Notes:
     - Subjective questions can have multiple answer fields (text, boolean, number, link, or combinations)
     - Table questions support arbitrary header hierarchies, column/row/cell metadata, and special calc fields
     - Table with additional rows allows dynamic row addition by users

7. **User Access Collection**
   - Purpose: Manage user roles and permissions
   - Key Features:
     - Role-based access control
     - Company and plant-level permissions
     - Access hierarchy
   - Fields:
     - UUID (Primary Key)
     - User ID
     - Company ID (Reference)
     - Plant ID (Reference)
     - Role:
       - Company Admin
       - Plant Admin
     - Access Level:
       - Basic Modules (Company Admin only)
       - Calc Modules (Both roles)
     - Created At, Updated At
   - Notes:
     - Company admins have access to all plants
     - Plant admins limited to specific plants (and has access to only calc modules)
     - Role-based module access control

## Implementation Checklist

### Phase 1: Initial Setup
- [x] Set up FastAPI project structure
- [x] Configure MongoDB connection
- [x] Set up environment variables
- [x] Create requirements.txt
- [x] Set up project structure:
  - modules/
  - routes/
  - services/
  - main.py
  - dependencies.py
- [x] Create .gitignore
- [x] Create database initialization script
- [x] Set up proper indexes for collections

### Phase 2: Database Models
- [x] Create Pydantic models for Reports
- [x] Create Pydantic models for Modules
- [x] Create Pydantic models for Companies
- [x] Create Pydantic models for Plants
- [x] Create Pydantic models for Questions
- [x] Create Pydantic models for User Access
- [x] Implement UUID generation utility
- [x] Set up MongoDB indexes
- [x] Implement database connection pool
- [x] Implement Module-Report relationships
- [x] Implement Company-Report relationships
- [x] Remove all nested classes and enums
- [x] Standardize timestamp handling
- [x] Flatten model hierarchies

### Phase 3: Core Services
- [x] Implement Company Service
- [x] Implement Plant Service
- [x] Implement Report Service
- [x] Implement Module Service
- [x] Implement Question Service
- [x] Implement Answer Service
- [x] Implement User Access Service

### Phase 4: API Routes
- [x] Company routes
- [x] Plant routes
- [x] Report routes
- [x] Module routes
  - [x] Basic CRUD operations
  - [x] JSON structure endpoints
  - [x] Hierarchical operations (submodules, categories, questions)
  - [x] Bulk operations for submodules, categories, and questions
- [x] Question routes
  - [x] Questions with UUID and human-readable IDs
- [x] Answer routes
- [x] User Access routes

### Phase 5: Business Logic
- [x] Implement company-report assignment logic
- [x] Implement plant initialization logic (C001 and P001)
- [x] Implement module-submodule-category hierarchy
- [x] Implement answer collection logic
- [x] Implement user access control

### Phase 7: Documentation
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Setup and deployment guide

## Best Practices to Follow
1. Use UUID for all primary keys
2. Maintain bi-directional references where needed
3. Implement proper error handling
4. Use async/await for database operations
5. Follow FastAPI best practices
6. Implement proper validation using Pydantic
7. Use proper type hints
8. Follow PEP 8 style guide
9. Implement proper logging
10. Use dependency injection
11. **Authoritative Answer Logic:** Always check the authoritative_source field when retrieving answers. P001 can override C001's aggregate answer at any time; always use P001's answer if present and authoritative.

## Notes
- All collections will use UUID for primary keys
- Maintain proper parent-child relationships
- Implement proper indexing for performance
- Use proper data validation
- Implement proper error handling
- Follow async/await pattern
- Maintain proper documentation

# BRSR API Implementation Checklist

## Core Components

### Reports
- [x] Report model with versioning
- [x] CRUD operations
- [x] Report status management
- [x] Module relationships

### Modules
- [x] Module model with hierarchical structure
- [x] CRUD operations
- [x] Submodule management
- [x] Category organization

### Companies
- [x] Company model
- [x] CRUD operations
- [x] Active report management
- [x] Plant relationships

### Plants
- [x] Plant model
- [x] CRUD operations
- [x] Company relationships
- [x] Special handling for C001 and P001

### Questions
- [x] Question model with types
- [x] CRUD operations
- [x] Validation rules
- [x] Module relationships

### Answers
- [x] Answer model with versioning
- [x] CRUD operations
- [x] Type validation
- [x] Status tracking
- [x] Bulk operations
- [x] Answer archiving

### User Access
- [x] User access model with roles and permissions
- [x] CRUD operations for access management
- [x] Role-based access control (RBAC)
- [x] Company and plant level permissions
- [x] Permission checking system
- [x] Access summary functionality

## Implementation Phases

### Phase 1: Project Setup
- [x] Initialize FastAPI project
- [x] Set up MongoDB connection
- [x] Configure environment variables
- [x] Set up project structure

### Phase 2: Database Models
- [x] Create Pydantic models for Reports
- [x] Create Pydantic models for Modules
- [x] Create Pydantic models for Companies
- [x] Create Pydantic models for Plants
- [x] Create Pydantic models for Questions
- [x] Create Pydantic models for User Access
- [x] Implement UUID generation utility
- [x] Set up MongoDB indexes

### Phase 3: Services
- [x] Implement Report Service
- [x] Implement Module Service
- [x] Implement Company Service
- [x] Implement Plant Service
- [x] Implement Question Service
- [x] Implement Answer Service
- [x] Implement User Access Service

### Phase 4: API Routes
- [x] Report routes
- [x] Module routes
- [x] Company routes
- [x] Plant routes
- [x] Question routes
- [x] Answer routes
- [x] User Access routes

### Phase 5: Business Logic
- [x] Implement company-report assignment logic
- [x] Implement plant initialization logic (C001 and P001)
- [x] Implement module-submodule-category hierarchy
- [x] Implement answer collection logic
- [x] Implement user access control

## Technical Features

### Database
- [x] MongoDB integration
- [x] Proper indexing
- [x] Data validation
- [x] Relationship management

### API Features
- [x] FastAPI implementation
- [x] CORS configuration
- [x] Error handling
- [x] Input validation
- [x] Response models
- [x] API documentation

### Security
- [x] Role-based access control
- [x] Permission validation
- [x] Data validation
- [x] Error handling

## Status
- All core components implemented ✅
- All technical features implemented ✅
- System ready for testing with Postman ✅

## Implementation Details

### 1. Data Flow Implementation
```
Regular Plant → P001 → C001
     ↓           ↓      ↓
Raw Data → Validation → Aggregation
```

1. **Regular Plant Data Submission**
   - Submit data through calc modules only
   - Initial validation at API level
   - Status marked as "Raw"

2. **P001 Processing**
   - Receives data from regular plants
   - Performs validation and auditing
   - Aggregates plant data
   - Sends validated data to C001
   - Maintains audit trail

3. **C001 Operations**
   - Stores final validated data
   - Maintains historical records
   - Provides company-wide views
   - Supports reporting functions

### 2. Module Management

1. **Module Assignment**
   ```
   Report Creation
        ↓
   Empty Module List
        ↓
   Module Assignment
        ↓
   Sub-module Configuration
        ↓
   Category Setup
        ↓
   Question Mapping
   ```

2. **Access Control**
   - Company Admin:
     * Access to all modules (both basic and calc)
     * All plants view
     * Configuration rights
     * Automatically receives access to all modules assigned to reports in their company
   - Plant Admin:
     * Calc modules only (restricted from basic modules)
     * Single plant view
     * Data submission rights
     * Automatically receives access to calc modules assigned to reports in their company
   - Module Assignment Logic:
     * When modules are assigned to a report, they are categorized as basic or calc
     * When a report is assigned to a company, all its modules are automatically assigned to the company
     * Company admins receive access to all modules (both basic and calc)
     * Plant admins receive access to calc modules only
     * When modules are added to a report, they are combined with existing modules (not overwritten)
     * When a report is deleted, module access is removed if those modules are not available through other reports

### 3. Validation Framework

1. **Data Validation Levels**
   - API Level:
     * Request format
     * Required fields
     * Data types
   - Business Logic:
     * Cross-field validation
     * Business rules
     * Calculations
   - Plant Level:
     * P001 validation
     * Aggregation rules
     * Audit checks

2. **Error Handling**
   - Structured error responses
   - Validation error details
   - Audit trail logging
   - Recovery procedures

### 4. Technical Implementation

1. **API Structure**
   ```
   /api
   ├── /v1
   │   ├── /companies
   │   ├── /plants
   │   ├── /reports
   │   ├── /modules
   │   ├── /answers
   │   └── /users
   ```

2. **Database Optimization**
   - Indexes:
     * Company ID + Financial Year
     * Plant ID + Module ID
     * Report ID + Module ID
   - Aggregation Pipelines:
     * Plant data consolidation
     * Report generation
     * Analytics queries

3. **Security Implementation**
   - Authentication:
     * JWT-based auth
     * Token refresh mechanism
     * Session management
   - Authorization:
     * Role-based access
     * Plant-level permissions
     * Module-level access control

4. **Performance Considerations**
   - Caching Strategy:
     * Redis for frequent queries
     * In-memory caching for lookups
   - Query Optimization:
     * Efficient MongoDB queries
     * Proper indexing
     * Batch processing
   - Load Handling:
     * Connection pooling
     * Rate limiting
     * Request queuing

### 5. Deployment Architecture

1. **Environment Setup**
   ```
   Development → Staging → Production
        ↓          ↓           ↓
   Local DB    Test DB    Production DB
   ```

2. **Infrastructure**
   - Application Servers:
     * Load balanced
     * Auto-scaling
     * Health monitoring
   - Database:
     * MongoDB cluster
     * Backup strategy
     * Replication
   - Caching:
     * Redis cluster
     * Cache invalidation
     * Data persistence

3. **Monitoring**
   - System Metrics:
     * Server health
     * Database performance
     * API response times
   - Business Metrics:
     * User activity
     * Report generation
     * Data validation stats

4. **Maintenance**
   - Backup Strategy:
     * Regular backups
     * Point-in-time recovery
     * Data retention policy
   - Updates:
     * Zero-downtime deployment
     * Rolling updates
     * Version control
   - Support:
     * Issue tracking
     * Documentation
     * Training materials

## Development Workflow

1. **Code Organization**
   ```
   /backend
   ├── /src
   │   ├── /models
   │   ├── /routes
   │   ├── /services
   │   ├── /utils
   │   └── /validators
   ├── /tests
   ├── /docs
   └── /scripts
   ```

2. **Development Process**
   - Feature Development:
     * Branch creation
     * Code implementation
     * Unit testing
     * Code review
   - Testing:
     * Integration testing
     * API testing
     * Performance testing
   - Deployment:
     * Environment setup
     * Database migration
     * Service deployment

3. **Quality Assurance**
   - Code Quality:
     * Linting
     * Type checking
     * Code coverage
   - Testing:
     * Unit tests
     * Integration tests
     * End-to-end tests
   - Documentation:
     * API documentation
     * Code documentation
     * User guides

This checklist serves as the comprehensive guide for the project implementation, ensuring all aspects are properly addressed and maintained throughout the development lifecycle.

## Implementation Checklists

### 1. Authentication & Authorization
- [x] JWT Model Structure
  - [x] Token data model
  - [x] Login/Response models
  - [ ] Token generation
  - [ ] Token validation
- [ ] User Authentication
  - [ ] Password hashing
  - [ ] Login endpoint
  - [ ] Session management
- [ ] Authorization System
  - [x] Role definitions
  - [x] Permission levels
  - [ ] Access middleware

## 2. Database Implementation
- [x] Collection Models
  - [x] Reports
  - [x] Modules
  - [x] Companies
  - [x] Plants
  - [x] Questions
  - [x] Answers
  - [x] User Access
- [ ] Database Setup
  - [ ] Indexes
  - [ ] Validation rules
  - [ ] Relationships

## 3. API Implementation
- [ ] Core Endpoints
  - [ ] /auth/*
  - [ ] /companies/*
  - [ ] /plants/*
  - [ ] /reports/*
  - [ ] /modules/*
  - [ ] /answers/*

## 4. Data Flow Implementation
- [x] Model Structure
  - [x] Regular plant flow
  - [x] P001 validation
  - [x] C001 aggregation
- [ ] Service Layer
  - [ ] Data validation
  - [ ] Flow control
  - [ ] Aggregation logic

## Next Priority Tasks
1. Complete JWT implementation
2. Create auth service & endpoints
3. Implement access middleware
4. Set up database collections

## Notes
- All models cleaned and restructured
- Removed nested Config classes
- Standardized datetime/metadata handling
- Ready for service layer implementation

# Implementation Status

## Completed Items ✅

### Models Cleanup
- [x] Removed all nested Config classes from models
- [x] Simplified field definitions (removed default_factory)
- [x] Standardized datetime and metadata handling
- [x] Created base mixins (TimestampMixin, MetadataMixin)
- [x] Removed redundant validations and descriptions

### Core Models Structure
- [x] Company model with basic fields
- [x] Plant model with C001 and P001 handling
- [x] Report model with module assignments
- [x] Module model with BRSR structure
- [x] Question model with validation rules
- [x] Answer model with separate collections
- [x] User and access models

## In Progress Items 🚧

### Authentication System
- [x] JWT model structure
- [x] Token data structure
- [ ] Token generation implementation
- [ ] Token validation middleware
- [ ] Password hashing
- [ ] Session management
- [ ] Rate limiting

### Access Control
- [x] Role definitions
- [x] Permission levels
- [ ] Access validation middleware
- [ ] Company-level restrictions
- [ ] Plant-level restrictions
- [ ] Module-specific permissions

## Pending Implementation ❌

### Services Layer
- [ ] AuthService
  - [ ] JWT handling
  - [ ] Password management
  - [ ] Session tracking
- [ ] UserAccessService
  - [ ] Permission validation
  - [ ] Role management
  - [ ] Access control
- [ ] DataService
  - [ ] Plant data flow
  - [ ] Validation rules
  - [ ] Aggregation logic

### API Endpoints
- [ ] Authentication
  - [ ] /login
  - [ ] /refresh-token
  - [ ] /logout
- [ ] User Management
  - [ ] /users/create
  - [ ] /users/update
  - [ ] /users/permissions
- [ ] Data Management
  - [ ] /companies/*
  - [ ] /plants/*
  - [ ] /reports/*
  - [ ] /answers/*

### Database Implementation
- [ ] Collection setup
- [ ] Indexes creation
- [ ] Validation rules
- [ ] Data relationships

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] Performance tests

## Next Steps (Priority Order)

1. Authentication Implementation
   - [ ] JWT token generation/validation
   - [ ] Password hashing system
   - [ ] Basic auth endpoints

2. Access Control System
   - [ ] Permission middleware
   - [ ] Role validation
   - [ ] Access restrictions

3. Core Services
   - [ ] Auth service
   - [ ] User access service
   - [ ] Data validation service

4. API Development
   - [ ] Auth endpoints
   - [ ] User management
   - [ ] Data submission
   - [ ] Validation endpoints

5. Testing & Documentation
   - [ ] API documentation
   - [ ] Test suite
   - [ ] Deployment guide

## Technical Debt
- [ ] Error handling standardization
- [ ] Logging system
- [ ] Performance optimization
- [ ] Security hardening

## Notes
- JWT implementation is partially done (models only)
- Core models are cleaned and ready
- Next focus should be on authentication implementation
- Need to maintain backward compatibility while adding new features