const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ADDRESS_MIN_LENGTH = 32;
const ADDRESS_MAX_LENGTH = 44;

export function isSolanaAddressLike(value: string): boolean {
  if (value.length < ADDRESS_MIN_LENGTH || value.length > ADDRESS_MAX_LENGTH) {
    return false;
  }

  return [...value].every((character) => BASE58_ALPHABET.includes(character));
}

export function extractSolanaAddresses(text: string): string[] {
  const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) ?? [];
  return Array.from(new Set(matches.filter(isSolanaAddressLike)));
}

export function truncateAddress(address: string, edgeLength = 4): string {
  if (address.length <= edgeLength * 2 + 3) {
    return address;
  }

  return `${address.slice(0, edgeLength)}...${address.slice(-edgeLength)}`;
}
