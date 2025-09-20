import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumbersChartComponent } from './numbers-chart.component';

describe('NumbersChartComponent', () => {
  let component: NumbersChartComponent;
  let fixture: ComponentFixture<NumbersChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NumbersChartComponent]
    });
    fixture = TestBed.createComponent(NumbersChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
