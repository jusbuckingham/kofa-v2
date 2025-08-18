// lib/config/auth-toggle.ts
export const isAuthEnabled: boolean = process.env.AUTH_ENABLED?.toLowerCase() === "true";