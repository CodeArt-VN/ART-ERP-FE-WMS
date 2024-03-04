import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_AdjustmentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-adjustment',
    templateUrl: 'adjustment.page.html',
    styleUrls: ['adjustment.page.scss']
})
export class AdjustmentPage extends PageBase {
    constructor(
        public pageProvider: WMS_AdjustmentProvider,
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
        this.pageConfig.canEdit = true;
        this.pageConfig.canApprove = true;
        this.query.Type == 'Warehouse'; //For export branch query
    }

    approver(){
        let obj = {
            IDs : this.selectedItems.map(s=>s.Id)
        }
        this.pageProvider.commonService.connect( 'POST', 'WMS/adjustment/PostListDetail', obj).toPromise().then(result=>{
            this.refresh();
        })
    }
}
