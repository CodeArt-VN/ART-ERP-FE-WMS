import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PR_ProgramProvider, PR_ProgramVoucherProvider, WMS_ItemGroupProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import QRCode from 'qrcode';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { PR_Program } from 'src/app/models/model-list-interface';

@Component({
	selector: 'app-voucher-printing',
	templateUrl: 'voucher-printing.page.html',
	styleUrls: ['voucher-printing.page.scss'],
	standalone: false,
})
export class VoucherPrintingPage extends PageBase {
	initProgram = [];
	lableConfig = {
		PageWidth: 96,
		QRCodeWidth: 206,
		CodeFontSize: 15,
		NameFontSize: 9,
		NameLineClamp: 2,
		IsOneColumn: false, // false = 2 col
		maxQRCodeWidth: 250,
	};

	printMode = 'Ruy96';
	constructor(
		//public pageProvider: WMS_VoucherPrintingProvider,
		public itemGroupProvider: WMS_ItemGroupProvider,
		public programProvider: PR_ProgramProvider,
		public programVoucherProvider: PR_ProgramVoucherProvider,
		public formBuilder: FormBuilder,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public router: Router
	) {
		super();
		this.pageConfig.isShowFeature = true;
		this.formGroup = this.formBuilder.group({
			IDProgram: [''],
			Code: ['',Validators.required]
		});
	}
	programDataSource = this.buildSelectDataSource((term) => {
		return this.programProvider.search({
			Type: 'Voucher',
			Status: 'Approved',
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Term: term
		});
	});

	preLoadData(event?: any): void {
		this.programProvider.read({ Take: 20, Type: 'Voucher', Status: 'Approved', SortBy: 'Id_desc' }).then((resp: any) => {
			if (resp.data && resp.data.length) {
				this.initProgram = resp.data;
				this.loadedData(event);

			}
		});
		this.route.queryParams.subscribe((params) => {
			this.items = this.router.getCurrentNavigation().extras.state;
			this.loadedData(event);
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);
		if (this.items?.length > 0) {
			this.items.forEach((i) => {
				QRCode.toDataURL(
					i.qrCode + '',
					{
						errorCorrectionLevel: 'M',
						version: 6,
						width: this.lableConfig.IsOneColumn ? 1000 : 500,
						scale: 20,
						type: 'image/webp',
					},
					function (err, url) {
						i._qrCode = url;
					}
				);
			});

			this.pageConfig.showSpinner = false;
		}
		this.programDataSource.selected = [...this.initProgram];
		this.programDataSource.initSearch();
		console.log(this.items);
	}
	changePRProgram(ev) {
		if (ev) {
			if (!ev?.IsGenerateVoucher) {
				this.formGroup.controls['Code'].setValue(ev.VoucherCode);
				this.formGroup.controls['Code'].markAsDirty();
			}
			else {
				this.programVoucherProvider.read({ IDProgram: ev.Id, IsUsed: false }).then((resp: any) => {
					if (resp.data && resp.data.length) {

						this.formGroup.controls['Code'].setValue(resp.data.map(i => i.Code).join('\n'));

					}
				});
			}
		}
		else {
			this.formGroup.controls['Code'].setValue('');
			this.formGroup.controls['IDProgram'].setValue('');
		}
	}
	changeIsOneColumn() {
		this.lableConfig.maxQRCodeWidth = this.lableConfig.IsOneColumn ? 500 : 250;
		if (this.lableConfig.QRCodeWidth > this.lableConfig.maxQRCodeWidth) this.lableConfig.QRCodeWidth = this.lableConfig.maxQRCodeWidth;
		this.loadedData();
	}
	createPages() {
		if (this.submitAttempt) {
			this.env.showMessage('Please wait for a few moments');
			return;
		}

		this.pageConfig.showSpinner = true;
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', () => this.loadLabel())
				.then((data) => {
					this.items = data;
					this.pageConfig.showSpinner = false;
					this.submitAttempt = false;
					this.env.showMessage('Đã tạo {{value}} mã.', null, this.items.length);
				})
				.catch((err) => {
					console.log(err);
				});
	}

	loadLabel() {
		return new Promise((resolve) => {
			let result = [];
			this.formGroup.controls.Code.value.split('\n')
				.map(x => x.trim())
				.filter(x => x).forEach((i) => {
					let label: any = {};
					label.Value = '' + i;
					label.data = i;
					QRCode.toDataURL(
						label.Value,
						{
							errorCorrectionLevel: 'H',
							version: 2,
							width: 500,
							scale: 20,
							type: 'image/webp',
						},
						function (err, url) {
							label.QRC = url;
						}
					);

					result.push(label);
				});

			resolve(result);
		});
	}
}
