import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsGrid } from './results-grid';

describe('ResultsGrid', () => {
  let component: ResultsGrid;
  let fixture: ComponentFixture<ResultsGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
