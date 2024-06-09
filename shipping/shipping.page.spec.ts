import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShippingPage } from './shipping.page';

describe('ShippingPage', () => {
  let component: ShippingPage;
  let fixture: ComponentFixture<ShippingPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ShippingPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShippingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
