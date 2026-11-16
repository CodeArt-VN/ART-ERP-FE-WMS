import { isShipmentReturnReceipt, RECEIPT_TYPE_SHIPMENT_RETURN } from './receipt-detail.util';

describe('receipt-detail.util', () => {
	it('recognizes RTShipmentReturn as dropped-goods receipt', () => {
		expect(RECEIPT_TYPE_SHIPMENT_RETURN).toBe('RTShipmentReturn');
		expect(isShipmentReturnReceipt('RTShipmentReturn')).toBe(true);
		expect(isShipmentReturnReceipt('FromPO')).toBe(false);
		expect(isShipmentReturnReceipt('Return')).toBe(false);
		expect(isShipmentReturnReceipt(null)).toBe(false);
	});
});
