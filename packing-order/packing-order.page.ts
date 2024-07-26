import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_ConfigProvider, WMS_PackingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
    selector: 'app-packing-order',
    templateUrl: 'packing-order.page.html',
    styleUrls: ['packing-order.page.scss']
})
export class PackingOrderPage extends PageBase {
    statusList = [];
    constructor(
        public pageProvider: WMS_PackingProvider,
        public branchProvider: BRA_BranchProvider,
        public contactProvider: CRM_ContactProvider,
        public modalController: ModalController,
        public sysConfigProvider: SYS_ConfigProvider,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
    }
 
    preLoadData(event?: any): void {
        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;
        this.statusList = [
            { Code: 'Open', Name: 'Mở', Color: 'warning' },
            { Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
          ];

        super.preLoadData(event);
        console.log(this.pageConfig.pageName)
    }
    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event);
        this.items.forEach((i) => {
            i._Status = this.statusList.find((d) => d.Code == i.Status);
          });
    }
}
