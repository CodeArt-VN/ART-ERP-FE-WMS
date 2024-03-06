import { Component, ChangeDetectorRef } from '@angular/core';
import { LoadingController, AlertController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { WMS_ItemProvider, WMS_ItemUoMProvider } from 'src/app/services/static/services.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-item-uom-detail',
  templateUrl: './item-uom-detail.page.html',
  styleUrls: ['./item-uom-detail.page.scss'],
})
export class ItemUomDetailPage extends PageBase {
  formGroup: FormGroup;
  showAlterQty = true;
  baseUoM: any = {};

  constructor(
    public pageProvider: WMS_ItemUoMProvider,
    public itemProvider: WMS_ItemProvider,
    public env: EnvService,
    public route: ActivatedRoute,

    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    private config: NgSelectConfig,
  ) {
    super();
    this.id = this.route.snapshot.paramMap.get('id');
    this.query.IDItem = this.id;
    this.formGroup = formBuilder.group({
      Name: ['', Validators.required],
      Remark: [''],
      Sort: [''],

      Length: [''],
      Width: [''],
      Height: [''],

      Weight: [''],
      Barcode: [''],

      AlternativeQuantity: [''],
      BaseQuantity: [''],
    });
  }

  product = null;
  preLoadData(event = null) {
    this.pageConfig.canDelete = false;
    this.pageConfig.canAdd = false;

    this.itemProvider
      .getAnItem(this.id)
      .then((result) => {
        this.product = result;
        super.preLoadData(event);
      })
      .catch((e) => {
        console.log(e);
        super.loadedData(event);
      });
  }

  loadData(event) {
    this.pageConfig.isDetailPage = false;
    super.loadData(event);
  }

  loadedData(event = null) {
    this.pageConfig.isDetailPage = true;
    if (this.items.length && !this.item) {
      this.baseUoM = this.items.find((d) => d.IsBaseUoM);
      this.loadUoM(this.items[0].Id);
    }
  }

  loadUoM(id) {
    this.id = id;
    this.item = this.items.find((d) => d.Id == this.id);
    this.showAlterQty = this.showAlterQty ? true : this.item.AlternativeQuantity != 1;
    super.loadedData();
  }

  changeUoM(ev) {
    this.loadUoM(ev.detail.value);
  }

  scanning = false;
  scanQRCode() {
    if (!Capacitor.isPluginAvailable('BarcodeScanner') || Capacitor.platform == 'web') {
      this.env.showTranslateMessage('This function is only available on phone', 'warning');
      return;
    }
    BarcodeScanner.prepare().then(() => {
      BarcodeScanner.checkPermission({ force: true })
        .then((status) => {
          if (status.granted) {
            this.scanning = true;
            document.querySelector('ion-app').style.backgroundColor = 'transparent';
            BarcodeScanner.startScan().then((result) => {
              let close: any = document.querySelector('#closeCamera');
              if (!result.hasContent) {
                close.click();
              } else {
                this.formGroup.controls['Barcode'].setValue(result.content);

                setTimeout(() => {
                  if (close) {
                    close.click();
                  }
                  this.saveChange();
                }, 0);
              }
            });
          } else {
            this.alertCtrl
              .create({
                header: 'Quét QR code',
                //subHeader: '---',
                message: 'Bạn chưa cho phép sử dụng camera, Xin vui lòng cấp quyền cho ứng dụng.',
                buttons: [
                  {
                    text: 'Không',
                    role: 'cancel',
                    handler: () => {},
                  },
                  {
                    text: 'Đồng ý',
                    cssClass: 'danger-btn',
                    handler: () => {
                      BarcodeScanner.openAppSettings();
                    },
                  },
                ],
              })
              .then((alert) => {
                alert.present();
              });
          }
        })
        .catch((e: any) => console.log('Error is', e));
    });
  }

  closeCamera() {
    if (!Capacitor.isPluginAvailable('BarcodeScanner') || Capacitor.platform == 'web') {
      return;
    }
    this.scanning = false;
    this.lighting = false;
    this.useFrontCamera = false;
    document.querySelector('ion-app').style.backgroundColor = '';
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
  }

  lighting = false;
  lightCamera() {
    // if (this.lighting) {
    //     this.qrScanner.disableLight().then(() => {
    //         this.lighting = false;
    //     });
    // }
    // else {
    //     this.qrScanner.enableLight().then(() => {
    //         this.lighting = true;
    //     });
    // }
  }

  useFrontCamera = false;
  reversalCamera() {
    // if (this.useFrontCamera) {
    //     this.qrScanner.useBackCamera().then(() => {
    //         this.useFrontCamera = false;
    //     });
    // }
    // else {
    //     this.qrScanner.useFrontCamera().then(() => {
    //         this.useFrontCamera = true;
    //     });
    // }
  }

  ionViewWillLeave() {
    this.closeCamera();
  }

  disableProduct() {
    this.submitAttempt = true;
    this.product.IsDisabled = !this.product.IsDisabled;
    let prds = [];
    prds.push(this.product);
    this.itemProvider.disable(prds, this.product.IsDisabled).then((resp) => {
      this.env.showTranslateMessage('Changes saved', 'success');
      this.submitAttempt = false;
    });
  }

  saveProduct() {
    this.submitAttempt = true;
    this.itemProvider
      .save({
        Id: this.product.Id,
        TI: this.product.TI,
        HI: this.product.HI,
      })
      .then((resp) => {
        this.env.showTranslateMessage('Changes saved', 'success');
        this.submitAttempt = false;
      });
  }
}
