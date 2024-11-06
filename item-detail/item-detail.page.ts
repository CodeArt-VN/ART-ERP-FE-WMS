import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
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
} from 'src/app/services/static/services.service';

@Component({
  selector: 'app-item-detail',
  templateUrl: 'item-detail.page.html',
  styleUrls: ['item-detail.page.scss'],
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
  putawayStrategyList:any = [];
  allocationStrategyList:any = [];
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
    that:this,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                Term: term,
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                IsVendor: true,
                SkipAddress: true,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
              
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
    addSelectedItem(items) {
      this.selected = [...items];
    }
  };
  constructor(
    public pageProvider: WMS_ItemProvider,
    public itemInBranchProvider: WMS_ItemInBranchProvider,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public itemUoMProvider: WMS_ItemUoMProvider,
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
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    private config: NgSelectConfig,
  ) {
    super();
    this.item = {};
    this.pageConfig.isDetailPage = true;
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isFeatureAsMain = true;
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
      PlanningMeThod: [''],
      ProcurementMethod: [''],
      OrderInterval: [''],
      OrderMultiple: [''],
      MinimumOrderQty: [''],
      CheckingRule: [''],
      LeadTime: [''],
      ToleranceDays: [''],
      WMS_ItemInWarehouseConfig: this.formBuilder.array([]),
      VendorIds: [],
      IDItemInBranch: [],
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
    this.branchList = this.env.branchList.filter((d) => d.Type != 'TitlePosition');

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

    this.taxProvider.read().then((resp) => {
      this.inputTaxList = resp['data'].filter((d) => d.Category == 'InputTax');
      this.outputTaxList = resp['data'].filter((d) => d.Category == 'OutputTax');

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
        this.itemGroupProvider
          .read({
            SortBy: ['Id_desc'],
            Take: 5000,
            Skip: 0,
            SkipMCP: true,
            SkipAddress: true,
          }),
          this.putawayStrategyProvider
          .read({
            SortBy: ['Id_desc'],
            Take: 5000,
            Skip: 0,
          }),
          this.allocationStrategyProvider
          .read({
            SortBy: ['Id_desc'],
            Take: 5000,
            Skip: 0,
          }),
        this.env.getType('ExpiryUnit'),
        this.contactProvider.read({ IsStorer: true, Take: 5000 }),
        this.env.getType('ItemType', true),
        this.env.getType('Rotation'),
        this.env.getType('RotateBy'),
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
        };
        if(values[2] && values[2].data){
          lib.buildFlatTree(values[2].data,[]).then((result:any)=>{
            this.itemGroupList = result;
          })
        }
        if(values[3] && values[3].data){
          this.putawayStrategyList = values[3].data;
        }
        if(values[4] && values[4].data){
          this.allocationStrategyList = values[4].data;
        };
        if(values[5] && values[5]){
          this.ExpiryUnitList = values[5]
        };
        if(values[6] && values[6].data){
          this.storerList = values[6].data;
        };
        if(values[7]){
          this.ItemTypeList = values[7];
        };
        if(values[8]){
          this.RotationList = values[8];
        };
        if(values[9]){
          this.RotateByList = values[9]
        };
      
        this.branchInWarehouse = lib.cloneObject(this.env.branchList);
        this.branchInWarehouse.forEach((i) => {
          i.disabled = true;
        });
        this.markNestedNode(this.branchInWarehouse, this.selectedBranch);

        super.preLoadData();
      });
    });

    // this.env.getType('PlanningMethod').then((result: any) => {
    //   this.PlanningMethodList = result;
    // });
    // this.env.getType('ProcurementMethod').then((result: any) => {
    //   this.ProcurementMethodList = result;
    // });
    // this.env.getType('OrderInterval').then((result: any) => {
    //   this.OrderIntervalList = result;
    // });
    setTimeout(() => {
      this.loadNode();
    }, 0);
  }

  loadedData() {
    if (this.item?.IDItemGroup) {
      let itemGroupSelected = {
        Id: this.item.IDItemGroup,
        Name: this.item?.ItemGroupName,
      };
    }
    if (this.item?.Id) {
      Promise.all([this.itemUoMProvider.read({ IDItem: this.item.Id })]).then((values) => {
        this.UoMs = values[0]['data'];
        let baseUoM = this.UoMs.find((d) => d.IsBaseUoM);
        if (baseUoM) {
          baseUoM._IsBaseUoM = baseUoM.IsBaseUoM;
          this.baseUomName = baseUoM.Name;
        }
      });
    }
    super.loadedData(null);
    this.setItemConfigs();
    if (!(this.pageConfig.canEdit || this.pageConfig.canAdd)) {
      this.formGroup?.controls.WMS_ItemInWarehouseConfig.disable();
    }
    this.RotateByList = this.RotateByList.filter(i =>{
      if(this.formGroup.value[i.Code] && this.formGroup.value[i.Code] != 'None' && this.formGroup.value[i.Code]){
        i.Name = this.formGroup.value[i.Code]
        return i;
      }
    })
    if(this.formGroup.get('IDBranch').value) this.selectedBranch = this.env.branchList.find(d=>d.Id == this.formGroup.get('IDBranch').value);
    if (this.selectedBranch && (this.pageConfig.canEdit || this.pageConfig.canAdd)) {
      this.formGroup.get('InventoryLevelRequired').enable();
      this.formGroup.get('InventoryLevelMinimum').enable();
      this.formGroup.get('InventoryLevelMaximum').enable();
      this.formGroup.get('PlanningMeThod').enable();
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
      this.formGroup.get('PlanningMeThod').disable();
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
    if(this.item._Vendors){
      this._vendorDataSource.selected = [...this.item._Vendors];
    }
    this._vendorDataSource.initSearch();
  }
  refresh() {
    this.loadItemInBranch();
  }

  changeIDBranch(ev){
    this.selectedBranch = ev;
    this.selectBranch() ;
    this.saveChange();
  }
  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
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
      _putawayStrategyList : [[...this.putawayStrategyList.filter(d=> d.IDBranch == config?.IDBranch)]],
      _allocationStrategyList : [[...this.allocationStrategyList.filter(d=> d.IDBranch == config?.IDBranch)]],
      _locationList : [[...this.locationList.filter(d=> d.IDBranch == config?.IDBranch )]],
      _zoneList : [[...this.zoneList.filter(d=> d.IDBranch == config?.IDBranch )]],
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
              let Ids = [];
              Ids.push({
                Id: groups.controls[index]['controls'].Id.value,
              });
              this.itemInWarehouseConfig.delete(Ids).then((resp) => {
                this.items = this.items.filter((d) => d.Id != Ids[0].Id);
                groups.removeAt(index);
                this.env.showMessage('Deleted!', 'success');
              });
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
  }

  changeBranchInWarehouse(fg){
    if(fg.get('PutawayStrategy').value){
      fg.get('PutawayStrategy').setValue(null);
      fg.get('PutawayStrategy').markAsDirty();
    }
    fg.get('_putawayStrategyList').setValue([...this.putawayStrategyList.filter(d=> d.IDBranch == fg.get('IDBranch').value)]);
    if(fg.get('AllocationStrategy').value){
      fg.get('AllocationStrategy').setValue(null);
      fg.get('AllocationStrategy').markAsDirty();
    }
    fg.get('_allocationStrategyList').setValue([...this.allocationStrategyList.filter(d=> d.IDBranch == fg.get('IDBranch').value)]);
   
    if(fg.get('PutawayLocation').value){
      fg.get('PutawayLocation').setValue(null);
      fg.get('PutawayLocation').markAsDirty();
    }

   if(  fg.get('InboundQCLocation').value){
    fg.get('InboundQCLocation').setValue(null);
    fg.get('InboundQCLocation').markAsDirty();
   }

    if(fg.get('ReturnLocation').value){
      fg.get('ReturnLocation').setValue(null);
      fg.get('ReturnLocation').markAsDirty();
    }
    fg.get('_locationList').setValue([...this.locationList.filter(d=> d.IDBranch == fg.get('IDBranch').value)]);
  
    if(  fg.get('PutawayZone').value){
      fg.get('PutawayZone').setValue(null);
      fg.get('PutawayZone').markAsDirty();
    }   
    fg.get('_zoneList').setValue([...this.zoneList.filter(d=> d.IDBranch == fg.get('IDBranch').value)]);

    this.saveChange();
  }
 // branchListDataSource = [this.env.branchList];
  changeGroup() {
    this.env.setStorage('item.IDItemGroup', this.item?.IDItemGroup);
  }

  selectBranch() {
    this.loadItemInBranch();
    this.loadNode();
    if (this.selectedBranch && (this.pageConfig.canEdit || this.pageConfig.canAdd)) {
      this.formGroup.get('InventoryLevelRequired').enable();
      this.formGroup.get('InventoryLevelMinimum').enable();
      this.formGroup.get('InventoryLevelMaximum').enable();
      this.formGroup.get('PlanningMeThod').enable();
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
      this.formGroup.get('PlanningMeThod').disable();
      this.formGroup.get('ProcurementMethod').disable();
      this.formGroup.get('OrderInterval').disable();
      this.formGroup.get('OrderMultiple').disable();
      this.formGroup.get('MinimumOrderQty').disable();
      this.formGroup.get('CheckingRule').disable();
      this.formGroup.get('LeadTime').disable();
      this.formGroup.get('ToleranceDays').disable();
    }
  }

  loadInventory() {
    const branchList = this.env.branchList;
    const selectedBranchId = this.selectedBranch?.Id;
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
    if(selectedBranchId != undefined) {
      findChildren(selectedBranchId);
    }

    let query = {
      ItemId: this.id,
      IDBranch: selectedBranch
    }
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
          }),
      )
      .catch((error) => {
        console.error(error);
        this.segmentView.ShowSpinner = false;
      });
  }

  loadItemInBranch() {
    if (this.selectedBranch) {
      let query = {
        IdItem: this.id,
        IDBranch: this.selectedBranch.Id,
      };
      this.query.IdItem = this.id;
      this.query.IDBranch = this.selectedBranch.Id;
      this.formGroup.controls.IDBranch.markAsDirty();
      this.env
        .showLoading(
          'Please wait for a few moments',
          this.pageProvider.commonService
            .connect('GET', 'WMS/ItemInBranch/', query)
            .toPromise()
            .then((data: any) => {
              if (data) {
                this.item = data;
                this.formGroup?.patchValue(this.item);
                this.formGroup?.markAsPristine();
                this.cdr.detectChanges();
               
              } else {
                this.item.IDItemInBranch = 0;
                this.resetItemInBranch();
              }
            }),
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
          this.cdr?.detectChanges();
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
      InventoryLevelRequired: '',
      InventoryLevelMinimum: '',
      InventoryLevelMaximum: '',
      PlanningMeThod: '',
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
    if(option.Code == 'GeneralInformation'){
      this._vendorDataSource.initSearch();
    }
    if (this.segmentView.Page == 'UnitPrice') {
      this.loadPriceList();
    }
    if (this.segmentView.Page == 'Inventory') {
      this.loadInventory();
    }
  }
  changeBaseUoM(i) {
    if (!this.pageConfig.canEditUoM || this.item?.TransactionsExist) {
      return;
    }
    let checkedRows = this.UoMs.filter((d) => d.IsBaseUoM);
    if (i.IsBaseUoM && checkedRows.length > 0) {
      for (let index = 0; index < checkedRows.length; index++) {
        const r = checkedRows[index];
        if (r.Id != i.Id) {
          r.IsBaseUoM = false;
          this.saveUoM(r);
        } else {
          r.AlternativeQuantity = 1;
          r.BaseQuantity = 1;
        }
      }
      this.saveUoM(i);
    } else {
      this.UoMs[0].IsBaseUoM = true;
      this.UoMs[0].AlternativeQuantity = 1;
      this.UoMs[0].BaseQuantity = 1;
      this.saveUoM(this.UoMs[0]);
      this.saveUoM(i);
    }
  }

  changedUoM(event, i) {
    if (i) {
      i.IDUoM = event.Id;
      this.saveUoM(i);
    }
  }

  saveUoM(i) {
    if (!i.IDUoM) {
      return;
    }
    if (i.IsBaseUoM) {
      this.baseUomName = i.Name;
    }
    if (!i.AlternativeQuantity) {
      i.AlternativeQuantity = 1;
    }
    this.itemUoMProvider.save(i).then((result) => {
      if (!i.Id) {
        i.Id = result['Id'];
      }
      this.env.showMessage('Unit saved', 'success');
    });
  }

  checkCreatedItem() {
    return new Promise((resolve, reject) => {
      if (!this.item?.Id) {
        this.saveChange().then((result) => {
          resolve(this.item.Id);
        });
      } else {
        resolve(this.item?.Id);
      }
    });
  }

  addUoM() {
    this.checkCreatedItem().then(() => {
      let newUoM = {
        Id: 0,
        IDItem: this.selectedBranch ? this.id : this.item?.Id,
        AlternativeQuantity: 1,
        BaseQuantity: 1,
        IsBaseUoM: this.UoMs.filter((d) => d.IsBaseUoM).length == 0,
        Name: 'N/A',
      };
      this.UoMs.push(newUoM);
      this.saveUoM(newUoM);
    });
  }

  async createNewUoM(name) {
    let newUoM = { Id: null, Name: name };
    if (this.uomList.findIndex((d) => d.name == name) == -1) {
      await this.uomProvider.save(newUoM).then((result) => {
        this.uomList.push({ Id: result['Id'], Name: result['Name'] });
        this.uomList = [...this.uomList];
        this.env.showMessage('New unit saved', 'success');
        newUoM.Id = result['Id'];
      });

      return newUoM;
    }
  }

  deleteUoM(i) {
    if (this.pageConfig.canDeleteUoM) {
      if (i.IsBaseUoM) {
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
                  .delete(i)
                  .then(() => {
                    const index = this.UoMs.indexOf(i, 0);
                    if (index > -1) {
                      this.UoMs.splice(index, 1);
                    }

                    this.env.showMessage('Deleted!', 'success');
                  })
                  .catch((err) => {
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

  updateUoM() {
    if (this.pageConfig.canEditUoM) {
      this.pageProvider.save(this.item).then(() => {
        this.env.showMessage('Changed unit saved', 'success');
      });
    }
  }

  updateUoMInBranch() {
    if (this.pageConfig.canEditUoM) {
      const idItemInBranch = this.item.IDItemInBranch || 0;
      let item = {
        Id: idItemInBranch,
        IDBranch: this.selectedBranch.Id,
        IDItem: this.id,
        InventoryUoM: this.item.InventoryUoM,
        PurchasingUoM: this.item.PurchasingUoM,
        SalesUoM: this.item.SalesUoM,
      };
      this.itemInBranchProvider.save(item).then((result: any) => {
        this.item.IDItemInBranch = result.Id;
        this.env.showMessage('Changed unit saved', 'success');
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
              this.UoMs.forEach((u) => {
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
            this.priceList = data;
            this.segmentView.ShowSpinner = false;
          }),
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

  async saveItemInBranch() {
    if (this.selectedBranch) {
      return new Promise((resolve, reject) => {
        this.formGroup.updateValueAndValidity();
        if (!this.formGroup.valid) {
          this.env.showMessage('Please recheck information highlighted in red above', 'warning');
        } else if (this.submitAttempt == false) {
          const idItemInBranch = this.item.IDItemInBranch || 0;
          this.formGroup.get('IDItem').setValue(this.id);
          this.formGroup.get('Id').setValue(idItemInBranch);
          this.formGroup.get('IDBranch').setValue(this.selectedBranch.Id);
          if(idItemInBranch == 0) {
            this.formGroup.get('TreeType').setValue(this.item?.TreeType);
          }
          this.formGroup.controls.IDBranch.markAsDirty();
          this.formGroup.controls.Id.markAsDirty();
          this.formGroup.controls.IDItem.markAsDirty();
          this.formGroup.controls.ItemType.markAsDirty();
          this.formGroup.controls.TreeType.markAsDirty();     
          this.submitAttempt = true;
          let submitItem = this.getDirtyValues(this.formGroup);

          this.itemInBranchProvider
            .save(submitItem, this.pageConfig.isForceCreate)
            .then((savedItem: any) => {
              resolve(savedItem);

              if (savedItem) {
                this.item.IDItemInBranch = savedItem.Id;
              }
              this.savedChange(savedItem, this.formGroup);
              if (this.pageConfig.pageName) this.env.publishEvent({ Code: this.pageConfig.pageName });

              this.formGroup.get('Id').setValue(this.id);
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

  async saveChange() {
    this.formGroup.get('Id').setValue(this.id);
    this.formGroup.controls.Id.markAsDirty();
    super.saveChange2();
  }

  savedChange(savedItem = null, form = this.formGroup) {
    super.savedChange(savedItem);
    let groups = this.formGroup.get('WMS_ItemInWarehouseConfig') as FormArray;
    let idsBeforeSaving = new Set(groups.controls.map((g) => g.get('Id').value));
    this.item = savedItem;

    if (this.item.WMS_ItemInWarehouseConfig?.length > 0) {
      let newIds = new Set(this.item.WMS_ItemInWarehouseConfig.map((i) => i.Id));
      const diff = [...newIds].filter((item) => !idsBeforeSaving.has(item));
      if (diff?.length > 0) {
        groups.controls .find((d) => d.get('Id').value == null) ?.get('Id') .setValue(diff[0]);
      }
    }
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

  createAdjust(){  
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
    let result = Object.keys(groupedInventories).map(key => ({
      IDBranch: parseInt(key.split('-')[0]),
      AdjustLotLPNLocations: groupedInventories[key]
    }));
    if(result.length > 0){
      this.env
      .showPrompt(
        'Bạn có chắc muốn tạo phiếu điều chỉnh không?',
        null,
        'Tạo phiếu điều chỉnh',
      )
      .then((_) => {
        this.env
        .showLoading(
          'Please wait for a few moments',
          this.pageProvider.commonService
            .connect('POST', 'WMS/Item/PostAdjustments/', result)
            .toPromise()
            .then((res) => {
              if(res) {
                this.env.showAlert('Tạo phiếu điều chỉnh thành công!');
                this.isAdjust = false;
                this.Inventories.forEach((d) => {
                  d.QtyAdjust = 0;
                  d.QtyTarget = d.QuantityOnHand;
                });
              }else {
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

 searchItemGroupShowAllChildren = (term: string, ids: any) :any => {
  return super.searchShowAllChildren(term,ids,this.itemGroupList);
 } 

 searchResultIdBranchList = { term: '', ids: [] };
 searchBranchShowAllChildren =  (term: string, item: any) :any =>{
  if (this.searchResultIdBranchList.term != term) {
    this.searchResultIdBranchList.term = term;
    let source = this.env.branchList
    this.searchResultIdBranchList.ids = lib.searchTreeReturnId(source, term);
  }
  return this.searchResultIdBranchList.ids.indexOf(item.Id) > -1;
 }
}
