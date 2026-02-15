import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SearchBar, SearchRequest } from './components/search-bar/search-bar';
import { ResultsGrid } from './components/results-grid/results-grid';
import { LoadingIndicator } from './components/loading-indicator/loading-indicator';
import { SearchState, SearchStore } from './store/search.store';

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
  styleUrls: ['./app.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  state$: Observable<SearchState>;

  constructor(private searchStore: SearchStore) {
    this.state$ = this.searchStore.state$;
  }

  performSearch(request: SearchRequest) {
    this.searchStore.performSearch(request.query, request.topN);
  }
}
