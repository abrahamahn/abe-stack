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
import React from 'react';

export const UIPage: React.FC = () => {
  const tabs = [
    { id: 'one', label: 'Tab One', content: <div>Content One</div> },
    { id: 'two', label: 'Tab Two', content: <div>Content Two</div> },
  ];

  const accordionItems = [
    { id: 'a1', title: 'First', content: 'First content' },
    { id: 'a2', title: 'Second', content: 'Second content' },
  ];

  return (
    <div>
      <section style={{ marginBottom: '16px' }}>
        <Heading as="h2">Buttons</Heading>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button>Primary</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <Heading as="h2">Inputs</Heading>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Input placeholder="Text input" />
          <Select aria-label="Select example">
            <option>One</option>
            <option>Two</option>
          </Select>
          <Checkbox
            checked
            label="Check me"
            onChange={(checked) => {
              void checked;
            }}
          />
          <Radio
            name="r1"
            checked
            label="Radio"
            onChange={(checked) => {
              void checked;
            }}
          />
          <Switch
            checked
            onChange={(checked) => {
              void checked;
            }}
          />
        </div>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <Heading as="h2">Feedback</Heading>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Badge tone="success">Success</Badge>
          <Badge tone="danger">Danger</Badge>
          <Progress value={60} />
          <Skeleton style={{ width: 120, height: 16 }} />
        </div>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <Heading as="h2">Navigation</Heading>
        <Tabs items={tabs} />
        <Accordion items={accordionItems} />
      </section>

      <section style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tooltip content="Hello tooltip">
            <Button>Tooltip</Button>
          </Tooltip>
          <Dropdown trigger={<Button>Dropdown</Button>}>
            {(close: () => void) => (
              <div style={{ display: 'grid', gap: 8 }}>
                <Button onClick={close}>Item One</Button>
                <Button onClick={close}>Item Two</Button>
              </div>
            )}
          </Dropdown>
          <Popover trigger={<Button>Popover</Button>}>
            <Text>Popover content</Text>
          </Popover>
        </div>
      </section>

      <section style={{ marginBottom: '16px' }}>
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
