# Daily Report Frontend

A comprehensive daily and weekly report management system built for CACPM (Cambodia Agricultural Cooperatives Promotion and Marketing). This application provides an intuitive interface for creating, managing, and exporting project reports with hierarchical activities tracking, image management, and multi-format document generation.

## 🎯 Project Overview

The CACPM Daily Report System is a full-stack application designed to streamline construction project reporting. It enables teams to create detailed daily and weekly reports, track construction progress, manage resources, handle QA/QC documentation, and generate professional reports in multiple formats. The system features a modern React frontend, Node.js backend, MongoDB database, and Python-based document generation services.

## ✨ Key Features

### Core Reporting
- **Daily Report Management**: Create comprehensive daily reports with weather tracking, activities, resources, and site photos
- **Weekly Report System**: Advanced weekly reporting with rolling totals, overall progress tracking, and multi-section documentation
- **Bulk Activities Input**: Smart hierarchical parsing system supporting Roman numerals (I, II, III), natural numbers (1, 1.1, 1.1.1), and bullet points with automatic percentage extraction
- **Location-based Reporting**: Track activities across multiple project locations with dynamic filtering

### Document Generation
- **Multi-format Export**: Generate reports in Excel (.xlsx), PDF, and Word (.docx) formats
- **Python Document Service**: Dedicated Flask backend for high-quality document generation with proper formatting
- **Template-based Reports**: Professional report templates with company logos, project information, and standardized layouts
- **Image Integration**: Automatic image embedding in documents with captions and proper sizing

### Data Management
- **MongoDB Storage**: Robust document database for reports, users, projects, and folders
- **Supabase Integration**: Cloud storage for images with automatic CDN delivery and temp-to-permanent file management
- **Real-time Validation**: Built-in validation for activities, percentages, QA/QC data, and resource entries
- **Bulk Import/Export**: Excel-based bulk data import with intelligent parsing and error handling

### User Management & Security
- **Secure Authentication**: HttpOnly cookie-based authentication eliminating XSS risks
- **Role-based Access Control**: Admin, user, and manager roles with appropriate permissions
- **User Profile Management**: Comprehensive profile settings with image upload and account management
- **Session Management**: Secure session handling with automatic token cleanup and device management

### Project Organization
- **Hierarchical Structure**: Folder-based project organization with nested project management
- **Project Dashboard**: Central hub for accessing all reports and project-related activities
- **Resource Tracking**: Detailed tracking of manpower, materials, and machinery with daily/weekly summaries
- **QA/QC Documentation**: Comprehensive quality assurance tracking with NCR, CAR, SCAR, and other inspection types

### Advanced Features
- **Construction Progress Tracking**: Visual progress tracking with planned vs actual comparisons
- **HSE Management**: Health, Safety, and Environment documentation with training, inspections, and permits
- **Issue Tracking**: Construction issue management with photo references and status tracking
- **Purchase Request System**: Material and equipment purchase request workflow
- **Admin Dashboard**: User management, system monitoring, and administrative controls

## 🛠️ Tech Stack

### Frontend Core Framework
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript with full type checking
- **Vite** - Fast build tool and development server with HMR
- **React Router DOM v6** - Client-side routing with nested routes and lazy loading

### UI Components & Styling
- **shadcn/ui** - Reusable UI components built on Radix UI primitives
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Radix UI** - Unstyled, accessible UI components (Accordion, Dialog, Dropdown, etc.)
- **Lucide React** - Beautiful icon library with 1000+ icons
- **Framer Motion** - Production-ready animation library for smooth transitions
- **Sonner** - Elegant toast notification system
- **next-themes** - Theme management with dark mode support

### Data Management & State
- **Supabase** - Backend-as-a-Service for authentication, database, and storage
- **MongoDB** - NoSQL document database for reports, users, and project data
- **TanStack Query (React Query)** - Powerful data fetching and caching library
- **React Hook Form** - Performant form management with minimal re-renders
- **Zod** - TypeScript-first schema validation
- **date-fns** - Modern date utility library

### Backend Integration
- **Node.js Backend** - Express.js REST API with MongoDB
- **Python Backend** - Flask service for document generation (Excel, PDF, Word)
- **Axios** - HTTP client for API requests
- **Cookie-based Auth** - HttpOnly cookies for secure authentication

### Export & Document Generation
- **docx** - Word document generation with formatting support
- **exceljs** - Excel file creation with styling and formulas
- **jspdf** - Client-side PDF generation
- **pdfmake** - Server-side PDF document creation
- **pdf-to-img** - PDF to image conversion for previews
- **file-saver** - Client-side file saving utilities

### Image Processing & Storage
- **Supabase Storage** - Cloud storage with CDN delivery
- **Sharp** - High-performance image processing (backend)
- **Canvas** - Server-side image manipulation and generation
- **Multer** - File upload handling (backend)

### Additional Libraries
- **Recharts** - Data visualization and charting library
- **react-day-picker** - Flexible date picker component
- **react-draggable** - Draggable component library
- **react-resizable-panels** - Resizable panel layouts
- **embla-carousel-react** - Carousel/slider components
- **cmdk** - Command palette for quick navigation
- **input-otp** - One-time password input component
- **vaul** - Drawer/sheet component
- **class-variance-authority** - Utility for component variants
- **clsx & tailwind-merge** - Conditional class name utilities
- **@vercel/speed-insights** - Performance monitoring

## 📁 Project Structure

```
Daily-Report-frontend/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── ui/                 # shadcn/ui components (51 components)
│   │   ├── admin_dashboard/    # Admin-specific components
│   │   ├── car/               # CAR (Corrective Action Request) components
│   │   ├── material_master/    # Material management components
│   │   ├── purchase_request/  # Purchase request components
│   │   ├── reference/         # Reference section components
│   │   └── weekly/             # Weekly report specific components
│   ├── pages/                  # Main page components
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── DailyReport.tsx    # Daily report creation/editing
│   │   ├── WeeklyReport.tsx   # Weekly report creation/editing
│   │   ├── AdminDashboard.tsx # Admin panel
│   │   ├── Profile.tsx        # User profile
│   │   ├── Settings.tsx        # Application settings
│   │   └── PurchaseRequest.tsx # Purchase request form
│   ├── hooks/                  # Custom React hooks (24 hooks)
│   │   ├── useReportForm.ts   # Report form state management
│   │   ├── useDailyReportImages.ts # Image upload management
│   │   ├── useWeeklyReportContent.ts # Weekly report data
│   │   └── useProfile.ts      # User profile management
│   ├── services/               # API service layers
│   │   ├── weeklyReportService.ts # Weekly report API calls
│   │   ├── dailyReportImageService.ts # Image upload API
│   │   └── constructionProgressService.ts # Progress tracking
│   ├── types/                  # TypeScript type definitions (16 files)
│   │   ├── weeklyReport.types.ts # Weekly report types
│   │   ├── report.ts           # Daily report types
│   │   ├── activity.types.ts   # Activity types
│   │   └── qaqc.types.ts       # QA/QC types
│   ├── utils/                  # Utility functions (26 utilities)
│   │   ├── calculationEngine.ts # Progress calculations
│   │   ├── excelImporter.ts    # Excel import logic
│   │   ├── activityValidation.ts # Activity validation
│   │   ├── supabaseStorage.ts  # Supabase storage helpers
│   │   └── imageUtils.ts      # Image processing utilities
│   ├── integrations/           # API integration layers
│   │   ├── reportsApi.ts       # Report API calls
│   │   ├── authApi.ts          # Authentication API
│   │   ├── projectsApi.ts      # Project management API
│   │   └── supabase/           # Supabase-specific integrations
│   ├── contexts/               # React context providers
│   │   ├── ThemeContext.tsx    # Theme management
│   │   └── ProfileContext.tsx  # User profile context
│   ├── config/                 # Application configuration
│   │   └── api.ts              # API endpoints and base URLs
│   ├── constants/              # Constant values
│   │   ├── qaqcSections.ts     # QA/QC section definitions
│   │   └── cambodiaProvinces.ts # Cambodia province data
│   └── lib/                    # Library configurations
│       └── tokenCleanup.ts     # Security token cleanup
├── public/                      # Static assets
│   ├── cacpm_logo.png          # CACPM logo
│   ├── koica_logo.png          # KOICA logo
│   └── favicon.ico             # Site favicon
├── supabase/                    # Supabase configuration
│   └── migrations/             # Database migrations
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── tailwind.config.ts          # Tailwind CSS configuration

Daily-Report-backend/            # Node.js backend
├── src/
│   ├── controllers/            # Request handlers
│   │   ├── authController.js
│   │   ├── dailyReportController.js
│   │   ├── weeklyReportController.js
│   │   └── imageController.js
│   ├── models/                 # MongoDB models
│   │   ├── userModel.js
│   │   ├── dailyReportModel.js
│   │   ├── weeklyReportModel.js
│   │   └── projectModel.js
│   ├── routes/                 # API routes
│   │   ├── authRoutes.js
│   │   ├── dailyReportRoutes.js
│   │   └── weeklyReportRoutes.js
│   ├── services/               # Business logic
│   │   ├── authServices.js
│   │   └── reportServices.js
│   └── middleware/             # Express middleware
│       ├── authMiddleware.js
│       └── errorMiddleware.js
└── .env.example                # Backend environment variables

Daily-Report-Python/             # Python document service
└── files-converter/            # Document generation logic
    ├── daily_report/          # Daily report templates
    └── middleware/            # Processing middleware
```

## 🚀 Getting Started

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **bun** package manager
- **Git** - For version control
- **MongoDB** (local installation or MongoDB Atlas account)
- **Supabase** account (for authentication and storage)
- **Python 3.8+** (for document generation service)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Daily-Report-frontend
```

#### 2. Install Frontend Dependencies

```bash
# Using npm
npm install

# Using bun (faster)
bun install
```

#### 3. Install Backend Dependencies

Navigate to the backend directory:

```bash
cd ../Daily-Report-backend
npm install
```

#### 4. Set Up Python Environment

Navigate to the Python directory:

```bash
cd ../Daily-Report-Python
pip install -r requirements.txt
```

### Environment Setup

#### Frontend Environment Variables

Create a `.env` file in the `Daily-Report-frontend` root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_PYTHON_API_BASE_URL=http://localhost:5001

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Production Override (optional)
VITE_FORCE_PRODUCTION=false
```

#### Backend Environment Variables

Create a `.env` file in the `Daily-Report-backend` root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/cacpm_reports
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cacpm_reports

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
JWT_RESET_SECRET=your-reset-token-secret
JWT_RESET_EXPIRES_IN=10m

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CACPM Support <noreply@cacpm.org>
SUPPORT_EMAIL=CACPM.Mail@gmail.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Development

#### Start Frontend Development Server

```bash
cd Daily-Report-frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Start Backend Server

```bash
cd Daily-Report-backend
npm run dev
```

The backend API will be available at `http://localhost:5000`

#### Start Python Document Service

```bash
cd Daily-Report-Python
python -m flask run --port=5001
```

The Python service will be available at `http://localhost:5001`

### Build

#### Frontend Production Build

```bash
cd Daily-Report-frontend

# Production build
npm run build

# Development build (with dev mode optimizations)
npm run build:dev

# Preview production build locally
npm run preview
```

#### Backend Production Build

```bash
cd Daily-Report-backend
npm run build
```

### Linting

```bash
# Frontend linting
cd Daily-Report-frontend
npm run lint

# Backend linting (if configured)
cd Daily-Report-backend
npm run lint
```

## 📚 Key Documentation

### Implementation Guides
- [Bulk Activities System](./BULK_ACTIVITIES_README.md) - Comprehensive guide to the hierarchical bulk input system with Roman numerals and natural numbers support
- [Frontend-Backend Connection](./FRONTEND_BACKEND_CONNECTION.md) - Complete integration guide for activities data flow between frontend and backend
- [Database Save Implementation](./DATABASE_SAVE_IMPLEMENTATION.md) - Database schema design and save operations for reports and activities
- [Secure Cookie Authentication](./SECURE_COOKIE_AUTH.md) - HttpOnly cookie-based authentication implementation eliminating XSS risks
- [Phase 2 Frontend Integration](./PHASE2_IMPLEMENTATION.md) - Supabase image handling integration replacing Base64 conversion

### Feature Documentation
- [Rolling Totals Date Fix](./ROLLING_TOTALS_DATE_FIX.md) - Date handling fixes for weekly report rolling totals
- [Rolling Totals Location Fix](./ROLLING_TOTALS_LOCATION_FIX.md) - Location-based rolling totals implementation
- [Schema Alignment Update](./SCHEMA_ALIGNMENT_UPDATE.md) - Frontend-backend schema alignment for data consistency
- [Subactivities Removal](./SUBACTIVITIES_REMOVAL.md) - Legacy subactivities structure removal and migration

### Deployment & Operations
- [Render Deployment](./RENDER_DEPLOY.md) - Step-by-step deployment guide for Render platform
- [Bulk Import Backend Update](./BULK_IMPORT_BACKEND_UPDATE.md) - Backend API updates for bulk import functionality
- [Bulk Import Database Fix](./BULK_IMPORT_DATABASE_FIX.md) - Database schema fixes for bulk import operations

### Debugging Guides
- [Database Save Debug Guide](./DATABASE_SAVE_DEBUG_GUIDE.md) - Troubleshooting database save operations
- [Bulk Import Debug Guide](./BULK_IMPORT_DEBUG_GUIDE.md) - Debugging bulk import functionality

## 🏗️ Architecture Overview

### System Architecture

The CACPM Daily Report System follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│              (React + TypeScript + Vite)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Pages   │  │  Components  │  │   Hooks      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                         │
│                 (Node.js + Express)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │ Controllers  │  │ Middleware   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   MongoDB Database      │     │   Supabase Storage      │
│   (Reports, Users,      │     │   (Images, Files)       │
│    Projects, Folders)    │     │                         │
└─────────────────────────┘     └─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Document Generation Service                     │
│                   (Python + Flask)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Excel      │  │     PDF      │  │     Word      │      │
│  │  Generation  │  │  Generation  │  │  Generation  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: User interacts with React frontend
2. **API Request**: Frontend sends HTTP requests to Node.js backend
3. **Authentication**: HttpOnly cookies provide secure authentication
4. **Data Processing**: Backend processes requests with business logic
5. **Database Operations**: MongoDB stores structured data
6. **File Storage**: Supabase stores images and files
7. **Document Generation**: Python service generates formatted documents
8. **Response**: Data returned to frontend for display

### Security Architecture

- **Authentication**: HttpOnly cookie-based JWT authentication
- **Authorization**: Role-based access control (Admin, User, Manager)
- **Data Validation**: Zod schema validation on frontend and backend
- **CORS**: Configured CORS for cross-origin requests
- **Rate Limiting**: Express rate limiter for API protection
- **Input Sanitization**: Protection against injection attacks
- **Secure Headers**: Security headers for HTTP responses

## 🔌 API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Daily Report Endpoints
- `GET /api/daily-reports` - Get all daily reports
- `GET /api/daily-reports/:id` - Get specific daily report
- `POST /api/daily-reports/upsert` - Create or update daily report
- `POST /api/daily-reports/submit` - Submit daily report
- `GET /api/daily-reports/date/:date` - Get report by date
- `POST /api/daily-reports/:reportId/bulk-import` - Bulk import activities

### Weekly Report Endpoints
- `GET /api/weekly-reports` - Get all weekly reports
- `GET /api/weekly-reports/:id` - Get specific weekly report
- `POST /api/weekly-reports` - Create weekly report
- `PUT /api/weekly-reports/:id` - Update weekly report
- `DELETE /api/weekly-reports/:id` - Delete weekly report

### Project Endpoints
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Folder Endpoints
- `GET /api/folders` - Get all folders
- `POST /api/folders` - Create folder
- `GET /api/folders/project/:projectId` - Get folders by project
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Image Endpoints
- `POST /api/images/upload-profile` - Upload profile image
- `POST /api/images/upload-report` - Upload report images
- `DELETE /api/images/:id` - Delete image

## 🌐 Deployment

### Frontend Deployment (Render)

1. **Prepare for Deployment**
   ```bash
   npm run build
   ```

2. **Set Environment Variables in Render**
   - `VITE_API_BASE_URL` - Your backend API URL
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon key

3. **Build Settings**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Node Version: 18.x or higher

See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for detailed instructions.

### Backend Deployment

1. **Deploy to Render/Vercel/Heroku**
   - Set all environment variables from `.env.example`
   - Configure MongoDB connection string
   - Set up Supabase credentials
   - Deploy Node.js application

2. **Database Setup**
   - Create MongoDB Atlas cluster or use local MongoDB
   - Configure connection string in environment variables
   - Run database migrations if needed

### Python Service Deployment

1. **Deploy Python Flask Service**
   - Use Python-compatible hosting (Render, Heroku, Railway)
   - Set up Flask application with Gunicorn
   - Configure port and environment variables

### Production Considerations

- **HTTPS**: Enable SSL/TLS for all services
- **Environment Variables**: Never commit `.env` files
- **Database Backups**: Set up automated MongoDB backups
- **Monitoring**: Implement logging and monitoring
- **Rate Limiting**: Configure appropriate rate limits
- **CORS**: Restrict CORS to allowed domains only
- **Security Headers**: Implement security headers middleware

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login flow
- [ ] Daily report creation and editing
- [ ] Weekly report creation and editing
- [ ] Bulk activities import
- [ ] Image upload and display
- [ ] Document generation (Excel, PDF, Word)
- [ ] Profile management
- [ ] Settings configuration
- [ ] Admin dashboard functionality
- [ ] Logout and session management

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt

# Test protected route
curl -X GET http://localhost:5000/api/daily-reports \
  -b cookies.txt
```

## 🐛 Troubleshooting

### Common Issues

**Issue: Frontend cannot connect to backend**
- Solution: Check that backend is running on correct port (5000)
- Solution: Verify CORS configuration in backend
- Solution: Check API_BASE_URL in frontend .env file

**Issue: Images not uploading**
- Solution: Verify Supabase credentials are correct
- Solution: Check Supabase storage bucket permissions
- Solution: Ensure file size limits are not exceeded

**Issue: Document generation fails**
- Solution: Ensure Python service is running on port 5001
- Solution: Check Python dependencies are installed
- Solution: Verify template files exist

**Issue: Authentication not working**
- Solution: Clear browser cookies and localStorage
- Solution: Verify JWT_SECRET is set in backend
- Solution: Check cookie configuration (httpOnly, secure, sameSite)

**Issue: Build fails**
- Solution: Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Solution: Check Node.js version (should be 18+)
- Solution: Verify all dependencies in package.json

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=true
```

## 📋 Available Scripts

### Frontend Scripts
```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Scripts
```bash
npm start            # Start production server
npm run dev          # Start development server with nodemon
npm test             # Run tests
npm run build        # Build for production
```

## 🌍 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Follow code style guidelines**
   - Use TypeScript for type safety
   - Follow existing component patterns
   - Write meaningful commit messages
5. **Test your changes thoroughly**
6. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
7. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Style Guidelines

- **TypeScript**: Use strict type checking
- **Components**: Use functional components with hooks
- **Styling**: Use Tailwind CSS classes
- **Naming**: Use camelCase for variables, PascalCase for components
- **Comments**: Document complex logic
- **Error Handling**: Implement proper error handling

## 📄 License

This project is proprietary software for CACPM (Cambodia Agricultural Cooperatives Promotion and Marketing). All rights reserved.

## 📞 Support

For support and questions:
- Email: CACPM.Mail@gmail.com
- Documentation: See the [Key Documentation](#-key-documentation) section
- Issues: Report issues through the project issue tracker

## 🎯 Roadmap

### Planned Features
- [ ] Mobile app version (React Native)
- [ ] Offline mode support
- [ ] Advanced analytics dashboard
- [ ] Integration with project management tools
- [ ] Automated report scheduling
- [ ] Multi-language support
- [ ] Advanced search and filtering
- [ ] Real-time collaboration features

### Under Development
- [ ] Enhanced bulk import with Excel templates
- [ ] Improved document templates
- [ ] Performance optimizations
- [ ] Enhanced security features

---

**Built with ❤️ for CACPM**
