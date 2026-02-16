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

interface SearchProductsResponse {
  data?: {
    searchProducts?: Product[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = '/api/graphql';
  private imageApiPath = '/image';

  constructor(private http: HttpClient) {}

  private buildImageUrl(itemId: string): string {
    return `${this.imageApiPath}/${encodeURIComponent(itemId)}`;
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
      map((res) => (res.data?.searchProducts ?? []).map((product) => ({
        ...product,
        imageUrl: product.imageUrl?.trim()
          ? product.imageUrl
          : this.buildImageUrl(product.id)
      })))
    );
  }
}
