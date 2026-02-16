import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageSearchRequest, SearchBar, SearchRequest } from './search-bar';

describe('SearchBar', () => {
  let component: SearchBar;
  let fixture: ComponentFixture<SearchBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit query and selected result count on search', () => {
    let emitted: SearchRequest | undefined;
    component.search.subscribe((value) => {
      emitted = value;
    });

    component.query = 'red dress';
    component.topN = 30;

    component.onSearch();

    expect(emitted).toEqual({
      query: 'red dress',
      topN: 30
    });
  });

  it('should emit image search request when image is selected', () => {
    let emitted: ImageSearchRequest | undefined;
    component.imageSearch.subscribe((value) => {
      emitted = value;
    });

    const file = new Blob(['fake-image'], { type: 'image/jpeg' }) as File;
    Object.defineProperty(file, 'name', { value: 'query.jpg' });
    component.topN = 10;
    component.selectedImageFile = file;

    component.onImageSearch();

    expect(emitted).toEqual({
      file,
      topN: 10
    });
  });
});
