import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, HRM_StaffProvider, SYS_SchemaProvider, SYS_SyncJobProvider, WMS_AdjustmentDetailProvider, WMS_AdjustmentProvider, WMS_CycleCountProvider, WMS_ItemProvider, WMS_LotLPNLocationProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_Adjustment } from 'src/app/models/model-list-interface';

@Component({
    selector: 'app-adjustment-detail',
    templateUrl: 'adjustment-detail.page.html',
    styleUrls: ['adjustment-detail.page.scss']
})
export class AdjustmentDetailPage extends PageBase {
    statusDataSource: any;
    reasonDataSource: any;
    branchList
    constructor(
        public pageProvider: WMS_AdjustmentProvider,
        public adjustmentDetailService: WMS_AdjustmentDetailProvider,
        public lotLPNLocationlService: WMS_LotLPNLocationProvider,
        public contactService: CRM_ContactProvider,
        public schemaService: SYS_SchemaProvider,
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
        public location: Location,
    ) {
        super();
        this.pageConfig.isDetailPage = true;
        this.formGroup = this.formBuilder.group({
            Id: new FormControl({ value: '', disabled: true }),
            IDBranch:[''],
            IDStorer:[''],
            Name:[''],
            IDCycleCount: new FormControl({ value: '', disabled: false }),
            AdjustmentDetails: this.formBuilder.array([]),
          
            Reason : [''],
            Remark: [''],
            Sort: [''],
            CountType: [''],
            CountDate: [''],
            Status: ['Draft', Validators.required],
            
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
        });
    }
    storerDateSource = {
        searchProvider: this.contactService,
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
                this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                  catchError(() => of([])), // empty list on error
                  tap(() => (this.loading = false)),
                ),
              ),
            ),
          );
        },
    };
    
    preLoadData(event) {

        this.statusDataSource = [
            { Name: 'Done', Code: 'Done' },
            { Name: 'Pending', Code: 'Pending' },
        ];
        this.reasonDataSource = [
            { Name: 'Fail goods', Code: 'FailGoods' },
            { Name: 'Wrong input', Code: 'WrongInput' },
            { Name: 'Cycle count difference', Code: 'CycleCount' },
            { Name: 'Other...', Code: 'Other' },
        ];
    
        super.preLoadData(event);
    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event, ignoredFromGroup);
        this.query.IDAdjustment = this.item.Id;
        this.query.Id = undefined;
        this.adjustmentDetailService.read(this.query,false).then((listDetail:any) =>{
            if(listDetail!= null && listDetail.data.length>0){
                const adjusmenttDetailsArray = this.formGroup.get('AdjustmentDetails') as FormArray;
                adjusmenttDetailsArray.clear();
                this.item.AdjustmentDetails = listDetail.data;
                this.patchFieldsValue();
            }
        })
       
        this.formGroup.get('IDBranch').markAsDirty();
        this.formGroup.get('Status').markAsDirty();
        this.query.Id = this.item.Id;
        this.branchProvider.read({ Skip: 0, Take: 5000, Type: 'Warehouse', AllParent: true, Id: this.env.selectedBranchAndChildren }).then(resp => {
            lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
                this.branchList = result;
                this.branchList.forEach(i => {
                    i.disabled = true;
                });
                this.markNestedNode(this.branchList, this.env.selectedBranch);
                super.preLoadData(event);
            }).catch(err => {
                this.env.showMessage(err);
                console.log(err);
            });
        });
        super.preLoadData(event);
        this.storerDateSource.initSearch();
    }
    
    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;

        if (this.item.AdjustmentDetails?.length) {
            this.item.AdjustmentDetails.forEach(i => {
                this.addField(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.AdjustmentDetails.disable();
        }

        this.pageConfig.showSpinner = false;
    }
    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.AdjustmentDetails;
        let group = this.formBuilder.group({
            _lotLPNLocationDataSource: {
                searchProvider: this.lotLPNLocationlService,
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
                        this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                          catchError(() => of([])), // empty list on error
                          tap(() => (this.loading = false)),
                        ),
                      ),
                    ),
                  );
                },
              },
            Id:[field?.Id],
            IDAdjustment:[this.formGroup.get('Id').value, Validators.required],
            IDItem:[field?.IDItem, Validators.required],
            QuantityAdjusted : [field?.QuantityAdjusted || 0],
            WarehouseQuantity:[field?.WarehouseQuantity],
            Cube:[field?.Cube || 0],
            GrossWeight:[field?.GrossWeight || 0],
            NetWeight:[field?.NetWeight || 0],

            ZoneName:[field?.ZoneName],
            Lot:[field?.Lot],
            LotName:[field?.LotName],
            Location:[field?.Location],
            LocationName:[field?.LocationName],
            LPN:[field?.LPN],

            Status:[field?.Status || 'Pending'],
            UoMName:[field?._Item?.UoMName],
            ItemName: [field?._Item?.ItemName], //de hien thi
          
            IsChecked: new FormControl({ value: false, disabled: false }),
        })
        groups.push(group);
        if(field){
           
            group.controls._lotLPNLocationDataSource.value.selected.push(field);
        }
        if(markAsDirty){
            group.get('IDAdjustment').markAsDirty();
            group.get('Status').markAsDirty();
            group.get('QuantityAdjusted').markAsDirty();
            group.get('Cube').markAsDirty();
            group.get('GrossWeight').markAsDirty();
            group.get('NetWeight').markAsDirty();

        }
        group.controls._lotLPNLocationDataSource.value.initSearch();
    }

    changeIDItem(e,fg){
        console.log(e);
        fg.get('IDItem').setValue(e.IDItem);
        fg.get('Location').setValue(e._Location.Id);
        fg.get('LocationName').setValue(e._Location.Name);
        fg.get('ZoneName').setValue(e._Location.ZoneName);
        fg.get('Lot').setValue(e._Lot.Id);
        fg.get('LotName').setValue(e._Lot.Lottable0);
        fg.get('LPN').setValue(e._LPN.Id);
        let uom = e._Item.UoM.find(d=>d.IsBaseUoM);
        fg.get('UoMName').setValue(uom.Name);
        fg.get('WarehouseQuantity').setValue(e.QuantityOnHand);

        fg.get('IDItem').markAsDirty();
        fg.get('Location').markAsDirty();
        fg.get('Lot').markAsDirty();
        fg.get('LPN').markAsDirty();
        fg.get('Location').markAsDirty();

        this.saveChangeDetail(fg);
    }

    async saveChangeDetail(fg){
        this.saveChange2(fg,null,this.adjustmentDetailService);

    }
    async saveChange() {
        let submitItem = this.getDirtyValues(this.formGroup);
        super.saveChange2();
    }

    sortDetail: any = {};
    sortToggle(field) {
        if (!this.sortDetail[field]) {
            this.sortDetail[field] = field
        } else if (this.sortDetail[field] == field) {
            this.sortDetail[field] = field + '_desc'
        }
        else {
            delete this.sortDetail[field];
        }
        // let s = Object.keys(sortTerms).reduce(function (res, v) {
        //     return res.concat(sortTerms[v]);
        // }, []);
        if (Object.keys(this.sortDetail).length === 0) {
            this.refresh();
        }
        else{
            this.reInitAdjustmentDetails();
        }
    }

    reInitAdjustmentDetails() {
        const adjustmentDetailsArray = this.formGroup.get('AdjustmentDetails') as FormArray;
        this.item.AdjustmentDetails = adjustmentDetailsArray.getRawValue();
        for (const key in this.sortDetail) {
            if (this.sortDetail.hasOwnProperty(key)) {
                const value = this.sortDetail[key];
                this.sortByKey(value);
            }
        }
        adjustmentDetailsArray.clear();
        this.item.AdjustmentDetails.forEach(s => this.addField(s));
    }

    sortByKey(key: string, desc: boolean = false) {
        if(key.includes('_desc')){
            key = key.replace('_desc','');
            desc = true;
        }
        this.item.AdjustmentDetails.sort((a, b) => {
            const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            return desc ? -comparison : comparison;
        });
     
    }

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.Type == 'Warehouse')
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }
}