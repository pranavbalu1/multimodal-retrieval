import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../services/search';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-grid.html',
  styleUrls: ['./results-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsGrid implements OnChanges {
  // Fixed number of products shown in each pagination page.
  readonly pageSize = 8;

  // Inputs supplied by parent component/store.
  @Input() products: Product[] = [];
  @Input() hasSearched = false;
  @Input() query = '';

  // Current page index (1-based for easier template display logic).
  currentPage = 1;

  // Product ids whose image URL failed to load.
  // We use this cache to avoid repeatedly requesting broken images.
  private failedImageIds = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      // New result set should always start from first page.
      this.currentPage = 1;

      // Old image-failure state should not leak into new searches.
      this.failedImageIds.clear();
    }
  }

  // trackBy improves rendering performance for ngFor updates.
  trackByProductId(_: number, product: Product): string {
    return product.id;
  }

  // Render image only if URL exists and hasn't previously failed.
  shouldShowImage(product: Product): boolean {
    return Boolean(product.imageUrl) && !this.failedImageIds.has(product.id);
  }

  // Template helper to avoid optional chaining in HTML binding expressions.
  getImageUrl(product: Product): string {
    return product.imageUrl ?? '';
  }

  // Called by (error) event on <img> to mark image as failed.
  handleImageError(productId: string): void {
    this.failedImageIds.add(productId);
  }

  // Slice products array to current page window.
  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.products.slice(start, start + this.pageSize);
  }

  // Number of pagination pages for current result set.
  get totalPages(): number {
    return Math.ceil(this.products.length / this.pageSize);
  }

  // Build array [1..N] for page-number buttons.
  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  // Inclusive display range start shown in pagination summary text.
  get displayStart(): number {
    if (!this.products.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  // Inclusive display range end shown in pagination summary text.
  get displayEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.products.length);
  }

  // Jump to a specific valid page.
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  // Convenience nav actions.
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // Convert 0..1 similarity into 0..100 for UI labels and progress bars.
  getSimilarityPercent(similarity: number): number {
    return Math.max(0, Math.min(100, similarity * 100));
  }

  // Lightweight heuristic labels used purely for UX readability.
  getConfidenceLabel(similarity: number): string {
    if (similarity >= 0.225) {
      return 'High match';
    }
    if (similarity >= 0.16) {
      return 'Moderate match';
    }
    return 'Candidate match';
  }
}
