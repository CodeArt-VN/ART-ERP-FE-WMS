import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_LocationProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { NavigationExtras } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
	selector: 'app-location',
	templateUrl: 'location.page.html',
	styleUrls: ['location.page.scss'],
	standalone: false,
})
export class LocationPage extends PageBase {
	_items: any;
	constructor(
		public pageProvider: WMS_LocationProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public commonService: CommonService,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}
	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);
		this._items = this.items;
	}
	printQRCode() {
		let navigationExtras: NavigationExtras = {
			state: this.selectedItems.map((m) => {
				return {
					line1: m.Name,
					line2: m.Zone,
					qrCode: m.Id,
				};
			}),
		};
		this.nav('/qr-code-label', 'forward', navigationExtras);
	}
	isShowModal = false;
	doReorder(reOrderedItems) {
		this._items = reOrderedItems;
	}
	dismissModal(isSaveChange = false) {
		this.isShowModal = false;
		if (isSaveChange) {
			this.items = this._items;
			let putItems = this.items.map((i) => ({
				Id: i.Id,
				RouteSequence: i.RouteSequence,
			}));
			this.env
				.showLoading('Please wait for a few moments', this.commonService.connect('PUT', 'WMS/Location/UpdateRouteSequence', putItems).toPromise())
				.then((result: any) => {
					this.env.showMessage('Saved!', 'success');
				});
		}
	}
}
