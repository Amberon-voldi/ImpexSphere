type MigrationStatus = { ok: boolean; at: string; error?: string };
const g = globalThis as unknown as { __impexMigration?: MigrationStatus };

export const setMigrationStatus = (s: MigrationStatus) => void (g.__impexMigration = s);
export const getMigrationStatus = () => g.__impexMigration ?? null;
