import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, SearchService } from '../services/search';

export interface SearchState {
  query: string;
  products: Product[];
  loading: boolean;
  error: string;
  hasSearched: boolean;
}

type SearchAction =
  | { type: 'SEARCH_REQUEST'; payload: { query: string } }
  | { type: 'SEARCH_SUCCESS'; payload: { products: Product[] } }
  | { type: 'SEARCH_FAILURE'; payload: { error: string } };

const initialSearchState: SearchState = {
  query: '',
  products: [],
  loading: false,
  error: '',
  hasSearched: false
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SEARCH_REQUEST':
      return {
        ...state,
        query: action.payload.query,
        products: [],
        loading: true,
        error: '',
        hasSearched: true
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        products: action.payload.products,
        loading: false
      };
    case 'SEARCH_FAILURE':
      return {
        ...state,
        error: action.payload.error,
        loading: false
      };
    default:
      return state;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SearchStore {
  private readonly stateSubject = new BehaviorSubject<SearchState>(initialSearchState);
  readonly state$: Observable<SearchState> = this.stateSubject.asObservable();

  constructor(private searchService: SearchService) {}

  performSearch(query: string, topN: number): void {
    this.dispatch({
      type: 'SEARCH_REQUEST',
      payload: { query }
    });

    this.searchService.searchProducts(query, topN).subscribe({
      next: (products) => {
        this.dispatch({
          type: 'SEARCH_SUCCESS',
          payload: { products }
        });
      },
      error: () => {
        this.dispatch({
          type: 'SEARCH_FAILURE',
          payload: { error: 'Failed to fetch search results' }
        });
      }
    });
  }

  private dispatch(action: SearchAction): void {
    const nextState = searchReducer(this.stateSubject.value, action);
    this.stateSubject.next(nextState);
  }
}
