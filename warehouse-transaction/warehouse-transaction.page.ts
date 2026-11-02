import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { WmsTransactionService } from 'src/app/pages/WMS/.services/wms-transaction.service';

import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	WMS_ItemProvider,
	WMS_LocationProvider,
	WMS_TransactionProvider,
	WMS_ZoneProvider,
} from 'src/app/services/static/services.service';

@Component({
	selector: 'app-warehouse-transaction',
	templateUrl: './warehouse-transaction.page.html',
	styleUrls: ['./warehouse-transaction.page.scss'],
	standalone: false,
})
export class WarehouseTransactionPage extends PageBase {
	zoneList = [];
	storerList = [];
	locationList = [];
	selectedBranch = null;
	selectedStorer = null;
	selectedZone = null;
	selectedLocation = null;
	selectedItem = null;
	missingCount = 0;
	driftCount = 0;

	constructor(
		public pageProvider: WMS_TransactionProvider,
		public env: EnvService,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public router: Router,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public zoneProvider: WMS_ZoneProvider,
		public locationProvider: WMS_LocationProvider,
		public itemProvider: WMS_ItemProvider,
		public wmsTransaction: WmsTransactionService,
		public modalController: ModalController,

		public translate: TranslateService
	) {
		super();
		this.pageConfig.isShowFeature = true;
		this.pageConfig.isFeatureAsMain = true;
		this.formGroup = this.formBuilder.group({
			IDItem: [''],
			IDBranch: ['', Validators.required],
			IDStorer: [''],
			IDZone: [''],
			TransactionDateFrom: [this.dateMinusDay(1), Validators.required],
			TransactionDateTo: [this.getCurrentDate(), Validators.required],
			IsExcludeInternalTransaction: [false],
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					SortBy: ['Id_desc'],
					Take: 200,
					Skip: 0,
					Keyword: term
				});
			}),
		});
	}

	preLoadData(event) {
		this.contactProvider.read({ IsStorer: true, Take: 500, Skip: 0, SkipAddress: true }).then((resp) => {
			this.storerList = resp['data'];
		});
		const navState = this.router.getCurrentNavigation()?.extras.state;
		if (navState) {
			this.formGroup.patchValue(navState);
			if (navState.Item) {
				this.formGroup.get('_IDItemDataSource').value.selected.push(navState.Item);
			}
			this.formGroup.get('_IDItemDataSource').value.initSearch();
			this.firstLoad = false;
		}
		this.subscriptions.push(this.formGroup.get('IDBranch').valueChanges.subscribe(() => this.loadLedger()));
		if (this.formGroup.get('IDBranch').value) {
			this.loadLedger();
		}
		super.preLoadData(event);
	}

	loadLedger() {
		const warehouseId = this.formGroup.get('IDBranch').value;
		if (!warehouseId) {
			this.missingCount = 0;
			this.driftCount = 0;
			return;
		}
		this.wmsTransaction.reconcile({ IDBranch: warehouseId }).subscribe((rs: any) => {
			this.missingCount = rs?.MissingCount || 0;
			this.driftCount = rs?.DriftCount || 0;
			this.cdr.detectChanges();
		});
	}

	rebuildLedger() {
		const warehouseId = this.formGroup.get('IDBranch').value;
		if (!warehouseId) return;
		this.env
			.showPrompt('Rebuild the warehouse ledger from closed documents? Live lot quantities will be cleared and rewritten.', null, 'Rebuild stock ledger')
			.then((_) => {
				this.wmsTransaction.rebuild({ IDBranch: warehouseId, Confirmed: true }).subscribe((rs: any) => {
					if (rs?.Success) {
						this.env.showMessage('Saving completed!', 'success');
					} else {
						this.env.showMessage('Warehouse stock ledger is missing documents or lot quantities do not match the ledger.', 'warning');
					}
					this.loadLedger();
					if (!this.firstLoad) this.loadData(null);
				});
			})
			.catch(() => {});
	}
	subItem: any = {};
	firstLoad = true;
	itemById = new Map<number, any>();

	trackTransaction(index: number, item: any) {
		return item?.Id ?? index;
	}

	loadData(event) {
		if (this.firstLoad) {
			this.loadedData(event);
			return;
		}
		const paging = event?.type === 'ionInfinite';
		if (!paging) {
			this.items = [];
			this.pageConfig.isEndOfData = false;
		}
		this.query = this.formGroup.getRawValue();
		delete this.query._IDItemDataSource;
		this.query.SortBy = 'Id_desc';
		this.query.Take = 200;
		this.query.Skip = paging ? this.items.length : 0;
		this.pageProvider.commonService
			.connect('GET', 'WMS/Transaction', this.query)
			.toPromise()
			.then((rs: any) => {
				const refList = rs?._RefList || [];
				if (rs?._RefList) {
					const { _RefList, ...SubData } = rs;
					this.subItem = SubData;
					this.itemById = new Map((this.subItem._Items ?? []).map((item) => [item.Id, item]));
				}
				const page = this.buildTransactionRows(refList);
				this.items = paging ? [...this.items, ...page] : page;
				this.applyGroupHeaders(this.items);
				const count = Number(rs?.Count);
				this.pageConfig.isEndOfData = refList.length < this.query.Take || (count > 0 && this.items.length >= count);
				this.pageConfig.isSubActive = true;
				this.cdr.detectChanges();
				this.loadedData(event);
			})
			.catch(() => {
				this.loadedData(event);
			});
	}

	buildTransactionRows(refList: any[]) {
		return refList
			.slice()
			.sort((a, b) => new Date(b.TransactionDate).getTime() - new Date(a.TransactionDate).getTime())
			.map((row) => ({
				...row,
				_Item: this.itemById.get(row.IDItem),
				_groupHeader: null,
			}));
	}

	applyGroupHeaders(rows: any[]) {
		rows.forEach((row, index) => {
			row._groupHeader = null;
			if (index === 0) {
				row._groupHeader = lib.dateFormatFriendly(row.TransactionDate);
				return;
			}
			const prev = rows[index - 1];
			const mins = Math.floor(
				(new Date(prev.TransactionDate).getTime() - new Date(row.TransactionDate).getTime()) / 1000 / 60
			);
			if (mins >= 30) {
				const prevDate = lib.dateFormatFriendly(prev.TransactionDate);
				const currentDate = lib.dateFormatFriendly(row.TransactionDate);
				if (prevDate !== currentDate) {
					row._groupHeader = currentDate;
				}
			}
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);

		this.formGroup.get('_IDItemDataSource').value.initSearch();
		this.formGroup.enable();
	}

	changeFilter() {
		if (this.formGroup.invalid) return;
		const fromDate = new Date(this.formGroup.controls.TransactionDateFrom.value);
		const toDate = new Date(this.formGroup.controls.TransactionDateTo.value);
		if (fromDate > toDate) {
			this.env.showMessage('From date must be earlier than or equal to the To date!', 'danger');
			return;
		}
		const maxAllowedDate = new Date(fromDate);
		maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 3);

		if (toDate > maxAllowedDate) {
			this.env.showMessage('The difference between From Date and To Date should not exceed 3 months.', 'danger');
			return;
		}
		this.firstLoad = false;
		this.pageConfig.isSubActive = true;
		this.loadLedger();
		super.preLoadData(null);
	}

	changeIDBranch() {
		if (!this.formGroup.get('IDBranch').value) {
			this.zoneList = [];
			this.formGroup.get('');
		} else {
			this.zoneProvider.read({ IDBranch: this.formGroup.get('IDBranch').value }).then((resp) => {
				this.zoneList = resp['data'];
				let translateResult;
				this.translate.get('all').subscribe((message: string) => {
					translateResult = message;
				});
				this.selectZone();
			});
		}
	}

	selectZone() {
		if (!this.formGroup.get('IDZone').value) {
			this.changeFilter();
		} else {
			this.locationProvider
				.read({
					IDBranch: this.formGroup.get('IDBranch').value,
					IDZone: this.formGroup.get('IDZone').value,
				})
				.then((resp) => {
					this.locationList = resp['data'];
					let translateResult;
					this.translate.get('all').subscribe((message: string) => {
						translateResult = message;
					});
					this.changeFilter();
				});
		}
	}

	createWarehouseCard() {
		if (this.subItem._Items?.length > 0 && this.formGroup.valid) {
			let navigationExtras: NavigationExtras = {
				state: {
					items: this.items,
					query: this.query,
					subItem: this.subItem,
				},
			};
			this.nav('/stock-card', 'forward', navigationExtras);
		}
	}
	dateMinusDay(day: number): string {
		const date = new Date();
		date.setDate(date.getDate() - day);
		return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}

	getCurrentDate(): string {
		return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}
}
