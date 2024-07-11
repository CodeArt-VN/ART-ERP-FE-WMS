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
import { TransactionModalPage } from '../transaction-modal/transaction-modal.page';

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
        public packingDetailservice: WMS_PackingDetailProvider,
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
        this.packingDetailservice.read(this.query,false).then((listDetail:any) =>{
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
            LPN :[field.LPN>0?field.LPN : null],
            LotName :[field.LotName],
            UoMName:[field.UoMName],
            ItemName: [ field.ItemName], //de hien thi
            Status: [ field.Status],
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

    closePack() {
        this.query.Id = this.formGroup.get('Id').value
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('GET', 'WMS/Packing/ClosePacking/', this.query).toPromise())
        .then((result: any) => {
            this.refresh();
        })
        this.query.Id = undefined;
    }
    changeStatusDetail(fg, status) {
        if (fg.get('Status').value == 'Active' && status == 'Done') {
           //update status Active -> Done
           let obj = [
             {
               Id: fg.get('Id').value,
               Status: status,
               QuantityPacked: fg.get('QuantityPacked').value,
             },
           ];
           if (this.submitAttempt == false) {
             this.submitAttempt = true;
             this.pageProvider.commonService
               .connect('PUT', 'WMS/Packing/UpdateQuantityOnHand/', obj)
               .toPromise()
               .then((result: any) => {
                 if (result) {
                   this.env.showTranslateMessage('Saved', 'success');
                   fg.controls.Status.setValue(status);
                   this.submitAttempt = false;
                 } else {
                   this.env.showTranslateMessage('Cannot save, please try again', 'danger');
                   this.submitAttempt = false;
                 }
               });
           }
         }
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
        let obj = [];
        groups.controls.forEach((group: FormGroup) => {
          const currentStatus = group.get('Status').value;
          if (currentStatus == 'Active') {
            if (this.item._IsPackedAll) {
              group.controls.QuantityPacked.setValue(0);
            } else {
              group.controls.QuantityPacked.setValue(group.controls.Quantity.value);
            }
            const id = group.get('Id').value;
            const quantityPacked = group.controls.QuantityPacked.value;
            obj.push({ Id: id, Status: currentStatus, QuantityPacked: quantityPacked });
          }
        });
    
        if (!this.submitAttempt && obj.length > 0) {
          this.submitAttempt = true;
          this.pageProvider.commonService
            .connect('PUT', 'WMS/Packing/UpdateQuantityOnHand/', obj)
            .toPromise()
            .then(() => {
              this.env.showTranslateMessage('Saved', 'success');
              this.item._IsPackedAll = !this.item._IsPackedAll;
              this.submitAttempt = false;
            })
            .catch((err) => {
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
            });
        }
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
                {Id:parentFG.get('Id').value, Status: 'Active', QuantityPacked:parentFG.get('QuantityPacked').value},
                {Id:childFG.get('Id').value, Status: 'Active', QuantityPacked:childFG.get('QuantityPacked').value},
            ]
        }
        else{
            obj = [
                {Id:childFG.get('Id').value, Status: 'Active', QuantityPacked:childFG.get('QuantityPacked').value},
            ]
        }
        // childFG.get('Id').markAsDirty();
        // childFG.get('QuantityPacked').markAsDirty();
        // super.saveChange2(childFG, this.pageConfig.pageName, this.packingDetailservice);

        if (this.submitAttempt == false) {
            this.submitAttempt = true;
            this.pageProvider.commonService
              .connect('PUT', 'WMS/Packing/UpdateQuantityOnHand/', obj)
              .toPromise()
              .then((result: any) => {
                if(result && result.length>0){
                    let groups = <FormArray>this.formGroup.controls.PackingDetails;
                    result.forEach(updatedPacking => {
                        var packingDetail = groups.controls.find(d=> d.get('Id').value == updatedPacking.Id);
                        if(packingDetail){
                            packingDetail.get('QuantityPacked').setValue(updatedPacking.QuantityPacked);
                        }
                    })
                    this.env.showTranslateMessage('Saved', 'success');
                }
                else{
                    this.env.showTranslateMessage('Cannot save, please try again','danger');
                }
                this.submitAttempt = false;
              });
          }
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
            this.packingDetailservice.delete(itemToDelete).then(result => {
                groups.removeAt(j);
            })
        })
    }

    deleteItems() {
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkedPackingDetails.getRawValue();
            
            this.env.showPrompt('Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?', null, 'Xóa ' + itemsToDelete.length + ' dòng').then(_ => {
                this.env.showLoading('Xin vui lòng chờ trong giây lát...', this.packingDetailservice.delete(itemsToDelete))
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
        fg.get('Showing').setValue(false);
        if( fg.get('HasChild').value){
            fg.get('ShowDetail').setValue(false);
            let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);
            
            subOrders.forEach((it) => {
                this.hideSubRows(it);
                it.get('Showing').setValue(false);
            });
        }
       
    }

    async openTransaction(fg) {
        const modal = await this.modalController.create({
          component: TransactionModalPage,
          componentProps: {
            sourceLine: fg.controls.Id.value,
          },
          cssClass: 'modal90',
        });
    
        await modal.present();
        const { data } = await modal.onWillDismiss();
        if (data) {
          this.refresh();
        }
      }
}