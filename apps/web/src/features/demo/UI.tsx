import {
  Accordion,
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Heading,
  Input,
  Popover,
  Progress,
  Radio,
  Select,
  Skeleton,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from '@abe-stack/ui';
import React, { useMemo } from 'react';

export const UIPage: React.FC = () => {
  // Memoize tabs array to avoid recreation on every render
  const tabs = useMemo(
    () => [
      { id: 'one', label: 'Tab One', content: <div>Content One</div> },
      { id: 'two', label: 'Tab Two', content: <div>Content Two</div> },
    ],
    [],
  );

  // Memoize accordion items to avoid recreation on every render
  const accordionItems = useMemo(
    () => [
      { id: 'a1', title: 'First', content: 'First content' },
      { id: 'a2', title: 'Second', content: 'Second content' },
    ],
    [],
  );

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      <section>
        <Heading as="h2">Buttons</Heading>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button>Primary</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <Heading as="h2">Inputs</Heading>
        <div style={{ display: 'grid', gap: '12px' }}>
          <Input placeholder="Text input" />
          <Select aria-label="Select example">
            <option>One</option>
            <option>Two</option>
          </Select>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Checkbox checked label="Check me" onChange={(_checked: boolean) => {}} />
            <Radio name="r1" checked label="Radio" onChange={(_checked: boolean) => {}} />
            <Switch checked />
          </div>
        </div>
      </section>

      <section>
        <Heading as="h2">Feedback</Heading>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Badge tone="success">Success</Badge>
          <Badge tone="danger">Danger</Badge>
          <Progress value={60} />
          <Skeleton style={{ width: 120, height: 16 }} />
        </div>
      </section>

      <section>
        <Heading as="h2">Navigation</Heading>
        <Tabs items={tabs} />
        <div style={{ marginTop: '16px' }}>
          <Accordion items={accordionItems} />
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Tooltip content="Hello tooltip">
            <Button>Tooltip</Button>
          </Tooltip>
          <Dropdown trigger="Dropdown">
            {(close: () => void) => (
              <div style={{ display: 'grid', gap: '8px', padding: '8px' }}>
                <Button onClick={close}>Item One</Button>
                <Button onClick={close}>Item Two</Button>
              </div>
            )}
          </Dropdown>
          <Popover trigger="Popover">
            <div style={{ padding: '12px' }}>
              <Text>Popover content</Text>
            </div>
          </Popover>
        </div>
      </section>

      <section>
        <Heading as="h2">Card</Heading>
        <Card>
          <Text>
            Use this gallery to visually verify component states, tones, and accessibility props.
          </Text>
        </Card>
      </section>
    </div>
  );
};
