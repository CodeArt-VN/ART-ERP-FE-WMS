import { ItemGroupPage } from './item-group.page';

describe('ItemGroupPage', () => {
	let component: ItemGroupPage;

	beforeEach(() => {
		component = Object.create(ItemGroupPage.prototype) as ItemGroupPage;
		component.dataItemGroup = [];
		component.isAllRowOpened = true;
		component.items = [
			{ Id: 1, IDParent: null, Name: 'Root', HasChild: true },
			{ Id: 2, IDParent: 1, Name: 'Child', HasChild: false },
		];
		component.query = { Take: 5000, AllChildren: true, AllParent: true } as any;
		component.pageConfig = { pageName: 'item-group' } as any;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('toggleRowAll should flip isAllRowOpened and call toggleRow for each node', () => {
		const toggleSpy = spyOn(component, 'toggleRow');
		component.dataItemGroup = [{ Id: 1 }, { Id: 2 }];
		component.isAllRowOpened = true;

		component.toggleRowAll();

		expect(component.isAllRowOpened).toBe(false);
		expect(toggleSpy).toHaveBeenCalledTimes(2);
		expect(component.dataItemGroup.every((i) => i.showdetail === true)).toBe(true);
	});
});
