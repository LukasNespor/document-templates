# Document Templates

A modern Next.js application for creating Word documents from templates with field placeholders. Upload Word templates, organize them by groups, fill in field values, and generate customized documents.

## Features

- **User Authentication**: Secure login with username and password
- Upload Word (.docx) templates with `{{field name}}` placeholders
- Automatic detection of field placeholders in templates
- Organize templates by groups with a collapsible sidebar
- Fill in field values through an intuitive form
- Generate Word documents with merged data
- Store templates in Azure Blob Storage
- Store metadata in Azure Table Storage
- Responsive design with mobile support
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js 24 or higher
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
SESSION_SECRET=your_generated_secret_here
```

Replace:
- `YOUR_ACCOUNT_NAME` with your Azure Storage account name
- `YOUR_ACCOUNT_KEY` with your Azure Storage account key
- `SESSION_SECRET` with a secure random string (at least 32 characters)

To generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create Your First User

Since there's no admin UI yet, use the provided script to create a user:

```bash
npx tsx scripts/create-user.ts <username> <password>
```

Example:
```bash
npx tsx scripts/create-user.ts admin MySecurePassword123
```

**Important**: Passwords are hashed using bcrypt and cannot be recovered. The hash is one-way encryption, so make sure to remember your password.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The application will redirect you to the login page. Use the credentials you created in step 4.

## Running with Docker

### Using Docker Compose (Recommended)

The easiest way to run the application with Docker:

1. Make sure you have [Docker](https://www.docker.com/get-started) and Docker Compose installed
2. Set up your `.env` file with Azure credentials (see step 3 above)
3. Build and run the container:

```bash
docker-compose up -d
```

The application will be available at [http://localhost:3000](http://localhost:3000).

To stop the container:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

### Using Docker Directly

You can also build and run the Docker image directly:

```bash
# Build the image
docker build -t document-templates .

# Run the container
docker run -d \
  -p 3000:3000 \
  --name document-templates \
  --env-file .env \
  document-templates
```

### Creating Users in Docker

To create a user when running in Docker:

```bash
# If using docker-compose
docker-compose exec document-templates npx tsx scripts/create-user.ts <username> <password>

# If using docker run
docker exec -it document-templates npx tsx scripts/create-user.ts <username> <password>
```

## Authentication & Security

### How Authentication Works

- **Secure Password Storage**: Passwords are hashed using bcrypt with 10 salt rounds. The hash is a one-way encryption that cannot be reversed to retrieve the original password.
- **Session Management**: User sessions are secured using iron-session with encrypted cookies.
- **Protected Routes**: All application routes require authentication. Unauthenticated users are redirected to the login page.
- **User Storage**: User accounts are stored in Azure Table Storage in a dedicated `DocumentTemplateUsers` table.

### Managing Users

To create additional users, use the create-user script:

```bash
npx tsx scripts/create-user.ts <username> <password>
```

Note: There is no admin UI for user management yet. You'll need to use this script or directly access Azure Table Storage to manage users.

## Usage

### Creating a Template

1. Click the "Add Template" button in the top bar
2. Fill in the template details:
   - **Name**: A descriptive name for your template
   - **Group**: Category to organize templates (e.g., "Invoices", "Contracts")
   - **Note**: Optional description or instructions
   - **File**: Upload a .docx file containing field placeholders
3. Field placeholders should be written as `{{field name}}` in your Word document
   - Example: `{{Name}}`, `{{Invoice Number}}`, `{{Date}}`
   - Field names are case-insensitive (`{{Name}}` = `{{name}}`)
   - Special field: `{{dnes}}` is automatically filled with current date in Czech format
4. Click "Upload"

### Generating Documents

1. Select a template from the sidebar
2. Fill in all field values in the form
3. Click "Generate Document"
4. The generated Word document will download automatically

## Project Structure

```
document-templates/
├── app/
│   ├── api/
│   │   ├── auth/               # Authentication API routes
│   │   │   ├── login/          # Login endpoint
│   │   │   ├── logout/         # Logout endpoint
│   │   │   └── session/        # Session check endpoint
│   │   └── templates/          # Template API routes
│   │       ├── route.ts        # List templates
│   │       ├── upload/         # Upload templates
│   │       ├── [id]/           # Get template by ID
│   │       └── generate/       # Generate documents
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page (protected)
├── components/
│   ├── TopBar.tsx              # Top navigation bar with logout
│   ├── Sidebar.tsx             # Template sidebar
│   ├── HelpDialog.tsx          # Help modal
│   ├── UploadTemplateDialog.tsx # Upload modal
│   └── TemplateForm.tsx        # Field value form
├── lib/
│   ├── auth.ts                 # Authentication utilities (bcrypt, sessions)
│   ├── azure-blob.ts           # Blob Storage utilities
│   ├── azure-table.ts          # Table Storage utilities
│   ├── azure-users.ts          # User management in Table Storage
│   └── docx-processor.ts       # Word document processing
├── scripts/
│   └── create-user.ts          # User creation script
├── types/
│   └── index.ts                # TypeScript types
└── middleware.ts               # Authentication middleware
```

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Azure Blob Storage** - File storage
- **Azure Table Storage** - Metadata and user storage
- **bcrypt** - Secure password hashing
- **iron-session** - Encrypted session management
- **docxtemplater** - Word document templating
- **pizzip** - ZIP file handling for .docx files

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This application can be deployed to any platform that supports Next.js or Docker:

**Next.js Platforms:**
- Vercel
- Netlify
- AWS Amplify

**Docker/Container Platforms:**
- Azure App Service (with Docker)
- AWS ECS/Fargate
- Google Cloud Run
- Any VPS with Docker support

Make sure to set the environment variables in your deployment platform.

## License

ISC
