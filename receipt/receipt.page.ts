import { Component } from '@angular/core';

import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { BarcodeScannerService } from 'src/app/services/barcode-scanner.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { BRA_BranchProvider, CRM_ContactProvider, PURCHASE_OrderProvider, WMS_ReceiptProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-receipt',
	templateUrl: 'receipt.page.html',
	styleUrls: ['receipt.page.scss'],
	standalone: false,
})
export class ReceiptPage extends PageBase {
	constructor(
		public pageProvider: WMS_ReceiptProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public purchaseProvider: PURCHASE_OrderProvider,
		public scanner: BarcodeScannerService,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController
	) {
		super();

		Object.assign(purchaseProvider, {
			copyToReceipt(item) {
				console.log(item);
				return new Promise((resolve, reject) => {
					this.commonService
						.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/CopyToReceipt/'), item)
						.toPromise()
						.then((data) => {
							resolve(data);
						})
						.catch((err) => {
							reject(err);
						});
				});
			},
		});

		if (this.env.user.IDBusinessPartner > 0 && this.env.user.SysRoles.includes('VENDOR')) this.vendorView = true;
	}

	storerList = [];
	warehouseList = [];
	statusList = [];
	typeList = [];
	vendorView = false;
	IDBusinessPartner = null;
	preLoadData(event) {
		if (!this.sort.Id) {
			this.sort.Id = 'Id';
			this.sortToggle('Id', true);
		}
		Promise.all([
			this.contactProvider.read({ IsStorer: true }),
			this.branchProvider.read({
				Id: this.env.selectedBranchAndChildren,
				Type: 'Warehouse',
			}),
			this.env.getStatus('ReceiptStatus'),
			this.env.getType('ReceiptType'),
		]).then((values) => {
			this.storerList = values[0]['data'];
			this.warehouseList = values[1]['data'];
			this.statusList = values[2];
			this.typeList = values[3];

			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i.ExpectedReceiptDateText = lib.dateFormat(i.ExpectedReceiptDate, 'dd/mm/yy hh:MM');
			i.ReceiptedDateText = lib.dateFormat(i.ReceiptedDate, 'dd/mm/yy hh:MM');
			i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '', 'Code');
			i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', '', 'Code');
			i.TypeText = lib.getAttrib(i.Type, this.typeList, 'Name', '', 'Code');
		});

		super.loadedData(event);

		console.log('PAGE CONFIG : ', this.pageConfig);
	}

	changeSelection(i, e = null) {
		super.changeSelection(i, e);

		// const uniqueSellerIDs = new Set(this.selectedItems.map((i) => i.IDVendor));
		// this.pageConfig.ShowApprove = this.selectedItems.every(i => approveSet.has(i.Status));
		this.pageConfig.canDelivery = this.selectedItems.every((i) => i.Status == 'Confirmed') && this.vendorView;
		// this.pageConfig.ShowSubmit = this.selectedItems.every(i => submitSet.has(i.Status));
		// this.pageConfig.ShowCancel = this.selectedItems.every(i => cancelSet.has(i.Status));
		this.pageConfig.ShowDelete = this.selectedItems.every((i) => i.Status == 'New');

		// if (uniqueSellerIDs.size > 1) {
		//   this.IDBusinessPartner = null;
		// } else {
		//   this.IDBusinessPartner = [...uniqueSellerIDs][0];
		// }
	}

	submitReceipt() {
		if (!this.pageConfig.canReceive) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'Palletized' || i.Status == 'Scheduled'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your chosen order cannot be received. Please only choose goods receipt notes that are planned or divided by pallet', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Palletized' || i.Status == 'Scheduled');

			this.alertCtrl
				.create({
					header: 'Nhận ' + this.selectedItems.length + ' phiếu nhập hàng',
					//subHeader: '---',
					message: 'Bạn có chắc muốn nhận ' + this.selectedItems.length + ' phiếu nhập hàng đang chọn?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Nhận',
							cssClass: 'danger-btn',
							handler: () => {
								let publishEventCode = this.pageConfig.pageName;
								let apiPath = {
									method: 'POST',
									url: function () {
										return ApiSetting.apiDomain('WMS/Receipt/ReceiveReceipt/');
									},
								};

								if (this.submitAttempt == false) {
									this.submitAttempt = true;

									let postDTO = { Ids: [] };
									postDTO.Ids = this.selectedItems.map((e) => e.Id);

									this.loadingController
										.create({
											cssClass: 'my-custom-class',
											message: 'Please wait for a few moments',
										})
										.then((loading) => {
											loading.present();
											this.pageProvider.commonService
												.connect(apiPath.method, apiPath.url(), postDTO)
												.toPromise()
												.then((savedItem: any) => {
													if (publishEventCode) {
														this.env.publishEvent({
															Code: publishEventCode,
														});
													}
													this.env.showMessage('Saving completed!', 'success');
													this.submitAttempt = false;
													if (loading) loading.dismiss();
												})
												.catch((err) => {
													this.submitAttempt = false;
													if (loading) loading.dismiss();
													//console.log(err);
												});
										});
								}
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	findASNByPOId(POId: any) {
		this.pageProvider
			.search({ Take: 5000, Skip: 0, IDPurchaseOrder: POId })
			.toPromise()
			.then((asnItems: any) => {
				if (asnItems?.length) {
					if (asnItems?.length == 1) {
						//chỉ 1 asn -> redirect về xem chi tiết
						this.alertCtrl
							.create({
								header: 'Scan QR',
								//subHeader: '---',
								message: 'Tìm thấy 1 đơn ASN / Receipt, bạn có muốn mở ngay.',
								buttons: [
									{
										text: 'Không',
										role: 'cancel',
										handler: () => {},
									},
									{
										text: 'Đồng ý',
										cssClass: 'danger-btn',
										handler: () => {
											this.navCtrl.navigateForward('/receipt/' + asnItems[0].Id);
										},
									},
								],
							})
							.then((alert) => {
								alert.present();
							});
					} else {
						//nhiều asn, filter lại list
						console.log(asnItems);
						this.items = asnItems;
						this.loadData();
					}
				} else {
					//không tìm thấy asn
					this.purchaseProvider
						.search({ Take: 5000, Skip: 0, Id: POId })
						.toPromise()
						.then((POItem: any) => {
							if (POItem?.length > 0) {
								//po chưa có asn
								this.alertCtrl
									.create({
										header: 'Tìm thấy đơn PO',
										//subHeader: '---',
										message: 'PO này chưa có ASN/Receipt. Bạn có muốn tạo mới không?',
										buttons: [
											{
												text: 'Không',
												role: 'cancel',
												handler: () => {},
											},
											{
												text: 'Đồng ý',
												cssClass: 'danger-btn',
												handler: () => {
													this.copyToReceipt(POItem[0]);
												},
											},
										],
									})
									.then((alert) => {
										alert.present();
									});
							} else {
								//po không tồn tại
								this.env.showMessage('Cannot find PO in the system. Please check again.', 'warning');
							}
						});
				}
			})
			.catch((err) => {
				this.submitAttempt = false;
				console.log(err);
			});
	}

	async copyToReceipt(POItem: any) {
		const loading = await this.loadingController.create({
			cssClass: 'my-custom-class',
			message: 'Please wait for a few moments',
		});
		await loading.present().then(() => {
			this.purchaseProvider['copyToReceipt'](POItem)
				.then((resp: any) => {
					if (loading) loading.dismiss();
					this.alertCtrl
						.create({
							header: 'Đã tạo ASN/Receipt',

							message: 'Bạn có muốn di chuyển đến ASN mới tạo?',
							cssClass: 'alert-text-left',
							buttons: [
								{
									text: 'Không',
									role: 'cancel',
									handler: () => {},
								},
								{
									text: 'Có',
									cssClass: 'success-btn',
									handler: () => {
										this.nav('/receipt/' + resp);
									},
								},
							],
						})
						.then((alert) => {
							alert.present();
						});
					this.env.showMessage('ASN created!', 'success');
					this.env.publishEvent({ Code: this.pageConfig.pageName });
				})
				.catch((err) => {
					console.log(err);

					this.env.showMessage('Cannot create ASN, please try again later', 'danger');
					if (loading) loading.dismiss();
				});
		});
	}

	scanning = false;
	async scanQRCode() {
		try {
			let code = await this.scanner.scan();
			if (code.indexOf('O:') == 0) {
				let IDPurchaseOrder = code.replace('O:', '');
				//scan IDPO tìm ASN
				this.findASNByPOId(IDPurchaseOrder);
				return;
			} else {
				this.env
					.showPrompt('Please scan valid QR code', 'Invalid QR code', null, 'Retry', 'Cancel')
					.then(() => {
						setTimeout(() => this.scanQRCode(), 0);
					})
					.catch(() => {});
			}
		} catch (error) {
			console.error('Error scanning QR code:', error);
			this.env.showMessage('Error scanning QR code. Please try again.', 'danger');
		}
	}

	deliveryReceipt() {
		let ids = this.selectedItems.map((x) => x.Id);
		this.pageProvider.commonService
			.connect('POST', 'WMS/Receipt/ChangeStatus/', { Ids: ids, Status: 'Delivering' })
			.toPromise()
			.then((resp) => {
				this.env.showMessage('Đã chuyển trạng thái thành công', 'success');
				this.refresh();
			});
	}
}
