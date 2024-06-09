import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShippingDetailPage } from './shipping-detail.page';

describe('ShippingDetailPage', () => {
  let component: ShippingDetailPage;
  let fixture: ComponentFixture<ShippingDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ShippingDetailPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShippingDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
