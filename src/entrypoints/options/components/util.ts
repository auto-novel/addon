const roundClassMap = {
  full: 'rounded-lg',
  left: 'rounded-l-lg',
  right: 'rounded-r-lg',
};

type RoundType = keyof typeof roundClassMap;

export const roundClass = (round: string) => {
  return roundClassMap[round as RoundType] || 'rounded-lg';
};
