import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonService } from 'src/app/services/core/common.service';

/** Custom ledger actions. CRUD stays on the generated WMS_TransactionProvider. */
@Injectable({ providedIn: 'root' })
export class WmsTransactionService {
	constructor(public commonService: CommonService) {}

	reconcile(query?: any): Observable<any> {
		return this.commonService.connect('GET', 'WMS/Transaction/Reconcile', query) as Observable<any>;
	}

	rebuild(body: any): Observable<any> {
		return this.commonService.connect('POST', 'WMS/Transaction/Rebuild', body) as Observable<any>;
	}
}
