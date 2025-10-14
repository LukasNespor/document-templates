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
