import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { Template } from "@/types";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";
const tableName = "WordTemplates";

let tableClient: TableClient;

export function getTableClient(): TableClient {
  if (!tableClient) {
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  }
  return tableClient;
}

export async function ensureTableExists(): Promise<void> {
  const tableClient = getTableClient();
  await tableClient.createTable().catch(() => {
    // Table already exists
  });
}

export async function saveTemplate(template: Template): Promise<void> {
  await ensureTableExists();

  const tableClient = getTableClient();
  const entity = {
    partitionKey: "templates",
    rowKey: template.id,
    name: template.name,
    note: template.note,
    group: template.group,
    blobUrl: template.blobUrl,
    mergeFields: JSON.stringify(template.mergeFields),
    createdAt: template.createdAt,
  };

  await tableClient.upsertEntity(entity);
}

export async function getTemplate(id: string): Promise<Template | null> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("templates", id);
    return {
      id: entity.rowKey as string,
      name: entity.name as string,
      note: entity.note as string,
      group: entity.group as string,
      blobUrl: entity.blobUrl as string,
      mergeFields: JSON.parse(entity.mergeFields as string),
      createdAt: entity.createdAt as string,
    };
  } catch (error) {
    return null;
  }
}

export async function getAllTemplates(): Promise<Template[]> {
  const tableClient = getTableClient();
  const templates: Template[] = [];

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq 'templates'` },
  });

  for await (const entity of entities) {
    templates.push({
      id: entity.rowKey as string,
      name: entity.name as string,
      note: entity.note as string,
      group: entity.group as string,
      blobUrl: entity.blobUrl as string,
      mergeFields: JSON.parse(entity.mergeFields as string),
      createdAt: entity.createdAt as string,
    });
  }

  return templates;
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, "name" | "note" | "group">>
): Promise<void> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("templates", id);
    const updatedEntity = {
      ...entity,
      ...updates,
    };

    await tableClient.updateEntity(updatedEntity, "Merge");
  } catch (error) {
    throw new Error(`Failed to update template: ${error}`);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  const tableClient = getTableClient();

  try {
    await tableClient.deleteEntity("templates", id);
  } catch (error) {
    throw new Error(`Failed to delete template: ${error}`);
  }
}
