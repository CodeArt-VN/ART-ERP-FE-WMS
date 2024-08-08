import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  HRM_StaffProvider,
  SYS_SchemaProvider,
  WMS_ItemProvider,
  WMS_ShippingDetailProvider,
  WMS_ShippingProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { TransactionModalPage } from '../transaction-modal/transaction-modal.page';

@Component({
  selector: 'app-shipping-detail',
  templateUrl: 'shipping-detail.page.html',
  styleUrls: ['shipping-detail.page.scss'],
})
export class ShippingDetailPage extends PageBase {
  //#region Variables
  countTypeDataSource: any;
  statusDataSource: any;
  config: any = null;
  itemList: any;
  branchList;
  storerList;

  isAllChecked = false;
  checkedShippingDetails: any = new FormArray([]);
//#endregion

//#region Init
  constructor(
    public pageProvider: WMS_ShippingProvider,
    public shippingDetailService: WMS_ShippingDetailProvider,
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
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.formGroup = this.formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      IDOutboundOrder: [''],
      IDWarehouse: new FormControl({ value: '', disabled: true }),
      Vehicle: new FormControl({ value: '', disabled: true }),
      Shipper: new FormControl({ value: '', disabled: true }),
      ShippingDetails: this.formBuilder.array([]),

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
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }
//#endregion

//#region Load
preLoadData(event) {
    this.statusDataSource = [
      { Name: 'Active', Code: 'Active' },
      { Name: 'Done', Code: 'Done' },
      { Name: 'Closed', Code: 'Closed' },
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
    super.preLoadData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item.Status == 'Closed') {
      this.pageConfig.canEdit = false;
    }
    super.loadedData(event, ignoredFromGroup);
    this.query.IDShipping = this.item.Id;
    this.query.Id = undefined;
    if ( this.item.ShippingDetails.length > 0) {
    
        this.buildFlatTree( this.item.ShippingDetails, null, false).then((resp: any) => {
          this.item.ShippingDetails = resp;
          const ShippingDetailsArray = this.formGroup.get('ShippingDetails') as FormArray;
          ShippingDetailsArray.clear();
          this.patchFieldsValue();
        });
   
      // this.patchFieldsValue();
    }
  }
  private patchFieldsValue() {
    this.pageConfig.showSpinner = true;

    if (this.item.ShippingDetails?.length) {
      this.item.ShippingDetails.forEach((i) => {
        this.addField(i);
      });
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.ShippingDetails.disable();
    }

    this.pageConfig.showSpinner = false;
  }

  addField(field: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    let group = this.formBuilder.group({
      IDShipping: [this.formGroup.get('Id').value, Validators.required],
      Id: new FormControl({ value: field.Id, disabled: true }),
      IDItem: [field.IDItem, Validators.required],
      Quantity: [field.Quantity],
      QuantityShipped:  new FormControl({ value: field.QuantityShipped, disabled: (field.Status != 'Active') ? true:false }),
      TrackingQuantityShipped : [field.QuantityShipped],
      Status: [field.Status],
      FromLocationName: [field.FromLocationName],
      LPN: [field.LPN > 0 ? field.LPN : null],
      LotName: [field.LotName],
      UoMName: [field.UoMName],
      ItemName: [field.ItemName], 

      IDParent:[field.IDParent],
      ShowDetail: [field.showdetail],
      Showing: [field.show],
      HasChild: [field.HasChild],
      Levels: [field.levels],

      IsDisabled: new FormControl({ value: field.IsDisabled, disabled: true }),
      IsDeleted: new FormControl({ value: field.IsDeleted, disabled: true }),
      CreatedBy: new FormControl({ value: field.CreatedBy, disabled: true }),
      CreatedDate: new FormControl({ value: field.CreatedDate, disabled: true }),
      ModifiedBy: new FormControl({ value: field.ModifiedBy, disabled: true }),
      ModifiedDate: new FormControl({ value: field.ModifiedDate, disabled: true }),
      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    groups.push(group);
  }
//#endregion

//#region Business logic
  closeShip() {
    this.query.Id = this.formGroup.get('Id').value;
    this.env
    .showPrompt(
      'Bạn có chắc muốn đóng tất cả các sản phẩm giao hàng?',
      null,
      'Đóng giao hàng',
    )
    .then((_) => {
      this.env
        .showLoading(
          'Vui lòng chờ load dữ liệu...',
          this.pageProvider.commonService.connect('GET', 'WMS/Shipping/CloseShipping/', this.query).toPromise(),
        )
        .then(async (result: any) => {
          this.refresh();
        })
        .catch((err) => {
          this.env.showMessage('Cannot save, please try again.');
          console.log(err);
        });
    });
  }

  updateQuantity(fg) {
    fg.controls.Id.markAsDirty();
    fg.controls.QuantityShipped.markAsDirty();
    super.saveChange2(fg, this.pageConfig.pageName, this.shippingDetailService);
  }

  calcTotalShippedQuantity(childFG,e = null) {
    console.log(e);
    if(this.submitAttempt){
      childFG.get('QuantityShipped').setErrors({valid:false});
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    }
    else{
      let groups = <FormArray>this.formGroup.controls.ShippingDetails;
      let totalShippedQty = 0;
      let parentFG = groups.controls.find((d) => d.get('Id').value == childFG.get('IDParent').value);
      let obj;
      if (parentFG) {
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == parentFG.get('Id').value);
        subOrders.forEach((sub) => {
          totalShippedQty += sub.get('QuantityShipped').value;
        });
        parentFG.get('QuantityShipped').setValue(totalShippedQty);
        parentFG.get('QuantityShipped').markAsDirty();
        obj = [
          { Id: parentFG.get('Id').value, Status: 'Active', QuantityShipped: parentFG.get('QuantityShipped').value },
          { Id: childFG.get('Id').value, Status: 'Active', QuantityShipped: childFG.get('QuantityShipped').value },
        ];
      } else {
        obj = [{ Id: childFG.get('Id').value, Status: 'Active', QuantityShipped: childFG.get('QuantityShipped').value }];
      }
      // Check if QuantityShipped is valid
      const isValid = obj.every((item) => {
        let group = groups.controls.find((d) => d.get('Id').value == item.Id);
        return group && item.QuantityShipped <= group.get('Quantity').value && item.QuantityShipped >= 0;
      });
  
      if (!isValid) {
        this.env.showTranslateMessage('Quantity packed is more than quantity', 'danger');
        return; 
      }
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Shipping/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then((result: any) => {
            if (result && result.length > 0) {
              let groups = <FormArray>this.formGroup.controls.ShippingDetails;
              result.forEach((updatedShipping) => {
                var shippingDetail = groups.controls.find((d) => d.get('Id').value == updatedShipping.Id);
                if (shippingDetail) {
                  shippingDetail.get('QuantityShipped').setValue(updatedShipping.QuantityShipped);
                  shippingDetail.get('TrackingQuantityShipped').setValue(updatedShipping.QuantityShipped);

                }
              });
              this.env.showTranslateMessage('Saved', 'success');
            } else {
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
              childFG.get('QuantityShipped').setValue(childFG.get('TrackingQuantityShipped').value);
            }
            this.submitAttempt = false;
          })
          .catch(err => {
            this.submitAttempt = false;
            childFG.get('QuantityShipped').setValue(childFG.get('TrackingQuantityShipped').value);
            childFG.get('QuantityShipped').setErrors({valid:false});
            this.env.showTranslateMessage(err.error.Message, 'danger');
          });
      }
    }
  }
  toggleQty(group) {
    if (group.controls.Quantity.value == group.controls.QuantityShipped.value) {
      group.controls.QuantityShipped.setValue(0);
      group.controls.QuantityShipped.markAsDirty();
    } else {
      group.controls.QuantityShipped.setValue(group.controls.Quantity.value);
      group.controls.QuantityShipped.markAsDirty();
    }
    this.calcTotalShippedQuantity(group);
  }

  toggleAllQty() {
    if(this.submitAttempt){
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    } 
    else{
      let groups = <FormArray>this.formGroup.controls.ShippingDetails;
      let obj = [];
      groups.controls.forEach((group: FormGroup) => {
        const currentStatus = group.get('Status').value;
        if (currentStatus == 'Active') {
          if (this.item._IsShippedAll) {
            group.controls.QuantityShipped.setValue(0);
          } else {
            group.controls.QuantityShipped.setValue(group.controls.Quantity.value);
          }
          const id = group.get('Id').value;
          const quantityShipped = group.controls.QuantityShipped.value;
          obj.push({ Id: id, Status: currentStatus, QuantityShipped: quantityShipped });
        }
      });
  
      if (!this.submitAttempt && obj.length > 0) {
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Shipping/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then(() => {
            this.env.showTranslateMessage('Saved', 'success');
            this.item._IsShippedAll = !this.item._IsShippedAll;
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
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
//#endregion

  //#region Selection
  changeSelection(i, view, e = null) {
    if (i.get('IsChecked').value) {
      this.checkedShippingDetails.push(i);
    } else {
      let index = this.checkedShippingDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
      this.checkedShippingDetails.removeAt(index);
    }
  }

  toggleSelectAll() {
    if (!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    if (!this.isAllChecked) {
      this.checkedShippingDetails = new FormArray([]);
    }
    groups.controls.forEach((i) => {
      i.get('IsChecked').setValue(this.isAllChecked);
      if (this.isAllChecked) this.checkedShippingDetails.push(i);
    });
  }

  removeSelectedItems() {
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    this.checkedShippingDetails.controls.forEach((fg) => {
      const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
      groups.removeAt(indexToRemove);
    });

    this.checkedShippingDetails = new FormArray([]);
  }
//#endregion

//#region Delete
  removeField(fg, j) {
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    let itemToDelete = fg.getRawValue();
    this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then((_) => {
      this.shippingDetailService.delete(itemToDelete).then((result) => {
        groups.removeAt(j);
      });
    });
  }

  deleteItems() {
    if (this.pageConfig.canDelete) {
      let itemsToDelete = this.checkedShippingDetails.getRawValue();
      this.env
        .showPrompt(
          'Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?',
          null,
          'Xóa ' + itemsToDelete.length + ' dòng',
        )
        .then((_) => {
          this.env .showLoading('Xin vui lòng chờ trong giây lát...', this.shippingDetailService.delete(itemsToDelete)) .then((_) => {
              this.removeSelectedItems();
              this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
              this.isAllChecked = false;
            })
            .catch((err) => {
              this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
              console.log(err);
            });
        });
    }
  }
//#endregion

//#region SaveChange
  async saveChange() {
    let submitItem = this.getDirtyValues(this.formGroup);
    super.saveChange2();
  }

  
  changeStatusDetail(fg, status) {
    if(this.submitAttempt){
      fg.get('QuantityShipped').setErrors({valid:false});
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    }
    else{
    if (fg.get('Status').value == 'Active' && status == 'Done') {
      //update status Active -> Done
      let obj = [
        {
          Id: fg.get('Id').value,
          Status: status,
        },
      ];
      if (this.submitAttempt == false) {
        this.env.showPrompt('Bạn chắc muốn hoàn tất ?', null, 'Hoàn tất').then((_) => {
          this.submitAttempt = true;
          this.pageProvider.commonService
          .connect('PUT', 'WMS/Shipping/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then((result: any) => {
            if (result) {
              this.env.showTranslateMessage('Saved', 'success');
              let groups = <FormArray>this.formGroup.controls.ShippingDetails;
              let parent = groups.controls.find(d=> d.get('Id').value == fg.get('IDParent').value);
              fg.controls.Status.setValue(status);
              fg.controls.QuantityShipped.disable();
              if(parent) parent.get('QuantityShipped').setValue(parseFloat(parent.get('QuantityShipped').value || 0) + parseFloat( fg.get('QuantityShipped').value|| 0 ));
              fg.controls.QuantityShipped.markAsPristine();
              this.submitAttempt = false;
            } else {
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
            }
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
          });
      }
    }
  }
  }
//#endregion

  //#region Sort
  sortDetail: any = {};
  sortToggle(field) {
    if (!this.sortDetail[field]) {
      this.sortDetail[field] = field;
    } else if (this.sortDetail[field] == field) {
      this.sortDetail[field] = field + '_desc';
    } else {
      delete this.sortDetail[field];
    }
    // let s = Object.keys(sortTerms).reduce(function (res, v) {
    //     return res.concat(sortTerms[v]);
    // }, []);
    if (Object.keys(this.sortDetail).length === 0) {
      this.refresh();
    } else {
      this.reInitShippingDetails();
    }
  }

  reInitShippingDetails() {
    const outboundOrderDetailsArray = this.formGroup.get('ShippingDetails') as FormArray;
    this.item.ShippingDetails = outboundOrderDetailsArray.getRawValue();
    for (const key in this.sortDetail) {
      if (this.sortDetail.hasOwnProperty(key)) {
        const value = this.sortDetail[key];
        this.sortByKey(value);
      }
    }
    outboundOrderDetailsArray.clear();
    this.item.ShippingDetails.forEach((s) => this.addField(s));
  }

  sortByKey(key: string, desc: boolean = false) {
    if (key.includes('_desc')) {
      key = key.replace('_desc', '');
      desc = true;
    }
    this.item.ShippingDetails.sort((a, b) => {
      const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return desc ? -comparison : comparison;
    });
  }
//#endregion

  //#region Toggle row
  toggleRow(fg, event) {
    if (!fg.get('HasChild').value) {
      return;
    }
    event.stopPropagation();
    fg.get('ShowDetail').setValue(!fg.get('ShowDetail').value);
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);
    if (fg.get('ShowDetail').value) {
      subOrders.forEach((it) => {
        it.get('Showing').setValue(true);
      });
    } else {
      subOrders.forEach((it) => {
        this.hideSubRows(it);
      });
    }
  }

  hideSubRows(fg) {
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    fg.get('Showing').setValue(false);
    if (fg.get('HasChild').value) {
      fg.get('ShowDetail').setValue(false);
      let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);

      subOrders.forEach((it) => {
        this.hideSubRows(it);
        it.get('Showing').setValue(false);
      });
    }
  }
//#endregion

//#region Segment
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }
//#endregion

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }
}
