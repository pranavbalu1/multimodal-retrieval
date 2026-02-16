import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ResultsGrid } from './results-grid';

describe('ResultsGrid', () => {
  let component: ResultsGrid;
  let fixture: ComponentFixture<ResultsGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show anything before first search', () => {
    component.hasSearched = false;
    component.products = [];
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('.results-section'));
    expect(section).toBeNull();
  });

  it('should show empty state after search with no products', () => {
    component.hasSearched = true;
    component.query = 'red rose';
    component.products = [];
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState.nativeElement.textContent).toContain('No products found');
    expect(emptyState.nativeElement.textContent).toContain('red rose');
  });

  it('should render a card with placeholder when imageUrl is missing', () => {
    component.hasSearched = true;
    component.products = [
      {
        id: '52488',
        productDisplayName: 'red rose red camisole',
        similarity: 0.11805034707406736,
        imageUrl: null
      }
    ];
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('.result-card'));
    expect(card).toBeTruthy();
    expect(card.nativeElement.textContent).toContain('red rose red camisole');
    expect(card.nativeElement.textContent).toContain('ID: 52488');
    const placeholder = fixture.debugElement.query(By.css('.result-card__placeholder'));
    expect(placeholder).toBeTruthy();
  });

  it('should render product image when imageUrl exists', () => {
    component.hasSearched = true;
    component.products = [
      {
        id: '52488',
        productDisplayName: 'red rose red camisole',
        similarity: 0.11805034707406736,
        imageUrl: 'https://example.com/product.jpg'
      }
    ];
    fixture.detectChanges();

    const image = fixture.debugElement.query(By.css('img'));
    expect(image).toBeTruthy();
    expect(image.nativeElement.getAttribute('src')).toContain('product.jpg');
  });

  it('should fall back to placeholder after image load error', () => {
    component.hasSearched = true;
    component.products = [
      {
        id: '52488',
        productDisplayName: 'red rose red camisole',
        similarity: 0.11805034707406736,
        imageUrl: '/image/52488'
      }
    ];
    fixture.detectChanges();

    component.handleImageError('52488');
    fixture.detectChanges();

    const image = fixture.debugElement.query(By.css('img'));
    const placeholder = fixture.debugElement.query(By.css('.result-card__placeholder'));
    expect(image).toBeNull();
    expect(placeholder).toBeTruthy();
  });

  it('should paginate results when product count exceeds page size', () => {
    component.hasSearched = true;
    component.products = Array.from({ length: 12 }, (_, index) => ({
      id: `${index + 1}`,
      productDisplayName: `product-${index + 1}`,
      similarity: 0.2
    }));
    fixture.detectChanges();

    const pageOneCards = fixture.debugElement.queryAll(By.css('.result-card'));
    expect(pageOneCards.length).toBe(component.pageSize);
    expect(fixture.nativeElement.textContent).toContain(`Showing 1-${component.pageSize} of 12`);

    component.goToPage(2);
    fixture.detectChanges();

    const pageTwoCards = fixture.debugElement.queryAll(By.css('.result-card'));
    expect(pageTwoCards.length).toBe(12 - component.pageSize);
    expect(fixture.nativeElement.textContent).toContain(`Showing ${component.pageSize + 1}-12 of 12`);
  });
});
