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
 * 2. Query QBO por DisplayName exacto (Notes NO es queryable en QBO API
 *    → QueryValidationError 4001). DisplayName es determinístico y QBO
 *    lo fuerza único, así que sirve como llave de búsqueda.
 * 3. Si no existe:
 *    - Customer normal: crea "<nombre> (<cedula>)"
 *    - Sub-customer: asegura padre, luego crea "Yobel - <area>" con
 *      Job=true + ParentRef
 *
 * Notes se sigue seteando al crear (audit), pero no se usa para buscar.
 *
 * Retorna qboCustomerId.
 */
export async function findOrCreateCustomer(opts: FindOrCreateOpts): Promise<string> {
  const { cedula, displayName, email, phone, parentDisplayName } = opts;
  const subClienteArea = opts.subClienteArea ?? null;

  const cached = await CustomerSync.findOne({ cedula, subClienteArea });
  if (cached) return cached.qboCustomerId;

  const notesTag = buildNotes(cedula, subClienteArea);

  // Sub-cliente Yobel = solo el área (Amanco / Kimberly Clark / Otros),
  // colgando del padre Yobel. Resto = nombre FEN tal cual.
  // QBO compara DisplayName case-insensitive, así que "Amanco" reusa
  // un "AMANCO" creado a mano.
  const targetDisplay = subClienteArea
    ? subClienteArea.slice(0, 100)
    : displayName.slice(0, 100);

  const query = `SELECT * FROM Customer WHERE DisplayName = '${escapeForQuery(
    targetDisplay
  )}' MAXRESULTS 1`;
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

    const created = await qboRequest<{
      Customer: { Id: string; DisplayName: string };
    }>({
      method: "POST",
      path: "/v3/company/{realmId}/customer",
      body: {
        DisplayName: targetDisplay,
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

  const created = await qboRequest<{
    Customer: { Id: string; DisplayName: string };
  }>({
    method: "POST",
    path: "/v3/company/{realmId}/customer",
    body: {
      DisplayName: targetDisplay,
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
