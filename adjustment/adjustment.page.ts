import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_AdjustmentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

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
    }
 
    preLoadData(event?: any): void {
        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;
        super.preLoadData(event);
        console.log(this.pageConfig.pageName)
    }
    
    approve(){
        if(this.selectedItems.some(d=>d.Status =="Done")){
            return;
        }
        let obj = {
            IDs : this.selectedItems.map(s=>s.Id)
        }
        this.env.showPrompt('Bạn chắc muốn duyệt ' + this.selectedItems.length + ' đang chọn?', null, 'Duyệt ' + this.selectedItems.length + ' dòng').then(_ => {
            this.pageProvider.commonService.connect( 'POST', 'WMS/adjustment/Approve', obj).toPromise()
                .then(_ => {
                    this.refresh()
                }).catch(err => {
                    this.env.showMessage('Không lưu được, xin vui lòng kiểm tra lại.');
                    console.log(err);
                });
        });

       
    }

    
    disapprove(){
        if(this.selectedItems.some(d=>d.Status =="Pending")){
            return;
        }
        let obj = {
            IDs : this.selectedItems.map(s=>s.Id)
        }
   
        this.env.showPrompt('Bạn chắc muốn duyệt ' + this.selectedItems.length + ' đang chọn?', null, 'Bỏ duyệt ' + this.selectedItems.length + ' dòng').then(_ => {
            this.pageProvider.commonService.connect( 'POST', 'WMS/adjustment/Disapprove', obj).toPromise()
                .then(_ => {
                    this.refresh()
                }).catch(err => {
                    this.env.showMessage('Không lưu được, xin vui lòng kiểm tra lại.');
                    console.log(err);
                });
        });
       
    }
}
