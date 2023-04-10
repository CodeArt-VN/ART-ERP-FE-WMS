import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode'
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-serial-label',
    templateUrl: 'serial-label.page.html',
    styleUrls: ['serial-label.page.scss']
})
export class SerialLabelPage extends PageBase {
    lableConfig = {
        PageWidth: 110,
        QRCodeWidth: 206,
        CodeFontSize: 0,
        NameFontSize: 48,
        NameLineClamp: 2,
    };
    printMode = 'Ruy110';
    constructor(
        public pageProvider: WMS_ItemProvider,
        public modalController: ModalController,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
        public route: ActivatedRoute,
    ) {
        super();
        this.pageConfig.isShowFeature = true;
        //this.id = this.route.snapshot.paramMap.get('id');
        this.item = { FromNumber: '1', ToNumber: '100' };
    }

    preLoadData(event?: any): void {
        super.loadedData(event);
    }

    createPages() {
        if (this.submitAttempt) {
            this.env.showMessage('Xin vui lòng chờ xử lý.');
            return;
        }
        if (!this.item.FromNumber || !this.item.ToNumber) {
            this.env.showMessage('Xin vui lòng nhập số bắt đầu và số kết thúc để tạo mã.');
            return;
        }

        if (this.item.FromNumber > this.item.ToNumber) {
            let tNum = this.item.FromNumber;
            this.item.FromNumber = this.item.ToNumber;
            this.item.ToNumber = tNum;
        }
        this.pageConfig.showSpinner = true;
        this.submitAttempt = true;
        this.env.showLoading('Xin vui lòng chờ tạo nhãn in', () => this.loadLabel(this.item.FromNumber, this.item.ToNumber))
            .then(data => {
                this.items = data;
                this.pageConfig.showSpinner = false;
                this.submitAttempt = false;
                this.env.showMessage('Đã tạo ' + this.items.length + ' mã.');
            }).catch(err => {
                console.log(err);
            })

    }

    loadLabel(from, to) {
        return new Promise((resolve) => {
            let result = [];
            for (let i = from; i <= to; i++) {
                let label: any = {};
                label.Value = '' + i;
                QRCode.toDataURL(label.Value, { errorCorrectionLevel: 'H', version: 2, width: 500, scale: 20, type: 'image/webp' }, function (err, url) {
                    label.QRC = url;
                });

                result.push(label);
            }
            resolve(result);
        });
    }





}
