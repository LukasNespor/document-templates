import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { Template } from "@/types";

const tableName = "DocumentTemplates";

let tableClient: TableClient;
let tableExistsPromise: Promise<void> | null = null;

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
  // Cache the promise so we only check once per serverless function instance
  if (!tableExistsPromise) {
    tableExistsPromise = (async () => {
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
    })();
  }
  return tableExistsPromise;
}

export async function saveTemplate(template: Template): Promise<void> {
  await ensureTableExists();

  const tableClient = getTableClient();
  const entity = {
    partitionKey: template.uploadedBy, // Use userId as partition key
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

export async function getTemplate(userId: string, id: string): Promise<Template | null> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity(userId, id);
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

export async function getTemplatesByUser(userId: string): Promise<Template[]> {
  await ensureTableExists();
  const tableClient = getTableClient();
  const templates: Template[] = [];

  try {
    // Direct partition query - much more efficient!
    const entities = tableClient.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
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
  userId: string,
  id: string,
  updates: Partial<Pick<Template, "name" | "note" | "group" | "fields" | "blobUrl">>
): Promise<void> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity(userId, id);
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

export async function deleteTemplate(userId: string, id: string): Promise<void> {
  const tableClient = getTableClient();

  try {
    await tableClient.deleteEntity(userId, id);
  } catch (error) {
    throw new Error(`Failed to delete template: ${error}`);
  }
}
