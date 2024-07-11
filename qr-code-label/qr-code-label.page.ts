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
})
export class QRCodeLabelPage extends PageBase {
  lableConfig = {
    PageWidth: 96,
    QRCodeWidth: 206,
    CodeFontSize: 15,
    NameFontSize: 9,
    NameLineClamp: 2,
    NameColClamp: true, // true = 2 col
  };
  @Input() data;
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
   
    this.loadedData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    if(!this.data){
      this.route.queryParams.subscribe((params) => {  
        this.data = this.router.getCurrentNavigation().extras.state;
      });
    }
    if(this.data){
      this.createPages();
    }
  }

  createPages() {
    if (this.submitAttempt) {
      this.env.showMessage('Xin vui lòng chờ xử lý.');
      return;
    }

    this.pageConfig.showSpinner = true;
    this.submitAttempt = true;
    this.env
      .showLoading('Xin vui lòng chờ tạo nhãn in', () => this.loadLabel(this.data))
      .then((data) => {
        this.items = data;
        this.pageConfig.showSpinner = false;
        this.submitAttempt = false;
        this.env.showMessage('Đã tạo ' + this.items.length + ' mã.');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  loadLabel(QRCodeLabels) {
    return new Promise((resolve) => {
      let result = [];
      QRCodeLabels.forEach((i) => {
        let label: any = {};
        label.Value = '' + (i.Barcode ? i.Barcode : i.Id);
        label.data = i;
        QRCode.toDataURL(
          label.Value,
          {
            errorCorrectionLevel: 'H',
            version: 2,
            width: 500,
            scale: 20,
            type: 'image/webp',
          },
          function (err, url) {
            label.QRC = url;
          },
        );

        result.push(label);
      });

      resolve(result);
    });
  }

 
}
