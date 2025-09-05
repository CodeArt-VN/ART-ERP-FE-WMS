import { Component, ChangeDetectorRef } from '@angular/core';
import { LoadingController, AlertController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { WMS_ItemProvider, WMS_ItemUoMProvider } from 'src/app/services/static/services.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { Capacitor } from '@capacitor/core';
import { BarcodeScannerService } from 'src/app/services/util/barcode-scanner.service';

@Component({
	selector: 'app-item-uom-detail',
	templateUrl: './item-uom-detail.page.html',
	styleUrls: ['./item-uom-detail.page.scss'],
	standalone: false,
})
export class ItemUomDetailPage extends PageBase {
	formGroup: FormGroup;
	showAlterQty = true;
	baseUoM: any = {};

	constructor(
		public pageProvider: WMS_ItemUoMProvider,
		public itemProvider: WMS_ItemProvider,
		public env: EnvService,
		public route: ActivatedRoute,
		public scanner: BarcodeScannerService,

		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		private config: NgSelectConfig
	) {
		super();
		this.id = this.route.snapshot.paramMap.get('id');
		this.query.IDItem = this.id;
		this.formGroup = formBuilder.group({
			Name: ['', Validators.required],
			Remark: [''],
			Sort: [''],

			Length: [''],
			Width: [''],
			Height: [''],

			Weight: [''],
			Barcode: [''],

			AlternativeQuantity: [''],
			BaseQuantity: [''],
		});
	}

	product = null;
	preLoadData(event = null) {
		this.pageConfig.canDelete = false;
		this.pageConfig.canAdd = false;

		this.itemProvider
			.getAnItem(this.id)
			.then((result) => {
				this.product = result;
				super.preLoadData(event);
			})
			.catch((e) => {
				console.log(e);
				super.loadedData(event);
			});
	}

	loadData(event) {
		this.pageConfig.isDetailPage = false;
		super.loadData(event);
	}

	loadedData(event = null) {
		this.pageConfig.isDetailPage = true;
		if (this.items.length && !this.item) {
			this.baseUoM = this.items.find((d) => d.IsBaseUoM);
			this.loadUoM(this.items[0].Id);
		}
	}

	loadUoM(id) {
		this.id = id;
		this.item = this.items.find((d) => d.Id == this.id);
		this.showAlterQty = this.showAlterQty ? true : this.item.AlternativeQuantity != 1;
		super.loadedData();
	}

	changeUoM(ev) {
		this.loadUoM(ev.detail.value);
	}

	async scanQRCode() {
		try {
			let code = await this.scanner.scan();
			if (code) {
				this.formGroup.controls['Barcode'].setValue(code);
			} else {
				this.env
					.showPrompt('Please scan valid QR code', 'Invalid QR code', null, 'Retry', 'Cancel')
					.then(() => {
						setTimeout(() => this.scanQRCode(), 0);
					})
					.catch(() => {});
			}
		} catch (error) {
			console.error(error);
		}
	}

	disableProduct() {
		this.submitAttempt = true;
		this.product.IsDisabled = !this.product.IsDisabled;
		let prds = [];
		prds.push(this.product);
		this.itemProvider.disable(prds, this.product.IsDisabled).then((resp) => {
			this.env.showMessage('Changes saved', 'success');
			this.submitAttempt = false;
		});
	}

	saveProduct() {
		this.submitAttempt = true;
		this.itemProvider
			.save({
				Id: this.product.Id,
				TI: this.product.TI,
				HI: this.product.HI,
			})
			.then((resp) => {
				this.env.showMessage('Changes saved', 'success');
				this.submitAttempt = false;
			});
	}
}
