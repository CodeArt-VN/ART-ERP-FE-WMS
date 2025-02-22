import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PickingOrderPage } from './picking-order.page';

describe('PickingOrderPage', () => {
	let component: PickingOrderPage;
	let fixture: ComponentFixture<PickingOrderPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PickingOrderPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(PickingOrderPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
