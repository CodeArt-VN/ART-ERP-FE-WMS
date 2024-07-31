import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehouseInputOutputInventoryPage } from './warehouse-input-output-inventory.page';

describe('WarehouseInputOutputInventoryComponent', () => {
  let component: WarehouseInputOutputInventoryPage;
  let fixture: ComponentFixture<WarehouseInputOutputInventoryPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WarehouseInputOutputInventoryPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseInputOutputInventoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
