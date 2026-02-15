import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../services/search';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-grid.html',
  styleUrls: ['./results-grid.scss']
})
export class ResultsGrid {
  @Input() products: Product[] = [];
}
