import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { User } from "@/types";

const tableName = "DocumentTemplateUsers";

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
  try {
    await tableClient.createTable();
  } catch (error: any) {
    // Only ignore "table already exists" errors
    if (error?.statusCode !== 409 && !error?.message?.includes("TableAlreadyExists")) {
      console.error("Failed to create users table:", error);
      throw error;
    }
  }
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
    salutation: user.salutation || "",
  };

  await tableClient.upsertEntity(entity);
}

export async function updateUser(
  userId: string,
  updates: { username?: string; passwordHash?: string; salutation?: string }
): Promise<User> {
  const tableClient = getUserTableClient();

  // Get existing user
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    throw new Error("User not found");
  }

  // Apply updates
  const updatedUser: User = {
    ...existingUser,
    ...(updates.username !== undefined && { username: updates.username }),
    ...(updates.passwordHash !== undefined && { passwordHash: updates.passwordHash }),
    ...(updates.salutation !== undefined && { salutation: updates.salutation }),
  };

  // Save updated user
  const entity = {
    partitionKey: "users",
    rowKey: updatedUser.id,
    username: updatedUser.username,
    passwordHash: updatedUser.passwordHash,
    createdAt: updatedUser.createdAt,
    salutation: updatedUser.salutation || "",
  };

  await tableClient.upsertEntity(entity);

  return updatedUser;
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
      salutation: (entity.salutation as string) || undefined,
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
      salutation: (entity.salutation as string) || undefined,
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
      salutation: (entity.salutation as string) || undefined,
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
