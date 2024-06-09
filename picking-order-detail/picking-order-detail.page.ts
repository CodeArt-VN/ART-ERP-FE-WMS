import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, WMS_ItemProvider, WMS_OutboundOrderDetailProvider, WMS_PickingDetailProvider, WMS_PickingProvider } from 'src/app/services/static/services.service';
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
    checkedPickingOrderDetails: any = new FormArray([]);
    constructor(
        public pageProvider: WMS_PickingProvider,
        public pickingOrderDetailService: WMS_PickingDetailProvider,
        public outboundOrderDetailService: WMS_OutboundOrderDetailProvider,
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
            PickingOrderDetails: this.formBuilder.array([]),

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
        let queryOutbound = {
            IDOutboundOrder: this.item.IDOutboundOrder,
            IDParent_ne_Null:true
        }
        this.outboundOrderDetailService.commonService.connect('GET', 'WMS/Picking/GetPickingDetailsGroupByItem/', queryOutbound).toPromise()
       .then((listOutboundDetail:any) =>{
          
            if(listOutboundDetail!= null && listOutboundDetail.length>0){
                this.query.IDPicking = this.item.Id;
                this.query.Id = undefined;
                
                this.pickingOrderDetailService.read(this.query,false).then((listDetail:any) =>{
                    const pickingOrdertDetailsArray = this.formGroup.get('PickingOrderDetails') as FormArray;
                    pickingOrdertDetailsArray.clear();
                    let outboundDetails = listOutboundDetail;//.filter(d=>d.IDParent != null);

                    let pickingDetails = listDetail?.data;
                    pickingDetails?.forEach(s=>{
                        let parent =  outboundDetails.find(d=> d.IDItem == s.IDItem && d.IDUoM == s.IDUoM);
                        if(parent){
                            if(!parent.Id){
                                parent.Id = Math.floor(Math.random() * (10000000 - 10000 + 1)) + 10000000000;
                            }
                            s.IDParent = parent.Id;
                        } 
                       
                    });
                    let list = [...outboundDetails, ...pickingDetails]
                    this.buildFlatTree (list, this.item.PickingOrderDetails, false).then((resp: any) => {
                        this.item.PickingOrderDetails = resp;
                        this.patchFieldsValue();
                    })
                    // if(listDetail!= null && listDetail.data.length>0){
                     
                    // }
                });
            }
        });
       // this.query.IDPicking = this.item.Id;
        // this.query.Id = undefined;
        // this.pickingOrderDetailService.read(this.query,false).then((listDetail:any) =>{
          
        //     if(listDetail!= null && listDetail.data.length>0){
        //         const pickingOrdertDetailsArray = this.formGroup.get('PickingOrderDetails') as FormArray;
        //         pickingOrdertDetailsArray.clear();
        //         this.buildFlatTree (listDetail.data, this.item.PickingOrderDetails, false).then((resp: any) => {
        //             this.item.PickingOrderDetails = resp;
        //             this.patchFieldsValue();
        //         })
        //     }
        // });
        if(this.item.Status !="Allocated"){
            this.pageConfig.canEdit = false;
        }
        // this.query.Id = this.item.Id;
        this.formGroup.get('Status').markAsDirty();
     
    }
    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;

        if (this.item.PickingOrderDetails?.length) {
            this.item.PickingOrderDetails.forEach(i => {
                this.addField(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.PickingOrderDetails.disable();
        }

        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let group = this.formBuilder.group({
            IDPicking:[this.formGroup.get('Id').value, Validators.required],
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem:[field.IDItem, Validators.required],
            IDParent:[field.IDParent],
            Quantity : [field.Quantity],
            QuantityPicked : [field.QuantityPicked],
            LPN :[field.LPN>0?field.LPN : null],
            FromLocation :[field.FromLocation],
            //LotLPNLocations:[field.LotLPNLocations], chức năng chọn Location
            FromLocationName :[field.FromLocationName],
            ToLocationName :[field.ToLocationName],
            LotName :[field.LotName],
            UoMName:[field.UoMName],
            ItemName: [ field.ItemName], //de hien thi
            ShowDetail:[field.showdetail],
            Showing:[field.show] ,
            HasChild:[field.HasChild],
            Levels:[field.levels],
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

    updateQuantity(obj){
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

    allocatePicking(){
        this.query.Id = this.formGroup.get('Id').value
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('GET', 'WMS/Picking/AllocatePicking/', this.query).toPromise())
        .then((result: any) => {
            this.refresh();
        })
    }

    toggleQty(group) {
        if (group.controls.Quantity.value == group.controls.QuantityPicked.value) {
            group.controls.QuantityPicked.setValue(0);
            group.controls.QuantityPicked.markAsDirty();
        }
        else {
            group.controls.QuantityPicked.setValue(group.controls.Quantity.value);
            group.controls.QuantityPicked.markAsDirty();
        }
        this.calcTotalPickedQuantity(group);
    }

    toggleAllQty() {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        groups.controls.forEach((group: FormGroup) => {
            if (this.item._IsPickedAll) {
                group.controls.QuantityPicked.setValue(0);
                group.controls.QuantityPicked.markAsDirty();
            }
            else {
                if(group.controls.FromLocationName.value){
                    group.controls.QuantityPicked.setValue(group.controls.Quantity.value);

                }
                // group.controls.QuantityPicked.markAsDirty();
            }

        });
        this.item._IsPickedAll = !this.item._IsPickedAll;
        this.calcAllTotalPickedQuantity();
        
    }

    calcTotalPickedQuantity(childFG){
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let totalPickedQty = 0;
        let parentFG = groups.controls.find((d) => d.get('Id').value == childFG.get('IDParent').value);
        let obj ;
        if(parentFG){
            let subOrders = groups.controls.filter((d) => d.get('IDParent').value == parentFG.get('Id').value);
            subOrders.forEach(sub=>{
                totalPickedQty += sub.get('QuantityPicked').value;
            })
            parentFG.get('QuantityPicked').setValue(totalPickedQty)
            // parentFG.get('QuantityPicked').markAsDirty();
            obj = [
                // {Id:parentFG.get('Id').value, QuantityPicked:parentFG.get('QuantityPicked').value},
                {Id:childFG.get('Id').value, QuantityPicked:childFG.get('QuantityPicked').value},
            ]
        }
        else{
            obj = [
                {Id:childFG.get('Id').value, QuantityPicked:childFG.get('QuantityPicked').value},
            ]
        }
        this.updateQuantity(obj);
    }

    calcAllTotalPickedQuantity(){
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let obj = groups.controls.map((fg: FormGroup) => {
            if(fg.get('FromLocationName').value){
                return {
                    Id: fg.get('Id').value,
                    QuantityPicked: fg.get('QuantityPicked').value
                  };
            }
        
          });
          this.updateQuantity(obj);

    }

    changeSelection(i, view, e = null) {
        if (i.get('IsChecked').value) {
            this.checkedPickingOrderDetails.push(i);
            if(i.get('HasChild').value){
                let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
                let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
                subOrders.forEach(sub=>{
                    sub.get('IsChecked').setValue(true);
                    this.checkedPickingOrderDetails.push(sub);
                })

            }
        }
        else {
            let index = this.checkedPickingOrderDetails.getRawValue().findIndex(d => d.Id == i.get('Id').value)
            this.checkedPickingOrderDetails.removeAt(index);
            if(i.get('HasChild').value){
                let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
                let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
                subOrders.forEach(sub=>{
                    sub.get('IsChecked').setValue(false);
                    let indexSub = this.checkedPickingOrderDetails.getRawValue().findIndex(d => d.Id == sub.get('Id').value)
                    this.checkedPickingOrderDetails.removeAt(indexSub);
                })

            }
         
        }
        
    }

    toggleSelectAll() {
        if(!this.pageConfig.canEdit) return;
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        if (!this.isAllChecked) {
            this.checkedPickingOrderDetails = new FormArray([]);
        }
        groups.controls.forEach(i => {
          
            i.get('IsChecked').setValue(this.isAllChecked)
            if (this.isAllChecked) this.checkedPickingOrderDetails.push(i)
        });
    }


    removeSelectedItems() {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        this.checkedPickingOrderDetails.controls.forEach(fg => {
            const indexToRemove = groups.controls.findIndex(control => control.get('Id').value === fg.get('Id').value);
            groups.removeAt(indexToRemove);
        })

        this.checkedPickingOrderDetails = new FormArray([]);
    }

    removeField(fg, j) {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let itemToDelete = fg.getRawValue();
        this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then(_ => {
            this.pickingOrderDetailService.delete(itemToDelete).then(result => {
                groups.removeAt(j);
            })
        })
    }

    deleteItems() {
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkedPickingOrderDetails.getRawValue();
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
            this.reInitPickingOrderDetails();
        }
    }

    reInitPickingOrderDetails() {
        const outboundOrderDetailsArray = this.formGroup.get('PickingOrderDetails') as FormArray;
        this.item.PickingOrderDetails = outboundOrderDetailsArray.getRawValue();
        for (const key in this.sortDetail) {
            if (this.sortDetail.hasOwnProperty(key)) {
                const value = this.sortDetail[key];
                this.sortByKey(value);
            }
        }
        outboundOrderDetailsArray.clear();
        this.item.PickingOrderDetails.forEach(s => this.addField(s));
    }

    sortByKey(key: string, desc: boolean = false) {
        if(key.includes('_desc')){
            key = key.replace('_desc','');
            desc = true;
        }
        this.item.PickingOrderDetails.sort((a, b) => {
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

    toggleRow(fg, event) {
        if (!fg.get('HasChild').value) {
          return;
        }
        event.stopPropagation();
        fg.get('ShowDetail').setValue(!fg.get('ShowDetail').value);
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
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
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
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