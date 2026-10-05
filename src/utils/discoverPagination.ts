interface DiscoverPage {
  results: unknown[];
  totalPages: number;
  totalResults: number;
}

// Only provider results can establish the end; local filters may hide a batch.
export function getDiscoverPagination(
  pages: DiscoverPage[] | undefined,
  size: number,
  visibleCount: number
) {
  const lastPage = pages?.[pages.length - 1];
  const isReachingEnd =
    !!lastPage &&
    (lastPage.results.length < 20 ||
      size >= lastPage.totalPages ||
      lastPage.totalResults <= size * 20);

  return {
    isReachingEnd,
    isEmpty: isReachingEnd && visibleCount === 0,
    needsMore: !!lastPage && visibleCount === 0 && !isReachingEnd,
  };
}
