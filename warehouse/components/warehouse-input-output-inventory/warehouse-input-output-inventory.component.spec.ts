import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehouseInputOutputInventoryComponent } from './warehouse-input-output-inventory.component';

describe('WarehouseInputOutputInventoryComponent', () => {
  let component: WarehouseInputOutputInventoryComponent;
  let fixture: ComponentFixture<WarehouseInputOutputInventoryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ WarehouseInputOutputInventoryComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseInputOutputInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
