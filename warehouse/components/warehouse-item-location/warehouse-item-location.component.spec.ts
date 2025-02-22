import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WarehouseItemLocationComponent } from './warehouse-item-location.component';

describe('WarehouseItemLocationComponent', () => {
	let component: WarehouseItemLocationComponent;
	let fixture: ComponentFixture<WarehouseItemLocationComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [WarehouseItemLocationComponent],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(WarehouseItemLocationComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
