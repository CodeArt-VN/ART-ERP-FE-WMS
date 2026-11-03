export function ledgerWarningMessage(missingCount: number, driftCount: number): string | null {
	if ((Number(missingCount) || 0) <= 0 && (Number(driftCount) || 0) <= 0) return null;
	return 'Warehouse stock ledger is missing documents or lot quantities do not match the ledger.';
}

export function signedTransactionQuantity(transactionType: string, quantity: number): number {
	const amount = Math.abs(Number(quantity) || 0);
	return transactionType === 'Outbound' ? -amount : amount;
}
