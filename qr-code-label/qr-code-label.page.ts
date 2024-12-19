import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_ItemGroupProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import QRCode from 'qrcode';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-qr-code-label',
    templateUrl: 'qr-code-label.page.html',
    styleUrls: ['qr-code-label.page.scss'],
    standalone: false
})
export class QRCodeLabelPage extends PageBase {
  lableConfig = {
    PageWidth: 96,
    QRCodeWidth: 206,
    CodeFontSize: 15,
    NameFontSize: 9,
    NameLineClamp: 2,
    IsOneColumn: false, // false = 2 col
    maxQRCodeWidth: 250,
  };

  printMode = 'Ruy96';
  constructor(
    //public pageProvider: WMS_QRCodeLabelProvider,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public router: Router,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
  }

  preLoadData(event?: any): void {
    this.route.queryParams.subscribe((params) => {
      this.items = this.router.getCurrentNavigation().extras.state;
      this.loadedData(event);
    });
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    if ( this.items?.length>0) {
      this.items.forEach((i) => {
        QRCode.toDataURL(
          i.qrCode+'',
          {
            errorCorrectionLevel: 'M',
            version: 6,
            width: this.lableConfig.IsOneColumn ? 1000 : 500,
            scale: 20,
            type: 'image/webp',
          },
          function (err, url) {
            i._qrCode = url;
          },
        );
      });

      this.pageConfig.showSpinner = false;
    }
    console.log(this.items);
  }

  changeIsOneColumn() {
    this.lableConfig.maxQRCodeWidth = this.lableConfig.IsOneColumn ? 500 : 250;
    if (this.lableConfig.QRCodeWidth > this.lableConfig.maxQRCodeWidth)
      this.lableConfig.QRCodeWidth = this.lableConfig.maxQRCodeWidth;
    this.loadedData();
  }
}
