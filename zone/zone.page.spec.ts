import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ZonePage } from './zone.page';

describe('ZonePage', () => {
	let component: ZonePage;
	let fixture: ComponentFixture<ZonePage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ZonePage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(ZonePage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
