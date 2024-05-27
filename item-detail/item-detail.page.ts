import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, mergeMap, switchMap, tap } from 'rxjs/operators';
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
  ];

  uomList = [];
  zoneList = [];
  filterZoneList = [];
  locationList = [];
  filterLocationList = [];
  cartonGroupList = [];
  storerList = [];
  inputTaxList = [];
  outputTaxList = [];

  baseUomName = '???';
  UoMs = []; //UoM grid

  subOptions = null;
  segmentView = {
    Page: 'ProductInformation',
    ShowSpinner: true,
  };
  branchSelected = false;

  constructor(
    public pageProvider: WMS_ItemProvider,
    public itemInBranchProvider: WMS_ItemInBranchProvider,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public itemUoMProvider: WMS_ItemUoMProvider,
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
      });
    });

    this.env.getType('Rotation').then((result: any) => {
      this.RotationList = result;
    });
    this.env.getType('RotateBy').then((result: any) => {
      this.RotateByList = result;
    });
    this.env.getType('ItemType', true).then((result: any) => {
      if (this.pageConfig.canEditFixedAssetsOnly) {
      }
      this.ItemTypeList = result;
    });
    this.env.getType('ExpiryUnit').then((result: any) => {
      this.ExpiryUnitList = result;
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
          this.branchInWarehouse = result;
          this.branchInWarehouse.forEach((i) => {
            i.disabled = true;
          });

          this.markNestedNode(this.branchInWarehouse, this.selectedBranch);
        });
      });

    this.contactProvider.read({ IsStorer: true }).then((resp) => {
      this.storerList = resp['data'];
    });

    this.contactProvider.read({ IsVendor: true, Take: 5000 }).then((resp) => {
      this.vendorList = resp['data'];
    });

    super.preLoadData();
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
      this.itemGroupListDataSource.selected = [itemGroupSelected];
    }
    this.itemGroupListDataSource.initSearch();
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
  }
  refresh() {
    this.loadItemInBranch();
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
        message: 'Bạn chắc muốn xóa chủ hàng và các cấu hình này?',
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
                this.env.showTranslateMessage('Deleted!', 'success');
              });
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
  }

  itemGroupListDataSource = {
    searchProvider: this.itemGroupProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
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
                SortBy: ['Id_desc'],
                Take: 5000,
                Skip: 0,
                Keyword: term,
                SkipMCP: true,
                SkipAddress: true,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
                mergeMap((e) => lib.buildFlatTree(e, e)),
              ),
          ),
        ),
      );
    },
  };

  branchListDataSource = [this.env.branchList];
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
          'Please wait a moment!',
          this.pageProvider.commonService
            .connect('GET', 'WMS/ItemInBranch/', query)
            .toPromise()
            .then((data: any) => {
              if (data) {
                this.item = data;
                this.formGroup?.patchValue(this.item);
                this.formGroup?.markAsPristine();
                this.cdr.detectChanges();
                if (this.item?.IDItemGroup) {
                  let itemGroupSelected = {
                    Id: this.item.IDItemGroup,
                    Name: this.item?.ItemGroupName,
                  };
                  this.itemGroupListDataSource.selected = [itemGroupSelected];
                }
                this.itemGroupListDataSource.initSearch();
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
          if (this.item?.IDItemGroup) {
            let itemGroupSelected = {
              Id: this.item.IDItemGroup,
              Name: this.item?.ItemGroupName,
            };
            this.itemGroupListDataSource.selected = [itemGroupSelected];
          }
          this.itemGroupListDataSource.initSearch();
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
    if (this.segmentView.Page == 'UnitPrice') {
      this.loadPriceList();
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
      this.env.showTranslateMessage('Unit saved', 'success');
      this.preLoadData(null);
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
        this.env.showTranslateMessage('New unit saved', 'success');
        newUoM.Id = result['Id'];
      });

      return newUoM;
    }
  }

  deleteUoM(i) {
    if (this.pageConfig.canDeleteUoM) {
      if (i.IsBaseUoM) {
        this.env.showTranslateMessage('Please set up origianl unit before deleting', 'danger');
        return;
      }
      this.alertCtrl
        .create({
          header: 'Xóa đơn vị ' + (i.Name ? ' ' + i.Name : ''),
          //subHeader: '---',
          message: 'Bạn chắc muốn xóa đơn vị' + (i.Name ? ' ' + i.Name : '') + '?',
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

                    this.env.showTranslateMessage('Deleted!', 'success');
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
        this.env.showTranslateMessage('Changed unit saved', 'success');
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
        this.env.showTranslateMessage('Changed unit saved', 'success');
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
        'Please wait a moment!',
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
        this.env.showTranslateMessage('Changes saved', 'success');
        this.loadPriceList();
      });
  }

  async saveItemInBranch() {
    if (this.selectedBranch) {
      return new Promise((resolve, reject) => {
        this.formGroup.updateValueAndValidity();
        if (!this.formGroup.valid) {
          this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
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
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
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
    this.saveChange2();
  }

  saveChange2(form = this.formGroup, publishEventCode = this.pageConfig.pageName, provider = this.pageProvider) {
    return new Promise((resolve, reject) => {
      this.formGroup.updateValueAndValidity();
      if (!form.valid) {
        this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
      } else if (this.submitAttempt == false) {
        this.submitAttempt = true;
        let submitItem = this.getDirtyValues(form);

        provider
          .save(submitItem, this.pageConfig.isForceCreate)
          .then((savedItem: any) => {
            resolve(savedItem);
            if (savedItem?.WMS_ItemInWarehouseConfig && savedItem?.WMS_ItemInWarehouseConfig.length) {
              let formArray = this.formGroup.get('WMS_ItemInWarehouseConfig') as FormArray;
              formArray.clear();
              savedItem?.WMS_ItemInWarehouseConfig.forEach((c) => {
                this.addConfig(c);
              });
            }
            this.savedChange(savedItem, form);
            if (publishEventCode) this.env.publishEvent({ Code: publishEventCode });
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.cdr.detectChanges();
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  async deletePriceDetail(p) {
    if (this.pageConfig.canEdit) {
      this.alertCtrl
        .create({
          header: 'Xóa giá',
          //subHeader: '---',
          message: 'Bạn chắc muốn xóa giá này?',
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
                  this.env.showTranslateMessage('Changes saved', 'success');
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
}
