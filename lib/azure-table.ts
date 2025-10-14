import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { Template } from "@/types";

const tableName = "DocumentTemplates";

let tableClient: TableClient;

export function getTableClient(): TableClient {
  if (!tableClient) {
    // Read environment variables when the function is called, not at module load time
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";

    if (!accountName || !accountKey) {
      console.error("Azure Storage credentials not configured!", {
        hasAccountName: !!accountName,
        hasAccountKey: !!accountKey,
      });
      throw new Error("Azure Storage credentials not configured");
    }

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
  try {
    await tableClient.createTable();
  } catch (error: any) {
    // Only ignore "table already exists" errors
    if (error?.statusCode === 409 || error?.message?.includes("TableAlreadyExists")) {
      // Table already exists, continue
    } else {
      console.error("Failed to create templates table:", {
        statusCode: error?.statusCode,
        message: error?.message,
        details: error?.details,
        code: error?.code,
      });
      throw error;
    }
  }
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
    fields: JSON.stringify(template.fields),
    createdAt: template.createdAt,
    uploadedBy: template.uploadedBy,
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
      fields: JSON.parse(entity.fields as string),
      createdAt: entity.createdAt as string,
      uploadedBy: entity.uploadedBy as string,
    };
  } catch (error) {
    return null;
  }
}

export async function getAllTemplates(): Promise<Template[]> {
  await ensureTableExists();
  const tableClient = getTableClient();
  const templates: Template[] = [];

  try {
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
        fields: JSON.parse(entity.fields as string),
        createdAt: entity.createdAt as string,
        uploadedBy: entity.uploadedBy as string,
      });
    }
  } catch (error: any) {
    // If table doesn't exist, just return empty array
    if (error?.statusCode === 404) {
      return [];
    }
    throw error;
  }

  return templates;
}

export async function getTemplatesByUser(userId: string): Promise<Template[]> {
  await ensureTableExists();
  const tableClient = getTableClient();
  const templates: Template[] = [];

  try {
    const entities = tableClient.listEntities({
      queryOptions: { filter: `PartitionKey eq 'templates' and uploadedBy eq '${userId}'` },
    });

    for await (const entity of entities) {
      templates.push({
        id: entity.rowKey as string,
        name: entity.name as string,
        note: entity.note as string,
        group: entity.group as string,
        blobUrl: entity.blobUrl as string,
        fields: JSON.parse(entity.fields as string),
        createdAt: entity.createdAt as string,
        uploadedBy: entity.uploadedBy as string,
      });
    }
  } catch (error: any) {
    // If table doesn't exist, just return empty array
    if (error?.statusCode === 404) {
      return [];
    }
    throw error;
  }

  return templates;
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, "name" | "note" | "group" | "fields" | "blobUrl">>
): Promise<void> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("templates", id);
    const updatedEntity: any = {
      ...entity,
      ...updates,
    };

    // Stringify fields if it's being updated
    if (updates.fields) {
      updatedEntity.fields = JSON.stringify(updates.fields);
    }

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
