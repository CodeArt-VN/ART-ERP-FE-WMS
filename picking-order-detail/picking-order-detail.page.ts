import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_ItemProvider,
  WMS_OutboundOrderDetailProvider,
  WMS_PickingDetailProvider,
  WMS_PickingProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { TransactionModalPage } from '../transaction-modal/transaction-modal.page';

@Component({
  selector: 'app-picking-order-detail',
  templateUrl: 'picking-order-detail.page.html',
  styleUrls: ['picking-order-detail.page.scss'],
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
      ModifiedDate: new FormControl({ value: '', disabled: true }),
      DeletedPickingOrderDetails: [[]],
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
      IDParent_ne_Null: true,
    };
    this.outboundOrderDetailService.commonService
      .connect('GET', 'WMS/Picking/GetPickingDetailsGroupByItem/', queryOutbound)
      .toPromise()
      .then((listOutboundDetail: any) => {
        if (listOutboundDetail != null && listOutboundDetail.length > 0) {
          const pickingOrdertDetailsArray = this.formGroup.get('PickingOrderDetails') as FormArray;
          pickingOrdertDetailsArray.clear();
          let outboundDetails = listOutboundDetail;
          let pickingDetails = this.item.PickingDetails;
          pickingDetails?.forEach((s) => {
            let parent = outboundDetails.find((d) => d.IDItem == s.IDItem && d.IDUoM == s.IDUoM);
            if (parent) {
              if (!parent.Id) {
                parent.Id = Math.floor(Math.random() * (10000000 - 10000 + 1)) + 10000000000;
              }
              s.IDParent = parent.Id;
            }
          });
          let list = [...outboundDetails, ...pickingDetails];
          this.buildFlatTree(list, this.item.PickingOrderDetails, false).then((resp: any) => {
            this.item.PickingOrderDetails = resp;
            this.patchFieldsValue();
          });
        }
      });
    if (this.item.Status == 'Closed') {
      this.pageConfig.canEdit = false;
    }
  }

  private patchFieldsValue() {
    this.pageConfig.showSpinner = true;
    if (this.item.PickingOrderDetails?.length) {
      this.item.PickingOrderDetails.forEach((i) => {
        this.addField(i);
      });
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.PickingOrderDetails.disable();
    }

    this.pageConfig.showSpinner = false;
  }

  addField(field: any, markAsDirty = false) {

    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    let group = this.formBuilder.group({
      _LotLPNLocationsDataSource: [field.LotLPNLocations],
      _LotLPNLocationsDataSourceOld: [field.LotLPNLocations],
      IDPicking: [this.formGroup.get('Id').value, Validators.required],
      Id: new FormControl({ value: field.Id, disabled: true }),
      IDItem: [field.IDItem, Validators.required],
      IDUoM: [field.IDUoM],
      IDParent: [field.IDParent],
      Quantity: new FormControl({ value: field?.Quantity, disabled: field?.Status != 'Active' ? true : false }),
      QuantityPicked: new FormControl({ value: field?.QuantityPicked, disabled: field?.Status != 'Active' ? true : false }),
      LPN: [field.LPN > 0 ? field.LPN : null],
      FromLocation: [field.FromLocation],
      FromLocationName: [field.FromLocationName],
      LotLPNLocation:  new FormControl({ value: field?.Lot + '-' + field?.LPN + '-' + field?.FromLocation, disabled: field?.Status != 'Active' ? true : false }),
      ToLocationName: [field.ToLocationName],
      ToLocation: [field.ToLocation],
      Lot: [field.Lot],
      LotName: [field.LotName],
      UoMName: [field.UoMName],
      Status: [field.Status],
      ItemName: [field.ItemName], //de hien thi
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
    if (markAsDirty) {
      group.controls.IDUoM.markAsDirty();
      group.controls.IDItem.markAsDirty();
      group.controls.Quantity.markAsDirty();
      group.controls.QuantityPicked.markAsDirty();
      group.controls.LPN.markAsDirty();
      group.controls.FromLocation.markAsDirty();
      group.controls.ToLocation.markAsDirty();
      group.controls.Lot.markAsDirty();
    }
  }

  closePick() {
    this.query.Id = this.item.Id;
    this.env .showPrompt( 'Bạn có chắc muốn đóng tất cả các sản phẩm lấy hàng?', null, 'Đóng lấy hàng', )
    .then((_) => {
      this.env
        .showLoading(
          'Vui lòng chờ load dữ liệu...',
          this.pageProvider.commonService.connect('GET', 'WMS/Picking/ClosePicking/', this.query).toPromise(),
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

  changeStatusDetail(fg, status) {
    if(this.submitAttempt){
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'warning');
      return;
    }
      else {
        if (fg.get('Status').value == 'Active' && status == 'Done') {
          //update status Active -> Done
          let obj = [
            {
              Id: fg.get('Id').value,
              Status: status,
            },
          ];
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Picking/UpdateQuantityOnHand/', obj)
          .toPromise()
          .then((result: any) => {
            if (result) {
              this.env.showTranslateMessage('Saved', 'success');
              fg.controls.Status.setValue(status);
              fg.disable();
            } else {
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            } 
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  allocatePicking() {
    this.query.Id = this.formGroup.get('Id').value;
    this.env
      .showLoading(
        'Vui lòng chờ load dữ liệu...',
        this.pageProvider.commonService.connect('GET', 'WMS/Picking/AllocatePicking/', this.query).toPromise(),
      )
      .then((result: any) => {
        this.refresh();
      });
  }

  toggleQty(group) {
    if (group.controls.Quantity.value == group.controls.QuantityPicked.value) {
      group.controls.QuantityPicked.setValue(0);
      group.controls.QuantityPicked.markAsDirty();
    } else {
      group.controls.QuantityPicked.setValue(group.controls.Quantity.value);
      group.controls.QuantityPicked.markAsDirty();
    }
    this.calcTotalPickedQuantity(group);
  }

  toggleAllQty() {
    if(this.submitAttempt){
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    } 
    else{
      let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
      let obj = [];
      groups.controls.forEach((group: FormGroup) => {
        const currentStatus = group.get('Status').value;
        if (currentStatus == 'Active') {
          if (this.item._IsPickedAll) {
            group.controls.QuantityPicked.setValue(0);
          } else {
            group.controls.QuantityPicked.setValue(group.controls.Quantity.value);
          }
          const id = group.get('Id').value;
          const quantityPicked = group.controls.QuantityPicked.value;
          obj.push({ Id: id, QuantityPicked: quantityPicked });
        }
      });
  
      if (!this.submitAttempt && obj.length > 0) {
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect('PUT', 'WMS/Picking/UpdateQuantity/', obj)
          .toPromise()
          .then(() => {
            this.env.showTranslateMessage('Saved', 'success');
            this.item._IsPickedAll = !this.item._IsPickedAll;
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  calcTotalPickedQuantity(childFG) {
    if(this.submitAttempt){
      childFG.get('QuantityPicked').setErrors({valid:false});
      this.env.showTranslateMessage('System is saving please wait for seconds then try again', 'danger','error',5000,true);
      return;
    }
    else{
      let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
      let totalPickedQty = 0;
      let parentFG = groups.controls.find((d) => d.get('Id').value == childFG.get('IDParent').value);
      let obj;
      if (parentFG) {
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == parentFG.get('Id').value);
        subOrders.forEach((sub) => {
          totalPickedQty += parseFloat(sub.get('QuantityPicked').value || 0);
        });
        parentFG.get('QuantityPicked').setValue(totalPickedQty);
        // parentFG.get('QuantityPicked').markAsDirty();
        obj = [
          // {Id:parentFG.get('Id').value, QuantityPicked:parentFG.get('QuantityPicked').value},
          { Id: childFG.get('Id').value, QuantityPicked: childFG.get('QuantityPicked').value },
        ];
      } else {
        obj = [{ Id: childFG.get('Id').value, QuantityPicked: childFG.get('QuantityPicked').value }];
      }
      // Check if QuantityPicked is valid
      const isValid = obj.every((item) => {
        let group = groups.controls.find((d) => d.get('Id').value == item.Id);
        return group && item.QuantityPicked <= group.get('Quantity').value && item.QuantityPicked >= 0;
      });
  
      if (!isValid) {
        this.env.showTranslateMessage('Quantity picked is more than quantity', 'danger');

        return;
      }
      this.submitAttempt = false;
      childFG.get('Id').markAsDirty();
      childFG.get('QuantityPicked').markAsDirty();
      super.saveChange2(childFG, this.pageConfig.pageName, this.pickingOrderDetailService);
    }

  }

  changeSelection(i, view, e = null) {
    if (i.get('IsChecked').value) {
      this.checkedPickingOrderDetails.push(i);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(true);
          this.checkedPickingOrderDetails.push(sub);
        });
      }
    } else {
      let index = this.checkedPickingOrderDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
      this.checkedPickingOrderDetails.removeAt(index);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(false);
          let indexSub = this.checkedPickingOrderDetails.getRawValue().findIndex((d) => d.Id == sub.get('Id').value);
          this.checkedPickingOrderDetails.removeAt(indexSub);
        });
      }
    }
  }

  toggleSelectAll() {
    if (!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    if (!this.isAllChecked) {
      this.checkedPickingOrderDetails = new FormArray([]);
    }
    groups.controls.forEach((i) => {
      i.get('IsChecked').setValue(this.isAllChecked);
      if (this.isAllChecked) this.checkedPickingOrderDetails.push(i);
    });
  }

  removeSelectedItems() {
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    this.checkedPickingOrderDetails.controls.forEach((fg) => {
      const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
      groups.removeAt(indexToRemove);
    });

    this.checkedPickingOrderDetails = new FormArray([]);
  }

  removeField(fg, j) {
    let itemToDelete = fg.getRawValue();
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    if (itemToDelete.Id) {
      this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then((_) => {
        this.pickingOrderDetailService.delete(itemToDelete).then((result) => {
          groups.removeAt(j);
        });
      });
    } else {
      groups.removeAt(j);
    }
  }

  deleteItems() {
    if (this.pageConfig.canDelete) {
      let itemsToDelete = this.checkedPickingOrderDetails.getRawValue();
      this.env
        .showPrompt(
          'Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?',
          null,
          'Xóa ' + itemsToDelete.length + ' dòng',
        )
        .then((_) => {
          this.env
            .showLoading('Xin vui lòng chờ trong giây lát...', this.pickingOrderDetailService.delete(itemsToDelete))
            .then((_) => {
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

  async saveChange() {
    let submitItem = this.getDirtyValues(this.formGroup);
    super.saveChange2();
  }

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
    this.item.PickingOrderDetails.forEach((s) => this.addField(s));
  }

  sortByKey(key: string, desc: boolean = false) {
    if (key.includes('_desc')) {
      key = key.replace('_desc', '');
      desc = true;
    }
    this.item.PickingOrderDetails.sort((a, b) => {
      const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return desc ? -comparison : comparison;
    });
  }

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
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
    } else {
      subOrders.forEach((it) => {
        this.hideSubRows(it);
      });
    }
  }

  hideSubRows(fg) {
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
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

  changedFromLocationID(valueNew, group, index) {
    let itemUpdate = [];
    if (valueNew) {
      let quantityPicked = group.controls.QuantityPicked.value;
      let quantity = group.controls.Quantity.value;
      let LotLPNLocation =
        group.controls.Lot.value + '-' + group.controls.LPN.value + '-' + group.controls.FromLocation.value;

      if (quantityPicked > 0) {
        group.controls.Quantity.setValue(quantityPicked);
        group.controls.QuantityPicked.setValue(quantityPicked);
        group.controls.LotLPNLocation.setValue(LotLPNLocation);

        group.controls.Quantity.markAsDirty();
        group.controls.QuantityPicked.markAsDirty();
        group.controls.LotLPNLocation.markAsDirty();

        let itemCopy = this.copyPickingOrderDetail(group);
        itemUpdate.push({
          Id: group.controls.Id.value,
          Quantity: group.controls.Quantity.value,
          QuantityPicked: group.controls.QuantityPicked.value,
        });
        itemCopy.indexGroup = index + 1;
        itemUpdate.push(itemCopy);

        itemCopy.Quantity = quantity - quantityPicked;
        itemCopy.LotLPNLocation = valueNew.LotLPNLocation;
        itemCopy.Lot = valueNew.IDLot;
        itemCopy.LPN = valueNew.IDLPN;
        itemCopy.FromLocation = valueNew.IDLocation;
        itemCopy.LotName = valueNew.LotName;

        this.addField(itemCopy, true);
        this.AddPickingOrderDetailToFormGroup(index + 1);
      } else {
        if (valueNew.QuantityOnHand < quantity) {
          group.controls.Quantity.setValue(valueNew.QuantityOnHand);
          group.controls.Quantity.markAsDirty();
        }
        group.controls.Lot.setValue(valueNew.IDLot);
        group.controls.LPN.setValue(valueNew.IDLPN);
        group.controls.FromLocation.setValue(valueNew.IDLocation);
        group.controls.LotName.setValue(valueNew.LotName);

        group.controls.Lot.markAsDirty();
        group.controls.LPN.markAsDirty();
        group.controls.FromLocation.markAsDirty();
        let itemAdd = this.copyPickingOrderDetail(group);
        itemAdd.Id = group.controls.Id.value;
        itemAdd.indexGroup = index;
        itemUpdate.push(itemAdd);
      }

      if (group.controls.Quantity.value <= 0) {
        this.env.showTranslateMessage('Vui lòng nhập số lượng', 'warning');
      } else {
        this.updatePickingDetail(itemUpdate);
      }
    }
  }

  changeQuantity(group) {
    const dataRow = group.getRawValue();
    if (dataRow.Quantity > 0) {
      let lotLPNLocationSelected = dataRow._LotLPNLocationsDataSource.find(
        (f) => f.IDLot == dataRow.Lot && f.IDLPN == dataRow.LPN && f.IDLocation == dataRow.FromLocation,
      );
      if (dataRow.Quantity < dataRow.QuantityPicked) {
        this.env.showTranslateMessage('Số lượng nhập vào không thể bé hơn picked quantity', 'warning');
        return;
      }
      if (lotLPNLocationSelected) {
        if (dataRow.Quantity > lotLPNLocationSelected.QuantityOnHand) {
          group.controls.Quantity.setValue(dataRow.Quantity);
          this.env.showTranslateMessage('Số lượng nhập vào không thể lớn hơn số lượng có trong kho', 'warning');
        } else {
          group.controls.Quantity.markAsDirty();
          this.updatePickingDetail([
            {
              Id: group.controls.Id.value,
              Quantity: group.controls.Quantity.value,
              QuantityPicked: group.controls.QuantityPicked.value,
            },
          ]);
        }
      } else {
        this.env.showTranslateMessage('Vui lòng chọn From location', 'warning');
      }
    } else {
      this.env.showTranslateMessage('Số lượng nhập vào phải lớn hơn 0', 'warning');
    }
  }

  AddPickingOrderDetail(group) {
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    let indexAdd = groups.controls.filter((f) => f.get('IDParent').value == group.controls.Id.value).length;
    let childGroup = groups.controls.filter((f) => f.get('IDParent').value  == group.controls.Id.value)[indexAdd-1];
    indexAdd = groups.controls.indexOf(childGroup);
    let itemAdd = this.copyPickingOrderDetail(groups.controls[indexAdd]);
    itemAdd.LPN = null;
    itemAdd.IDParent = group.controls.Id.value;
    itemAdd.FromLocation = null;
    itemAdd.Lot = null;
    itemAdd.LotLPNLocation = null;
    itemAdd.Quantity = 1;
    itemAdd.QuantityPicked = 0;
    this.addField(itemAdd, true);
    this.AddPickingOrderDetailToFormGroup(indexAdd + 1);
  }

  AddPickingOrderDetailToFormGroup(index) {
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
    let indexLast = groups.length - 1;
    let itemLast = groups.controls[indexLast];
    groups.removeAt(indexLast);
    groups.insert(index, itemLast);
  }

  copyPickingOrderDetail(group) {
    let itemAdd = {
      Id: 0,
      IDPicking: group.controls.IDPicking.value,
      IDUoM: group.controls.IDUoM.value,
      IDItem: group.controls.IDItem.value,
      IDParent: group.controls.IDParent.value,
      ItemName: group.controls.ItemName.value,
      LotLPNLocations: group.controls._LotLPNLocationsDataSource.value,
      ToLocationName: group.controls.ToLocationName.value,
      UoMName: group.controls.UoMName.value,
      showdetail: group.controls.ShowDetail.value,
      show: group.controls.Showing.value,
      HasChild: group.controls.HasChild.value,
      Status: 'Active',
      LotLPNLocation:
        group.controls.Lot.value + '-' + group.controls.LPN.value + '-' + group.controls.FromLocation.value,
      levels: group.controls.Levels.value,
      FromLocationName: group.controls.FromLocationName.value,
      FromLocation: group.controls.FromLocation.value,
      ToLocation: group.controls.ToLocation.value,
      Quantity: 1,
      QuantityPicked: 0,
      LPN: group.controls.LPN.value,
      Lot: group.controls.Lot.value,
      LotName: group.controls.LotName.value,
      indexGroup: 0,
    };
    return itemAdd;
  }

  openLotLPNLocations(group) {
    let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;

    let lotLPNLocationsExist = groups.controls
      .filter((d) => d.get('IDParent').value == group.get('IDParent').value && d != group)
      .map((e) => e.get('LotLPNLocation').value);

    let data = group.controls._LotLPNLocationsDataSourceOld.value.filter(
      (f) => !lotLPNLocationsExist.includes(f.LotLPNLocation) && f.IDLocation != group.controls.ToLocation.value,
    );
    group.controls._LotLPNLocationsDataSource.setValue(data);
  }

  updatePickingDetail(data) {
    this.pageProvider.commonService
      .connect('POST', 'WMS/Picking/UpdatePickingDetail/', data)
      .toPromise()
      .then((result: any) => {
        if (result) {
          let listId = data.filter((f) => f.Id).map((e) => e.Id);
          let index = data.find((f) => !f.Id);
          if (index && index.indexGroup) {
            let itemAdd = result.find((f) => !listId.includes(f.Id));
            if (itemAdd) {
              let groups = <FormArray>this.formGroup.controls.PickingOrderDetails;
              let item: any = groups.controls[index.indexGroup];
              item.controls.Id.setValue(itemAdd.Id);
              item.controls.Id.markAsDirty();
            }
          }
          this.env.showTranslateMessage('Saved', 'success');
        } else {
          this.env.showTranslateMessage('Cannot save, please try again', 'danger');
        }
      });
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
