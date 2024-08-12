import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  SHIP_VehicleProvider,
  WMS_ItemProvider,
  WMS_PackingDetailProvider,
  WMS_PackingProvider,
} from 'src/app/services/static/services.service';
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
  styleUrls: ['packing-order-detail.page.scss'],
})
export class PackingOrderDetailPage extends PageBase {
  // #region Variables
  countTypeDataSource: any;
  statusDataSource: any;
  itemList: any;
  tempItemList: any;
  selectedVehicles : any = [];
  vehicleList : any = [];
  countItem: number = 0;
  branchList;
  storerList;
  isAllChecked = false;
  checkedPackingDetails: any = new FormArray([]);
  // #endregion
  
  // #region Init
  constructor(
    public pageProvider: WMS_PackingProvider,
    public packingDetailservice: WMS_PackingDetailProvider,
    public vehicleService: SHIP_VehicleProvider,
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
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }
  // #endregion
  
  // #region Load
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
    if(this.item._Tag){
      this.formGroup.get('Tag').setValue(this.item._Tag.Code);
    }
    if(this.item?.PackingDetails){
      const packingOrdertDetailsArray = this.formGroup.get('PackingDetails') as FormArray;
      packingOrdertDetailsArray.clear();
      this.buildFlatTree(this.item.PackingDetails, null, false).then((resp: any) => {
        this.item.PackingDetails = resp;
        this.patchFieldsValue();
      });
    }
    
    if (this.item.Status == 'Closed') {
      this.pageConfig.canEdit = false;
      this.formGroup.disable();
    }
    // this.query.Id = this.item.Id;
    if(!this.item.Id){
      this.formGroup.get('Status').markAsDirty();
    }
  }
  private patchFieldsValue() {
    this.pageConfig.showSpinner = true;

    if (this.item.PackingDetails?.length) {
      this.item.PackingDetails.forEach((i) => {
        this.addField(i);
      });
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.PackingDetails.disable();
    }

    this.pageConfig.showSpinner = false;
  }

  addField(field: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.PackingDetails;
    let group = this.formBuilder.group({
      IDPicking: [this.formGroup.get('Id').value, Validators.required], // temp
      Id: new FormControl({ value: field.Id, disabled: true }),
      IDItem: [field.IDItem, Validators.required],
      IDParent: [field.IDParent],
      Quantity: [field.Quantity],
      QuantityPacked:  new FormControl({ value: field.QuantityPacked, disabled: (field.Status != 'Active') ? true:false }),
      TrackingQuantityPacked :  [field.QuantityPacked],
      FromLocationName: [field.FromLocationName],
      ToLocationName: [field.ToLocationName],
      LPN: [field.LPN > 0 ? field.LPN : null],
      LotName: [field.LotName],
      UoMName: [field.UoMName],
      ItemName: [field.ItemName], //de hien thi
      Status: [field.Status],

      HasChild: [field.HasChild],
      Levels: [field.levels],
      ShowDetail: [field.showdetail],
      Showing: [field.show],

      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    groups.push(group);
  }
   // #endregion
  
   //#region Business Logic
   closePack() {
    this.query.Id = this.formGroup.get('Id').value;
    this.env .showPrompt('Bạn có chắc muốn đóng tất cả các sản phẩm gói hàng?', null, 'Đóng gói hàng', )
    .then((_) => { 
      this.env .showLoading( 'Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/Packing/ClosePacking/', this.query).toPromise(), )
        .then(async (result: any) => {
          this.refresh();
        })
        .catch((err) => {
          this.env.showMessage('Cannot save, please try again.');
        });
    });
  }

  changeStatusDetail(fg, status) {
    if (fg.get('Status').value == 'Active' && status == 'Done') {
      //update status Active -> Done
      let obj = [
        {
          Id: fg.get('Id').value,
          Status: status,
        },
      ];
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Packing/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then((result: any) => {
            if (result) {
              this.env.showMessage('Saved', 'success');
              fg.controls.Status.setValue(status);
              fg.controls.QuantityPacked.disable();

              this.submitAttempt = false;
            } else {
              this.env.showMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
            }
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  toggleQty(group) {
    if (group.controls.Quantity.value == group.controls.QuantityPacked.value) {
      group.controls.QuantityPacked.setValue(0);
      group.controls.QuantityPacked.markAsDirty();
    } else {
      group.controls.QuantityPacked.setValue(group.controls.Quantity.value);
      group.controls.QuantityPacked.markAsDirty();
    }
    this.calcTotalPackedQuantity(group);
  }

  toggleAllQty() {
    if(this.submitAttempt){
      this.env.showMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    } 
    else{
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
            this.env.showMessage('Saved', 'success');
            this.item._IsPackedAll = !this.item._IsPackedAll;
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  calcTotalPackedQuantity(childFG,e = null) {
    console.log(e);
    if(this.submitAttempt){
      childFG.get('QuantityPacked').setErrors({valid:false});
      this.env.showMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    }
    else{
      let groups = <FormArray>this.formGroup.controls.PackingDetails;
      let totalPackedQty = 0;
      let parentFG = groups.controls.find((d) => d.get('Id').value == childFG.get('IDParent').value);
      let obj;
      if (parentFG) {
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == parentFG.get('Id').value);
        subOrders.forEach((sub) => {
          totalPackedQty += sub.get('QuantityPacked').value;
        });
        parentFG.get('QuantityPacked').setValue(totalPackedQty);
        parentFG.get('QuantityPacked').markAsDirty();
        obj = [
          { Id: parentFG.get('Id').value, Status: 'Active', QuantityPacked: parentFG.get('QuantityPacked').value },
          { Id: childFG.get('Id').value, Status: 'Active', QuantityPacked: childFG.get('QuantityPacked').value },
        ];
      } else {
        obj = [{ Id: childFG.get('Id').value, Status: 'Active', QuantityPacked: childFG.get('QuantityPacked').value }];
      }
      // Check if QuantityPacked is valid
      const isValid = obj.every((item) => {
        let group = groups.controls.find((d) => d.get('Id').value == item.Id);
        return group && item.QuantityPacked <= group.get('Quantity').value && item.QuantityPacked >= 0;
      });
  
      if (!isValid) {
        this.env.showMessage('Quantity packed is more than quantity', 'danger');
        return; 
      }
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Packing/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then((result: any) => {
            if (result && result.length > 0) {
              let groups = <FormArray>this.formGroup.controls.PackingDetails;
              result.forEach((updatedPacking) => {
                var packingDetail = groups.controls.find((d) => d.get('Id').value == updatedPacking.Id);
                if (packingDetail) {
                  packingDetail.get('QuantityPacked').setValue(updatedPacking.QuantityPacked);
                  packingDetail.get('TrackingQuantityPacked').setValue(updatedPacking.QuantityPacked);

                }
              });
              this.env.showMessage('Saved', 'success');
            } else {
              this.env.showMessage('Cannot save, please try again', 'danger');
              childFG.get('QuantityPacked').setValue(childFG.get('TrackingQuantityPacked').value);
            }
            this.submitAttempt = false;
          })
          .catch(err => {
            this.submitAttempt = false;
            childFG.get('QuantityPacked').setValue(childFG.get('TrackingQuantityPacked').value);
            childFG.get('QuantityPacked').setErrors({valid:false});
            this.env.showMessage(err.error.Message, 'danger');
          });
      }
    }
  }

  async openTransaction(fg) {
    let sourceLine = [fg.controls.Id.value];
    //find child
    const findChildren = (parentId: number) => {
      const findChild = (parentId: any) => {
        let groups = (<FormArray>this.formGroup.get('PackingDetails')).controls;

        groups.forEach((group: FormGroup) => {
          const currentParentId = group.get('IDParent').value;
          const currentId = group.get('Id').value;

          if (currentParentId == parentId) {
            sourceLine.push(currentId);
            findChild(currentId);
          }
        });
      };
      findChild(parentId);
    };
    findChildren(fg.controls.Id.value);
    const modal = await this.modalController.create({
      component: TransactionModalPage,
      componentProps: {
        sourceLine: sourceLine,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.refresh();
    }
  }

  CreateShippingFromPacking(isForceCreate = false) {
    let packingQuery = {
      Id: [this.item.Id],
      IDVehicle: this.selectedVehicles.map((i) => i.Id),
      isForceCreate : isForceCreate
    };
    this.env
      .showLoading(
        'Please wait for a few moments',
        this.commonService.connect('GET', 'WMS/Packing/CreateShippingFromPacking', packingQuery).toPromise(),
      )
      .then((rs) => {
        this.formGroup.get('Status').setValue('ShippingAllocated');
        this.formGroup.get('Status').markAsPristine();

        this.env.showMessage('saved', 'success');
      })
      .catch((err) => {
        if(err.error && err.error.Message =='Need more vehicle to ship!') {
          this.env .showPrompt( 'Số lượng xe hiện tại không thể tải hết hàng, bạn có muốn tiếp tục?', null, 'Không đủ tải', )
          .then((_) => { 
            this.CreateShippingFromPacking(true)
            this.formGroup.get('Status').setValue('ShippingAllocated');
            this.formGroup.get('Status').markAsPristine();
          })
          .catch(err=>{
            this.env.showMessage('Cannot save', 'danger');
          });
        }
        else{
          this.env.showMessage('Cannot save', 'danger');
        }
      });
  }
  

  isModalOpen = false;
  presentModal() {
    this.selectedVehicles = [];

    this.isModalOpen = true;
    let queryVehicle = {};
    this.env
    .showLoading('Please wait for a few moments', this.vehicleService.read(queryVehicle))
    .then((result:any) => {
      if(result && result.data.length>0) this.vehicleList = result.data;
      console.log(this.vehicleList); 
    })
    .catch((err) => {
      console.log(err);
    });

  }
  
  dismissModal(isCreateShipping = false) {
    this.isModalOpen = false
    if(isCreateShipping){
      this.CreateShippingFromPacking();
    }

  }
  changeSelectionVehicle(e) {
    console.log(this.selectedVehicles);
  }

//#endregion

  // #region Selection
  changeSelection(i, view, e = null) {
    if (i.get('IsChecked').value) {
      this.checkedPackingDetails.push(i);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(true);
          this.checkedPackingDetails.push(sub);
        });
      }
    } else {
      let index = this.checkedPackingDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
      this.checkedPackingDetails.removeAt(index);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.PackingDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(false);
          let indexSub = this.checkedPackingDetails.getRawValue().findIndex((d) => d.Id == sub.get('Id').value);
          this.checkedPackingDetails.removeAt(indexSub);
        });
      }
    }
  }

  toggleSelectAll() {
    if (!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.PackingDetails;
    if (!this.isAllChecked) {
      this.checkedPackingDetails = new FormArray([]);
    }
    groups.controls.forEach((i) => {
      i.get('IsChecked').setValue(this.isAllChecked);
      if (this.isAllChecked) this.checkedPackingDetails.push(i);
    });
  }
//#endregion
 
// #region Delete
removeSelectedItems() {
    let groups = <FormArray>this.formGroup.controls.PackingDetails;
    this.checkedPackingDetails.controls.forEach((fg) => {
      const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
      groups.removeAt(indexToRemove);
    });

    this.checkedPackingDetails = new FormArray([]);
  }

  removeField(fg, j) {
    let groups = <FormArray>this.formGroup.controls.PackingDetails;
    let itemToDelete = fg.getRawValue();
    this.env.showPrompt('Bạn có chắc muốn xóa?', null, 'Xóa 1 dòng').then((_) => {
      this.packingDetailservice.delete(itemToDelete).then((result) => {
        groups.removeAt(j);
      });
    });
  }

  deleteItems() {
    if (this.pageConfig.canDelete) {
      let itemsToDelete = this.checkedPackingDetails.getRawValue();

      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn xóa {{value}} đang chọn?',value:{value:itemsToDelete.length}},
          null,
          {code:'Xóa {{value1}} dòng',value:{value1:itemsToDelete.length}},
        )
        .then((_) => {
          this.env
            .showLoading('Please wait for a few moments', this.packingDetailservice.delete(itemsToDelete))
            .then((_) => {
              this.removeSelectedItems();
              this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
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

// #region Sort
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
      const packingOrderDetailArray = this.formGroup.get('PackingDetails') as FormArray;
      this.item.PackingDetails = packingOrderDetailArray.getRawValue();
      packingOrderDetailArray.clear();
      this.item.PackingDetails.sort((a, b) => {
        const comparison = a['Id'] < b['Id'] ? -1 : a['Id'] > b['Id'] ? 1 : 0;
        return comparison;
      });
      this.buildFlatTree(this.item.PackingDetails, null, false).then((resp: any) => {
        this.item.PackingDetails = resp;
        this.patchFieldsValue();
      });
    } else {
      this.reInitPackingDetails();
    }
  }

  reInitPackingDetails() {
    const packingOrderDetailArray = this.formGroup.get('PackingDetails') as FormArray;
    this.item.PackingDetails = packingOrderDetailArray.getRawValue();
    for (const key in this.sortDetail) {
      if (this.sortDetail.hasOwnProperty(key)) {
        const value = this.sortDetail[key];
        this.sortByKey(value);
      }
    }
    packingOrderDetailArray.clear();
    this.buildFlatTree(this.item.PackingDetails, null, false).then((resp: any) => {
      this.item.PackingDetails = resp;
      this.patchFieldsValue();
    });
  }

  sortByKey(key: string, desc: boolean = false) {
    if (key.includes('_desc')) {
      key = key.replace('_desc', '');
      desc = true;
    }
    this.item.PackingDetails.sort((a, b) => {
      const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return desc ? -comparison : comparison;
    });
  }
  //#endregion

  // #region SaveChange
  async saveChange() {
    let submitItem = this.getDirtyValues(this.formGroup);
    super.saveChange2();
  }
//#endregion

  //#region Segment
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }
//#endregion

  // #region ToggleRow
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
    } else {
      subOrders.forEach((it) => {
        this.hideSubRows(it);
      });
    }
  }

  hideSubRows(fg) {
    let groups = <FormArray>this.formGroup.controls.PackingDetails;
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

markNestedNode(ls, Id) {
  ls.filter((d) => d.IDParent == Id).forEach((i) => {
    if (i.Type == 'Warehouse') i.disabled = false;
    this.markNestedNode(ls, i.Id);
  });
}

}
