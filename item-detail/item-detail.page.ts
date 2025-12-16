import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { AbstractControl, FormArray, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import {
	BRA_BranchProvider,
	WMS_ItemProvider,
	WMS_ItemUoMProvider,
	WMS_PriceListDetailProvider,
	WMS_PriceListProvider,
	WMS_ItemGroupProvider,
	WMS_UoMProvider,
	WMS_ZoneProvider,
	WMS_CartonGroupProvider,
	WMS_ItemInWarehouseConfigProvider,
	CRM_ContactProvider,
	WMS_LocationProvider,
	FINANCE_TaxDefinitionProvider,
	WMS_ItemInBranchProvider,
	vw_WMS_LotLocLPNProvider,
	WMS_PutawayStrategyProvider,
	WMS_AllocationStrategyProvider,
	PURCHASE_ItemPlanningDataProvider,
} from 'src/app/services/static/services.service';
import { ItemPlanningDataDetailPage } from '../../PURCHASE/item-planning-data-detail/item-planning-data-detail.page';

@Component({
	selector: 'app-item-detail',
	templateUrl: 'item-detail.page.html',
	styleUrls: ['item-detail.page.scss'],
	standalone: false,
})
export class ItemDetailPage extends PageBase {
	branchList = [];
	branchInWarehouse = [];
	selectedBranch = null;
	optionGroup = [
		{
			Code: 'GeneralInformation',
			Name: 'General information',
		},
		{
			Code: 'UnitSpecification',
			Name: 'Unit/Specification',
		},
		{
			Code: 'UnitPrice',
			Name: 'Unit price',
		},
		{
			Code: 'GoodsOwner',
			Name: 'Goods owner',
		},
		{
			Code: 'Pictures',
			Name: 'Pictures',
		},
		{
			Code: 'PlanningData',
			Name: 'Planning data',
		},
		{
			Code: 'Inventory',
			Name: 'Inventory',
		},
	];

	itemGroupList = [];
	uomList = [];
	zoneList = [];
	filterZoneList = [];
	locationList = [];
	putawayStrategyList: any = [];
	allocationStrategyList: any = [];
	filterLocationList = [];
	cartonGroupList = [];
	storerList = [];
	inputTaxList = [];
	outputTaxList = [];

	baseUomName = '???';
	UoMs = []; //UoM grid
	Inventories = []; //Inventories grid
	subOptions = null;
	segmentView = {
		Page: 'ProductInformation',
		ShowSpinner: true,
	};
	branchSelected = false;
	isAdjust = false;
	trackingVendorList = [];
	_vendorDataSource = {
		searchProvider: this.contactProvider,
		loading: false,
		input$: new Subject<string>(),
		selected: [],
		items$: null,
		that: this,
		initSearch() {
			this.loading = false;
			this.items$ = concat(
				of(this.selected),
				this.input$.pipe(
					distinctUntilChanged(),
					tap(() => (this.loading = true)),
					switchMap((term) => {
						if (!term) {
							this.loading = false;
							return of(this.selected);
						} else {
							return this.searchProvider
								.search({
									Keyword: term,
									SortBy: ['Id_desc'],
									Take: 20,
									Skip: 0,
									IsVendor: true,
									SkipAddress: true,
								})
								.pipe(
									catchError(() => of([])), // empty list on error
									tap(() => (this.loading = false))
								);
						}
					})
				)
			);
		},
		addSelectedItem(items) {
			this.selected = [...items];
		},
	};
	constructor(
		public pageProvider: WMS_ItemProvider,
		public itemInBranchProvider: WMS_ItemInBranchProvider,
		public itemGroupProvider: WMS_ItemGroupProvider,
		public itemUoMProvider: WMS_ItemUoMProvider,
		public itemPlanningDataProvider: PURCHASE_ItemPlanningDataProvider,
		public putawayStrategyProvider: WMS_PutawayStrategyProvider,
		public allocationStrategyProvider: WMS_AllocationStrategyProvider,
		public vwLotLocLPNProvider: vw_WMS_LotLocLPNProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public zoneProvider: WMS_ZoneProvider,
		public locationProvider: WMS_LocationProvider,
		public cartonGroupProvider: WMS_CartonGroupProvider,
		public uomProvider: WMS_UoMProvider,
		public priceListProvider: WMS_PriceListProvider,
		public priceListDetailProvider: WMS_PriceListDetailProvider,
		public itemInWarehouseConfig: WMS_ItemInWarehouseConfigProvider,
		public taxProvider: FINANCE_TaxDefinitionProvider,

		public env: EnvService,
		public route: ActivatedRoute,

		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public modalController: ModalController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		private config: NgSelectConfig
	) {
		super();
		this.item = {};
		this.pageConfig.isDetailPage = true;
		this.pageConfig.isShowFeature = true;
		this.pageConfig.isFeatureAsMain = true;
		this.pageConfig.ShowArchive = false;
		this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
		this.config.clearAllText = 'Xóa';

		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = formBuilder.group({
			IDBranch: new FormControl({ value: null, disabled: false }),
			Id: new FormControl({ value: '0', disabled: true }),
			Code: ['', Validators.required],
			Name: ['', Validators.required],
			Remark: new FormControl(),
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			Storers: [],
			IDItemGroup: ['', Validators.required],
			ForeignName: [''],
			ForeignRemark: [''],
			ItemType: ['Items', Validators.required],
			Industry: [''],
			Division: [''],
			IsInventoryItem: [true, Validators.required],
			IsSalesItem: [true, Validators.required],
			IsPurchaseItem: [true, Validators.required],
			BaseUoM: [''],
			AccountantUoM: [''],
			InventoryUoM: [''],
			PurchasingUoM: [''],
			SalesUoM: [''],
			MinimumInventoryLevel: [''],
			MaximumInventoryLevel: [''],
			IDSalesTaxDefinition: ['', Validators.required],
			IDPurchaseTaxDefinition: ['', Validators.required],
			IDPreferredVendor: [''],
			IDCartonGroup: [''],
			SerialNumberStart: [''],
			SerialNumberEnd: [''],
			SerialNumberNext: [''],
			Lottable0: ['#Lot'],
			Lottable1: ['#Batch'],
			Lottable2: ['None'],
			Lottable3: ['None'],
			Lottable4: ['None'],
			Lottable5: ['Manufacturing Date'],
			Lottable6: ['Expiration Date'],
			Lottable7: ['Best By Date'],
			Lottable8: ['Delivery By Date'],
			Lottable9: ['None'],

			Expiry: [1, Validators.required],
			ExpiryUnit: ['Year', Validators.required],

			TI: [''],
			HI: [''],
			InventoryLevelRequired: [''],
			InventoryLevelMinimum: [''],
			InventoryLevelMaximum: [''],
			PlanningMethod: [''],
			ProcurementMethod: [''],
			OrderInterval: [''],
			OrderMultiple: [''],
			MinimumOrderQty: [''],
			CheckingRule: [''],
			LeadTime: [''],
			ToleranceDays: [''],
			WMS_ItemInWarehouseConfig: this.formBuilder.array([]),
			ItemUoMs: this.formBuilder.array([]),
			VendorIds: [],
			IDItemInBranch: [],
			IDBranchItemInBranch: [],
			IDItem: [],
			TreeType: [],
		});
	}

	RotationList = [];
	RotateByList = [];
	ItemTypeList = [];
	ExpiryUnitList = [];
	PlanningMethodList = [];
	ProcurementMethodList = [];
	OrderIntervalList = [];

	IndustryList = [];
	DivisionList = [];
	vendorList = [];

	preLoadData(event) {
		this.branchList = [...this.env.branchList];
		this.branchInWarehouse = lib.cloneObject(this.env.branchList);

		this.uomProvider.read().then((resp) => {
			this.uomList = resp['data'];
		});
		this.zoneProvider.read().then((resp) => {
			this.zoneList = resp['data'];
		});
		this.locationProvider.read().then((resp) => {
			this.locationList = resp['data'];
		});
		this.cartonGroupProvider.read().then((resp) => {
			this.cartonGroupList = resp['data'];
		});

		Promise.all([
			this.pageProvider.commonService
				.connect('GET', 'SYS/Config/ConfigByBranch', {
					Code: 'TaxInput',
					IDBranch: this.env.selectedBranch,
				})
				.toPromise(),
			this.pageProvider.commonService
				.connect('GET', 'SYS/Config/ConfigByBranch', {
					Code: 'TaxOutput',
					IDBranch: this.env.selectedBranch,
				})
				.toPromise(),
			this.itemGroupProvider.read({
				Take: 5000,
			}),
			this.putawayStrategyProvider.read({
				Take: 5000,
			}),
			this.allocationStrategyProvider.read({
				Take: 5000,
			}),
			this.env.getType('ExpiryUnit'),
			this.contactProvider.read({ IsStorer: true, Take: 5000 }),
			this.env.getType('ItemType', true),
			this.env.getType('Rotation'),
			this.env.getType('RotateBy'),
			this.contactProvider.read({
				SortBy: ['Id_desc'],
				Take: 20,
				Skip: 0,
				IsVendor: true,
				SkipAddress: true,
			}),
			this.taxProvider.read(),
			this.env.getType('PlanningMethod'),

			this.env.getType('ProcurementMethod'),
			this.env.getType('OrderInterval'),
		]).then((values: any) => {
			if (values[0]['Value'] && this.item?.Id == 0) {
				let idTaxInput = JSON.parse(values[0]['Value']).Id;
				this.formGroup.controls.IDPurchaseTaxDefinition.setValue(idTaxInput);
				this.formGroup.controls.IDPurchaseTaxDefinition.markAsDirty();
			}
			if (values[1]['Value'] && this.item?.Id == 0) {
				let idTaxOput = JSON.parse(values[1]['Value']).Id;
				this.formGroup.controls.IDSalesTaxDefinition.setValue(idTaxOput);
				this.formGroup.controls.IDSalesTaxDefinition.markAsDirty();
			}
			if (values[2] && values[2].data) {
				lib.buildFlatTree(values[2].data, []).then((result: any) => {
					this.itemGroupList = result;
				});
			}
			if (values[3] && values[3].data) {
				this.putawayStrategyList = values[3].data;
			}
			if (values[4] && values[4].data) {
				this.allocationStrategyList = values[4].data;
			}
			if (values[5] && values[5]) {
				this.ExpiryUnitList = values[5];
			}
			if (values[6] && values[6].data) {
				this.storerList = values[6].data;
			}
			if (values[7]) {
				this.ItemTypeList = values[7];
			}
			if (values[8]) {
				this.RotationList = values[8];
			}
			if (values[9]) {
				this.RotateByList = values[9];
			}
			if (values[10] && values[10].data?.length) {
				this._vendorDataSource.selected.push(...values[10].data);
			}
			if (values[11] && values[11].data?.length) {
				this.inputTaxList = values[11]['data'].filter((d) => d.Category == 'InputTax');
				this.outputTaxList = values[11]['data'].filter((d) => d.Category == 'OutputTax');
			}
			if (values[12]) {
				this.PlanningMethodList = values[12];
			}
			if (values[13]) {
				this.ProcurementMethodList = values[13];
			}
			if (values[14]) {
				this.OrderIntervalList = values[14];
			}
			super.preLoadData();
		});

		setTimeout(() => {
			this.loadNode();
		}, 0);
	}

	loadedData() {
		super.loadedData(null);
		this.patchItemUoMs();
		this.setItemConfigs();
		if (!(this.pageConfig.canEdit || this.pageConfig.canAdd)) {
			this.formGroup?.controls.WMS_ItemInWarehouseConfig.disable();
		}
		this.RotateByList = this.RotateByList.filter((i) => {
			if (this.formGroup.value[i.Code] && this.formGroup.value[i.Code] != 'None' && this.formGroup.value[i.Code]) {
				i.Name = this.formGroup.value[i.Code];
				return i;
			}
		});
		if (this.formGroup.get('IDBranch').value) {
			this.formGroup.get('IDBranchItemInBranch').setValue(this.formGroup.get('IDBranch').value);
			this.changeIDBranchItemInBranch();
			this.formGroup.get('IDBranchItemInBranch').disable();
			// this.selectedBranch = this.env.branchList.find((d) => d.Id == this.formGroup.get('IDBranch').value);
		}
		if (this.formGroup.get('IDBranchItemInBranch').value && (this.pageConfig.canEdit || this.pageConfig.canAdd)) {
			this.formGroup.get('InventoryLevelRequired').enable();
			this.formGroup.get('InventoryLevelMinimum').enable();
			this.formGroup.get('InventoryLevelMaximum').enable();
			this.formGroup.get('PlanningMethod').enable();
			this.formGroup.get('ProcurementMethod').enable();
			this.formGroup.get('OrderInterval').enable();
			this.formGroup.get('OrderMultiple').enable();
			this.formGroup.get('MinimumOrderQty').enable();
			this.formGroup.get('CheckingRule').enable();
			this.formGroup.get('LeadTime').enable();
			this.formGroup.get('ToleranceDays').enable();
		} else {
			this.formGroup.get('InventoryLevelRequired').disable();
			this.formGroup.get('InventoryLevelMinimum').disable();
			this.formGroup.get('InventoryLevelMaximum').disable();
			this.formGroup.get('PlanningMethod').disable();
			this.formGroup.get('ProcurementMethod').disable();
			this.formGroup.get('OrderInterval').disable();
			this.formGroup.get('OrderMultiple').disable();
			this.formGroup.get('MinimumOrderQty').disable();
			this.formGroup.get('CheckingRule').disable();
			this.formGroup.get('LeadTime').disable();
			this.formGroup.get('ToleranceDays').disable();
		}

		if (this.id == 0) {
			this.formGroup.controls.ItemType.markAsDirty();
			this.formGroup.controls.Expiry.markAsDirty();
			this.formGroup.controls.ExpiryUnit.markAsDirty();
			this.formGroup.controls.Industry.markAsDirty();
			this.formGroup.controls.Division.markAsDirty();
			this.formGroup.controls.IsInventoryItem.markAsDirty();
			this.formGroup.controls.IsSalesItem.markAsDirty();
			this.formGroup.controls.IsPurchaseItem.markAsDirty();
			this.formGroup.controls.Lottable0.markAsDirty();
			this.formGroup.controls.Lottable1.markAsDirty();
			this.formGroup.controls.Lottable2.markAsDirty();
			this.formGroup.controls.Lottable3.markAsDirty();
			this.formGroup.controls.Lottable4.markAsDirty();
			this.formGroup.controls.Lottable5.markAsDirty();
			this.formGroup.controls.Lottable6.markAsDirty();
			this.formGroup.controls.Lottable7.markAsDirty();
			this.formGroup.controls.Lottable8.markAsDirty();
			this.formGroup.controls.Lottable9.markAsDirty();
		}
		if (this.item._Vendors) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...this.item._Vendors];
		}
		this._vendorDataSource.initSearch();
	}
	refresh() {
		this.loadItemInBranch();
	}

	changeIDBranch(ev) {
		this.saveChange()
			.then((rs) => {
				this.formGroup.get('IDBranchItemInBranch').setValue(this.formGroup.get('IDBranch').value);
				this.changeIDBranchItemInBranch();
				if (this.formGroup.get('IDBranch').value) {
					this.formGroup.get('IDBranchItemInBranch').disable();
				} else this.formGroup.get('IDBranchItemInBranch').enable();
			})
			.catch((err) => {
				if (err) this.env.showMessage(err, 'warning');
				else this.env.showMessage('Cannot save, please try again', 'danger');
			});

		// this.selectedBranch = this.env.branchList.find((d) => d.Id == this.formGroup.get('IDBranch').value);
		// this.selectedBranch = e
		// this.selectBranch();
	}
	changeIDBranchItemInBranch() {
		this.loadItemInBranch();
		this.loadNode();
		if (this.formGroup.get('IDBranchItemInBranch').value && (this.pageConfig.canEdit || this.pageConfig.canAdd)) {
			this.formGroup.get('InventoryLevelRequired').enable();
			this.formGroup.get('InventoryLevelMinimum').enable();
			this.formGroup.get('InventoryLevelMaximum').enable();
			this.formGroup.get('PlanningMethod').enable();
			this.formGroup.get('ProcurementMethod').enable();
			this.formGroup.get('OrderInterval').enable();
			this.formGroup.get('OrderMultiple').enable();
			this.formGroup.get('MinimumOrderQty').enable();
			this.formGroup.get('CheckingRule').enable();
			this.formGroup.get('LeadTime').enable();
			this.formGroup.get('ToleranceDays').enable();
		} else {
			this.formGroup.get('InventoryLevelRequired').disable();
			this.formGroup.get('InventoryLevelMinimum').disable();
			this.formGroup.get('InventoryLevelMaximum').disable();
			this.formGroup.get('PlanningMethod').disable();
			this.formGroup.get('ProcurementMethod').disable();
			this.formGroup.get('OrderInterval').disable();
			this.formGroup.get('OrderMultiple').disable();
			this.formGroup.get('MinimumOrderQty').disable();
			this.formGroup.get('CheckingRule').disable();
			this.formGroup.get('LeadTime').disable();
			this.formGroup.get('ToleranceDays').disable();
		}
	}
	patchItemUoMs() {
		this.formGroup.controls.ItemUoMs = new FormArray([]);
		if (this.item?.ItemUoMs && this.item?.ItemUoMs.length) {
			this.item.ItemUoMs.forEach((u) => {
				this.addUoM(u);
			});
		}
		if (!this.pageConfig.canEditUoM) {
			this.formGroup.controls.ItemUoMs.disable();
		}

		let baseUoM = this.item?.ItemUoMs?.find((d) => d.IsBaseUoM);
		if (baseUoM) {
			baseUoM._IsBaseUoM = baseUoM.IsBaseUoM;
			this.baseUomName = baseUoM.Name;
		}
	}
	addUoM(u, markAsDirty = false) {
		let groups = this.formGroup.controls.ItemUoMs as FormArray;
		let group = this.formBuilder.group({
			Id: [u?.Id],
			IDItem: [u?.IDItem || this.formGroup.get('Id').value],
			IDUoM: [u?.IDUoM],
			Name: [u?.Name || 'N/A', [Validators.required, Validators.pattern(/^(?!N\/A$).*/)]],
			AlternativeQuantity: [u?.AlternativeQuantity, [Validators.required]],
			BaseQuantity: [u?.BaseQuantity],
			IsBaseUoM: [u?.IsBaseUoM || false],
			Length: [u?.Length],
			Width: [u?.Width],
			Height: [u?.Length],
			Weight: [u?.Weight],
			Barcode: [u?.Barcode],
		});
		group.get('Id').markAsDirty();
		group.get('IDItem').markAsDirty();

		groups.push(group);
		this.validateUoMForm(group);
	}

	setItemConfigs() {
		this.formGroup.controls.WMS_ItemInWarehouseConfig = new FormArray([]);
		if (this.item?.WMS_ItemInWarehouseConfig && this.item?.WMS_ItemInWarehouseConfig.length) {
			this.item.WMS_ItemInWarehouseConfig.forEach((c) => {
				this.addConfig(c);
			});
		}
	}

	addConfig(config) {
		let groups = <FormArray>this.formGroup.controls.WMS_ItemInWarehouseConfig;

		let group = this.formBuilder.group({
			IDPartner: config.IDPartner,
			IDBranch: [config.IDBranch, Validators.required],
			IDStorer: [config.IDStorer, Validators.required],
			IDItem: config.IDItem,
			PutawayZone: config.PutawayZone,
			Rotation: [config.Rotation, Validators.required],
			RotateBy: [config.RotateBy, Validators.required],
			MaxPalletsPerZone: config.MaxPalletsPerZone,
			StackLimit: [config.StackLimit, Validators.required],
			PutawayLocation: config.PutawayLocation,
			InboundQCLocation: config.InboundQCLocation,
			OutboundQCLocation: config.OutboundQCLocation,
			ReturnLocation: config.ReturnLocation,
			MinimumInventoryLevel: config.MinimumInventoryLevel,
			MaximumInventoryLevel: config.MaximumInventoryLevel,

			PutawayStrategy: config.PutawayStrategy,
			AllocationStrategy: config.AllocationStrategy,
			_putawayStrategyList: [[...this.putawayStrategyList.filter((d) => d.IDBranch == config?.IDBranch)]],
			_allocationStrategyList: [[...this.allocationStrategyList.filter((d) => d.IDBranch == config?.IDBranch)]],
			_locationList: [[...this.locationList.filter((d) => d.IDBranch == config?.IDBranch)]],
			_zoneList: [[...this.zoneList.filter((d) => d.IDBranch == config?.IDBranch)]],
			Id: config.Id,
			IsDisabled: config.IsDisabled,

			IsAllowConsolidation: config.IsAllowConsolidation,
		});

		if (!config.Id) {
			group.controls.IDStorer.markAsDirty();
		}
		groups.push(group);
	}

	removeStorer(index) {
		this.alertCtrl
			.create({
				header: 'Xóa địa chỉ',
				//subHeader: '---',
				message: 'Bạn có chắc muốn xóa chủ hàng và các cấu hình này?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
					},
					{
						text: 'Đồng ý xóa',
						cssClass: 'danger-btn',
						handler: () => {
							let groups = <FormArray>this.formGroup.controls.WMS_ItemInWarehouseConfig;
							let id = groups.controls[index]['controls'].Id.value;
							let Ids = [];
							if (id) {
								Ids.push({ Id: id });
								this.itemInWarehouseConfig
									.delete(Ids)
									.then((resp) => {
										// this.items = this.items.filter((d) => d.Id != Ids[0].Id);
										groups.removeAt(index);
										this.env.showMessage('Deleted!', 'success');
									})
									.catch((err) => {
										console.log(err);
										this.env.showMessage('Cannot delete!', 'danger');
									});
							} else groups.removeAt(index);
						},
					},
				],
			})
			.then((alert) => {
				alert.present();
			});
	}

	changeBranchInWarehouse(fg) {
		if (fg.get('PutawayStrategy').value) {
			fg.get('PutawayStrategy').setValue(null);
			fg.get('PutawayStrategy').markAsDirty();
		}
		fg.get('_putawayStrategyList').setValue([...this.putawayStrategyList.filter((d) => d.IDBranch == fg.get('IDBranch').value)]);
		if (fg.get('AllocationStrategy').value) {
			fg.get('AllocationStrategy').setValue(null);
			fg.get('AllocationStrategy').markAsDirty();
		}
		fg.get('_allocationStrategyList').setValue([...this.allocationStrategyList.filter((d) => d.IDBranch == fg.get('IDBranch').value)]);

		if (fg.get('PutawayLocation').value) {
			fg.get('PutawayLocation').setValue(null);
			fg.get('PutawayLocation').markAsDirty();
		}

		if (fg.get('InboundQCLocation').value) {
			fg.get('InboundQCLocation').setValue(null);
			fg.get('InboundQCLocation').markAsDirty();
		}

		if (fg.get('ReturnLocation').value) {
			fg.get('ReturnLocation').setValue(null);
			fg.get('ReturnLocation').markAsDirty();
		}
		fg.get('_locationList').setValue([...this.locationList.filter((d) => d.IDBranch == fg.get('IDBranch').value)]);

		if (fg.get('PutawayZone').value) {
			fg.get('PutawayZone').setValue(null);
			fg.get('PutawayZone').markAsDirty();
		}
		fg.get('_zoneList').setValue([...this.zoneList.filter((d) => d.IDBranch == fg.get('IDBranch').value)]);

		this.saveChange();
	}
	// branchListDataSource = [this.env.branchList];
	changeGroup() {
		this.env.setStorage('item.IDItemGroup', this.item?.IDItemGroup);
	}
	loadItemPlanningData() {
		const branchList = this.env.branchList;
		const selectedBranchId = this.formGroup.get('IDBranchItemInBranch').value;
		let selectedBranch = [selectedBranchId];
		const findChildren = (parentId: number) => {
			const findChild = (parentId: any) => {
				branchList.forEach((b) => {
					const currentId = b.Id;
					if (b.IDParent == parentId) {
						selectedBranch.push(currentId);
						findChild(currentId);
					}
				});
			};
			findChild(parentId);
		};
		if (selectedBranchId != undefined) {
			findChildren(selectedBranchId);
		}

		let query = {
			IDItem: this.id,
			IDBranch: selectedBranch,
		};
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.itemPlanningDataProvider.read(query).then((data: any) => {
					this.itemsPlaningData = data?.data;

					this.segmentView.ShowSpinner = false;
				})
			)
			.catch((error) => {
				console.error(error);
				this.segmentView.ShowSpinner = false;
			});
	}
	loadInventory() {
		const branchList = this.env.branchList;
		const selectedBranchId = this.formGroup.get('IDBranchItemInBranch').value;
		let selectedBranch = [selectedBranchId];
		const findChildren = (parentId: number) => {
			const findChild = (parentId: any) => {
				branchList.forEach((b) => {
					const currentId = b.Id;
					if (b.IDParent == parentId) {
						selectedBranch.push(currentId);
						findChild(currentId);
					}
				});
			};
			findChild(parentId);
		};
		if (selectedBranchId != undefined) {
			findChildren(selectedBranchId);
		}

		let query = {
			ItemId: this.id,
			IDBranch: selectedBranch,
		};
		this.segmentView.ShowSpinner = true;
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.vwLotLocLPNProvider.commonService
					.connect('GET', 'vw/WMS/LotLocLPN/', query)
					.toPromise()
					.then((data: any) => {
						data.forEach((d) => {
							d.QtyAdjust = 0;
							d.QtyTarget = d.QuantityOnHand;
							this.calculateQtyTarget(d);
							let branch = this.env.branchList.find((b) => b.Id == d.IDBranch);
							if (branch) {
								d.Warehouse = branch.Name;
							}
						});

						this.Inventories = data;
						this.segmentView.ShowSpinner = false;
					})
			)
			.catch((error) => {
				console.error(error);
				this.segmentView.ShowSpinner = false;
			});
	}

	loadItemInBranch() {
		if (this.formGroup.get('IDBranchItemInBranch').value) {
			let query = {
				IDItem: this.id,
				IDBranch: this.formGroup.get('IDBranchItemInBranch').value,
			};
			//   this.query.IdItem = this.id;
			//  this.query.IDBranch = this.selectedBranch.Id;
			//  this.formGroup.controls.IDBranch.markAsDirty();
			this.env
				.showLoading(
					'Please wait for a few moments',
					this.itemInBranchProvider.commonService
						.connect('GET', 'WMS/ItemInBranch/', query)
						.toPromise()
						.then((data: any) => {
							let formGroupIDBranch = this.formGroup.get('IDBranch').value;
							let IDBranchItemInBranch = this.formGroup.get('IDBranchItemInBranch').value;
							if (data) {
								this.item = data;
								this.formGroup?.patchValue(this.item);
								this.formGroup?.markAsPristine();
							} else {
								this.item.IDItemInBranch = 0;
								this.resetItemInBranch();
							}
							this.formGroup.get('IDBranchItemInBranch').setValue(IDBranchItemInBranch);
							this.formGroup.get('IDBranch').setValue(formGroupIDBranch);
						})
				)
				.catch((error) => {
					this.segmentView.ShowSpinner = false;
				});
			this.branchSelected = true;
		} else {
			this.resetItemInBranch();
			this.branchSelected = false;
			this.pageProvider
				.getAnItem(this.id, null)
				.then((ite) => {
					this.item = ite;
					this.formGroup?.patchValue(this.item);
					this.formGroup?.markAsPristine();
				})
				.catch((err) => {
					console.log(err);

					if ((err.status = 404)) {
						this.nav('not-found', 'back');
					} else {
						this.item = null;
					}
				});
		}
	}

	resetItemInBranch() {
		this.formGroup.patchValue({
			IDItemInBranch: 0,
			IDBranchItemInBranch: null,
			InventoryLevelRequired: '',
			InventoryLevelMinimum: '',
			InventoryLevelMaximum: '',
			PlanningMethod: '',
			ProcurementMethod: '',
			OrderInterval: '',
			OrderMultiple: '',
			MinimumOrderQty: '',
			CheckingRule: '',
			LeadTime: '',
			ToleranceDays: '',
		});
	}

	selectedOption = null;

	loadNode(option = null) {
		this.pageConfig.isSubActive = true;
		if (!option && this.segmentView) {
			option = this.optionGroup.find((d) => d.Code == this.segmentView.Page);
		}

		if (!option) {
			option = this.optionGroup[0];
		}

		if (!option) {
			return;
		}

		this.selectedOption = option;

		this.segmentView.Page = option.Code;
		if (option.Code == 'GeneralInformation') {
			this._vendorDataSource.initSearch();
		}
		if (this.segmentView.Page == 'UnitPrice') {
			this.loadPriceList();
		}
		if (this.segmentView.Page == 'Inventory') {
			this.loadInventory();
		}
		if (this.segmentView.Page == 'PlanningData') {
			this.loadItemPlanningData();
		}
	}
	changeBaseUoM(i) {
		if (!this.pageConfig.canEditUoM || this.item?.TransactionsExist) {
			return;
		}
		let uomGroups = this.formGroup.get('ItemUoMs') as FormArray;
		let currentBaseUoM = uomGroups.controls.find((d) => d.get('IsBaseUoM').value && d.get('Id').value != i.get('Id').value);
		if (i.get('IsBaseUoM').value) {
			i.get('AlternativeQuantity').setValue(1);
			i.get('AlternativeQuantity').markAsDirty();
			i.get('BaseQuantity').setValue(1);
			i.get('BaseQuantity').markAsDirty();
			currentBaseUoM?.get('IsBaseUoM').setValue(false);
			currentBaseUoM?.get('IsBaseUoM').markAsDirty();
			currentBaseUoM?.get('BaseQuantity').setValue(null);
			this.baseUomName = i.get('Name').value;
			this.saveMasterDataOrItemInBranch();
		} else if (!i.controls.valid) {
			i.get('IsBaseUoM').setValue(!i.get('IsBaseUoM').value);
			this.env.showMessage('Unit invalid!', 'danger');
		} else {
			i.get('IsBaseUoM').setValue(!i.get('IsBaseUoM').value);
			return;
		}
	}
	changeFGUoM(e, fg, control) {
		if (!fg.get('Id').value) {
			this.env.showMessage('Unit invalid!', 'danger');
			return;
		}
		console.log(e);
		if (!this.pageConfig.canEditUoM) {
			return;
		}
		if (this.submitAttempt) {
			this.env.showMessage('System is saving, please try again!', 'warning');
			return;
		}
		if (e.detail.checked) {
			this.formGroup.get(control).setValue(fg.get('Id').value);
		} else {
			this.formGroup.get(control).setValue(null);
		}
		this.formGroup.get(control).markAsDirty();
		this.saveMasterDataOrItemInBranch();
	}
	changedUoM(event, i) {
		if (i) {
			i.get('IDUoM').setValue(event.Id);
			i.get('IDUoM').markAsDirty();
			this.saveUoM(i);
		}
	}

	saveUoM(i) {
		if (i.get('IsBaseUoM').value) {
			this.baseUomName = i.get('Name').value;
		}
		if (!i.get('AlternativeQuantity').value) {
			i.get('AlternativeQuantity').setValue(1);
			i.get('AlternativeQuantity').markAsDirty();
		}
		if (!i.get('BaseQuantity').value) {
			i.get('BaseQuantity').setValue(1);
			i.get('BaseQuantity').markAsDirty();
		}
		this.saveMasterDataOrItemInBranch();
		// this.saveChange();
		//return (this.saveChange2(i,null,this.itemUoMProvider))
	}
	checkingUoMBeforeAdd() {
		let uomGroup = this.formGroup.get('ItemUoMs') as FormArray;
		if (uomGroup.controls.length == 0 || !uomGroup.controls.some((d) => d.get('IsBaseUoM').value)) {
			this.addUoM({ Id: 0, IsBaseUoM: true }, true);
		} else this.addUoM({ Id: 0 });
	}

	deleteUoM(i) {
		let groups = this.formGroup.get('ItemUoMs') as FormArray;
		let index = groups.controls.findIndex((d) => d.get('Id').value == i.get('Id').value);
		if (this.pageConfig.canDeleteUoM && index > -1) {
			if (!(i.get('Id').value > 0)) {
				groups.removeAt(index);
				return;
			}
			if (i.get('IsBaseUoM').value) {
				this.env.showMessage('Please set up origianl unit before deleting', 'danger');
				return;
			}
			this.alertCtrl
				.create({
					header: 'Xóa đơn vị ' + (i.Name ? ' ' + i.Name : ''),
					//subHeader: '---',
					message: 'Bạn có chắc muốn xóa đơn vị' + (i.Name ? ' ' + i.Name : '') + '?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Đồng ý xóa',
							cssClass: 'danger-btn',
							handler: () => {
								this.itemUoMProvider
									.delete(i.getRawValue())
									.then(() => {
										groups.removeAt(index);
										this.env.showMessage('Deleted!', 'success');
									})
									.catch((err) => {
										this.env.showMessage(err, 'danger');
										//console.log(err);
									});
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}
	priceList = [];
	priceListQuery = {};
	loadPriceList() {
		this.segmentView.ShowSpinner = true;

		let apiPath = {
			method: 'GET',
			url: function (Id) {
				return ApiSetting.apiDomain('WMS/PriceList/PriceListByItem/' + Id);
			},
		};

		this.env
			.showLoading(
				'Please wait for a few moments',
				this.pageProvider.commonService
					.connect(apiPath.method, apiPath.url(this.id), this.priceListQuery)
					.toPromise()
					.then((data: any) => {
						data.forEach((i) => {
							if (!i.Prices) i.Prices = [];
							this.item.ItemUoMs?.forEach((u) => {
								let p = i.Prices.find((d) => d.IDItemUoM == u.Id);
								if (!p) {
									p = {
										Id: 0,
										IDItemUoM: u.Id,
										_UoM: { Id: u.Id, Name: u.Name },
										IDItem: this.id,
										IsManual: false,
										Price: 0,
										Price1: 0,
										Price2: 0,
									};
									i.Prices.push(p);
								}
								p.IDPriceList = i.Id;
								p.Sort = u.BaseQuantity / u.AlternativeQuantity;
							});

							i.Prices.sort((a, b) => (a.Sort > b.Sort ? 1 : b.Sort > a.Sort ? -1 : 0));
						});
						this.priceList = [...data];
						this.segmentView.ShowSpinner = false;
					})
			)
			.catch((error) => {
				console.error(error);
				this.segmentView.ShowSpinner = false;
			});
	}

	changeManualPrice(p) {
		if (!this.pageConfig.canEditPrice) {
			return;
		}
		p.IsManual = !p.IsManual;
		this.savePriceDetail(p);
	}

	savePriceDetail(p) {
		let apiPath = {
			method: 'POST',
			url: function (id) {
				return ApiSetting.apiDomain('WMS/PriceListDetail/CalcPrice/' + id);
			},
		};
		this.priceListDetailProvider.commonService
			.connect(apiPath.method, apiPath.url(p.Id), p)
			.toPromise()
			.then((resp: any) => {
				this.env.showMessage('Changes saved', 'success');
				this.loadPriceList();
			});
	}

	saveItemInBranch() {
		if (this.formGroup.get('IDBranchItemInBranch').value) {
			return new Promise((resolve, reject) => {
				this.formGroup.updateValueAndValidity();
				if (!this.formGroup.valid) {
					this.env.showMessage('Please recheck information highlighted in red above', 'warning');
				} else if (this.submitAttempt == false) {
					const idItemInBranch = this.formGroup.get('IDItemInBranch').value || 0;

					let formGroupIDBranch = this.formGroup.get('IDBranch').value;
					// this.formGroup.get('IDBranch').setValue(this.formGroup.get('IDBranchItemInBranch').value);
					if (idItemInBranch == 0) {
						this.formGroup.get('TreeType').setValue(this.item?.TreeType);
					}
					this.formGroup.controls.IDBranch.markAsDirty();
					this.formGroup.controls.Id.markAsDirty();
					this.formGroup.controls.IDItem.markAsDirty();
					this.formGroup.controls.ItemType.markAsDirty();
					this.formGroup.controls.TreeType.markAsDirty();
					this.submitAttempt = true;

					let submitItem: any = this.getDirtyValues(this.formGroup);
					submitItem.IDItem = this.id;
					submitItem.Id = idItemInBranch;
					submitItem.IDBranch = this.formGroup.get('IDBranchItemInBranch').value;

					this.itemInBranchProvider
						.save(submitItem, this.pageConfig.isForceCreate)
						.then((savedItem: any) => {
							resolve(savedItem);
							if (savedItem) {
								// savedItem.IDItemInBranch = savedItem.Id;
								savedItem.IDBranchItemInBranch = savedItem.IDBranch;
								savedItem.IDBranch = formGroupIDBranch;
								this.item.IDItemInBranch = savedItem.IDItemInBranch;
								this.item.IDBranchItemInBranch = savedItem.IDBranch;
								this.item.IDBranch = formGroupIDBranch;
								let existedItem = this.itemPlanningDataProvider
									.read({
										IDItem: savedItem.IDItem,
										IDBranch: savedItem.IDBranch,
										IDVendor: null,
									})
									.then((rs: any) => {
										if (rs && rs.length > 0) submitItem.Id == rs.data[0]?.Id;
										this.itemPlanningDataProvider.save(submitItem).then((r) => this.env.showMessage('Saved planning data!'));
									});
							}

							this.savedChange(savedItem, this.formGroup);
							// if (this.pageConfig.pageName) this.env.publishEvent({ Code: this.pageConfig.pageName });
							this.formGroup.get('Id').setValue(this.id);
							this.formGroup.get('IDBranch').setValue(this.item.IDBranch);
							this.formGroup.get('IDItemInBranch').setValue(this.item.IDItemInBranch);
							this.cdr.detectChanges();
						})
						.catch((err) => {
							this.env.showMessage('Cannot save, please try again', 'danger');
							this.cdr.detectChanges();
							this.submitAttempt = false;
							reject(err);
						});
				}
			});
		}
	}

	saveMasterDataOrItemInBranch() {
		if (this.formGroup.get('IDBranchItemInBranch').value) {
			this.saveItemInBranch();
		} else this.saveChange();
	}

	async saveChange() {
		return super.saveChange2();
	}

	savedChange(savedItem = null, form = this.formGroup) {
		if (savedItem) {
			if (form.controls.Id && savedItem.Id && form.controls.Id.value != savedItem.Id) form.controls.Id.setValue(savedItem.Id);

			if (this.pageConfig.isDetailPage && form == this.formGroup && this.id == 0) {
				this.item = savedItem;
				this.id = savedItem.Id;
				if (window.location.hash.endsWith('/0')) {
					let newURL = window.location.hash.substring(0, window.location.hash.length - 1) + savedItem.Id;
					history.pushState({}, null, newURL);
				}
				if (this.formGroup.get('IDBranchItemInBranch').value != this.formGroup.get('IDBranch').value)
					this.formGroup.get('IDBranchItemInBranch').setValue(this.formGroup.get('IDBranch').value);
				this.changeIDBranchItemInBranch();
				if (this.formGroup.get('IDBranch').value) {
					this.formGroup.get('IDBranchItemInBranch').disable();
				} else this.formGroup.get('IDBranchItemInBranch').enable();
			}
		}

		form.markAsPristine();
		this.submitAttempt = false;
		this.env.showMessage('Saving completed!', 'success');
		//  super.savedChange(savedItem,form);
		let groupsWarehouseConfig = this.formGroup.get('WMS_ItemInWarehouseConfig') as FormArray;
		let idsWarehouseConfigBeforeSaving = new Set(groupsWarehouseConfig.controls.map((g) => g.get('Id').value));
		this.item = savedItem;
		//this.formGroup.patchValue(this.item);
		this.formGroup.get('SalesUoM').setValue(this.item.SalesUoM);
		this.formGroup.get('PurchasingUoM').setValue(this.item.PurchasingUoM);
		this.formGroup.get('InventoryUoM').setValue(this.item.InventoryUoM);
		if (this.item.WMS_ItemInWarehouseConfig?.length > 0) {
			let newIds = new Set(this.item.WMS_ItemInWarehouseConfig.map((i) => i.Id));
			const diff = [...newIds].filter((i) => !idsWarehouseConfigBeforeSaving.has(i));
			if (diff?.length > 0) {
				groupsWarehouseConfig.controls
					.find((d) => d.get('Id').value == null || d.get('Id').value == 0)
					?.get('Id')
					.setValue(diff[0]);
			}
		}
		let groupsItemUoM = this.formGroup.get('ItemUoMs') as FormArray;
		let idsItemUoMConfigBeforeSaving = new Set(groupsItemUoM.controls.map((g) => g.get('Id').value));
		if (this.item.ItemUoMs?.length > 0) {
			let newIds = new Set(this.item.ItemUoMs.map((i) => i.Id));
			const diff = [...newIds].filter((i) => !idsItemUoMConfigBeforeSaving.has(i));
			if (diff?.length > 0) {
				let group = groupsItemUoM.controls.find((d) => d.get('Id').value == null || d.get('Id').value == 0);
				let itemDiffer = this.item.ItemUoMs.find((d) => d.Id == diff[0]);
				if (group && itemDiffer) group.patchValue(itemDiffer);
			}
		}

		form.markAsPristine();
		this.submitAttempt = false;
		this.env.showMessage('Saving completed!', 'success');
	}

	async deletePriceDetail(p) {
		if (this.pageConfig.canEdit) {
			this.alertCtrl
				.create({
					header: 'Xóa giá',
					//subHeader: '---',
					message: 'Bạn có chắc muốn xóa giá này?',
					buttons: [
						{ text: 'Không', role: 'cancel' },
						{
							text: 'Đồng ý xóa',
							cssClass: 'danger-btn',
							handler: () => {
								this.priceListDetailProvider.delete([{ Id: p.Id }]).then((resp) => {
									p.Id = 0;
									p.Price = 0;
									p.Price1 = 0;
									p.Price2 = 0;
									p.IsManual = false;
									this.env.showMessage('Changes saved', 'success');
								});
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	createAdjust() {
		let filteredInventories = this.Inventories.filter((inventory: any) => inventory.QtyAdjust != 0 && inventory.QtyTarget >= 0);
		// Group by IDBranch and StorerId
		let groupedInventories = filteredInventories.reduce((groups, inventory) => {
			let key = `${inventory.IDBranch}-${inventory.StorerId}`;
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(inventory);
			return groups;
		}, {});
		let result = Object.keys(groupedInventories).map((key) => ({
			IDBranch: parseInt(key.split('-')[0]),
			AdjustLotLPNLocations: groupedInventories[key],
		}));
		if (result.length > 0) {
			this.env.showPrompt('Bạn có chắc muốn tạo phiếu điều chỉnh không?', null, 'Tạo phiếu điều chỉnh').then((_) => {
				this.env
					.showLoading(
						'Please wait for a few moments',
						this.pageProvider.commonService
							.connect('POST', 'WMS/Item/PostAdjustments/', result)
							.toPromise()
							.then((res) => {
								if (res) {
									this.env.showAlert('Tạo phiếu điều chỉnh thành công!');
									this.isAdjust = false;
									this.Inventories.forEach((d) => {
										d.QtyAdjust = 0;
										d.QtyTarget = d.QuantityOnHand;
									});
								} else {
									this.env.showMessage('Cannot save, please try again', 'danger');
								}
								this.submitAttempt = false;
							})
							.catch((err) => {
								this.env.showMessage('Cannot save, please try again', 'danger');
								this.submitAttempt = false;
							})
					)
					.catch((error) => {
						this.segmentView.ShowSpinner = false;
					});
			});
		}
	}

	calculateQtyAdjust(i) {
		if (!i.QtyAdjust && !i.QtyTarget) {
			return;
		}
		i.QtyTarget = i.QuantityOnHand + i.QtyAdjust;
	}

	calculateQtyTarget(i) {
		if (!i.QtyAdjust && !i.QtyTarget) {
			return;
		}
		i.QtyAdjust = i.QtyTarget - i.QuantityOnHand;
	}

	validateUoMForm(group) {
		if (group.get('IsBaseUoM')?.value) {
			group.get('IsBaseUoM')?.disable({ emitEvent: false });
		}
		group.get('IsBaseUoM')?.valueChanges.subscribe((value: boolean) => {
			if (value) {
				group.get('IsBaseUoM')?.disable({ emitEvent: false });
			} else {
				group.get('IsBaseUoM')?.enable({ emitEvent: false });
			}
		});

		if (group.get('IsBaseUoM')?.value) {
			group.get('BaseQuantity')?.clearValidators();
		} else {
			group.get('BaseQuantity')?.setValidators([Validators.required]);
		}
		group.get('BaseQuantity')?.updateValueAndValidity();

		// Subscribe to changes in IsBaseUoM
		group.get('IsBaseUoM')?.valueChanges.subscribe((isBaseUoM: boolean) => {
			if (isBaseUoM) {
				group.get('BaseQuantity')?.clearValidators(); // Remove required validator
			} else {
				group.get('BaseQuantity')?.setValidators([Validators.required]); // Add required validator
			}
			group.get('BaseQuantity')?.updateValueAndValidity(); // Refresh validation state
		});
		if (this.item?.TransactionsExist || this.formGroup.get('IDBranchItemInBranch').value) {
			group.get('IsBaseUoM').disable();
		}
	}
	itemsPlaningData = [];
	addPlanningVendor() {
		let newItem = {
			Id: 0,
			IsDisabled: false,
			IDItem: this.id,
			IDBranch: this.formGroup.controls.IDBranchItemInBranch.value,
		};
		this.showPlanningVendorModal(newItem);
	}
	async showPlanningVendorModal(i) {
		const modal = await this.modalController.create({
			component: ItemPlanningDataDetailPage,
			componentProps: {
				item: i,
				id: i.Id,
				FromPage:'Item'
			},
			cssClass: 'my-custom-class',
		});
		await modal.present();
		const { data } = await modal.onDidDismiss();
		if (data) {
			this.loadItemPlanningData();
		}
	}
}
