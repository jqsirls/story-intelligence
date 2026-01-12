# Pagination Patterns

**Efficient List Handling**

---

> **Contract Note (Product REST API)**: The product REST gateway currently uses a simple `page` + `limit` contract and returns `data: []` with top-level `pagination`.  
> Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for what the product REST API actually accepts/returns today.

## Overview

Storytailor supports two pagination strategies:
- **Offset-based**: Simple, good for small datasets
- **Cursor-based**: Efficient for large, frequently-updated datasets

---

## Offset-Based Pagination

### Request Format

```http
GET /api/v1/libraries/{libraryId}/stories?page=1&limit=20&sort=created_at&order=desc
```

### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `limit` | integer | 20 | 100 | Items per page |
| `sort` | string | `created_at` | - | Sort field |
| `order` | string | `desc` | - | `asc` or `desc` |

### Response Format

```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Implementation

```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

async function paginateQuery<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, limit, sort, order } = params;
  const offset = (page - 1) * limit;
  
  // Get total count
  const { count } = await query
    .select('id', { count: 'exact', head: true });
  
  // Get paginated data
  const { data, error } = await query
    .select('*')
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  
  return {
    items: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// Usage
app.get('/api/v1/libraries/:libraryId/stories',
  authMiddleware,
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { libraryId } = req.params;
    const params = req.query as PaginationParams;
    
    const query = supabase
      .from('stories')
      .select()
      .eq('library_id', libraryId)
      .eq('deleted_at', null);
    
    const result = await paginateQuery(query, params);
    
    res.json({ success: true, data: result });
  }
);
```

---

## Cursor-Based Pagination

> **Status (Product REST API)**: Cursor-based pagination is **not currently used** by the product REST gateway.  
> The canonical pagination contract for the product REST API is in `docs/api/REST_API_EXPERIENCE_MASTER.md`.

### Request Format

```http
GET /api/v1/notifications?limit=20&cursor=eyJpZCI6IjEyMyIsImNyZWF0ZWRfYXQiOiIyMDI0LTAxLTAxIn0
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Items to return (max 100) |
| `cursor` | string | Opaque cursor from previous response |
| `direction` | string | `forward` (default) or `backward` |

### Response Format

```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "nextCursor": "eyJpZCI6IjQ1NiIsImNyZWF0ZWRfYXQiOiIyMDI0LTAxLTAyIn0",
    "prevCursor": "eyJpZCI6IjEyMCIsImNyZWF0ZWRfYXQiOiIyMDI0LTAxLTAxIn0",
    "hasMore": true
  }
}
```

### Implementation

```typescript
interface CursorData {
  id: string;
  created_at: string;
}

function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    return null;
  }
}

async function cursorPaginate<T extends { id: string; created_at: string }>(
  tableName: string,
  filter: Record<string, any>,
  options: {
    limit: number;
    cursor?: string;
    direction?: 'forward' | 'backward';
  }
): Promise<{
  items: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  };
}> {
  const { limit, cursor, direction = 'forward' } = options;
  const cursorData = cursor ? decodeCursor(cursor) : null;
  
  let query = supabase
    .from(tableName)
    .select('*');
  
  // Apply filters
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  
  // Apply cursor filter
  if (cursorData) {
    if (direction === 'forward') {
      query = query.or(
        `created_at.lt.${cursorData.created_at},` +
        `and(created_at.eq.${cursorData.created_at},id.lt.${cursorData.id})`
      );
    } else {
      query = query.or(
        `created_at.gt.${cursorData.created_at},` +
        `and(created_at.eq.${cursorData.created_at},id.gt.${cursorData.id})`
      );
    }
  }
  
  // Order and limit (+1 to check for more)
  query = query
    .order('created_at', { ascending: direction === 'backward' })
    .order('id', { ascending: direction === 'backward' })
    .limit(limit + 1);
  
  const { data, error } = await query;
  if (error) throw error;
  
  const items = data as T[];
  const hasMore = items.length > limit;
  
  if (hasMore) {
    items.pop(); // Remove the extra item
  }
  
  // Reverse if going backward
  if (direction === 'backward') {
    items.reverse();
  }
  
  return {
    items,
    pagination: {
      nextCursor: items.length > 0
        ? encodeCursor({ id: items[items.length - 1].id, created_at: items[items.length - 1].created_at })
        : null,
      prevCursor: items.length > 0
        ? encodeCursor({ id: items[0].id, created_at: items[0].created_at })
        : null,
      hasMore
    }
  };
}
```

---

## Infinite Scroll Pattern

### Frontend Implementation

```javascript
class InfiniteScroller {
  constructor(options) {
    this.container = options.container;
    this.fetchFn = options.fetchFn;
    this.renderFn = options.renderFn;
    this.cursor = null;
    this.loading = false;
    this.hasMore = true;
    
    this.setupObserver();
  }
  
  setupObserver() {
    // Sentinel element at bottom of list
    this.sentinel = document.createElement('div');
    this.sentinel.className = 'scroll-sentinel';
    this.container.appendChild(this.sentinel);
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.loading) {
        this.loadMore();
      }
    }, { rootMargin: '100px' });
    
    observer.observe(this.sentinel);
  }
  
  async loadMore() {
    if (this.loading || !this.hasMore) return;
    
    this.loading = true;
    this.showLoader();
    
    try {
      const result = await this.fetchFn(this.cursor);
      
      this.cursor = result.pagination.nextCursor;
      this.hasMore = result.pagination.hasMore;
      
      for (const item of result.items) {
        const element = this.renderFn(item);
        this.container.insertBefore(element, this.sentinel);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      this.loading = false;
      this.hideLoader();
    }
  }
  
  showLoader() {
    this.sentinel.innerHTML = '<div class="loading-spinner"></div>';
  }
  
  hideLoader() {
    this.sentinel.innerHTML = '';
  }
  
  reset() {
    this.cursor = null;
    this.hasMore = true;
    this.container.querySelectorAll(':not(.scroll-sentinel)').forEach(el => el.remove());
  }
}

// Usage
const scroller = new InfiniteScroller({
  container: document.getElementById('story-list'),
  fetchFn: async (cursor) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    
    const response = await fetch(`/api/v1/libraries/${libraryId}/stories?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json().then(r => r.data);
  },
  renderFn: (story) => {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.innerHTML = `<h3>${story.title}</h3>`;
    return div;
  }
});
```

---

## Best Practices

1. **Default limits**: Always set sensible defaults (20) and maximums (100)
2. **Consistent ordering**: Include secondary sort by `id` for stability
3. **Count optimization**: Only fetch counts when needed (expensive)
4. **Cursor over offset**: Use cursors for real-time or large datasets
5. **Cache first page**: The first page is most frequently accessed
6. **Index sort columns**: Ensure database indexes on sort fields

---

**Last Updated**: December 23, 2025

