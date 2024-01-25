import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SHIP_ShipmentProvider, WMS_CycleCountProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode'
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-cycle-count-note',
    templateUrl: 'cycle-count-note.page.html',
    styleUrls: ['cycle-count-note.page.scss']
})
export class CycleCountNotePage extends PageBase {
    branchList = [];

    constructor(
        public pageProvider: WMS_CycleCountProvider,
        public branchProvider: BRA_BranchProvider,
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
        this.id = this.route.snapshot.paramMap.get('id');
        //let today = new Date;
        //this.query.CycleCountDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        this.query.IDStatus = '[301]';
    }

    loadData(event) {
        this.pageProvider.apiPath.getList.url = function () { return ApiSetting.apiDomain("WMS/CycleCount/List") };
        super.loadData(event);
    }

    loadedData(event) {
        this.items.forEach(i => {
           // i.CycleCountDateText = lib.dateFormat(i.CycleCountDate, 'dd/mm/yy hh:MM');
           // i.CycleCountTimeText = lib.dateFormat(i.CycleCountDate, 'hh:MM');
        });
        super.loadedData(event);

        if (this.id) {
            this.loadCycleCountNote({ Id: this.id });
        }
    }

    selectedCycleCount = 0;
    sheets: any = [];
    loadCycleCountNote(i) {
        this.selectedCycleCount = i.Id;
        this.id = this.selectedCycleCount;

        let newURL = window.location.hash.substring(0, 18) + '/' + this.id;
        history.pushState({}, null, newURL);

        // if(!this.query.CycleCountDate){
        //     let today = new Date;
        //     this.query.CycleCountDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        // }

        let docQuery: any = {
            //CycleCountDate: this.query.CycleCountDate,
        };

        if (i.Id) {
            docQuery.Id = i.Id;
        }

        this.submitAttempt = true;

        let apiPath = {
            method: "GET",
            url: function () { return ApiSetting.apiDomain("WMS/CycleCount/CycleCountDetailList/") }
        };

        this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Đang tạo phiếu kiểm kê...'
        }).then(loading => {
            loading.present();

            this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), docQuery).toPromise()
                .then((resp: any) => {
                    this.sheets = resp;

                    for (let si = 0; si < this.sheets.length; si++) {
                        const s = this.sheets[si];
                        s.CycleCountDateText = lib.dateFormat(s.CountDate, 'dd/mm/yy');
                    };

                    this.submitAttempt = false;
                    if (loading) loading.dismiss();
                    setTimeout(() => {
                        this.calcPageBreak();
                    }, 100);
                })
                .catch(err => {
                    console.log(err);
                    if (err.message != null) {
                        this.env.showMessage(err.message, 'danger');
                    }
                    else {
                        this.env.showTranslateMessage('erp.app.pages.wms.cycle-count.message.can-not-create-picking-list','danger');
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

        var e = document.createElement("div");
        e.style.position = "absolute";
        e.style.width = "147mm";
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
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                }
            });
        }
        else {
            sheets.forEach((s: any) => {
                s.style.breakAfter = 'unset';
                s.style.minHeight = '148mm';
                s.style.borderBottom = 'dashed 1px #ccc';

                if (s.clientHeight > A5Height * 6 + 20) {
                    s.style.minHeight = '1180mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
            });
        }
    }

    toggleDateFilter() {
        this.query.IDStatus = this.query.IDStatus == '[301]' ? '' : '[301]';
        if (this.query.IDStatus == '[301]') {
            this.query.CountDate = '';
        }
        else {
            let today = new Date;
            this.query.CountDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        }

        this.refresh();
    }


}
