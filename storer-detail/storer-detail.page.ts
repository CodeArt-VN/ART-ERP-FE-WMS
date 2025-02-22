import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, HRM_StaffProvider, WMS_LocationProvider, WMS_StorerProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { DataCorrectionRequestModalPage } from 'src/app/modals/data-correction-request-modal/data-correction-request-modal.page';

@Component({
	selector: 'app-storer-detail',
	templateUrl: './storer-detail.page.html',
	styleUrls: ['./storer-detail.page.scss'],
	standalone: false,
})
export class StorerDetailPage extends PageBase {
	segmentList = [];
	branchList = [];
	locationList = [];

	constructor(
		public pageProvider: WMS_StorerProvider,
		public branchProvider: BRA_BranchProvider,
		public staffProvider: HRM_StaffProvider,
		public popoverCtrl: PopoverController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public modalController: ModalController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService,
		public locationProvider: WMS_LocationProvider
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDBranch: new FormControl({ value: null, disabled: false }),
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			Status: ['New'],
			IsPersonal: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			StorerConfig: this.formBuilder.array([]),
		});
	}

	preLoadData(event?: any): void {
		this.branchProvider
			.read({
				Skip: 0,
				Take: 5000,
				Type: 'Warehouse',
				AllParent: true,
				Id: this.env.selectedBranchAndChildren,
			})
			.then((resp) => {
				lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
					this.branchList = result;
					this.branchList.forEach((i) => {
						i.disabled = true;
					});
					this.markNestedNode(this.branchList, this.env.selectedBranch);
				});
			});

		super.preLoadData(event);
	}

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}

	pathValueStorerConfig() {
		this.formGroup.controls.StorerConfig = new FormArray([]);
		if (this.item._StorerConfig?.length)
			this.item._StorerConfig.forEach((i) => {
				this.addStorerConfig(i);
			});
	}

	loadedData() {
		super.loadedData();
		this.pathValueStorerConfig();
	}

	addStorerConfig(config) {
		let groups = <FormArray>this.formGroup.controls.StorerConfig;
		let group = this.formBuilder.group({
			Id: [config.Id],
			IDWarehouse: [config.IDWarehouse, Validators.required],
			WarehouseName: [config.WarehouseName],
			IDStorer: [config.IDStorer, Validators.required],
			isActivated: [config.isActivated],
			StandardCarrierAlphaCode: [config.StandardCarrierAlphaCode],
			CreditLimit: [config.CreditLimit],
			IDCartonGroup: [config.IDCartonGroup],
			//Task
			IsEnablePacking: [config.IsEnablePacking],
			IsQCInspectAtPack: [config.IsQCInspectAtPack],
			IsAllowMultiZoneRainbowPallet: [config.IsAllowMultiZoneRainbowPallet],
			DefaultItemRotation: [config.DefaultItemRotation, Validators.required],
			DefaultRotation: [config.DefaultRotation, Validators.required],
			DefaultStrategy: [config.DefaultStrategy],
			DefaultPutawayStrategy: [config.DefaultPutawayStrategy],
			DefaultInboundQCLocation: [config.DefaultInboundQCLocation],
			DefaultOutboundQCLocation: [config.DefaultOutboundQCLocation],
			DefaultReturnsReceiptLocation: [config.DefaultReturnsReceiptLocation],
			DefaultPackingLocation: [config.DefaultPackingLocation],
			//Label
			LPNBarcodeSymbology: [config.LPNBarcodeSymbology],
			LPNBarcodeFormat: [config.LPNBarcodeFormat],
			LPNLength: [config.LPNLength],
			LPNStartNumber: [config.LPNStartNumber],
			LPNNextNumber: [config.LPNNextNumber],
			LPNRollbackNumber: [config.LPNRollbackNumber],
			CaseLabelType: [config.CaseLabelType],
			ApplicationID: [config.ApplicationID],
			SSCCFirstDigit: [config.SSCCFirstDigit],
			UCCVendor: [config.UCCVendor],
			//Processing
			AllowCommingledLPN: [config.AllowCommingledLPN],
			LabelTemplate: [config.LabelTemplate],
		});

		groups.push(group);
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		if (this.item._StorerConfig[ev.detail.value]?.IDWarehouse) {
			this.locationProvider.read({ IDBranch: this.item._StorerConfig[ev.detail.value]?.IDWarehouse }).then((resp) => {
				this.locationList = resp['data'];
			});
		}
	}

	IDWarehouseChange(index, event) {
		this.locationList = [];
		let groups = <FormArray>this.formGroup.controls.StorerConfig;
		if (event) {
			groups.at(index).get('WarehouseName').setValue(event.Name);
			this.locationProvider.read({ IDBranch: event.Id }).then((resp) => {
				this.locationList = resp['data'];
			});
		}
		groups.at(index).get('DefaultInboundQCLocation').setValue(null);
		groups.at(index).get('DefaultOutboundQCLocation').setValue(null);
		groups.at(index).get('DefaultReturnsReceiptLocation').setValue(null);
		groups.at(index).get('DefaultPackingLocation').setValue(null);
		groups.at(index).get('DefaultInboundQCLocation').markAsDirty();
		groups.at(index).get('DefaultOutboundQCLocation').markAsDirty();
		groups.at(index).get('DefaultReturnsReceiptLocation').markAsDirty();
		groups.at(index).get('DefaultPackingLocation').markAsDirty();
		this.saveChange();
	}
	async saveChange() {
		this.saveChange2();
	}

	async openRequestDataConnectionModal() {
		// let formGroup = clone
		const modal = await this.modalController.create({
			component: DataCorrectionRequestModalPage,
			componentProps: {
				item: {
					IDBranch: this.formGroup.get('IDBranch').value,
					Id: this.formGroup.get('Id').value,
					Name: this.formGroup.get('Name').value,
				},
				model: {
					Type: 'Outlet',
					Fields: [
						{ id: 'Id', type: 'number', label: 'Id', disabled: true },
						{ id: 'IDBranch', type: 'number', label: 'Branch', disabled: true },
						{ id: 'Name', type: 'text', label: 'Name' },
						//  { id: 'DeletedAddressFields',type:'nonRender'},
					],
				},
				cssClass: 'modal90',
			},
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
	}
}
