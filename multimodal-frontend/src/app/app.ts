import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SearchBar } from './components/search-bar/search-bar';
import { ImageUpload } from './components/image-upload/image-upload';
import { ResultsGrid } from './components/results-grid/results-grid';
import { LoadingIndicator } from './components/loading-indicator/loading-indicator';
import { Product, SearchService } from './services/search';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SearchBar, ImageUpload, ResultsGrid, LoadingIndicator],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  readonly pageSize = 6;

  products: Product[] = [];
  pagedProducts: Product[] = [];
  currentPage = 1;
  loading = false;
  error = '';
  selectedImageName = '';

  constructor(private searchService: SearchService) {}

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.products.length / this.pageSize));
  }

  get hasResults(): boolean {
    return this.products.length > 0;
  }

  onImageSelected(file: File | null): void {
    this.selectedImageName = file?.name ?? '';
  }

  performSearch(query: string): void {
    this.loading = true;
    this.error = '';
    this.currentPage = 1;

    this.searchService.searchProducts(query, 24).subscribe({
      next: (products) => {
        this.products = products;
        this.updatePagedProducts();
        this.loading = false;
      },
      error: (error: Error) => {
        this.products = [];
        this.pagedProducts = [];
        this.error = error.message || 'Failed to fetch search results. Please try again.';
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
      this.updatePagedProducts();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.updatePagedProducts();
    }
  }

  private updatePagedProducts(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedProducts = this.products.slice(start, end);
  }
}
