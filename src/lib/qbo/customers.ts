import { qboRequest } from "./client";
import { CustomerSync } from "@/models";

/**
 * Encuentra o crea un customer en QBO basándose en la cédula.
 *
 * Estrategia:
 * 1. Lookup en `CustomerSync` (mapa local cedula → qboCustomerId)
 * 2. Query QBO buscando customers con la cédula en Notes (`CED:<cedula>`)
 * 3. Si no existe, crea uno nuevo con Notes="CED:<cedula>" y DisplayName=nombre
 *
 * Retorna el qboCustomerId.
 */
export async function findOrCreateCustomer(
  cedula: string,
  displayName: string,
  email?: string,
  phone?: string
): Promise<string> {
  // 1. Cache local
  const cached = await CustomerSync.findOne({ cedula });
  if (cached) return cached.qboCustomerId;

  const cedTag = `CED:${cedula}`;

  // 2. Buscar en QBO por Notes
  const query = `SELECT * FROM Customer WHERE Notes LIKE '%${cedTag}%' MAXRESULTS 1`;
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
      qboCustomerId: existing.Id,
      qboDisplayName: existing.DisplayName,
    });
    return existing.Id;
  }

  // 3. Crear nuevo. DisplayName debe ser único en QBO → sufijo cedula si choca
  const safeDisplayName = `${displayName} (${cedula})`.slice(0, 100);
  const created = await qboRequest<{
    Customer: { Id: string; DisplayName: string };
  }>({
    method: "POST",
    path: "/v3/company/{realmId}/customer",
    body: {
      DisplayName: safeDisplayName,
      CompanyName: displayName,
      Notes: cedTag,
      ...(email ? { PrimaryEmailAddr: { Address: email } } : {}),
      ...(phone ? { PrimaryPhone: { FreeFormNumber: phone } } : {}),
    },
  });

  await CustomerSync.create({
    cedula,
    qboCustomerId: created.Customer.Id,
    qboDisplayName: created.Customer.DisplayName,
  });

  return created.Customer.Id;
}
