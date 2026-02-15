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
});
