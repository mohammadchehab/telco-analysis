# Telco Capability Analysis System

A modern React web application for managing telco capability research, analysis, and reporting. This system replaces the current CLI-based workflow with a user-friendly interface that makes capability analysis efficient, visual, and accessible to non-technical users.

## 🚀 Features

### Core Features

- **📊 Dashboard**: Overview of all capabilities with status indicators and progress tracking
- **🔍 Capability Management**: Grid/list view of capabilities with filtering and bulk operations
- **⚡ Smart Workflow Engine**: Auto-detect workflow steps and provide clear next actions
- **📝 Research Interface**: Prompt generation, result upload, and validation
- **📈 Analysis & Reports**: Interactive charts, vendor comparisons, and export options
- **🗄️ Database Management**: Import/export data, status monitoring, and health checks

### Key Capabilities

- **Real-time Status Updates**: Live status indicators and progress tracking
- **File Management**: Organized file structure with automatic naming
- **Data Validation**: JSON schema validation with error highlighting
- **Export & Reporting**: Multiple formats (HTML, PDF, Excel) with customization
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Material-UI** for UI components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Recharts** for data visualization

### Backend
- **FastAPI** for Python API
- **SQLite** for database
- **Pydantic** for data validation
- **SQLAlchemy** for database ORM

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd telco-web
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the API server**:
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `web` directory to configure the application:

```bash
# API Configuration
VITE_API_BASE_URL=http://127.0.0.1:8000/api

# Development Configuration
VITE_DEV_SERVER_PORT=5173
```

### API Configuration

The application uses a centralized API configuration located at `src/config/api.ts`. This file contains:

- **Base URL**: Configurable API base URL with environment support
- **Endpoint Definitions**: All API endpoints are defined centrally
- **Request Configuration**: Default headers, timeouts, and other request settings

The configuration automatically adapts to different environments:
- **Development**: Uses `http://127.0.0.1:8000/api` by default
- **Production**: Uses relative paths by default (assumes same domain)

### Customizing API URLs

To change the API URL for different environments:

1. **Development**: Set `VITE_API_BASE_URL` in your `.env` file
2. **Production**: Set `VITE_API_BASE_URL` in your deployment environment
3. **Custom Backend**: Update the `BASE_URL` in `src/config/api.ts`

## 🏗️ Project Structure

```
telco-web/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   └── Layout.tsx          # Main layout with sidebar
│   │   └── UI/
│   │       ├── NotificationSystem.tsx
│   │       └── LoadingOverlay.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   ├── Capabilities.tsx        # Capability management
│   │   ├── Workflow.tsx            # Research workflow
│   │   ├── Analysis.tsx            # Analysis and charts
│   │   ├── Reports.tsx             # Report generation
│   │   └── Database.tsx            # Database management
│   ├── store/
│   │   ├── index.ts                # Redux store configuration
│   │   └── slices/
│   │       ├── capabilitiesSlice.ts
│   │       ├── workflowSlice.ts
│   │       └── uiSlice.ts
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── App.tsx                     # Main app component
│   └── main.tsx                    # App entry point
├── backend/
│   ├── main.py                     # FastAPI application
│   └── requirements.txt            # Python dependencies
├── package.json
└── README.md
```

## 🎯 Usage

### Getting Started

1. **Start both frontend and backend servers**
2. **Navigate to the dashboard** at `http://localhost:5173`
3. **View capability overview** and current status
4. **Start research workflow** by clicking on a capability

### Workflow Process

1. **Initialize Database**: Import source data from Excel files
2. **Review Capabilities**: Check domain structure and attributes
3. **Generate Prompts**: Create research prompts automatically
4. **Conduct Research**: Use MCP tools for capability research
5. **Upload Results**: Validate and process JSON research results
6. **Generate Analysis**: Create charts and reports
7. **Export Reports**: Download in various formats

### Key Features

#### Dashboard
- Overview of all capabilities with status indicators
- Quick action buttons for common tasks
- Recent activity timeline
- Progress tracking

#### Capability Management
- Grid/list view of capabilities
- Status filtering and search
- Bulk operations for multiple capabilities
- Individual capability details

#### Research Workflow
- Step-by-step workflow guidance
- Automatic prompt generation
- File upload and validation
- Progress tracking with checkpoints

#### Analysis & Reports
- Interactive charts and visualizations
- Vendor comparison tools
- Weight management for attributes
- Export options (HTML, PDF, Excel)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
VITE_API_URL=http://localhost:8000

# Backend
DATABASE_PATH=telco_analysis.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Database Configuration

The system uses SQLite by default. The database file (`telco_analysis.db`) will be created automatically when the backend starts.

## 📊 Database Schema

### Capabilities Table
```sql
CREATE TABLE capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Capability Tracker Table
```sql
CREATE TABLE capability_tracker (
    capability_name TEXT PRIMARY KEY,
    review_completed BOOLEAN DEFAULT FALSE,
    comprehensive_ready BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

### Vendor Scores Table
```sql
CREATE TABLE vendor_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capability_name TEXT NOT NULL,
    attribute_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    weight INTEGER DEFAULT 50,
    score TEXT NOT NULL,
    score_numeric INTEGER NOT NULL,
    observation TEXT,
    evidence_url TEXT,
    score_decision TEXT,
    research_type TEXT DEFAULT 'capability_research',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Frontend Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server

### Backend Deployment

1. **Install production dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Use a production ASGI server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Docker Deployment

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
      
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation at `http://localhost:8000/docs`

## 🔄 Migration from CLI

This web application replaces the existing CLI-based workflow. Key improvements:

- **Visual Interface**: No more command-line complexity
- **State Tracking**: Clear progress indicators and status
- **File Management**: Automatic organization and naming
- **Error Handling**: User-friendly error messages and suggestions
- **Smart Resumption**: Resume workflows from any point

The system maintains compatibility with existing data formats and can import/export data from the CLI system.
