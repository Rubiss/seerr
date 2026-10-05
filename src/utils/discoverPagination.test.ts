import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDiscoverPagination } from './discoverPagination';

describe('filtered discovery pagination', () => {
  const firstPages = Array.from({ length: 3 }, () => ({
    results: Array.from({ length: 20 }, (_, id) => ({ id })),
    totalPages: 10,
    totalResults: 200,
  }));

  it('continues past an initial batch hidden by local filters', () => {
    assert.deepEqual(getDiscoverPagination(firstPages, 3, 0), {
      isReachingEnd: false,
      isEmpty: false,
      needsMore: true,
    });
  });

  it('returns to normal scrolling once a visible title is found', () => {
    assert.equal(getDiscoverPagination(firstPages, 3, 1).needsMore, false);
  });

  it('shows empty results after the provider is exhausted', () => {
    const pages = [
      ...firstPages,
      { results: [], totalPages: 4, totalResults: 60 },
    ];
    assert.deepEqual(getDiscoverPagination(pages, 4, 0), {
      isReachingEnd: true,
      isEmpty: true,
      needsMore: false,
    });
  });

  it('respects a provider page cap even when totalResults is larger', () => {
    const pages = firstPages.map((page) => ({ ...page, totalPages: 3 }));
    assert.equal(getDiscoverPagination(pages, 3, 0).needsMore, false);
    assert.equal(getDiscoverPagination(pages, 3, 0).isEmpty, true);
  });

  it('waits for the first response before requesting another page', () => {
    assert.deepEqual(getDiscoverPagination(undefined, 3, 0), {
      isReachingEnd: false,
      isEmpty: false,
      needsMore: false,
    });
  });
});
