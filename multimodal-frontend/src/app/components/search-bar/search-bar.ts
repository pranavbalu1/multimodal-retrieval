import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Payload emitted for text search requests.
export interface SearchRequest {
  query: string;
  topN: number;
}

// Payload emitted for image search requests.
export interface ImageSearchRequest {
  file: File;
  topN: number;
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBar {
  // Two-way bound query input value.
  query = '';

  // Default result count request.
  topN = 20;

  // Image upload state.
  selectedImageFile: File | null = null;
  selectedImageName = '';

  // Convenience query presets for demos and quick testing.
  readonly quickQueries = [
    'red floral dress',
    'formal black blazer',
    'running shoes for men'
  ];

  // Valid topN options shown in dropdown.
  readonly topNOptions = [5, 10, 20, 30, 50];

  // Parent component listens to these outputs and dispatches store actions.
  @Output() search = new EventEmitter<SearchRequest>();
  @Output() imageSearch = new EventEmitter<ImageSearchRequest>();

  // Trigger text search if query is non-empty after trimming whitespace.
  onSearch() {
    const trimmedQuery = this.query.trim();
    if (trimmedQuery) {
      this.search.emit({
        query: trimmedQuery,
        topN: this.topN
      });
    }
  }

  // Click handler for "quick query" pill buttons.
  useQuickQuery(query: string) {
    this.query = query;
    this.onSearch();
  }

  // Capture selected file from native input element.
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImageFile = file;
    this.selectedImageName = file ? file.name : '';
  }

  // Trigger image search only when a file has been selected.
  onImageSearch() {
    if (!this.selectedImageFile) {
      return;
    }

    this.imageSearch.emit({
      file: this.selectedImageFile,
      topN: this.topN
    });
  }
}
