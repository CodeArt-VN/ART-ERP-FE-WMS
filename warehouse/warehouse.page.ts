import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, WMS_ItemProvider, WMS_LocationProvider, WMS_ZoneProvider } from 'src/app/services/static/services.service';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'app-warehouse',
	templateUrl: 'warehouse.page.html',
	styleUrls: ['warehouse.page.scss'],
	standalone: false,
})
export class WarehousePage extends PageBase {
	branchList = [];
	zoneList = [];
	storerList = [];
	locationList = [];
	selectedBranch = null;
	selectedStorer = null;
	selectedZone = null;
	selectedLocation = null;
	selectedItem = null;
	fromDate = '';
	toDate = '';

	setQuery;

	segmentView = '';
	optionGroup = [
		{ Code: 'warehouse-item-lot', Name: 'Lot', Remark: '' },
		{
			Code: 'warehouse-item-location-lot-lpn',
			Name: 'Lot & LPN',
			Remark: '',
		},
		{ Code: 'warehouse-item-location', Name: 'Vị trí hàng', Remark: '' },
	];

	slideOpts = {
		freeMode: true,
		zoom: true,
	};

	constructor(
		public pageProvider: WMS_ZoneProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public zoneProvider: WMS_ZoneProvider,
		public locationProvider: WMS_LocationProvider,
		public itemProvider: WMS_ItemProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public route: ActivatedRoute,
		public navCtrl: NavController,
		public translate: TranslateService
	) {
		super();
		this.pageConfig.isShowFeature = true;
		this.segmentView = this.route.snapshot?.paramMap?.get('segment');
	}

	preLoadData(event) {
		this.branchProvider
			.read({
				Skip: 0,
				Take: 5000,
				Type: 'Warehouse',
				AllParent: true,
				Id: this.env.selectedBranchAndChildren,
			})
			.then((resp) => {
				lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
					this.branchList = result;
					this.branchList.forEach((i) => {
						i.disabled = true;
					});
					this.markNestedNode(this.branchList, this.env.selectedBranch);
					this.loadedData(event);
				});
			});
		this.contactProvider.read({ IsStorer: true }).then((resp) => {
			this.storerList = resp['data'];
		});
	}

	loadData(event) {
		this.loadedData(event);
	}

	loadedData(event) {
		super.loadedData(event);
		this.selectedBranch = this.branchList.find((d) => d.Id == this.id);
		if (!this.selectedBranch || this.selectedBranch.disabled) {
			this.selectedBranch = this.branchList.find((d) => d.disabled == false);
		}
		this.selectBranch();
		this.itemSearch();
	}

	itemList$;
	itemListLoading = false;
	itemListInput$ = new Subject<string>();
	itemListSelected = [];

	itemSearch() {
		this.itemListLoading = false;
		this.itemList$ = concat(
			of(this.itemListSelected),
			this.itemListInput$.pipe(
				distinctUntilChanged(),
				tap(() => (this.itemListLoading = true)),
				switchMap((term) =>
					this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
						catchError(() => of([])), // empty list on error
						tap(() => (this.itemListLoading = false))
					)
				)
			)
		);
	}

	loadNode(option = null) {
		if (!option && this.segmentView) {
			option = this.optionGroup.find((d) => d.Code == this.segmentView);
		}

		if (!option) {
			option = this.optionGroup[0];
		}

		if (!option) {
			return;
		}

		this.segmentView = option.Code;

		let newURL = '#/warehouse/';
		if (this.selectedBranch) {
			newURL += option.Code + '/' + this.selectedBranch.Id;
		}
		history.pushState({}, null, newURL);

		console.log('set');

		this.setQuery = {
			IDBranch: this.selectedBranch?.Id,
			IDStorer: this.selectedStorer?.Id,
			IDZone: this.selectedZone?.Id,
			IDLocation: this.selectedLocation?.Id,
			IDItem: this.selectedItem?.Id,
			CreatedDateFrom: this.fromDate,
			CreatedDateTo: this.toDate,
		};
		Object.assign(this.setQuery, this.query);
	}

	selectBranch() {
		if (!this.selectedBranch) {
			this.loadNode();
		} else {
			this.zoneProvider.read({ IDBranch: this.selectedBranch.Id }).then((resp) => {
				this.zoneList = resp['data'];
				let translateResult;
				this.translate.get('all').subscribe((message: string) => {
					translateResult = message;
				});
				let all = { Id: 'all', Name: translateResult };
				this.zoneList.unshift(all);
				this.selectedZone = all;
				this.selectZone();
			});
		}
	}

	selectZone() {
		if (!this.selectedZone) {
			this.loadNode();
		} else {
			this.locationProvider
				.read({
					IDBranch: this.selectedBranch.Id,
					IDZone: this.selectedZone.Id,
				})
				.then((resp) => {
					this.locationList = resp['data'];
					let translateResult;
					this.translate.get('all').subscribe((message: string) => {
						translateResult = message;
					});
					let all = { Id: 'all', Name: translateResult };
					this.locationList.unshift(all);
					this.selectedLocation = all;
					this.loadNode();
				});
		}
	}

	private markNestedNode(ls, Id) {
		let current = ls.find((d) => d.Id == Id);
		if (current) {
			current.disabled = current.Type != 'Warehouse';
			ls.filter((d) => d.IDParent == Id).forEach((i) => {
				if (i.Type == 'Warehouse') i.disabled = false;
				this.markNestedNode(ls, i.Id);
			});
		}
	}
}
