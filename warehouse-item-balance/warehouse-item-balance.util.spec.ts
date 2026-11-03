import { applyItemDisplay, itemDisplayQuery, itemIdsToLoad, splitQuantity, storerIdFromBranch, uomDisplayQuery } from './warehouse-item-balance.util';

describe('warehouse item balance display', () => {
	const carton = { Id: 2, IDItem: 9, Name: 'Thùng', BaseQuantity: 10, AlternativeQuantity: 1, IsBaseUoM: false };
	const piece = { Id: 1, IDItem: 9, Name: 'Cái', BaseQuantity: 1, AlternativeQuantity: 1, IsBaseUoM: true };

	it('uses the storer returned for the branch and leaves the field empty otherwise', () => {
		expect(storerIdFromBranch({ Id: 17745, Name: 'TH Company' })).toBe(17745);
		expect(storerIdFromBranch(null)).toBe('');
		expect(storerIdFromBranch({})).toBe('');
	});

	it('asks for disabled items by id without the current branch filter', () => {
		expect(itemDisplayQuery([9, 10])).toEqual({
			Id: '9,10',
			Take: 2,
			Skip: 0,
			IsDisabled: 'skipped',
			IgnoredBranch: true,
		});
		expect(uomDisplayQuery([9])).toEqual({
			IDItem: '9',
			Take: 8,
			Skip: 0,
			IsDisabled: 'skipped',
			IgnoredBranch: true,
		});
	});

	it('loads each balance row once, including a disabled item id', () => {
		expect(
			itemIdsToLoad([
				{ IDItem: 9 },
				{ IDItem: '9' },
				{ IDItem: 10, _Item: { Id: 10 } },
				{ IDItem: 0, _Item: {} },
			])
		).toEqual([9]);
	});

	it('shows a disabled item name and its quantity', () => {
		const rows: any[] = [{ IDItem: 9, OpenQuantity: 25, ClosedQuantity: 10 }];
		applyItemDisplay(rows, [{ Id: 9, Code: 'A1', Name: 'Gạo', IsDisabled: true, SalesUoM: 2 }], [carton, piece]);

		expect(rows[0]._Item).toEqual({ Id: 9, Code: 'A1', Name: 'Gạo', IsDisabled: true });
		expect(rows[0]._SplitOpenQuantity).toEqual([
			{ Quantity: 2, UoMName: 'Thùng' },
			{ Quantity: 5, UoMName: 'Cái' },
		]);
		expect(rows[0]._SplitClosedQuantity).toEqual([{ Quantity: 1, UoMName: 'Thùng' }]);
	});

	it('leaves a balance row untouched when the item record is missing', () => {
		const rows: any[] = [{ IDItem: 11, OpenQuantity: 7, ClosedQuantity: 0 }];
		applyItemDisplay(rows, [], []);

		expect(rows[0]._Item).toBeUndefined();
		expect(rows[0].OpenQuantity).toBe(7);
	});

	it('uses a disabled unit when the item has no active unit', () => {
		const parts = splitQuantity([{ ...piece, IsDisabled: true }], 4, 1);
		expect(parts).toEqual([{ Quantity: 4, UoMName: 'Cái' }]);
	});

	it('does not change the split of an active item when an old unit is disabled', () => {
		const parts = splitQuantity([{ ...carton, IsDisabled: true }, piece], 25, 1);
		expect(parts).toEqual([{ Quantity: 25, UoMName: 'Cái' }]);
	});
});
