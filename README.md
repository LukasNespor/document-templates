# Word Templates

A modern Next.js application for creating Word documents from templates with merge fields. Upload Word templates, organize them by groups, fill in merge fields, and generate customized documents.

## Features

- Upload Word (.docx) templates with merge fields
- Automatic detection of merge fields in templates
- Organize templates by groups with a collapsible sidebar
- Fill in merge field values through an intuitive form
- Generate Word documents with merged data
- Store templates in Azure Blob Storage
- Store metadata in Azure Table Storage
- Responsive design with mobile support
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Azure Storage Account (for Blob and Table Storage)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Azure Storage

You need an Azure Storage Account. If you don't have one:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new Storage Account
3. Get your connection string and account keys from the Storage Account settings

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Azure credentials:

```env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT_NAME;AccountKey=YOUR_ACCOUNT_KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=YOUR_ACCOUNT_NAME
AZURE_STORAGE_ACCOUNT_KEY=YOUR_ACCOUNT_KEY
```

Replace:
- `YOUR_ACCOUNT_NAME` with your Azure Storage account name
- `YOUR_ACCOUNT_KEY` with your Azure Storage account key

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Template

1. Click the "Add Template" button in the top bar
2. Fill in the template details:
   - **Name**: A descriptive name for your template
   - **Group**: Category to organize templates (e.g., "Invoices", "Contracts")
   - **Note**: Optional description or instructions
   - **File**: Upload a .docx file containing merge fields
3. Merge fields should be written as `{fieldName}` in your Word document
4. Click "Upload"

### Generating Documents

1. Select a template from the sidebar
2. Fill in all merge field values in the form
3. Click "Generate Document"
4. The generated Word document will download automatically

## Project Structure

```
word-templates/
├── app/
│   ├── api/
│   │   └── templates/          # API routes
│   │       ├── route.ts        # List templates
│   │       ├── upload/         # Upload templates
│   │       ├── [id]/           # Get template by ID
│   │       └── generate/       # Generate documents
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/
│   ├── TopBar.tsx              # Top navigation bar
│   ├── Sidebar.tsx             # Template sidebar
│   ├── HelpDialog.tsx          # Help modal
│   ├── UploadTemplateDialog.tsx # Upload modal
│   └── TemplateForm.tsx        # Merge field form
├── lib/
│   ├── azure-blob.ts           # Blob Storage utilities
│   ├── azure-table.ts          # Table Storage utilities
│   └── docx-processor.ts       # Word document processing
└── types/
    └── index.ts                # TypeScript types
```

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Azure Blob Storage** - File storage
- **Azure Table Storage** - Metadata storage
- **docxtemplater** - Word document templating
- **pizzip** - ZIP file handling for .docx files

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This application can be deployed to any platform that supports Next.js:

- Vercel
- Azure App Service
- AWS Amplify
- Netlify

Make sure to set the environment variables in your deployment platform.

## License

ISC
