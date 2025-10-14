export interface Template {
  id: string;
  name: string;
  note: string;
  group: string;
  blobUrl: string;
  mergeFields: string[];
  createdAt: string;
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
