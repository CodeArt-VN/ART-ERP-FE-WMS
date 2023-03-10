import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_StatusProvider, SYS_TypeProvider, WMS_ReceiptProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
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
        public statusProvider: SYS_StatusProvider,
        public typeProvider: SYS_TypeProvider,
        //add PURCHASE_OrderProvider
        public purchaseProvider: PURCHASE_OrderProvider,

        public modalController: ModalController,
		public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
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
            this.branchProvider.read({ Id: this.env.selectedBranchAndChildren, IDType: 115 }),
            this.statusProvider.read({ Code_eq: 'ReceiptStatus', AllChildren: true }),
            this.typeProvider.read({ Code_eq: 'ReceiptType', AllChildren: true })
        ]).then(values => {
            this.storerList = values[0]['data'];
            this.warehouseList = values[1]['data'];
            this.statusList = values[2]['data'].filter(d => d.Code != 'ReceiptStatus');
            this.typeList = values[3]['data'].filter(d => d.Code != 'ReceiptType');
            
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
                header: 'Nh???n ' + this.selectedItems.length + ' phi???u nh???p h??ng',
                //subHeader: '---',
                message: 'B???n ch???c mu???n nh???n ' + this.selectedItems.length + ' phi???u nh???p h??ng ??ang ch???n?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: 'Nh???n',
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
                                    message: '??ang t???o b???ng k??, xin vui l??ng ch??? gi??y l??t...'
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
                if(asnItems?.length == 1)//ch??? 1 asn -> redirect v??? xem chi ti???t
                {
                    this.alertCtrl.create({
                        header: 'Scan QR',
                        //subHeader: '---',
                        message: 'T??m th???y 1 ????n ASN / Receipt, b???n c?? mu???n m??? ngay.',
                        buttons: [
                            {
                                text: 'Kh??ng',
                                role: 'cancel',
                                handler: () => {}
                            },
                            {
                                text: '?????ng ??',
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
                else{ //nhi???u asn, filter l???i list
                    console.log(asnItems);
                    this.items = asnItems;
                    this.loadData();
                }
            }
            else{//kh??ng t??m th???y asn
                this.purchaseProvider.search({ Take: 5000, Skip: 0, Id: POId }).toPromise()
                .then((POItem: any) => {
                    
                    if(POItem?.length > 0){//po ch??a c?? asn
                        this.alertCtrl.create({
                            header: 'T??m th???y ????n PO',
                            //subHeader: '---',
                            message: 'PO n??y ch??a c?? ASN/Receipt. B???n c?? mu???n t???o m???i kh??ng?',
                            buttons: [
                                {
                                    text: 'Kh??ng',
                                    role: 'cancel',
                                    handler: () => {}
                                },
                                {
                                    text: '?????ng ??',
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
                    else{//po kh??ng t???n t???i
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
            message: 'Vui l??ng ch??? import d??? li???u'
        });
        await loading.present().then(() => {
            this.purchaseProvider['copyToReceipt'](POItem)
                .then((resp: any) => {

                    if (loading) loading.dismiss();
                    this.alertCtrl.create({
                        header: '???? t???o ASN/Receipt',

                        message: 'B???n c?? mu???n di chuy???n ?????n ASN m???i t???o?',
                        cssClass: 'alert-text-left',
                        buttons: [
                            { text: 'Kh??ng', role: 'cancel', handler: () => { } },
                            {
                                text: 'C??', cssClass: 'success-btn', handler: () => {
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
                            //scan IDPO t??m ASN
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
                        header: 'Qu??t QR code',
                        //subHeader: '---',
                        message: 'B???n ch??a cho ph??p s??? d???ng camera, Xin vui l??ng c???p quy???n cho ???ng d???ng.',
                        buttons: [
                            {
                                text: 'Kh??ng',
                                role: 'cancel',
                                handler: () => {}
                            },
                            {
                                text: '?????ng ??',
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
