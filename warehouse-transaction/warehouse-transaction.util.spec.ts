import { ledgerWarningMessage, signedTransactionQuantity } from './warehouse-transaction.util';

describe('warehouse transaction ledger warning', () => {
	it('stays quiet when the ledger matches', () => {
		expect(ledgerWarningMessage(0, 0)).toBeNull();
	});

	it('returns a warning when documents are missing or lots drift', () => {
		const message = 'Warehouse stock ledger is missing documents or lot quantities do not match the ledger.';
		expect(ledgerWarningMessage(2, 0)).toBe(message);
		expect(ledgerWarningMessage(0, 1)).toBe(message);
	});

	it('shows an outbound quantity as negative so the formatter adds a minus', () => {
		expect(signedTransactionQuantity('Outbound', 12)).toBe(-12);
		expect(signedTransactionQuantity('Outbound', -12)).toBe(-12);
	});

	it('keeps an inbound quantity positive', () => {
		expect(signedTransactionQuantity('Inbound', 12)).toBe(12);
		expect(signedTransactionQuantity('Inbound', 0)).toBe(0);
	});
});
