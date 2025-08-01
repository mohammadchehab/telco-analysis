# Telco Capability Analysis System

A comprehensive web application for managing telco capability research, analysis, and reporting. This system replaces the previous CLI-based workflow with a modern, user-friendly interface while maintaining the exact same database structure, workflow logic, and business rules.

## 🚀 Features

### Core Capabilities
- **Smart Workflow Engine** - Auto-detects capability state and routes to appropriate research steps
- **Capability Management** - Grid view with status indicators and bulk operations
- **Research Interface** - Generate prompts, upload results, and validate data
- **Analysis & Reports** - Interactive charts and export capabilities
- **Database Integration** - Seamless integration with existing SQLite database

### Workflow States
- 🟢 **Ready for Research** - Capability ready for comprehensive analysis
- 🟡 **Review Required** - Needs domain analysis review
- 🔴 **Domain Analysis** - Requires initial domain framework analysis
- ✅ **Completed** - Full analysis completed

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Material-UI** for modern, responsive UI components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Vite** for fast development and building

### Backend (FastAPI + Python)
- **FastAPI** for high-performance API
- **SQLite** with existing database schema
- **Pydantic** for data validation
- **SQLAlchemy** for database operations

### Database Schema
```sql
-- Core tables (preserved from existing system)
CREATE TABLE capabilities (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT NOT NULL
);

CREATE TABLE domains (
    id INTEGER PRIMARY KEY,
    capability_id INTEGER NOT NULL,
    domain_name TEXT NOT NULL,
    FOREIGN KEY (capability_id) REFERENCES capabilities (id) ON DELETE CASCADE,
    UNIQUE(capability_id, domain_name)
);

CREATE TABLE attributes (
    id INTEGER PRIMARY KEY,
    capability_id INTEGER NOT NULL,
    domain_name TEXT NOT NULL,
    attribute_name TEXT NOT NULL,
    definition TEXT,
    tm_forum_mapping TEXT,
    importance TEXT,
    FOREIGN KEY (capability_id) REFERENCES capabilities (id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id, domain_name) REFERENCES domains (capability_id, domain_name) ON DELETE CASCADE,
    UNIQUE(capability_id, domain_name, attribute_name)
);

-- Enhanced vendor_scores table
CREATE TABLE vendor_scores (
    id INTEGER PRIMARY KEY,
    capability_id INTEGER NOT NULL,
    attribute_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    weight INTEGER DEFAULT 50,                    -- Attribute weight (1-100)
    score TEXT NOT NULL,
    score_numeric INTEGER NOT NULL,
    observation TEXT NOT NULL,                    -- JSON array as string
    evidence_url TEXT NOT NULL,                   -- JSON array as string
    score_decision TEXT NOT NULL,
    research_type TEXT DEFAULT 'capability_research',
    research_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (capability_id) REFERENCES capabilities (id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id, attribute_name) REFERENCES attributes (capability_id, attribute_name) ON DELETE CASCADE,
    UNIQUE(capability_id, attribute_name, vendor)
);

-- Workflow state management
CREATE TABLE capability_tracker (
    capability_name TEXT PRIMARY KEY,
    review_completed BOOLEAN DEFAULT FALSE,
    comprehensive_ready BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- Git

### Quick Start
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telco-web
   ```

2. **Start the application**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Installation

#### Frontend Setup
```bash
cd web
npm install
npm run dev
```

#### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
DATABASE_URL=sqlite:///telco_analysis.db
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Database Configuration
The system uses the existing SQLite database. To initialize with sample data:
```bash
cd backend
python3 -c "from main import init_db; init_db()"
```

## 📖 Usage Guide

### 1. Capability Management

#### View Capabilities
- Navigate to the **Capabilities** page
- View all capabilities in a grid layout with status indicators
- Use filters to search by name, status, or domain
- Select multiple capabilities for bulk operations

#### Start Research Workflow
1. Click the **Start Research** button on a capability card
2. The system auto-detects the appropriate workflow step
3. Follow the guided workflow process

### 2. Research Workflow

#### Step 1: Generate Research Prompt
- Select research type (Domain Analysis or Comprehensive Research)
- Click **Generate Prompt** to create a tailored research prompt
- Download or view the generated prompt

#### Step 2: Upload Research Results
- Prepare JSON file with research results
- Select the file and expected result type
- Upload and validate the data structure
- Review validation results and fix any errors

#### Step 3: Process Results
- Click **Process Results** to update the database
- View processing summary and next steps
- Results are automatically saved to the database

### 3. Analysis & Reports

#### View Analysis
- Navigate to the **Analysis** page for a specific capability
- View interactive charts and vendor comparisons
- Analyze weight-based scoring and evidence

#### Generate Reports
- Export data in multiple formats (HTML, PDF, Excel)
- Customize report content and styling
- Include charts and raw data as needed

## 🔌 API Reference

### Core Endpoints

#### Capabilities
```http
GET /api/capabilities
GET /api/capabilities/{name}
GET /api/capabilities/{name}/status
PATCH /api/capabilities/{name}/status
GET /api/capabilities/{name}/vendor-scores
```

#### Workflow
```http
POST /api/capabilities/{name}/start-research
POST /api/capabilities/{name}/workflow/initialize
POST /api/capabilities/{name}/workflow/generate-prompt
POST /api/capabilities/{name}/workflow/upload
POST /api/capabilities/{name}/workflow/validate
POST /api/capabilities/{name}/workflow/process-domain
POST /api/capabilities/{name}/workflow/process-comprehensive
```

### Data Formats

#### Domain Analysis Response
```json
{
  "capability": "string",
  "analysis_date": "YYYY-MM-DD",
  "capability_status": "existing|missing",
  "current_framework": {
    "domains_count": 0,
    "attributes_count": 0,
    "domains": []
  },
  "gap_analysis": {
    "missing_domains": [...],
    "missing_attributes": [...]
  },
  "market_research": {
    "major_vendors": [],
    "industry_standards": [],
    "competitive_analysis": "string"
  },
  "recommendations": {
    "priority_domains": [],
    "priority_attributes": [],
    "framework_completeness": "complete|needs_minor_updates|needs_major_updates",
    "next_steps": "string"
  }
}
```

#### Comprehensive Research Response
```json
{
  "capability": "string",
  "research_date": "YYYY-MM-DD",
  "market_analysis": {
    "primary_vendors": [],
    "missing_capabilities": [...]
  },
  "attributes": [
    {
      "attribute": "string",
      "weight": 50,
      "tm_capability": "string",
      "comarch": {
        "score": "X - Level",
        "observation": ["point1", "point2", "point3", "point4"],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "servicenow": {...},
      "salesforce": {...}
    }
  ]
}
```

## 🧪 Development

### Project Structure
```
telco-web/
├── web/                    # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store and slices
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   ├── package.json
│   └── vite.config.ts
├── backend/               # FastAPI backend
│   ├── main.py           # Main API application
│   ├── requirements.txt  # Python dependencies
│   └── telco_analysis.db # SQLite database
├── start.sh              # Development startup script
└── README.md
```

### Development Commands

#### Frontend
```bash
cd web
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend
```bash
cd backend
source .venv/bin/activate
python3 main.py      # Start development server
pytest               # Run tests (when implemented)
```

### Adding New Features

#### Frontend Components
1. Create component in `web/src/components/`
2. Add TypeScript types in `web/src/types/`
3. Update Redux store if needed
4. Add routing in `web/src/App.tsx`

#### Backend Endpoints
1. Add endpoint in `backend/main.py`
2. Define Pydantic models for request/response
3. Update database schema if needed
4. Add tests (when implemented)

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Production Deployment
1. Build frontend: `cd web && npm run build`
2. Set up production backend with proper environment variables
3. Configure reverse proxy (Nginx) for static files and API
4. Set up SSL certificates
5. Configure database backups

## 📊 Monitoring & Analytics

### Performance Metrics
- **Page Load Times** - Target: < 2 seconds
- **API Response Times** - Target: < 500ms
- **Database Performance** - Monitor query execution times
- **Error Rates** - Target: < 1% API failures

### Success Metrics
- **Workflow Completion Rate** - % of capabilities that complete full workflow
- **Error Reduction** - Fewer failed research attempts
- **Time Savings** - Faster research completion
- **User Satisfaction** - Feedback scores

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Create a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use Material-UI components consistently
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

#### Backend Won't Start
- Check Python version (3.8+ required)
- Verify virtual environment is activated
- Check if all dependencies are installed
- Review error logs in terminal

#### Frontend Won't Load
- Check Node.js version (18+ required)
- Verify all npm packages are installed
- Check browser console for errors
- Ensure backend is running on port 8000

#### Database Issues
- Verify database file exists in backend directory
- Check file permissions
- Run database initialization: `python3 -c "from main import init_db; init_db()"`

### Getting Help
- Check the API documentation at http://localhost:8000/docs
- Review the browser console for frontend errors
- Check the backend terminal for server logs
- Create an issue with detailed error information

## 🔄 Migration from CLI System

### Data Migration
The web application uses the same database schema as the CLI system. To migrate:

1. **Backup existing database**
   ```bash
   cp your_existing_db.sqlite backend/telco_analysis.db
   ```

2. **Verify data integrity**
   ```bash
   cd backend
   python3 -c "import sqlite3; conn = sqlite3.connect('telco_analysis.db'); print('Tables:', [row[0] for row in conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"')])"
   ```

3. **Start the web application**
   ```bash
   ./start.sh
   ```

### Workflow Migration
- The web interface replicates all CLI workflow steps
- Research prompts are generated using the same logic
- JSON validation ensures data consistency
- All existing data and relationships are preserved

---

**Built with ❤️ for telco capability analysis** 