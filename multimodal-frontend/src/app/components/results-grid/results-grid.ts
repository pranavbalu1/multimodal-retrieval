import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
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
export class ResultsGrid {
  @Input() products: Product[] = [];
  @Input() hasSearched = false;
  @Input() query = '';

  trackByProductId(_: number, product: Product): string {
    return product.id;
  }

  getSimilarityPercent(similarity: number): number {
    return Math.max(0, Math.min(100, similarity * 100));
  }

  getConfidenceLabel(similarity: number): string {
    if (similarity >= 0.12) {
      return 'High match';
    }
    if (similarity >= 0.08) {
      return 'Moderate match';
    }
    return 'Candidate match';
  }
}
