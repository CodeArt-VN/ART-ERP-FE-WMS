import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OutboundOrderPage } from './outbound-order.page';

describe('OutboundOrderPage', () => {
	let component: OutboundOrderPage;
	let fixture: ComponentFixture<OutboundOrderPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [OutboundOrderPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(OutboundOrderPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
