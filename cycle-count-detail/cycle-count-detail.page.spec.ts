import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CycleCountDetailPage } from './cycle-count-detail.page';

describe('CycleCountDetailPage', () => {
  let component: CycleCountDetailPage;
  let fixture: ComponentFixture<CycleCountDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CycleCountDetailPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CycleCountDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
