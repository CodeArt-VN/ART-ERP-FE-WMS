import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehouseTransactionPage } from './warehouse-transaction.page';

describe('WarehouseTransactionComponent', () => {
	let component: WarehouseTransactionPage;
	let fixture: ComponentFixture<WarehouseTransactionPage>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [WarehouseTransactionPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(WarehouseTransactionPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
