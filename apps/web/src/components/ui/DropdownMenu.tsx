import React, { CSSProperties } from "react";

import { usePopper } from "../../hooks/usePopper";

interface DropdownMenuProps {
  style?: CSSProperties;
  items: Array<{
    label: string;
    onClick: () => void;
  }>;
  onClose: () => void;
}

export function DropdownMenu({ style, items, onClose }: DropdownMenuProps) {
  const [referenceElement, _setReferenceElement] =
    React.useState<HTMLElement | null>(null);
  const [popperElement, setPopperElement] = React.useState<HTMLElement | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const popperInstance = usePopper(referenceElement, popperElement, {
    placement: "bottom-start",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 4],
        },
      },
    ],
  }) as unknown as {
    styles: { popper: CSSProperties };
    attributes: { popper: Record<string, string> };
  };

  // Default empty styles and attributes if they don't exist
  const styles = popperInstance.styles || {};
  const attributes = popperInstance.attributes || {};

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popperElement &&
        !popperElement.contains(event.target as Node) &&
        referenceElement &&
        !referenceElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popperElement, referenceElement, onClose]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case "Enter":
        event.preventDefault();
        items[selectedIndex].onClick();
        onClose();
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <div style={style} onKeyDown={handleKeyDown}>
      <div ref={setPopperElement} style={styles.popper} {...attributes.popper}>
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              backgroundColor:
                i === selectedIndex || i === hoveredIndex
                  ? "#e2e8f0"
                  : "transparent",
              transition: "background-color 0.2s ease",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
