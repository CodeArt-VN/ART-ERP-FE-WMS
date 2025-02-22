import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CycleCountNotePage } from './cycle-count-note.page';

describe('CycleCountNotePage', () => {
	let component: CycleCountNotePage;
	let fixture: ComponentFixture<CycleCountNotePage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CycleCountNotePage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(CycleCountNotePage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
