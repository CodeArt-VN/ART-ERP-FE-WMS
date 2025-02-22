import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	WMS_ItemProvider,
	WMS_LocationProvider,
	WMS_AllocationStrategyProvider,
	WMS_ZoneProvider,
} from 'src/app/services/static/services.service'; // WMS_AllocationStrategyDetailProvider, WMS_AllocationStrategyProvider,
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { WMS_AllocationStrategy } from 'src/app/models/model-list-interface';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-allocation-strategy-detail',
	templateUrl: 'allocation-strategy-detail.page.html',
	styleUrls: ['allocation-strategy-detail.page.scss'],
	standalone: false,
})
export class AllocationStrategyDetailPage extends PageBase {
	branchList;
	typeDataSource: any;
	zoneDatasource: any = [];
	locationSortTypeDataSource: any;
	locationTypeDatasource: any;
	LPNQuantityRuleDatasource: any;
	sortTypeDatasource: any;
	constructor(
		public pageProvider: WMS_AllocationStrategyProvider,
		public storerService: CRM_ContactProvider,
		public locationService: WMS_LocationProvider,
		public zoneService: WMS_ZoneProvider,
		public itemService: WMS_ItemProvider,
		public commonService: CommonService,
		public branchProvider: BRA_BranchProvider,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = this.formBuilder.group({
			Id: new FormControl({ value: '', disabled: true }),
			IDBranch: ['', Validators.required],
			Name: ['', Validators.required],
			Code: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			IsStrictLotRotation: [''],
			IsOverallocateAssigned: [''],
			Type: ['Firm'],
			IsUseSpeedPickLocations: [''],
			FindInZone: [''],
			_zoneDataSource: [],
			FindLocationType: [''],
			FindLocationCategory: [''],
			CanBreakPallets: [''],
			SortPriority1: [''],
			SortPriority2: [''],
			SortPriority3: [''],
			SortPriority4: [''],
			SortPriority5: [''],
			LPNQuantityRule: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}

	//#region Load
	preLoadData(event) {
		this.sortTypeDatasource = [
			{ Name: 'Lot rotation', Code: 'LotRotation' },
			{ Name: 'Location route', Code: 'LocatioRoute' },
			{ Name: 'LPN quantity', Code: 'LPNQuantity' },
			{ Name: 'License plate number', Code: 'LPN' },
			{ Name: 'LPN rotation in location', Code: 'LPNRotationInLocation' },
			{ Name: 'Location name', Code: 'LocationName' },
		];
		this.LPNQuantityRuleDatasource = [
			{ Name: 'Low to High', Code: 'LowToHigh' },
			{ Name: 'Exact Fit', Code: 'ExactFit' },
			{ Name: 'Bigger Fit', Code: 'BiggerFit' },
			{ Name: 'Best fit', Code: 'BestFit' },
			{ Name: 'High to Low', Code: 'HighToLow' },
		];

		this.locationTypeDatasource = [
			{ Name: null, Code: 'NULL' },
			{ Name: 'Bulk locations', Code: 'BulkLocations' },
			{ Name: 'Case locations', Code: 'CaseLocations' },
			{ Name: 'Damaged hold locations', Code: 'DamagedHoldLocations' },
			{ Name: 'Pick to locations', Code: 'PickToLocations' },
		];
		this.branchProvider.read({ Skip: 0, Take: 5000, Type: 'Warehouse', AllParent: true, Id: this.env.selectedBranchAndChildren }).then((resp) => {
			lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
				this.branchList = result;
				this.branchList.forEach((i) => {
					i.disabled = true;
					if (i.Type == 'Warehouse') i.disabled = false;
				});
				this.markNestedNode(this.branchList, this.env.selectedBranch);
			});
		});
		super.preLoadData(event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);
		if (!this.item.Id) {
			this.formGroup.get('Type').markAsDirty();
		}
		if (this.formGroup.get('IDBranch').value) {
			let queryZone = {
				IDBranch: this.formGroup.get('IDBranch').value,
			};
			this.zoneService.read(queryZone).then((rs: any) => {
				this.zoneDatasource = rs?.data;
				this.formGroup.get('_zoneDataSource').setValue(this.zoneDatasource);
			});
		}
	}

	//#endregion

	//#region Bussiness logic
	IDBranchChange() {
		this.formGroup.get('FindInZone').setValue(null);
		if (this.formGroup.get('IDBranch').value) {
			let queryZone = {
				IDBranch: this.formGroup.get('IDBranch').value,
			};
			this.zoneService.read(queryZone).then((rs: any) => {
				this.zoneDatasource = rs?.data;
				this.formGroup.get('_zoneDataSource').setValue(this.zoneDatasource);
			});
		}
		this.saveChange();
	}

	//#endregion

	//#region  SaveChange

	async saveChange() {
		let submitItem = this.getDirtyValues(this.formGroup);
		super.saveChange2();
	}

	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		this.formGroup.patchValue(savedItem);
		form.markAsPristine();
	}

	//#endregion

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}
}
