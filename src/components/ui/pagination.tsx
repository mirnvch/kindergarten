import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | number | undefined | null>;
  className?: string;
}

function buildPageUrl(
  basePath: string,
  page: number,
  searchParams?: Record<string, string | number | undefined | null>
): string {
  const params = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "" && key !== "page") {
        params.set(key, String(value));
      }
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const showPages = 5; // Show up to 5 page numbers

    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust to always show 3 middle pages when possible
      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(totalPages - 3, 2);
      }

      if (start > 2) {
        pages.push("ellipsis");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        asChild={currentPage > 1}
        className="gap-1"
      >
        {currentPage > 1 ? (
          <Link href={buildPageUrl(basePath, currentPage - 1, searchParams)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </>
        )}
      </Button>

      {/* Page numbers */}
      <div className="hidden sm:flex items-center gap-1">
        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Link
              key={page}
              href={buildPageUrl(basePath, page, searchParams)}
              className={cn(
                buttonVariants({ variant: currentPage === page ? "default" : "outline", size: "sm" }),
                "h-9 w-9 p-0"
              )}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Mobile: Show current/total */}
      <span className="sm:hidden text-sm text-muted-foreground px-2">
        {currentPage} / {totalPages}
      </span>

      {/* Next button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        asChild={currentPage < totalPages}
        className="gap-1"
      >
        {currentPage < totalPages ? (
          <Link href={buildPageUrl(basePath, currentPage + 1, searchParams)}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </nav>
  );
}
