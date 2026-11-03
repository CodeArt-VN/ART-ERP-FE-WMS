export function storerIdFromBranch(storer: any): number | '' {
	const id = Number(storer?.Id);
	return Number.isFinite(id) && id > 0 ? id : '';
}

export function itemIdsToLoad(rows: any[] | null | undefined): number[] {
	const ids = new Set<number>();
	for (const row of rows || []) {
		if (!row || row._Item || row.IDItem == null || row.IDItem === '') continue;
		const id = Number(row.IDItem);
		if (Number.isFinite(id) && id > 0) ids.add(id);
	}
	return [...ids];
}

export function itemDisplayQuery(ids: number[]) {
	return {
		Id: ids.join(','),
		Take: ids.length,
		Skip: 0,
		IsDisabled: 'skipped',
		IgnoredBranch: true,
	};
}

export function uomDisplayQuery(ids: number[]) {
	return {
		IDItem: ids.join(','),
		Take: ids.length * 8,
		Skip: 0,
		IsDisabled: 'skipped',
		IgnoredBranch: true,
	};
}

export function applyItemDisplay(rows: any[] | null | undefined, items: any[] | null | undefined, uomRows: any[] | null | undefined) {
	const itemById = new Map<number, any>();
	for (const item of items || []) {
		const id = Number(item?.Id);
		if (Number.isFinite(id)) itemById.set(id, item);
	}
	const uomsByItem = new Map<number, any[]>();
	for (const uom of uomRows || []) {
		const id = Number(uom?.IDItem);
		if (!Number.isFinite(id)) continue;
		const list = uomsByItem.get(id) || [];
		list.push(uom);
		uomsByItem.set(id, list);
	}

	for (const row of rows || []) {
		if (!row || row._Item || row.IDItem == null || row.IDItem === '') continue;
		const id = Number(row.IDItem);
		if (!Number.isFinite(id) || id <= 0) continue;
		const item = itemById.get(id);
		if (!item) continue;
		const uoms = uomsByItem.get(id) || [];
		const targetUoM = item.SalesUoM || item.InventoryUoM;
		row._Item = { Id: item.Id, Code: item.Code, Name: item.Name, IsDisabled: !!item.IsDisabled };
		row._SplitOpenQuantity = splitQuantity(uoms, row.OpenQuantity, targetUoM);
		row._SplitClosedQuantity = splitQuantity(uoms, row.ClosedQuantity, targetUoM);
	}
}

export function splitQuantity(uoms: any[], quantity: number, targetUoMId: number) {
	const ratio = (uom) => {
		const alternative = Number(uom.AlternativeQuantity) || 1;
		return Number(uom.BaseQuantity) / alternative;
	};
	let list = (uoms || []).filter((uom) => !uom.IsDeleted);
	const enabled = list.filter((uom) => !uom.IsDisabled);
	if (enabled.length) list = enabled;
	list = list.sort((a, b) => ratio(b) - ratio(a));
	const target = list.find((uom) => uom.Id == targetUoMId);
	if (target) {
		const cap = ratio(target);
		list = list.filter((uom) => ratio(uom) <= cap);
	}
	let baseQty = Math.abs(Number(quantity) || 0);
	const parts = [];
	list.forEach((uom, index) => {
		const unit = ratio(uom);
		if (!unit) {
			return;
		}
		let qty = 0;
		if (index === list.length - 1) {
			qty = baseQty / unit;
			baseQty = 0;
		} else if (baseQty - unit >= 0) {
			qty = Math.trunc(baseQty / unit);
			baseQty -= qty * unit;
		}
		if (qty > 0) {
			parts.push({ Quantity: Math.round(qty * 1000000) / 1000000, UoMName: uom.Name });
		}
	});
	if (parts.length === 0) {
		const name = (target || list.find((uom) => uom.IsBaseUoM) || list[0])?.Name || '';
		const shown = list.length === 0 ? Math.round(baseQty * 1000000) / 1000000 : 0;
		parts.push({ Quantity: shown, UoMName: name });
	}
	return parts;
}
