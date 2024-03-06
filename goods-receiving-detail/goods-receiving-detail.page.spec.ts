import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GoodReceivingDetailPage } from './goods-receiving-detail.page';

describe('GoodReceivingDetailPage', () => {
  let component: GoodReceivingDetailPage;
  let fixture: ComponentFixture<GoodReceivingDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GoodReceivingDetailPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GoodReceivingDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
