import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CommonService } from 'src/app/services/core/common.service';
import { WmsTransactionService } from './wms-transaction.service';

describe('WmsTransactionService', () => {
	let connect: jasmine.Spy;
	let service: WmsTransactionService;

	beforeEach(() => {
		connect = jasmine.createSpy('connect').and.returnValue(of({}));
		TestBed.configureTestingModule({
			providers: [WmsTransactionService, { provide: CommonService, useValue: { connect } }],
		});
		service = TestBed.inject(WmsTransactionService);
	});

	it('reconcile reads the warehouse ledger gap', () => {
		service.reconcile({ IDBranch: 104 });
		expect(connect).toHaveBeenCalledWith('GET', 'WMS/Transaction/Reconcile', { IDBranch: 104 });
	});

	it('rebuild posts the confirmed warehouse', () => {
		const body = { IDBranch: 104, Confirmed: true };
		service.rebuild(body);
		expect(connect).toHaveBeenCalledWith('POST', 'WMS/Transaction/Rebuild', body);
	});
});
