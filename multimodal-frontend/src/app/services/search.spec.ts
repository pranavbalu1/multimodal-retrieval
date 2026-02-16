import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SearchService } from './search';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch search results and normalize imageUrl', () => {
    const mockResponse = {
      data: {
        searchProducts: [
          {
            id: '52488',
            productDisplayName: 'red rose red camisole',
            similarity: 0.11805034707406736
          }
        ]
      }
    };

    service.searchProducts('red rose', 5).subscribe((products) => {
      expect(products.length).toBe(1);
      expect(products[0].id).toBe('52488');
      expect(products[0].imageUrl).toBe('/image/52488');
    });

    const req = httpMock.expectOne('/api/graphql');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.variables).toEqual({
      query: 'red rose',
      topN: 5
    });
    req.flush(mockResponse);
  });

  it('should upload image and normalize ids/imageUrls', () => {
    const file = new Blob(['fake-image'], { type: 'image/jpeg' }) as File;
    Object.defineProperty(file, 'name', { value: 'query.jpg' });
    const mockResponse = [
      {
        id: 1163,
        productDisplayName: 'sample product',
        similarity: 0.912
      }
    ];

    service.searchProductsByImage(file, 7).subscribe((products) => {
      expect(products.length).toBe(1);
      expect(products[0].id).toBe('1163');
      expect(products[0].imageUrl).toBe('/image/1163');
    });

    const req = httpMock.expectOne('/api/image-search');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('topN')).toBe('7');
    expect(body.get('file')).toBe(file);
    req.flush(mockResponse);
  });
});
