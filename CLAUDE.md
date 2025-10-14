# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for creating Word documents from templates with field placeholders. Users can upload Word (.docx) templates containing field placeholders in the format `{{field name}}`, organize them by groups, fill in values through a form, and generate customized Word documents.

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

The application will not function without valid Azure Storage credentials.

## Architecture

### Data Flow

1. **Template Upload**: User uploads .docx file → API extracts `{{field}}` placeholders → File stored in Azure Blob Storage → Metadata stored in Azure Table Storage
2. **Document Generation**: User selects template → Fills field values form → API downloads template from Blob Storage → Replaces `{{field}}` placeholders with user values → Returns generated .docx

### Storage Architecture

- **Azure Blob Storage**: Stores actual .docx template files in container named "word-templates"
- **Azure Table Storage**: Stores template metadata in table named "WordTemplates" with partition key "templates" and row key as template ID

### Core Libraries

The application's core functionality is built around three key modules in the `lib/` directory:

- **azure-blob.ts**: Manages Blob Storage operations (upload/download .docx files)
- **azure-table.ts**: Manages Table Storage operations (save/retrieve template metadata)
- **docx-processor.ts**: Handles Word document processing using pizzip
  - `extractMergeFields()`: Parses .docx XML to find all `{{field name}}` placeholders
  - `generateDocument()`: Replaces `{{field}}` placeholders with values (case-insensitive matching)

### API Routes

All API routes are in `app/api/templates/`:

- `GET /api/templates` - List all templates (fetches from Azure Table Storage)
- `POST /api/templates/upload` - Upload new template (saves to both Blob and Table Storage)
- `GET /api/templates/[id]` - Get single template by ID
- `POST /api/templates/generate` - Generate document from template with merge field values

### Component Structure

- **app/page.tsx**: Main page orchestrates the entire application state and template selection
- **TopBar.tsx**: Navigation bar with upload and help buttons
- **Sidebar.tsx**: Collapsible sidebar displaying templates grouped by category
- **UploadTemplateDialog.tsx**: Modal for uploading new templates
- **TemplateForm.tsx**: Dynamic form for filling merge field values
- **HelpDialog.tsx**: Help documentation modal

### TypeScript Types

All shared types are defined in `types/index.ts`:

- `Template`: Represents a template with metadata and merge fields
- `TemplateGroup`: Groups templates by category for sidebar organization
- `MergeFieldValue`: Key-value pair for merge field data

## Key Technical Details

### Field Placeholder Format

- Field placeholders in Word documents use double curly brace syntax: `{{field name}}`
- Users simply type `{{field name}}` directly in their Word documents (no special Word fields required)
- Field names support spaces and special characters (e.g., `{{Č.J.}}`, `{{Full Name}}`)
- Field matching is **case-insensitive** (`{{Name}}` = `{{name}}` = `{{NAME}}`)
- System field `{{dnes}}` is automatically populated with current date in Czech format (e.g., "14. října 2025")
- Field names are extracted by parsing the document XML for `{{...}}` patterns
- All unique fields (except `{{dnes}}`) are stored in the `mergeFields` array in Azure Table Storage

### Azure Storage Naming

- Blob Storage container: `word-templates` (auto-created if not exists)
- Table Storage table: `WordTemplates` (auto-created if not exists)
- Template files are named with UUID: `{uuid}.docx`

### Error Handling

- Invalid .docx files return 400 error during upload
- Missing Azure credentials will cause runtime errors (no graceful fallback)
- API errors are logged to console and return JSON error responses
