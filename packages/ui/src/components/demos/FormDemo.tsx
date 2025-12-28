import React, { useState } from 'react';

import { ComboBox } from '../ComboBox';
import { Input } from '../Input';

const colors = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];

// TODO: this is very much a work in progress!
export function FormDemo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState<string>();

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Name:
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Email:
          <Input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Favorite Color:
          <ComboBox
            items={colors}
            renderItem={(item) => item}
            onSelect={setColor}
            value={color}
            placeholder="Select a color..."
          />
        </label>
      </div>
      <div>
        <div>Name: {name || 'Not set'}</div>
        <div>Email: {email || 'Not set'}</div>
        <div>Favorite Color: {color || 'Not set'}</div>
      </div>
    </div>
  );
}
