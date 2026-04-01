#!/usr/bin/env node

import { readFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Client, Functions, Runtime, Scopes } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const rootEnvPath = resolve(rootDir, ".env");
const functionDir = resolve(rootDir, "functions/send-registration-confirmation-email");
const functionEnvPath = resolve(functionDir, ".env");
const archivePath = resolve(rootDir, ".tmp-registration-confirmation-email.tar.gz");

function parseEnvFile(filePath) {
  const env = {};

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const rootEnv = parseEnvFile(rootEnvPath);
const functionEnv = parseEnvFile(functionEnvPath);

const endpoint = rootEnv.APPWRITE_ENDPOINT?.trim();
const projectId = rootEnv.APPWRITE_PROJECT_ID?.trim();
const apiKey = rootEnv.APPWRITE_API_KEY?.trim();

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY.");
  process.exit(1);
}

const functionId = "registration_confirmation_email";
const functionName = "Registration Confirmation Email";
const entrypoint = "src/main.js";
const commands = "npm install --omit=dev";
const events = ["databases.*.collections.*.documents.*.create"];
const scopes = [
  Scopes.DatabasesRead,
  Scopes.DatabasesWrite,
  Scopes.DocumentsRead,
  Scopes.DocumentsWrite,
  Scopes.UsersRead,
  Scopes.UsersWrite,
  Scopes.TargetsRead,
  Scopes.TargetsWrite,
  Scopes.MessagesWrite,
  Scopes.TopicsWrite,
  Scopes.SubscribersWrite,
];

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const functions = new Functions(client);

async function ensureFunction() {
  try {
    const existing = await functions.get({ functionId });
    await functions.update({
      functionId,
      name: functionName,
      runtime: Runtime.Node22,
      execute: existing.execute ?? [],
      events,
      timeout: 30,
      enabled: true,
      logging: true,
      entrypoint,
      commands,
      scopes,
      schedule: "",
      deploymentRetention: existing.deploymentRetention ?? 0,
      runtimeSpecification: existing.runtimeSpecification ?? undefined,
      buildSpecification: existing.buildSpecification ?? undefined,
    });
    console.log(`Updated function ${functionId}.`);
    return;
  } catch (error) {
    if (error?.code !== 404) throw error;
  }

  await functions.create({
    functionId,
    name: functionName,
    runtime: Runtime.Node22,
    execute: [],
    events,
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint,
    commands,
    scopes,
    schedule: "",
    deploymentRetention: 0,
  });
  console.log(`Created function ${functionId}.`);
}

async function syncVariables() {
  const existing = await functions.listVariables({ functionId });
  const existingByKey = new Map(existing.variables.map((variable) => [variable.key, variable]));

  for (const [key, value] of Object.entries(functionEnv)) {
    const current = existingByKey.get(key);

    if (!current) {
      await functions.createVariable({
        functionId,
        key,
        value,
        secret: false,
      });
      console.log(`Created variable ${key}.`);
      continue;
    }

    if (current.value === value) {
      console.log(`Variable ${key} already up to date.`);
      continue;
    }

    await functions.updateVariable({
      functionId,
      variableId: current.$id,
      key,
      value,
      secret: false,
    });
    console.log(`Updated variable ${key}.`);
  }
}

function createArchive() {
  execFileSync(
    "tar",
    ["-czf", archivePath, "-C", functionDir, "."],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        COPYFILE_DISABLE: "1",
      },
      stdio: "inherit",
    },
  );
}

async function deployArchive() {
  const deployment = await functions.createDeployment({
    functionId,
    code: InputFile.fromPath(archivePath, "registration-confirmation-email.tar.gz"),
    activate: true,
    entrypoint,
    commands,
  });
  console.log(`Created deployment ${deployment.$id}.`);
}

await ensureFunction();
await syncVariables();
try {
  createArchive();
  await deployArchive();
} finally {
  rmSync(archivePath, { force: true });
}

console.log("Registration confirmation function deployment request submitted.");
