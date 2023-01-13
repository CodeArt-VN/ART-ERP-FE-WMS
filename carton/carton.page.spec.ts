import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CartonPage } from './carton.page';

describe('CartonPage', () => {
  let component: CartonPage;
  let fixture: ComponentFixture<CartonPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CartonPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CartonPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
