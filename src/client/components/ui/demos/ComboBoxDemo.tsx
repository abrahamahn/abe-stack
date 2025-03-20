import { useState } from "react";

import { ComboBox } from "../ComboBox";

const items = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
  "Honeydew",
  "Kiwi",
  "Lemon",
  "Mango",
  "Orange",
  "Papaya",
  "Quince",
  "Raspberry",
  "Strawberry",
  "Tangerine",
  "Ugli fruit",
  "Watermelon",
];

export function ComboBoxDemo() {
  const [value, setValue] = useState<string>();

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <ComboBox
          items={items}
          renderItem={(item) => item}
          onSelect={setValue}
          value={value}
          placeholder="Select a fruit..."
        />
      </div>
      <div>Selected value: {value || "None"}</div>
    </div>
  );
}
