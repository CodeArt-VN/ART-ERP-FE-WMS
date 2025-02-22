import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneDetailPage } from './zone-detail.page';

describe('ZoneDetailPage', () => {
	let component: ZoneDetailPage;
	let fixture: ComponentFixture<ZoneDetailPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ZoneDetailPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ZoneDetailPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
