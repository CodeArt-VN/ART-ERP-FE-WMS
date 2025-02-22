import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_LotProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-warehouse-item-lot',
	templateUrl: './warehouse-item-lot.component.html',
	styleUrls: ['./warehouse-item-lot.component.scss'],
	standalone: false,
})
export class WarehouseItemLotComponent extends PageBase {
	@Input() set setQuery(value) {
		this.query = value ? value : {};
		this.query.ToLocation = this.query.IDLocation;
		if (this.query.CreatedDateTo) {
			this.query.CreatedDateTo += 'T23:59:59';
		}
		this.clearData();
		this.loadData(null);
	}

	constructor(
		public pageProvider: WMS_LotProvider,
		public env: EnvService,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
	}

	preLoadData(event) {}

	loadData(event) {
		super.loadData(event);
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i.QuantityOnHand = lib.formatMoney(i.QuantityOnHand, 0);
			i.QuantityAllocated = lib.formatMoney(i.QuantityAllocated, 0);
			i.QuantityPicked = lib.formatMoney(i.QuantityPicked, 0);
			i.QuantityOnHold = lib.formatMoney(i.QuantityOnHold, 0);

			i.CubeText = lib.formatMoney(i.Cube / 1000000, 3);
			i.GrossWeightText = lib.formatMoney(i.GrossWeight / 1000, 3);
			i.NetWeightText = lib.formatMoney(i.NetWeight / 1000, 3);

			i.Lottable5Text = lib.dateFormat(i.Lottable5, 'dd/mm/yyyy');
		});
		super.loadedData(event);
	}
}
