import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

const tableName = "DocumentTemplateStatistics";

let tableClient: TableClient;
let tableExistsPromise: Promise<void> | null = null;

function getTableClient(): TableClient {
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

async function ensureTableExists(): Promise<void> {
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
          console.error("Failed to create statistics table:", {
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

async function ensureStatisticsEntity(userId: string): Promise<void> {
  await ensureTableExists();
  const tableClient = getTableClient();

  try {
    // Try to get existing entity
    await tableClient.getEntity("statistics", userId);
  } catch (error: any) {
    // Only create if entity doesn't exist
    if (error?.statusCode === 404 || error?.message?.includes("ResourceNotFound")) {
      const entity = {
        partitionKey: "statistics",
        rowKey: userId,
        totalTemplatesCreated: 0,
        totalFilesGenerated: 0,
        totalFieldsFilled: 0,
        lastGenerationDate: "",
      };
      try {
        await tableClient.createEntity(entity);
      } catch (createError: any) {
        console.error("Failed to create statistics entity:", {
          statusCode: createError?.statusCode,
          message: createError?.message,
          code: createError?.code,
        });
        throw createError;
      }
    } else {
      console.error("Unexpected error getting statistics entity:", {
        statusCode: error?.statusCode,
        message: error?.message,
        code: error?.code,
      });
      throw error;
    }
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
    const lastGenDate = entity.lastGenerationDate as string;
    return {
      totalTemplatesCreated: (entity.totalTemplatesCreated as number) || 0,
      totalFilesGenerated: (entity.totalFilesGenerated as number) || 0,
      totalFieldsFilled: (entity.totalFieldsFilled as number) || 0,
      lastGenerationDate: lastGenDate && lastGenDate.trim() !== "" ? lastGenDate : null,
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
      partitionKey: "statistics",
      rowKey: userId,
      totalFilesGenerated:
        ((entity.totalFilesGenerated as number) || 0) + filesCount,
      totalFieldsFilled:
        ((entity.totalFieldsFilled as number) || 0) +
        filesCount * fieldsCount,
      lastGenerationDate: new Date().toISOString(),
      etag: entity.etag,
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
      partitionKey: "statistics",
      rowKey: userId,
      totalTemplatesCreated:
        ((entity.totalTemplatesCreated as number) || 0) + 1,
      etag: entity.etag,
    };
    await tableClient.updateEntity(updatedEntity, "Merge");
  } catch (error) {
    console.error("Failed to increment templates created:", error);
  }
}
