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
  readonly pageSize = 8;
  @Input() products: Product[] = [];
  @Input() hasSearched = false;
  @Input() query = '';
  currentPage = 1;
  private failedImageIds = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      this.currentPage = 1;
      this.failedImageIds.clear();
    }
  }

  trackByProductId(_: number, product: Product): string {
    return product.id;
  }

  shouldShowImage(product: Product): boolean {
    return Boolean(product.imageUrl) && !this.failedImageIds.has(product.id);
  }

  getImageUrl(product: Product): string {
    return product.imageUrl ?? '';
  }

  handleImageError(productId: string): void {
    this.failedImageIds.add(productId);
  }

  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.products.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.products.length / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get displayStart(): number {
    if (!this.products.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get displayEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.products.length);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  getSimilarityPercent(similarity: number): number {
    return Math.max(0, Math.min(100, similarity * 100));
  }

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
