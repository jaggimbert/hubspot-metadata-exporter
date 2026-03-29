# HubSpot Metadata Exporter

Exports all HubSpot CRM object metadata — properties, associations, and schema details — to a single JSON file.

## What it exports

For each CRM object (standard + custom), the output includes:

- Object name, ID, labels, and fully qualified name
- All properties with type, field type, group, options, and timestamps
- Associations to other objects
- Primary display property and required properties

**Standard objects covered:** contacts, companies, deals, tickets, line_items, products, quotes, calls, emails, meetings, notes, tasks

Custom objects are discovered automatically via the schemas API.

## Prerequisites

- Node.js 18+
- A HubSpot Private App access token with CRM read scopes (`crm.objects.*.read`, `crm.schemas.*.read`)

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and add your token:

```bash
cp .env.example .env
```

Edit `.env`:

```
HUBSPOT_ACCESS_TOKEN=your-hubspot-private-app-access-token
```

## Usage

```bash
npm start
```

Output is written to `output/hubspot-metadata.json`.

## Output format

```json
{
  "exportedAt": "2026-03-29T00:00:00.000Z",
  "objectCount": 14,
  "objects": [
    {
      "name": "contacts",
      "objectTypeId": "0-1",
      "fullyQualifiedName": "contacts",
      "labels": { "singular": "Contact", "plural": "Contacts" },
      "primaryDisplayProperty": "firstname",
      "requiredProperties": [],
      "properties": [...],
      "propertyCount": 172,
      "associations": [...],
      "associationCount": 5
    }
  ]
}
```

## Notes

- The `output/` directory and `.env` are gitignored.
- Standard objects that lack a schema endpoint entry will still have their properties exported.
- If a property or schema fetch fails, the object entry will include an `error` field with the reason.
