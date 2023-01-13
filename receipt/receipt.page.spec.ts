import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ReceiptPage } from './receipt.page';

describe('ReceiptPage', () => {
  let component: ReceiptPage;
  let fixture: ComponentFixture<ReceiptPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ReceiptPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
