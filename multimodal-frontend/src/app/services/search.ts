import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

// UI-facing product model. Keep this shape stable for component simplicity.
export interface Product {
  id: string;
  productDisplayName: string;
  similarity: number;
  imageUrl?: string | null;
}

// Raw backend model. IDs may arrive as number or string depending on serializer.
interface ApiProduct {
  id: string | number;
  productDisplayName: string;
  similarity: number;
  imageUrl?: string | null;
}

// Minimal GraphQL response envelope used by the text-search query.
interface SearchProductsResponse {
  data?: {
    searchProducts?: ApiProduct[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  // In dev, Angular proxy maps /api/* to Spring Boot.
  private apiUrl = '/api/graphql';
  private imageSearchApiUrl = '/api/image-search';

  // In dev, Angular proxy maps /image/* to FastAPI image endpoint.
  private imageApiPath = '/image';

  constructor(private http: HttpClient) {}

  // Build a safe URL path segment for the image id.
  private buildImageUrl(itemId: string): string {
    return `${this.imageApiPath}/${encodeURIComponent(itemId)}`;
  }

  // Normalize backend payload so the rest of the app can depend on one format.
  private normalizeProducts(products: ApiProduct[]): Product[] {
    return products.map((product) => {
      const id = String(product.id);
      return {
        id,
        productDisplayName: product.productDisplayName,
        similarity: product.similarity,
        // Prefer server-provided URL if present, else derive deterministic fallback.
        imageUrl: product.imageUrl?.trim() ? product.imageUrl : this.buildImageUrl(id)
      };
    });
  }

  // Submit GraphQL text search query.
  searchProducts(query: string, topN: number): Observable<Product[]> {
    const graphqlQuery = {
      query: `
        query SearchProducts($query: String!, $topN: Int!) {
          searchProducts(query: $query, topN: $topN) {
            id
            productDisplayName
            similarity
            # Add imageUrl when GraphQL schema exposes it.
            # imageUrl
          }
        }
      `,
      variables: {
        query,
        topN
      }
    };

    return this.http.post<SearchProductsResponse>(this.apiUrl, graphqlQuery).pipe(
      map((res) => this.normalizeProducts(res.data?.searchProducts ?? []))
    );
  }

  // Submit image search request as multipart form upload.
  searchProductsByImage(file: File, topN: number): Observable<Product[]> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topN', String(topN));

    return this.http.post<ApiProduct[]>(this.imageSearchApiUrl, formData).pipe(
      map((products) => this.normalizeProducts(products ?? []))
    );
  }
}
