import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

const tableName = "WordTemplateStatistics";

let tableClient: TableClient;

function getTableClient(): TableClient {
  if (!tableClient) {
    // Read environment variables when the function is called, not at module load time
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";

    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  }
  return tableClient;
}

async function ensureTableExists(): Promise<void> {
  const tableClient = getTableClient();
  await tableClient.createTable().catch(() => {
    // Table already exists
  });
}

async function ensureStatisticsEntity(userId: string): Promise<void> {
  await ensureTableExists();
  const tableClient = getTableClient();

  try {
    // Try to get existing entity
    await tableClient.getEntity("statistics", userId);
  } catch (error) {
    // Entity doesn't exist, create it
    const entity = {
      partitionKey: "statistics",
      rowKey: userId,
      totalTemplatesCreated: 0,
      totalFilesGenerated: 0,
      totalFieldsFilled: 0,
      lastGenerationDate: "",
    };
    await tableClient.createEntity(entity);
  }
}

export async function getStatistics(userId: string): Promise<{
  totalTemplatesCreated: number;
  totalFilesGenerated: number;
  totalFieldsFilled: number;
  lastGenerationDate: string | null;
}> {
  await ensureStatisticsEntity(userId);
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("statistics", userId);
    return {
      totalTemplatesCreated: (entity.totalTemplatesCreated as number) || 0,
      totalFilesGenerated: (entity.totalFilesGenerated as number) || 0,
      totalFieldsFilled: (entity.totalFieldsFilled as number) || 0,
      lastGenerationDate: (entity.lastGenerationDate as string) || null,
    };
  } catch (error) {
    // Return defaults if something goes wrong
    return {
      totalTemplatesCreated: 0,
      totalFilesGenerated: 0,
      totalFieldsFilled: 0,
      lastGenerationDate: null,
    };
  }
}

export async function incrementFilesGenerated(
  userId: string,
  filesCount: number,
  fieldsCount: number
): Promise<void> {
  await ensureStatisticsEntity(userId);
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("statistics", userId);
    const updatedEntity = {
      ...entity,
      totalFilesGenerated:
        ((entity.totalFilesGenerated as number) || 0) + filesCount,
      totalFieldsFilled:
        ((entity.totalFieldsFilled as number) || 0) +
        filesCount * fieldsCount,
      lastGenerationDate: new Date().toISOString(),
    };
    await tableClient.updateEntity(updatedEntity, "Merge");
  } catch (error) {
    console.error("Failed to increment statistics:", error);
  }
}

export async function incrementTemplatesCreated(userId: string): Promise<void> {
  await ensureStatisticsEntity(userId);
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity("statistics", userId);
    const updatedEntity = {
      ...entity,
      totalTemplatesCreated:
        ((entity.totalTemplatesCreated as number) || 0) + 1,
    };
    await tableClient.updateEntity(updatedEntity, "Merge");
  } catch (error) {
    console.error("Failed to increment templates created:", error);
  }
}
