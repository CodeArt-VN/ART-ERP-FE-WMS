import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { CRM_ContactProvider, WMS_ItemProvider, WMS_TransactionProvider } from 'src/app/services/static/services.service';
import QRCode from 'qrcode';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
	selector: 'app-stock-card',
	templateUrl: 'stock-card.page.html',
	styleUrls: ['stock-card.page.scss'],
	standalone: false,
})
export class StockCardPage extends PageBase {
	currentDate = new Date();
	storerList;
	branchList;
	sheets = [];
	constructor(
		//public pageProvider: WMS_StockCardProvider,
		public pageProvider: WMS_TransactionProvider,
		public itemProvider: WMS_ItemProvider,
		public contactProvider: CRM_ContactProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public router: Router,
		public formBuilder: FormBuilder
	) {
		super();
		this.pageConfig.isShowFeature = true;
		this.pageConfig.isFeatureAsMain = true;
		this.formGroup = this.formBuilder.group({
			IDItem: ['', Validators.required],
			IDBranch: ['', Validators.required],
			IDStorer: [''],
			TransactionDateFrom: [this.dateMinusMonths(3), Validators.required],
			TransactionDateTo: [this.getCurrentDate(), Validators.required],
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					SortBy: ['Id_desc'],
					Take: 200,
					Skip: 0,
					Keyword: term
				});
			}),
		});
		// this.formGroup.get('IDBranch').setValue(1005);
		// this.formGroup.get('IDItem').setValue(61843);
	}

	preLoadData(event?: any): void {
		this.fromDate = this.formGroup.get('TransactionDateFrom').value;
		this.toDate = this.formGroup.get('TransactionDateTo').value;
		this.subscriptions.push(
			this.route.queryParams.subscribe(() => {
				const navState = this.router.getCurrentNavigation()?.extras.state;
				if (navState) {
					if (navState.query) {
						this.formGroup.patchValue(navState.query);
					}
					if (navState.subItem) {
						this.subItem = navState.subItem;
						this.formGroup.get('_IDItemDataSource').value.selected = [...this.subItem._Items];
					} else if (navState.Item) {
						this.formGroup.get('_IDItemDataSource').value.selected = [navState.Item];
					}
					this.formGroup.get('_IDItemDataSource').value.initSearch();
					this.fromDate = this.formGroup.get('TransactionDateFrom').value;
					this.toDate = this.formGroup.get('TransactionDateTo').value;
					if (navState.items) {
						this.patchValue(navState.items);
					} else if (this.formGroup.get('IDItem').value) {
						this.changeFilter();
					}
				}
				this.loadedData(event);
			})
		);
		this.branchList = [...this.env.branchList];
		this.contactProvider.read({ IsStorer: true }).then((resp) => {
			this.storerList = resp['data'];
		});
	}
	subItem: any = {};
	loadData(event?: any): void {
		this.query = this.formGroup.getRawValue();
		delete this.query._IDItemDataSource;
		this.query.SortBy = 'Id_desc';
		this.pageConfig.showSpinner = true;
		this.pageProvider.commonService
			.connect('GET', 'WMS/Transaction', this.query)
			.toPromise()
			.then((rs: any) => {
				if (Array.isArray(rs._RefList)) {
					const { _RefList, ...SubData } = rs;
					this.items = _RefList;
					this.subItem = SubData;
					this.items.forEach((i) => {
						let item = this.subItem._Items?.find((d) => d.Id == i.IDItem);
						i._Item = item;
					});
				}
				this.loadedData(event);
			})
			.catch((err) => {
				this.loadedData(event);
			});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);

		this.formGroup.get('_IDItemDataSource').value.initSearch();
		this.formGroup.enable();
		if (!this.formGroup.get('IDBranch').value) {
			this.getNearestWarehouse(this.env.selectedBranch);
		}
	}
	fromDate;
	toDate;
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
		this.pageConfig.isSubActive = true;
		this.query = this.formGroup.getRawValue();
		this.fromDate = this.query.TransactionDateFrom;
		this.toDate = this.query.TransactionDateTo;
		delete this.query._IDItemDataSource;
		this.pageConfig.isEndOfData = false;
		this.currentDate = new Date();
		this.item = {};
		this.pageConfig.showSpinner = true;
		this.pageProvider.commonService
			.connect('GET', 'WMS/Transaction', this.query)
			.toPromise()
			.then((rs: any) => {
				if (Array.isArray(rs._RefList)) {
					const { _RefList, ...SubData } = rs;
					this.items = _RefList;
					this.subItem = SubData;
					this.items.forEach((i) => {
						let item = this.subItem._Items?.find((d) => d.Id == i.IDItem);
						i._Item = item;
					});
					this.patchValue(this.items);
				}
				this.loadedData();
			})
			.catch((err) => {
				this.env.showMessage(err.error?.InnerException?.ExceptionMessage || err, 'danger');
				this.loadedData();
			});
	}
	patchValue(data) {
		this.item = {};
		//    this.sheets = [];
		this.subItem.SplitOpeningQuantity = (this.subItem._SplitOpeningQuantity ?? [])
			.map((s) => s.Quantity + ' ' + s.UoMName)
			.join(this.subItem.OpeningQuantity < 0 ? ' - ' : ' + ');
		this.item.data = [
			...data
				// .filter(i => (!i._FromLocation && i._ToLocation) || (i._FromLocation && !i._ToLocation))
				.sort((a, b) => new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime())
				.map((i) => ({ ...i })),
		];
		// Initialize sheets

		this.item._Branch =
			this.subItem._Branch ?? this.env.branchList.find((x) => x.Id == this.formGroup.get('IDBranch').value);

		// Assign other properties
		const idItem = data.length > 0 ? data[0].IDItem : this.formGroup.get('IDItem').value;
		this.item._Item = this.subItem._Items?.find((d) => d.Id == idItem);
		this.item.Id = this.formGroup.get('IDItem').value;
		if (this.item.data?.length) {
			this.pageConfig.isSubActive = true;
		}
		QRCode.toDataURL(
			'Id:' + this.item.Id,
			{
				errorCorrectionLevel: 'H',
				version: 2,
				width: 500,
				scale: 20,
				type: 'image/webp',
			},
			(err, url) => {
				// Use arrow function here
				if (!err) {
					this.item.QRC = url;
				} else {
					console.error('QR Code Generation Error:', err);
				}
			}
		);
	}
	getContinuousIndex(sheetIndex: number, rowIndex: number): number {
		let previousCount = 0;
		// Sum up the number of items from all previous sheets
		for (let i = 0; i < sheetIndex; i++) {
			previousCount += this.sheets[i]?.data.length || 0;
		}
		return previousCount + rowIndex + 1;
	}

	get selectedStorerNames(): string {
		const idStorer = this.formGroup?.get('IDStorer')?.value;
		if (!idStorer || !this.storerList?.length) {
			return '';
		}
		const ids = Array.isArray(idStorer) ? idStorer : [idStorer];
		return ids
			.map((id) => this.storerList.find((s) => s.Id == id)?.Name)
			.filter(Boolean)
			.join(', ');
	}

	getNearestWarehouse(IDBranch) {
		let currentBranch = this.env.branchList.find((d) => d.Id == IDBranch);
		if (currentBranch) {
			if (currentBranch.Type == 'Warehouse') {
				this.formGroup.get('IDBranch').setValue(currentBranch.Id);
				return true;
			} else {
				let childrentWarehouse: any = this.env.branchList.filter((d) => d.IDParent == IDBranch);
				for (let child of childrentWarehouse) {
					if (this.getNearestWarehouse(child.Id)) {
						return true;
					}
				}
			}
		}
	}
	dateMinusMonths(months: number): string {
		const date = new Date();
		date.setMonth(date.getMonth() - months);
		return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}

	getCurrentDate(): string {
		return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}
}
