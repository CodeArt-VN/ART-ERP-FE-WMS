import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { WMS_ItemGroupProvider, FINANCE_GeneralLedgerProvider, WMS_ItemGroupAccountInBranchProvider } from 'src/app/services/static/services.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-item-group-detail',
	templateUrl: 'item-group-detail.page.html',
	styleUrls: ['item-group-detail.page.scss'],
	standalone: false,
})
export class ItemGroupDetailPage extends PageBase {
	branchList = [];
	itemGroupList = [];
	ChartOfAccount = [];
	companyAccountRows = [];
	segmentView = 's1';
	accountsLoading = false;

	constructor(
		public pageProvider: WMS_ItemGroupProvider,
		public itemGroupAccountInBranchProvider: WMS_ItemGroupAccountInBranchProvider,
		public chartOfAccountProvider: FINANCE_GeneralLedgerProvider,
		public popoverCtrl: PopoverController,
		public env: EnvService,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.item = {};
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = formBuilder.group({
			IDParent: [null],
			IDBranch: new FormControl({ value: null, disabled: true }),
			Id: new FormControl({ value: '0', disabled: true }),
			Code: ['', Validators.required],
			Name: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}

	preLoadData(event?) {
		Promise.all([
			this.pageProvider.read({ Take: 5000, AllChildren: true, AllParent: true }),
			this.chartOfAccountProvider.commonService
				.connect('GET', 'FINANCE/GeneralLedger/', {
					Keyword: '',
					Take: 5000,
					AllChildren: true,
					AllParent: true,
				})
				.toPromise(),
		]).then((values: any) => {
			this.branchList = this.env.branchList || [];
			if (values[0]?.data) {
				lib.buildFlatTree(values[0].data, []).then((result: any) => {
					this.itemGroupList = result;
					this.markParentOptions();
				});
			}
			if (values[1]) {
				lib.buildFlatTree(values[1], []).then((result: any) => {
					this.ChartOfAccount = result;
				});
			}
			super.preLoadData(event);
		});
	}

	loadedData(event?) {
		super.loadedData(event);
		this.markParentOptions();
		if (this.segmentView === 's1') {
			this.loadCompanyAccountRows();
		}
	}

	markParentOptions() {
		if (!this.itemGroupList?.length) {
			return;
		}
		this.itemGroupList.forEach((i) => {
			i.disabled = false;
			i.Flag = false;
		});
		const currentId = Number(this.id) || Number(this.formGroup?.get('Id')?.value) || 0;
		if (!currentId) {
			return;
		}
		const self = this.itemGroupList.find((d) => d.Id == currentId);
		if (self) {
			self.disabled = true;
			self.Flag = true;
		}
		this.markNestedNode(this.itemGroupList, currentId);
	}

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			i.disabled = true;
			i.Flag = true;
			this.markNestedNode(ls, i.Id);
		});
	}

	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		if (this.segmentView === 's1') {
			this.loadCompanyAccountRows();
		}
	}

	refresh(event?) {
		if (this.segmentView === 's1') {
			this.loadCompanyAccountRows().finally(() => event?.target?.complete?.());
			return;
		}
		super.refresh(event);
	}

	get canEditAccounts(): boolean {
		return !!(this.pageConfig.canEdit || this.pageConfig.canAdd);
	}

	buildAccountRowForm(data: any): FormGroup {
		const g = this.formBuilder.group({
			Id: [data?.AccountInBranchId || data?.Id || 0],
			IDBranch: [data?.IDBranch],
			IDItemGroup: [this.id],
			Account: [data?.Account || null],
			AccountInventory: [data?.AccountInventory || null],
			AccountCostOfGoodsSold: [data?.AccountCostOfGoodsSold || null],
			AccountPriceDifference: [data?.AccountPriceDifference || null],
		});
		if (!this.canEditAccounts) {
			g.disable({ emitEvent: false });
		}
		return g;
	}

	buildEmptyCompanyRows() {
		const companies = (this.branchList || []).filter((d) => d.Type == 'Company');
		return companies.map((c) => {
			const row: any = {
				IDBranch: c.Id,
				CompanyName: c.Name,
				levels: c.levels || [],
				AccountInBranchId: 0,
				Account: null,
				AccountInventory: null,
				AccountCostOfGoodsSold: null,
				AccountPriceDifference: null,
				saving: false,
			};
			row._formGroup = this.buildAccountRowForm(row);
			return row;
		});
	}

	loadCompanyAccountRows() {
		this.companyAccountRows = this.buildEmptyCompanyRows();
		if (!this.id || this.id === '0') {
			return Promise.resolve();
		}
		this.accountsLoading = true;
		return this.env
			.showLoading(
				'Please wait for a few moments',
				this.pageProvider.commonService
					.connect('GET', 'WMS/ItemGroupAccountInBranch/', {
						IDItemGroup: this.id,
						Take: 5000,
					})
					.toPromise()
					.then((data: any) => {
						const rows: any[] = Array.isArray(data) ? data : data?.data || [];
						const byBranch = new Map<any, any>(rows.map((r) => [r.IDBranch, r]));
						this.companyAccountRows = this.companyAccountRows.map((row) => {
							const saved = byBranch.get(row.IDBranch);
							if (!saved) {
								return row;
							}
							const next: any = {
								...row,
								AccountInBranchId: saved.Id || 0,
								Account: saved.Account || null,
								AccountInventory: saved.AccountInventory || null,
								AccountCostOfGoodsSold: saved.AccountCostOfGoodsSold || null,
								AccountPriceDifference: saved.AccountPriceDifference || null,
							};
							next._formGroup = this.buildAccountRowForm(next);
							return next;
						});
						this.cdr.detectChanges();
					})
			)
			.catch(() => {})
			.finally(() => {
				this.accountsLoading = false;
			});
	}

	async saveCompanyAccount(row) {
		if (!row || !this.id || this.id === '0' || !this.canEditAccounts || row.saving) {
			return;
		}
		const g: FormGroup = row._formGroup;
		if (!g) {
			return;
		}
		row.saving = true;
		g.disable({ emitEvent: false });
		const submitItem = {
			Id: g.get('Id').value || 0,
			IDItemGroup: this.id,
			IDBranch: g.get('IDBranch').value,
			Account: g.get('Account').value || '',
			AccountInventory: g.get('AccountInventory').value || '',
			AccountCostOfGoodsSold: g.get('AccountCostOfGoodsSold').value || '',
			AccountPriceDifference: g.get('AccountPriceDifference').value || '',
		};
		try {
			const savedItem: any = await this.itemGroupAccountInBranchProvider.save(submitItem, this.pageConfig.isForceCreate);
			if (savedItem?.Id != null) {
				row.AccountInBranchId = savedItem.Id;
				g.get('Id').setValue(savedItem.Id, { emitEvent: false });
			}
			row.Account = submitItem.Account || null;
			row.AccountInventory = submitItem.AccountInventory || null;
			row.AccountCostOfGoodsSold = submitItem.AccountCostOfGoodsSold || null;
			row.AccountPriceDifference = submitItem.AccountPriceDifference || null;
			if (this.pageConfig.pageName) {
				this.env.publishEvent({ Code: this.pageConfig.pageName });
			}
			this.env.showMessage('Saving completed!', 'success');
		} catch (err) {
			this.env.showMessage('Cannot save, please try again', 'danger');
		} finally {
			row.saving = false;
			if (this.canEditAccounts) {
				g.enable({ emitEvent: false });
			}
			this.cdr.detectChanges();
		}
	}

	async saveChange() {
		this.formGroup.get('Id').setValue(this.id);
		this.formGroup.controls.Id.markAsDirty();
		return this.saveChange2();
	}
}
