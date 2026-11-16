export const RECEIPT_TYPE_SHIPMENT_RETURN = 'RTShipmentReturn';

export function isShipmentReturnReceipt(type: string | null | undefined): boolean {
	return type === RECEIPT_TYPE_SHIPMENT_RETURN;
}
