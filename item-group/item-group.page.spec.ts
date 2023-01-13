import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ItemGroupPage } from './item-group.page';

describe('ItemGroupPage', () => {
  let component: ItemGroupPage;
  let fixture: ComponentFixture<ItemGroupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ItemGroupPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemGroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
