import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehousePage } from './warehouse.page';

describe('WarehousePage', () => {
  let component: WarehousePage;
  let fixture: ComponentFixture<WarehousePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WarehousePage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(WarehousePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
