import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute, Router } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_ItemProvider,
  WMS_LocationProvider,
  WMS_ReceiptDetailProvider,
  WMS_ReceiptPalletizationProvider,
  WMS_ReceiptProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
    selector: 'app-receipt-detail',
    templateUrl: './receipt-detail.page.html',
    styleUrls: ['./receipt-detail.page.scss'],
    standalone: false
})
export class ReceiptDetailPage extends PageBase {
  @ViewChild('importfile') importfile: any;
  branchList = [];
  _vendorDataSource;
  storerList = [];
  vendorView = false;
  carrierList = [];
  statusList = [];
  typeList = [];
  constructor(
    public pageProvider: WMS_ReceiptProvider,
    public receiptDetailProvider: WMS_ReceiptDetailProvider,
    public receiptPalletizationProvider: WMS_ReceiptPalletizationProvider,
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public itemProvider: WMS_ItemProvider,
    public locationProvider: WMS_LocationProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public router: Router,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      IDBranch: ['', Validators.required],
      IDStorer: ['', Validators.required],
      IDVendor: ['', Validators.required],
      IDPurchaseOrder: [''], //
      POCode: [''], //

      Id: new FormControl({ value: 0, disabled: true }),
      Code: [''],
      Name: [''],
      ForeignName: [''],
      Remark: [''],
      ForeignRemark: [''],

      ExternalReceiptKey: [''], //
      IDCarrier: [''], //
      VehicleNumber: [''], //

      ExpectedReceiptDate: ['', Validators.required],
      ArrivalDate: [''], //
      ReceiptedDate: [''],
      ClosedDate: [''], //

      Type: ['KeyIn'], //new FormControl({ value: '', disabled: false }),
      Status: new FormControl({ value: '', disabled: true }),
      IsDisabled: new FormControl({ value: '', disabled: true }),
      Lines: this.formBuilder.array([]),
    });
    if(this.env.user.IDBusinessPartner > 0 && this.env.user.SysRoles.includes('VENDOR')) this.vendorView = true;
    if (!pageProvider['importDetail']) {
      Object.assign(pageProvider, {
        importDetail(fileToUpload: File, id) {
          const formData: FormData = new FormData();
          formData.append('fileKey', fileToUpload, fileToUpload.name);
          return new Promise((resolve, reject) => {
            this.pageProvider.commonService
              .connect('UPLOAD', ApiSetting.apiDomain('WMS/Receipt/ImportReceiptDetailFile/' + id), formData)
              .toPromise()
              .then((data) => {
                resolve(data);
              })
              .catch((err) => {
                this.checkError(err);
                reject(err);
              });
          });
        },
      });
    }
    this._vendorDataSource =this.buildSelectDataSource((term) => {
      return this.contactProvider.search({  SkipAddress: true, IsVendor: true,SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term });
    });
  }

  preLoadData(event) {
    this.branchList = lib.cloneObject(this.env.branchList);
    Promise.all([
      this.contactProvider.read({ IsStorer: true })
      ,this.contactProvider.read({ IsCarrier: true })
      , this.env.getStatus('ReceiptStatus')
      ,this.env.getType('ReceiptType')
    ]).then((values) => {
      this.storerList = values[0]['data'];
      this.carrierList = values[1]['data'];
      this.statusList = values[2];
      this.typeList = values[3];
    super.preLoadData(event);

    })
   
  }

  loadedData() {
    if (this.item) {
      this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
      if (this.item.Lines) {
        this.item.Lines.sort((a, b) => (a.Id > b.Id ? 1 : b.Id > a.Id ? -1 : 0));
        this.item.Lines.forEach((l) => {
          l.Lottable5 = lib.dateFormat(l.Lottable5);
          l.Lottable6 = lib.dateFormat(l.Lottable6);
        });
      }

      if (!(this.item.Status == 'New' || this.item.Status == 'Palletized')) {
        this.pageConfig.canEdit = false;
      }
    }

    super.loadedData();

    if (this.id == 0) {
      this.formGroup.controls.Type.markAsDirty();
    }
    if(this.item && this.item._Vendor){
      this._vendorDataSource.selected = [...this._vendorDataSource.selected ,this.item._Vendor];
    }
    this._vendorDataSource.initSearch();
    this.setLines();

    this.pageConfig.canDelivery = this.item.Status == 'Confirmed' && this.vendorView;
  }

  setLines() {
    this.formGroup.controls.Lines = new FormArray([]);
    if (this.item.Lines?.length)
      this.item.Lines.forEach((i) => {
        this.addOrderLine(i);
      });
    // else
    //     this.addOrderLine({ IDOrder: this.item.Id, Id: 0 });

    this.calcTotalLine();
  }

  addOrderLine(line) {
    let searchInput$ = new Subject<string>();
    let groups = <FormArray>this.formGroup.controls.Lines;
    let group = this.formBuilder.group({
      _ItemSearchLoading: [false],
      _ItemSearchInput: [searchInput$],
      _ItemDataSource: [
        searchInput$.pipe(
          distinctUntilChanged(),
          tap(() => group.controls._ItemSearchLoading.setValue(true)),
          switchMap((term) =>
            this.itemProvider.search({ Take: 20, Skip: 0, Keyword: term }).pipe(
              catchError(() => of([])),
              tap(() => group.controls._ItemSearchLoading.setValue(false)),
            ),
          ),
        ),
      ],

      _UoMs: [line._Item ? line._Item.UoMs : ''],
      _Item: [line._Item, Validators.required],
      _IsShowPallets: [true],

      // IDReceipt: [line.IDReceipt],
      // IDPO: [line.IDPO],
      // IDPOLine: [line.IDPOLine],
      IDItem: [line.IDItem, Validators.required],
      IDUoM: [line.IDUoM, Validators.required],
      Id: [line.Id],
      // Code: [line.Code],
      // Remark: [line.Remark],
      // ForeignRemark: [line.ForeignRemark],
      // ExternalReceipt: [line.ExternalReceipt],
      // ExternalLine: [line.ExternalLine],
      // Status: [line.Status],
      // ReceivedDate: [line.ReceivedDate],

      // UoMQuantityExpected: [line.UoMQuantityExpected, Validators.required],
      UoMQuantityExpected: [line.UoMQuantityExpected],
      // QuantityAdjusted: [line.QuantityAdjusted],
      QuantityReceived: [line.QuantityReceived],
      // QuantityRejected: [line.QuantityRejected],
      Cube: new FormControl({ value: line.Cube, disabled: true }),
      GrossWeight: new FormControl({
        value: line.GrossWeight,
        disabled: true,
      }),
      NetWeight: new FormControl({
        value: line.NetWeight,
        disabled: true,
      }),

      Expiry: [line.Lottable1],
      ExpiryUnit: [line.Lottable1],

      Lottable0: [line.Lottable0, Validators.required],
      Lottable1: [line.Lottable1],
      Lottable2: [line.Lottable2],
      Lottable3: [line.Lottable3],
      Lottable4: [line.Lottable4],

      Lottable5: [line.Lottable5, Validators.required],
      Lottable6: [line.Lottable6, Validators.required],
      Lottable7: [line.Lottable7],
      Lottable8: [line.Lottable8],
      Lottable9: [line.Lottable9],

      Pallets: this.formBuilder.array([]),
    });
    this.setPallets(group, line);
    groups.push(group);
  }

  removeOrderLine(index) {
    this.alertCtrl
      .create({
        header: 'Xóa sản phẩm',
        //subHeader: '---',
        message: 'Bạn có chắc muốn xóa sản phẩm?',
        buttons: [
          {
            text: 'Không',
            role: 'cancel',
          },
          {
            text: 'Đồng ý xóa',
            cssClass: 'danger-btn',
            handler: () => {
              let groups = <FormArray>this.formGroup.controls.Lines;
              let Ids = [];
              Ids.push({
                Id: groups.controls[index]['controls'].Id.value,
              });
              this.receiptDetailProvider.delete(Ids).then((resp) => {
                groups.removeAt(index);
                this.calcTotalLine();
                this.env.publishEvent({
                  Code: this.pageConfig.pageName,
                });
                this.env.showMessage('Deleted!', 'success');
              });
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
  }

  setPallets(group, line) {
    group.controls.Pallets = new FormArray([]);
    if (line.Pallets?.length)
      line.Pallets.forEach((i) => {
        this.addPallet(i, group.controls.Pallets);
      });
  }

  addPallet(line, groups) {
    let searchInput$ = new Subject<string>();

    let group = this.formBuilder.group({
      _ItemSearchLoading: [false],
      _ItemSearchInput: [searchInput$],
      _ItemDataSource: [
        searchInput$.pipe(
          distinctUntilChanged(),
          tap(() => group.controls._ItemSearchLoading.setValue(true)),
          switchMap((term) =>
            this.locationProvider.search({ Take: 20, Skip: 0, Keyword: term }).pipe(
              catchError(() => of([])),
              tap(() => group.controls._ItemSearchLoading.setValue(false)),
            ),
          ),
        ),
      ],
      _Location: [line._Location],
      _LPN: [line._LPN],

      Id: [line.Id],
      Status: [line.Status],
      ReceivedDate: [line.ReceivedDate],
      IDUoM: new FormControl({ value: line.IDUoM, disabled: true }),
      UoMQuantityExpected: new FormControl({
        value: line.UoMQuantityExpected,
        disabled: true,
      }),
      QuantityAdjusted: [line.QuantityAdjusted],
      QuantityReceived: [line.QuantityReceived],
      QuantityRejected: [line.QuantityRejected],
      ToLocation: [line.ToLocation, Validators.required],
      ToLot: [line.ToLot],
      Cube: new FormControl({ value: line.Cube, disabled: true }),
      GrossWeight: new FormControl({
        value: line.GrossWeight,
        disabled: true,
      }),
      NetWeight: new FormControl({
        value: line.NetWeight,
        disabled: true,
      }),
      IsFullPallet: [line.IsFullPallet],
      Remark: [line.Remark],
    });
    groups.push(group);
  }

  saveOrder() {
    this.calcTotalLine();
    if (this.formGroup.controls.Lines.valid) super.saveChange2();
    else this.env.showMessage('Please recheck information highlighted in red above', 'warning');
  }

  calcTotalLine() {
    if (this.formGroup.controls.Lines) {
      this.item.Cube = 0;
      this.item.GrossWeight = 0;
      this.item.NetWeight = 0;

      this.formGroup.controls.Lines['controls'].forEach((g) => {
        let _UoMs = g.controls['_UoMs'].value;
        if (_UoMs) {
          let IDUoM = g.controls['IDUoM'].value;
          let UoMQuantityExpected = g.controls['UoMQuantityExpected'].value;
          let UoM = _UoMs.find((d) => d.Id == IDUoM);
          if (UoM) {
            g.controls['Cube'].setValue((UoM.Cube * UoMQuantityExpected) / 10.0 ** 6);
            g.controls['GrossWeight'].setValue((UoM.Weight * UoMQuantityExpected) / 1000);
            g.controls['NetWeight'].setValue((UoM.Weight * UoMQuantityExpected) / 1000);

            this.item.Cube += (UoM.Cube * UoMQuantityExpected) / 10.0 ** 6;
            this.item.GrossWeight += (UoM.Weight * UoMQuantityExpected) / 1000;
            this.item.NetWeight += (UoM.Weight * UoMQuantityExpected) / 1000;
          }
        }
      });
    }

    // this.item.TotalDiscount = this.formGroup.controls.Lines.value.map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0);
    // this.item.TotalAfterTax = this.formGroup.controls.Lines.value.map(x => x.IsPromotionItem ? 0 : (x.UoMPrice * x.UoMQuantityExpected - x.TotalDiscount)).reduce((a, b) => (+a) + (+b), 0)
  }

  savedChange(savedItem = null, form = this.formGroup) {
    super.savedChange(savedItem, form);
    this.item = savedItem;
    this.loadedData();
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  changedIDItem(group, e) {
    if (e) {
      group.controls._UoMs.setValue(e.UoMs);
      group.controls.IDItem.setValue(e.Id);
      group.controls.IDItem.markAsDirty();
      group.controls.IDUoM.setValue(e.PurchasingUoM);
      group.controls.IDUoM.markAsDirty();

      this.saveOrder();
    }
  }

  changeLottable5(group) {
    let itemValue = group.controls._Item.value;
    if (itemValue.Expiry && itemValue.ExpiryUnit && group.controls.Lottable5.value) {
      let lot5Value = new Date(group.controls.Lottable5.value);
      let lot6Value = null;
      if (itemValue.ExpiryUnit == 'Year')
        lot6Value = lib.dateFormat(lot5Value.setFullYear(lot5Value.getFullYear() + itemValue.Expiry));
      else if (itemValue.ExpiryUnit == 'Month')
        lot6Value = lib.dateFormat(lot5Value.setMonth(lot5Value.getMonth() + itemValue.Expiry));
      else if (itemValue.ExpiryUnit == 'Date')
        lot6Value = lib.dateFormat(lot5Value.setDate(lot5Value.getDate() + itemValue.Expiry));

      group.controls.Lottable6.setValue(lot6Value);
      group.controls.Lottable6.markAsDirty();
    }
    this.saveOrder();
  }

  async palletize() {
    const loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Xin vui lòng chờ xử lý dữ liệu trong giây lát...',
    });
    await loading.present().then(() => {
      return this.pageProvider.commonService
        .connect('POST', ApiSetting.apiDomain('WMS/Receipt/Palletize'), { Id: this.id })
        .toPromise()
        .then((resp) => {
          if(resp){
            this.item = resp;
            this.env.publishEvent({ Code: this.pageConfig.pageName });
            if (loading) loading.dismiss();
            this.loadedData();
          }
          else{
            this.env.showMessage('Cannot save, please try again', 'danger');
            if (loading) loading.dismiss();
          }
        })
        .catch((ex) => {
          if (ex.error && ex.error.ExceptionMessage) this.env.showMessage(ex.error.ExceptionMessage, 'danger');
          else this.env.showMessage('Cannot save, please try again', 'danger');
          console.log(ex);
          if (loading) loading.dismiss();
        });
    });
  }

  unpalletize() {
    return this.pageProvider.commonService
      .connect('POST', ApiSetting.apiDomain('WMS/Receipt/Unpalletize'), {
        Id: this.id,
      })
      .subscribe((resp) => {
        this.item = resp;
        this.env.publishEvent({ Code: this.pageConfig.pageName });
        this.loadedData();
      });
  }

  changedToLocation(group, e) {
    if (e) {
      group.controls.ToLocation.setValue(e.Id);
      this.receiptPalletizationProvider
        .save({
          Id: group.controls.Id.value,
          ToLocation: group.controls.ToLocation.value,
        })
        .then((resp) => {
          this.env.showMessage('Location updated', 'success');
          //group.controls.ToLocation.markAsPristine();

          group.markAsPristine();
        });
    }
  }

  createLabel(){
      this.nav('/lpn-label/'+this.formGroup.get('Id').value, "forward")
  }
  submitReceipt() {
    if (!this.pageConfig.canReceive) {
      return;
    }
    this.alertCtrl
      .create({
        header: 'Nhận phiếu nhập hàng',
        //subHeader: '---',
        message: 'Bạn có chắc muốn nhận phiếu nhập hàng đang chọn?',
        buttons: [
          {
            text: 'Không',
            role: 'cancel',
            handler: () => {
              //console.log('Không xóa');
            },
          },
          {
            text: 'Nhận',
            cssClass: 'danger-btn',
            handler: () => {
              let publishEventCode = this.pageConfig.pageName;
              let apiPath = {
                method: 'POST',
                url: function () {
                  return ApiSetting.apiDomain('WMS/Receipt/ReceiveReceipt/');
                },
              };

              if (this.submitAttempt == false) {
                this.submitAttempt = true;

                let postDTO = { Ids: [ this.formGroup.get('Id').value] };

                this.loadingController
                  .create({
                    cssClass: 'my-custom-class',
                    message: 'Please wait for a few moments',
                  })
                  .then((loading) => {
                    loading.present();
                    this.pageProvider.commonService
                      .connect(apiPath.method, apiPath.url(), postDTO)
                      .toPromise()
                      .then((savedItem: any) => {
                        if (publishEventCode) {
                          this.env.publishEvent({
                            Code: publishEventCode,
                          });
                        }
                        this.env.showMessage('Saving completed!', 'success');
                        this.submitAttempt = false;
                        if (loading) loading.dismiss();
                        this.refresh();
                      })
                      .catch((err) => {
                        this.submitAttempt = false;
                        if (loading) loading.dismiss();
                        //console.log(err);
                      });
                  });
              }
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
    }

  importClick() {
    this.importfile.nativeElement.value = '';
    this.importfile.nativeElement.click();
  }
  async uploadOrderLine(event) {
    if (event.target.files.length == 0) return;

    const loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait for a few moments',
    });
    await loading.present().then(() => {
      this.pageProvider['importDetail'](event.target.files[0], this.id)
        .then((resp: any) => {
          this.refresh();
          if (loading) loading.dismiss();

          if (resp.ErrorList && resp.ErrorList.length) {
            let message = '';
            for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
              if (i == 5) message += '<br> Còn nữa...';
              else {
                const e = resp.ErrorList[i];
                message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
              }

            this.alertCtrl
              .create({
                header: 'Có lỗi import dữ liệu',
                subHeader: 'Bạn có muốn xem lại các mục bị lỗi?',
                message: 'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
                cssClass: 'alert-text-left',
                buttons: [
                  {
                    text: 'Không',
                    role: 'cancel',
                    handler: () => {},
                  },
                  {
                    text: 'Có',
                    cssClass: 'success-btn',
                    handler: () => {
                      this.downloadURLContent(resp.FileUrl);
                    },
                  },
                ],
              })
              .then((alert) => {
                alert.present();
              });
          } else {
            this.env.publishEvent({
              Code: this.pageConfig.pageName,
            });
            this.env.showMessage('Import completed!', 'success');
          }
        })
        .catch((err) => {
          if (err.statusText == 'Conflict') {
            this.downloadURLContent(err._body);
          }
          if (loading) loading.dismiss();
        });
    });
  }

  async createInvoice() {
    this.env
      .showLoading(
        'Please wait for a few moments',
        this.pageProvider.commonService
          .connect('POST', 'WMS/Receipt/CreateInvoice/', {
            Ids: [this.item.Id],
          })
          .toPromise(),
      )
      .then((resp: any) => {
        this.env
          .showPrompt('Bạn có muốn mở hóa đơn vừa tạo?')
          .then((_) => {
            if (resp.length == 1) {
              this.nav('/ap-invoice/' + resp[0]);
            } else {
              this.nav('/ap-invoice/');
            }
          })
          .catch((_) => {});
      })
      .catch((err) => {
        this.env.showMessage(err);
      });
  }

  deliveryReceipt(){
      let ids = [this.formGroup.get('Id').value];
      this.pageProvider.commonService
      .connect('POST', 'WMS/Receipt/ChangeStatus/', {Ids: ids,Status:'Delivering'}).toPromise().then((resp) => {
        this.env.showMessage('Đã chuyển trạng thái thành công', 'success');
        this.refresh();
      });
  }
}
