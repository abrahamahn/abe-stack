import { useState } from "react";

import { ListBox, ListItem } from "../ListBox";

const items = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"];

export function ListBoxDemo() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div>
      <ListBox
        items={items}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        autoFocus
      >
        {(item, props) => <ListItem {...props}>{item}</ListItem>}
      </ListBox>
      <div style={{ marginTop: 8 }}>Selected: {items[selectedIndex]}</div>
    </div>
  );
}
