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
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-warehouse-item-balance',
	templateUrl: 'warehouse-item-balance.page.html',
	styleUrls: ['warehouse-item-balance.page.scss'],
	standalone: false,
})
export class WareHouseItemBalancePage extends PageBase {
	storerList;
	branchList;
	periodCategoryList = [];
	periodList = [];

	constructor(
		public pageProvider: WMS_ItemBalanceProvider,
		public itemProvider: WMS_ItemProvider,
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
		public formBuilder: FormBuilder
	) {
		super();
		this.pageConfig.isShowFeature = true;

		this.formGroup = this.formBuilder.group({
			IDBranch: ['', Validators.required],
			IDStorer: ['', Validators.required],
			IDPeriodCategory: ['', Validators.required],
			IDPeriod: ['', Validators.required],
		});
	}

	preLoadData(event?: any): void {
		Promise.all([this.contactProvider.read({ IsStorer: true }), this.periodCategoryProvider.read({ IgnoredBranch: true }), 
			//this.env.searchBranch((b) => b.Type == 'Warehouse')
		])
			.then((resp: any) => {
				this.storerList = resp[0].data;
				this.periodCategoryList = resp[1].data;
				this.branchList = lib.cloneObject(this.env.branchList); resp[2];

				console.log('this.branchList', this.branchList);
				console.log('this.periodCategoryList', this.periodCategoryList);
				console.log('this.storerList', this.storerList);

				if (this.branchList.length > 0) {
					//Get the first branch that is warehouse and index in array > selectedBranch index
					const selectedBranchIndex = this.branchList.findIndex((b) => b.Id == this.env.selectedBranch);
					const warehouseBranch = this.branchList.find((b, i) => b.Type == 'Warehouse' && i >= selectedBranchIndex);

					// //Loop through the list of branches and find the first branch that is warehouse then set it disabled = false, else set it disabled = true
					// this.branchList.forEach((b) => {
					// 	b.disabled = b.Type != 'Warehouse';
					// });
					if (warehouseBranch) {
						this.formGroup.controls.IDBranch.setValue(warehouseBranch.Id);
					}
				}

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

				super.loadedData(event);
			})
			.catch((err) => {
				super.loadedData(event);
			});
	}

	loadData(event?: any): void {
		if (!this.formGroup.valid) {
			let invalidControls = this.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				const invalidControls = values;
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControls.join(' | '));
			});
			super.loadedData(event);
			return;
		}
		Object.assign(this.query, this.formGroup.getRawValue());

		super.clearData();
		super.loadData(event);
		this.formGroup.markAsPristine();
		this.pageConfig.isSubActive = true;
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
}
