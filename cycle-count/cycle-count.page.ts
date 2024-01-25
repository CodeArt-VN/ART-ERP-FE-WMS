import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_CycleCountProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-cycle-count',
    templateUrl: 'cycle-count.page.html',
    styleUrls: ['cycle-count.page.scss']
})
export class CycleCountPage extends PageBase {
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
    ) {
        super();
        this.pageConfig.canDelete = true;
        this.query.Type == 'Warehouse'; //For export branch query
    }

}
