import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  productDisplayName: string;
  similarity: number;
  imageUrl?: string | null;
}

interface ApiProduct {
  id: string | number;
  productDisplayName: string;
  similarity: number;
  imageUrl?: string | null;
}

interface SearchProductsResponse {
  data?: {
    searchProducts?: ApiProduct[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = '/api/graphql';
  private imageSearchApiUrl = '/api/image-search';
  private imageApiPath = '/image';

  constructor(private http: HttpClient) {}

  private buildImageUrl(itemId: string): string {
    return `${this.imageApiPath}/${encodeURIComponent(itemId)}`;
  }

  private normalizeProducts(products: ApiProduct[]): Product[] {
    return products.map((product) => {
      const id = String(product.id);
      return {
        id,
        productDisplayName: product.productDisplayName,
        similarity: product.similarity,
        imageUrl: product.imageUrl?.trim() ? product.imageUrl : this.buildImageUrl(id)
      };
    });
  }

  searchProducts(query: string, topN: number): Observable<Product[]> {
    const graphqlQuery = {
      query: `
        query SearchProducts($query: String!, $topN: Int!) {
          searchProducts(query: $query, topN: $topN) {
            id
            productDisplayName
            similarity
            # Add imageUrl here when backend schema supports it.
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

  searchProductsByImage(file: File, topN: number): Observable<Product[]> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topN', String(topN));

    return this.http.post<ApiProduct[]>(this.imageSearchApiUrl, formData).pipe(
      map((products) => this.normalizeProducts(products ?? []))
    );
  }
}
