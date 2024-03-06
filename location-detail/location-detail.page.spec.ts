import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationDetailPage } from './location-detail.page';

describe('LocationDetailPage', () => {
  let component: LocationDetailPage;
  let fixture: ComponentFixture<LocationDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LocationDetailPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
