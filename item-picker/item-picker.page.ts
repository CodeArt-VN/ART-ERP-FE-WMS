import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, HRM_StaffProvider, WMS_ItemGroupProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-item-picker',
	templateUrl: 'item-picker.page.html',
	styleUrls: ['item-picker.page.scss'],
	standalone: false,
})
export class ItemPickerPage extends PageBase {
	itemGroupList = [];
	constructor(
		public pageProvider: WMS_ItemProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public itemGroupProvider: WMS_ItemGroupProvider
	) {
		super();
	}

	preLoadData(event) {
		this.query.Take = 200;
		this.itemGroupProvider.read({ Take: 5000, IgnoredBranch: true }).then((resp) => {
			lib.buildFlatTree(resp['data'], this.itemGroupList).then((tree: any) => {
				let ls = tree;
				ls.forEach((g) => {
					g.childrenIds = [];
					g.childrenIds = lib.findChildren(ls, g.Id, [g.Id]);
					g.Query = JSON.stringify(g.childrenIds);
				});

				ls.forEach((i) => {
					let prefix = '';
					for (let j = 1; j < i.level; j++) {
						prefix += '- ';
					}
					i.NamePadding = prefix + i.Name;
					this.itemGroupList.push(i);
				});
			});
		});
		super.preLoadData(event);
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i.ItemGroup = lib.getAttrib(i.IDItemGroup, this.itemGroupList);
		});
		super.loadedData(event);
	}

	SaveSelectedItem() {
		this.modalController.dismiss(this.selectedItems);
	}
}
