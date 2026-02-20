// main/client/engine/src/realtime/hooks/index.ts

export { useRecord } from './useRecord';
export type {
  UseRecordDeps,
  UseRecordOptions,
  UseRecordResult,
} from './useRecord';

export { useRecords } from './useRecords';
export type {
  UseRecordsDeps,
  UseRecordsOptions,
  UseRecordsResult,
} from './useRecords';

export { useWrite } from './useWrite';
export type {
  UseWriteDeps,
  UseWriteResult,
  WriteOperation,
  WriteOptions,
} from './useWrite';

export { useUndoRedo } from './useUndoRedo';
export type {
  UseUndoRedoDeps,
  UseUndoRedoResult,
} from './useUndoRedo';

export { isPermissionError, createPermissionError } from './usePermissionError';
export type {
  PermissionError,
  PermissionRevokedEventPayload,
  PermissionRevokedCallback,
  PermissionEventListener,
} from './usePermissionError';
