import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Product, SearchService } from '../services/search';
import { SearchState, SearchStore } from './search.store';

describe('SearchStore', () => {
  let store: SearchStore;
  let searchService: jasmine.SpyObj<SearchService>;

  beforeEach(() => {
    const searchServiceSpy = jasmine.createSpyObj<SearchService>('SearchService', ['searchProducts']);

    TestBed.configureTestingModule({
      providers: [SearchStore, { provide: SearchService, useValue: searchServiceSpy }]
    });

    store = TestBed.inject(SearchStore);
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
  });

  it('should update state on successful search', () => {
    const response$ = new Subject<Product[]>();
    let latestState: SearchState | undefined;
    const expectedProducts: Product[] = [
      {
        id: '52488',
        productDisplayName: 'red rose red camisole',
        similarity: 0.11805034707406736,
        imageUrl: null
      }
    ];

    searchService.searchProducts.and.returnValue(response$.asObservable());
    store.state$.subscribe((state) => {
      latestState = state;
    });

    store.performSearch('red rose', 5);
    expect(searchService.searchProducts).toHaveBeenCalledWith('red rose', 5);
    expect(latestState?.loading).toBeTrue();

    response$.next(expectedProducts);
    response$.complete();

    expect(latestState?.loading).toBeFalse();
    expect(latestState?.products.length).toBe(1);
  });

  it('should update error state on failed search', () => {
    const response$ = new Subject<Product[]>();
    let latestState: SearchState | undefined;

    searchService.searchProducts.and.returnValue(response$.asObservable());
    store.state$.subscribe((state) => {
      latestState = state;
    });

    store.performSearch('red rose', 5);
    response$.error(new Error('network error'));

    expect(latestState?.loading).toBeFalse();
    expect(latestState?.error).toBe('Failed to fetch search results');
  });
});
