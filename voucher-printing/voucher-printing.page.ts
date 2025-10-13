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
import * as JSZip from 'jszip';
@Component({
	selector: 'app-voucher-printing',
	templateUrl: 'voucher-printing.page.html',
	styleUrls: ['voucher-printing.page.scss'],
	standalone: false,
})
export class VoucherPrintingPage extends PageBase {
	initProgram = [];
	lableConfig :any = {
		PageWidth: 96,
		QRCodeWidth: 206,
		CodeFontSize: 15,
		NameFontSize: 9,
		NameLineClamp: 2,
		IsOneColumn: false, // false = 2 col
		maxQRCodeWidth: 250,
	};
	printModeList = [
		{ Code: 'A3', Name: 'A3' },
		{ Code: 'A4', Name: 'A4' },
		{ Code: 'A5', Name: 'A5' },
		{ Code: 'Ruy96', Name: 'Ruy96' },
		{ Code: 'Custom', Name: 'Custom' },
	]
	printMode = 'Ruy96';
	constructor(
		public pageProvider: PR_ProgramProvider,
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
		this.pageConfig.isDetailPage = true;
		this.formGroup = this.formBuilder.group({
			IDProgram: [''],
			Code: ['', Validators.required],
			PrintMode: ['Ruy96'],
			Width: [''],
			Height: [''],
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
			}

			super.preLoadData(event);
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		this.programDataSource.selected = [...this.initProgram];
		if (this.item?.Id) {
			if (!this.item?.IsGenerateVoucher) {
				this.formGroup.controls['Code'].setValue(this.item.VoucherCode);
			}
			else {
				this.formGroup.controls['Code'].setValue(this.item?._VoucherList.map(i => i.Code).join('\n'));
			}
			this.formGroup.get('IDProgram').setValue(this.item.Id);
			this.programDataSource.selected.push(this.item);

		}
		else {
			this.formGroup.controls['Code'].setValue('');
			this.formGroup.controls['IDProgram'].setValue('');
		}
		this.programDataSource.initSearch();
		this.pageConfig.showSpinner = false;
		event?.target?.complete();

	}
	changePRProgram(ev) {
		this.id = ev?.Id;
		this.loadData();

	}
	// changeIsOneColumn() {
	// 	this.lableConfig.maxQRCodeWidth = this.lableConfig.IsOneColumn ? 500 : 250;
	// 	if (this.lableConfig.QRCodeWidth > this.lableConfig.maxQRCodeWidth) this.lableConfig.QRCodeWidth = this.lableConfig.maxQRCodeWidth;
	// 	this.loadedData();
	// }
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
	resetToDefault(){
		this.lableConfig = {PageWidth: 96, QRCodeWidth: 206, CodeFontSize: 15, NameFontSize: 9, NameLineClamp: 2};
		this.formGroup.get('PrintMode').setValue('Ruy96');
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

	async downloadZip() {
		const labels: any = await this.loadLabel();
		const zip = new JSZip();
		let totalCount = 0;
		for (const l of labels) {
			totalCount++;
			const base64Data = l.QRC.split(',')[1];
			const binary = atob(base64Data);
			const array = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
			if (this.pageConfig.canViewCode) zip.file(`${l.Value}.png`, array);
			else zip.file(`${totalCount}.png`, array);
		}

		const blob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const now = new Date();
		const formatted =
			now.getFullYear() +
			('0' + (now.getMonth() + 1)).slice(-2) +
			('0' + now.getDate()).slice(-2) + '_' +
			('0' + now.getHours()).slice(-2) +
			('0' + now.getMinutes()).slice(-2); const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		a.download = `Labels_QR_${this.id}_${formatted}.zip`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
