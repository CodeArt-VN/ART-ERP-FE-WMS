import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OutboundOrderDetailPage } from './outbound-order-detail.page';

describe('OutboundOrderDetailPage', () => {
	let component: OutboundOrderDetailPage;
	let fixture: ComponentFixture<OutboundOrderDetailPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [OutboundOrderDetailPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(OutboundOrderDetailPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
