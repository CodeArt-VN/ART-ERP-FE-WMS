import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SYS_SchemaProvider, WMS_CycleCountDetailProvider, WMS_CycleCountProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { WMS_Item } from 'src/app/models/model-list-interface';
import { Schema } from 'src/app/models/options-interface';
import { isTaggedTemplateExpression } from 'typescript';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
    selector: 'app-cycle-count-detail',
    templateUrl: 'cycle-count-detail.page.html',
    styleUrls: ['cycle-count-detail.page.scss']
})
export class CycleCountDetailPage extends PageBase {
    countTypeDataSource: any;
    schema: Schema;
    config: any = null;
    itemList: any;
    tempItemList: any;
    countItem: number = 0;
    constructor(
        public pageProvider: WMS_CycleCountProvider,
        public cycleCountDetailService: WMS_CycleCountDetailProvider,
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
        this.pageConfig.canEdit = true;
        this.pageConfig.canAdd = true;

        this.formGroup = this.formBuilder.group({
            Id: new FormControl({ value: '', disabled: true }),
            IDBranch: new FormControl({ value: this.env.selectedBranch, disabled: true }),
            Code: [''],
            Name: [''],
            Remark: [''],
            Sort: [''],
            CountType: [''],
            CountDate: [''],
            IsShowSysQty: [false],
            Status: ['', Validators.required],
            Config: [''],
            IsPrintAllCounterPerSheet: [false],
            CycleCountDetails: this.formBuilder.array([]),
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
            DeletedFields: [[]],
        });
    }

    preLoadData(event) {
        this.countTypeDataSource = [
            { Name: 'Single', Code: 'Single' },
            { Name: 'Validators', Code: 'Validators' },
        ];
        //let code = {code:'item'};
        // let apiPath ={
        //     method: "POST",
        //     url: function () { return ApiSetting.apiDomain('SYS/Schema/GetAnItemByCode/') }
        // }
        // this.schemaService.commonService.connect(apiPath.method, apiPath.url(),code).toPromise()
        // .then((values : any)=>{
        //     if(values != null && values.data != null && values.data.length)
        //     this.schema = values.data[0];
        // });
        this.schemaService.getAnItem(5)
            .then((value: any) => {
                if (value)
                    this.schema = value;
            });
        super.preLoadData(event);
    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event, ignoredFromGroup);

        this.patchFieldsValue();
        this.formGroup.get('IDBranch').markAsDirty();
        //  this.patchFormValue();
    }
    private patchFieldsValue() {
        this.formGroup.controls.CycleCountDetails = new FormArray([]);
        if (this.item.CycleCountDetails?.length) {
            this.item.CycleCountDetails.forEach(i => this.addField(i));
        }

        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.CycleCountDetails.disable();
        }
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let group = this.formBuilder.group({
            IDCycleCount: [this.item.Id],
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem: new FormControl({ value: field.IDItem, disabled: true }),
            IDUoM: new FormControl({ value: field.IDUoM, disabled: true }),
            Code: [field.Code],
            Name: [field.Name],
            Remark: [field.Remark],
            Sort: [field.Sort],
            CurrentQuantity: [field.CurrentQuantity],
            IsCounted: [field.IsCounted],
            CountedQuantity: [field.CountedQuantity],
            Zone: [field.Zone],
            Row: [field.Row],
            Level: [field.Level],
            Location: [field.Location],
            UoMName: new FormControl({ value: field.UoMName, disabled: true }), //de hien thi
            ItemName: new FormControl({ value: field.ItemName, disabled: true }), //de hien thi
            IsDisabled: new FormControl({ value: field.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: field.IsDeleted, disabled: true }),
            CreatedBy: new FormControl({ value: field.CreatedBy, disabled: true }),
            CreatedDate: new FormControl({ value: field.CreatedDate, disabled: true }),
            ModifiedBy: new FormControl({ value: field.ModifiedBy, disabled: true }),
            ModifiedDate: new FormControl({ value: field.ModifiedDate, disabled: true }),
        })
        groups.push(group);
    }

    filterConfig(e) {
        let obj = {
            'config': JSON.stringify(e)
        }

        let apiPath = { method: "POST", url: function () { return ApiSetting.apiDomain("WMS/Item/Filter") } };
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.itemService.commonService.connect(apiPath.method, apiPath.url(), obj).toPromise())

            .then((data: any) => {
                if (data.length) {
                    this.tempItemList = data;
                    this.countItem = data.length
                    this.loadedData();
                }
            })
    }

    applyFilter() {
        if(this.formGroup.get('Id').value==0){
            this.env.showMessage('Vui lòng khởi tạo phiếu kiểm trước', 'danger');
            return;
        }
        if (this.tempItemList) {
          
            let apiPath ={
                    method: "POST",
                    url: function () { return ApiSetting.apiDomain("WMS/CycleCount/PostListDetail") }
            }
            // loại CycleCountDetail đã tồn tại
            if(this.item.CycleCountDetails){
                this.tempItemList.filter(d=>!this.item.CycleCountDetails.map(m=>m.IDItem).includes(d))
            }
            this.query.IgnoredBranch = true
            let obj :any = {
                id: this.formGroup.get('Id').value,
                IdItems :  this.tempItemList,
            }

            this.commonService.connect(apiPath.method, apiPath.url(),obj).toPromise().then((result : any)=>{
                if(result && result.length>0){
                    if( this.item.CycleCountDetails)  this.item.CycleCountDetails.concat(result)
                    else this.item.CycleCountDetails = result;
                    result.forEach(i => this.addField(i))
                }
               
            })
          
        }
        this.isModalOpen = false;
    }

    isModalOpen = false;
    presentModal(event) {
        this.isModalOpen = true;
    }

    dismissModal(apply: boolean = false) {
        this.isModalOpen = false;
    }


    async saveChange() {
        let submitItem = this.getDirtyValues(this.formGroup);
        super.saveChange2();
    }

    saveChangeDetail(fg: FormGroup) {
        console.log(fg);
    }

    removeField(fg,j) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let itemToDelete = fg.getRawValue();
        this.cycleCountDetailService.delete(itemToDelete).then(result=>{
            groups.removeAt(j);
        })
    }
    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }
    changeIsShowQty(e) {
        console.log(this.formGroup.get('IsShowSysQty').value)
        // this.formGroup.get('IsShowSysQty').setValue(e);
    }
}
