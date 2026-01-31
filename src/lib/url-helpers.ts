/**
 * Build a URL with query parameters, preserving existing params
 */
export function buildUrl(
  basePath: string,
  params: Record<string, string | number | undefined | null>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Build pagination URL preserving current filters
 */
export function buildPaginationUrl(
  basePath: string,
  page: number,
  currentParams: Record<string, string | number | undefined | null>
): string {
  return buildUrl(basePath, { ...currentParams, page });
}

/**
 * Parse search params from URL, handling array values
 */
export function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      normalized[key] = value[0];
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}
