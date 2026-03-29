import "dotenv/config";
import { Client } from "@hubspot/api-client";
import { mkdirSync, writeFileSync } from "node:fs";

const STANDARD_OBJECTS = [
  "contacts",
  "companies",
  "deals",
  "tickets",
  "line_items",
  "products",
  "quotes",
  "calls",
  "emails",
  "meetings",
  "notes",
  "tasks",
];

async function main() {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    console.error(
      "Error: HUBSPOT_ACCESS_TOKEN is not set. Copy .env.example to .env and add your token."
    );
    process.exit(1);
  }

  const client = new Client({ accessToken });

  // 1. Fetch all schemas (returns custom objects + possibly some standard ones)
  console.log("Fetching object schemas...");
  let schemas = [];
  try {
    const res = await client.crm.schemas.coreApi.getAll();
    schemas = res.results || [];
  } catch (err) {
    console.warn("Warning: Could not fetch schemas endpoint:", err.message);
  }

  // 2. Build a map of object types to process (schemas + standard fallback)
  const objectMap = new Map();

  for (const schema of schemas) {
    objectMap.set(schema.name, { schema });
  }

  for (const name of STANDARD_OBJECTS) {
    if (!objectMap.has(name)) {
      objectMap.set(name, { schema: null });
    }
  }

  console.log(`Found ${objectMap.size} object types to process.\n`);

  // 3. Fetch properties and schema details for each object
  const objects = [];

  for (const [objectType, { schema }] of objectMap) {
    console.log(`  Processing: ${objectType}`);

    let properties = [];
    let schemaDetail = schema;
    let error = null;

    // Fetch properties
    try {
      const propRes = await client.crm.properties.coreApi.getAll(objectType);
      properties = propRes.results || [];
    } catch (err) {
      console.warn(`    Warning: Could not fetch properties for ${objectType}: ${err.message}`);
      error = `Failed to fetch properties: ${err.message}`;
    }

    // Fetch full schema if we don't have it (for standard objects)
    if (!schemaDetail) {
      try {
        schemaDetail = await client.crm.schemas.coreApi.getById(objectType);
      } catch {
        // Standard objects may not have a schema endpoint entry — that's ok
      }
    }

    const associations = (schemaDetail?.associations || []).map((a) => ({
      fromObjectTypeId: a.fromObjectTypeId,
      toObjectTypeId: a.toObjectTypeId,
      name: a.name || a.id,
    }));

    objects.push({
      name: objectType,
      objectTypeId: schemaDetail?.objectTypeId || null,
      fullyQualifiedName: schemaDetail?.fullyQualifiedName || objectType,
      labels: schemaDetail?.labels || { singular: objectType, plural: objectType },
      primaryDisplayProperty: schemaDetail?.primaryDisplayProperty || null,
      requiredProperties: schemaDetail?.requiredProperties || [],
      properties: properties.map((p) => ({
        name: p.name,
        label: p.label,
        type: p.type,
        fieldType: p.fieldType,
        groupName: p.groupName,
        description: p.description,
        options: p.options || [],
        hasUniqueValue: p.hasUniqueValue,
        hidden: p.hidden,
        calculated: p.calculated,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      propertyCount: properties.length,
      associations,
      associationCount: associations.length,
      ...(error ? { error } : {}),
    });
  }

  // 4. Write output
  const output = {
    exportedAt: new Date().toISOString(),
    objectCount: objects.length,
    objects,
  };

  mkdirSync("output", { recursive: true });
  const outputPath = "output/hubspot-metadata.json";
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const totalProps = objects.reduce((sum, o) => sum + o.propertyCount, 0);
  console.log(`\nDone! Exported ${objects.length} objects with ${totalProps} total properties.`);
  console.log(`Output: ${outputPath}`);
}

main();
