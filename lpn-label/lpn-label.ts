import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_LocationProvider,
  WMS_ReceiptDetailProvider,
  WMS_ReceiptProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import QRCode from 'qrcode';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-lpn-label',
  templateUrl: 'lpn-label.page.html',
  styleUrls: ['lpn-label.page.scss'],
})
export class LPNLabelPage extends PageBase {
  statusList = [];
  branch;
  storer;
  vendor;
  customer;

  fromLPNSelected;
  fromIdLPN;
  toLPNSelected;
  toIdLPN;
  IDASN;
  itemSelected;
  itemPalletsList = [];
  sheetList = [];
  receiptLines = [];

  constructor(
    public pageProvider: WMS_ReceiptProvider,
    public receiptDetailProvider: WMS_ReceiptDetailProvider,
    public locationProvider: WMS_LocationProvider,
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public route: ActivatedRoute,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    // this.pageConfig.isDetailPage = true;
    this.pageConfig.pageName = 'lpn-label';
    this.id = this.route.snapshot.paramMap.get('id');
  }

  isShowPackingUoM = true;

  preLoadData(event) {
    // console.log('IDASN : '  + this.IDASN)
    // this.IDASN = this.route.snapshot.paramMap.get('IDASN');
    // if (this.route.snapshot.queryParams.IDASN) {
    //   this.IDASN = parseInt(this.route.snapshot.queryParams.IDASN);
    // }
    if(this.id > 0){
      this.pageConfig.isDetailPage = true;
    }
    Promise.all([this.env.getStatus('ReceiptStatus')]).then((values: any) => {
      this.statusList = values[0];
      this.asnSearch();
      super.preLoadData(event);
    });
  }

  loadedData(event) {
    super.loadedData(event);
    if (window.location.host.indexOf('artlogistics') > -1) {
      this.isShowPackingUoM = false;
    }

    if (this.id > 0 ){
      this.changedIDASN(this.item);
    }
  }

  asnList$;
  asnListLoading = false;
  asnListInput$ = new Subject<string>();
  asnListSelected = [];
  asnSelected = null;
  asnSearch() {
    this.asnListLoading = false;
    this.asnList$ = concat(
      of(this.asnListSelected),
      this.asnListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.asnListLoading = true)),
        switchMap((term) =>
          this.pageProvider.search({ Take: 20, Skip: 0, Id: term ? term : '' }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.asnListLoading = false)),
          ),
        ),
      ),
    );
  }

  changedIDASN(i) {
    if (i) {
      this.pageProvider.getAnItem(i.Id).then((data: any) => {
        this.item = data;
        this.asnSelected = data.Id;
        this.receiptLines = data.Lines;

        if (data && this.asnListSelected.findIndex((d) => d.Id == data.Id) == -1) {
          this.asnListSelected.push(this.item);
          this.asnListSelected = [...this.asnListSelected];
          this.asnSearch();
        }

        this.itemSelected = null;
        this.itemPalletsList = [];
        this.fromIdLPN = null;
        this.toIdLPN = null;
        this.fromLPNSelected = null;
        this.toLPNSelected = null;
        this.sheets = [];

        if (this.receiptLines.length != 0) {
          this.asnSelected = data.Id;
          this.id = this.asnSelected;

          let newURL = `#/${this.pageConfig.pageName}/${this.id}`; // '#'+this.pageConfig.pageName + '/' + this.id;
          history.pushState({}, null, newURL);
        }
      });
    } else {
      this.id = null;
      let newURL = `#/${this.pageConfig.pageName}`; // '#'+this.pageConfig.pageName + '/' + this.id;
      history.pushState({}, null, newURL);
    }
  }

  changedIDItem(i) {
    if (i?.Pallets.length != 0) {
      this.itemPalletsList = i.Pallets;
    } else {
      this.itemPalletsList = [];
      this.env.showTranslateMessage('Không có pallet, vui lòng kiểm tra lại', 'warning');
    }
  }

  changedFromLPN(i) {
    this.fromIdLPN;
    this.fromLPNSelected = i;
  }

  changedToLPN(i) {
    this.toIdLPN;
    this.toLPNSelected = i;
  }

  createLPN() {
    this.sheets = [];

    if (this.fromLPNSelected && this.toLPNSelected) {
      let indexFrom = this.itemPalletsList.indexOf(this.fromLPNSelected);
      let indexTo = this.itemPalletsList.indexOf(this.toLPNSelected);

      this.sheetList = this.itemPalletsList.slice(indexFrom, indexTo + 1);
      console.log(this.sheetList);
      this.sheetList.forEach((i) => {
        this.loadASNLabel(this.item, i, this.itemSelected);
      });
    } else {
      this.env.showTranslateMessage('Vui lòng chọn số LPN', 'warning');
      return;
    }
  }

  selectedASNID = 0;
  sheets: any[] = [];
  loadASNLabel(asn, i, item) {
    this.submitAttempt = true;

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Đang tạo nhãn LPN...',
      })
      .then((loading) => {
        loading.present();

        Promise.all([i])
          .then((resp) => {
            this.sheets.push(resp[0]);
            if (this.sheets.length == this.sheetList.length) {
              this.branchProvider.getAnItem(asn.IDBranch).then((branch: any) => {
                this.branch = branch; // Thông tin nhận

                this.contactProvider.getAnItem(asn.IDStorer).then((storer: any) => {
                  this.storer = storer; // Chủ hàng

                  this.contactProvider.getAnItem(asn.IDVendor).then((vendor: any) => {
                    this.vendor = vendor; // Thông tin gửi

                    for (let si = 0; si < this.sheets.length; si++) {
                      const o = this.sheets[si];

                      // CTy gửi
                      o.VendorName = this.vendor?.Name;
                      o.VendorLogoURL = this.vendor?.LogoURL;
                      o.VendorAddress = this.vendor?.BillingAddress;
                      o.VendorWorkPhone = this.vendor?.WorkPhone;

                      // Chủ hàng
                      o.StorerName = this.storer?.Name;
                      o.StorerLogoURL = this.storer?.LogoURL;
                      o.StorerAddress = this.storer?.BillingAddress;
                      o.StorerWorkPhone = this.storer?.WorkPhone;

                      // Cty nhận
                      o.BranchName = this.branch?.Name;
                      o.BranchLogoURL = this.branch?.LogoURL;
                      o.BranchAddress = this.branch?.Address;
                      o.BranchWorkPhone = this.branch?.Phone;

                      //Item Detail
                      o.ItemName = item.Name;
                      o.ItemCode = item.Code;
                      o.ItemQuantity = o.UoMQuantityExpected;
                      o.ItemUnit = item.UoMs.find((u) => u.Id == o.IDUoM).Name;
                      o.PurchasingUoMName = item.UoMs.find((u) => u.Id == item.PurchasingUoM)?.Name;
                      o.SalesUoMName = item.UoMs.find((u) => u.Id == item.SalesUoM)?.Name;

                      o.LocationID = o._Location.Id;
                      o.LocationName = o._Location.Name;

                      o.LPNID = o._LPN.Id;
                      o.LPNCode = o._LPN.Code;

                      o.LOT = o.ToLot;

                      o.IDPurchaseOrder = this.item.IDPurchaseOrder;
                      o.ASNId = this.item.Id;

                      let itemLineInfo = asn.Lines.find((l) => l.Id == i.ReceiptLine);
                      let UoM = item.UoMs.find((u) => u.Id == o.IDUoM);

                      o.Cube = ((UoM.Cube * o.UoMQuantityExpected) / 10.0 ** 6).toFixed(3);
                      o.GrossWeight = ((UoM.Weight * o.UoMQuantityExpected) / 1000).toFixed(3);
                      o.NetWeight = ((UoM.Weight * o.UoMQuantityExpected) / 1000).toFixed(3);

                      o.MalnufactureDate = lib.dateFormat(itemLineInfo.Lottable5, 'dd/mm/yyyy');
                      o.ExpiredDate = lib.dateFormat(itemLineInfo.Lottable6, 'dd/mm/yyyy');

                      o.ArrivalDateText = lib.dateFormat(this.item.ArrivalDate, 'dd/mm/yy hh:MM');
                      o.StatusText = o.Status;
                      QRCode.toDataURL(
                        'PO:' + o.IDPurchaseOrder,
                        {
                          errorCorrectionLevel: 'H',
                          version: 2,
                          width: 500,
                          scale: 20,
                          type: 'image/webp',
                        },
                        function (err, url) {
                          o.QRC = url;
                        },
                      );
                    }
                  });
                });
              });
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
            setTimeout(() => {
              this.calcPageBreak();
            }, 100);
          })
          .catch((err) => {
            console.log(err);
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showTranslateMessage('Cannot create sale order. Please try again.', 'danger');
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          });
      });
  }

  printMode = 'A5';
  changePrintMode() {
    this.printMode = this.printMode == 'A4' ? 'A5' : 'A4';
    this.calcPageBreak();
  }

  calcPageBreak() {
    let sheets = document.querySelectorAll('.sheet');

    var e = document.createElement('div');
    e.style.position = 'absolute';
    e.style.width = '147mm';
    document.body.appendChild(e);
    var rect = e.getBoundingClientRect();
    document.body.removeChild(e);
    let A5Height = rect.width;

    if (this.printMode == 'A5') {
      sheets.forEach((s: any) => {
        s.style.pageBreakAfter = 'always';
        s.style.borderBottom = 'none';
        s.style.minHeight = '147mm';

        if (s.clientHeight > A5Height * 6 + 20) {
          s.style.minHeight = '1180mm';
        } else if (s.clientHeight > A5Height * 4 + 20) {
          s.style.minHeight = '885mm';
        } else if (s.clientHeight > A5Height * 2 + 20) {
          s.style.minHeight = '590mm';
        } else if (s.clientHeight > A5Height + 20) {
          s.style.minHeight = '295mm';
        }
      });
    } else {
      sheets.forEach((s: any) => {
        s.style.breakAfter = 'unset';
        s.style.minHeight = '148mm';
        //s.style.borderBottom = 'dashed 1px #ccc';

        if (s.clientHeight > A5Height * 6 + 20) {
          s.style.minHeight = '1180mm';
          s.style.pageBreakBefore = 'always';
          s.style.pageBreakAfter = 'always';
        } else if (s.clientHeight > A5Height * 4 + 20) {
          s.style.minHeight = '885mm';
          s.style.pageBreakBefore = 'always';
          s.style.pageBreakAfter = 'always';
        } else if (s.clientHeight > A5Height * 2 + 20) {
          s.style.minHeight = '590mm';
          s.style.pageBreakBefore = 'always';
          s.style.pageBreakAfter = 'always';
        } else if (s.clientHeight > A5Height + 20) {
          s.style.minHeight = '295mm';
          s.style.pageBreakBefore = 'always';
          s.style.pageBreakAfter = 'always';
        }
      });
    }
  }

  DocSo3ChuSo(baso) {
    var ChuSo = new Array(' không ', ' một ', ' hai ', ' ba ', ' bốn ', ' năm ', ' sáu ', ' bảy ', ' tám ', ' chín ');

    var tram;
    var chuc;
    var donvi;
    var KetQua = '';
    tram = parseInt(baso / 100 + '');
    chuc = parseInt((baso % 100) / 10 + '');
    donvi = baso % 10;
    if (tram == 0 && chuc == 0 && donvi == 0) return '';
    if (tram != 0) {
      KetQua += ChuSo[tram] + ' trăm ';
      if (chuc == 0 && donvi != 0) KetQua += ' linh ';
    }
    if (chuc != 0 && chuc != 1) {
      KetQua += ChuSo[chuc] + ' mươi';
      if (chuc == 0 && donvi != 0) KetQua = KetQua + ' linh ';
    }
    if (chuc == 1) KetQua += ' mười ';
    switch (donvi) {
      case 1:
        if (chuc != 0 && chuc != 1) {
          KetQua += ' mốt ';
        } else {
          KetQua += ChuSo[donvi];
        }
        break;
      case 5:
        if (chuc == 0) {
          KetQua += ChuSo[donvi];
        } else {
          KetQua += ' lăm ';
        }
        break;
      default:
        if (donvi != 0) {
          KetQua += ChuSo[donvi];
        }
        break;
    }
    return KetQua;
  }

  DocTienBangChu(SoTien) {
    var Tien = new Array('', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ');

    var lan = 0;
    var i = 0;
    var so = 0;
    var KetQua = '';
    var tmp = '';
    var ViTri = new Array();
    if (SoTien < 0) return 'Số tiền âm !';
    if (SoTien == 0) return 'Không đồng !';
    if (SoTien > 0) {
      so = SoTien;
    } else {
      so = -SoTien;
    }
    if (SoTien > 8999999999999999) {
      //SoTien = 0;
      return 'Số quá lớn!';
    }
    ViTri[5] = Math.floor(so / 1000000000000000);
    if (isNaN(ViTri[5])) ViTri[5] = '0';
    so = so - parseFloat(ViTri[5].toString()) * 1000000000000000;
    ViTri[4] = Math.floor(so / 1000000000000);
    if (isNaN(ViTri[4])) ViTri[4] = '0';
    so = so - parseFloat(ViTri[4].toString()) * 1000000000000;
    ViTri[3] = Math.floor(so / 1000000000);
    if (isNaN(ViTri[3])) ViTri[3] = '0';
    so = so - parseFloat(ViTri[3].toString()) * 1000000000;
    ViTri[2] = parseInt(so / 1000000 + '');
    if (isNaN(ViTri[2])) ViTri[2] = '0';
    ViTri[1] = parseInt((so % 1000000) / 1000 + '');
    if (isNaN(ViTri[1])) ViTri[1] = '0';
    ViTri[0] = parseInt((so % 1000) + '');
    if (isNaN(ViTri[0])) ViTri[0] = '0';
    if (ViTri[5] > 0) {
      lan = 5;
    } else if (ViTri[4] > 0) {
      lan = 4;
    } else if (ViTri[3] > 0) {
      lan = 3;
    } else if (ViTri[2] > 0) {
      lan = 2;
    } else if (ViTri[1] > 0) {
      lan = 1;
    } else {
      lan = 0;
    }
    for (i = lan; i >= 0; i--) {
      tmp = this.DocSo3ChuSo(ViTri[i]);
      KetQua += tmp;
      if (ViTri[i] > 0) KetQua += Tien[i];
      if (i > 0 && tmp.length > 0) KetQua += ','; //&& (!string.IsNullOrEmpty(tmp))
    }
    if (KetQua.substring(KetQua.length - 1) == ',') {
      KetQua = KetQua.substring(0, KetQua.length - 1);
    }
    KetQua = KetQua.substring(1, 2).toUpperCase() + KetQua.substring(2) + ' đồng';
    return KetQua; //.substring(0, 1);//.toUpperCase();// + KetQua.substring(1);
  }

  toggleDateFilter() {
    // ["104, 105, 109, 113, 114"]; // đã duyệt/đã giao việc/đã giao hàng/done/còn nợ

    this.query.IDStatus = this.query.IDStatus == '[104, 105, 109, 113, 114]' ? '' : '[104, 105, 109, 113, 114]';
    if (this.query.IDStatus == '[104, 105, 109, 113, 114]') {
      this.query.OrderDate = '';
    } else {
      let today = new Date();
      this.query.OrderDate = lib.dateFormat(today.setDate(today.getDate()), 'yyyy-mm-dd');
    }

    this.refresh();
  }

  refresh(event?) {
    this.sheets = [];
    this.fromIdLPN = null;
    this.toIdLPN = null;
    this.fromLPNSelected = null;
    this.toLPNSelected = null;
    super.refresh(event);
  }
}
