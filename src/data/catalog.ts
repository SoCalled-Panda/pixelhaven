export interface CatalogEntry {
  id: string;
  title: string;
  manifest: string;
  preview: string;
  /** Optional tier tag from the generator ('hd' = high-fidelity set). */
  tier?: 'hd' | 'classic';
}

export interface Catalog {
  schemaVersion: number;
  artworks: CatalogEntry[];
}

/** Resolve a public/ asset path against the configured base URL. */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

let catalogPromise: Promise<Catalog> | null = null;

/**
 * Load the static artwork catalog (architecture §2: no runtime directory
 * discovery). Cached for the app session; throws on network/shape failure so
 * callers can render friendly error states.
 */
export function loadCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const response = await fetch(assetUrl('artwork/catalog.json'));
      if (!response.ok) {
        throw new Error(`Catalog request failed (${response.status})`);
      }
      const raw = (await response.json()) as Catalog;
      if (
        typeof raw !== 'object' ||
        raw === null ||
        !Array.isArray(raw.artworks) ||
        raw.artworks.some(
          (entry) =>
            typeof entry?.id !== 'string' ||
            typeof entry?.title !== 'string' ||
            typeof entry?.manifest !== 'string' ||
            typeof entry?.preview !== 'string',
        )
      ) {
        throw new Error('Catalog has an unexpected shape');
      }
      return raw;
    })().catch((error) => {
      catalogPromise = null; // allow retry after a transient failure
      throw error;
    });
  }
  return catalogPromise;
}

export async function loadManifest(path: string): Promise<unknown> {
  const response = await fetch(assetUrl(path));
  if (!response.ok) {
    throw new Error(`Manifest request failed (${response.status})`);
  }
  return response.json();
}
