# Manual Score Editing Feature

## Overview

The Manual Score Editing feature allows authorized users to directly edit vendor scores, observations, evidence, and other assessment data through an intuitive web interface. This feature provides granular control over vendor capability assessments and enables real-time updates to the analysis data.

## Features

### 1. Vendor Score Editor
- **Score Adjustment**: Modify numerical scores (1-5 scale) and corresponding text labels
- **Weight Management**: Adjust attribute weights (1-100 scale)
- **Score Decision**: Edit the justification text for score assignments
- **Research Type**: Update the type of research conducted
- **Research Date**: Modify when the assessment was performed

### 2. Observation Management
- **Observation Types**: Support for multiple observation categories:
  - `STRENGTH` - Vendor strengths and advantages
  - `WEAKNESS` - Vendor limitations and gaps
  - `FEATURE` - Specific features and capabilities
  - `ADVANTAGE` - Competitive advantages
  - `NOTE` - General notes and observations
  - `GAP` - Missing capabilities or limitations
  - `LIMITATION` - Technical or business limitations
  - `DISADVANTAGE` - Competitive disadvantages

- **Observation Content**: Rich text editing for detailed observations
- **Bulk Operations**: Add, edit, or remove multiple observations

### 3. Evidence Management
- **URL Management**: Add, edit, or remove evidence URLs
- **URL Validation**: Automatic validation of evidence links
- **Evidence Categories**: Organize evidence by type and relevance
- **Bulk Import**: Import multiple evidence URLs at once

### 4. Access Control
- **Role-Based Permissions**: 
  - `admin`: Full edit access to all scores
  - `editor`: Edit access to assigned capabilities
  - `viewer`: Read-only access
- **Audit Trail**: Track all changes with user attribution and timestamps

## User Interface

### Entry Points

1. **Vendor Analysis Page**
   - Edit button on each vendor score card
   - Direct access to score editing interface

2. **Reports Page**
   - Edit button in attribute details dialog
   - Quick access to score modification

3. **Attribute Details Dialog**
   - Edit button for each vendor score
   - Inline editing capabilities

### Edit Interface Components

#### Score Editor Form
```typescript
interface ScoreEditForm {
  score: number;              // 1-5 scale
  score_text: string;         // "Excellent", "Very Good", etc.
  weight: number;             // 1-100 scale
  score_decision: string;     // Justification text
  research_type: string;      // "capability_research", "domain_analysis"
  research_date: string;      // ISO date string
}
```

#### Observation Editor
```typescript
interface ObservationEdit {
  id?: number;                // For existing observations
  observation: string;        // Observation text
  observation_type: ObservationType; // Enum value
  is_new?: boolean;           // Flag for new observations
}
```

#### Evidence Editor
```typescript
interface EvidenceEdit {
  id?: number;                // For existing evidence
  url: string;                // Evidence URL
  title?: string;             // Optional title
  description?: string;       // Optional description
  is_new?: boolean;           // Flag for new evidence
}
```

## Database Schema

### Core Tables

#### vendor_scores
```sql
CREATE TABLE vendor_scores (
    id INTEGER PRIMARY KEY,
    capability_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    vendor TEXT NOT NULL,
    weight INTEGER DEFAULT 50,
    score TEXT NOT NULL,
    score_numeric FLOAT NOT NULL,
    evidence_url TEXT,
    score_decision TEXT,
    research_type TEXT DEFAULT 'capability_research',
    research_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    FOREIGN KEY (capability_id) REFERENCES capabilities (id),
    FOREIGN KEY (attribute_id) REFERENCES attributes (id)
);
```

#### vendor_score_observations
```sql
CREATE TABLE vendor_score_observations (
    id INTEGER PRIMARY KEY,
    vendor_score_id INTEGER NOT NULL,
    observation TEXT NOT NULL,
    observation_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    FOREIGN KEY (vendor_score_id) REFERENCES vendor_scores (id)
);
```

#### url_validations
```sql
CREATE TABLE url_validations (
    id INTEGER PRIMARY KEY,
    vendor_score_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    original_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    http_status INTEGER,
    response_time FLOAT,
    content_length INTEGER,
    content_hash TEXT,
    ai_analysis TEXT,
    ai_confidence FLOAT,
    flagged_reason TEXT,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_score_id) REFERENCES vendor_scores (id)
);
```

## API Endpoints

### Vendor Score Management

#### Get Vendor Score Details
```http
GET /api/vendor-scores/{score_id}
```

#### Update Vendor Score
```http
PUT /api/vendor-scores/{score_id}
Content-Type: application/json

{
  "score": 4,
  "score_text": "Very Good",
  "weight": 75,
  "score_decision": "Updated justification...",
  "research_type": "capability_research",
  "research_date": "2024-01-15T10:30:00Z"
}
```

#### Update Observations
```http
PUT /api/vendor-scores/{score_id}/observations
Content-Type: application/json

{
  "observations": [
    {
      "id": 1,
      "observation": "Updated observation text",
      "observation_type": "STRENGTH"
    },
    {
      "observation": "New observation",
      "observation_type": "NOTE",
      "is_new": true
    }
  ]
}
```

#### Update Evidence URLs
```http
PUT /api/vendor-scores/{score_id}/evidence
Content-Type: application/json

{
  "evidence_urls": [
    "https://example.com/evidence1",
    "https://example.com/evidence2"
  ]
}
```

### Bulk Operations

#### Bulk Update Vendor Scores
```http
PUT /api/vendor-scores/bulk-update
Content-Type: application/json

{
  "updates": [
    {
      "score_id": 1,
      "score": 4,
      "weight": 75
    },
    {
      "score_id": 2,
      "score": 3,
      "weight": 60
    }
  ]
}
```

## Frontend Implementation

### Components

#### VendorScoreEditor
```typescript
interface VendorScoreEditorProps {
  scoreId: number;
  initialData: VendorScore;
  onSave: (data: VendorScore) => void;
  onCancel: () => void;
}
```

#### ObservationEditor
```typescript
interface ObservationEditorProps {
  observations: VendorScoreObservation[];
  onUpdate: (observations: VendorScoreObservation[]) => void;
}
```

#### EvidenceEditor
```typescript
interface EvidenceEditorProps {
  evidenceUrls: string[];
  onUpdate: (urls: string[]) => void;
}
```

### State Management

#### Redux Slice
```typescript
interface VendorScoreState {
  editingScore: VendorScore | null;
  isEditing: boolean;
  loading: boolean;
  error: string | null;
  changes: Partial<VendorScore>;
}
```

### Routes

#### Edit Score Page
```
/vendor-scores/{scoreId}/edit
```

#### Bulk Edit Page
```
/capabilities/{capabilityId}/vendor-scores/edit
```

## Workflow

### Single Score Editing
1. User clicks "Edit" button on vendor score
2. System loads current score data
3. User modifies score, observations, or evidence
4. System validates changes
5. User saves changes
6. System updates database and refreshes UI
7. Audit trail is created

### Bulk Editing
1. User selects multiple scores for editing
2. System loads all selected scores
3. User makes changes to multiple scores
4. System validates all changes
5. User saves changes
6. System performs bulk update
7. Audit trail is created for all changes

## Validation Rules

### Score Validation
- Score must be between 1-5
- Score text must match numerical value
- Weight must be between 1-100
- Score decision cannot be empty

### Observation Validation
- Observation text cannot be empty
- Observation type must be valid enum value
- Maximum 10 observations per score

### Evidence Validation
- URLs must be valid HTTP/HTTPS URLs
- Maximum 20 evidence URLs per score
- Duplicate URLs are not allowed

## Security Considerations

### Authentication
- All edit operations require valid JWT token
- Token expiration handling

### Authorization
- Role-based access control
- Capability-level permissions
- User can only edit assigned capabilities

### Data Integrity
- Input sanitization
- SQL injection prevention
- XSS protection

### Audit Trail
- All changes logged with user ID
- Timestamp tracking
- Change history preservation

## Error Handling

### Validation Errors
- Field-level error messages
- Form-level error summaries
- Real-time validation feedback

### Network Errors
- Retry mechanisms
- Offline state handling
- Error recovery options

### Database Errors
- Transaction rollback
- Constraint violation handling
- Deadlock resolution

## Performance Considerations

### Caching
- Score data caching
- Observation type caching
- URL validation caching

### Optimization
- Lazy loading of large datasets
- Pagination for bulk operations
- Debounced save operations

### Monitoring
- Edit operation metrics
- Performance tracking
- Error rate monitoring

## Testing Strategy

### Unit Tests
- Component rendering
- Form validation
- State management

### Integration Tests
- API endpoint testing
- Database operations
- Authentication flow

### E2E Tests
- Complete edit workflow
- Bulk operations
- Error scenarios

## Future Enhancements

### Planned Features
- **Version Control**: Track score history and rollback capabilities
- **Approval Workflow**: Multi-level approval for score changes
- **Template System**: Predefined observation templates
- **AI Assistance**: AI-powered score suggestions
- **Export/Import**: Bulk score import/export functionality
- **Collaboration**: Multi-user editing with conflict resolution

### Technical Improvements
- **Real-time Updates**: WebSocket-based real-time collaboration
- **Offline Support**: Offline editing with sync capabilities
- **Mobile Optimization**: Mobile-friendly edit interface
- **Advanced Analytics**: Change impact analysis and reporting

## Implementation Status

### ✅ Completed Features
- **Backend API Endpoints**: All vendor score update endpoints implemented
  - `GET /api/capabilities/vendor-scores/{score_id}` - Get single vendor score
  - `PUT /api/capabilities/vendor-scores/{score_id}` - Update vendor score
  - `PUT /api/capabilities/vendor-scores/{score_id}/observations` - Update observations
  - `PUT /api/capabilities/vendor-scores/{score_id}/evidence` - Update evidence URLs
- **Frontend Components**: VendorScoreEditor component created with full CRUD functionality
- **Routing**: Edit page route added (`/vendor-scores/:scoreId/edit`)
- **UI Integration**: Edit buttons added to VendorAnalysis and Reports pages
- **Database Schema**: All necessary tables and relationships in place
- **Type Safety**: TypeScript interfaces and validation implemented

### 🔄 Current Limitations
- **Permission Checks**: Role-based access control needs to be tested in production
- **Data Validation**: Frontend validation could be enhanced with more comprehensive rules
- **Error Handling**: Some edge cases in error handling need to be addressed

### 🚀 Next Steps
1. **Testing**: Test all CRUD operations with real data in staging environment
2. **UI Polish**: Enhance the edit interface with better validation and user feedback
3. **Bulk Operations**: Implement bulk editing capabilities for multiple scores
4. **Audit Trail**: Add change tracking and history for all modifications
5. **Performance**: Optimize API calls and add caching where appropriate
6. **Mobile Support**: Ensure the edit interface works well on mobile devices

### 🎯 Usage Instructions
1. **From Vendor Analysis Page**: Click the edit icon on any vendor score card
2. **From Reports Page**: Click the edit icon in the attribute details dialog
3. **Direct URL**: Navigate to `/vendor-scores/{scoreId}/edit` with a valid score ID
4. **Edit Interface**: Use the comprehensive form to modify scores, observations, evidence, and justification
5. **Save Changes**: Click "Save Changes" to persist modifications to the database 