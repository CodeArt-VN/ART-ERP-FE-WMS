import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CycleCountPage } from './cycle-count.page';

describe('CycleCountPage', () => {
	let component: CycleCountPage;
	let fixture: ComponentFixture<CycleCountPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CycleCountPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(CycleCountPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
