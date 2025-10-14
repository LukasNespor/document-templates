/**
 * Script to create a new user
 * Run with: npx tsx scripts/create-user.ts <username> <password>
 */

import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { saveUser } from "../lib/azure-users";
import { hashPassword } from "../lib/auth";

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
function validateEnvironment(): boolean {
  const required = [
    "AZURE_STORAGE_ACCOUNT_NAME",
    "AZURE_STORAGE_ACCOUNT_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\nError: Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nPlease ensure your .env file is configured correctly.");
    console.error("Copy .env.example to .env and fill in your Azure credentials.\n");
    return false;
  }

  return true;
}

async function createUser(username: string, password: string) {
  try {
    console.log(`Creating user: ${username}`);

    const passwordHash = await hashPassword(password);

    const user = {
      id: uuidv4(),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await saveUser(user);

    console.log("User created successfully!");
    console.log(`Username: ${username}`);
    console.log(`User ID: ${user.id}`);
  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  }
}

// Validate environment before proceeding
if (!validateEnvironment()) {
  process.exit(1);
}

// Get arguments from command line
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error("Usage: npx tsx scripts/create-user.ts <username> <password>");
  process.exit(1);
}

const [username, password] = args;

if (!username || !password) {
  console.error("Both username and password are required");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters long");
  process.exit(1);
}

createUser(username, password);
