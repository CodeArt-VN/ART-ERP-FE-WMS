import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_ConfigProvider, WMS_ShippingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
    selector: 'app-shipping',
    templateUrl: 'shipping.page.html',
    styleUrls: ['shipping.page.scss']
})
export class ShippingPage extends PageBase {
    statusList = [];
    constructor(
        public pageProvider: WMS_ShippingProvider,
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
    
        this.statusList = [
            { Code: 'New', Name: 'Mới', Color: 'warning' },
            { Code: 'Open', Name: 'Mở', Color: 'primary' },
            { Code: 'Allocated', Name: 'Đã chỉ định', Color: 'secondary' },
            { Code: 'ShippingAllocated', Name: 'Đã phân tài', Color: 'secondary' },
            { Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
          ];

        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;
       
        super.preLoadData(event);
    }
    loadedData(event?: any) {
        super.loadedData(event);
        console.log(this.statusList);
        this.items.forEach((i) => {
          i._Status = this.statusList.find((d) => d.Code == i.Status);
        });
      }
    approve(){
        if(this.selectedItems.some(d=>d.Status =="Done")){
            return;
        }
        let obj = {
            IDs : this.selectedItems.map(s=>s.Id)
        }
        this.env.showPrompt2({code:'Bạn có chắc muốn duyệt {{value}} đang chọn?',value:{value:this.selectedItems.length}},null,{code:'Duyệt {{value1}} dòng?',value:{value:this.selectedItems.length}}).then(_ => {
            this.pageProvider.commonService.connect( 'POST', 'WMS/shipping/Approve', obj).toPromise()
                .then(_ => {
                    this.refresh()
                }).catch(err => {
                    this.env.showTranslateMessage('Không lưu được, xin vui lòng kiểm tra lại.');
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
   
        this.env.showPrompt2({code:'Bạn có chắc muốn bỏ duyệt {{value}} đang chọn?',value:{value:this.selectedItems.length}},null,{code:'Bỏ duyệt {{value1}} dòng?',value:{value:this.selectedItems.length}}).then(_ => {
            this.pageProvider.commonService.connect( 'POST', 'WMS/shipping/Disapprove', obj).toPromise()
                .then(_ => {
                    this.refresh()
                }).catch(err => {
                    this.env.showTranslateMessage('Không lưu được, xin vui lòng kiểm tra lại.');
                });
        });
       
    }
}
