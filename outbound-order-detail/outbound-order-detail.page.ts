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
  WMS_OutboundOrderDetailProvider,
  WMS_OutboundOrderProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-outbound-order-detail',
  templateUrl: 'outbound-order-detail.page.html',
  styleUrls: ['outbound-order-detail.page.scss'],
})
export class OutboundOrderDetailPage extends PageBase {
  countTypeDataSource: any;
  statusDataSource: any;
  schema: Schema;
  config: any = null;
  itemList: any;
  tempItemList: any;
  countItem: number = 0;
  branchList;
  storerList;
  packingTypeDatasource;
  statusList = [];
  isAllChecked = false;
  checkedOutboundOrderDetails: any = new FormArray([]);
  constructor(
    public pageProvider: WMS_OutboundOrderProvider,
    public outboundOrderDetailService: WMS_OutboundOrderDetailProvider,
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
      IDWarehouse: ['', Validators.required],
      IDStorer: ['', Validators.required],
      OutboundOrderDetails: this.formBuilder.array([]),

      PackingTag: ['', Validators.required],
      OrderDate: ['', Validators.required],
      DeliveryDate: ['', Validators.required],
      ShippedDate: [''],
      Status: ['New', Validators.required],

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
  _contactDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                SkipMCP: true,
                SkipAddress: true,
                IsStorer: true,
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };
  preLoadData(event) {
    this.statusList = [
      { Code: 'Open', Name: 'Mở', Color: 'warning' },
      { Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
    ];
    this.statusDataSource = [
      { Name: 'Done', Code: 'Done' },
      { Name: 'Open', Code: 'Open' },
      { Name: 'Pending', Code: 'Pending' },
    ];
    this.packingTypeDatasource = [
      { Name: 'Vehicle', Code: 'Vehicle' },
      { Name: 'Vehicle\\Customer', Code: 'Customer' },
      { Name: 'Vehicle\\Customer\\SO', Code: 'SaleOrder' },
      { Name: 'Vehicle\\Customer\\SOItem', Code: 'Item' },
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
          console.log(this.branchList);
        });
      });
    // this.contactProvider.read({ IsStorer: true }).then((resp) => {
    //   this.storerList = resp['data'];
    // });

    super.preLoadData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item.Status != 'New') {
      this.pageConfig.canEdit = false;
    }
    super.loadedData(event, ignoredFromGroup);
    if (!(this.item.Id > 0)) {
      this.formGroup.get('Status').markAsDirty();
    }
    this.query.IDOutboundOrder = this.item.Id;
    this.query.Id = undefined;
    this.outboundOrderDetailService.read(this.query, false).then((listDetail: any) => {
      if (listDetail != null && listDetail.data.length > 0) {
        const outboundOrdertDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
        outboundOrdertDetailsArray.clear();
        // this.item.OutboundOrderDetails = listDetail.data;
        this.buildFlatTree(listDetail.data, null, false).then((resp: any) => {
          this.item.OutboundOrderDetails = resp;
          this.patchFieldsValue();
        });
      }
    });
    if (this.item?._Storer) {
      this._contactDataSource.selected.push(this.item?._Storer);
    }
    this._contactDataSource.initSearch();
    this.query.Id = this.item.Id;
  }
  private patchFieldsValue() {
    this.pageConfig.showSpinner = true;

    if (this.item.OutboundOrderDetails?.length) {
      this.item.OutboundOrderDetails.forEach((i) => {
        this.addField(i);
      });
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.OutboundOrderDetails.disable();
    }

    this.pageConfig.showSpinner = false;
  }

  addField(field: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
    let preLoadItems = [
      {
        Id: field?._Item?.Id,
        Code: field?._Item?.Code,
        Name: field?._Item?.Name,
      },
    ];
    let group = this.formBuilder.group({
      _IDItemDataSource: [
        {
          searchProvider: this.itemService,
          loading: false,
          input$: new Subject<string>(),
          that: this,
          selected: preLoadItems,
          items$: null,
          initSearch() {
            this.loading = false;
            this.items$ = concat(
              of(this.selected),
              this.input$.pipe(
                distinctUntilChanged(),
                tap(() => (this.loading = true)),
                switchMap((term) =>
                  this.searchProvider
                    .search({
                      SortBy: ['Id_desc'],
                      Take: 20,
                      Skip: 0,
                      AllUoM: true,
                      Term: term,
                      Id_ne: this.that.getExistedItem().length > 0 ? this.that.getExistedItem() : '',
                    })
                    .pipe(
                      catchError(() => of([])), // empty list on error
                      tap(() => (this.loading = false)),
                    ),
                ),
              ),
            );
          },
        },
      ],
      IDOutboundOrder: [this.formGroup.get('Id').value, Validators.required],
      Id: new FormControl({ value: field?.Id, disabled: true }),
      IDItem: [field?.IDItem, Validators.required],
      IDParent: [field?.IDParent],
      Quantity: [field?.Quantity],
      QuantityPicked: [field?.QuantityPicked],
      QuantityPacked: [field?.QuantityPacked],
      QuantityShipped: [field?.QuantityShipped],
      Status: [field?.Status || 'Active'],
      HasChild: [field?.HasChild],
      Levels: [field?.levels],
      ShowDetail: [field?.showdetail],
      Showing: [field?.show],
      UoMName: [field?.UoMName],
      IDUoM: [field?.IDUoM],
      ItemName: [field?.ItemName],
      IsDisabled: new FormControl({ value: field?.IsDisabled, disabled: true }),
      IsDeleted: new FormControl({ value: field?.IsDeleted, disabled: true }),
      CreatedBy: new FormControl({ value: field?.CreatedBy, disabled: true }),
      CreatedDate: new FormControl({ value: field?.CreatedDate, disabled: true }),
      ModifiedBy: new FormControl({ value: field?.ModifiedBy, disabled: true }),
      ModifiedDate: new FormControl({ value: field?.ModifiedDate, disabled: true }),
      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    groups.push(group);
    group.get('_IDItemDataSource').value?.initSearch();
    if (markAsDirty) {
      group.get('Status').markAsDirty();
    }
  }

  IDItemChange(e, group) {
    if (e) {
      const uom = e.UoMs.find((d) => d.IsBaseUoM);
      if (uom) {
        group.controls.UoMName.setValue(uom.Name);
        group.controls.IDUoM.setValue(uom.Id);
        group.controls.IDUoM.markAsDirty();
        group.controls.IDItem.setValue(e.Id);
        group.controls.IDItem.markAsDirty();
        group.controls.IDOutboundOrder.setValue(this.id);
        group.controls.IDOutboundOrder.markAsDirty();
        super.saveChange2(group, this.pageConfig.pageName, this.outboundOrderDetailService);
      } else {
        group.controls.UoMName.setValue('');
        group.controls.IDUoM.setValue('');
        group.controls.IDItem.setValue(e.Id);

        this.env.showTranslateMessage('Sale UoM not found!', 'warning');
      }
    }
  }

  changeQuantity(group) {
    group.controls.Quantity.markAsDirty();
    group.controls.Id.markAsDirty();
    super.saveChange2(group, this.pageConfig.pageName, this.outboundOrderDetailService);
  }

  changeStatus() {
    this.query.Id = this.formGroup.get('Id').value;
    this.query.ToStatus = 'Open';
    this.env
      .showLoading(
        'Vui lòng chờ load dữ liệu...',
        this.pageProvider.commonService.connect('GET', 'WMS/OutboundOrder/ChangeStatus/', this.query).toPromise(),
      )
      .then((result: any) => {
        this.env.showTranslateMessage('saved', 'success');
        this.refresh();
      })
      .catch((err) => {
        this.env.showTranslateMessage(err.error?.Message ?? err.message, 'danger');
      });
    //   this.query.Id = undefined;
  }

  changeSelection(i, view, e = null) {
    if (i.get('IsChecked').value) {
      this.checkedOutboundOrderDetails.push(i);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(true);
          this.checkedOutboundOrderDetails.push(sub);
        });
      }
    } else {
      let index = this.checkedOutboundOrderDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
      this.checkedOutboundOrderDetails.removeAt(index);
      if (i.get('HasChild').value) {
        let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
        let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
        subOrders.forEach((sub) => {
          sub.get('IsChecked').setValue(false);
          let indexSub = this.checkedOutboundOrderDetails.getRawValue().findIndex((d) => d.Id == sub.get('Id').value);
          this.checkedOutboundOrderDetails.removeAt(indexSub);
        });
      }
    }
  }

  toggleSelectAll() {
    if (!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
    if (!this.isAllChecked) {
      this.checkedOutboundOrderDetails = new FormArray([]);
    }
    groups.controls.forEach((i) => {
      i.get('IsChecked').setValue(this.isAllChecked);
      if (this.isAllChecked) this.checkedOutboundOrderDetails.push(i);
    });
  }

  removeSelectedItems() {
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
    this.checkedOutboundOrderDetails.controls.forEach((fg) => {
      const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
      groups.removeAt(indexToRemove);
    });

    this.checkedOutboundOrderDetails = new FormArray([]);
  }

  removeField(fg, j) {
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
    if (fg.get('Id').value) {
      let itemToDelete = fg.getRawValue();
      this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then((_) => {
        this.outboundOrderDetailService
          .delete(itemToDelete)
          .then((result) => {
            groups.removeAt(j);
            this.env.showTranslateMessage('saved', 'success');
          })
          .catch((err) => {
            this.env.showTranslateMessage(err.error?.Message ?? err.message, 'danger');
          });
      });
    } else {
      groups.removeAt(j);
    }
  }

  deleteItems() {
    if (this.pageConfig.canDelete) {
      let itemsToDelete = this.checkedOutboundOrderDetails.getRawValue();

      this.env
        .showPrompt(
          'Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?',
          null,
          'Xóa ' + itemsToDelete.length + ' dòng',
        )
        .then((_) => {
          this.env
            .showLoading('Xin vui lòng chờ trong giây lát...', this.outboundOrderDetailService.delete(itemsToDelete))
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

  getExistedItem() {
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
    return groups.controls.map((g) => g.get('IDItem').value);
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
      const outboundOrderDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
      this.item.OutboundOrderDetails = outboundOrderDetailsArray.getRawValue();
      outboundOrderDetailsArray.clear();
      this.item.OutboundOrderDetails.sort((a, b) => {
        const comparison = a['Id'] < b['Id'] ? -1 : a['Id'] > b['Id'] ? 1 : 0;
        return comparison;
      });
      this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
        this.item.OutboundOrderDetails = resp;
        this.patchFieldsValue();
      });
    } else {
      this.reInitOutboundOrderDetails();
    }
  }

  reInitOutboundOrderDetails() {
    const outboundOrderDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
    this.item.OutboundOrderDetails = outboundOrderDetailsArray.getRawValue();
    for (const key in this.sortDetail) {
      if (this.sortDetail.hasOwnProperty(key)) {
        const value = this.sortDetail[key];
        this.sortByKey(value);
      }
    }
    outboundOrderDetailsArray.clear();
    this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
      this.item.OutboundOrderDetails = resp;
      this.patchFieldsValue();
    });
  }

  sortByKey(key: string, desc: boolean = false) {
    if (key.includes('_desc')) {
      key = key.replace('_desc', '');
      desc = true;
    }
    this.item.OutboundOrderDetails.sort((a, b) => {
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
    if (this.item.Id > 0) {
      let queryOutbound = {
        IDOutboundOrder: this.item.Id,
      };
      if (this.segmentView == 's2') {
        this.env
          .showLoading(
            'Vui lòng chờ load dữ liệu...',
            this.pageProvider.commonService.connect('GET', 'WMS/Picking/', queryOutbound).toPromise(),
          )
          .then(async (result: any) => {
            this.item.PickingList = result;
            this.item.PickingList.forEach((i) => {
              i._Status = this.statusList.find((d) => d.Code == i.Status);
            });
          })
          .catch((err) => {
            this.env.showMessage('load error, please try again.');
            console.log(err);
          });
      }
      if (this.segmentView == 's3') {
        this.env
          .showLoading(
            'Vui lòng chờ load dữ liệu...',
            this.pageProvider.commonService.connect('GET', 'WMS/Packing/', queryOutbound).toPromise(),
          )
          .then(async (result: any) => {
            this.item.PackingList = result;
            this.item.PackingList.forEach((i) => {
              i._Status = this.statusList.find((d) => d.Code == i.Status);
            });
          })
          .catch((err) => {
            this.env.showMessage('load error, please try again.');
            console.log(err);
          });
      }
      if (this.segmentView == 's4') {
        this.env
          .showLoading(
            'Vui lòng chờ load dữ liệu...',
            this.pageProvider.commonService.connect('GET', 'WMS/Shipping/', queryOutbound).toPromise(),
          )
          .then(async (result: any) => {
            this.item.ShippingList = result;
            this.item.ShippingList.forEach((i) => {
              i._Status = this.statusList.find((d) => d.Code == i.Status);
            });
          })
          .catch((err) => {
            this.env.showMessage('load error, please try again.');
            console.log(err);
          });
      }
    }
  }

  toggleRow(fg, event) {
    if (!fg.get('HasChild').value) {
      return;
    }
    event.stopPropagation();
    fg.get('ShowDetail').setValue(!fg.get('ShowDetail').value);
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
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
    let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
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
}
