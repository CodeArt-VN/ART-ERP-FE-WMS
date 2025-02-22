import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PackingOrderPage } from './packing-order.page';

describe('PackingPage', () => {
	let component: PackingOrderPage;
	let fixture: ComponentFixture<PackingOrderPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PackingOrderPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(PackingOrderPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
