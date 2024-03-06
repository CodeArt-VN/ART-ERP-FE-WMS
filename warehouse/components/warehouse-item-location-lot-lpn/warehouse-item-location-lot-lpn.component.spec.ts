import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehouseItemLocationLotLpnComponent } from './warehouse-item-location-lot-lpn.component';

describe('WarehouseItemLocationLotLpnComponent', () => {
  let component: WarehouseItemLocationLotLpnComponent;
  let fixture: ComponentFixture<WarehouseItemLocationLotLpnComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WarehouseItemLocationLotLpnComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseItemLocationLotLpnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
