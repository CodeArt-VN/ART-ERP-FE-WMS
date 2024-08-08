import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SHIP_VehicleProvider, SYS_ConfigProvider, WMS_PackingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';
import { NavigationExtras } from '@angular/router';

@Component({
    selector: 'app-packing-order',
    templateUrl: 'packing-order.page.html',
    styleUrls: ['packing-order.page.scss']
})
export class PackingOrderPage extends PageBase {
    statusList = [];
    vehicleList:any = [];
    selectedVehicles : any = [];
    constructor(
        public pageProvider: WMS_PackingProvider,
        public branchProvider: BRA_BranchProvider,
        public contactProvider: CRM_ContactProvider,
        public vehicleService: SHIP_VehicleProvider,
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
            { Code: 'New', Name: 'Mới', Color: 'warning' },
            { Code: 'Open', Name: 'Mở', Color: 'primary' },
            { Code: 'Allocated', Name: 'Đã chỉ định', Color: 'secondary' },
            { Code: 'ShippingAllocated', Name: 'Đã phân tài', Color: 'secondary' },
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
    printQRCode() {
        let query = { IDPacking: this.selectedItems.map((d) => d.Id) };
        this.env
          .showLoading(
            'Đang tạo mã',
            this.pageProvider.commonService.connect('GET', 'WMS/OutboundOrder/getStaticPaymentQRCode', query).toPromise(),
          )
          .then((resp: any) => {
            if (resp) {
              console.log(resp);
              let navigationExtras: NavigationExtras = {
                state: resp.map((m) => {
                  return {
                    line1: m.Line1,
                    line2: m.Line2,
                    qrCode: m.Id,
                  };
                }),
              };
              this.nav('/qr-code-label', 'forward', navigationExtras);
            }
          })
          .catch((err) => {
            console.log(err);
            if (err.message != null) this.env.showMessage(err.message, 'danger');
            else this.env.showMessage('Không tạo được mã, xin vui lòng kiểm tra lại.', 'danger');
          });
      }

      CreateShippingFromPacking(isForceCreate = false) {
        let packingQuery = {
          Id:  this.selectedItems.map((i) => i.Id),
          IDVehicle: this.selectedVehicles.map((i) => i.Id),
          isForceCreate : isForceCreate
        };
        this.env
          .showLoading(
            'Xin vui lòng chờ trong giây lát...',
            this.pageProvider.commonService.connect('GET', 'WMS/Packing/CreateShippingFromPacking', packingQuery).toPromise(),
          )
          .then((rs) => {
            this.formGroup.get('Status').setValue('ShippingAllocated');
            this.formGroup.get('Status').markAsPristine();
    
            this.env.showTranslateMessage('saved', 'success');
          })
          .catch((err) => {
            if(err.error && err.error.Message =='Need more vehicle to ship!') {
              this.env .showPrompt( 'Số lượng xe hiện tại không thể tải hết hàng, bạn có muốn tiếp tục?', null, 'Không đủ tải', )
              .then((_) => { 
                this.CreateShippingFromPacking(true)
                this.formGroup.get('Status').setValue('ShippingAllocated');
                this.formGroup.get('Status').markAsPristine();
              })
              .catch(err=>{
                this.env.showTranslateMessage('Cannot save', 'danger');
              });
            }
            else{
              this.env.showTranslateMessage('Cannot save', 'danger');
            }
          });
      }

      isModalOpen = false;
      presentModal() {
        this.selectedItems = [];
    
        this.isModalOpen = true;
        let queryVehicle = {};
        this.env
        .showLoading('Xin vui lòng chờ trong giây lát...', this.vehicleService.read(queryVehicle))
        .then((result:any) => {
          if(result && result.data.length>0) this.vehicleList = result.data;
          console.log(this.vehicleList); 
        })
        .catch((err) => {
          console.log(err);
        });
    
      }
      
      dismissModal(isCreateShipping = false) {
        this.isModalOpen = false
        if(isCreateShipping){
          this.CreateShippingFromPacking();
        }
    
      }
      changeSelectionVehicle(e) {
        console.log(this.selectedVehicles);
      }

      isShowCreateShipping = false;
      changeSelection(i,e = null) {
        super.changeSelection(i, e )

        if (this.selectedItems.length > 0) {
          this.isShowCreateShipping = true;
          let idOutboundSet = new Set(this.selectedItems.map(s => s.IDOutboundOrder));
          if (idOutboundSet.size > 1) {
              this.isShowCreateShipping = false;
          }
        } else {
          this.isShowCreateShipping = false;
        }
        this.selectedItems.forEach((s) => {
          if (s.Status == 'ShippingAllocated') this.isShowCreateShipping = false;
        });
    
        console.log(this.selectedItems);
      }
}
