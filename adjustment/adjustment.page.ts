import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_AdjustmentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/interfaces/options-interface';
import { SYS_ConfigService } from 'src/app/services/custom/system-config.service';

@Component({
	selector: 'app-adjustment',
	templateUrl: 'adjustment.page.html',
	styleUrls: ['adjustment.page.scss'],
	standalone: false,
})
export class AdjustmentPage extends PageBase {
	statusList = [];
	constructor(
		public pageProvider: WMS_AdjustmentProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public sysConfigService: SYS_ConfigService,
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
		this.statusList = [
			{ Code: 'New', Name: 'Mới', Color: 'warning' },
			{ Code: 'Approved', Name: 'Đã duyệt', Color: 'success' },
			{ Code: 'Unapproved', Name: 'Không duyệt', Color: 'danger' },
		];

		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;

		Promise.all([
			this.sysConfigService.getConfig(this.env.selectedBranch, ['AdjustmentUsedApprovalModule']),
		]).then((values: any) => {
			if (values[0]) {
				this.pageConfig = {
					...this.pageConfig,
					...values[0]
				};
				if (this.pageConfig.AdjustmentUsedApprovalModule) {
					this.pageConfig.canApprove = false;
					this.pageConfig.canApprove = false;
				}
			}
		});
		super.preLoadData(event);
		console.log(this.pageConfig.pageName);
	}
	loadedData(event?: any) {
		super.loadedData(event);
		console.log(this.statusList);
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
		});
	}
	changeSelection(i, e = null) {
		super.changeSelection(i, e);
		if (this.pageConfig.canApprove) {
			this.pageConfig.ShowApprove = true;
			this.pageConfig.ShowDisapprove = true;
		}

		this.selectedItems?.forEach((i) => {
			let notShowApprove = ['Unapproved', 'Approved'];
			if (notShowApprove.indexOf(i.Status) > -1 || !i.Reason) {
				this.pageConfig.ShowApprove = false;
			}
			let notShowDisapprove = ['Unapproved', 'Approved'];
			if (notShowDisapprove.indexOf(i.Status) > -1) {
				this.pageConfig.ShowDisapprove = false;
			}
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
			.showPrompt({ code: 'Bạn có chắc muốn duyệt {{value}} đang chọn?', value: { value: this.selectedItems.length } }, null, {
				code: 'Duyệt {{value1}} dòng?',
				value: { value: this.selectedItems.length },
			})
			.then((_) => {
				this.pageProvider.commonService
					.connect('POST', 'WMS/adjustment/Approve', obj)
					.toPromise()
					.then((_) => {
						this.refresh();
					})
					.catch((err) => {
						this.env.showMessage('Không lưu được, xin vui lòng kiểm tra lại.');
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
			.showPrompt({ code: 'Bạn có chắc muốn duyệt {{value}} đang chọn?', value: { value: this.selectedItems.length } }, null, {
				code: 'Bỏ duyệt {{value}} dòng',
				value: { value: this.selectedItems.length },
			})
			.then((_) => {
				this.pageProvider.commonService
					.connect('POST', 'WMS/adjustment/Disapprove', obj)
					.toPromise()
					.then((_) => {
						this.refresh();
					})
					.catch((err) => {
						this.env.showMessage('Không lưu được, xin vui lòng kiểm tra lại.');
					});
			});
	}
}
