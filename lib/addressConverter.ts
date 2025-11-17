import { bech32 } from 'bech32';
export function convertValidatorToAccountAddress(validatorAddress: string): string {
  try {
    const decoded = bech32.decode(validatorAddress);
    const operatorPrefix = decoded.prefix;
    let accountPrefix = operatorPrefix;
    if (operatorPrefix.endsWith('valoper')) {
      accountPrefix = operatorPrefix.slice(0, -7); // Remove 'valoper' (7 chars)
    }
    const accountAddress = bech32.encode(accountPrefix, decoded.words);
    return accountAddress;
  } catch (err) {
    return '';
  }
}
export function convertAccountToValidatorAddress(accountAddress: string): string {
  try {
    const decoded = bech32.decode(accountAddress);
    const accountPrefix = decoded.prefix;
    const validatorPrefix = `${accountPrefix}valoper`;
    const validatorAddress = bech32.encode(validatorPrefix, decoded.words);
    return validatorAddress;
  } catch (err) {
    return '';
  }
}
