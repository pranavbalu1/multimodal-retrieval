import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-indicator.html',
  styleUrls: ['./loading-indicator.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingIndicator {
  readonly placeholders = [1, 2, 3, 4];

  trackByIndex(index: number): number {
    return index;
  }
}
