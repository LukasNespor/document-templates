# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for creating Word documents from templates with field placeholders. The application requires user authentication. Users can upload Word (.docx) templates containing field placeholders in the format `{{field name}}`, organize them by groups, fill in values through a form, and generate customized Word documents.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Setup

Required environment variables (copy from .env.example to .env):

- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string for Blob Storage
- `AZURE_STORAGE_ACCOUNT_NAME` - Azure Storage account name for Table Storage
- `AZURE_STORAGE_ACCOUNT_KEY` - Azure Storage account key for Table Storage
- `SESSION_SECRET` - Secret key for encrypting session cookies (at least 32 characters)

The application will not function without valid Azure Storage credentials and session secret.

### Creating Users

Users can be created using the provided script:

```bash
npx tsx scripts/create-user.ts <username> <password>
```

Example: `npx tsx scripts/create-user.ts admin MySecurePassword123`

Passwords are hashed using bcrypt (one-way encryption) and cannot be recovered.

## Architecture

### Data Flow

1. **Authentication**: User logs in with username/password → Credentials verified → Session created with encrypted cookie
2. **Template Upload**: User uploads .docx file → API extracts `{{field}}` placeholders → File stored in Azure Blob Storage → Metadata stored in Azure Table Storage
3. **Document Generation**: User selects template → Fills field values form → API downloads template from Blob Storage → Replaces `{{field}}` placeholders with user values → Returns generated .docx

### Storage Architecture

- **Azure Blob Storage**: Stores actual .docx template files in container named "document-templates"
- **Azure Table Storage**:
  - `DocumentTemplates` table: Stores template metadata with partition key as userId and row key as template ID (provides optimal query performance and natural data isolation per user)
  - `DocumentTemplateUsers` table: Stores user accounts with partition key "users" and row key as user ID
  - `DocumentTemplateStatistics` table: Stores user statistics with partition key "statistics" and row key as user ID

### Core Libraries

The application's core functionality is built around key modules in the `lib/` directory:

- **auth.ts**: Authentication utilities
  - `hashPassword()`: Hashes passwords using bcrypt (one-way, 10 salt rounds)
  - `verifyPassword()`: Verifies password against stored hash
  - `getSession()`: Gets current session using iron-session
  - `isAuthenticated()`: Checks if user is logged in
  - `getCurrentUser()`: Gets current user from session
- **session-config.ts**: Centralized session configuration
  - `sessionOptions`: Unified session configuration for iron-session used across the application
  - Validates SESSION_SECRET in production (fails fast if missing)
  - Warns if SESSION_SECRET is less than 32 characters
  - Configures secure cookies with httpOnly, sameSite, and 7-day expiration
- **validation.ts**: Centralized input validation
  - `validateUsername()`: Validates username format and length (3-50 characters, alphanumeric with spaces, dots, hyphens, underscores)
  - `validatePassword()`: Validates password format and length (6-72 characters)
  - `validateCredentials()`: Validates both username and password
  - Provides consistent validation rules across login, setup, and user management
- **auth-errors.ts**: Centralized error handling and secure logging
  - `AUTH_ERRORS`: Standard error messages in Czech (prevents user enumeration)
  - `logAuthError()`: Safely logs errors without exposing sensitive information
  - `logAuthAttempt()`: Logs authentication attempts for security monitoring
  - `createAuthErrorResponse()`: Creates safe error responses for authentication failures
- **azure-users.ts**: User management in Azure Table Storage
  - `saveUser()`: Saves user to DocumentTemplateUsers table
  - `getUserByUsername()`: Retrieves user by username
  - `getUserById()`: Retrieves user by ID
  - `updateUser()`: Updates user information
  - `getAllUsers()`: Retrieves all users
  - `deleteUser()`: Deletes a user
  - `hasAnyUser()`: Checks if any user exists (for initial setup)
- **azure-blob.ts**: Manages Blob Storage operations (upload/download .docx files)
- **azure-table.ts**: Manages Table Storage operations (save/retrieve template metadata)
- **docx-processor.ts**: Handles Word document processing using pizzip
  - `extractMergeFields()`: Parses .docx XML to find all `{{field name}}` placeholders
  - `generateDocument()`: Replaces `{{field}}` placeholders with values (case-insensitive matching)

### API Routes

Authentication routes in `app/api/auth/`:

- `POST /api/auth/login` - Login with username/password (creates session)
- `POST /api/auth/logout` - Logout (destroys session)
- `GET /api/auth/session` - Check current session status

Template routes in `app/api/templates/` (all require authentication):

- `GET /api/templates` - List all templates (fetches from Azure Table Storage)
- `POST /api/templates/upload` - Upload new template (saves to both Blob and Table Storage)
- `GET /api/templates/[id]` - Get single template by ID
- `POST /api/templates/generate` - Generate document from template with merge field values

### Authentication Middleware

The application uses Next.js middleware (`middleware.ts`) to protect all routes except `/login` and `/api/auth/login`. Unauthenticated users are redirected to the login page. API routes return 401 Unauthorized if accessed without a valid session.

### Component Structure

- **app/page.tsx**: Main page (protected) orchestrates the entire application state, template selection, and user session
- **app/login/page.tsx**: Login page with username/password form
- **TopBar.tsx**: Navigation bar with upload, help, username display, and logout buttons
- **Sidebar.tsx**: Collapsible sidebar displaying templates grouped by category
- **UploadTemplateDialog.tsx**: Modal for uploading new templates
- **TemplateForm.tsx**: Dynamic form for filling merge field values
- **HelpDialog.tsx**: Help documentation modal

### TypeScript Types

All shared types are defined in `types/index.ts`:

- `Template`: Represents a template with metadata and merge fields
- `TemplateGroup`: Groups templates by category for sidebar organization
- `MergeFieldValue`: Key-value pair for merge field data
- `User`: User account with username and password hash
- `SessionData`: Session information (userId, username, isLoggedIn)

## Key Technical Details

### Field Placeholder Format

- Field placeholders in Word documents use double curly brace syntax: `{{field name}}`
- Users simply type `{{field name}}` directly in their Word documents (no special Word fields required)
- Field names support spaces and special characters (e.g., `{{Č.J.}}`, `{{Full Name}}`)
- Field matching is **case-insensitive** (`{{Name}}` = `{{name}}` = `{{NAME}}`)
- System field `{{dnes}}` is automatically populated with current date in Czech format (e.g., "14. října 2025")
- Field names are extracted by parsing the document XML for `{{...}}` patterns
- All unique fields (except `{{dnes}}`) are stored in the `fields` column in Azure Table Storage

### Azure Storage Naming

- Blob Storage container: `document-templates` (auto-created if not exists)
- Table Storage tables:
  - `DocumentTemplates` (auto-created if not exists) - Template metadata
  - `DocumentTemplateUsers` (auto-created if not exists) - User accounts
  - `DocumentTemplateStatistics` (auto-created if not exists) - User statistics
- Template files are named with UUID: `{uuid}.docx`
- User IDs are UUIDs

### Error Handling

- Invalid .docx files return 400 error during upload
- Missing Azure credentials will cause runtime errors (no graceful fallback)
- API errors are logged to console and return JSON error responses
- Unauthenticated requests are redirected to login or return 401 status

### Authentication & Security

The application implements multiple layers of security best practices:

#### Password Security
- **Hashing Algorithm**: Uses bcrypt with 10 salt rounds for one-way password hashing
- **Password Requirements**: Minimum 6 characters, maximum 72 characters (bcrypt limitation)
- **Secure Storage**: Passwords are never stored in plain text and cannot be recovered
- **Validation**: Centralized validation prevents weak passwords and ensures consistent rules

#### Session Management
- **Session Library**: Uses iron-session for encrypted, signed session cookies
- **Session Duration**: 7 days with automatic expiration
- **Cookie Security**:
  - `httpOnly: true` - Prevents JavaScript access to cookies
  - `secure: true` (production) - Ensures cookies only sent over HTTPS
  - `sameSite: "lax"` - Protects against CSRF attacks
- **Session Secret**:
  - Required in production (application fails fast if missing)
  - Minimum 32 characters recommended
  - Centralized configuration prevents duplication
- **Session Configuration**: Unified session options in `lib/session-config.ts` used consistently across `lib/auth.ts` and `middleware.ts`

#### Input Validation
- **Centralized Validation**: All authentication inputs validated through `lib/validation.ts`
- **Username Requirements**: 3-50 characters, alphanumeric with spaces, dots, hyphens, underscores
- **Consistent Rules**: Same validation applied in login, setup, and user creation scripts
- **Trimming**: Usernames automatically trimmed to prevent whitespace issues

#### Error Handling & Logging
- **Generic Error Messages**: Returns same error message for invalid username or password to prevent user enumeration
- **Secure Logging**: Logs authentication errors without exposing sensitive information
- **Audit Trail**: All authentication attempts logged with timestamp, username, and outcome
- **Centralized Error Management**: All error messages defined in `lib/auth-errors.ts`

#### Route Protection
- **Middleware Protection**: All routes protected except `/login`, `/setup`, and `/api/auth/login`
- **Session Validation**: Every request checks for valid session before granting access
- **API Security**: Unauthenticated API requests return 401 Unauthorized
- **Page Security**: Unauthenticated page requests redirect to login or setup

#### User Management
- **No Admin UI**: User management intentionally done via CLI script (`scripts/create-user.ts`) or direct Azure Table Storage access
- **First User Setup**: Initial user created through `/setup` page with automatic admin privileges
- **Role-Based Access**: Support for admin flag (stored in session and Azure Table Storage)
