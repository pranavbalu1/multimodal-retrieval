import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { SearchService } from './search';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
