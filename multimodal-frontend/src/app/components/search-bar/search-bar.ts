import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  readonly quickQueries = [
    'red floral nightdress',
    'formal black blazer',
    'running shoes for men'
  ];

  @Output() search = new EventEmitter<string>();

  onSearch() {
    if (this.query.trim()) {
      this.search.emit(this.query.trim());
    }
  }

  useQuickQuery(query: string) {
    this.query = query;
    this.onSearch();
  }
}
