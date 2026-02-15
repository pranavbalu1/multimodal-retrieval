import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render search bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const searchBar = fixture.debugElement.query(By.css('app-search-bar'));
    expect(searchBar).toBeTruthy();
  });
});
