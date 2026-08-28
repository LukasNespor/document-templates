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

#### Optional: AI-generated field display names

`AI_FIELD_NAMES_ENABLED` controls whether Azure OpenAI is used to turn raw field names into human readable form labels. It defaults to `false`, and only the exact value `true` turns it on.

```env
AI_FIELD_NAMES_ENABLED=false
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE_NAME.openai.azure.com
AZURE_OPENAI_API_KEY=YOUR_API_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

- **Disabled (default)**: no request is made to Azure OpenAI at all. Form fields are labelled with the field name from the template.
- **Enabled**: on template upload and re-upload the application sends the list of field names plus short snippets of the text surrounding each `{{field}}` placeholder (200 characters before and after, overlapping windows merged, 4000 characters in total at most). The full document text is never sent.

Keep this disabled unless the Azure OpenAI resource has modified abuse monitoring approved. Without that exception Microsoft retains prompts for up to 30 days with possible human review, regardless of the resource region.

### 4. Create Your First User

When you first run the application, you'll be redirected to the setup page where you can create the initial admin user through the web interface. This first user will automatically have admin privileges and can manage other users later.

**Important**: Passwords are hashed using bcrypt and cannot be recovered. The hash is one-way encryption, so make sure to remember your password.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

If this is your first time running the application, you'll be redirected to the setup page to create your first admin user. Otherwise, you'll be redirected to the login page.

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

When you first access the application in Docker, you'll be redirected to the setup page where you can create the initial admin user through the web interface. After that, admin users can manage other users through the "Manage Users" button in the application.

## Authentication & Security

The application implements multiple layers of security best practices to protect user accounts and session data.

### Password Security

- **Hashing Algorithm**: Passwords are hashed using bcrypt with 10 salt rounds, providing one-way encryption that cannot be reversed
- **Password Requirements**:
  - Minimum 6 characters
  - Maximum 72 characters (bcrypt limitation)
- **Input Validation**: All authentication inputs are validated using centralized validation rules
- **Secure Storage**: Passwords are never stored in plain text and cannot be recovered

### Session Management

- **Session Library**: Uses iron-session for encrypted, signed session cookies
- **Session Duration**: 7 days with automatic expiration
- **Cookie Security**:
  - `httpOnly: true` - Prevents JavaScript access to cookies (XSS protection)
  - `secure: true` - Cookies only sent over HTTPS in production
  - `sameSite: "lax"` - Protects against CSRF attacks
- **Session Secret**: Required environment variable (`SESSION_SECRET`) must be at least 32 characters. The application will fail to start in production if this is missing or improperly configured.

### Input Validation

- **Username Requirements**: 3-50 characters, alphanumeric with spaces, dots, hyphens, and underscores
- **Automatic Trimming**: Usernames are automatically trimmed to prevent whitespace issues
- **Consistent Validation**: All authentication endpoints use the same centralized validation logic

### Security Features

- **User Enumeration Prevention**: Login errors return generic messages to prevent attackers from discovering valid usernames
- **Rate Limiting & Lockout**: 5 failed attempts within a 15 minute window lock the key for 15 minutes and the endpoint answers with HTTP 429. Attempts are counted separately per username and per client IP address, so one attacker cannot lock out every user by guessing. The check runs before the user is loaded and before bcrypt is called, and the response reveals neither whether the user exists nor how many attempts are left. Applied to `/api/auth/login`, `/api/setup/initialize` and `/api/admin/users/[id]/password`. Counters live in the `DocumentTemplateLoginAttempts` table (keys stored as SHA-256 hashes, never in plain text) so the limit holds across all serverless instances.
- **Secure Logging**: Authentication errors and attempts are logged without exposing sensitive information. Usernames are never written to the log; each entry carries a stable pseudonym instead (HMAC-SHA256 of the lowercased username keyed with `SESSION_SECRET`, shortened to 16 hex characters).
- **Audit Trail**: All authentication attempts are logged with a timestamp, the username pseudonym, the outcome and the reason (including lockouts), so incidents can be reconstructed without the log holding personal data
- **Protected Routes**: All application routes require authentication. Unauthenticated users are redirected to the login page, and API requests return 401 Unauthorized.
- **First-Time Setup**: Initial user is created through a dedicated `/setup` page with automatic admin privileges

### User Storage

User accounts are stored in Azure Table Storage in the `DocumentTemplateUsers` table with the following information:
- User ID (UUID)
- Username
- Password hash (bcrypt)
- Creation timestamp
- Optional salutation
- Admin flag (for role-based access)

### Managing Users

Admin users can manage other users directly through the web interface:

1. Log in as an admin user
2. Click the "Manage Users" button in the top bar
3. From the user management dialog, you can:
   - View all users
   - Create new users (regular or admin)
   - Edit existing users (username, salutation, admin status)
   - Change user passwords
   - Delete users

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
│   ├── auth-errors.ts          # Centralized error handling and secure logging
│   ├── session-config.ts       # Centralized session configuration
│   ├── validation.ts           # Centralized input validation
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

### Vercel Function Region / Region funkcí na Vercelu

The function region is part of the repository configuration, not just a dashboard setting. `vercel.json` pins it:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["fra1"]
}
```

- **Reason**: EU data residency. Routes such as `/api/templates/generate` and `/api/templates/bulk-generate` process user data in memory, so the execution region matters. Azure Blob Storage, Table Storage and Azure OpenAI all live in West Europe, and `fra1` (Frankfurt) is the closest Vercel region.
- **Do not** let the region fall back to the Vercel default `iad1` (Washington, D.C., USA). Removing `regions` from `vercel.json`, or deploying from the CLI with an explicit different region, silently moves processing outside the EU.
- **Verify after every deployment**:

```bash
curl -sI https://<host>/api/setup/check | grep -i x-vercel-id
```

The `x-vercel-id` header must start with `fra1`.

## Data Processing / Zpracování dat

What the application does with the data that passes through it.

### Stored permanently

| Data | Where |
| --- | --- |
| Uploaded .docx template files | Azure Blob Storage, container `document-templates`, one blob per template named `{uuid}.docx` |
| Template metadata: name, group, note, field names, field display names, blob URL, creation time, owner | Azure Table Storage, table `DocumentTemplates`, partitioned per user |
| User accounts: user ID, username, bcrypt password hash, creation time, salutation, admin and bulk-generate flags | Azure Table Storage, table `DocumentTemplateUsers` |
| Usage statistics per user: number of templates created, documents generated, fields filled, last generation date | Azure Table Storage, table `DocumentTemplateStatistics` |
| Failed authentication counters: SHA-256 hash of the username or IP address, attempt count, window start, lockout end | Azure Table Storage, table `DocumentTemplateLoginAttempts` |

A template file is uploaded content, so whatever the user leaves inside the .docx - including text that was not replaced by a `{{field}}` placeholder - is stored in Blob Storage.

### Not stored

- **Generated documents.** Both `/api/templates/generate` and `/api/templates/bulk-generate` build the document in memory and stream it straight to the browser. Nothing is written to Blob Storage, Table Storage or disk.
- **Values filled into the form.** They are sent with the generate request, used to produce the document, and discarded when the request ends. Only the *number* of fields filled reaches the statistics table, never the values.
- **CSV files used for bulk generation.** The uploaded CSV is parsed in memory and discarded with the request.

Form values do persist in the user's own browser for convenience: a draft of the current form in `localStorage` (removed once the document is generated) and previously used values in `sessionStorage` (cleared when the tab is closed). This data never leaves the browser.

### What leaves the application

- **Azure Blob Storage and Azure Table Storage** (West Europe) receive the data listed above.
- **Azure OpenAI** is contacted only when `AI_FIELD_NAMES_ENABLED=true`, and only while a template is being uploaded or re-uploaded. With the flag off, no request is made at all.

  When enabled, the request contains the list of field names from the template plus short snippets of text surrounding each `{{field}}` placeholder: 200 characters before and 200 characters after each occurrence, overlapping snippets merged, 4000 characters of context in total at most. Everything else - the rest of the document body, headers and footers outside those windows, and the file itself - is never sent.

### What is logged and where

Logging goes to the container's stdout and stderr only. The application does not write log files and does not send logs to any external service.

- Authentication attempts: timestamp, username pseudonym (HMAC-SHA256 keyed with `SESSION_SECRET`, 16 hex characters), outcome and reason. The username itself is never logged.
- Bulk generation failures: the CSV row number only. Cell values never appear in a log message, in a response body, or in the `X-Generation-Warnings` response header.
- Unexpected errors: the error object is logged server-side; the client receives a fixed Czech message with no error details.
- Secrets (`AZURE_STORAGE_ACCOUNT_KEY`, `AZURE_OPENAI_API_KEY`, `SESSION_SECRET`, password hashes) are never logged and never returned in a response.

The one place where user input still reaches an HTTP header by design is `Content-Disposition` on document downloads, which carries the filename the user chose. That is inherent to downloading a file.

### Retention

The application itself deletes nothing on a schedule and enforces no log retention. Log retention is a property of the hosting platform, not of this application - on Vercel, runtime logs are kept for 1 hour on the Hobby plan and 1 day on the Pro plan. Data in Blob and Table Storage is kept until it is deleted through the application or directly in Azure.

## License

ISC
