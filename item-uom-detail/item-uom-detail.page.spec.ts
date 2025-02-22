import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemUomDetailPage } from './item-uom-detail.page';

describe('ItemUomDetailPage', () => {
	let component: ItemUomDetailPage;
	let fixture: ComponentFixture<ItemUomDetailPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ItemUomDetailPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ItemUomDetailPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
