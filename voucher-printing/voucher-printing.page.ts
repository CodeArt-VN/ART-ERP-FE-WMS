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
				
				// Kiểm tra QR code đã được tạo
				if (!label.QRC) {
					console.warn(`QR code for ${fileName} not ready, skipping...`);
					continue;
				}
				
				const fileBytes = Uint8Array.from(atob(label.QRC.split(',')[1]), c => c.charCodeAt(0));
				const nameBytes = encoder.encode(fileName);

				const crc = this.crc32(fileBytes);
				const compSize = fileBytes.length;
				const uncompSize = fileBytes.length;
				
				// Tạo timestamp hợp lệ (DOS format)
				const now = new Date();
				const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
				const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

				// Local File Header
				const header = new Uint8Array(30 + nameBytes.length);
				const headerView = new DataView(header.buffer);
				
				// Signature
				headerView.setUint32(0, 0x04034b50, true);
				// Version needed
				headerView.setUint16(4, 20, true);
				// Flags
				headerView.setUint16(6, 0, true);
				// Compression method
				headerView.setUint16(8, 0, true);
				// Time & Date
				headerView.setUint16(10, dosTime, true);
				headerView.setUint16(12, dosDate, true);
				// CRC32
				headerView.setUint32(14, crc, true);
				// Compressed size
				headerView.setUint32(18, compSize, true);
				// Uncompressed size
				headerView.setUint32(22, uncompSize, true);
				// Filename length
				headerView.setUint16(26, nameBytes.length, true);
				// Extra field length
				headerView.setUint16(28, 0, true);
				
				// Copy filename
				header.set(nameBytes, 30);

				chunks.push(header, fileBytes);
				const localHeaderOffset = offset;
				offset += header.length + fileBytes.length;

				// Central Directory Entry
				const cdir = new Uint8Array(46 + nameBytes.length);
				const cdirView = new DataView(cdir.buffer);
				
				// Signature
				cdirView.setUint32(0, 0x02014b50, true);
				// Version made by
				cdirView.setUint16(4, 0x0314, true);
				// Version needed
				cdirView.setUint16(6, 20, true);
				// Flags
				cdirView.setUint16(8, 0, true);
				// Compression method
				cdirView.setUint16(10, 0, true);
				// Time & Date
				cdirView.setUint16(12, dosTime, true);
				cdirView.setUint16(14, dosDate, true);
				// CRC32
				cdirView.setUint32(16, crc, true);
				// Compressed size
				cdirView.setUint32(20, compSize, true);
				// Uncompressed size
				cdirView.setUint32(24, uncompSize, true);
				// Filename length
				cdirView.setUint16(28, nameBytes.length, true);
				// Extra field length
				cdirView.setUint16(30, 0, true);
				// Comment length
				cdirView.setUint16(32, 0, true);
				// Disk number start
				cdirView.setUint16(34, 0, true);
				// Internal file attributes
				cdirView.setUint16(36, 0, true);
				// External file attributes
				cdirView.setUint32(38, 0x81a40000, true); // File permissions
				// Local header offset
				cdirView.setUint32(42, localHeaderOffset, true);
				
				// Copy filename
				cdir.set(nameBytes, 46);

				centralDir.push(cdir);
			}

			// Tính toán Central Directory
			const centralDirStart = offset;
			for (const cdir of centralDir) {
				chunks.push(cdir);
				offset += cdir.length;
			}
			const centralDirSize = offset - centralDirStart;

			// End of Central Directory
			const eocd = new Uint8Array(22);
			const eocdView = new DataView(eocd.buffer);
			
			// Signature
			eocdView.setUint32(0, 0x06054b50, true);
			// Disk numbers
			eocdView.setUint16(4, 0, true);
			eocdView.setUint16(6, 0, true);
			// Number of entries
			eocdView.setUint16(8, centralDir.length, true);
			eocdView.setUint16(10, centralDir.length, true);
			// Central directory size
			eocdView.setUint32(12, centralDirSize, true);
			// Central directory offset
			eocdView.setUint32(16, centralDirStart, true);
			// Comment length
			eocdView.setUint16(20, 0, true);
			
			chunks.push(eocd);

			// Tạo và download file ZIP
			const blob = new Blob(chunks, { type: 'application/zip' });
			const url = URL.createObjectURL(blob);

			const now = new Date();
			const formatted = `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}_${('0' + now.getHours()).slice(-2)}${('0' + now.getMinutes()).slice(-2)}`;
			const a = document.createElement('a');
			a.href = url;
			a.download = `Labels_QR_${this.id}_${formatted}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}).catch(err => {
			console.error('Error creating ZIP:', err);
			this.env.showMessage('Có lỗi xảy ra khi tạo file ZIP', 'danger');
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
