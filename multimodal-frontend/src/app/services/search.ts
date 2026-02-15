import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

export interface Product {
  id: string;
  productDisplayName: string;
  similarity: number;
}

interface SearchResponse {
  data?: {
    searchProducts?: Product[];
  };
  errors?: Array<{ message: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly apiUrl = '/api/graphql';

  constructor(private http: HttpClient) {}

  searchProducts(query: string, topN: number): Observable<Product[]> {
    const body = {
      query: `
        query SearchProducts($query: String!, $topN: Int!) {
          searchProducts(query: $query, topN: $topN) {
            id
            productDisplayName
            similarity
          }
        }
      `,
      variables: {
        query,
        topN
      }
    };

    return this.http.post<SearchResponse>(this.apiUrl, body).pipe(
      map((response) => {
        if (response.errors?.length) {
          throw new Error(response.errors[0].message);
        }

        return response.data?.searchProducts ?? [];
      }),

      catchError(() => {
        return throwError(() => new Error('Could not reach backend service.'));

      })
    );
  }
}
