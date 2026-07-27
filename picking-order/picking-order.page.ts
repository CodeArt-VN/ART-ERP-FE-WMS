import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_ConfigProvider, WMS_PickingProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/interfaces/options-interface';

@Component({
	selector: 'app-picking-order',
	templateUrl: 'picking-order.page.html',
	styleUrls: ['picking-order.page.scss'],
	standalone: false,
})
export class PickingOrderPage extends PageBase {
	statusList = [];
	constructor(
		public pageProvider: WMS_PickingProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public modalController: ModalController,
		public sysConfigProvider: SYS_ConfigProvider,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event?: any): void {
		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;
		this.statusList = [
			{ Code: 'New', Name: 'Mới', Color: 'warning' },
			{ Code: 'Open', Name: 'Mở', Color: 'primary' },
			{ Code: 'Allocated', Name: 'Đã chỉ định', Color: 'secondary' },
			{ Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
		];

		super.preLoadData(event);
		console.log(this.pageConfig.pageName);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
		});
	}

	approve() {
		if (this.selectedItems.some((d) => d.Status == 'Done')) {
			return;
		}
		let obj = {
			IDs: this.selectedItems.map((s) => s.Id),
		};
		this.env
			.showPrompt({ code: 'Are you sure you want to approve the selected {{value}}?', value: this.selectedItems.length }, null, {
				code: 'Approve {{value1}} line(s)',
				value1: this.selectedItems.length,
			})
			.then((_) => {
				this.pageProvider.commonService
					.connect('POST', 'WMS/picking-order/Approve', obj)
					.toPromise()
					.then((_) => {
						this.refresh();
					})
					.catch((err) => {
						this.env.showMessage('Can not save, please try again');
						console.log(err);
					});
			});
	}

	disapprove() {
		if (this.selectedItems.some((d) => d.Status == 'Pending')) {
			return;
		}
		let obj = {
			IDs: this.selectedItems.map((s) => s.Id),
		};
		this.env
			.showPrompt({ code: 'Are you sure you want to disapprove the selected {{value}}?', value: { value: this.selectedItems.length } }, null, {
				code: 'Disapprove {{value1}} line(s)',
				value: { value1: this.selectedItems.length },
			})
			.then((_) => {
				this.pageProvider.commonService
					.connect('POST', 'WMS/picking-order/Disapprove', obj)
					.toPromise()
					.then((_) => {
						this.refresh();
					})
					.catch((err) => {
						this.env.showMessage('Can not save, please try again');
						console.log(err);
					});
			});
	}
}
