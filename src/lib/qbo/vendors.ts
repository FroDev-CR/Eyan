import { qboRequest } from "./client";
import { VendorSync } from "@/models";

const NOTES_PREFIX = "CED";

function escapeForQuery(s: string): string {
  return s.replace(/'/g, "''");
}

interface FindOrCreateVendorOpts {
  cedula: string;
  displayName: string;
}

/**
 * Encuentra o crea un proveedor (Vendor) en QBO para gastos / compras.
 */
export async function findOrCreateVendor(opts: FindOrCreateVendorOpts): Promise<string> {
  const { cedula, displayName } = opts;
  const cedulaNorm = cedula.trim();
  if (!cedulaNorm) throw new Error("Cédula de proveedor requerida");

  const cached = await VendorSync.findOne({ cedula: cedulaNorm });
  if (cached) return cached.qboVendorId;

  const targetDisplay = displayName.trim().slice(0, 100) || `Proveedor ${cedulaNorm}`;
  const notesTag = `${NOTES_PREFIX}:${cedulaNorm}`;

  const query = `SELECT * FROM Vendor WHERE DisplayName = '${escapeForQuery(targetDisplay)}' MAXRESULTS 1`;
  const found = await qboRequest<{
    QueryResponse?: { Vendor?: Array<{ Id: string; DisplayName: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: { query },
  });

  const existing = found.QueryResponse?.Vendor?.[0];
  if (existing) {
    await VendorSync.create({
      cedula: cedulaNorm,
      qboVendorId: existing.Id,
      qboDisplayName: existing.DisplayName,
    });
    return existing.Id;
  }

  const created = await qboRequest<{ Vendor: { Id: string; DisplayName: string } }>({
    method: "POST",
    path: "/v3/company/{realmId}/vendor",
    body: {
      DisplayName: targetDisplay,
      CompanyName: displayName.trim().slice(0, 100),
      TaxIdentifier: cedulaNorm,
      Notes: notesTag,
    },
  });

  await VendorSync.create({
    cedula: cedulaNorm,
    qboVendorId: created.Vendor.Id,
    qboDisplayName: created.Vendor.DisplayName,
  });

  return created.Vendor.Id;
}
