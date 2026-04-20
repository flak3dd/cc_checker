export function calculateChecksum(vinBase: string): string {
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const values: Record<string, number> = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };

  let total = 0;
  for (let i = 0; i < vinBase.length; i++) {
    total += values[vinBase[i]] * weights[i];
  }

  const remainder = total % 11;
  return remainder === 10 ? 'X' : remainder.toString();
}

export function generateVin(): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; // No I, O, Q
  const digits = "0123456789";

  const randomChoice = (str: string) => str[Math.floor(Math.random() * str.length)];
  const randomString = (str: string, len: number) => Array.from({ length: len }, () => randomChoice(str)).join('');

  // 1-3: WMI
  const wmi = "6H8";
  
  // 4-8: VDS
  const vds = randomString(chars, 5);
  
  // 10: Model Year
  const modelYear = randomChoice("RSTUVWXYZ");
  
  // 11: Plant Code
  const plantCode = randomChoice(chars);
  
  // 12-17: VIS
  const vis = randomString(digits, 6);

  // Position 9 placeholder
  const vinBase = wmi + vds + '0' + modelYear + plantCode + vis;
  
  const checkDigit = calculateChecksum(vinBase);
  const vin = vinBase.substring(0, 8) + checkDigit + vinBase.substring(9);

  return vin;
}
