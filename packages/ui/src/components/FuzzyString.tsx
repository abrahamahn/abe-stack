import { FuzzyMatchResult } from '../../../server/shared/utils';

interface FuzzyStringProps {
  match?: FuzzyMatchResult[];
  text?: string;
}

export function FuzzyString({ match, text }: FuzzyStringProps) {
  if (!match) {
    return <span>{text}</span>;
  }

  return (
    <span>
      {match.map((item, i) => (
        <span
          key={i}
          style={{
            fontWeight: 'match' in item ? 'bold' : 'normal',
            color: 'match' in item ? '#3b82f6' : 'inherit',
          }}
        >
          {'match' in item ? item.match : item.skip}
        </span>
      ))}
    </span>
  );
}
