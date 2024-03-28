import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, HRM_StaffProvider, SYS_SchemaProvider, SYS_SyncJobProvider, WMS_AdjustmentDetailProvider, WMS_AdjustmentProvider, WMS_CycleCountProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
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
    countTypeDataSource: any;
    statusDataSource: any;
    schema: Schema;
    config: any = null;
    itemList: any;
    tempItemList: any;
    countItem: number = 0;
    branchList
    constructor(
        public pageProvider: WMS_AdjustmentProvider,
        public adjustmentDetailService: WMS_AdjustmentDetailProvider,
        public staffService: HRM_StaffProvider,
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
            IDBranch: ['', Validators.required],
            IDCycleCount: new FormControl({ value: '', disabled: false }),
            AdjustmentDetails: this.formBuilder.array([]),
          
          
            Reason : [''],
            Remark: [''],
            Sort: [''],
            CountType: [''],
            CountDate: [''],
            Status: ['', Validators.required],
            
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
        });
    }

    preLoadData(event) {

        this.statusDataSource = [
            { Name: 'Done', Code: 'Done' },
            { Name: 'Pending', Code: 'Pending' },
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

        this.query.Id = this.item.Id;
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
            IDAdjustment:[this.formGroup.get('Id').value, Validators.required],
            IDItem:[field.IDItem, Validators.required],
            QuantityAdjusted : [field.QuantityAdjusted],
            WarehouseQuantity:[field.WarehouseQuantity],
            Cube:[field.Cube || 0],
            GrossWeight:[field.GrossWeight || 0],
            NetWeight:[field.NetWeight || 0],

            ZoneName:[field.ZoneName],
            Lot:[field.Lot],
            LotName:[field.LotName],
            Location:[field.Location],
            LocationName:[field.LocationName],
            LPN:[field.LPN],

            Status:[field.Status || 'Pending'],
            UoMName:[field.UoMName || 0],
            ItemName: [ field.ItemName], //de hien thi
            IsDisabled: new FormControl({ value: field.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: field.IsDeleted, disabled: true }),
            CreatedBy: new FormControl({ value: field.CreatedBy, disabled: true }),
            CreatedDate: new FormControl({ value: field.CreatedDate, disabled: true }),
            ModifiedBy: new FormControl({ value: field.ModifiedBy, disabled: true }),
            ModifiedDate: new FormControl({ value: field.ModifiedDate, disabled: true }),
            IsChecked: new FormControl({ value: false, disabled: false }),
        })
        groups.push(group);
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