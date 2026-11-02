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
		this.contactProvider.read({ IsStorer: true }).then((resp) => {
			this.storerList = resp['data'];
		});
	}
	subItem: any = {};
	loadData(event?: any): void {
		this.fetchCard(event?.type === 'ionInfinite', event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);

		this.formGroup.get('_IDItemDataSource').value.initSearch();
		this.formGroup.enable();
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
		this.pageConfig.isEndOfData = false;
		this.currentDate = new Date();
		this.item = {};
		this.fetchCard(false);
	}

	fetchCard(paging: boolean, event?: any) {
		this.query = this.formGroup.getRawValue();
		this.fromDate = this.query.TransactionDateFrom;
		this.toDate = this.query.TransactionDateTo;
		delete this.query._IDItemDataSource;
		this.query.SortBy = 'Id_desc';
		this.query.Take = 200;
		this.query.Skip = paging ? this.item?.data?.length || 0 : 0;
		this.pageConfig.showSpinner = !paging;
		this.pageProvider.commonService
			.connect('GET', 'WMS/Transaction', this.query)
			.toPromise()
			.then((rs: any) => {
				const refList = Array.isArray(rs?._RefList) ? rs._RefList : [];
				if (rs) {
					const { _RefList, ...SubData } = rs;
					this.subItem = SubData;
				}
				const page = refList.map((row) => ({
					...row,
					_Item: this.subItem._Items?.find((item) => item.Id == row.IDItem),
				}));
				const rows = paging ? [...(this.item?.data || []), ...page] : page;
				this.items = rows;
				this.patchValue(rows);
				const count = Number(rs?.Count);
				this.pageConfig.isEndOfData = refList.length < this.query.Take || (count > 0 && rows.length >= count);
				this.loadedData(event);
			})
			.catch((err) => {
				this.env.showMessage(err.error?.InnerException?.ExceptionMessage || err, 'danger');
				this.loadedData(event);
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

	dateMinusMonths(months: number): string {
		const date = new Date();
		date.setMonth(date.getMonth() - months);
		return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}

	getCurrentDate(): string {
		return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
	}
}
