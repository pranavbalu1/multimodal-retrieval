import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchRequest {
  query: string;
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
  readonly quickQueries = [
    'red floral dress',
    'formal black blazer',
    'running shoes for men'
  ];
  readonly topNOptions = [5, 10, 20, 30, 50];

  @Output() search = new EventEmitter<SearchRequest>();

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
}
