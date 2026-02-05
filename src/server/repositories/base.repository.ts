/**
 * Base Repository — Abstract class for data access operations.
 *
 * Provides common CRUD operations that can be extended by specific repositories.
 * This pattern allows:
 * - Easy mocking in unit tests
 * - Consistent data access patterns
 * - Separation of data access from business logic
 *
 * @example
 * // Create a specific repository
 * class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
 *   constructor() {
 *     super(db.user);
 *   }
 * }
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common options for find operations.
 */
export interface FindOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  include?: any;
}

/**
 * Options for list operations with pagination.
 */
export interface ListOptions {
  skip?: number;
  take?: number;
  cursor?: { id: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderBy?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  include?: any;
}

/**
 * Paginated result type.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Generic where clause type.
 */
export type WhereClause<T> = Partial<T> & Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Base Repository
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base repository with common CRUD operations.
 *
 * @template TModel - The Prisma model type
 * @template TCreateInput - The create input type
 * @template TUpdateInput - The update input type
 * @template TWhere - The where clause type
 */
export abstract class BaseRepository<
  TModel extends { id: string },
  TCreateInput,
  TUpdateInput,
  TWhere = Record<string, unknown>,
> {
  /**
   * Create a new repository instance.
   * @param model - The Prisma model delegate (e.g., db.user)
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly model: any
  ) {}

  /**
   * Find a single record by ID.
   */
  async findById(id: string): Promise<TModel | null> {
    return this.model.findUnique({ where: { id } });
  }

  /**
   * Find a single record by ID or throw.
   */
  async findByIdOrThrow(id: string): Promise<TModel> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`${this.constructor.name}: Record not found with id ${id}`);
    }
    return record;
  }

  /**
   * Find a single record matching the where clause.
   */
  async findOne(where: TWhere): Promise<TModel | null> {
    return this.model.findFirst({ where });
  }

  /**
   * Find all records matching the where clause.
   */
  async findMany(where?: TWhere, options?: ListOptions): Promise<TModel[]> {
    return this.model.findMany({
      where,
      ...options,
    });
  }

  /**
   * Find all records with pagination.
   */
  async findPaginated(
    where: TWhere | undefined,
    page: number,
    pageSize: number,
    options?: Omit<ListOptions, "skip" | "take">
  ): Promise<PaginatedResult<TModel>> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: pageSize,
        ...options,
      }),
      this.model.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * Create a new record.
   */
  async create(data: TCreateInput): Promise<TModel> {
    return this.model.create({ data });
  }

  /**
   * Create multiple records.
   */
  async createMany(data: TCreateInput[]): Promise<{ count: number }> {
    return this.model.createMany({ data });
  }

  /**
   * Update a record by ID.
   */
  async update(id: string, data: TUpdateInput): Promise<TModel> {
    return this.model.update({ where: { id }, data });
  }

  /**
   * Update multiple records matching the where clause.
   */
  async updateMany(where: TWhere, data: TUpdateInput): Promise<{ count: number }> {
    return this.model.updateMany({ where, data });
  }

  /**
   * Delete a record by ID.
   */
  async delete(id: string): Promise<TModel> {
    return this.model.delete({ where: { id } });
  }

  /**
   * Delete multiple records matching the where clause.
   */
  async deleteMany(where: TWhere): Promise<{ count: number }> {
    return this.model.deleteMany({ where });
  }

  /**
   * Count records matching the where clause.
   */
  async count(where?: TWhere): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Check if a record exists.
   */
  async exists(where: TWhere): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  /**
   * Get the database client for complex operations.
   * Use db.$transaction() for transactional operations.
   */
  protected getDb() {
    return db;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Soft Delete Mixin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mixin for repositories with soft delete support.
 */
export interface SoftDeleteModel {
  id: string;
  deletedAt: Date | null;
}

/**
 * Base repository with soft delete support.
 */
export abstract class SoftDeleteRepository<
  TModel extends SoftDeleteModel,
  TCreateInput,
  TUpdateInput,
  TWhere = Record<string, unknown>,
> extends BaseRepository<TModel, TCreateInput, TUpdateInput, TWhere> {
  /**
   * Find a single record by ID (excluding soft-deleted).
   */
  override async findById(id: string): Promise<TModel | null> {
    return this.model.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Find all records (excluding soft-deleted).
   */
  override async findMany(where?: TWhere, options?: ListOptions): Promise<TModel[]> {
    return this.model.findMany({
      where: { ...where, deletedAt: null },
      ...options,
    });
  }

  /**
   * Soft delete a record by ID.
   */
  async softDelete(id: string): Promise<TModel> {
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted record.
   */
  async restore(id: string): Promise<TModel> {
    return this.model.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Find including soft-deleted records.
   */
  async findWithDeleted(where?: TWhere, options?: ListOptions): Promise<TModel[]> {
    return this.model.findMany({
      where,
      ...options,
    });
  }

  /**
   * Permanently delete a record.
   */
  async hardDelete(id: string): Promise<TModel> {
    return super.delete(id);
  }
}
