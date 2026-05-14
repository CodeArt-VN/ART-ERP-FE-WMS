import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, WMS_ItemProvider, WMS_ReceiptProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
	selector: 'app-receipt-mobile-detail',
	templateUrl: './receipt-mobile-detail.page.html',
	styleUrls: ['./receipt-mobile-detail.page.scss'],
	standalone: false,
})
export class ReceiptMobileDetailPage extends PageBase {
	vendorView = false;
	statusList: any = [];
	storerList = [];
	carrierList = [];
	typeList = [];
	branchList = [];
	listNoLock =['New','Confirmed','Scheduled','Delivering'];
	constructor(
		public pageProvider: WMS_ReceiptProvider,

		public contactProvider: CRM_ContactProvider,
		public itemProvider: WMS_ItemProvider,

		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = formBuilder.group({
			IDBranch: ['', Validators.required],
			IDStorer: ['', Validators.required],
			IDVendor: ['', Validators.required],
			IDPurchaseOrder: [''], //
			POCode: [''], //

			Id: new FormControl({ value: 0, disabled: true }),
			Code: [''],
			Name: [''],
			ForeignName: [''],
			Remark: [''],
			ForeignRemark: [''],

			ExternalReceiptKey: [''], //
			IDCarrier: [''], //
			VehicleNumber: [''], //

			ExpectedReceiptDate: ['', Validators.required],
			ArrivalDate: [''], //
			ReceiptedDate: [''],
			ClosedDate: [''], //

			Type: ['KeyIn'], //new FormControl({ value: '', disabled: false }),
			Status: new FormControl({ value: '', disabled: true }),
			IsDisabled: new FormControl({ value: '', disabled: true }),
			Lines: this.formBuilder.array([]),
		});
		if (this.env.user.IDBusinessPartner > 0 && this.env.user.SysRoles.includes('VENDOR')) this.vendorView = true;
	}

	preLoadData(event?: any): void {
		Promise.all([this.env.getStatus('ReceiptStatus'), this.env.getType('ReceiptType')]).then((res: any) => {
			this.statusList = res[0];
			this.typeList = res[1];

			super.preLoadData(event);
		});
	}

	loadData(event?: any, forceReload?: boolean): void {
		super.loadData(event, forceReload);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		if (this.item) {
			this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
			if (this.item.Lines) {
				this.item.Lines.sort((a, b) => (a.Id > b.Id ? 1 : b.Id > a.Id ? -1 : 0));
				this.item.Lines.forEach((l) => {
					l.Lottable5 = lib.dateFormat(l.Lottable5);
					l.Lottable6 = lib.dateFormat(l.Lottable6);
				});
				this.item.QuantityExpected = this.item.Lines.reduce((a, b) => a + b.QuantityExpected, 0);
				this.item.QuantityReceived = this.item.Lines.reduce((a, b) => a + b.QuantityReceived, 0);
			}

			if (!(this.item.Status == 'New' || this.item.Status == 'Palletized')) {
				this.pageConfig.canEdit = false;
			}
		}
		
		super.loadedData();

		if (this.id == 0) {
			this.formGroup.controls.Type.markAsDirty();
		}
		this.setLines();

		this.pageConfig.canDelivery = this.item.Status == 'Confirmed' && this.vendorView;
		if (!this.listNoLock.includes(this.item.Status)) this.formGroup.disable();
		
	}

	setLines() {
		this.formGroup.controls.Lines = new FormArray([]);
		if (this.item.Lines?.length)
			this.item.Lines.forEach((i) => {
				this.addOrderLine(i);
			});
		// else
		//     this.addOrderLine({ IDOrder: this.item.Id, Id: 0 });

		this.calcTotalLine();
	}

	addOrderLine(line) {
		let groups = <FormArray>this.formGroup.controls.Lines;
		let group = this.formBuilder.group({
			_UoMs: [line._Item ? line._Item.UoMs : ''],
			_Item: [line._Item, Validators.required],
			_IsShowPallets: [true],

			// IDReceipt: [line.IDReceipt],
			// IDPO: [line.IDPO],
			// IDPOLine: [line.IDPOLine],
			IDItem: [line.IDItem, Validators.required],
			IDUoM: [line.IDUoM, Validators.required],
			Id: [line.Id],
			// Code: [line.Code],
			// Remark: [line.Remark],
			// ForeignRemark: [line.ForeignRemark],
			// ExternalReceipt: [line.ExternalReceipt],
			// ExternalLine: [line.ExternalLine],
			// Status: [line.Status],
			// ReceivedDate: [line.ReceivedDate],

			// UoMQuantityExpected: [line.UoMQuantityExpected, Validators.required],
			UoMQuantityExpected: [line.UoMQuantityExpected],
			// QuantityAdjusted: [line.QuantityAdjusted],
			QuantityReceived: [line.QuantityReceived],
			// QuantityRejected: [line.QuantityRejected],
			Cube: new FormControl({ value: line.Cube, disabled: true }),
			GrossWeight: new FormControl({
				value: line.GrossWeight,
				disabled: true,
			}),
			NetWeight: new FormControl({
				value: line.NetWeight,
				disabled: true,
			}),

			Expiry: [line.Lottable1],
			ExpiryUnit: [line.Lottable1],

			Lottable0: [line.Lottable0, Validators.required],
			Lottable1: [line.Lottable1],
			Lottable2: [line.Lottable2],
			Lottable3: [line.Lottable3],
			Lottable4: [line.Lottable4],

			Lottable5: [line.Lottable5, Validators.required],
			Lottable6: [line.Lottable6, Validators.required],
			Lottable7: [line.Lottable7],
			Lottable8: [line.Lottable8],
			Lottable9: [line.Lottable9],

			Pallets: this.formBuilder.array([]),
		});
		this.setPallets(group, line);
		groups.push(group);
	}

	setPallets(group, line) {
		group.controls.Pallets = new FormArray([]);
		if (line.Pallets?.length)
			line.Pallets.forEach((i) => {
				this.addPallet(i, group.controls.Pallets);
			});
	}

	addPallet(line, groups) {
		let group = this.formBuilder.group({
			_Location: [line._Location],
			_LPN: [line._LPN],

			Id: [line.Id],
			Status: [line.Status],
			ReceivedDate: [line.ReceivedDate],
			IDUoM: new FormControl({ value: line.IDUoM, disabled: true }),
			UoMQuantityExpected: new FormControl({
				value: line.UoMQuantityExpected,
				disabled: true,
			}),
			QuantityAdjusted: [line.QuantityAdjusted],
			QuantityReceived: [line.QuantityReceived],
			QuantityRejected: [line.QuantityRejected],
			ToLocation: [line.ToLocation, Validators.required],
			ToLot: [line.ToLot],
			Cube: new FormControl({ value: line.Cube, disabled: true }),
			GrossWeight: new FormControl({
				value: line.GrossWeight,
				disabled: true,
			}),
			NetWeight: new FormControl({
				value: line.NetWeight,
				disabled: true,
			}),
			IsFullPallet: [line.IsFullPallet],
			Remark: [line.Remark],
		});
		groups.push(group);
	}

	calcTotalLine() {
		if (this.formGroup.controls.Lines) {
			this.item.Cube = 0;
			this.item.GrossWeight = 0;
			this.item.NetWeight = 0;

			this.formGroup.controls.Lines['controls'].forEach((g) => {
				let _UoMs = g.controls['_UoMs'].value;
				if (_UoMs) {
					let IDUoM = g.controls['IDUoM'].value;
					let UoMQuantityExpected = g.controls['UoMQuantityExpected'].value;
					let UoM = _UoMs.find((d) => d.Id == IDUoM);
					if (UoM) {
						g.controls['Cube'].setValue((UoM.Cube * UoMQuantityExpected) / 10.0 ** 6);
						g.controls['GrossWeight'].setValue((UoM.Weight * UoMQuantityExpected) / 1000);
						g.controls['NetWeight'].setValue((UoM.Weight * UoMQuantityExpected) / 1000);

						this.item.Cube += (UoM.Cube * UoMQuantityExpected) / 10.0 ** 6;
						this.item.GrossWeight += (UoM.Weight * UoMQuantityExpected) / 1000;
						this.item.NetWeight += (UoM.Weight * UoMQuantityExpected) / 1000;
					}
				}
			});
		}

		// this.item.TotalDiscount = this.formGroup.controls.Lines.value.map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0);
		// this.item.TotalAfterTax = this.formGroup.controls.Lines.value.map(x => x.IsPromotionItem ? 0 : (x.UoMPrice * x.UoMQuantityExpected - x.TotalDiscount)).reduce((a, b) => (+a) + (+b), 0)
	}

	submitReceipt() {
		if (!this.pageConfig.canReceive) {
			return;
		}

		this.alertCtrl
			.create({
				header: 'Nhận phiếu nhập hàng',
				message: 'Bạn có chắc muốn nhận phiếu nhập hàng đang chọn?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
					},
					{
						text: 'Nhận',
						cssClass: 'danger-btn',
						handler: async () => {
							if (this.submitAttempt) return;

							const receiptId = this.formGroup.get('Id').value;
							if (!receiptId) {
								this.env.showMessage('Cannot find order', 'warning');
								return;
							}

							const loading = await this.loadingController.create({
								cssClass: 'my-custom-class',
								message: 'Please wait for a few moments',
							});

							try {
								this.submitAttempt = true;
								await loading.present();

								if (this.formGroup.dirty) {
									this.submitAttempt = false;
									await this.saveChange2(this.formGroup, null);
									this.submitAttempt = true;
								}

								await this.pageProvider.commonService
									.connect('POST', ApiSetting.apiDomain('WMS/Receipt/PalletizeAndReceiveReceipt/'), {
										Ids: [receiptId],
									})
									.toPromise();

								this.env.publishEvent({ Code: this.pageConfig.pageName });
								this.env.publishEvent({ Code: 'purchase-order' });
								this.env.showMessage('Saving completed!', 'success');
								this.refresh();
							} catch (err) {
								if (err?.error?.ExceptionMessage) this.env.showMessage(err.error.ExceptionMessage, 'danger');
								else this.env.showMessage('Cannot save, please try again', 'danger');
							} finally {
								this.submitAttempt = false;
								if (loading) loading.dismiss();
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
