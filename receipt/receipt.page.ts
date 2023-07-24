import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, WMS_ReceiptProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';

@Component({
    selector: 'app-receipt',
    templateUrl: 'receipt.page.html',
    styleUrls: ['receipt.page.scss']
})
export class ReceiptPage extends PageBase {
    constructor(
        public pageProvider: WMS_ReceiptProvider,
        public branchProvider: BRA_BranchProvider,
        public contactProvider: CRM_ContactProvider,
        public purchaseProvider: PURCHASE_OrderProvider,
        public modalController: ModalController,
		public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
    ) {
        super();

        Object.assign(purchaseProvider, {
            copyToReceipt(item) {
                console.log(item);
                return new Promise((resolve, reject) => {
                    this.commonService.connect('POST', ApiSetting.apiDomain("PURCHASE/Order/CopyToReceipt/"), item).toPromise()
                        .then((data) => {
                            
                            resolve(data);
                        }).catch(err => {
                            reject(err);
                        })
                });
            }
        });
    }

    storerList = [];
    warehouseList = [];
    statusList = [];
    typeList = [];

    preLoadData(event) {
        if (!this.sort.Id) {
            this.sort.Id = 'Id';
            this.sortToggle('Id', true);
        }
        Promise.all([
            this.contactProvider.read({ IsStorer: true }),
            this.branchProvider.read({ Id: this.env.selectedBranchAndChildren, Type: 'Warehouse' }),
            this.env.getStatus('ReceiptStatus'),
            this.env.getType('ReceiptType')
        ]).then(values => {
            this.storerList = values[0]['data'];
            this.warehouseList = values[1]['data'];
            this.statusList = values[2];
            this.typeList = values[3];
            
            super.preLoadData(event);

        })
    }

    loadedData(event) {
        this.items.forEach(i => {
            i.ExpectedReceiptDateText = lib.dateFormat(i.ExpectedReceiptDate, 'dd/mm/yy hh:MM');
            i.ReceiptedDateText = lib.dateFormat(i.ReceiptedDate, 'dd/mm/yy hh:MM');
            i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '', 'Code');
            i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', '', 'Code');
            i.TypeText = lib.getAttrib(i.Type, this.typeList, 'Name', '', 'Code');
        });

        super.loadedData(event);
    }

    submitReceipt() {
        if (!this.pageConfig.canReceive) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'Palletized' || i.Status == 'Scheduled'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.can-not-receive-planned-palletize-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'Palletized' || i.Status == 'Scheduled'));

            this.alertCtrl.create({
                header: 'Nhận ' + this.selectedItems.length + ' phiếu nhập hàng',
                //subHeader: '---',
                message: 'Bạn chắc muốn nhận ' + this.selectedItems.length + ' phiếu nhập hàng đang chọn?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Nhận',
                        cssClass: 'danger-btn',
                        handler: () => {

                            let publishEventCode = this.pageConfig.pageName;
                            let apiPath = {
                                method: "POST",
                                url: function () { return ApiSetting.apiDomain("WMS/Receipt/ReceiveReceipt/") }
                            };

                            if (this.submitAttempt == false) {
                                this.submitAttempt = true;

                                let postDTO = { Ids: [] };
                                postDTO.Ids = this.selectedItems.map(e => e.Id);

                                this.loadingController.create({
                                    cssClass: 'my-custom-class',
                                    message: 'Đang tạo bảng kê, xin vui lòng chờ giây lát...'
                                }).then(loading => {
                                    loading.present();
                                    this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), postDTO).toPromise()
                                        .then((savedItem: any) => {
                                            if (publishEventCode) {
                                                this.env.publishEvent({ Code: publishEventCode });
                                            }
                                            this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.save-complete', 'success');
                                            this.submitAttempt = false;
                                            if (loading) loading.dismiss();

                                        }).catch(err => {
                                            this.submitAttempt = false;
                                            if (loading) loading.dismiss();
                                            //console.log(err);
                                        });

                                });
                            }

                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
    }

    findASNByPOId(POId: any){
        
        this.pageProvider.search({ Take: 5000, Skip: 0, IDPurchaseOrder: POId }).toPromise()
        .then((asnItems: any) => {

            if(asnItems?.length){
                if(asnItems?.length == 1)//chỉ 1 asn -> redirect về xem chi tiết
                {
                    this.alertCtrl.create({
                        header: 'Scan QR',
                        //subHeader: '---',
                        message: 'Tìm thấy 1 đơn ASN / Receipt, bạn có muốn mở ngay.',
                        buttons: [
                            {
                                text: 'Không',
                                role: 'cancel',
                                handler: () => {}
                            },
                            {
                                text: 'Đồng ý',
                                cssClass: 'danger-btn',
                                handler: () => {
                                    this.navCtrl.navigateForward('/receipt/' + asnItems[0].Id);
                                }
                            }
                        ]
                    }).then(alert => {
                        alert.present();
                    })
                    
                }
                else{ //nhiều asn, filter lại list
                    console.log(asnItems);
                    this.items = asnItems;
                    this.loadData();
                }
            }
            else{//không tìm thấy asn
                this.purchaseProvider.search({ Take: 5000, Skip: 0, Id: POId }).toPromise()
                .then((POItem: any) => {
                    
                    if(POItem?.length > 0){//po chưa có asn
                        this.alertCtrl.create({
                            header: 'Tìm thấy đơn PO',
                            //subHeader: '---',
                            message: 'PO này chưa có ASN/Receipt. Bạn có muốn tạo mới không?',
                            buttons: [
                                {
                                    text: 'Không',
                                    role: 'cancel',
                                    handler: () => {}
                                },
                                {
                                    text: 'Đồng ý',
                                    cssClass: 'danger-btn',
                                    handler: () => {
                                        this.copyToReceipt(POItem[0]);
                                    }
                                }
                            ]
                        }).then(alert => {
                            alert.present();
                        })
                    }
                    else{//po không tồn tại
                        this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.can-not-find-po', 'warning');
                    }
                })
                
            }

        }).catch(err => {
            this.submitAttempt = false;
            console.log(err);
        });
    }

    async copyToReceipt(POItem: any) {
        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Vui lòng chờ import dữ liệu'
        });
        await loading.present().then(() => {
            this.purchaseProvider['copyToReceipt'](POItem)
                .then((resp: any) => {

                    if (loading) loading.dismiss();
                    this.alertCtrl.create({
                        header: 'Đã tạo ASN/Receipt',

                        message: 'Bạn có muốn di chuyển đến ASN mới tạo?',
                        cssClass: 'alert-text-left',
                        buttons: [
                            { text: 'Không', role: 'cancel', handler: () => { } },
                            {
                                text: 'Có', cssClass: 'success-btn', handler: () => {
                                    this.nav('/receipt/' + resp);
                                }
                            }
                        ]
                    }).then(alert => {
                        alert.present();
                    })
                    this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.create-asn-complete', 'success');
                    this.env.publishEvent({ Code: this.pageConfig.pageName });

                })
                .catch(err => {
                    console.log(err);

                    this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.can-not-create-asn', 'danger');
                    if (loading) loading.dismiss();
                })
        })
    }

    scanning = false;
    scanQRCode() {
        if (!Capacitor.isPluginAvailable('BarcodeScanner') || Capacitor.platform == 'web'){
            this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.mobile-only', 'warning');
            //this.findASNByPOId(2);
            return;
        }

        BarcodeScanner.prepare().then(() => {
            BarcodeScanner.checkPermission({ force: true }).then(status => {
                if (status.granted) {
                    this.scanning = true;
                    document.querySelector('ion-app').style.backgroundColor = "transparent";
                    BarcodeScanner.startScan().then((result) => {
                        console.log(result);
                        let close: any = document.querySelector('#closeCamera');

                        if (!result.hasContent) {
                            close.click();
                        }

                        if (result.content.indexOf('O:') == 0) {
                            let IDPurchaseOrder = result.content.replace('O:', '');
                            //scan IDPO tìm ASN
                            this.findASNByPOId(IDPurchaseOrder);
                            
                            this.closeCamera();
                        } else {
                            this.env.showTranslateMessage('erp.app.pages.wms.receipt.message.scanning-with-value','', result.content);
                            setTimeout(() => this.scanQRCode(), 0);
                        }
                    })
                }
                else {
                    this.alertCtrl.create({
                        header: 'Quét QR code',
                        //subHeader: '---',
                        message: 'Bạn chưa cho phép sử dụng camera, Xin vui lòng cấp quyền cho ứng dụng.',
                        buttons: [
                            {
                                text: 'Không',
                                role: 'cancel',
                                handler: () => {}
                            },
                            {
                                text: 'Đồng ý',
                                cssClass: 'danger-btn',
                                handler: () => {
                                    BarcodeScanner.openAppSettings();
                                }
                            }
                        ]
                    }).then(alert => {
                        alert.present();
                    })
                }
            })
                .catch((e: any) => console.log('Error is', e));
        })

        

    }

    closeCamera() {
        if (!Capacitor.isPluginAvailable('BarcodeScanner') || Capacitor.platform == 'web'){
            return;
        }
        this.scanning = false;
        this.lighting = false;
        this.useFrontCamera = false;
        document.querySelector('ion-app').style.backgroundColor = "";
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

}
