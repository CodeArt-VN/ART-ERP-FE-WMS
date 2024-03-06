import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AdjustmentPage } from './adjustment.page';

describe('AdjustmentPage', () => {
  let component: AdjustmentPage;
  let fixture: ComponentFixture<AdjustmentPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AdjustmentPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
