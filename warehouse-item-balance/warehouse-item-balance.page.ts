import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
	AC_PeriodCategoryProvider,
	AC_PostingPeriodProvider,
	CRM_ContactProvider,
	WMS_ItemBalanceProvider,
	WMS_ItemProvider,
	WMS_TransactionProvider,
} from 'src/app/services/static/services.service';
import QRCode from 'qrcode';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { AC_PostingPeriod } from 'src/app/models/model-list-interface';

@Component({
	selector: 'app-warehouse-item-balance',
	templateUrl: 'warehouse-item-balance.page.html',
	styleUrls: ['warehouse-item-balance.page.scss'],
	standalone: false,
})
export class WareHouseItemBalancePage extends PageBase {
	currentDate = new Date();
	storerList;
	branchList;
	sheets = [];
	listYear = [];
	listPeriodCategory = [];
	listPeriod = [];
	notes = [];
	constructor(
		//public pageProvider: WMS_StockCardProvider,
		public pageProvider: WMS_ItemBalanceProvider,
		public itemProvider: WMS_ItemProvider,
		public contactProvider: CRM_ContactProvider,
		public periodProvider: AC_PeriodCategoryProvider,
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
		// this.pageConfig.isDetailPage = true;
		this.formGroup = this.formBuilder.group({
			IDPeriod: ['', Validators.required],
			IDBranch: ['', Validators.required],
			IDStorer: ['', Validators.required],
			Lines: this.formBuilder.array([]),
		});
	}

	preLoadData(event?: any): void {
		Promise.all([this.contactProvider.read({ IsStorer: true }), this.periodProvider.read({ IDBranch: this.env.selectedBranch })]).then((resp: any) => {
			if (resp[0] && resp[0].data) this.storerList = resp[0].data;
			if (resp[1] && resp[1].data) {
				this.listPeriodCategory = resp[1].data;
				this.listYear = Array.from(new Map(this.listPeriodCategory.map((item) => [item.Name, item])).values()).map((d) => {
					return { Name: d.Name, Id: d.Id };
				});
			}
		});
		this.branchList = [...this.env.branchList];
		this.loadedData(event);
	}
	subItem: any = {};
	loadData(event?: any): void {}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);

		this.formGroup.enable();
		if (!this.formGroup.get('IDBranch').value) {
			this.getNearestWarehouse(this.env.selectedBranch);
		}
	}
	changeFilter() {
		if (this.formGroup.invalid) return;
		this.query = this.formGroup.getRawValue();
		this.pageConfig.showSpinner = true;
		this.pageProvider.commonService
			.connect('GET', 'WMS/ItemBalance', this.query)
			.toPromise()
			.then((rs: any) => {
				if (rs) {
					// this.items = rs;
					// this.patchValue();
				}
			})
			.catch((err) => {
				this.env.showMessage(err.error?.InnerException?.ExceptionMessage || err, 'danger');
			});
	}

	loadItemBalance() {
		
	}

	changePeriodCategory() {
		let postDTO = {
			IDBranch: this.formGroup.controls.IDBranch.value,
			IDPeriodCategory: this.formGroup.controls.IDPeriod.value
		}
		this.periodProvider.commonService
			.connect('GET', 'AC/PostingPeriod', postDTO)
			.toPromise()
			.then((resp: any) => {
				if (resp) {
					this.listPeriod = resp;
				}
			});
	}
	patchValue() {
		this.formGroup.controls.Lines = new FormArray([]);
		this.items.forEach((line) => {
			this.addLine(line);
		});
	}

	addLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let selectedItem = line._Item;
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Term: term,
				});
			}),
			IDItem: [line.IDItem || 0, Validators.required],
			OpenQuantity: [line.OpenQuantity, Validators.required],
			ClosedQuantity: [line.ClosedQuantity, Validators.required],
		});
		groups.push(group);
		group.get('_IDItemDataSource').value?.initSearch();
	}
	getContinuousIndex(sheetIndex: number, rowIndex: number): number {
		let previousCount = 0;
		// Sum up the number of items from all previous sheets
		for (let i = 0; i < sheetIndex; i++) {
			previousCount += this.sheets[i]?.data.length || 0;
		}
		return previousCount + rowIndex + 1;
	}

	submitData(g) {
		if (this.formGroup.invalid) return;
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

	add() {
		this.addLine({}, true);
	}
}
