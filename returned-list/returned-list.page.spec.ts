import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ReturnedLlistPage } from './returned-list.page';

describe('ReturnedLlistPage', () => {
  let component: ReturnedLlistPage;
  let fixture: ComponentFixture<ReturnedLlistPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ReturnedLlistPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnedLlistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
