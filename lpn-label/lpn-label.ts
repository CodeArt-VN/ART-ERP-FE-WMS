import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_ItemProvider,
  WMS_LicencePlateNumberProvider,
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
    standalone: false
})
export class LPNLabelPage extends PageBase {
  statusList = [];
  forceCreate = false;
  fromLPN;
  toLPN;
  itemPalletsList = [];
  sheetList = [];
  fromLPNList = [];
  toLPNList = [];
  IDReceipt: number;
  IDItem;
  constructor(
    public pageProvider: WMS_LicencePlateNumberProvider,
    public receiptProvider: WMS_ReceiptProvider,
    public itemProvider: WMS_ItemProvider,
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
    this.pageConfig.pageName = 'lpn-label';

    this.id = this.route.snapshot.paramMap.get('id');
  }

  isShowPackingUoM = true;

  preLoadData(event) {
    this.query.Id = undefined;
    // Promise.all([this.env.getStatus('ReceiptStatus')]).then((values: any) => {
    //   this.statusList = values[0];
       super.preLoadData(event);
    // });
  }

  loadData(event?: any): void {
    this.loadedData(event);
  }
  loadedData(event) {
    super.loadedData(event);
    if (this.id > 0) {
      this.forceCreate = true;
      this.receiptProvider.getAnItem(this.id).then((data: any) => {
        this.IDReceipt = this.id;
        this.changedIDReceipt();
        this.receiptSearch();
      });
    } else {
      this.receiptSearch();
    }
    this.itemSearch();
    this.lpnFromSearch();
    this.lpnToSearch();
  }

  itemListLoading = false;
  itemList$;
  itemListInput$ = new Subject<string>();
  itemListSelected = [];
  itemSelected = null;
  itemSearch() {
    this.itemListLoading = false;
    this.itemList$ = concat(
      of(this.itemListSelected),
      this.itemListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.itemListLoading = true)),
        switchMap((term) =>
          this.itemProvider.search({ Take: 20, Skip: 0, Id: term ? term : '' }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.itemListLoading = false)),
          ),
        ),
      ),
    );
  }

  receiptList$;
  receiptListLoading = false;
  receiptListInput$ = new Subject<string>();
  receiptListSelected = [];
  receiptSearch() {
    this.receiptListLoading = false;
    this.receiptList$ = concat(
      of(this.receiptListSelected),
      this.receiptListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.receiptListLoading = true)),
        switchMap((term) =>
          this.receiptProvider
            .search({ IDBranch: this.env.selectedBranch, Take: 20, Skip: 0, Id: term ? term : '' })
            .pipe(
              catchError(() => of([])), // empty list on error
              tap(() => (this.receiptListLoading = false)),
            ),
        ),
      ),
    );
  }

  lpnFromListLoading = false;
  lpnFromList$;
  lpnFromListInput$ = new Subject<string>();
  lpnFromListSelected = [];
  lpnFromSelected = null;
  lpnFromSearch() {
    this.lpnFromListLoading = false;
    this.lpnFromList$ = concat(
      of(this.lpnFromListSelected),
      this.lpnFromListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.lpnFromListLoading = true)),
        switchMap((term) =>
          this.pageProvider.search({ Take: 20, Skip: 0, Id: term ? term : '' }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.lpnFromListLoading = false)),
          ),
        ),
      ),
    );
  }

  lpnToListLoading = false;
  lpnToList$;
  lpnToListInput$ = new Subject<string>();
  lpnToListSelected = [];
  lpnToSelected = null;
  lpnToSearch() {
    this.lpnToListLoading = false;
    this.lpnToList$ = concat(
      of(this.lpnToListSelected),
      this.lpnToListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.lpnToListLoading = true)),
        switchMap((term) =>
          this.pageProvider.search({ Take: 20, Skip: 0, Id: term ? term : '' }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.lpnToListLoading = false)),
          ),
        ),
      ),
    );
  }

  changedIDReceipt() {
    this.query.IDReceipt = this.IDReceipt;
    this.query.FromLPN = undefined;
    this.query.ToLPN = undefined;
    this.query.IDItem = undefined;
    this.fromLPN = null;
    this.toLPN = null;
    this.IDItem = null;
    if (this.IDReceipt > 0) {
      this.receiptProvider.getAnItem(this.IDReceipt).then((data: any) => {
        this.itemListSelected = data.Lines.map((m) => m._Item);
        this.itemSearch();
      });
    }
    this.GetLabel();
  }

  /* 
    * Change ASN 
    => load Item trong ASN bỏ vô Item List
    =>Load LPN trong ASN bỏ vô LPN List
    Reset Item, LPN

 *   Change Item 
    Load độc lập (KO có ID ASN): Gọi API GetLabel truyền IDItem => Load tất cả LPN của Item
    Load theo ASN : Gọi API GetLabel truyền IDItem , IDASN=> Load tất cả LPN của Item trong ASN đó
    Reset LPN
     => Load tất cả LPN của Item

  *  Change LPN 
    Load độc lập (KO có ID ASN, IDItem): Gọi API GetLabel truyền From LPN , ToLPN => Load tất cả LPN của Item
    Load theo ASN || ASN+Item : Gọi API GetLabel truyền IDItem , IDASN=> Load tất cả LPN của Item trong ASN đó

 */

  changedIDItem(i) {
    this.query.IDItem = this.IDItem;
    this.query.FromLPN = undefined;
    this.query.ToLPN = undefined;
    this.fromLPN = null;
    this.toLPN = null;
    this.GetLabel();
  }

  changedFromLPN(i) {
    this.query.FromLPN = this.fromLPN;
    if (this.toLPN > 0) {
      if (this.toLPN < this.fromLPN) {
        this.env.showMessage('ID from LPN > ID to LPN, vui lòng kiểm tra lại', 'warning');
      } else {
        this.GetLabel();
      }
    }
  }

  changedToLPN(i) {
    this.query.ToLPN = this.toLPN;
    if (this.fromLPN > 0 && this.fromLPN <  this.toLPN) {
      this.GetLabel();
    }
    else if(this.fromLPN > this.toLPN){
      this.env.showMessage('ID from LPN > ID to LPN, vui lòng kiểm tra lại', 'warning');
    }
  }

  GetLabel() {
    this.env
      .showLoading(
        'Please wait for a few moments',
        this.pageProvider.commonService.connect('GET', 'WMS/LicencePlateNumber/GetLabel', this.query).toPromise(),
      )
      .then((data: any) => {
        if (data) {
          this.itemPalletsList = data;
          if (this.itemPalletsList.length == 0) {
            this.env.showMessage('Không có pallet, vui lòng kiểm tra lại', 'warning');
          } else {
            this.lpnFromListSelected = this.lpnToListSelected = this.itemPalletsList.map((s) => {
              return {
                Id: s.Id,
                LocationName: s._Location.Name,
              };
            });
            this.lpnFromSearch();
            this.lpnToSearch();
            if (this.forceCreate) {
              this.createLPN();
              this.forceCreate = false;
            }
          }
        } else {
          this.itemPalletsList = [];
          this.env.showMessage('Không có pallet, vui lòng kiểm tra lại', 'warning');
        }
      })
      .catch((err) => {
        this.env.showMessage('Không có pallet, vui lòng kiểm tra lại', 'warning');
      });
  }

  createLPN() {
    this.sheets = [];
    this.loadASNLabel();
  }
  sheets: any[] = [];
  loadASNLabel() {
    for (let si = 0; si < this.itemPalletsList.length; si++) {
      const o = (this.sheets[si] = this.itemPalletsList[si]);
      // CTy gửi
      o.VendorName = o._Vendor?.Name;
      o.VendorLogoURL = o._Vendor?.LogoURL;
      o.VendorAddress = o._Vendor?.BillingAddress;
      o.VendorWorkPhone = o._Vendor?.WorkPhone;

      // Chủ hàng
      o.StorerName = o._Storer?.Name;
      o.StorerLogoURL = o._Storer?.LogoURL;
      o.StorerAddress = o._Storer?.BillingAddress;
      o.StorerWorkPhone = o._Storer?.WorkPhone;

      // Cty nhận
      o.BranchName = o._Branch?.Name;
      o.BranchLogoURL = o._Branch?.LogoURL;
      o.BranchAddress = o._Branch?.Address;
      o.BranchWorkPhone = o._Branch?.Phone;

      //Item Detail
      o.ItemName = o._Item.Name;
      o.ItemCode = o._Item.Code;
      o.ItemQuantity = o.UoMQuantityExpected;
      o.ItemUnit = o._Item.UoMs.find((u) => u.Id == o.IDUoM)?.Name;
      o.PurchasingUoMName = //item.UoMs.find((u) => u.Id == item.PurchasingUoM)?.Name;
        o.SalesUoMName = //item.UoMs.find((u) => u.Id == item.SalesUoM)?.Name;
        o.LocationID =
          o._Location.Id;
      o.LocationName = o._Location.Name;

      o.LPNID = o.Id;
      o.LPNCode = o.Code;

      o.Lot = o.Lot; //o.ToLot;

      o.IDPurchaseOrder = o.IDPurchaseOrder;
      o.IDReceipt = o.IDReceipt;

      // let itemLineInfo = receipt.Lines.find((l) => l.Id == i.ReceiptLine);
      let UoM = o._Item.UoMs.find((u) => u.Id == o.IDUoM);

      o.Cube = ((UoM.Cube * o.UoMQuantityExpected) / 10.0 ** 6).toFixed(3);
      o.GrossWeight = ((UoM.Weight * o.UoMQuantityExpected) / 1000).toFixed(3);
      o.NetWeight = ((UoM.Weight * o.UoMQuantityExpected) / 1000).toFixed(3);

      o.MalnufactureDate = lib.dateFormat(o.MalnufactureDate, 'dd/mm/yyyy');
      o.ExpiredDate = lib.dateFormat(o.ExpiredDate, 'dd/mm/yyyy');

      o.ArrivalDateText = lib.dateFormat(o.ArrivalDate, 'dd/mm/yy hh:MM');
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
    setTimeout(() => {
      this.calcPageBreak();
    }, 100);
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
     this.fromLPN = null;
     this.toLPN = null;
     this.IDReceipt = null;
     this.IDItem = null;
     super.refresh(event);
  }
}
