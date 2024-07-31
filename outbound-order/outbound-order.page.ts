import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_ConfigProvider, WMS_OutboundOrderProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
    selector: 'app-outbound-order',
    templateUrl: 'outbound-order.page.html',
    styleUrls: ['outbound-order.page.scss']
})
export class OutboundOrderPage extends PageBase {
    statusList = []
    storerList = [];
    branchList = [];
    constructor(
        public pageProvider: WMS_OutboundOrderProvider,
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
            { Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
            {Code :'Merged', Name:'Đã gộp', Color: 'primary'}
          ];

        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;
        super.preLoadData(event);
        console.log(this.pageConfig.pageName)
    }
    
    loadedData(event?: any) {
        super.loadedData(event);
        console.log(this.statusList);
        this.items.forEach((i) => {
          i._Status = this.statusList.find((d) => d.Code == i.Status);
        });
      }
    mergeOrders(){
        if(this.selectedItems.every(i => !(i.IDWarehouse === (this.selectedItems[0].IDWarehouse))
        || !(i.IDStorer === (this.selectedItems[0].IDStorer)) 
        || this.selectedItems.some(s =>s.Status == "Open" || s.Status == "Closed" || s.Status == "Merged"))){
            this.env.showTranslateMessage(
                'Your selected orders cannot be combined. Please select new order',
                'warning',
              );
              return;
        }  
      
          let obj = {
            Ids: [],
            IDStorer:  this.selectedItems[0].IDStorer,
            IDWarehouse: this.selectedItems[0].IDWarehouse,
            PackingTag:  this.selectedItems[0].PackingTag,
          };
          if (this.selectedItems) {
            obj.Ids  = this.selectedItems.map(m => m.Id);
          }
          let publishEventCode = this.pageConfig.pageName;
          this.env.showPrompt('Bạn chắc muốn gộp ' + this.selectedItems.length + ' đang chọn?', null, 'Gộp ' + this.selectedItems.length  + ' dòng').then(_ => {
            this.submitAttempt = true;
            this.env.showLoading('Xin vui lòng chờ trong giây lát...', this.pageProvider.commonService.connect('POST', 'WMS/OutboundOrder/MergeOrders/', obj).toPromise())
                .then((savedItem:any) => {
                    if (publishEventCode) {
                        this.env.publishEvent({ Code: publishEventCode });
                      }
                    this.env.showTranslateMessage('Saving completed', 'success');
                    this.submitAttempt = false;

                }).catch(err => {
                    this.env.showMessage('Không gộp được, xin vui lòng kiểm tra lại.');
                this.submitAttempt = false;
                console.log(err);
                });
        });
    }

    approve(){
        if(this.selectedItems.some(d=>d.Status =="Done")){
            return;
        }
        let obj = {
            IDs : this.selectedItems.map(s=>s.Id)
        }
        this.env.showPrompt('Bạn chắc muốn duyệt ' + this.selectedItems.length + ' đang chọn?', null, 'Duyệt ' + this.selectedItems.length + ' dòng').then(_ => {
            this.pageProvider.commonService.connect( 'POST', 'WMS/outbound-order/Approve', obj).toPromise()
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
            this.pageProvider.commonService.connect( 'POST', 'WMS/outbound-order/Disapprove', obj).toPromise()
                .then(_ => {
                    this.refresh()
                }).catch(err => {
                    this.env.showMessage('Không lưu được, xin vui lòng kiểm tra lại.');
                    console.log(err);
                });
        });
       
    }
}
