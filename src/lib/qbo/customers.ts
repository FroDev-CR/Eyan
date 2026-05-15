import { qboRequest } from "./client";
import { CustomerSync } from "@/models";
import type { SubClienteArea } from "@/models/CustomerSync";

const NOTES_PREFIX = "CED";

function buildNotes(cedula: string, subArea?: SubClienteArea | null): string {
  if (subArea) return `${NOTES_PREFIX}:${cedula}:SUB:${subArea}`;
  return `${NOTES_PREFIX}:${cedula}`;
}

function escapeForQuery(s: string): string {
  return s.replace(/'/g, "''");
}

interface FindOrCreateOpts {
  cedula: string;
  displayName: string;
  email?: string;
  phone?: string;
  subClienteArea?: SubClienteArea | null;
  parentDisplayName?: string;  // requerido si subClienteArea está set
}

/**
 * Encuentra o crea un customer (o sub-customer) en QBO.
 *
 * Estrategia:
 * 1. Cache local CustomerSync por (cedula, subClienteArea)
 * 2. Query QBO por Notes exacto
 * 3. Si no existe:
 *    - Customer normal: crea con Notes="CED:<cedula>"
 *    - Sub-customer: asegura padre, luego crea con Job=true + ParentRef
 *
 * Retorna qboCustomerId.
 */
export async function findOrCreateCustomer(opts: FindOrCreateOpts): Promise<string> {
  const { cedula, displayName, email, phone, parentDisplayName } = opts;
  const subClienteArea = opts.subClienteArea ?? null;

  const cached = await CustomerSync.findOne({ cedula, subClienteArea });
  if (cached) return cached.qboCustomerId;

  const notesTag = buildNotes(cedula, subClienteArea);
  const query = `SELECT * FROM Customer WHERE Notes = '${escapeForQuery(notesTag)}' MAXRESULTS 1`;
  const found = await qboRequest<{
    QueryResponse?: { Customer?: Array<{ Id: string; DisplayName: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: { query },
  });

  const existing = found.QueryResponse?.Customer?.[0];
  if (existing) {
    await CustomerSync.create({
      cedula,
      subClienteArea,
      qboCustomerId: existing.Id,
      qboDisplayName: existing.DisplayName,
    });
    return existing.Id;
  }

  if (subClienteArea) {
    if (!parentDisplayName) {
      throw new Error("subClienteArea requiere parentDisplayName");
    }
    const parentId = await findOrCreateCustomer({
      cedula,
      displayName: parentDisplayName,
      subClienteArea: null,
    });

    const subDisplay = `Yobel - ${subClienteArea}`.slice(0, 100);
    const created = await qboRequest<{
      Customer: { Id: string; DisplayName: string };
    }>({
      method: "POST",
      path: "/v3/company/{realmId}/customer",
      body: {
        DisplayName: subDisplay,
        CompanyName: subClienteArea,
        Job: true,
        ParentRef: { value: parentId },
        Notes: notesTag,
      },
    });

    await CustomerSync.create({
      cedula,
      subClienteArea,
      qboCustomerId: created.Customer.Id,
      qboDisplayName: created.Customer.DisplayName,
    });
    return created.Customer.Id;
  }

  const safeDisplayName = `${displayName} (${cedula})`.slice(0, 100);
  const created = await qboRequest<{
    Customer: { Id: string; DisplayName: string };
  }>({
    method: "POST",
    path: "/v3/company/{realmId}/customer",
    body: {
      DisplayName: safeDisplayName,
      CompanyName: displayName,
      Notes: notesTag,
      ...(email ? { PrimaryEmailAddr: { Address: email } } : {}),
      ...(phone ? { PrimaryPhone: { FreeFormNumber: phone } } : {}),
    },
  });

  await CustomerSync.create({
    cedula,
    subClienteArea: null,
    qboCustomerId: created.Customer.Id,
    qboDisplayName: created.Customer.DisplayName,
  });

  return created.Customer.Id;
}
