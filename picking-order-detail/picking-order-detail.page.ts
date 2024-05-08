import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, HRM_StaffProvider, SYS_SchemaProvider, WMS_ItemProvider, WMS_PickingDetailProvider, WMS_PickingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
    selector: 'app-picking-order-detail',
    templateUrl: 'picking-order-detail.page.html',
    styleUrls: ['picking-order-detail.page.scss']
})
export class PickingOrderDetailPage extends PageBase {
    countTypeDataSource: any;
    statusDataSource: any;
    schema: Schema;
    config: any = null;
    itemList: any;
    tempItemList: any;
    countItem: number = 0;
    branchList;
    storerList;

    isAllChecked = false; 
    checkedPickingDetailOrders: any = new FormArray([]);
    constructor(
        public pageProvider: WMS_PickingProvider,
        public pickingOrderDetailService: WMS_PickingDetailProvider,
        public staffService: HRM_StaffProvider,
        public schemaService: SYS_SchemaProvider,
        public itemService: WMS_ItemProvider,
        public commonService: CommonService,
        public contactProvider: CRM_ContactProvider,
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
            IDOutboundOrder: [''],
            PickingDetailOrders: this.formBuilder.array([]),

            ExpectedDate: ['', Validators.required],
            PickedDate: [''],
            Status: ['Open', Validators.required],

            Remark: [''],
            Sort: [''],
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true })
        });
    }

    preLoadData(event) {
        this.statusDataSource = [
            { Name: 'Done', Code: 'Done' },
            { Name: 'Open', Code: 'Open' },
            { Name: 'Pending', Code: 'Pending' },
        ];
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
        this.contactProvider.read({ IsStorer: true }).then((resp) => {
            this.storerList = resp['data'];
          });
    
        super.preLoadData(event);
    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event, ignoredFromGroup);
        this.query.IDPicking = this.item.Id;
        this.query.Id = undefined;
        this.pickingOrderDetailService.read(this.query,false).then((listDetail:any) =>{
            if(listDetail!= null && listDetail.data.length>0){
                const outboundOrdertDetailsArray = this.formGroup.get('PickingDetailOrders') as FormArray;
                outboundOrdertDetailsArray.clear();
                this.item.PickingDetailOrders = listDetail.data;
                this.patchFieldsValue();
            }
        })
        if(this.item.Status =="Closed"){
            this.pageConfig.canEdit = false;
        }
        // this.query.Id = this.item.Id;
        this.formGroup.get('Status').markAsDirty();
     
    }
    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;

        if (this.item.PickingDetailOrders?.length) {
            this.item.PickingDetailOrders.forEach(i => {
                this.addField(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.PickingDetailOrders.disable();
        }

        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.PickingDetailOrders;
        let group = this.formBuilder.group({
            IDPicking:[this.formGroup.get('Id').value, Validators.required],
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem:[field.IDItem, Validators.required],
            Quantity : [field.Quantity],
            QuantityPicked : [field.QuantityPicked],
            FromLocationName :[field.FromLocationName],
            ToLocationName :[field.ToLocationName],
            LotName :[field.LotName],
            UoMName:[field.UoMName],
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

    changeStatus() {
        this.query.ToStatus = 'Closed';
        this.query.Id = this.formGroup.get('Id').value
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('GET', 'WMS/Picking/ChangeStatus/', this.query).toPromise())
        .then((result: any) => {
            this.refresh();
        })
        this.query.Id = undefined;
    }

    updateQuantity(fg){
        let obj = {
            Id : fg.get('Id').value,
            QuantityPicked : fg.get('QuantityPicked').value

        }
        this.pageProvider.commonService.connect('PUT', 'WMS/Picking/UpdateQuantity/', obj).toPromise()
        .then((result: any) => {
            if(result){
                this.env.showTranslateMessage('Saved', 'success');

            }
            else{
                this.env.showTranslateMessage('Cannot save, please try again','danger');
            }
        })
        // this.saveChange2(fg, null, this.pickingOrderDetailService)
    }

    changeSelection(i, view, e = null) {
        if (i.get('IsChecked').value) {
            this.checkedPickingDetailOrders.push(i);
        }
        else {
            let index = this.checkedPickingDetailOrders.getRawValue().findIndex(d => d.Id == i.get('Id').value)
            this.checkedPickingDetailOrders.removeAt(index);
        }
        
    }

    toggleSelectAll() {
        if(!this.pageConfig.canEdit) return;
        let groups = <FormArray>this.formGroup.controls.PickingDetailOrders;
        if (!this.isAllChecked) {
            this.checkedPickingDetailOrders = new FormArray([]);
        }
        groups.controls.forEach(i => {
          
            i.get('IsChecked').setValue(this.isAllChecked)
            if (this.isAllChecked) this.checkedPickingDetailOrders.push(i)
        });
    }


    removeSelectedItems() {
        let groups = <FormArray>this.formGroup.controls.PickingDetailOrders;
        this.checkedPickingDetailOrders.controls.forEach(fg => {
            const indexToRemove = groups.controls.findIndex(control => control.get('Id').value === fg.get('Id').value);
            groups.removeAt(indexToRemove);
        })

        this.checkedPickingDetailOrders = new FormArray([]);
    }

    removeField(fg, j) {
        let groups = <FormArray>this.formGroup.controls.PickingDetailOrders;
        let itemToDelete = fg.getRawValue();
        this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then(_ => {
            this.pickingOrderDetailService.delete(itemToDelete).then(result => {
                groups.removeAt(j);
            })
        })
    }

    deleteItems() {
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkedPickingDetailOrders.getRawValue();
            this.env.showPrompt('Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?', null, 'Xóa ' + itemsToDelete.length + ' dòng').then(_ => {
                this.env.showLoading('Xin vui lòng chờ trong giây lát...', this.pickingOrderDetailService.delete(itemsToDelete))
                    .then(_ => {
                        this.removeSelectedItems();
                        this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
                        this.isAllChecked = false;
                    }).catch(err => {
                        this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
                        console.log(err);
                    });
            });
        }
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
            this.reInitPickingDetailOrders();
        }
    }

    reInitPickingDetailOrders() {
        const outboundOrderDetailsArray = this.formGroup.get('PickingDetailOrders') as FormArray;
        this.item.PickingDetailOrders = outboundOrderDetailsArray.getRawValue();
        for (const key in this.sortDetail) {
            if (this.sortDetail.hasOwnProperty(key)) {
                const value = this.sortDetail[key];
                this.sortByKey(value);
            }
        }
        outboundOrderDetailsArray.clear();
        this.item.PickingDetailOrders.forEach(s => this.addField(s));
    }

    sortByKey(key: string, desc: boolean = false) {
        if(key.includes('_desc')){
            key = key.replace('_desc','');
            desc = true;
        }
        this.item.PickingDetailOrders.sort((a, b) => {
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