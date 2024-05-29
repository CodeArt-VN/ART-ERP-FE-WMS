import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, HRM_StaffProvider, SYS_SchemaProvider, WMS_ItemProvider, WMS_PackingDetailProvider, WMS_PackingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
    selector: 'app-packing-order-detail',
    templateUrl: 'packing-order-detail.page.html',
    styleUrls: ['packing-order-detail.page.scss']
})
export class PackingOrderDetailPage extends PageBase {
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
    checkedPackingDetails: any = new FormArray([]);
    constructor(
        public pageProvider: WMS_PackingProvider,
        public PackingDetailservice: WMS_PackingDetailProvider,
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
            PackingDetails: this.formBuilder.array([]),
            
            Tag: [''],
            ExpectedDate: [''],
            PackagedDate: [''],
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
        super.preLoadData(event);
    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        // if(this.item.Status !="Open"){
        //     this.pageConfig.canEdit = false;
        // }
        super.loadedData(event, ignoredFromGroup);
        this.query.IDPacking = this.item.Id; //temp
        this.query.Id = undefined;
        this.PackingDetailservice.read(this.query,false).then((listDetail:any) =>{
            if(listDetail!= null && listDetail.data.length>0){
                const packingOrdertDetailsArray = this.formGroup.get('PackingDetails') as FormArray;
                packingOrdertDetailsArray.clear();
                // this.item.PackingDetails = listDetail.data;
                this.buildFlatTree (listDetail.data, this.item.PackingDetails, false).then((resp: any) => {
                this.item.PackingDetails = resp;
                this.patchFieldsValue();
                });
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

        if (this.item.PackingDetails?.length) {
            this.item.PackingDetails.forEach(i => {
                this.addField(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.PackingDetails.disable();
        }

        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let group = this.formBuilder.group({
            IDPicking:[this.formGroup.get('Id').value, Validators.required], // temp
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem:[field.IDItem, Validators.required],
            IDParent:[field.IDParent],
            Quantity : [field.Quantity],
            QuantityPacked : [field.QuantityPacked],
            HasChild:[field.HasChild],
            Levels:[field.levels],
            ShowDetail:[field.showdetail],
            Showing:[field.show] ,
            FromLocationName :[field.FromLocationName],
            ToLocationName :[field.ToLocationName],
            LPN :[field.LPN],
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
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('GET', 'WMS/Packing/ChangeStatus/', this.query).toPromise())
        .then((result: any) => {
            this.refresh();
        })
        this.query.Id = undefined;
    }

    // updateQuantity(fg){
    //     let obj = {
    //         Id : fg.get('Id').value,
    //         QuantityPacked : fg.get('QuantityPacked').value

    //     }
    //     this.pageProvider.commonService.connect('PUT', 'WMS/Packing/UpdateQuantity/', obj).toPromise()
    //     .then((result: any) => {
    //         if(result){
    //             this.env.showTranslateMessage('Saved', 'success');

    //         }
    //         else{
    //             this.env.showTranslateMessage('Cannot save, please try again','danger');
    //         }
    //     })
    //     // this.saveChange2(fg, null, this.PackingDetailservice)
    // }

    updateQuantity(obj){
        this.pageProvider.commonService.connect('PUT', 'WMS/Packing/UpdateQuantity/', obj).toPromise()
        .then((result: any) => {
            if(result){
                this.env.showTranslateMessage('Saved', 'success');

            }
            else{
                this.env.showTranslateMessage('Cannot save, please try again','danger');
            }
        })
        // this.saveChange2(fg, null, this.PackingDetailservice)
    }
    toggleQty(group) {
        if (group.controls.Quantity.value == group.controls.QuantityPacked.value) {
            group.controls.QuantityPacked.setValue(0);
            group.controls.QuantityPacked.markAsDirty();
        }
        else {
            group.controls.QuantityPacked.setValue(group.controls.Quantity.value);
            group.controls.QuantityPacked.markAsDirty();
        }
        this.calcTotalPackedQuantity(group);
    }

    toggleAllQty() {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        groups.controls.forEach((group: FormGroup) => {
            if (this.item._IsPackedAll) {
                group.controls.QuantityPacked.setValue(0);
                group.controls.QuantityPacked.markAsDirty();
            }
            else {
                group.controls.QuantityPacked.setValue(group.controls.Quantity.value);
                group.controls.QuantityPacked.markAsDirty();
            }

        });
        this.item._IsPackedAll = !this.item._IsPackedAll;
        this.calcAllTotalPackedQuantity();
        
    }

    calcTotalPackedQuantity(childFG){
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let totalPackedQty = 0;
        let parentFG = groups.controls.find((d) => d.get('Id').value == childFG.get('IDParent').value);
        let obj ;
        if(parentFG){
            let subOrders = groups.controls.filter((d) => d.get('IDParent').value == parentFG.get('Id').value);
            subOrders.forEach(sub=>{
                totalPackedQty += sub.get('QuantityPacked').value;
            })
            parentFG.get('QuantityPacked').setValue(totalPackedQty)
            parentFG.get('QuantityPacked').markAsDirty();
            obj = [
                {Id:parentFG.get('Id').value, QuantityPacked:parentFG.get('QuantityPacked').value},
                {Id:childFG.get('Id').value, QuantityPacked:childFG.get('QuantityPacked').value},
            ]
        }
        else{
            obj = [
                {Id:childFG.get('Id').value, QuantityPacked:childFG.get('QuantityPacked').value},
            ]
        }
        this.updateQuantity(obj);
    }

    calcAllTotalPackedQuantity(){
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let obj = groups.controls.map((fg: FormGroup) => {
            return {
              Id: fg.get('Id').value,
              QuantityPacked: fg.get('QuantityPacked').value
            };
          });
          this.updateQuantity(obj);

    }

    changeSelection(i, view, e = null) {
        if (i.get('IsChecked').value) {
            this.checkedPackingDetails.push(i);
            if(i.get('HasChild').value){
                let groups = <FormArray>this.formGroup.controls.PackingDetails;
                let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
                subOrders.forEach(sub=>{
                    sub.get('IsChecked').setValue(true);
                    this.checkedPackingDetails.push(sub);
                })

            }
        }
        else {
            let index = this.checkedPackingDetails.getRawValue().findIndex(d => d.Id == i.get('Id').value)
            this.checkedPackingDetails.removeAt(index);
            if(i.get('HasChild').value){
                let groups = <FormArray>this.formGroup.controls.PackingDetails;
                let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
                subOrders.forEach(sub=>{
                    sub.get('IsChecked').setValue(false);
                    let indexSub = this.checkedPackingDetails.getRawValue().findIndex(d => d.Id == sub.get('Id').value)
                    this.checkedPackingDetails.removeAt(indexSub);
                })

            }
         
        }
        
    }

    toggleSelectAll() {
        if(!this.pageConfig.canEdit) return;
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        if (!this.isAllChecked) {
            this.checkedPackingDetails = new FormArray([]);
        }
        groups.controls.forEach(i => {
          
            i.get('IsChecked').setValue(this.isAllChecked)
            if (this.isAllChecked) this.checkedPackingDetails.push(i)
        });
    }


    removeSelectedItems() {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        this.checkedPackingDetails.controls.forEach(fg => {
            const indexToRemove = groups.controls.findIndex(control => control.get('Id').value === fg.get('Id').value);
            groups.removeAt(indexToRemove);
        })

        this.checkedPackingDetails = new FormArray([]);
    }

    removeField(fg, j) {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let itemToDelete = fg.getRawValue();
        this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then(_ => {
            this.PackingDetailservice.delete(itemToDelete).then(result => {
                groups.removeAt(j);
            })
        })
    }

    deleteItems() {
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkedPackingDetails.getRawValue();
            
            this.env.showPrompt('Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?', null, 'Xóa ' + itemsToDelete.length + ' dòng').then(_ => {
                this.env.showLoading('Xin vui lòng chờ trong giây lát...', this.PackingDetailservice.delete(itemsToDelete))
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

    toggleRow(fg, event) {
        if (!fg.get('HasChild').value) {
          return;
        }
        event.stopPropagation();
        fg.get('ShowDetail').setValue(!fg.get('ShowDetail').value);
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);
        if (fg.get('ShowDetail').value) {
            subOrders.forEach((it) => {
                it.get('Showing').setValue(true);
            });
        } 
        else{
            subOrders.forEach((it) => {
                this.hideSubRows(it)
            });
        }
      }
    
    hideSubRows(fg) {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        if( fg.get('HasChild').value){
            fg.get('ShowDetail').setValue(false);
            let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);
            
            subOrders.forEach((it) => {
                this.hideSubRows(it);
                it.get('Showing').setValue(false);
            });
        }
        else{
            fg.get('Showing').setValue(false);
        }
       
    }
}