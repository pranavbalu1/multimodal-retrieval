import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  productDisplayName: string;
  similarity: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = '/api/graphql';

  constructor(private http: HttpClient) {}

  searchProducts(query: string, topN: number): Observable<Product[]> {
    const graphqlQuery = {
      query: `
        query {
          searchProducts(query: "${query}", topN: ${topN}) {
            id
            productDisplayName
            similarity
          }
        }
      `
    };

    return this.http.post<any>(this.apiUrl, graphqlQuery).pipe(
      map((res) => res.data?.searchProducts || [])
    );
  }
}
