import { useState } from 'react';
import { FuzzyString } from '../FuzzyString';
import { Input } from '../Input';
import { fuzzyMatch } from '@abe-stack/shared';

const sampleTexts = [
  'hello world',
  'The quick brown fox jumps over the lazy dog',
  'Lorem ipsum dolor sit amet',
  'React is awesome',
  'TypeScript makes JavaScript better',
];

export function FuzzyStringDemo() {
  const [value, setValue] = useState('');

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          placeholder="Type to search..."
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sampleTexts.map((text, i) => {
          const match = fuzzyMatch(value, text);
          return (
            <div key={i}>
              <FuzzyString match={match || undefined} text={text} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
