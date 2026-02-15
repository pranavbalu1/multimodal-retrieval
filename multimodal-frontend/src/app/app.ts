import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { SearchBar } from './components/search-bar/search-bar';
import { ResultsGrid } from './components/results-grid/results-grid';
import { LoadingIndicator } from './components/loading-indicator/loading-indicator';
import { SearchService, Product } from './services/search';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    SearchBar,
    ResultsGrid,
    LoadingIndicator
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  products: Product[] = [];
  loading = false;
  error = '';

  constructor(private searchService: SearchService) {}

  performSearch(query: string) {
    console.log("Searching for:", query);

    this.loading = true;
    this.error = '';
    this.products = [];

    this.searchService.searchProducts(query, 5).subscribe({
      next: (res) => {
        console.log("RAW RESPONSE:", res);
        this.products = res;
        console.log("PRODUCTS SET TO:", this.products);
        this.loading = false;
      },
      error: (err) => {
        console.error("ERROR:", err);
        this.error = 'Failed to fetch search results';
        this.loading = false;
      }
    });
  }

}
