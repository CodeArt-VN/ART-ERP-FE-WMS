import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GoodsReceivingPage } from './goods-receiving.page';

describe('GoodsReceivingPage', () => {
  let component: GoodsReceivingPage;
  let fixture: ComponentFixture<GoodsReceivingPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GoodsReceivingPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GoodsReceivingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
