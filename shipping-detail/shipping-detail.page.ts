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
  checkedShippingDetails: any = new FormArray([]);
  constructor(
    public pageProvider: WMS_ShippingProvider,
    public shippingDetailService: WMS_ShippingDetailProvider,
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
    this.query.IDShipping = this.item.Id;
    this.query.Id = undefined;
    this.shippingDetailService.read(this.query, false).then((listDetail: any) => {
      if (listDetail != null && listDetail.data.length > 0) {
        const ShippingDetailsArray = this.formGroup.get('ShippingDetails') as FormArray;
        ShippingDetailsArray.clear();
        this.item.ShippingDetails = listDetail.data;
        this.patchFieldsValue();
      }
    });
    if (this.item.Status == 'Closed') {
      this.pageConfig.canEdit = false;
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
      QuantityShipped: [field.QuantityShipped],
      FromLocationName: [field.FromLocationName],
      LotName: [field.LotName],
      UoMName: [field.UoMName],
      ItemName: [field.ItemName], //de hien thi
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

  changeStatus() {
    this.query.ToStatus = 'Closed';
    this.query.Id = this.formGroup.get('Id').value;
    this.env
      .showLoading(
        'Vui lòng chờ load dữ liệu...',
        this.pageProvider.commonService.connect('GET', 'WMS/Shipping/ChangeStatus/', this.query).toPromise(),
      )
      .then((result: any) => {
        this.refresh();
      });
    this.query.Id = undefined;
  }

  updateQuantity(obj) {
    this.pageProvider.commonService
      .connect('PUT', 'WMS/Shipping/UpdateQuantity/', obj)
      .toPromise()
      .then((result: any) => {
        if (result) {
          this.env.showTranslateMessage('Saved', 'success');
        } else {
          this.env.showTranslateMessage('Cannot save, please try again', 'danger');
        }
      });
    // this.saveChange2(fg, null, this.ShippingDetailservice)
  }
  toggleQty(group) {
    if (group.controls.Quantity.value == group.controls.QuantityShipped.value) {
      group.controls.QuantityShipped.setValue(0);
    } else {
      group.controls.QuantityShipped.setValue(group.controls.Quantity.value);
    }
    let obj = [{ Id: group.get('Id').value, QuantityShipped: group.get('QuantityShipped').value }];
    this.updateQuantity(obj);
  }

  toggleAllQty() {
    let groups = <FormArray>this.formGroup.controls.ShippingDetails;
    groups.controls.forEach((group: FormGroup) => {
      if (this.item._IsShippedAll) {
        group.controls.QuantityShipped.setValue(0);
        group.controls.QuantityShipped.markAsDirty();
      } else {
        group.controls.QuantityShipped.setValue(group.controls.Quantity.value);
        group.controls.QuantityShipped.markAsDirty();
      }
    });
    this.item._IsShippedAll = !this.item._IsShippedAll;
  }

  UpdateShippedQuantity(fg) {
    if(fg.get('QuantityShipped').value >= 0 && fg.get('QuantityShipped').value <= fg.get('Quantity').value){
      let obj = [
        {
          Id: fg.get('Id').value,
          QuantityShipped: fg.get('QuantityShipped').value,
        },
      ];
      this.updateQuantity(obj);
    }
  }

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
          this.env
            .showLoading('Xin vui lòng chờ trong giây lát...', this.shippingDetailService.delete(itemsToDelete))
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

  async openTransaction(fg) {
    const modal = await this.modalController.create({
      component: TransactionModalPage,
      componentProps: {
        sourceLine: fg.controls.Id.value,
        transactionType: 'Shipping',
        module: 'Shipping'
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (data) {
      this.refresh();
    }
  }


}
