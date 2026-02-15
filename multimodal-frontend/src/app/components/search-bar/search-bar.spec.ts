import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchBar } from './search-bar';

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
    spyOn(component.search, 'emit');
    component.query = 'red dress';
    component.topN = 30;

    component.onSearch();

    expect(component.search.emit).toHaveBeenCalledWith({
      query: 'red dress',
      topN: 30
    });
  });
});
