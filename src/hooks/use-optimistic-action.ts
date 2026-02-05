"use client";

/**
 * useOptimisticAction — Hook for optimistic UI updates with Server Actions.
 *
 * Provides immediate feedback while the server processes the request,
 * with automatic rollback on failure.
 *
 * @example
 * // Toggle favorite with optimistic update
 * const { execute, isLoading } = useOptimisticAction(toggleFavoriteAction, {
 *   onOptimistic: (input) => {
 *     setFavorites((prev) =>
 *       prev.includes(input.providerId)
 *         ? prev.filter((id) => id !== input.providerId)
 *         : [...prev, input.providerId]
 *     );
 *   },
 *   onSuccess: (data) => {
 *     toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
 *   },
 *   onError: (error) => {
 *     toast.error(error);
 *   },
 * });
 */

import { useState, useCallback, useTransition, useRef } from "react";
import { type ActionResult } from "@/types/action-result";

interface UseOptimisticActionOptions<TInput, TOutput> {
  /**
   * Called immediately before the action executes.
   * Use this to update UI optimistically.
   */
  onOptimistic?: (input: TInput) => void;

  /**
   * Called when the action succeeds.
   */
  onSuccess?: (data: TOutput, input: TInput) => void;

  /**
   * Called when the action fails.
   * The optimistic update should be rolled back here.
   */
  onError?: (error: string, input: TInput) => void;

  /**
   * Called when the action completes (success or failure).
   */
  onSettled?: (result: ActionResult<TOutput>, input: TInput) => void;

  /**
   * Custom rollback function.
   * Called automatically on error if provided.
   */
  rollback?: (input: TInput) => void;
}

interface UseOptimisticActionReturn<TInput, TOutput> {
  /** Execute the action */
  execute: (input: TInput) => Promise<ActionResult<TOutput>>;
  /** Whether the action is currently loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Last successful result */
  data: TOutput | null;
  /** Reset state */
  reset: () => void;
}

export function useOptimisticAction<TInput, TOutput>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options: UseOptimisticActionOptions<TInput, TOutput> = {}
): UseOptimisticActionReturn<TInput, TOutput> {
  const [isPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TOutput | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Track the last input for rollback
  const lastInputRef = useRef<TInput | null>(null);

  const execute = useCallback(
    async (input: TInput): Promise<ActionResult<TOutput>> => {
      // Store input for potential rollback
      lastInputRef.current = input;

      // Clear previous error
      setError(null);
      setIsExecuting(true);

      // Apply optimistic update immediately
      if (options.onOptimistic) {
        options.onOptimistic(input);
      }

      try {
        // Execute the action
        const result = await action(input);

        if (result.success && result.data !== undefined) {
          setData(result.data);
          if (options.onSuccess) {
            options.onSuccess(result.data, input);
          }
        } else {
          // Rollback optimistic update on error
          if (options.rollback) {
            options.rollback(input);
          }
          setError(result.error ?? "An error occurred");
          if (options.onError) {
            options.onError(result.error ?? "An error occurred", input);
          }
        }

        // Call onSettled regardless of outcome
        if (options.onSettled) {
          options.onSettled(result, input);
        }

        return result;
      } catch (err) {
        // Handle unexpected errors
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";

        // Rollback on error
        if (options.rollback) {
          options.rollback(input);
        }

        setError(errorMessage);
        if (options.onError) {
          options.onError(errorMessage, input);
        }

        const errorResult: ActionResult<TOutput> = {
          success: false,
          error: errorMessage,
        };

        if (options.onSettled) {
          options.onSettled(errorResult, input);
        }

        return errorResult;
      } finally {
        setIsExecuting(false);
      }
    },
    [action, options]
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    lastInputRef.current = null;
  }, []);

  return {
    execute,
    isLoading: isPending || isExecuting,
    error,
    data,
    reset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useOptimisticList — Specialized hook for list operations
// ─────────────────────────────────────────────────────────────────────────────

interface UseOptimisticListOptions<TItem, TInput> {
  /** Get item ID for comparison */
  getId: (item: TItem) => string;
  /** Create optimistic item from input */
  createOptimisticItem?: (input: TInput) => TItem;
  /** Called on success */
  onSuccess?: (data: TItem, input: TInput) => void;
  /** Called on error */
  onError?: (error: string, input: TInput) => void;
}

export function useOptimisticList<TItem, TInput>(
  items: TItem[],
  setItems: React.Dispatch<React.SetStateAction<TItem[]>>,
  options: UseOptimisticListOptions<TItem, TInput>
) {
  const { getId, createOptimisticItem } = options;

  /**
   * Add item optimistically.
   */
  const addOptimistic = useCallback(
    (input: TInput): TItem | null => {
      if (!createOptimisticItem) return null;

      const optimisticItem = createOptimisticItem(input);
      setItems((prev) => [...prev, optimisticItem]);
      return optimisticItem;
    },
    [createOptimisticItem, setItems]
  );

  /**
   * Remove item optimistically.
   */
  const removeOptimistic = useCallback(
    (id: string): TItem | null => {
      let removedItem: TItem | null = null;
      setItems((prev) => {
        const index = prev.findIndex((item) => getId(item) === id);
        if (index !== -1) {
          removedItem = prev[index];
          return [...prev.slice(0, index), ...prev.slice(index + 1)];
        }
        return prev;
      });
      return removedItem;
    },
    [getId, setItems]
  );

  /**
   * Update item optimistically.
   */
  const updateOptimistic = useCallback(
    (id: string, updates: Partial<TItem>): TItem | null => {
      let previousItem: TItem | null = null;
      setItems((prev) =>
        prev.map((item) => {
          if (getId(item) === id) {
            previousItem = item;
            return { ...item, ...updates };
          }
          return item;
        })
      );
      return previousItem;
    },
    [getId, setItems]
  );

  /**
   * Rollback to previous state.
   */
  const rollback = useCallback(
    (previousItem: TItem | null, operation: "add" | "remove" | "update") => {
      if (!previousItem) return;

      switch (operation) {
        case "add":
          // Remove the optimistically added item
          setItems((prev) => prev.filter((item) => getId(item) !== getId(previousItem)));
          break;
        case "remove":
          // Re-add the removed item
          setItems((prev) => [...prev, previousItem]);
          break;
        case "update":
          // Restore the previous state
          setItems((prev) =>
            prev.map((item) => (getId(item) === getId(previousItem) ? previousItem : item))
          );
          break;
      }
    },
    [getId, setItems]
  );

  return {
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    rollback,
  };
}
