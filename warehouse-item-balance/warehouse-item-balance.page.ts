import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
	AC_PeriodCategoryProvider,
	AC_PostingPeriodProvider,
	CRM_ContactProvider,
	WMS_ItemBalanceProvider,
	WMS_ItemProvider,
	WMS_ItemUoMProvider,
	WMS_TransactionProvider,
} from 'src/app/services/static/services.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { applyItemDisplay, itemDisplayQuery, itemIdsToLoad, storerIdFromBranch, uomDisplayQuery } from './warehouse-item-balance.util';

@Component({
	selector: 'app-warehouse-item-balance',
	templateUrl: 'warehouse-item-balance.page.html',
	styleUrls: ['warehouse-item-balance.page.scss'],
	standalone: false,
})
export class WareHouseItemBalancePage extends PageBase {
	storerList;
	periodCategoryList = [];
	periodList = [];
	private displayToken = 0;
	private storerToken = 0;

	constructor(
		public pageProvider: WMS_ItemBalanceProvider,
		public itemProvider: WMS_ItemProvider,
		public uomProvider: WMS_ItemUoMProvider,
		public contactProvider: CRM_ContactProvider,
		public periodCategoryProvider: AC_PeriodCategoryProvider,
		public periodProvider: AC_PostingPeriodProvider,

		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public router: Router,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef
	) {
		super();
		this.pageConfig.isShowFeature = true;

		this.formGroup = this.formBuilder.group({
			IDBranch: ['', Validators.required],
			IDStorer: ['', Validators.required],
			IDPeriodCategory: ['', Validators.required],
			IDPeriod: ['', Validators.required],
			IDBranchPeriod: [''],
		});
	}

	preLoadData(event?: any): void {
		this.subscriptions.push(
			this.formGroup.controls.IDBranch.valueChanges.subscribe((id) => {
				if (!id) return;
				this.changeWarehouse();
			})
		);
		const token = ++this.storerToken;
		Promise.all([
			this.contactProvider.read({ IsStorer: true }).catch(() => ({ data: [] })),
			this.contactProvider.commonService
				.connect('GET', 'WMS/Storer/ByBranch', {})
				.toPromise()
				.catch(() => null),
		]).then(([resp, storer]: any[]) => {
			if (token !== this.storerToken) return;
			this.storerList = resp?.data || [];
			const id = storerIdFromBranch(storer);
			if (id) this.ensureStorerOption(storer);
			this.formGroup.controls.IDStorer.setValue(id || null);
			super.loadedData(event);
		});
	}

	loadData(event?: any): void {
		if (!this.formGroup.valid) {
			let invalidControls = this.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				const invalidControls = values;
				this.env.showMessage('Please recheck control(s): {value}', 'warning', invalidControls.join(' | '));
			});
			super.loadedData(event);
			return;
		}
		Object.assign(this.query, this.formGroup.getRawValue());

		const paging = event?.type === 'ionInfinite' || event?.DataLength != null;
		if (!paging) {
			super.clearData();
		}
		super.loadData(event);
		this.formGroup.markAsPristine();
		this.pageConfig.isSubActive = true;
	}

	loadedData(event?: any): void {
		super.loadedData(event);
		this.fillItemCells();
	}

	private fillItemCells() {
		const ids = itemIdsToLoad(this.items);
		if (ids.length === 0) {
			return;
		}
		const token = ++this.displayToken;
		Promise.all([this.itemProvider.read(itemDisplayQuery(ids), true), this.uomProvider.read(uomDisplayQuery(ids), true)]).then((result: any[]) => {
			if (token !== this.displayToken) {
				return;
			}
			applyItemDisplay(this.items, result[0]?.data || [], result[1]?.data || []);
			this.items = [...this.items];
			this.cdr.detectChanges();
		});
	}

	private ensureStorerOption(storer: any) {
		const id = Number(storer?.Id);
		if (!id) return;
		const list = this.storerList || [];
		if (list.some((item) => item?.Id == id)) return;
		this.storerList = [...list, { Id: id, Code: storer.Code, Name: storer.Name }];
	}

	changeWarehouse() {
		this.loadCategories();
	}
	loadCategories() {
		//Change warehouse
		this.periodCategoryProvider.commonService
			.connect('GET', '/AC/PeriodCategory/GetNearestPeriodCategory', { IDBranch: this.formGroup.controls.IDBranch.value })
			.toPromise()
			.then((resp: any) => {
				this.periodCategoryList = [...resp];
				if (this.periodCategoryList.length > 0) {
					//Find the current period category based on the current date and PostingDateFrom and PostingDateTo
					const currentDate = new Date();
					const currentPeriodCategory = this.periodCategoryList.find((pc) => {
						const postingDateFrom = new Date(pc.PostingDateFrom);
						const postingDateTo = new Date(pc.PostingDateTo);
						return currentDate >= postingDateFrom && currentDate <= postingDateTo;
					});
					if (currentPeriodCategory) {
						this.formGroup.controls.IDPeriodCategory.setValue(currentPeriodCategory.Id);
					}

					this.onChangePeriodCategory();
				}
			});
	}

	onChangePeriodCategory() {
		let postDTO = {
			//IDBranch: this.formGroup.controls.IDBranch.value,
			IgnoredBranch: true,
			IDPeriodsCategory: this.formGroup.controls.IDPeriodCategory.value,
		};
		this.periodProvider
			.read(postDTO)
			.then((resp: any) => {
				this.periodList = resp.data;

				this.loadData();
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
			});
	}

	periodClick(i) {
		this.formGroup.controls.IDPeriod.setValue(i.Id);
		this.formGroup.controls.IDBranchPeriod.setValue(i.IDBranch);
		this.loadData();
	}

	add(): void {
		if (!this.formGroup.valid) {
			let invalidControls = this.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				const invalidControls = values;
				this.env.showMessage('Please recheck control(s): {value}', 'warning', invalidControls.join(' | '));
			});
			return;
		}
		this.items.unshift({
			Id: 0,
			IDBranch: this.formGroup.controls.IDBranch.value,
			IDStorer: this.formGroup.controls.IDStorer.value,
			IDPeriod: this.formGroup.controls.IDPeriod.value,
			IDItem: 0,
			OpenQuantity: 0,
			ClosedQuantity: 0,
			_Item: {},
		}); //Add new row to top of list

		this.editRow(this.items[0], true);
	}

	editRow(row, makeAsDirty = false) {
		row.isEdit = true;
		let selectedItem = row._Item;
		//Create formGroup of row
		row._formGroup = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term
				});
			}),
			Id: new FormControl({ value: row.Id, disabled: true }),
			IDBranch: [row.IDBranch || this.formGroup.controls.IDBranch.value, Validators.required],
			IDStorer: [row.IDStorer || this.formGroup.controls.IDStorer.value, Validators.required],
			IDPeriod: [row.IDPeriod || this.formGroup.controls.IDPeriod.value, Validators.required],
			IDItem: [row.IDItem, Validators.required],
			OpenQuantity: [row.OpenQuantity, Validators.required],
			ClosedQuantity: [row.ClosedQuantity, Validators.required],
		});
		if (selectedItem) row._formGroup.get('_IDItemDataSource').value.selected.push(selectedItem);
		row._formGroup.get('_IDItemDataSource').value?.initSearch();
		if (makeAsDirty) {
			row._formGroup.get('IDStorer').markAsDirty();
			row._formGroup.get('IDPeriod').markAsDirty();
		}
	}
	cancelRow(row) {
		if (row.Id === 0) {
			this.items = this.items.filter((e) => e.Id !== 0);
		} else {
			row.isEdit = false;
		}
	}

	saveRow(row) {
		this.saveChange2(row._formGroup, '').then((reps) => this.loadData());
	}
}
