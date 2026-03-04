import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, SearchService } from '../services/search';

// Central state for the search experience.
// Components subscribe to this shape and render deterministically.
export interface SearchState {
  query: string;
  products: Product[];
  loading: boolean;
  error: string;
  hasSearched: boolean;
}

// Reducer actions define all legal state transitions.
type SearchAction =
  | { type: 'SEARCH_REQUEST'; payload: { query: string } }
  | { type: 'SEARCH_SUCCESS'; payload: { products: Product[] } }
  | { type: 'SEARCH_FAILURE'; payload: { error: string } };

// Initial UI state before first user interaction.
const initialSearchState: SearchState = {
  query: '',
  products: [],
  loading: false,
  error: '',
  hasSearched: false
};

// Pure reducer function: no side effects, state-in/action-in -> state-out.
function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SEARCH_REQUEST':
      return {
        ...state,
        query: action.payload.query,
        products: [], // clear stale results as soon as new request starts
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
  // BehaviorSubject always has a current value, ideal for app state containers.
  private readonly stateSubject = new BehaviorSubject<SearchState>(initialSearchState);

  // Public observable used by components (read-only stream).
  readonly state$: Observable<SearchState> = this.stateSubject.asObservable();

  constructor(private searchService: SearchService) {}

  // Kick off text search and map async response to reducer actions.
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

  // Kick off image search and map async response to reducer actions.
  performImageSearch(file: File, topN: number): void {
    this.dispatch({
      type: 'SEARCH_REQUEST',
      payload: { query: `Image: ${file.name}` }
    });

    this.searchService.searchProductsByImage(file, topN).subscribe({
      next: (products) => {
        this.dispatch({
          type: 'SEARCH_SUCCESS',
          payload: { products }
        });
      },
      error: () => {
        this.dispatch({
          type: 'SEARCH_FAILURE',
          payload: { error: 'Failed to fetch image search results' }
        });
      }
    });
  }

  // Internal reducer dispatcher.
  private dispatch(action: SearchAction): void {
    const nextState = searchReducer(this.stateSubject.value, action);
    this.stateSubject.next(nextState);
  }
}
