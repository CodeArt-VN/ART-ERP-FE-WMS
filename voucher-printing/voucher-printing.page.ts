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
	lableConfig: any = {
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
	resetToDefault() {
		this.lableConfig = { PageWidth: 96, QRCodeWidth: 206, CodeFontSize: 15, NameFontSize: 9, NameLineClamp: 2 };
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

	async downloadQrZip() {
		if (!this.formGroup.controls.Code.value) return;

		this.env.showLoading('Please wait for a few moments', this.loadLabel()).then((resp: any) => {
			let labels = resp;
			const encoder = new TextEncoder();
			const chunks: BlobPart[] = [];

			let offset = 0;
			const centralDir: any[] = [];
			let totalCount = 0;

			for (const label of labels) {
				totalCount++;
				const fileName = this.pageConfig.canViewCode ? `${label.Value}.png` : `${totalCount}.png`;
				const fileBytes = Uint8Array.from(atob(label.QRC.split(',')[1]), c => c.charCodeAt(0));
				const nameBytes = encoder.encode(fileName);

				const crc = this.crc32(fileBytes);
				const compSize = fileBytes.length;
				const uncompSize = fileBytes.length;

				// ---- Local File Header (30 bytes + name)
				const header = new Uint8Array([
					0x50, 0x4B, 0x03, 0x04,       // signature
					20, 0,                        // version needed
					0, 0,                         // flags
					0, 0,                         // compression (store)
					0, 0, 0, 0,                   // time/date
					crc & 0xff, (crc >> 8) & 0xff, (crc >> 16) & 0xff, (crc >> 24) & 0xff,
					compSize & 0xff, (compSize >> 8) & 0xff, (compSize >> 16) & 0xff, (compSize >> 24) & 0xff,
					uncompSize & 0xff, (uncompSize >> 8) & 0xff, (uncompSize >> 16) & 0xff, (uncompSize >> 24) & 0xff,
					nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // filename len
					0, 0 // extra field len
				]);

				chunks.push(header, nameBytes, fileBytes);
				const localHeaderOffset = offset;
				offset += header.length + nameBytes.length + fileBytes.length;

				// ---- Central Directory Entry (46 bytes + name)
				const cdir = new Uint8Array([
					0x50, 0x4B, 0x01, 0x02, // signature
					20, 3,                  // version made by + version needed
					0, 0,                   // flags
					0, 0,                   // compression (store)
					0, 0, 0, 0,             // time/date
					crc & 0xff, (crc >> 8) & 0xff, (crc >> 16) & 0xff, (crc >> 24) & 0xff,
					compSize & 0xff, (compSize >> 8) & 0xff, (compSize >> 16) & 0xff, (compSize >> 24) & 0xff,
					uncompSize & 0xff, (uncompSize >> 8) & 0xff, (uncompSize >> 16) & 0xff, (uncompSize >> 24) & 0xff,
					nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff, // filename length
					0, 0, // extra
					0, 0, // comment
					0, 0, // disk number start
					0, 0, // internal file attrs
					0, 0, 0, 0, // external file attrs
					localHeaderOffset & 0xff, (localHeaderOffset >> 8) & 0xff, (localHeaderOffset >> 16) & 0xff, (localHeaderOffset >> 24) & 0xff
				]);

				centralDir.push({ cdir, nameBytes });
			}

			const centralDirStart = offset;
			for (const { cdir, nameBytes } of centralDir) {
				chunks.push(cdir, nameBytes);
				offset += cdir.length + nameBytes.length;
			}
			const centralDirSize = offset - centralDirStart;

			// ---- End of Central Directory (22 bytes)
			const cdirCount = centralDir.length;
			const eocd = new Uint8Array([
				0x50, 0x4B, 0x05, 0x06,
				0, 0, 0, 0,
				cdirCount & 0xff, (cdirCount >> 8) & 0xff,
				cdirCount & 0xff, (cdirCount >> 8) & 0xff,
				centralDirSize & 0xff, (centralDirSize >> 8) & 0xff, (centralDirSize >> 16) & 0xff, (centralDirSize >> 24) & 0xff,
				centralDirStart & 0xff, (centralDirStart >> 8) & 0xff, (centralDirStart >> 16) & 0xff, (centralDirStart >> 24) & 0xff,
				0, 0 // comment len
			]);
			chunks.push(eocd);

			// ---- Save ZIP
			const blob = new Blob(chunks, { type: 'application/zip' });
			const url = URL.createObjectURL(blob);

			const now = new Date();
			const formatted = `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}_${('0' + now.getHours()).slice(-2)}${('0' + now.getMinutes()).slice(-2)}`;
			const a = document.createElement('a');
			a.href = url;
			a.download = `Labels_QR_${this.id}_${formatted}.zip`;
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	crc32(buf: Uint8Array) {
		let crc = ~0;
		const table = (() => {
			const t = new Uint32Array(256);
			for (let i = 0; i < 256; i++) {
				let c = i;
				for (let j = 0; j < 8; j++) {
					c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
				}
				t[i] = c >>> 0;
			}
			return t;
		})();
		for (let i = 0; i < buf.length; i++) {
			crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
		}
		return ~crc >>> 0;
	}
}
