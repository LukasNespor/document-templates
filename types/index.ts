export interface Template {
  id: string;
  name: string;
  note: string;
  group: string;
  blobUrl: string;
  mergeFields: string[];
  createdAt: string;
  uploadedBy: string; // User ID who uploaded this template
}

export interface TemplateGroup {
  name: string;
  templates: Template[];
}

export interface MergeFieldValue {
  field: string;
  value: string;
}

export interface BulkGenerateRequest {
  templateId: string;
  csvFile: File;
}

export interface BulkGenerateResponse {
  success: boolean;
  documentsGenerated: number;
  errors?: string[];
}

export interface Statistics {
  currentTemplateCount: number;
  totalTemplatesCreated: number;
  totalFilesGenerated: number;
  totalFieldsFilled: number;
  lastGenerationDate: string | null;
  savedTimeSeconds: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionData {
  userId: string;
  username: string;
  isLoggedIn: boolean;
}
