import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AdjustmentDetailPage } from './adjustment-detail.page';

describe('AdjustmentDetailPage', () => {
  let component: AdjustmentDetailPage;
  let fixture: ComponentFixture<AdjustmentDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AdjustmentDetailPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustmentDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
