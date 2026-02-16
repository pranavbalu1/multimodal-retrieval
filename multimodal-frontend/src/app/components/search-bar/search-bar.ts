import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchRequest {
  query: string;
  topN: number;
}

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
  query = '';
  topN = 20;
  selectedImageFile: File | null = null;
  selectedImageName = '';
  readonly quickQueries = [
    'red floral dress',
    'formal black blazer',
    'running shoes for men'
  ];
  readonly topNOptions = [5, 10, 20, 30, 50];

  @Output() search = new EventEmitter<SearchRequest>();
  @Output() imageSearch = new EventEmitter<ImageSearchRequest>();

  onSearch() {
    const trimmedQuery = this.query.trim();
    if (trimmedQuery) {
      this.search.emit({
        query: trimmedQuery,
        topN: this.topN
      });
    }
  }

  useQuickQuery(query: string) {
    this.query = query;
    this.onSearch();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedImageFile = file;
    this.selectedImageName = file ? file.name : '';
  }

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
