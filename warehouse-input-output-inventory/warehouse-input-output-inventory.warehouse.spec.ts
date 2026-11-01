import { pickDefaultWarehouseId } from './warehouse-input-output-inventory.page';

describe('pickDefaultWarehouseId', () => {
	const tree = [
		{ Id: 1, Type: 'Company' },
		{ Id: 20, Type: 'Company' },
		{ Id: 21, Type: 'Warehouse' },
		{ Id: 22, Type: 'Warehouse' },
	];

	it('keeps the current warehouse when it is still in the tree', () => {
		expect(pickDefaultWarehouseId(tree, 22)).toBe(22);
	});

	it('selects the first consignment warehouse when the branch has no warehouse selected', () => {
		expect(pickDefaultWarehouseId(tree, '')).toBe(21);
		expect(pickDefaultWarehouseId(tree, 10)).toBe(21);
	});

	it('returns empty when the storer has no warehouse', () => {
		expect(pickDefaultWarehouseId([{ Id: 1, Type: 'Company' }], '')).toBe('');
		expect(pickDefaultWarehouseId([], 21)).toBe('');
	});
});
