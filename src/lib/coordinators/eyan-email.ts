export const EYAN_EMAIL_DOMAIN = "eyan.com";

export function buildEyanEmail(localPart: string): string {
  const local = localPart.trim().toLowerCase();
  if (!local) throw new Error("El usuario de correo es requerido");
  if (!/^[a-z0-9._-]+$/.test(local)) {
    throw new Error("Solo letras, números, punto, guion y guion bajo antes de @eyan.com");
  }
  return `${local}@${EYAN_EMAIL_DOMAIN}`;
}

export function parseEyanEmail(email: string): { localPart: string; isEyan: boolean } {
  const lower = email.trim().toLowerCase();
  const suffix = `@${EYAN_EMAIL_DOMAIN}`;
  if (!lower.endsWith(suffix)) {
    return { localPart: lower.split("@")[0] || "", isEyan: false };
  }
  return { localPart: lower.slice(0, -suffix.length), isEyan: true };
}

export function defaultLicenseForCoordinator(localPart: string): {
  licenseNumber: string;
  licenseExpiry: string;
} {
  const safe = localPart.replace(/[^a-z0-9]/gi, "").toUpperCase() || "COORD";
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 10);
  return {
    licenseNumber: `EYAN-${safe}`,
    licenseExpiry: expiry.toISOString().slice(0, 10),
  };
}
