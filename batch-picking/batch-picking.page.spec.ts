import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BatchPickingPage } from './batch-picking.page';

describe('BatchPickingPage', () => {
  let component: BatchPickingPage;
  let fixture: ComponentFixture<BatchPickingPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BatchPickingPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchPickingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
