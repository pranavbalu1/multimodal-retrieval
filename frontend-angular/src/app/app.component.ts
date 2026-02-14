import { Component } from '@angular/core';
import { SearchBarComponent } from '../app/components/search-bar/search-bar.component';
import { ImageUploadComponent } from '../app/components/image-upload/image-upload.component';
import { LoadingIndicatorComponent } from '../app/components/loading-indicator/loading-indicator.component';
import { ResultsGridComponent } from '../app/components/results-grid/results-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SearchBarComponent,
    ImageUploadComponent,
    LoadingIndicatorComponent,
    ResultsGridComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Product Search App';
}
