import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { User } from "@/types";

const tableName = "WordTemplateUsers";

let tableClient: TableClient;

export function getUserTableClient(): TableClient {
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

export async function ensureUserTableExists(): Promise<void> {
  const tableClient = getUserTableClient();
  await tableClient.createTable().catch(() => {
    // Table already exists
  });
}

export async function saveUser(user: User): Promise<void> {
  await ensureUserTableExists();

  const tableClient = getUserTableClient();
  const entity = {
    partitionKey: "users",
    rowKey: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
  };

  await tableClient.upsertEntity(entity);
}

export async function getUserById(id: string): Promise<User | null> {
  const tableClient = getUserTableClient();

  try {
    const entity = await tableClient.getEntity("users", id);
    return {
      id: entity.rowKey as string,
      username: entity.username as string,
      passwordHash: entity.passwordHash as string,
      createdAt: entity.createdAt as string,
    };
  } catch (error) {
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const tableClient = getUserTableClient();

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq 'users' and username eq '${username}'` },
  });

  for await (const entity of entities) {
    return {
      id: entity.rowKey as string,
      username: entity.username as string,
      passwordHash: entity.passwordHash as string,
      createdAt: entity.createdAt as string,
    };
  }

  return null;
}

export async function getAllUsers(): Promise<User[]> {
  const tableClient = getUserTableClient();
  const users: User[] = [];

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq 'users'` },
  });

  for await (const entity of entities) {
    users.push({
      id: entity.rowKey as string,
      username: entity.username as string,
      passwordHash: entity.passwordHash as string,
      createdAt: entity.createdAt as string,
    });
  }

  return users;
}

export async function deleteUser(id: string): Promise<void> {
  const tableClient = getUserTableClient();

  try {
    await tableClient.deleteEntity("users", id);
  } catch (error) {
    throw new Error(`Failed to delete user: ${error}`);
  }
}
