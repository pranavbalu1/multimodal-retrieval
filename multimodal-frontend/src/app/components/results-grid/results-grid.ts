import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Product } from '../../services/search';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe],
  templateUrl: './results-grid.html',
  styleUrls: ['./results-grid.scss']
})
export class ResultsGrid {
  @Input() products: Product[] = [];
}
