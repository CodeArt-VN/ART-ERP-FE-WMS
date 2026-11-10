import { FormBuilder } from '@angular/forms';
import { ItemGroupDetailPage } from './item-group-detail.page';

describe('ItemGroupDetailPage', () => {
	let component: ItemGroupDetailPage;

	beforeEach(() => {
		component = Object.create(ItemGroupDetailPage.prototype) as ItemGroupDetailPage;
		const fb = new FormBuilder();
		component.formBuilder = fb;
		component.formGroup = fb.group({
			IDParent: [null],
			IDBranch: [{ value: null, disabled: true }],
			Id: [{ value: '10', disabled: true }],
			Code: ['G1'],
			Name: ['Group 1'],
			Remark: [''],
			Sort: [1],
		});
		component.branchList = [
			{ Id: 1, Name: 'Company A', Type: 'Company', levels: [''] },
			{ Id: 2, Name: 'Company B', Type: 'Company', levels: [''] },
			{ Id: 3, Name: 'Warehouse', Type: 'Warehouse', levels: [''] },
		];
		component.itemGroupList = [
			{ Id: 10, IDParent: null, Name: 'Root', disabled: false, Flag: false },
			{ Id: 11, IDParent: 10, Name: 'Child', disabled: false, Flag: false },
			{ Id: 12, IDParent: 11, Name: 'Grandchild', disabled: false, Flag: false },
			{ Id: 20, IDParent: null, Name: 'Other', disabled: false, Flag: false },
		];
		component.ChartOfAccount = [
			{ Id: 100, Code: '111', Name: 'Cash' },
			{ Id: 101, Code: '156', Name: 'Inventory' },
		];
		component.companyAccountRows = [];
		component.id = '10';
		component.segmentView = 's1';
		component.accountsLoading = false;
		component.pageConfig = { canEdit: true, canAdd: true, pageName: 'item-group', isForceCreate: false } as any;
		component.cdr = { detectChanges: () => {} } as any;
		component.env = {
			showLoading: (_m, p) => p,
			showMessage: () => {},
			publishEvent: () => {},
			branchList: component.branchList,
		} as any;
		component.pageProvider = {
			commonService: {
				connect: () => ({
					toPromise: () =>
						Promise.resolve([
							{
								Id: 55,
								IDBranch: 1,
								IDItemGroup: 10,
								Account: '111',
								AccountInventory: '156',
								AccountCostOfGoodsSold: '',
								AccountPriceDifference: '',
							},
						]),
				}),
			},
		} as any;
		component.itemGroupAccountInBranchProvider = {
			save: jasmine.createSpy('save').and.returnValue(Promise.resolve({ Id: 55 })),
		} as any;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('segmentChanged should load accounts on s1', () => {
		const loadSpy = spyOn(component, 'loadCompanyAccountRows').and.returnValue(Promise.resolve());
		component.segmentChanged({ detail: { value: 's1' } });
		expect(component.segmentView).toBe('s1');
		expect(loadSpy).toHaveBeenCalled();
		loadSpy.calls.reset();
		component.segmentChanged({ detail: { value: 's2' } });
		expect(component.segmentView).toBe('s2');
		expect(loadSpy).not.toHaveBeenCalled();
	});

	it('markParentOptions should disable self and nested children', () => {
		component.markParentOptions();
		const byId = (id) => component.itemGroupList.find((i) => i.Id === id);
		expect(byId(10).disabled).toBe(true);
		expect(byId(11).disabled).toBe(true);
		expect(byId(12).disabled).toBe(true);
		expect(byId(20).disabled).toBe(false);
	});

	it('buildEmptyCompanyRows should only include Company type with form groups', () => {
		const rows = component.buildEmptyCompanyRows();
		expect(rows.length).toBe(2);
		expect(rows.map((r) => r.IDBranch)).toEqual([1, 2]);
		expect(rows.every((r) => r.AccountInBranchId === 0)).toBe(true);
		expect(rows.every((r) => !!r._formGroup)).toBe(true);
	});

	it('loadCompanyAccountRows should merge saved accounts by IDBranch', async () => {
		await component.loadCompanyAccountRows();
		expect(component.companyAccountRows.length).toBe(2);
		const companyA = component.companyAccountRows.find((r) => r.IDBranch === 1);
		const companyB = component.companyAccountRows.find((r) => r.IDBranch === 2);
		expect(companyA.AccountInBranchId).toBe(55);
		expect(companyA._formGroup.get('Account').value).toBe('111');
		expect(companyA._formGroup.get('AccountInventory').value).toBe('156');
		expect(companyB.AccountInBranchId).toBe(0);
		expect(companyB._formGroup.get('Account').value).toBeNull();
	});

	it('saveCompanyAccount should persist row and keep AccountInBranchId', async () => {
		const row: any = {
			IDBranch: 2,
			CompanyName: 'Company B',
			AccountInBranchId: 0,
			saving: false,
		};
		row._formGroup = component.buildAccountRowForm({
			...row,
			Account: '111',
			AccountInventory: '',
			AccountCostOfGoodsSold: '',
			AccountPriceDifference: '',
		});
		await component.saveCompanyAccount(row);
		expect(component.itemGroupAccountInBranchProvider.save).toHaveBeenCalled();
		expect(row.AccountInBranchId).toBe(55);
		expect(row._formGroup.get('Id').value).toBe(55);
		expect(row.saving).toBe(false);
		expect(row._formGroup.enabled).toBe(true);
	});
});
