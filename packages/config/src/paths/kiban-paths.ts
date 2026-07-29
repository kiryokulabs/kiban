export interface KibanPaths { readonly root: string; readonly config: string; readonly database: string; readonly plugins: string; readonly logs: string; readonly cache: string; }

/** Builds the canonical local Kiban directory layout from a home directory. */
export const createKibanPaths = (homeDirectory: string): KibanPaths => {
  const root = `${homeDirectory}/.kiban`;
  return { root, config: `${root}/config`, database: `${root}/database`, plugins: `${root}/plugins`, logs: `${root}/logs`, cache: `${root}/cache` };
};
