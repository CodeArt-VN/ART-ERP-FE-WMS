import { Component, ChangeDetectorRef } from '@angular/core';
import { LoadingController, AlertController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { WMS_ItemProvider, WMS_ItemUoMProvider, WMS_PriceListDetailProvider, WMS_PriceListProvider, WMS_ItemGroupProvider, WMS_UoMProvider, WMS_ZoneProvider, WMS_CartonGroupProvider, WMS_ItemInWarehouseConfigProvider, BRA_BranchProvider, CRM_ContactProvider, WMS_LocationProvider, FINANCE_TaxDefinitionProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
    selector: 'app-item-detail',
    templateUrl: './item-detail.page.html',
    styleUrls: ['./item-detail.page.scss'],
})
export class ItemDetailPage extends PageBase {
    segmentView = {
        Page: 's4',
        ShowSpinner: true
    }
    uomList = [];
    zoneList = [];
    filterZoneList = [];
    locationList = [];
    filterLocationList = [];
    cartonGroupList = [];
    branchList = [];
    storerList = [];
    inputTaxList = [];
    outputTaxList = [];

    baseUomName = '???';
    UoMs = []; //UoM grid

    constructor(
        public pageProvider: WMS_ItemProvider,
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
        public sysConfigProvider: SYS_ConfigProvider,

        public env: EnvService,
        public route: ActivatedRoute,

        // public navParams: NavParams,
        public alertCtrl: AlertController,
        public navCtrl: NavController,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
        private config: NgSelectConfig
    ) {
        super();
        this.item = {};
        this.pageConfig.isDetailPage = true;

        this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
        this.config.clearAllText = 'Xóa';

        this.id = this.route.snapshot.paramMap.get('id');
        this.formGroup = formBuilder.group({
            Storers: [],

            IDItemGroup: ['', Validators.required],
            IDBranch: [null],
            Id: [0],
            Code: ['', Validators.required],
            Name: ['', Validators.required],
            ForeignName: [''],
            Remark: [''],
            ForeignRemark: [''],

            ItemType: ['Items', Validators.required],
            Industry: [''],
            Division: [''],
            IsInventoryItem: [true],
            IsSalesItem: [true],
            IsPurchaseItem: [true],

            BaseUoM: [''],
            AccountantUoM: [''],
            InventoryUoM: [''],
            PurchasingUoM: [''],
            SalesUoM: [''],

            MinimumInventoryLevel: [''],
            MaximumInventoryLevel: [''],
            IDSalesTaxDefinition: ['', Validators.required],
            IDPurchaseTaxDefinition: ['', Validators.required],

            // IDTaxDefinition: [''],
            // IDRevenueAccount: [''],
            // IDExemptRevenueAccount: [''],
            // IDDefaultWarehouse: [''],
            IDPreferredVendor: [''],

            // MfrCatalogNo: [''],
            // PrefQtyInPurchaseUnits: [''],
            // ProductionDateInDays: [''],
            // TaxRateForWholesaler: [''],
            // SalesTaxInPercent: [''],
            // IsTrackSales: [''],
            // NoOfItemsPerSalesUnit: [''],
            IDCartonGroup: [''],



            SerialNumberStart: [''],
            SerialNumberEnd: [''],
            SerialNumberNext: [''],


            // CostToReorderItem: [''],
            // ReorderPoint: [''],
            // QuantityToReorder: [''],
            // CostToCarryingPerUnit: [''],
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

            Sort: [''],
            IsDisabled: [''],

            WMS_ItemInWarehouseConfig: this.formBuilder.array([]),
            VendorIds: []
        })
    }



    RotationList = [];
    RotateByList = [];
    ItemTypeList = [];
    ExpiryUnitList = [];

    IndustryList = [];
    DivisionList = [];
    vendorList = [];


    preLoadData() {
        this.uomProvider.read().then(resp => {
            this.uomList = resp['data'];
        });
        this.zoneProvider.read().then(resp => {
            this.zoneList = resp['data'];
        });
        this.locationProvider.read().then(resp => {
            this.locationList = resp['data'];
        });
        this.cartonGroupProvider.read().then(resp => {
            this.cartonGroupList = resp['data'];
        });

        this.taxProvider.read().then(resp => {
            this.inputTaxList = resp['data'].filter(d => d.Category == 'InputTax');
            this.outputTaxList = resp['data'].filter(d => d.Category == 'OutputTax');

            Promise.all([
                this.sysConfigProvider.read({ Code: 'TaxInput', IDBranch: this.env.selectedBranch }),
                this.sysConfigProvider.read({ Code: 'TaxOutput', IDBranch: this.env.selectedBranch })
            ]).then((values: any) => {
                if (values[0]['data'].length && this.item.Id == 0) {
                    let idTaxInput = JSON.parse(values[0]['data'][0].Value).Id;
                    this.formGroup.controls.IDPurchaseTaxDefinition.setValue(idTaxInput);
                    this.formGroup.controls.IDPurchaseTaxDefinition.markAsDirty();
                };
                if (values[1]['data'].length && this.item.Id == 0) {
                    let idTaxOput = JSON.parse(values[1]['data'][0].Value).Id;
                    this.formGroup.controls.IDSalesTaxDefinition.setValue(idTaxOput);
                    this.formGroup.controls.IDSalesTaxDefinition.markAsDirty();
                };
            });
        })

        this.env.getType('Rotation').then((result: any) => {
            this.RotationList = result;
        });
        this.env.getType('RotateBy').then((result: any) => {
            this.RotateByList = result;
        });
        this.env.getType('ItemType', true).then((result: any) => {
            console.log(result, this.pageConfig);
            
            if (this.pageConfig.canEditFixedAssetsOnly) {
                
            }
            this.ItemTypeList = result;
            
        });
        this.env.getType('ExpiryUnit').then((result: any) => {
            this.ExpiryUnitList = result;
        });

        this.branchProvider.read({ Skip: 0, Take: 5000, IDType: 115, AllParent: true, Id: this.env.selectedBranchAndChildren }).then(resp => {
            lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
                this.branchList = result;
                this.branchList.forEach(i => {
                    i.disabled = true;
                });
                this.markNestedNode(this.branchList, this.env.selectedBranch);
                super.preLoadData(event);
            });
        });

        this.contactProvider.read({ IsStorer: true }).then((resp) => {
            this.storerList = resp['data'];
        });

        this.contactProvider.read({ IsVendor: true, Take: 5000, }).then((resp) => {
            this.vendorList = resp['data'];
        });

        super.preLoadData();
    }

    loadedData() {

        if (this.item.IDItemGroup) {
            this.itemGroupProvider.getAnItem(this.item.IDItemGroup).then((itemGroup: any) => {
                this.itemGroupSelected = { Id: itemGroup.Id, Name: itemGroup.Name };
                if (itemGroup && this.itemGroupListSelected.findIndex(d => d.Id == itemGroup.Id) == -1) {
                    this.itemGroupListSelected.push(this.itemGroupSelected);
                }
            }).finally(() => {
                this.itemGroupSearch();
                this.cdr.detectChanges();
            });
        }
        else {
            this.itemGroupSearch();
        }
        if (this.item.Id) {
            Promise.all([

                this.itemUoMProvider.read({ IDItem: this.item.Id }),

            ]).then(values => {

                this.UoMs = values[0]['data'];
                let baseUoM = this.UoMs.find(d => d.IsBaseUoM);
                if (baseUoM) {
                    baseUoM._IsBaseUoM = baseUoM.IsBaseUoM; //Fix change call when navi tabs
                    this.baseUomName = baseUoM.Name;
                }
            });
        }
        else {
            this.env.getStorage('item.IDItemGroup').then(val => {
                this.item.IDItemGroup = val;
                this.cdr.detectChanges();
            })
        }

        super.loadedData(null);
        this.setItemConfigs();

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
        this.loadData();
    }

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.IDType == 115)
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    setItemConfigs() {
        this.formGroup.controls.WMS_ItemInWarehouseConfig = new FormArray([]);
        if (this.item.WMS_ItemInWarehouseConfig && this.item.WMS_ItemInWarehouseConfig.length) {
            this.item.WMS_ItemInWarehouseConfig.forEach(c => {
                this.addConfig(c);
            })
        }
    }

    addConfig(config) {
        let groups = <FormArray>this.formGroup.controls.WMS_ItemInWarehouseConfig;


        let group = this.formBuilder.group({
            IDPartner: config.IDPartner,
            IDBranch: config.IDBranch,
            IDStorer: config.IDStorer,
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

        groups.push(group);
    }

    removeStorer(index) {
        this.alertCtrl.create({
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
                        Ids.push({ Id: groups.controls[index]['controls'].Id.value });
                        this.itemInWarehouseConfig.delete(Ids).then(resp => {
                            this.items = this.items.filter(d => d.Id != Ids[0].Id);
                            groups.removeAt(index);
                            this.env.showTranslateMessage('erp.app.pages.wms.item.message.delete-complete', 'success');
                        });
                    }
                }
            ]
        }).then(alert => {
            alert.present();
        })
    }

    itemGroupList$
    itemGroupListLoading = false;
    itemGroupListInput$ = new Subject<string>();
    itemGroupListSelected = [];
    itemGroupSelected = null;
    itemGroupSearch() {
        this.itemGroupListLoading = false;
        this.itemGroupList$ = concat(
            of(this.itemGroupListSelected),
            this.itemGroupListInput$.pipe(
                distinctUntilChanged(),
                tap(() => this.itemGroupListLoading = true),
                switchMap(term => this.itemGroupProvider.search({ Take: 5000, Skip: 0, Keyword: term })
                    .pipe(
                        catchError(() => of([])), // empty list on error
                        tap(() => this.itemGroupListLoading = false),
                        mergeMap(e => lib.buildFlatTree(e, e))
                    ))
            )
        );
    }

    changeGroup() {
        this.env.setStorage('item.IDItemGroup', this.item.IDItemGroup);
    }

    segmentChanged(ev: any) {
        this.segmentView.Page = ev.detail.value;
        if (this.segmentView.Page == 's3') {
            this.loadPriceList();
        }
    }

    changeBaseUoM(i) {
        if (!this.pageConfig.canEditUoM) {
            return;
        }
        let checkedRows = this.UoMs.filter(d => d.IsBaseUoM);
        if (i.IsBaseUoM && checkedRows.length > 0) {
            for (let index = 0; index < checkedRows.length; index++) {
                const r = checkedRows[index];
                if (r.Id != i.Id) {
                    r.IsBaseUoM = false;
                    this.saveUoM(r);
                }
                else {
                    r.AlternativeQuantity = 1;
                    r.BaseQuantity = 1;

                }
            }
            this.saveUoM(i);
        }
        else {
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
        this.itemUoMProvider.save(i).then(result => {
            if (!i.Id) {
                i.Id = result['Id'];
            }
            this.env.showTranslateMessage('erp.app.pages.wms.item.message.save-uom-complete', 'success');
            this.preLoadData();
        })

    }

    checkCreatedItem() {
        return new Promise((resolve, reject) => {
            if (!this.item.Id) {
                this.saveChange().then(result => {
                    resolve(this.item.Id);
                });
            }
            else {
                resolve(this.item.Id);
            }
        });
    }

    addUoM() {
        this.checkCreatedItem().then(() => {
            let newUoM = {
                Id: 0,
                IDItem: this.item.Id,
                AlternativeQuantity: 1,
                BaseQuantity: 1,
                IsBaseUoM: this.UoMs.filter(d => d.IsBaseUoM).length == 0,
                Name: 'N/A',
            };
            this.UoMs.push(newUoM);
            this.saveUoM(newUoM);
        });
    }

    async createNewUoM(name) {

        let newUoM = { Id: null, Name: name };
        if (this.uomList.findIndex(d => d.name == name) == -1) {
            await this.uomProvider.save(newUoM).then(result => {
                this.uomList.push({ Id: result['Id'], Name: result['Name'] });
                this.uomList = [...this.uomList];
                this.env.showTranslateMessage('erp.app.pages.wms.item.message.save-new-uom-complete', 'success');
                newUoM.Id = result['Id'];
            });

            return newUoM;
        }
    }

    deleteUoM(i) {
        if (this.pageConfig.canDeleteUoM) {
            if (i.IsBaseUoM) {
                this.env.showTranslateMessage('erp.app.pages.wms.item.message.set-base-uom-delete', 'danger');
                return;
            }
            this.alertCtrl.create({
                header: 'Xóa đơn vị ' + (i.Name ? ' ' + i.Name : ''),
                //subHeader: '---',
                message: 'Bạn chắc muốn xóa đơn vị' + (i.Name ? ' ' + i.Name : '') + '?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Đồng ý xóa',
                        cssClass: 'danger-btn',
                        handler: () => {
                            this.itemUoMProvider.delete(i).then(() => {

                                const index = this.UoMs.indexOf(i, 0);
                                if (index > -1) {
                                    this.UoMs.splice(index, 1);
                                }


                                this.env.showTranslateMessage('erp.app.pages.wms.item.message.delete-complete-2', 'success');
                            }).catch(err => {
                                //console.log(err);
                            })
                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
    }

    updateUoM() {
        if (this.pageConfig.canEditUoM) {
            this.pageProvider.save(this.item).then(() => {
                this.env.showTranslateMessage('erp.app.pages.wms.item.message.update-uom');
            });
        }
    }

    priceList = [];
    priceListQuery = {};
    loadPriceList() {
        this.segmentView.ShowSpinner = true;

        let apiPath = { method: "GET", url: function (Id) { return ApiSetting.apiDomain("WMS/PriceList/PriceListByItem/" + Id) } };
        this.pageProvider.commonService.connect(apiPath.method, apiPath.url(this.id), this.priceListQuery).toPromise().then((data: any) => {
            data.forEach(i => {
                if (!i.Prices) i.Prices = [];
                this.UoMs.forEach(u => {
                    let p = i.Prices.find(d => d.IDItemUoM == u.Id);
                    if (!p) {
                        p = { Id: 0, IDItemUoM: u.Id, _UoM: { Id: u.Id, Name: u.Name }, IDItem: this.id, IsManual: false, Price: 0, Price1: 0, Price2: 0 };
                        i.Prices.push(p);
                    }
                    p.IDPriceList = i.Id;
                    p.Sort = u.BaseQuantity / u.AlternativeQuantity;
                });

                i.Prices.sort((a, b) => (a.Sort > b.Sort) ? 1 : ((b.Sort > a.Sort) ? -1 : 0));
            });
            this.priceList = data;
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
        let apiPath = { method: "POST", url: function (id) { return ApiSetting.apiDomain("WMS/PriceListDetail/CalcPrice/" + id) } };
        this.priceListDetailProvider.commonService.connect(apiPath.method, apiPath.url(p.Id), p).toPromise().then((resp: any) => {
            this.env.showTranslateMessage('erp.app.pages.wms.item.message.save-changed', 'success');
            this.loadPriceList();
        });
    }

    async saveChange() {
        super.saveChange2();
    }

    async deletePriceDetail(p) {
        if (this.pageConfig.canEdit) {
            this.alertCtrl.create({
                header: 'Xóa giá',
                //subHeader: '---',
                message: 'Bạn chắc muốn xóa giá này?',
                buttons: [{ text: 'Không', role: 'cancel', },
                {
                    text: 'Đồng ý xóa',
                    cssClass: 'danger-btn',
                    handler: () => {
                        this.priceListDetailProvider.delete([{ Id: p.Id }]).then(resp => {
                            p.Id = 0;
                            p.Price = 0;
                            p.Price1 = 0;
                            p.Price2 = 0;
                            p.IsManual = false;
                            this.env.showTranslateMessage('erp.app.pages.wms.item.message.save-changed', 'success');
                        });
                    }
                }]
            }).then(alert => {
                alert.present();
            })
        }
    }

}

