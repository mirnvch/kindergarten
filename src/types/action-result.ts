/**
 * Centralized ActionResult type for all server actions.
 * Provides consistent return type pattern across the application.
 */

/**
 * Standard result type for server actions.
 * @template T - The type of data returned on success
 */
export type ActionResult<T = void> = {
  /** Whether the action succeeded */
  success: boolean;
  /** Error message if the action failed */
  error?: string;
  /** Data returned on success */
  data?: T;
};

/**
 * Paginated result type for list actions.
 * @template T - The type of items in the list
 */
export type PaginatedResult<T> = ActionResult<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;

/**
 * Result type with metadata (e.g., for bulk operations).
 * @template T - The type of data returned
 */
export type ActionResultWithMeta<T = void, M = Record<string, unknown>> = ActionResult<T> & {
  meta?: M;
};
